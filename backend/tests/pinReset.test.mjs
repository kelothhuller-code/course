// npm test   (no database needed: the Mongoose model calls used by the route are stubbed)
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// A throwaway TEST key for this process only (same format the server uses: base64 PKCS#8 DER).
const testKeys = crypto.generateKeyPairSync('ed25519');
process.env.LICENSE_SIGNING_PRIVATE_KEY = testKeys.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64');
process.env.ADMIN_EMAIL = 'admin@example.test';
process.env.JWT_SECRET = 'test-jwt-secret-for-pin-reset-tests-only';

const { default: express } = await import('express');
const { default: jwt } = await import('jsonwebtoken');
const { default: User } = await import('../models/User.js');
const { default: Software } = await import('../models/Software.js');
const { default: License } = await import('../models/License.js');
const { default: PinResetAudit } = await import('../models/PinResetAudit.js');
const { default: licenseRoutes } = await import('../routes/licenseRoutes.js');
const { publicKeyBase64, hashDeviceId, encryptKey, generateLicenseKey } = await import('../utils/licensing.js');
const { parseRequestCode, makeRequestCode, pinResetMessage, fromBase64Url, PinResetError } = await import('../utils/pinReset.js');

// ---- stubs ---------------------------------------------------------------------------------
const adminUser = { _id: '64b000000000000000000001', email: 'admin@example.test', role: 'admin' };
const normalUser = { _id: '64b000000000000000000002', email: 'someone@example.test', role: 'user' };
const users = { [adminUser._id]: adminUser, [normalUser._id]: normalUser };
User.findById = (id) => ({ select: async () => users[id] || null });

const sw = { _id: '64b0000000000000000000aa', title: 'Wide POS', slug: 'wide-pos', appId: 'wide-pos' };
Software.findOne = (q) => ({
  select: () => ({ lean: async () => (q.$or.some((c) => c.appId === sw.appId || c.slug === sw.slug) ? sw : null) }),
});

const key = generateLicenseKey();
const boundDevice = 'a'.repeat(64);
const lic = {
  _id: '64b0000000000000000000bb', software: sw._id, appId: 'wide-pos', keyEnc: encryptKey(key), keyLast: key.slice(-5),
  planName: 'Lifetime', expiresAt: null, revoked: false, email: 'buyer@example.test', buyerName: 'Test Buyer',
  devices: [{ deviceHash: hashDeviceId('wide-pos', boundDevice) }],
};
License.findOne = (q) => ({
  sort: () => ({ lean: async () => (lic.devices.some((d) => q['devices.deviceHash'].$in.includes(d.deviceHash)) ? lic : null) }),
});

const audits = [];
PinResetAudit.create = async (doc) => { audits.push(doc); return doc; };
PinResetAudit.find = () => ({ sort: () => ({ limit: () => ({ lean: async () => audits.slice().reverse() }) }) });

// ---- server ---------------------------------------------------------------------------------
const app = express();
app.use(express.json());
app.use('/api/license/v1', licenseRoutes);
const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
const base = `http://127.0.0.1:${server.address().port}/api/license/v1/admin`;
test.after(() => server.close());

