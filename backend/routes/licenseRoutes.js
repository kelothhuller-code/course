/**
 * Public licence API used by desktop apps:  /api/license/v1
 *
 *   POST /trial       { softwareSlug, deviceId, deviceName?, appVersion?, nonce }
 *   POST /activate    { softwareSlug, licenseKey, deviceId, deviceName?, appVersion?, nonce }
 *   POST /validate    { softwareSlug, licenseKey, deviceId, appVersion?, nonce }
 *   POST /deactivate  { softwareSlug, licenseKey, deviceId, nonce }
 *   GET  /public-key  (convenience only — apps must EMBED the public key, not download it)
 *
 * Every answer is { payload: "<JSON string>", signature: "<base64 Ed25519>" }. Apps verify the
 * signature with the embedded public key, then check payload.nonce == the nonce they sent and
 * that payload.deviceId is their own device. Business results (expired, revoked, device limit…)
 * are HTTP 200 + signed payload; malformed requests get HTTP 400 (unsigned) and rate limits 429.
 *
 * `softwareSlug` may be the product's appId (recommended, never changes) or its current slug.
 */
import express from 'express';
import rateLimit from 'express-rate-limit';
import Software from '../models/Software.js';
import License from '../models/License.js';
import TrialDevice from '../models/TrialDevice.js';
import { protect } from '../middleware/auth.js';
import { normalizeLicenseKey, hashLicenseKey, hashDeviceId, signResponse, publicKeyBase64, decryptKey } from '../utils/licensing.js';
import ServiceOrder from '../models/ServiceOrder.js';
import ContactMessage from '../models/ContactMessage.js';

const router = express.Router();
const isDev = process.env.NODE_ENV !== 'production';
const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

// 1) General per-IP limit for the licence API
const licenseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: num(process.env.LICENSE_RATE_LIMIT_PER_MIN, isDev ? 300 : 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many licence checks from this network. Please wait a minute and try again.' },
});

// 2) Brute-force protection: only failed key lookups count (invalid key / wrong product).
const failLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: num(process.env.LICENSE_FAIL_LIMIT, isDev ? 100 : 20),
  standardHeaders: true,
  legacyHeaders: false,
  requestWasSuccessful: (req, res) => !res.locals.licenseFail,
  skipFailedRequests: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many invalid licence keys from this network. Please try again in 15 minutes.' },
});

router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// ---- Input validation -------------------------------------------------------------------
const SLUG_RE = /^[a-z0-9][a-z0-9._-]{0,79}$/i;
const NONCE_RE = /^[A-Za-z0-9_-]{16,128}$/;
const clean = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '');

const parse = (body, { needKey = false } = {}) => {
  const b = body && typeof body === 'object' ? body : {};
  const slug = clean(b.softwareSlug || b.appId, 80);
  const deviceId = clean(b.deviceId, 256);
  const nonce = typeof b.nonce === 'string' ? b.nonce : '';
  if (!SLUG_RE.test(slug)) return { error: 'softwareSlug is required.' };
  if (deviceId.length < 8) return { error: 'deviceId is required (at least 8 characters).' };
  if (!NONCE_RE.test(nonce)) return { error: 'nonce is required (16–128 characters: letters, numbers, - or _).' };
  const out = { slug, deviceId, nonce, deviceName: clean(b.deviceName, 100), appVersion: clean(b.appVersion, 40) };
  if (needKey) {
    if (typeof b.licenseKey !== 'string' || !b.licenseKey.trim()) return { error: 'licenseKey is required.' };
    out.rawKey = b.licenseKey;
  }
  return out;
};

const findSoftware = (slug) =>
  Software.findOne({ $or: [{ appId: slug }, { slug: slug.toLowerCase() }], status: { $ne: 'archived' }, licensingEnabled: true });

