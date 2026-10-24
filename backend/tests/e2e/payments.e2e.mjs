/**
 * Payment regression + security checks against a RUNNING local backend in mock/test mode.
 *
 *   E2E_API=http://localhost:5001/api MONGODB_URI=... node tests/e2e/payments.e2e.mjs
 *
 * Optional:
 *   E2E_BASE_API=http://localhost:5002/api   a second backend running the PREVIOUS code on the same
 *                                            DB; course create-order results must be identical.
 *   E2E_SIG_API=http://localhost:5003/api    a backend started with a non-mock TEST key id and
 *   E2E_SIG_SECRET=<that RAZORPAY_KEY_SECRET> a dummy secret, to test signature verification
 *                                            (no call to Razorpay is made: orders are inserted in the DB).
 * Never run against production.
 */
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Transaction from '../../models/Transaction.js';
import Course from '../../models/Course.js';
import User from '../../models/User.js';
import Coupon from '../../models/Coupon.js';
import Software from '../../models/Software.js';
import Service from '../../models/Service.js';
import License from '../../models/License.js';

const API = (process.env.E2E_API || 'http://localhost:5001/api').replace(/\/$/, '');
const BASE = process.env.E2E_BASE_API?.replace(/\/$/, '');
const SIG = process.env.E2E_SIG_API?.replace(/\/$/, '');
for (const u of [API, BASE, SIG]) if (u && /widetech\.in/.test(u)) throw new Error('Refusing to run against production');

