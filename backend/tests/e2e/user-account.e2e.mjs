/**
 * End-to-end checks for the customer dashboard API (/dashboard/*) against a RUNNING local backend:
 * every user endpoint needs a login, and a user can only ever see or change their own data (IDOR).
 *
 *   E2E_API=http://localhost:5001/api MONGODB_URI=mongodb://127.0.0.1:27017/widetechnos \
 *   node tests/e2e/user-account.e2e.mjs
 *
 * Creates two throwaway users (A and B) plus a licence, transactions, a service order and
 * enquiries directly in the database, and deletes all of them at the end. Needs at least one
 * Software, Service and Course document to exist. Never run against production.
 */
import crypto from 'node:crypto';
import mongoose from 'mongoose';

const API = (process.env.E2E_API || 'http://localhost:5001/api').replace(/\/$/, '');
const MONGODB_URI = process.env.MONGODB_URI;
if (/widetech\.in/.test(API)) throw new Error('Refusing to run e2e against production');
if (!MONGODB_URI) throw new Error('Set MONGODB_URI (the same database the backend uses)');

let failures = 0;
const ok = (cond, label, extra = '') => {
  console.log(`${cond ? '  ✔' : '  ✖'} ${label}${extra ? `  ${extra}` : ''}`);
  if (!cond) failures += 1;
};
const req = async (method, path, body, token) => {
  const r = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

const run = Date.now().toString(36);
const PASS = `E2e-${crypto.randomBytes(6).toString('hex')}`;
const emailA = `e2e-ua-a-${run}@example.test`;
const emailB = `e2e-ua-b-${run}@example.test`;

await mongoose.connect(MONGODB_URI);
const db = mongoose.connection.db;
const created = { licenses: [], transactions: [], serviceorders: [], contactmessages: [] };

const software = await db.collection('softwares').findOne({});
const service = await db.collection('services').findOne({});
const course = await db.collection('courses').findOne({});
if (!software || !service || !course) throw new Error('Need at least one software, service and course in the database');

const register = async (name, email) => {
  const r = await req('POST', '/auth/register', { name, email, password: PASS });
  if (!r.body.token) throw new Error(`register failed: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.token;
};

try {
  console.log('Setup');
  let tokA = await register('E2E User A', emailA);
  // B's account is created a moment later, so "before B existed" is well defined.
  const userA = await db.collection('users').findOne({ email: emailA });
  const past = new Date(Date.now() - 3600 * 1000);
  const tokB = await register('E2E User B', emailB);
  const userB = await db.collection('users').findOne({ email: emailB });
  ok(Boolean(userA && userB), 'two test users registered');

  const now = new Date();
  const fakeLicence = (extra) => ({
    software: software._id, appId: software.appId || 'e2e', softwareTitle: software.title,
    keyHash: crypto.randomBytes(32).toString('hex'), keyEnc: 'not-decryptable', keyLast: 'E2E0',
    planName: 'E2E plan', billing: 'yearly', expiresAt: new Date(Date.now() + 30 * 864e5),
    maxDevices: 2, revoked: false, devices: [], selfDeactivations: [], createdAt: now, updatedAt: now, ...extra,
  });
  const devHash = crypto.randomBytes(32).toString('hex');
  const licA = (await db.collection('licenses').insertOne(fakeLicence({
    email: emailA, userId: userA._id,
    devices: [{ deviceHash: devHash, deviceName: 'E2E-PC', activatedAt: now, lastSeenAt: now }],
  }))).insertedId;
  // Issued to B's email address BEFORE B's account existed (must stay hidden from B)…
  const licOld = (await db.collection('licenses').insertOne(fakeLicence({ email: emailB, createdAt: past, updatedAt: past }))).insertedId;
  // …and one issued to B's email AFTER the account existed (must be visible to B).
  const licNew = (await db.collection('licenses').insertOne(fakeLicence({ email: emailB, createdAt: new Date(Date.now() + 1000) }))).insertedId;
  created.licenses.push(licA, licOld, licNew);

  const txnA = `E2EUA${run}A`.toUpperCase();
  const txnDoc = (await db.collection('transactions').insertOne({
    txnid: txnA, userId: userA._id, email: emailA, itemType: 'course', itemId: course._id, amount: 499,
    status: 'success', gateway: 'razorpay', createdAt: now, updatedAt: now,
  })).insertedId;
  created.transactions.push(txnDoc);
  const soA = (await db.collection('serviceorders').insertOne({
    orderNo: `SO-E2E-${run}`, service: service._id, serviceTitle: service.title, userId: userA._id,
    buyerEmail: emailA, transaction: txnDoc, txnid: txnA, amount: 499, status: 'paid', createdAt: now, updatedAt: now,
  })).insertedId;
  created.serviceorders.push(soA);
  const enqOld = (await db.collection('contactmessages').insertOne({ name: 'X', email: emailB, subject: 'E2E old', message: 'before account', status: 'new', createdAt: past, updatedAt: past })).insertedId;
  const enqNew = (await db.collection('contactmessages').insertOne({ name: 'X', email: emailB, subject: 'E2E new', message: 'after account', status: 'new', createdAt: new Date(Date.now() + 1000), updatedAt: now })).insertedId;
  created.contactmessages.push(enqOld, enqNew);

  console.log('Every user endpoint needs a login');
  const userEndpoints = [
    ['GET', '/auth/profile'], ['PUT', '/auth/profile'], ['POST', '/auth/change-password'], ['POST', '/auth/logout-all'],
    ['GET', '/progress/my-learning'], ['GET', '/certificates'], ['GET', `/certificates/courses/${course._id}`],
    ['GET', '/account/licenses'], ['GET', '/account/service-orders'], ['GET', '/account/enquiries'],
    ['POST', `/account/licenses/${licA}/devices/${devHash.slice(0, 16)}/deactivate`],
    ['GET', '/payment/my-invoices'], ['GET', `/payment/invoice/${txnA}`], ['GET', `/software/${software._id}/download?format=json`],
  ];
  for (const [m, p] of userEndpoints) {
    const r = await req(m, p, m === 'GET' ? undefined : {});
    ok(r.status === 401, `${m} ${p.replace(/\?.*/, '')} without a token → 401`, `(got ${r.status})`);
  }
  const bad = await req('GET', '/account/licenses', undefined, 'not-a-real-token');
  ok(bad.status === 401, 'garbage token → 401', `(got ${bad.status})`);

  console.log('Licences: own data only');
  const la = await req('GET', '/account/licenses', undefined, tokA);
  ok(la.status === 200 && la.body.licenses.some((l) => String(l._id) === String(licA)), 'A sees own licence');
  ok(la.body.licenses?.[0]?.devices?.[0]?.ref?.length === 16 && !JSON.stringify(la.body).includes(devHash), 'device hash is never exposed (short ref only)');
  const lb = await req('GET', '/account/licenses', undefined, tokB);
  const idsB = (lb.body.licenses || []).map((l) => String(l._id));
  ok(!idsB.includes(String(licA)), "B does not see A's licence");
  ok(!idsB.includes(String(licOld)), "B does not see a licence issued to B's email before B's account existed");
  ok(idsB.includes(String(licNew)), "B sees a licence issued to B's email after the account existed");

  const ref = devHash.slice(0, 16);
  const idor = await req('POST', `/account/licenses/${licA}/devices/${ref}/deactivate`, {}, tokB);
  ok(idor.status === 404, "B cannot remove a computer from A's licence", `(got ${idor.status})`);
  const stillThere = await db.collection('licenses').findOne({ _id: licA });
  ok(stillThere.devices.length === 1, "A's computer is still linked after B's attempt");
  const badRef = await req('POST', `/account/licenses/${licA}/devices/zz$$/deactivate`, {}, tokA);
  ok(badRef.status === 400, 'malformed device ref → 400', `(got ${badRef.status})`);
  const own = await req('POST', `/account/licenses/${licA}/devices/${ref}/deactivate`, {}, tokA);
  ok(own.status === 200 && own.body.license?.devices?.length === 0, 'A can remove own computer', `(got ${own.status})`);
  ok(own.body.license?.selfDeactivate?.remaining >= 0, 'self-deactivation allowance is reported');

  console.log('Invoices: own data only');
  const ia = await req('GET', `/payment/invoice/${encodeURIComponent(txnA)}`, undefined, tokA);
  ok(ia.status === 200, 'A can open own invoice', `(got ${ia.status})`);
  const ib = await req('GET', `/payment/invoice/${encodeURIComponent(txnA)}`, undefined, tokB);
  ok(ib.status === 403 || ib.status === 404, "B cannot open A's invoice", `(got ${ib.status})`);
  const mib = await req('GET', '/payment/my-invoices', undefined, tokB);
  ok(mib.status === 200 && !JSON.stringify(mib.body).includes(txnA), "A's transaction is not in B's invoice list");
  const mia = await req('GET', '/payment/my-invoices', undefined, tokA);
  ok(mia.status === 200 && JSON.stringify(mia.body).includes(txnA), "A's transaction is in A's invoice list");

  console.log('Service orders and enquiries: own data only');
  const sa = await req('GET', '/account/service-orders', undefined, tokA);
  ok(sa.status === 200 && (sa.body.orders || []).some((o) => String(o._id) === String(soA)), 'A sees own service order');
  const sb = await req('GET', '/account/service-orders', undefined, tokB);
  ok(sb.status === 200 && !(sb.body.orders || []).some((o) => String(o._id) === String(soA)), "B does not see A's service order");
  const eb = await req('GET', '/account/enquiries', undefined, tokB);
  const subjects = JSON.stringify(eb.body);
  ok(eb.status === 200 && subjects.includes('E2E new') && !subjects.includes('E2E old'), "B sees only enquiries sent after the account existed");

  console.log('Certificates and downloads');
  const cb = await req('GET', `/certificates/courses/${course._id}`, undefined, tokB);
  ok(cb.status === 403 || cb.status === 404, 'no certificate for a course the user has not finished', `(got ${cb.status})`);
  const cinv = await req('GET', '/certificates/courses/not-an-id', undefined, tokB);
  ok(cinv.status === 400, 'invalid course id → 400', `(got ${cinv.status})`);
  const v = await req('GET', '/certificates/verify/WTC-0000-0000-0000-0000');
  ok(v.status === 404 && v.body.valid === false, 'unknown certificate ID → not found');
  if (!(software.price === 0 || software.isFree)) {
    // B's only usable licence is revoked for this check; the older email-only licence must not count.
    await db.collection('licenses').updateOne({ _id: licNew }, { $set: { revoked: true } });
    const dl = await req('GET', `/software/${software._id}/download?format=json`, undefined, tokB);
    ok(dl.status === 403, 'paid software download is refused without a purchase or valid licence', `(got ${dl.status})`);
  }

  console.log('Profile and security');
  const up = await req('PUT', '/auth/profile', { name: 'E2E Renamed', role: 'admin', email: 'hijack@example.test', isAdmin: true }, tokA);
  const afterUp = await db.collection('users').findOne({ _id: userA._id });
  ok(up.status === 200 && afterUp.name === 'E2E Renamed', 'A can rename themselves', `(got ${up.status})`);
  ok(afterUp.email === emailA && afterUp.role !== 'admin' && afterUp.isAdmin !== true, 'profile update cannot change email or role');
  const wrong = await req('POST', '/auth/change-password', { currentPassword: 'wrong-password', newPassword: `${PASS}x` }, tokA);
  ok(wrong.status >= 400 && wrong.status < 500, 'wrong current password is rejected', `(got ${wrong.status})`);
  const cp = await req('POST', '/auth/change-password', { currentPassword: PASS, newPassword: `${PASS}x` }, tokA);
  ok(cp.status === 200, 'password change with the right current password', `(got ${cp.status})`);
  if (cp.body.token) tokA = cp.body.token;
  const login = await req('POST', '/auth/login', { email: emailA, password: `${PASS}x` });
  ok(login.status === 200 && Boolean(login.body.token), 'new password works');
  tokA = login.body.token || tokA;
  const la2 = await req('POST', '/auth/logout-all', {}, tokA);
  ok(la2.status === 200, 'logout everywhere', `(got ${la2.status})`);
  const afterLogout = await req('GET', '/auth/profile', undefined, tokA);
  ok(afterLogout.status === 401, 'old token stops working after logout everywhere', `(got ${afterLogout.status})`);
} finally {
  for (const [col, ids] of Object.entries(created)) if (ids.length) await db.collection(col).deleteMany({ _id: { $in: ids } });
  await db.collection('users').deleteMany({ email: { $in: [emailA, emailB] } });
  await mongoose.disconnect();
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll user-account checks passed');
process.exit(failures ? 1 : 0);
