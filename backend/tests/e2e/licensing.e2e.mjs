/**
 * End-to-end licensing test for the Node and Python SDKs against a RUNNING local backend.
 *
 * Needs: backend in test/mock payment mode (no live Razorpay keys, NODE_ENV != production),
 * LICENSE_SIGNING_PRIVATE_KEY set (or the dev ephemeral key), and the same MongoDB.
 *
 *   E2E_API=http://localhost:5001/api MONGODB_URI=mongodb://127.0.0.1:27017/widetech \
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... node tests/e2e/licensing.e2e.mjs
 *
 * Scenarios per client: trial → trial expired (DB edit) → locked → buy (create-order + verify, the
 * same fulfilment code real payments use) → key → activate → works → 2nd device → device_limit →
 * admin revoke → locked → tampered response → rejected. Creates its own "E2E" software product
 * and deletes it at the end. Never run against production.
 */
import { execFile } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const API = (process.env.E2E_API || 'http://localhost:5001/api').replace(/\/$/, '');
const PY = process.env.E2E_PYTHON || 'python3';
const clients = (process.env.E2E_CLIENTS || 'node,python').split(',');
if (/widetech\.in/.test(API)) throw new Error('Refusing to run e2e against production');

let failures = 0;
const ok = (cond, label, extra = '') => {
  console.log(`${cond ? '  ✔' : '  ✖'} ${label}${extra ? `  ${extra}` : ''}`);
  if (!cond) failures += 1;
};
const req = async (method, url, body, token) => {
  const r = await fetch(url.startsWith('http') ? url : API + url, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

// Proxy that edits the signed payload (simulates a cracked/fake server or a man-in-the-middle)
const startTamperProxy = (target) => new Promise((resolve) => {
  const srv = http.createServer(async (rq, rs) => {
    let data = '';
    rq.on('data', (c) => { data += c; });
    rq.on('end', async () => {
      const r = await fetch(target + rq.url, { method: rq.method, headers: { 'Content-Type': 'application/json' }, body: data || undefined });
      const j = await r.json();
      if (j.payload) {
        j.payload = j.payload.replace(/"status":"[a-z_]+"/, '"status":"active"').replace(/"expiresAt":(null|"[^"]*")/, '"expiresAt":null');
      }
      rs.writeHead(200, { 'Content-Type': 'application/json' });
      rs.end(JSON.stringify(j));
    });
  });
  srv.listen(0, '127.0.0.1', () => resolve(srv));
});

// Async on purpose: the tamper proxy runs in this process and must keep serving while a client runs.
const run = (client, env, ...args) => new Promise((resolve) => {
  const [bin, argv, cwd] = client === 'node'
    ? [process.execPath, [path.join(root, 'clients/node/e2e_driver.js'), ...args], root]
    : [PY, [path.join(root, 'clients/python/e2e_driver.py'), ...args], path.join(root, 'clients/python')];
  execFile(bin, argv, { env: { ...process.env, ...env }, cwd, encoding: 'utf8', timeout: 60_000 }, (err, stdout, stderr) => {
    try { resolve(JSON.parse(stdout)); } catch { resolve({ error: stderr || stdout || String(err) }); }
  });
});

const main = async () => {
  const login = await req('POST', '/auth/login', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  const token = login.body.token;
  if (!token) throw new Error(`Admin login failed (${login.status})`);
  const pk = await req('GET', '/license/v1/public-key');
  const publicKey = pk.body.publicKey;
  if (!publicKey) throw new Error('No public key from /license/v1/public-key');
  await mongoose.connect(process.env.MONGODB_URI);

  for (const client of clients) {
    console.log(`\n[${client}] client`);
    const tag = `e2e-${client}-${Date.now().toString(36)}`;
    const created = await req('POST', '/admin/software', {
      title: `E2E ${client} app ${tag}`, slug: tag, description: 'Automated licensing test product (safe to delete).',
      category: 'Other', pricingType: 'one_time', ctaType: 'buy', isPublished: true,
      licensingEnabled: true, trialEnabled: true, trialDays: 7,
      plans: [{ name: 'E2E Monthly', price: 100, billing: 'monthly', maxDevices: 1 }],
    }, token);
    ok(created.status === 201, 'admin creates software with a plan', created.status !== 201 ? JSON.stringify(created.body) : '');
    if (created.status !== 201) continue;
    const sw = created.body.software;
    const appId = sw.appId;
    const store = fs.mkdtempSync(path.join(os.tmpdir(), `wt-${client}-`));
    const devA = { WT_API: `${API}/license/v1`, WT_APP_ID: appId, WT_PUBLIC_KEY: publicKey, WT_STORAGE_DIR: path.join(store, 'a'), WT_DEVICE_ID: `${tag}-device-a` };
    const devB = { ...devA, WT_STORAGE_DIR: path.join(store, 'b'), WT_DEVICE_ID: `${tag}-device-b` };

    try {
      let s = await run(client, devA, 'check');
      ok(s.allowed === true && s.status === 'trial', 'first launch starts the free trial', `${s.status} · ${s.daysLeft} days`);

      // reinstall (wipe local storage) → same trial, not a new one
      fs.rmSync(devA.WT_STORAGE_DIR, { recursive: true, force: true });
      s = await run(client, devA, 'check');
      ok(s.status === 'trial' && s.daysLeft <= 7, 'reinstall keeps the same trial');

      await mongoose.connection.collection('trialdevices').updateMany(
        { software: new mongoose.Types.ObjectId(sw._id) }, { $set: { expiresAt: new Date(Date.now() - 60_000) } });
      s = await run(client, devA, 'check');
      ok(s.allowed === false && s.status === 'expired', 'trial expired (DB edit) → locked', s.status);

      const pub = await req('GET', `/software/${sw.slug}`);
      const plan = (pub.body.software?.plans || [])[0];
      const co = await req('POST', '/payment/razorpay/create-order', {
        itemType: 'software', itemId: sw.slug, variantId: plan?._id, buyerName: 'E2E Buyer',
        buyerEmail: `${tag}@example.com`, phone: '9000000000', buyerState: 'Kerala',
      });
      ok(co.status === 200 && co.body.success, 'create-order for the plan', co.body.message || '');
      const ver = await req('POST', '/payment/razorpay/verify', {
        txnid: co.body.txnid, razorpay_order_id: co.body.orderId, razorpay_payment_id: `pay_mock_${tag}`, razorpay_signature: 'mock_signature',
      });
      const key = ver.body.licenseKey;
      ok(ver.status === 200 && /^WT-[0-9A-Z]{5}(-[0-9A-Z]{5}){3}$/.test(key || ''), 'verified payment issues a licence key', key ? `…${key.slice(-5)}` : JSON.stringify(ver.body).slice(0, 200));

      s = await run(client, devA, 'activate', key.toLowerCase());
      ok(s.allowed === true && s.status === 'active', 'activate key on device A → works', `${s.status} · ${s.plan}`);
      s = await run(client, devA, 'check');
      ok(s.allowed === true && s.status === 'active', 'next launch validates online → works');

      s = await run(client, devB, 'activate', key);
      ok(s.allowed === false && s.status === 'device_limit', 'device B (maxDevices 1) → device_limit', s.status);

      const tamperProxy = await startTamperProxy(API.replace(/\/api$/, ''));
      const proxied = { ...devB, WT_API: `http://127.0.0.1:${tamperProxy.address().port}/api/license/v1` };
      s = await run(client, proxied, 'activate', key);
      ok(s.allowed === false && s.status === 'invalid' && /signature/i.test(s.message || ''), 'tampered response → rejected', s.message);

      const rv = await req('PATCH', `/admin/licensing/licenses/${ver.body.license.id}`, { action: 'revoke', reason: 'e2e test' }, token);
      ok(rv.status === 200, 'admin revokes the key');
      s = await run(client, devA, 'check');
      ok(s.allowed === false && s.status === 'revoked', 'revoked → locked', s.status);

      const proxiedA = { ...devA, WT_API: proxied.WT_API };
      s = await run(client, proxiedA, 'check');
      ok(s.allowed === false && /signature/i.test(s.message || ''), 'tampered "revoked→active" answer → still locked', s.message);
      tamperProxy.close();

      const bad = await run(client, devB, 'activate', 'WT-AAAAA-BBBBB-CCCCC-DDDDD');
      ok(bad.allowed === false && bad.status === 'invalid', 'random key → invalid', bad.status);
    } finally {
      await req('DELETE', `/admin/software/${sw._id}`, null, token);
      fs.rmSync(store, { recursive: true, force: true });
    }
  }
  await mongoose.disconnect();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll licensing e2e checks passed');
  process.exit(failures ? 1 : 0);
};

main().catch(async (e) => { console.error(e); await mongoose.disconnect().catch(() => {}); process.exit(1); });