let failures = 0;
const ok = (cond, label, extra = '') => { console.log(`${cond ? '  ✔' : '  ✖'} ${label}${extra ? `  ${extra}` : ''}`); if (!cond) failures += 1; };
const post = async (base, url, body, token) => {
  const r = await fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const cookie = r.headers.get('set-cookie') || '';
  return { status: r.status, body: await r.json().catch(() => ({})), setCookie: /(?:^|,\s*)token=[^;]/.test(cookie) ? cookie : '' };
};
const get = async (base, url, token) => {
  const r = await fetch(base + url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const stable = (b) => {
  const { txnid, orderId, invoiceNo, razorpayOrderId, ...rest } = b || {};
  return JSON.stringify(rest, Object.keys(rest).sort());
};
const tag = Date.now().toString(36);

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const courses = await Course.find({ price: { $gt: 0 } }).lean();
  console.log(`\nCourse purchases (${courses.length} paid course(s) in the local DB)`);
  ok(courses.length > 0, 'there is at least one paid course to test');

  for (const c of courses) {
    const expected = (c.discountedPrice !== undefined && c.discountedPrice !== null && c.discountedPrice >= 0 && c.discountedPrice < c.price) ? c.discountedPrice : c.price;
    for (const state of ['Kerala', 'Maharashtra']) {
      const body = {
        itemType: 'course', itemId: String(c._id), buyerName: 'Regression Buyer', buyerEmail: `reg-${tag}-${c._id}-${state}@example.com`,
        phone: '9000000000', buyerState: state, amount: 1, price: 1, // amount/price in the body must be ignored
      };
      const now = await post(API, '/payment/razorpay/create-order', body);
      ok(now.status === 200 && now.body.success !== false, `create-order ${c.title.slice(0, 30)} (${state})`, `₹${now.body.amount / 100}`);
      ok(Number(now.body.amount) === Math.round(expected * 100), '  charged amount (paise) = course price (client amount ignored)', `${now.body.amount / 100} vs ${expected}`);
      const txn = await Transaction.findOne({ txnid: now.body.txnid }).lean();
      const r2 = (n) => Math.round(n * 100) / 100;
      const base = r2(expected / 1.18);
      ok(txn && txn.amount === expected && txn.gstDetails?.baseAmount === base && txn.gstDetails?.gstAmount === r2(expected - base),
        '  GST inclusive @18%: base/gst unchanged', `${txn?.gstDetails?.baseAmount} + ${txn?.gstDetails?.gstAmount}`);
      ok(state === 'Kerala' ? txn.gstDetails.cgstAmount > 0 && txn.gstDetails.igstAmount === 0 : txn.gstDetails.igstAmount > 0 && txn.gstDetails.cgstAmount === 0,
        `  ${state === 'Kerala' ? 'CGST+SGST (intra-state)' : 'IGST (inter-state)'}`);
      ok(/^INV-\d{6}-\d{3}$/.test(txn.invoiceNo || ''), '  legacy invoice number format kept', txn.invoiceNo);

      if (BASE) {
        const old = await post(BASE, '/payment/razorpay/create-order', { ...body, buyerEmail: body.buyerEmail.replace('reg-', 'base-') });
        ok(stable(old.body) === stable(now.body), '  identical create-order response to the previous code', stable(old.body) === stable(now.body) ? '' : `\n     old ${stable(old.body)}\n     new ${stable(now.body)}`);
        const oldTxn = await Transaction.findOne({ txnid: old.body.txnid }).lean();
        const pick = (t) => JSON.stringify({ amount: t.amount, itemType: t.itemType, gst: { ...t.gstDetails, _id: undefined } });
        ok(oldTxn && pick(oldTxn) === pick(txn), '  identical stored amount + GST details to the previous code', oldTxn && pick(oldTxn) !== pick(txn) ? `\n     old ${pick(oldTxn)}\n     new ${pick(txn)}` : '');
      }

      if (state === 'Kerala') {
        const ver = await post(API, '/payment/razorpay/verify', { txnid: now.body.txnid, razorpay_order_id: now.body.orderId, razorpay_payment_id: `pay_mock_${tag}`, razorpay_signature: 'mock_signature' });
        ok(ver.status === 200 && ver.body.success && ver.body.token, '  mock verify → success + login token', ver.body.message);
        const user = await User.findOne({ email: body.buyerEmail.toLowerCase() }).lean();
        const enrolled = JSON.stringify(user?.enrolledCourses || user?.purchasedCourses || []).includes(String(c._id));
        ok(enrolled, '  buyer is enrolled in the course');
        const again = await post(API, '/payment/razorpay/verify', { txnid: now.body.txnid, razorpay_order_id: now.body.orderId, razorpay_payment_id: `pay_mock_${tag}`, razorpay_signature: 'mock_signature' });
        ok(again.status === 200 && again.body.message === 'Payment already completed', '  verify again → idempotent');
        const inv = await get(API, `/payment/invoice/${now.body.txnid}`, ver.body.token);
        ok(inv.status === 200, '  GST invoice available to the buyer', inv.body.invoice?.invoiceNo || inv.body.invoiceNo || '');
      }
    }
  }

  console.log('\nProduct orders: server-side checks');
  const quote = await post(API, '/payment/razorpay/create-order', { itemType: 'service', itemId: 'sample-custom-software', buyerName: 'X', buyerEmail: `q-${tag}@example.com`, phone: '9000000000' });
  ok(quote.status === 400, 'quote-only service cannot be bought', quote.body.message);
  const badGstin = await post(API, '/payment/razorpay/create-order', { itemType: 'service', itemId: 'sample-business-admin-support', buyerName: 'X', buyerEmail: `g-${tag}@example.com`, phone: '9000000000', buyerGstin: '27AAPFU0939F1ZX' });
  ok(badGstin.status === 400, 'invalid GSTIN rejected', badGstin.body.message);
  const forged = await post(API, '/payment/razorpay/create-order', { itemType: 'software', itemId: 'sample-billing-desk', variantId: '000000000000000000000000', buyerName: 'X', buyerEmail: `v-${tag}@example.com`, phone: '9000000000' });
  ok(forged.status === 400, 'unknown plan id rejected', forged.body.message);

  console.log('\nCheckout quote (POST /payment/quote) = what create-order charges');
  const txnsBefore = await Transaction.countDocuments();
  const same = async (label, body) => {
    const q = await post(API, '/payment/quote', body);
    const o = await post(API, '/payment/razorpay/create-order', { ...body, buyerName: 'Quote Buyer', buyerEmail: `quote-${tag}-${Math.random().toString(36).slice(2, 8)}@example.com`, phone: '9000000000' });
    ok(q.status === 200 && o.status === 200 && Math.round(q.body.total * 100) === Number(o.body.amount), `${label}: quote total = charged amount`, `₹${q.body.total} vs ₹${o.body.amount / 100}`);
    const txn = await Transaction.findOne({ txnid: o.body.txnid }).lean();
    ok(txn && txn.gstDetails?.gstAmount === q.body.gst.gstAmount && txn.gstDetails?.igstAmount === q.body.gst.igstAmount && txn.gstDetails?.cgstAmount === q.body.gst.cgstAmount,
      `  ${label}: quote GST split = stored GST split`, `${q.body.gst.cgstAmount}/${q.body.gst.sgstAmount}/${q.body.gst.igstAmount}`);
    return q.body;
  };
  for (const c of courses) {
    for (const state of ['Kerala', 'Tamil Nadu']) await same(`course ${c.title.slice(0, 24)} (${state})`, { itemType: 'course', itemId: String(c._id), buyerState: state });
  }
  const code = `QT${tag}`.toUpperCase().slice(0, 20);
  await Coupon.create({ code, discountType: 'percentage', discountValue: 20, usageLimit: 1000 });
  const qc = await same('course + 20% coupon', { itemType: 'course', itemId: String(courses[0]._id), buyerState: 'Karnataka', couponCode: code });
  ok(qc.coupon?.applied === true && qc.couponDiscount > 0, '  coupon applied in the quote', `-₹${qc.couponDiscount}`);
  const usedBefore = (await Coupon.findOne({ code }).lean()).usedCount;
  await post(API, '/payment/quote', { itemType: 'course', itemId: String(courses[0]._id), couponCode: code });
  ok((await Coupon.findOne({ code }).lean()).usedCount === usedBefore, '  quote does not use up the coupon');
  const badCode = await post(API, '/payment/quote', { itemType: 'course', itemId: String(courses[0]._id), couponCode: 'NOPE-NOT-REAL' });
  ok(badCode.status === 200 && badCode.body.coupon?.applied === false && badCode.body.couponDiscount === 0, '  unknown coupon → not applied, full price');
  await Coupon.deleteOne({ code });
  for (const sw of await Software.find({ status: 'active' }).lean()) {
    for (const p of sw.plans || []) await same(`software ${sw.slug}/${p.name}`, { itemType: 'software', itemId: sw.slug, variantId: String(p._id), buyerState: 'Maharashtra' });
  }
  for (const sv of await Service.find({ status: 'active', purchaseMode: { $in: ['fixed', 'both'] } }).lean()) {
    const pk = sv.packages?.[0];
    if (!pk && !(Number(sv.startingPrice) > 0)) continue;
    await same(`service ${sv.slug}${pk ? `/${pk.name}` : ''}`, { itemType: 'service', itemId: sv.slug, ...(pk ? { variantId: String(pk._id) } : {}), buyerState: 'Kerala' });
  }
  const txnsMid = await Transaction.countDocuments();
  await post(API, '/payment/quote', { itemType: 'course', itemId: String(courses[0]._id) });
  ok(await Transaction.countDocuments() === txnsMid && txnsMid > txnsBefore, 'quote is read-only (creates no transaction)');
  const qQuoteOnly = await post(API, '/payment/quote', { itemType: 'service', itemId: 'sample-custom-software' });
  ok(qQuoteOnly.status === 400, 'quote-only service has no checkout quote', qQuoteOnly.body.message);
  const qBad = await post(API, '/payment/quote', { itemType: 'course', itemId: { $ne: null } });
  ok(qBad.status === 404, 'non-string item id rejected');
  const qForged = await post(API, '/payment/quote', { itemType: 'software', itemId: 'sample-billing-desk', variantId: '000000000000000000000000' });
  ok(qForged.status === 400, 'unknown plan id rejected by quote', qForged.body.message);

  console.log('\nLogin token after payment: only for a NEW account or the signed-in owner');
  {
    const c = courses[0];
    const mockVerify = (o, token) => post(API, '/payment/razorpay/verify', { txnid: o.txnid, razorpay_order_id: o.orderId, razorpay_payment_id: `pay_mock_${tag}`, razorpay_signature: 'mock_signature' }, token);
    const buy = (email, token, extra = {}) => post(API, '/payment/razorpay/create-order', { itemType: 'course', itemId: String(c._id), buyerName: 'Someone Else', buyerEmail: email, phone: '9000000000', buyerState: 'Kerala', ...extra }, token);
    const ownerName = `Owner Private Name ${tag}`;
    const ownerEmail = `owner-${tag}@example.com`;
    const reg = await post(API, '/auth/register', { name: ownerName, email: ownerEmail, password: 'owner-pass-123456' });
    ok(reg.status === 201 && reg.body.token, 'existing account set up for the test', reg.body.message || '');
    const owner = await User.findOne({ email: ownerEmail }).lean();

    // (1) guest pays with the existing account's email → purchase recorded, NO token / cookie / account data
    const o1 = await buy(ownerEmail);
    ok(o1.status === 200, 'guest create-order with an existing email is allowed (purchase goes to that account)');
    ok(!JSON.stringify(o1.body).includes(ownerName), '  create-order response has no data from the existing account');
    const v1 = await mockVerify(o1.body);
    ok(v1.status === 200 && v1.body.success === true, '  verify → payment success');
    ok(!v1.body.token && !v1.setCookie, '  NO login token and NO session cookie for the existing account', v1.setCookie || '');
    ok(v1.body.signInRequired === true && v1.body.user === null && v1.body.accountEmail === ownerEmail, '  response says sign in is required (no user object)');
    ok(!JSON.stringify(v1.body).includes(ownerName) && !JSON.stringify(v1.body).includes(String(owner._id)), '  response leaks no name / id of the existing account');
    const ownerAfter = await User.findById(owner._id).lean();
    ok(JSON.stringify(ownerAfter.enrolledCourses || []).includes(String(c._id)), '  course still granted to the existing account');
    const v1again = await mockVerify(o1.body);
    ok(v1again.status === 200 && !v1again.body.token && !v1again.setCookie && v1again.body.signInRequired === true, '  verify again (idempotent path) → still no token');

    // existing-email guest buying SOFTWARE: no licence key in the response, but the licence is created on the account
    const sw = await Software.findOne({ status: 'active', 'plans.0': { $exists: true } }).lean();
    if (sw) {
      const plan = sw.plans.find((p) => !p.isTrial && Number(p.price) > 0) || sw.plans[0];
      const so = await post(API, '/payment/razorpay/create-order', { itemType: 'software', itemId: sw.slug, variantId: String(plan._id), buyerName: 'Someone Else', buyerEmail: ownerEmail, phone: '9000000000' });
      const sv = so.status === 200 ? await mockVerify(so.body) : so;
      const lic = await License.findOne({ userId: owner._id }).lean();
      ok(sv.status === 200 && !sv.body.token && !sv.body.licenseKey && !sv.body.license && sv.body.signInRequired === true && lic,
        '  software: no token and no licence key returned; licence is on the account', sv.body.message || '');
    }

    // (2) brand-new email → account created, token issued
    const newEmail = `newbuyer-${tag}@example.com`;
    const o2 = await buy(newEmail);
    const v2 = await mockVerify(o2.body);
    ok(v2.status === 200 && v2.body.token && v2.body.newlyCreated === true && v2.body.signInRequired === false && v2.body.user?.email === newEmail, 'new email → account created + login token');
    const prof = await get(API, '/auth/profile', v2.body.token);
    ok(prof.status === 200 && prof.body.email === newEmail, '  token signs in to the NEW account');
    const v2again = await mockVerify(o2.body);
    ok(v2again.status === 200 && v2again.body.token, '  repeat verify shortly after → token again (same new account)');
    await Transaction.updateOne({ txnid: o2.body.txnid }, { $set: { accountCreatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) } });
    const v2late = await mockVerify(o2.body);
    ok(v2late.status === 200 && !v2late.body.token, '  repeat verify hours later → no token (re-issue window closed)');

    // (3) signed-in owner → token
    const c2 = courses.find((x) => String(x._id) !== String(c._id)) || null;
    if (c2) {
      const o3 = await post(API, '/payment/razorpay/create-order', { itemType: 'course', itemId: String(c2._id), buyerName: ownerName, phone: '9000000000' }, reg.body.token);
      const v3 = await mockVerify(o3.body, reg.body.token);
      ok(v3.status === 200 && v3.body.token && v3.body.signInRequired === false, 'signed-in owner → login token');
      // the same order verified WITHOUT being signed in gets no token (not a new account)
      const v3anon = await mockVerify(o3.body);
      ok(v3anon.status === 200 && !v3anon.body.token && v3anon.body.signInRequired === true, '  same order verified while signed out → no token');
    }

    // (4) another signed-in user can't verify the owner's order
    const other = await post(API, '/auth/register', { name: 'Other', email: `other-${tag}@example.com`, password: 'other-pass-123456' });
    const vOther = await mockVerify(o1.body, other.body.token);
    ok(vOther.status === 403 && !vOther.body.token, 'a different signed-in user cannot verify that order (403, no token)');

    // (5) PayU mock path: same rule
    const ownerC = courses.find((x) => !JSON.stringify(ownerAfter.enrolledCourses || []).includes(String(x._id)) && (!c2 || String(x._id) !== String(c2._id)));
    if (ownerC) {
      const p1 = await post(API, '/payment/pay', { itemType: 'course', itemId: String(ownerC._id), buyerName: 'Someone Else', buyerEmail: ownerEmail, phone: '9000000000' });
      const cb = p1.status === 200 ? await post(API, '/payment/mock-callback', { txnid: p1.body.txnid, status: 'success' }) : p1;
      ok(cb.status === 200 && cb.body.success && !cb.body.token && !cb.setCookie && cb.body.signInRequired === true, 'PayU (mock callback) with an existing email → no token', cb.body.message || '');
    }
    const p2 = await post(API, '/payment/pay', { itemType: 'course', itemId: String(c._id), buyerName: 'New PayU', buyerEmail: `payu-new-${tag}@example.com`, phone: '9000000000' });
    const cb2 = await post(API, '/payment/mock-callback', { txnid: p2.body.txnid, status: 'success' });
    ok(cb2.status === 200 && cb2.body.token && cb2.body.newlyCreated === true, 'PayU (mock callback) with a new email → token');
  }

  console.log('\nCoupons: usage counted only on verified payment, exactly once');
  {
    const c = courses[0];
    const cc = `CU${tag}`.toUpperCase().slice(0, 20);
    await Coupon.create({ code: cc, discountType: 'percentage', discountValue: 10, usageLimit: 2, maxUsesPerUser: 1 });
    const used = async () => (await Coupon.findOne({ code: cc }).lean()).usedCount;
    const order = (email, course = c) => post(API, '/payment/razorpay/create-order', { itemType: 'course', itemId: String(course._id), buyerName: 'Coupon Buyer', buyerEmail: email, phone: '9000000000', couponCode: cc });
    const full = Math.round(((c.discountedPrice !== undefined && c.discountedPrice !== null && c.discountedPrice >= 0 && c.discountedPrice < c.price) ? c.discountedPrice : c.price) * 100);
    const eA = `cpa-${tag}@example.com`;
    const a1 = await order(eA);
    ok(a1.status === 200 && Number(a1.body.amount) < full, 'create-order applies the coupon', `₹${a1.body.amount / 100}`);
    ok(await used() === 0, '  abandoned / unpaid order does NOT consume the coupon (usedCount 0)');
    const va = await post(API, '/payment/razorpay/verify', { txnid: a1.body.txnid, razorpay_order_id: a1.body.orderId, razorpay_payment_id: `pay_mock_${tag}`, razorpay_signature: 'mock_signature' });
    ok(va.status === 200 && await used() === 1, '  verified payment counts it (usedCount 1)');
    await post(API, '/payment/razorpay/verify', { txnid: a1.body.txnid, razorpay_order_id: a1.body.orderId, razorpay_payment_id: `pay_mock_${tag}`, razorpay_signature: 'mock_signature' });
    await Promise.all([1, 2, 3].map(() => post(API, '/payment/razorpay/verify', { txnid: a1.body.txnid, razorpay_order_id: a1.body.orderId, razorpay_payment_id: `pay_mock_${tag}`, razorpay_signature: 'mock_signature' })));
    ok(await used() === 1, '  repeated / concurrent verification does not double count (still 1)');
    const otherCourse = courses.find((x) => String(x._id) !== String(c._id)) || c;
    const aAgain = await order(eA, otherCourse); // a course this buyer doesn't own yet
    ok(aAgain.status === 400 && /coupon/i.test(aAgain.body.message || ''), '  per-user limit enforced at create-order (same email, 2nd use → 400)', aAgain.body.message);

    // total limit 2: 1 used + a recent unpaid order by another buyer reserves the last use
    const eB = `cpb-${tag}@example.com`, eC = `cpc-${tag}@example.com`;
    const b1 = await order(eB);
    ok(b1.status === 200 && Number(b1.body.amount) < full, '  buyer B gets the last use (reserved while unpaid)');
    const cBlocked = await order(eC);
    ok(cBlocked.status === 200 && Number(cBlocked.body.amount) === full, '  buyer C: limit reached incl. B\'s reservation → coupon not applied');
    const b2 = await order(eB);
    ok(b2.status === 200 && Number(b2.body.amount) < full, '  buyer B retrying is not blocked by their own reservation');
    const qC = await post(API, '/payment/quote', { itemType: 'course', itemId: String(c._id), couponCode: cc });
    ok(qC.body.coupon?.applied === false, '  quote agrees (coupon not applied while reserved)');
    await Transaction.updateMany({ couponCode: cc, status: 'pending', 'billingDetails.buyerEmail': eB }, { $set: { createdAt: new Date(Date.now() - 31 * 60 * 1000) } });
    const cLater = await order(eC);
    ok(cLater.status === 200 && Number(cLater.body.amount) < full, '  B abandons → reservation expires (30 min) → C can use it');
    ok(await used() === 1, '  still only 1 counted use (nothing counted for unpaid orders)');

    // orders created before this change were already counted at creation: never counted twice
    const legacy = await Transaction.create({ txnid: `TXNLEG${Date.now()}`, itemType: 'course', itemId: c._id, amount: 100, status: 'pending', razorpayOrderId: `order_mock_LEG${tag}`, couponCode: cc, billingDetails: { buyerName: 'Legacy', buyerEmail: `legacy-${tag}@example.com`, buyerPhone: '9000000000' } });
    await post(API, '/payment/razorpay/verify', { txnid: legacy.txnid, razorpay_order_id: legacy.razorpayOrderId, razorpay_payment_id: `pay_mock_${tag}`, razorpay_signature: 'mock_signature' });
    ok(await used() === 1, '  legacy pending order (already counted at creation) is not counted again');
    await Coupon.deleteOne({ code: cc });
  }

  if (SIG) {
    console.log('\nRazorpay signature checks (test key, orders inserted directly)');
    const secret = process.env.E2E_SIG_SECRET;
    const sign = (o, p) => crypto.createHmac('sha256', secret).update(`${o}|${p}`).digest('hex');
    const c = courses[0];
    const mk = async (amount) => Transaction.create({
      txnid: `TXNSIG${Date.now()}${Math.floor(Math.random() * 1e6)}`, itemType: 'course', itemId: c._id, amount,
      status: 'pending', razorpayOrderId: `order_E2E${crypto.randomBytes(6).toString('hex')}`,
      billingDetails: { buyerName: 'Sig Test', buyerEmail: `sig-${tag}-${amount}@example.com`, buyerPhone: '9000000000' },
    });
    const cheap = await mk(1);
    const dear = await mk(c.price);
    const pay = `pay_E2E${tag}`;
    const replay = await post(SIG, '/payment/razorpay/verify', { txnid: dear.txnid, razorpay_order_id: cheap.razorpayOrderId, razorpay_payment_id: pay, razorpay_signature: sign(cheap.razorpayOrderId, pay) });
    ok(replay.status === 400, 'signature from another (cheaper) order is rejected', replay.body.message);
    const dear2 = await mk(c.price);
    const wrong = await post(SIG, '/payment/razorpay/verify', { txnid: dear2.txnid, razorpay_order_id: dear2.razorpayOrderId, razorpay_payment_id: pay, razorpay_signature: 'f'.repeat(64) });
    ok(wrong.status === 400, 'wrong signature is rejected', wrong.body.message);
    const mockSig = await post(SIG, '/payment/razorpay/verify', { txnid: cheap.txnid, razorpay_order_id: cheap.razorpayOrderId, razorpay_payment_id: pay, razorpay_signature: 'mock_signature' });
    ok(mockSig.status === 400, '"mock_signature" is rejected when real keys are configured', mockSig.body.message);
    const good = await mk(c.price);
    const goodRes = await post(SIG, '/payment/razorpay/verify', { txnid: good.txnid, razorpay_order_id: good.razorpayOrderId, razorpay_payment_id: pay, razorpay_signature: sign(good.razorpayOrderId, pay) });
    ok(goodRes.status === 200 && goodRes.body.success, 'correct signature → success');
    const noProof = await post(SIG, '/payment/razorpay/verify', { txnid: good.txnid });
    ok(noProof.status === 400 && !noProof.body.token, 'already-paid order: no login token without the signature');
    const withProof = await post(SIG, '/payment/razorpay/verify', { txnid: good.txnid, razorpay_order_id: good.razorpayOrderId, razorpay_payment_id: pay, razorpay_signature: sign(good.razorpayOrderId, pay) });
    ok(withProof.status === 200 && withProof.body.message === 'Payment already completed', 'already-paid order with the signature → idempotent success');

    // Existing account + real signature: still no token for a guest
    const existing = await User.findOne({ email: `owner-${tag}@example.com` }).lean();
    if (existing) {
      const ex = await Transaction.create({
        txnid: `TXNSIGX${Date.now()}`, itemType: 'course', itemId: c._id, amount: c.price, userId: existing._id, status: 'pending',
        razorpayOrderId: `order_E2E${crypto.randomBytes(6).toString('hex')}`, billingDetails: { buyerName: 'Someone Else', buyerEmail: existing.email, buyerPhone: '9000000000' },
      });
      const exRes = await post(SIG, '/payment/razorpay/verify', { txnid: ex.txnid, razorpay_order_id: ex.razorpayOrderId, razorpay_payment_id: pay, razorpay_signature: sign(ex.razorpayOrderId, pay) });
      ok(exRes.status === 200 && exRes.body.success && !exRes.body.token && !exRes.setCookie && exRes.body.signInRequired === true, 'valid signature, guest, existing email → success but no token');
    }

    // Webhook + browser verify for a coupon order: counted exactly once
    const wc = `WH${tag}`.toUpperCase().slice(0, 20);
    await Coupon.create({ code: wc, discountType: 'flat', discountValue: 1, usageLimit: 10 });
    const wt = await Transaction.create({
      txnid: `TXNSIGW${Date.now()}`, itemType: 'course', itemId: c._id, amount: c.price - 1, status: 'pending', couponCode: wc, couponCountOnSuccess: true,
      razorpayOrderId: `order_E2E${crypto.randomBytes(6).toString('hex')}`, billingDetails: { buyerName: 'Hook', buyerEmail: `hook-${tag}@example.com`, buyerPhone: '9000000000' },
    });
    const payload = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: pay, order_id: wt.razorpayOrderId } } } });
    const hookSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const hook = async () => (await fetch(`${SIG}/payment/razorpay/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': hookSig }, body: payload })).status;
    const h1 = await hook();
    const h2 = await hook();
    const vw = await post(SIG, '/payment/razorpay/verify', { txnid: wt.txnid, razorpay_order_id: wt.razorpayOrderId, razorpay_payment_id: pay, razorpay_signature: sign(wt.razorpayOrderId, pay) });
    await hook();
    ok(h1 === 200 && h2 === 200 && vw.status === 200, 'webhook (x2) + verify + webhook again all succeed');
    ok((await Coupon.findOne({ code: wc }).lean()).usedCount === 1, '  coupon counted exactly once');
    ok(vw.body.token && !vw.body.newlyCreated, '  new account created by the webhook still gets its session on verify', vw.body.message);
    await Coupon.deleteOne({ code: wc });
  }

  await mongoose.disconnect();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll payment checks passed');
  process.exit(failures ? 1 : 0);
};
main().catch(async (e) => { console.error(e); await mongoose.disconnect().catch(() => {}); process.exit(1); });
