// "Buy now" on single-price software (no licence plans) goes to the one-page checkout:
// the server prices it from the product, quote-only products stay on the enquiry form.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

let Software; let License; let po; let catalog;
const swId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();
let doc;
let licence;

before(async () => {
  Software = (await import('../models/Software.js')).default;
  License = (await import('../models/License.js')).default;
  po = await import('../utils/productOrders.js');
  catalog = await import('../utils/catalog.js');
  Software.findOne = async () => doc;
  License.findById = async () => licence;
});

const make = (over = {}) => new Software({
  _id: swId, title: 'Wide Tech POS Billing', slug: 'wide-tech-pos-billing', appId: 'wide-pos-billing',
  status: 'active', price: 29999, discountedPrice: 18999, licensingEnabled: true, plans: [], trialEnabled: true, trialDays: 7, ...over,
});
const gstConfig = { gstRate: 18, gstInclusive: true, sellerState: 'Kerala' };

test('single-price software: checkout sells one standard lifetime licence at the discounted price', async () => {
  doc = make();
  const order = await po.resolveProductOrder({ itemType: 'software', itemId: 'wide-tech-pos-billing', user: null, gstConfig });
  assert.equal(order.listPrice, 18999);
  assert.equal(order.variant, null);
  assert.deepEqual({ ...order.snapshot }, { name: 'Standard licence', billing: 'lifetime', maxDevices: 1 });
  assert.equal(order.itemTitle, 'Wide Tech POS Billing');
  // 'main' is accepted too (what the checkout page sends when it names the single offer)
  const again = await po.resolveProductOrder({ itemType: 'software', itemId: String(swId), variantId: 'main', user: null, gstConfig });
  assert.equal(again.listPrice, 18999);
});

test('single-price software works without licensing enabled; discount only when lower', async () => {
  doc = make({ licensingEnabled: false, discountedPrice: 40000 });
  const order = await po.resolveProductOrder({ itemType: 'software', itemId: 'x', user: null, gstConfig });
  assert.equal(order.listPrice, 29999);
});

test('quote-only software (no price, or pricing type quote) cannot be bought', async () => {
  doc = make({ price: 0, discountedPrice: 0 });
  await assert.rejects(po.resolveProductOrder({ itemType: 'software', itemId: 'x', user: null, gstConfig }), /request a quote/i);
  doc = make({ pricingType: 'quote' });
  await assert.rejects(po.resolveProductOrder({ itemType: 'software', itemId: 'x', user: null, gstConfig }), /request a quote/i);
});

test('software with plans still needs a valid plan', async () => {
  doc = make({ plans: [{ name: 'Yearly', price: 4999, billing: 'yearly', maxDevices: 2, isActive: true }] });
  await assert.rejects(po.resolveProductOrder({ itemType: 'software', itemId: 'x', user: null, gstConfig }), /valid plan/);
  const order = await po.resolveProductOrder({ itemType: 'software', itemId: 'x', variantId: String(doc.plans[0]._id), user: null, gstConfig });
  assert.equal(order.listPrice, 4999);
  assert.equal(order.snapshot.billing, 'yearly');
});

test('monthly single-price licence can be renewed; lifetime cannot', async () => {
  doc = make({ pricingType: 'subscription_monthly', discountedPrice: 0, price: 999 });
  licence = { _id: new mongoose.Types.ObjectId(), userId, email: 'a@b.in', software: swId, revoked: false, expiresAt: new Date(Date.now() + 86400000), maxDevices: 3 };
  const order = await po.resolveProductOrder({ itemType: 'software', itemId: 'x', renewLicenseId: String(licence._id), user: { _id: userId, email: 'a@b.in' }, gstConfig });
  assert.equal(order.listPrice, 999);
  assert.equal(order.snapshot.billing, 'monthly');
  assert.equal(order.snapshot.maxDevices, 3, 'renewal keeps the licence device limit');
  doc = make();
  await assert.rejects(po.resolveProductOrder({ itemType: 'software', itemId: 'x', renewLicenseId: String(licence._id), user: { _id: userId, email: 'a@b.in' }, gstConfig }), /lifetime/i);
});

test('public software view exposes mainOffer / buyable for the Buy now button', () => {
  const pub = catalog.publicSoftware(make(), gstConfig);
  assert.equal(pub.buyable, true);
  assert.equal(pub.mainOffer.price, 18999);
  assert.equal(pub.mainOffer.originalPrice, 29999);
  assert.equal(pub.slug, 'wide-tech-pos-billing');
  assert.equal(pub.appId, 'wide-pos-billing');
  const quote = catalog.publicSoftware(make({ price: 0, discountedPrice: 0 }), gstConfig);
  assert.equal(quote.buyable, false);
  assert.equal(quote.mainOffer, null);
  const planned = catalog.publicSoftware(make({ plans: [{ name: 'Yearly', price: 4999, billing: 'yearly', isActive: true }] }), gstConfig);
  assert.equal(planned.mainOffer, null);
  assert.equal(planned.buyable, true);
});
