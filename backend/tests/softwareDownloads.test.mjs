// npm test   (no database needed: the Mongoose model calls used by the routes are stubbed)
// Covers Admin → Software → Versions uploads and GET /api/software/:slugOrId/download.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-sw-dl-'));
process.env.SOFTWARE_DOWNLOADS_DIR = tmp;
process.env.SOFTWARE_MAX_UPLOAD_MB = '2';
process.env.ADMIN_EMAIL = 'admin@example.test';
process.env.JWT_SECRET = 'test-jwt-secret-for-software-download-tests-only';

const { default: express } = await import('express');
const { default: jwt } = await import('jsonwebtoken');
const { default: User } = await import('../models/User.js');
const { default: Software } = await import('../models/Software.js');
const { default: License } = await import('../models/License.js');
const { default: GstConfig } = await import('../models/GstConfig.js');
const { default: FunnelEvent } = await import('../models/FunnelEvent.js');
const { default: SoftwareVersion } = await import('../models/SoftwareVersion.js');
const { default: softwareRoutes } = await import('../routes/softwareRoutes.js');
const { default: versionAdminRoutes } = await import('../routes/softwareVersionAdminRoutes.js');
const dl = await import('../utils/softwareDownloads.js');

// ---- stubs ---------------------------------------------------------------------------------
const adminUser = { _id: '64b000000000000000000001', email: 'admin@example.test', role: 'admin' };
const normalUser = { _id: '64b000000000000000000002', email: 'someone@example.test', role: 'user', purchasedSoftware: [] };
const buyer = { _id: '64b000000000000000000003', email: 'buyer@example.test', role: 'user', purchasedSoftware: [] };
const users = { [adminUser._id]: adminUser, [normalUser._id]: normalUser, [buyer._id]: buyer };
User.findById = (id) => ({ select: async () => users[String(id)] || null });

const sw = {
  _id: '64b0000000000000000000aa', title: 'Wide POS Billing', slug: 'wide-tech-pos-billing', appId: 'wide-pos-billing',
  status: 'active', price: 18999, licensingEnabled: true, trialEnabled: true, trialDays: 7, plans: [], allowFreeDownload: true,
};
const match = (doc, q) => Object.entries(q).every(([k, v]) => {
  if (v && typeof v === 'object' && '$ne' in v) return String(doc[k]) !== String(v.$ne);
  if (v && typeof v === 'object' && '$in' in v) return v.$in.map(String).includes(String(doc[k]));
  return String(doc[k]) === String(v);
});
Software.findById = (id) => ({ select: () => ({ lean: async () => (String(id) === sw._id ? sw : null) }) });
Software.findOne = async (q) => (match(sw, q) ? sw : null);
GstConfig.findOne = async () => ({ sellerState: 'Kerala', gstin: '32TESTX0000X1Z0', legalName: 'Test', gstRate: 18, isInclusive: true });
License.exists = async (q) => String(q.$or?.[0]?.userId) === buyer._id;
const events = [];
FunnelEvent.create = async (e) => { events.push(e); return e; };

const versions = [];
let nextId = 1;
const withSave = (v) => Object.assign(v, { save: async () => v });
SoftwareVersion.find = (q) => ({ lean: async () => versions.filter((v) => match(v, q)).map((v) => ({ ...v })) });
SoftwareVersion.exists = async (q) => versions.some((v) => match(v, q));
SoftwareVersion.create = async (doc) => {
  const v = { _id: (`64c${String(nextId++).padStart(21, '0')}`), downloadCount: 0, createdAt: new Date(), ...doc };
  versions.push(v);
  return v;
};
SoftwareVersion.updateMany = async (q, u) => { versions.filter((v) => match(v, q)).forEach((v) => Object.assign(v, u.$set)); };
SoftwareVersion.updateOne = async (q, u) => { const v = versions.find((x) => match(x, q)); if (v) v.downloadCount += u.$inc.downloadCount; };
SoftwareVersion.findOne = (q) => {
  const v = versions.find((x) => match(x, q));
  const p = Promise.resolve(v ? withSave(v) : null);
  p.lean = async () => (v ? { ...v } : null);
  return p;
};
SoftwareVersion.deleteOne = async (q) => { const i = versions.findIndex((v) => match(v, q)); if (i >= 0) versions.splice(i, 1); };