/** Builds + signs the answer. Never includes the full licence key. */
const reply = (res, req, input, sw, fields) => {
  const now = new Date();
  const body = {
    v: 1,
    type: fields.type,
    status: fields.status,
    message: fields.message || '',
    appId: sw ? (sw.appId || sw.slug) : input.slug,
    deviceId: input.deviceId,
    nonce: input.nonce,
    serverTime: now.toISOString(),
    plan: fields.plan ?? null,
    expiresAt: fields.expiresAt ? new Date(fields.expiresAt).toISOString() : null,
    lifetime: Boolean(fields.lifetime),
    maxDevices: fields.maxDevices ?? null,
    devicesUsed: fields.devicesUsed ?? null,
    keyLast: fields.keyLast ?? null,
    trialDays: fields.trialDays ?? null,
    buyUrl: sw ? `${(process.env.FRONTEND_URL || 'https://widetech.in').replace(/\/+$/, '')}/software/${sw.slug}` : null,
  };
  return res.json(signResponse(body));
};

const fail = (res, req, input, sw, type, message) => {
  res.locals.licenseFail = true;
  return reply(res, req, input, sw, { type, status: 'invalid', message });
};

const licenseState = (lic) => {
  if (lic.revoked) return { status: 'revoked', message: 'This licence has been revoked. Please contact support.' };
  if (lic.expiresAt && lic.expiresAt.getTime() <= Date.now()) return { status: 'expired', message: 'This licence has expired. Renew it to keep using the app.' };
  return null;
};

const licFields = (lic) => ({
  plan: lic.planName || null,
  expiresAt: lic.expiresAt,
  lifetime: lic.expiresAt === null,
  maxDevices: lic.maxDevices,
  devicesUsed: lic.devices.length,
  keyLast: lic.keyLast,
});

/** Shared lookup for activate / validate / deactivate. Returns { sw, lic } or sends a reply. */
const loadLicense = async (req, res, input, type) => {
  const sw = await findSoftware(input.slug);
  if (!sw) { fail(res, req, input, null, type, 'Unknown software.'); return null; }
  const key = normalizeLicenseKey(input.rawKey);
  if (!key) { fail(res, req, input, sw, type, 'That licence key is not valid. Check for typos.'); return null; }
  const lic = await License.findOne({ keyHash: hashLicenseKey(key) });
  if (!lic || lic.software.toString() !== sw._id.toString()) { fail(res, req, input, sw, type, 'That licence key is not valid for this software.'); return null; }
  return { sw, lic };
};

/** Binds the device if it is new and a slot is free (atomic, so parallel calls can't exceed the limit). */
const bindDevice = async (lic, input) => {
  const deviceHash = hashDeviceId(lic.appId, input.deviceId);
  const now = new Date();
  if (lic.devices.some((d) => d.deviceHash === deviceHash)) {
    await License.updateOne({ _id: lic._id, 'devices.deviceHash': deviceHash }, {
      $set: { 'devices.$.lastSeenAt': now, lastValidatedAt: now, ...(input.appVersion ? { 'devices.$.appVersion': input.appVersion } : {}) },
    });
    return { ok: true, devicesUsed: lic.devices.length };
  }
  const r = await License.updateOne(
    { _id: lic._id, 'devices.deviceHash': { $ne: deviceHash }, $expr: { $lt: [{ $size: '$devices' }, '$maxDevices'] } },
    { $push: { devices: { deviceHash, deviceName: input.deviceName, appVersion: input.appVersion, activatedAt: now, lastSeenAt: now } }, $set: { lastValidatedAt: now } }
  );
  if (!r.modifiedCount) return { ok: false };
  return { ok: true, devicesUsed: lic.devices.length + 1, newlyBound: true };
};

const handle = (type, fn) => async (req, res) => {
  const input = parse(req.body, { needKey: type !== 'trial' });
  if (input.error) return res.status(400).json({ message: input.error });
  try {
    return await fn(req, res, input);
  } catch (e) {
    console.error(`[license] ${type} error:`, e.message); // never log the request body (contains the key)
    return res.status(500).json({ message: 'Licence server error. Please try again.' });
  }
};

