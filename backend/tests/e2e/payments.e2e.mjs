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

const API = (process.env.E2E_API || 'http://localhost:5001/api').replace(/\/$/, '');
const BASE = process.env.E2E_BASE_API?.replace(/\/$/, '');
const SIG = process.env.E2E_SIG_API?.replace(/\/$/, '');
for (const u of [API, BASE, SIG]) if (u && /widetech\.in/.test(u)) throw new Error('Refusing to run against production');

let failures = 0;
const ok = (cond, label, extra = '') => { console.log(`${cond ? '  ✔' : '  ✖'} ${label}${extra ? `  ${extra}` : ''}`); if (!cond) failures += 1; };
const post = async (base, url, body, token) => {
  const r = await fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
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
  }

  await mongoose.disconnect();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll payment checks passed');
  process.exit(failures ? 1 : 0);
};
main().catch(async (e) => { console.error(e); await mongoose.disconnect().catch(() => {}); process.exit(1); });