// ---- server ---------------------------------------------------------------------------------
const app = express();
app.use(express.json());
app.use('/api/admin/software', versionAdminRoutes);
app.use('/api/software', softwareRoutes);
const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
const base = `http://127.0.0.1:${server.address().port}/api`;
test.after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const tokenFor = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
const auth = (u) => (u ? { Authorization: `Bearer ${tokenFor(u)}` } : {});
const filesOnDisk = () => (fs.existsSync(path.join(tmp, sw._id)) ? fs.readdirSync(path.join(tmp, sw._id)) : []);

const upload = async ({ user = adminUser, name = 'WidePOS-Setup.zip', bytes = Buffer.from('PK\x03\x04 fake zip ' + crypto.randomBytes(64).toString('hex')), fields = {} } = {}) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ version: '1.0.0', platform: 'windows', notes: 'First release', ...fields })) fd.append(k, v);
  fd.append('file', new Blob([bytes]), name);
  const r = await fetch(`${base}/admin/software/${sw._id}/versions`, { method: 'POST', headers: auth(user), body: fd });
  return { status: r.status, body: await r.json(), bytes };
};
const download = (q = '', headers = {}) => fetch(`${base}/software/${sw.slug}/download${q}`, { headers });

// ---- pure helpers ---------------------------------------------------------------------------
test('filename sanitising, version parsing, allowlist', () => {
  assert.equal(dl.sanitizeFilename('../../Wide POS Setup (x64).EXE'), 'Wide_POS_Setup_x64.exe');
  assert.equal(dl.sanitizeFilename('C:\\evil\\..\\a b.zip'), 'a_b.zip');
  assert.equal(dl.normalizeVersion('v1.2.3'), '1.2.3');
  assert.equal(dl.normalizeVersion('2.0.0-beta.1'), '2.0.0-beta.1');
  assert.equal(dl.normalizeVersion('1.0; rm -rf /'), null);
  assert.ok(dl.isAllowedVersionFile('App.AppImage'));
  assert.ok(dl.isAllowedVersionFile('setup.msix'));
  assert.ok(!dl.isAllowedVersionFile('run.sh'));
  assert.ok(!dl.isAllowedVersionFile('setup.exe.js'));
  assert.ok(dl.compareVersions('1.10.0', '1.9.3') > 0);
  assert.ok(dl.compareVersions('2.0.0-beta', '2.0.0') < 0);
  assert.equal(dl.maxUploadMb(), 2);
});

// ---- admin upload ---------------------------------------------------------------------------
test('upload: anonymous and non-admin users are refused before anything is written', async () => {
  const anon = await upload({ user: null });
  assert.equal(anon.status, 401);
  const user = await upload({ user: normalUser });
  assert.equal(user.status, 403);
  assert.deepEqual(filesOnDisk(), []);
});

test('upload: extensions outside the allowlist are rejected and not kept', async () => {
  for (const name of ['evil.js', 'notes.txt', 'shell.sh', 'page.html', 'noext']) {
    const r = await upload({ name });
    assert.equal(r.status, 400, name);
    assert.match(r.body.message, /not allowed/);
  }
  assert.deepEqual(filesOnDisk(), []);
});

test('upload: files over SOFTWARE_MAX_UPLOAD_MB get 413', async () => {
  const r = await upload({ bytes: Buffer.alloc(2 * 1024 * 1024 + 10), fields: { version: '0.0.1' } });
  assert.equal(r.status, 413);
  assert.deepEqual(filesOnDisk(), []);
});