router.post('/trial', licenseLimiter, handle('trial', async (req, res, input) => {
  const sw = await findSoftware(input.slug);
  if (!sw) return fail(res, req, input, null, 'trial', 'Unknown software.');
  if (!sw.trialEnabled) return reply(res, req, input, sw, { type: 'trial', status: 'invalid', message: 'This software has no free trial. Please buy a licence.' });
  const deviceHash = hashDeviceId(sw.appId || sw.slug, input.deviceId);
  const now = new Date();
  const days = sw.trialDays || 7;
  // Create on first use only; afterwards the same record is returned (even after reinstalling).
  const trial = await TrialDevice.findOneAndUpdate(
    { software: sw._id, deviceHash },
    {
      $setOnInsert: { software: sw._id, appId: sw.appId || sw.slug, deviceHash, startedAt: now, expiresAt: new Date(now.getTime() + days * 86400000), deviceName: input.deviceName },
      $set: { lastSeenAt: now, ...(input.appVersion ? { appVersion: input.appVersion } : {}) },
      $inc: { checks: 1 },
    },
    { upsert: true, new: true }
  );
  const active = trial.expiresAt.getTime() > now.getTime();
  return reply(res, req, input, sw, {
    type: 'trial',
    status: active ? 'trial' : 'expired',
    message: active ? 'Free trial active.' : 'Your free trial has ended. Buy a licence to keep using the app.',
    plan: 'Free trial',
    expiresAt: trial.expiresAt,
    trialDays: days,
  });
}));

router.post('/activate', licenseLimiter, failLimiter, handle('activate', async (req, res, input) => {
  const found = await loadLicense(req, res, input, 'activate');
  if (!found) return undefined;
  const { sw, lic } = found;
  const bad = licenseState(lic);
  if (bad) return reply(res, req, input, sw, { type: 'activate', ...bad, ...licFields(lic) });
  const bound = await bindDevice(lic, input);
  if (!bound.ok) {
    return reply(res, req, input, sw, { type: 'activate', status: 'device_limit', message: `This key is already active on ${lic.maxDevices} device(s). Deactivate one, or contact support to reset devices.`, ...licFields(lic) });
  }
  return reply(res, req, input, sw, { type: 'activate', status: 'active', message: 'Licence activated.', ...licFields(lic), devicesUsed: bound.devicesUsed });
}));

router.post('/validate', licenseLimiter, failLimiter, handle('validate', async (req, res, input) => {
  const found = await loadLicense(req, res, input, 'validate');
  if (!found) return undefined;
  const { sw, lic } = found;
  const bad = licenseState(lic);
  if (bad) return reply(res, req, input, sw, { type: 'validate', ...bad, ...licFields(lic) });
  // A device that has not been activated yet is activated now if a slot is free.
  const bound = await bindDevice(lic, input);
  if (!bound.ok) {
    return reply(res, req, input, sw, { type: 'validate', status: 'device_limit', message: `This key is already active on ${lic.maxDevices} device(s).`, ...licFields(lic) });
  }
  return reply(res, req, input, sw, { type: 'validate', status: 'active', message: 'Licence is valid.', ...licFields(lic), devicesUsed: bound.devicesUsed });
}));

router.post('/deactivate', licenseLimiter, failLimiter, handle('deactivate', async (req, res, input) => {
  const found = await loadLicense(req, res, input, 'deactivate');
  if (!found) return undefined;
  const { sw, lic } = found;
  const deviceHash = hashDeviceId(lic.appId, input.deviceId);
  const r = await License.updateOne({ _id: lic._id }, { $pull: { devices: { deviceHash } } });
  return reply(res, req, input, sw, {
    type: 'deactivate',
    status: 'deactivated',
    message: r.modifiedCount ? 'This device has been removed from the licence.' : 'This device was not active on the licence.',
    ...licFields(lic),
    devicesUsed: Math.max(0, lic.devices.length - (r.modifiedCount ? 1 : 0)),
  });
}));

