/**
 * Support: POS admin-PIN reset codes.  Mounted inside the licence API at /api/license/v1/admin
 * (see licenseRoutes.js). Admin login required for every route.
 *
 *   POST /api/license/v1/admin/pin-reset          { requestCode: "WTR1-…" }
 *   GET  /api/license/v1/admin/pin-reset/history  last 50 audit entries
 *
 * Format and security notes: utils/pinReset.js and docs/LICENSING.md.
 */
import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { protect, admin } from '../middleware/auth.js';
import Software from '../models/Software.js';
import License from '../models/License.js';
import PinResetAudit from '../models/PinResetAudit.js';
import { hashDeviceId, decryptKey } from '../utils/licensing.js';
import { parseRequestCode, makeResetCode, PinResetError } from '../utils/pinReset.js';

const router = express.Router();
const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

// 20 codes per 15 minutes per admin account (falls back to the IP).
const pinResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: num(process.env.PIN_RESET_LIMIT, 20),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user?._id ? `admin:${req.user._id}` : ipKeyGenerator(req.ip || '')),
  message: { message: 'Too many PIN reset codes generated. Please wait 15 minutes and try again.' },
});

router.use(protect, admin);

const licStatus = (l) => (l.revoked ? 'revoked' : (l.expiresAt && new Date(l.expiresAt) <= new Date() ? 'expired' : 'active'));

router.post('/pin-reset', pinResetLimiter, async (req, res) => {
  let input;
  try {
    input = parseRequestCode(req.body?.requestCode);
  } catch (e) {
    if (e instanceof PinResetError) return res.status(e.status).json({ message: e.message, code: e.code });
    return res.status(400).json({ message: 'Invalid request code.' });
  }
  try {
    const { appId, deviceId, nonce, t } = input;
    // Same product lookup as the licence API: appId (or the current slug for products without one).
    const sw = await Software.findOne({ $or: [{ appId }, { slug: appId.toLowerCase() }], status: { $ne: 'archived' } })
      .select('_id title slug appId').lean();
    if (!sw) return res.status(404).json({ message: `Unknown app "${appId}". No software product has this App ID.`, code: 'unknown_app' });

    // Activations store hashDeviceId(licence.appId, deviceId); licence.appId is the product's
    // appId (or slug) at purchase time, so try each candidate.
    const ids = [...new Set([sw.appId, sw.slug, appId].filter(Boolean))];
    const devs = [...new Set([deviceId, deviceId.toLowerCase(), deviceId.toUpperCase()])];
    const hashes = ids.flatMap((a) => devs.map((d) => hashDeviceId(a, d)));
    const lic = await License.findOne({ software: sw._id, 'devices.deviceHash': { $in: hashes } })
      .sort({ updatedAt: -1 }).lean();

    const resetCode = makeResetCode(appId, deviceId, nonce);
    const requestedAt = new Date(t * 1000).toISOString();

    // Fail closed: if the audit entry cannot be written, the code is not returned.
    await PinResetAudit.create({
      adminId: req.user._id,
      adminEmail: req.user.email,
      appId,
      software: sw._id,
      deviceId,
      nonce,
      requestedAt,
      license: lic ? lic._id : null,
      licenseKeyLast: lic ? lic.keyLast : '',
      activationFound: Boolean(lic),
      ip: req.ip || '',
      userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
    });

    const out = { success: true, resetCode, appId, software: sw.title, deviceId, nonce, requestedAt, activationFound: Boolean(lic) };
    if (lic) {
      out.licence = {
        id: lic._id, key: decryptKey(lic.keyEnc) || null, keyLast: lic.keyLast, plan: lic.planName,
        status: licStatus(lic), expiresAt: lic.expiresAt,
      };
      out.customer = { name: lic.buyerName || '', email: lic.email };
    }
    return res.json(out);
  } catch (e) {
    console.error('[pin-reset] error:', e.message); // never logs the request body or key material
    return res.status(500).json({ message: 'Could not generate the reset code. Please try again.' });
  }
});

router.get('/pin-reset/history', async (req, res) => {
  try {
    const rows = await PinResetAudit.find({}).sort({ createdAt: -1 }).limit(50).lean();
    res.json({
      success: true,
      history: rows.map((r) => ({
        _id: r._id, createdAt: r.createdAt, adminEmail: r.adminEmail, appId: r.appId, deviceId: r.deviceId,
        nonce: r.nonce, requestedAt: r.requestedAt, activationFound: r.activationFound,
        licenseKeyLast: r.licenseKeyLast, ip: r.ip,
      })),
    });
  } catch (e) {
    console.error('[pin-reset] history error:', e.message);
    res.status(500).json({ message: 'Could not load the PIN reset history.' });
  }
});

export default router;