let v1;
let v1Bytes;
test('upload: admin .zip is streamed to private storage with size and SHA-256', async () => {
  const r = await upload({ name: 'Wide POS Setup.zip' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  v1 = r.body.version;
  v1Bytes = r.bytes;
  assert.equal(v1.version, '1.0.0');
  assert.equal(v1.fileName, 'Wide_POS_Setup.zip');
  assert.equal(v1.size, r.bytes.length);
  assert.equal(v1.sha256, crypto.createHash('sha256').update(r.bytes).digest('hex'));
  assert.equal(v1.isLatest, true);
  assert.equal(filesOnDisk().length, 1);
  assert.ok(!path.resolve(tmp).includes(`${path.sep}public${path.sep}`));
  const dup = await upload({});
  assert.equal(dup.status, 409, 'same version + platform cannot be uploaded twice');
  assert.equal(filesOnDisk().length, 1);
});

let v2;
test('upload: a new version becomes latest and never removes the older file', async () => {
  const r = await upload({ name: 'WidePOS-1.1.0.exe', fields: { version: '1.1.0', releaseDate: '2026-10-29' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  v2 = r.body.version;
  assert.equal(filesOnDisk().length, 2);
  const list = await (await fetch(`${base}/admin/software/${sw._id}/versions`, { headers: auth(adminUser) })).json();
  assert.equal(list.versions.length, 2);
  assert.equal(list.versions.find((v) => v.version === '1.1.0').isLatest, true);
  assert.equal(list.versions.find((v) => v.version === '1.0.0').isLatest, false);
});

// ---- public download ------------------------------------------------------------------------
test('public download (free trial allowed): attachment, filename, length, latest by default', async () => {
  const r = await download();
  assert.equal(r.status, 200);
  const cd = r.headers.get('content-disposition');
  assert.match(cd, /^attachment;/);
  assert.match(cd, /filename="WidePOS-1\.1\.0\.exe"/);
  const body = Buffer.from(await r.arrayBuffer());
  assert.equal(Number(r.headers.get('content-length')), body.length);
  assert.equal(r.headers.get('x-checksum-sha256'), v2.sha256);
  assert.equal(versions.find((v) => v.version === '1.1.0').downloadCount, 1);
  assert.ok(events.some((e) => e.name === 'software_download' && e.source === '1.1.0/windows'));
});

test('older versions stay downloadable; Range requests resume without counting again', async () => {
  const r = await download('?version=1.0.0');
  assert.equal(r.status, 200);
  assert.deepEqual(Buffer.from(await r.arrayBuffer()), v1Bytes);
  const before = versions.find((v) => v.version === '1.0.0').downloadCount;
  const part = await download('?version=1.0.0', { Range: 'bytes=4-9' });
  assert.equal(part.status, 206);
  assert.equal(Buffer.from(await part.arrayBuffer()).toString(), v1Bytes.subarray(4, 10).toString());
  assert.equal(versions.find((v) => v.version === '1.0.0').downloadCount, before);
});

test('unpublished versions are hidden from the page and never downloadable by the public', async () => {
  const put = await fetch(`${base}/admin/software/${sw._id}/versions/${v2._id}`, {
    method: 'PUT', headers: { ...auth(adminUser), 'Content-Type': 'application/json' }, body: JSON.stringify({ published: false }),
  });
  assert.equal(put.status, 200);
  const page = await (await fetch(`${base}/software/${sw.slug}`)).json();
  assert.deepEqual(page.software.versions.map((v) => v.version), ['1.0.0']);
  assert.ok(!JSON.stringify(page).includes('storedName'));
  assert.equal((await download('?version=1.1.0')).status, 404);
  assert.equal((await download('?version=1.1.0', auth(normalUser))).status, 404);
  // the default falls back to the newest published build
  const r = await download();
  assert.match(r.headers.get('content-disposition'), /Wide_POS_Setup\.zip/);
  await r.arrayBuffer();
  // the admin can still fetch it to test
  const a = await download('?version=1.1.0', auth(adminUser));
  assert.equal(a.status, 200);
  await a.arrayBuffer();
  await fetch(`${base}/admin/software/${sw._id}/versions/${v2._id}`, {
    method: 'PUT', headers: { ...auth(adminUser), 'Content-Type': 'application/json' }, body: JSON.stringify({ published: true, isLatest: true }),
  });
});

test('free download OFF: blocked for visitors and non-buyers, allowed for buyers (via short-lived link too)', async () => {
  sw.allowFreeDownload = false;
  try {
    assert.equal((await download()).status, 401);
    assert.equal((await download('', auth(normalUser))).status, 403);
    const ok = await download('', auth(buyer));
    assert.equal(ok.status, 200);
    assert.match(ok.headers.get('content-disposition'), /^attachment;/);
    await ok.arrayBuffer();
    const j = await (await download('?format=json', auth(buyer))).json();
    assert.match(j.url, /ticket=/);
    const viaTicket = await fetch(`http://127.0.0.1:${server.address().port}${j.url}`);
    assert.equal(viaTicket.status, 200);
    await viaTicket.arrayBuffer();
    const forged = await download('?ticket=abc.def.ghi');
    assert.equal(forged.status, 401);
  } finally {
    sw.allowFreeDownload = true;
  }
});

test('admin delete removes only that version and its file', async () => {
  const r = await fetch(`${base}/admin/software/${sw._id}/versions/${v1._id}`, { method: 'DELETE', headers: auth(adminUser) });
  assert.equal(r.status, 200);
  assert.equal(filesOnDisk().length, 1);
  assert.equal((await download('?version=1.0.0')).status, 404);
  const other = await fetch(`${base}/admin/software/${sw._id}/versions/${v2._id}`, { method: 'DELETE', headers: auth(normalUser) });
  assert.equal(other.status, 403);
  assert.equal(filesOnDisk().length, 1);
});