router.get('/public-key', licenseLimiter, (req, res) => {
  res.json({ alg: 'Ed25519', publicKey: publicKeyBase64(), note: 'Embed this key in your app at build time. Do not download it at runtime.' });
});

export default router;

// ---- Signed-in buyer: "My licences" / "My service orders" / "My enquiries" -------------------
// Every route here is protect()-ed and only ever returns records owned by req.user
// (matched by userId, or by the account email for guest purchases made with that email).
export const accountRouter = express.Router();

// Records linked to my account, plus records issued to my email address AFTER the account was
// created (e.g. a licence the owner issued by email). Sign-up has no email verification, so an
// account made later with someone else's address must not see that person's earlier licences.
// (Purchases always link the account by userId, so normal buyers see everything.)
const ownerFilter = (user, emailField = 'email') => ({
  $or: [
    { userId: user._id },
    { [emailField]: String(user.email || '').toLowerCase(), createdAt: { $gte: user.createdAt ? new Date(user.createdAt) : new Date() } },
  ],
});
// A short, stable reference for one bound device (never the full device hash).
const deviceRef = (d) => String(d.deviceHash || '').slice(0, 16);
// How many computers a buyer may remove themselves per 30 days (0 = only the owner/admin can).
const selfDeactivateLimit = () => {
  const n = Number.parseInt(process.env.LICENSE_SELF_DEACTIVATE_PER_30D ?? '3', 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 50) : 3;
};
const recentSelfDeactivations = (l) => {
  const since = Date.now() - 30 * 24 * 3600 * 1000;
  return (l.selfDeactivations || []).filter((d) => new Date(d).getTime() > since).length;
};

const accountLicense = (l) => {
  const limit = selfDeactivateLimit();
  const used = recentSelfDeactivations(l);
  const sw = l.software && typeof l.software === 'object' && l.software._id ? l.software : null;
  return {
    _id: l._id,
    key: decryptKey(l.keyEnc),
    keyLast: l.keyLast,
    software: sw ? { _id: sw._id, title: sw.title, slug: sw.slug, hasDownload: Boolean(sw.fileName || sw.downloadUrl) } : { title: l.softwareTitle },
    planName: l.planName,
    billing: l.billing,
    expiresAt: l.expiresAt,
    lifetime: l.expiresAt === null,
    expired: Boolean(l.expiresAt && new Date(l.expiresAt) <= new Date()),
    revoked: l.revoked,
    maxDevices: l.maxDevices,
    devices: (l.devices || []).map((d) => ({ ref: deviceRef(d), deviceName: d.deviceName, appVersion: d.appVersion, activatedAt: d.activatedAt, lastSeenAt: d.lastSeenAt })),
    selfDeactivate: { limit, remaining: Math.max(0, limit - used) },
    renewPlans: sw && l.expiresAt !== null
      ? (sw.plans || []).filter((p) => p.isActive && p.billing !== 'lifetime').map((p) => ({ _id: p._id, name: p.name, price: p.price, billing: p.billing, customDays: p.customDays }))
      : [],
    upgradePlans: sw && l.expiresAt !== null
      ? (sw.plans || []).filter((p) => p.isActive && p.billing === 'lifetime').map((p) => ({ _id: p._id, name: p.name, price: p.price, billing: p.billing }))
      : [],
    createdAt: l.createdAt,
  };
};

accountRouter.get('/licenses', protect, async (req, res) => {
  try {
    const list = await License.find(ownerFilter(req.user))
      .sort({ createdAt: -1 })
      .populate('software', 'title slug appId plans fileName downloadUrl')
      .lean();
    res.json({ success: true, licenses: list.map(accountLicense) });
  } catch (e) {
    console.error('My licences error:', e.message);
    res.status(500).json({ message: 'Could not load your licences.' });
  }
});