const tokenFor = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
const post = async (body, token = tokenFor(adminUser)) => {
  const r = await fetch(`${base}/pin-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json() };
};
const nonce16 = () => crypto.randomBytes(16).toString('base64url');
const now = () => Math.floor(Date.now() / 1000);
const pub = () => crypto.createPublicKey({
  key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(publicKeyBase64(), 'base64')]), format: 'der', type: 'spki',
});

// ---- tests ------------------------------------------------------------------------------------
test('valid request: reset code verifies with the public key over the exact message', async () => {
  const nonce = nonce16();
  const t = now();
  const requestCode = makeRequestCode({ appId: 'wide-pos', deviceId: boundDevice, nonce, t });
  const before = audits.length;
  const r = await post({ requestCode });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.match(r.body.resetCode, /^WTP1-[A-Za-z0-9_-]+$/);
  const sig = fromBase64Url(r.body.resetCode.slice(5));
  assert.equal(sig.length, 64);
  const msg = Buffer.from(`wt-pin-reset-v1|wide-pos|${boundDevice}|${nonce}`, 'utf8');
  assert.equal(pinResetMessage('wide-pos', boundDevice, nonce), msg.toString('utf8'));
  assert.equal(crypto.verify(null, msg, pub(), sig), true);
  // a different nonce / device must not verify
  assert.equal(crypto.verify(null, Buffer.from(`wt-pin-reset-v1|wide-pos|${boundDevice}|${nonce16()}`), pub(), sig), false);
  assert.equal(r.body.appId, 'wide-pos');
  assert.equal(r.body.deviceId, boundDevice);
  assert.equal(r.body.nonce, nonce);
  assert.equal(r.body.requestedAt, new Date(t * 1000).toISOString());
  assert.equal(r.body.activationFound, true);
  assert.equal(r.body.licence.key, key);
  assert.deepEqual(r.body.customer, { name: 'Test Buyer', email: 'buyer@example.test' });
  // never leaks key material
  assert.ok(!JSON.stringify(r.body).includes(process.env.LICENSE_SIGNING_PRIVATE_KEY));
  // audit entry written
  assert.equal(audits.length, before + 1);
  const a = audits.at(-1);
  assert.equal(a.adminEmail, adminUser.email);
  assert.equal(String(a.adminId), adminUser._id);
  assert.equal(a.appId, 'wide-pos');
  assert.equal(a.deviceId, boundDevice);
  assert.equal(a.nonce, nonce);
  assert.equal(String(a.license), lic._id);
  assert.equal(a.activationFound, true);
  assert.ok(a.ip);
  assert.ok(!JSON.stringify(a).includes(key), 'full licence key is not stored in the audit log');
});

test('no activation for the device: still signed, activationFound false, audited', async () => {
  const nonce = nonce16();
  const before = audits.length;
  const r = await post({ requestCode: makeRequestCode({ appId: 'wide-pos', deviceId: 'b'.repeat(64), nonce, t: now() }) });
  assert.equal(r.status, 200);
  assert.equal(r.body.activationFound, false);
  assert.equal(r.body.licence, undefined);
  assert.equal(r.body.customer, undefined);
  const sig = fromBase64Url(r.body.resetCode.slice(5));
  assert.equal(crypto.verify(null, Buffer.from(`wt-pin-reset-v1|wide-pos|${'b'.repeat(64)}|${nonce}`), pub(), sig), true);
  assert.equal(audits.length, before + 1);
  assert.equal(audits.at(-1).activationFound, false);
  assert.equal(audits.at(-1).license, null);
});

test('bad prefix → 400', async () => {
  const code = makeRequestCode({ appId: 'wide-pos', deviceId: boundDevice, nonce: nonce16(), t: now() }).replace('WTR1-', 'WTX1-');
  const r = await post({ requestCode: code });
  assert.equal(r.status, 400);
  assert.match(r.body.message, /WTR1-/);
});

test('bad base64 / bad JSON / bad shape → 400 (never 500)', async () => {
  const bad = [
    'WTR1-***not base64***',
    'WTR1-' + Buffer.from('{not json', 'utf8').toString('base64url'),
    'WTR1-' + Buffer.from('[1,2]', 'utf8').toString('base64url'),
    makeRequestCode({ appId: 'wide-pos', deviceId: 'xyz', nonce: nonce16(), t: now() }),
    makeRequestCode({ appId: 'wide-pos', deviceId: boundDevice, nonce: crypto.randomBytes(8).toString('base64url'), t: now() }),
    makeRequestCode({ appId: 'wide-pos', deviceId: boundDevice, nonce: nonce16(), t: '123' }),
    makeRequestCode({ appId: 'wide-pos', deviceId: boundDevice, nonce: nonce16(), t: 1.5 }),
    makeRequestCode({ appId: 'wide-pos', deviceId: boundDevice, nonce: nonce16(), t: now() - 8 * 86400 }),
    makeRequestCode({ appId: 'wide-pos', deviceId: boundDevice, nonce: nonce16(), t: now() + 86400 }),
    makeRequestCode({ appId: '', deviceId: boundDevice, nonce: nonce16(), t: now() }),
  ];
  for (const requestCode of bad) {
    const r = await post({ requestCode });
    assert.equal(r.status, 400, `${requestCode} → ${r.status} ${JSON.stringify(r.body)}`);
    assert.ok(r.body.message);
  }
  for (const body of [{}, { requestCode: 42 }, { requestCode: { $ne: 1 } }]) {
    assert.equal((await post(body)).status, 400);
  }
});

test('old request codes get a clear error', () => {
  assert.throws(() => parseRequestCode(makeRequestCode({ appId: 'a', deviceId: boundDevice, nonce: nonce16(), t: now() - 30 * 86400 })),
    (e) => e instanceof PinResetError && e.code === 'expired' && /7 days/.test(e.message));
});

test('unknown app → 404', async () => {
  const before = audits.length;
  const r = await post({ requestCode: makeRequestCode({ appId: 'not-a-product', deviceId: boundDevice, nonce: nonce16(), t: now() }) });
  assert.equal(r.status, 404);
  assert.match(r.body.message, /Unknown app/);
  assert.equal(r.body.resetCode, undefined);
  assert.equal(audits.length, before);
});

test('non-admin → 403, no token → 401', async () => {
  const code = makeRequestCode({ appId: 'wide-pos', deviceId: boundDevice, nonce: nonce16(), t: now() });
  const r1 = await post({ requestCode: code }, tokenFor(normalUser));
  assert.equal(r1.status, 403);
  assert.equal(r1.body.resetCode, undefined);
  const r2 = await post({ requestCode: code }, null);
  assert.equal(r2.status, 401);
  const h = await fetch(`${base}/pin-reset/history`, { headers: { Authorization: `Bearer ${tokenFor(normalUser)}` } });
  assert.equal(h.status, 403);
});

test('history returns recent audit entries (admin only)', async () => {
  const r = await fetch(`${base}/pin-reset/history`, { headers: { Authorization: `Bearer ${tokenFor(adminUser)}` } });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.ok(Array.isArray(body.history) && body.history.length >= 2);
  assert.ok(body.history.length <= 50);
  assert.equal(body.history[0].appId, 'wide-pos');
});