// Free a computer slot on one of MY licences (e.g. moving to a new PC). Rate-limited per licence
// so a single key cannot be rotated between many machines.
accountRouter.post('/licenses/:id/devices/:ref/deactivate', protect, async (req, res) => {
  try {
    const { id, ref } = req.params;
    if (!/^[a-f0-9]{24}$/i.test(id) || !/^[a-f0-9]{8,64}$/i.test(ref)) return res.status(400).json({ message: 'Invalid request' });
    // Ownership is part of the query: someone else's licence id simply returns 404.
    const lic = await License.findOne({ _id: id, ...ownerFilter(req.user) });
    if (!lic) return res.status(404).json({ message: 'Licence not found' });
    if (lic.revoked) return res.status(400).json({ message: 'This licence is revoked. Please contact support.' });
    const limit = selfDeactivateLimit();
    if (limit === 0) return res.status(403).json({ message: 'Please contact support to move this licence to another computer.' });
    if (recentSelfDeactivations(lic) >= limit) {
      return res.status(429).json({ message: `You can remove up to ${limit} computer(s) every 30 days. Please contact support if you need more.` });
    }
    const idx = (lic.devices || []).findIndex((d) => deviceRef(d) === ref.toLowerCase());
    if (idx === -1) return res.status(404).json({ message: 'That computer is no longer linked to this licence.' });
    lic.devices.splice(idx, 1);
    lic.selfDeactivations = [...(lic.selfDeactivations || []).filter((d) => Date.now() - new Date(d).getTime() < 30 * 24 * 3600 * 1000), new Date()];
    await lic.save();
    await lic.populate('software', 'title slug appId plans fileName downloadUrl');
    res.json({ success: true, message: 'Computer removed. You can now activate the key on another computer.', license: accountLicense(lic.toObject()) });
  } catch (e) {
    console.error('Self deactivate error:', e.message);
    res.status(500).json({ message: 'Could not remove that computer.' });
  }
});

accountRouter.get('/service-orders', protect, async (req, res) => {
  try {
    const orders = await ServiceOrder.find(ownerFilter(req.user, 'buyerEmail'))
      .sort({ createdAt: -1 })
      .populate('service', 'title slug')
      .select('orderNo serviceTitle packageName deliveryTime amount status statusHistory createdAt updatedAt txnid invoiceNo service')
      .lean();
    res.json({ success: true, orders });
  } catch (e) {
    console.error('My service orders error:', e.message);
    res.status(500).json({ message: 'Could not load your orders.' });
  }
});

// Enquiries sent with my account email. There is no email verification at sign-up, so only
// enquiries sent AFTER the account was created are shown (an account made later with someone
// else's address cannot read their earlier messages), and only the fields the sender typed.
accountRouter.get('/enquiries', protect, async (req, res) => {
  try {
    const email = String(req.user.email || '').toLowerCase();
    const since = req.user.createdAt ? new Date(req.user.createdAt) : new Date();
    const list = await ContactMessage.find({ email, createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('subject message interest categoryLabel relatedType relatedTitle status replyMessage repliedAt createdAt')
      .lean();
    const label = (s) => ({ unread: 'received', new: 'received', replied: 'replied', contacted: 'replied', qualified: 'in discussion', closed: 'closed' }[s] || 'received');
    res.json({
      success: true,
      enquiries: list.map((m) => ({
        _id: m._id, subject: m.subject, message: m.message, topic: m.relatedTitle || m.categoryLabel || m.interest,
        status: label(m.status), reply: m.replyMessage || '', repliedAt: m.repliedAt, createdAt: m.createdAt,
      })),
    });
  } catch (e) {
    console.error('My enquiries error:', e.message);
    res.status(500).json({ message: 'Could not load your enquiries.' });
  }
});
