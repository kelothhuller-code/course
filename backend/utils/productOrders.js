/**
 * Checkout + fulfilment for software plans and service packages.
 * Courses and events keep their original code path in routes/paymentRoutes.js.
 *
 * Every price comes from the database here. The browser only says *which* plan/package.
 */
import crypto from 'crypto';
import mongoose from 'mongoose';
import Software from '../models/Software.js';
import Service from '../models/Service.js';
import License from '../models/License.js';
import ServiceOrder from '../models/ServiceOrder.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { taxSettingsFor, computeGst } from './gst.js';
import { generateLicenseKey, hashLicenseKey, encryptKey, decryptKey, planExpiry, billingLabel } from './licensing.js';
import { sendCustomEmail, getEmailBrandHeader, getEmailBrandFooter } from './mailer.js';
import { escapeHtml } from './enquiry.js';

export class OrderError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const findBySlugOrId = (Model, key) => {
  if (typeof key !== 'string' || !key || key.length > 120) return null;
  const q = mongoose.isValidObjectId(key) ? { $or: [{ _id: key }, { slug: key }] } : { slug: key };
  return Model.findOne({ ...q, status: 'active' });
};

/** Effective selling price of a service package (discount only when it is lower than the price). */
export const packagePrice = (pkg) =>
  (pkg.discountedPrice > 0 && pkg.discountedPrice < pkg.price) ? pkg.discountedPrice : pkg.price;

/** Price for a "fixed" service sold without packages. */
export const serviceMainPrice = (svc) => {
  const p = Number(svc.startingPrice) || 0;
  const d = Number(svc.discountedPrice);
  return (d > 0 && d < p) ? d : p;
};

const hsnFor = (layers) => layers.filter(Boolean).map((l) => String(l.hsnSacCode || '').trim()).find(Boolean) || '';

/**
 * Works out what is being bought and its server-side price.
 * Returns { item, variant, listPrice, tax, hsn, itemTitle, snapshot, renewLicense }.
 */
export const resolveProductOrder = async ({ itemType, itemId, variantId, renewLicenseId, user, gstConfig }) => {
  if (itemType === 'software') {
    const sw = await findBySlugOrId(Software, String(itemId || ''));
    if (!sw) throw new OrderError(404, 'Software not found');
    if (!sw.licensingEnabled) throw new OrderError(400, 'This software is not sold online yet. Please send an enquiry.');
    const plan = mongoose.isValidObjectId(String(variantId || '')) ? sw.plans.id(String(variantId)) : null;
    if (!plan || !plan.isActive) throw new OrderError(400, 'Please choose a valid plan.');
    if (!(plan.price > 0)) throw new OrderError(400, 'This plan has no price set.');

    let renewLicense = null;
    if (renewLicenseId) {
      if (!user) throw new OrderError(401, 'Please sign in to renew a licence.');
      if (!mongoose.isValidObjectId(String(renewLicenseId))) throw new OrderError(400, 'Invalid licence.');
      renewLicense = await License.findById(String(renewLicenseId));
      const owns = renewLicense && (
        (renewLicense.userId && renewLicense.userId.toString() === user._id.toString()) ||
        renewLicense.email === String(user.email || '').toLowerCase());
      if (!owns || renewLicense.software.toString() !== sw._id.toString()) throw new OrderError(404, 'Licence not found.');
      if (renewLicense.revoked) throw new OrderError(400, 'This licence has been revoked. Please contact support.');
      if (renewLicense.expiresAt === null) throw new OrderError(400, 'This is a lifetime licence; it does not need renewing.');
      if (plan.billing === 'lifetime') throw new OrderError(400, 'Choose a time-based plan to renew, or buy a new lifetime licence.');
    }

    return {
      item: sw,
      variant: plan,
      listPrice: plan.price,
      tax: taxSettingsFor([plan, sw], gstConfig),
      hsn: hsnFor([plan, sw]),
      itemTitle: `${sw.title} — ${plan.name}${renewLicense ? ' (renewal)' : ''}`,
      description: `${plan.name} licence, ${billingLabel(plan)}, up to ${plan.maxDevices} device(s)`,
      snapshot: { name: plan.name, billing: plan.billing, customDays: plan.customDays, maxDevices: plan.maxDevices },
      renewLicense,
    };
  }

  if (itemType === 'service') {
    const svc = await findBySlugOrId(Service, String(itemId || ''));
    if (!svc) throw new OrderError(404, 'Service not found');
    if (!['fixed', 'both'].includes(svc.purchaseMode)) throw new OrderError(400, 'This service is quoted individually. Please request a quote.');
    let pkg = null;
    let price;
    if (variantId && variantId !== 'main') {
      pkg = mongoose.isValidObjectId(String(variantId)) ? svc.packages.id(String(variantId)) : null;
      if (!pkg || !pkg.isActive) throw new OrderError(400, 'Please choose a valid package.');
      price = packagePrice(pkg);
    } else {
      if (svc.packages.some((p) => p.isActive)) throw new OrderError(400, 'Please choose a package.');
      price = serviceMainPrice(svc);
    }
    if (!(price > 0)) throw new OrderError(400, 'This service has no fixed price set. Please request a quote.');
    return {
      item: svc,
      variant: pkg,
      listPrice: price,
      tax: taxSettingsFor([pkg, svc], gstConfig),
      hsn: hsnFor([pkg, svc]),
      itemTitle: pkg ? `${svc.title} — ${pkg.name}` : svc.title,
      description: pkg ? `${pkg.name} package${pkg.deliveryTime ? `, delivery ${pkg.deliveryTime}` : ''}` : (svc.summary || svc.title),
      snapshot: pkg ? { name: pkg.name, deliveryTime: pkg.deliveryTime, deliverables: pkg.deliverables } : { name: 'Fixed price', deliverables: svc.deliverables },
      renewLicense: null,
    };
  }
  throw new OrderError(400, 'Unsupported item type');
};

export { computeGst };

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const siteUrl = () => (process.env.FRONTEND_URL || 'https://widetech.in').replace(/\/+$/, '');
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never (lifetime)');

const wrap = (inner) => `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:28px;border:1px solid #e2e8f0;border-radius:14px;background:#ffffff;color:#334155;">
    ${getEmailBrandHeader()}${inner}${getEmailBrandFooter()}
  </div>`;

const accountBlock = (email, tempPassword) => tempPassword ? `
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:16px 0;">
    <strong>Your account</strong><br>
    We created an account so you can see your purchase any time.<br>
    Email: <code>${escapeHtml(email)}</code><br>Temporary password: <code>${escapeHtml(tempPassword)}</code><br>
    <small>Please change it after you sign in.</small>
  </div>` : '';

const receiptRows = (txn) => `
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0;">
    <tr><td style="padding:4px 0;color:#64748b;">Item</td><td style="text-align:right;">${escapeHtml(txn.itemTitle || '')}</td></tr>
    <tr><td style="padding:4px 0;color:#64748b;">Transaction ID</td><td style="text-align:right;font-family:monospace;">${escapeHtml(txn.txnid)}</td></tr>
    <tr><td style="padding:4px 0;color:#64748b;">Invoice</td><td style="text-align:right;font-family:monospace;">${escapeHtml(txn.invoiceNo || '')}</td></tr>
    <tr><td style="padding:4px 0;color:#64748b;">Amount paid (incl. GST)</td><td style="text-align:right;font-weight:700;">${money(txn.amount)}</td></tr>
  </table>`;

const sendSafe = async (opts) => {
  try { await sendCustomEmail(opts); } catch (e) { console.error('Email failed:', e.message); }
};

const notifyOwner = async (subject, rows) => {
  const to = (process.env.ENQUIRY_NOTIFY_EMAIL || '').trim();
  if (!to) return;
  const adminPath = (process.env.ADMIN_SECRET_PATH || 'wide-hq-portal').replace(/^\/+|\/+$/g, '');
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nAdmin: ${siteUrl()}/${adminPath}/`;
  const html = wrap(`<h2 style="margin:0 0 12px;color:#0f172a;">${escapeHtml(subject)}</h2>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">${rows.map(([k, v]) =>
      `<tr><td style="padding:6px 8px;color:#64748b;width:150px;">${escapeHtml(k)}</td><td style="padding:6px 8px;color:#0f172a;">${escapeHtml(v)}</td></tr>`).join('')}</table>`);
  await sendSafe({ to, subject, text, html });
};

const newOrderNo = () => {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `SO-${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

/**
 * Creates the licence (or renews it) / the service order for a verified payment.
 * Safe to call more than once for the same transaction (verify + webhook race): only the
 * first call does the work. Returns { itemTitle, licenseKey?, license?, serviceOrder? }.
 */
export const fulfilProduct = async (txn, user, { tempPassword = null } = {}) => {
  const claim = await Transaction.updateOne(
    { _id: txn._id, productFulfilledAt: null },
    { $set: { productFulfilledAt: new Date() } }
  );
  if (!claim.modifiedCount) return existingFulfilment(txn);

  const buyerEmail = String(txn.billingDetails?.buyerEmail || user?.email || '').toLowerCase().trim();
  const buyerName = txn.billingDetails?.buyerName || user?.name || '';
  const snap = txn.variantSnapshot || {};

  if (txn.itemType === 'software') {
    const sw = await Software.findById(txn.itemId);
    const swTitle = sw?.title || txn.itemTitle || 'Software';

    if (txn.renewLicenseId) {
      const lic = await License.findById(txn.renewLicenseId);
      if (lic) {
        const from = lic.expiresAt && lic.expiresAt > new Date() ? lic.expiresAt : new Date();
        lic.expiresAt = planExpiry(snap, from);
        lic.planId = txn.variantId; lic.planName = snap.name || lic.planName; lic.billing = snap.billing || lic.billing;
        lic.customDays = snap.customDays; lic.maxDevices = snap.maxDevices || lic.maxDevices;
        lic.transactions.push(txn._id);
        await lic.save();
        await Transaction.updateOne({ _id: txn._id }, { $set: { licenseId: lic._id } });
        const key = decryptKey(lic.keyEnc);
        await sendSafe({
          to: buyerEmail,
          subject: `Licence renewed: ${swTitle}`,
          text: `Hello ${buyerName},\n\nYour ${swTitle} licence has been renewed. New expiry: ${fmtDate(lic.expiresAt)}.\nYour licence key is unchanged.\n\nTransaction: ${txn.txnid}\nAmount: ${money(txn.amount)}`,
          html: wrap(`<h2 style="margin-top:0;color:#0f172a;">Your licence is renewed</h2>
            <p>Hello ${escapeHtml(buyerName)}, your <strong>${escapeHtml(swTitle)}</strong> licence is now valid until <strong>${escapeHtml(fmtDate(lic.expiresAt))}</strong>. Your key stays the same; the app picks up the new date the next time it checks online.</p>
            ${receiptRows(txn)}<p><a href="${siteUrl()}/dashboard">Open your dashboard</a></p>`),
        });
        notifyOwner(`💳 Licence renewed: ${swTitle}`, [['Buyer', `${buyerName} <${buyerEmail}>`], ['Plan', snap.name || ''], ['New expiry', fmtDate(lic.expiresAt)], ['Amount', money(txn.amount)], ['Transaction', txn.txnid]]);
        return { itemTitle: txn.itemTitle, licenseKey: key, license: lic, renewed: true };
      }
    }

    const key = generateLicenseKey();
    const lic = await License.create({
      software: txn.itemId,
      appId: sw?.appId || sw?.slug || String(txn.itemId),
      softwareTitle: swTitle,
      planId: txn.variantId,
      planName: snap.name || '',
      billing: snap.billing || 'lifetime',
      customDays: snap.customDays,
      keyHash: hashLicenseKey(key),
      keyEnc: encryptKey(key),
      keyLast: key.slice(-5),
      email: buyerEmail,
      buyerName,
      userId: user?._id,
      transactions: [txn._id],
      source: 'purchase',
      expiresAt: planExpiry(snap, new Date()),
      maxDevices: snap.maxDevices || 1,
    });
    await Transaction.updateOne({ _id: txn._id }, { $set: { licenseId: lic._id } });

    if (user) {
      const u = await User.findById(user._id);
      if (u) {
        const existing = (u.purchasedSoftware || []).find((p) => p.softwareId?.toString() === txn.itemId.toString());
        if (existing) { existing.status = 'active'; existing.licenseKey = `…${key.slice(-5)}`; existing.purchasedAt = new Date(); }
        else u.purchasedSoftware.push({ softwareId: txn.itemId, licenseKey: `…${key.slice(-5)}`, status: 'active', purchasedAt: new Date() });
        await u.save();
      }
    }

    await sendSafe({
      to: buyerEmail,
      subject: `Your licence key for ${swTitle}`,
      text: `Hello ${buyerName},\n\nThank you for buying ${swTitle} (${snap.name}).\n\nLicence key: ${key}\nValid until: ${fmtDate(lic.expiresAt)}\nDevices: up to ${lic.maxDevices}\n\nOpen the app, choose "Enter licence key" and paste the key. An internet connection is needed when the app checks the licence.\n\nTransaction: ${txn.txnid}\nInvoice: ${txn.invoiceNo}\nAmount: ${money(txn.amount)}\n${tempPassword ? `\nAccount: ${buyerEmail}\nTemporary password: ${tempPassword}\n` : ''}\nDashboard: ${siteUrl()}/dashboard`,
      html: wrap(`<h2 style="margin-top:0;color:#0f172a;">Your licence key</h2>
        <p>Hello ${escapeHtml(buyerName)}, thank you for buying <strong>${escapeHtml(swTitle)}</strong> (${escapeHtml(snap.name || '')}).</p>
        <div style="background:#0f172a;color:#fff;border-radius:10px;padding:16px;text-align:center;font-family:monospace;font-size:18px;letter-spacing:1px;margin:16px 0;">${escapeHtml(key)}</div>
        <p style="font-size:14px;">Valid until: <strong>${escapeHtml(fmtDate(lic.expiresAt))}</strong> · Devices: up to <strong>${lic.maxDevices}</strong></p>
        <p style="font-size:14px;">Open the app, choose <em>Enter licence key</em> and paste the key. The app needs an internet connection when it checks the licence.</p>
        ${accountBlock(buyerEmail, tempPassword)}${receiptRows(txn)}
        <p><a href="${siteUrl()}/dashboard">See your licences in the dashboard</a></p>`),
    });
    notifyOwner(`💳 New licence sold: ${swTitle}`, [['Buyer', `${buyerName} <${buyerEmail}>`], ['Plan', snap.name || ''], ['Expires', fmtDate(lic.expiresAt)], ['Devices', String(lic.maxDevices)], ['Amount', money(txn.amount)], ['Transaction', txn.txnid]]);
    return { itemTitle: txn.itemTitle, licenseKey: key, license: lic };
  }

  if (txn.itemType === 'service') {
    const svc = await Service.findById(txn.itemId);
    let order;
    try {
      order = await ServiceOrder.create({
        orderNo: newOrderNo(),
        statusHistory: [{ status: 'paid', at: new Date() }],
        service: txn.itemId,
        serviceTitle: svc?.title || txn.itemTitle || '',
        packageId: txn.variantId,
        packageName: snap.name || '',
        deliveryTime: snap.deliveryTime || '',
        transaction: txn._id,
        txnid: txn.txnid,
        invoiceNo: txn.invoiceNo || '',
        amount: txn.amount,
        userId: user?._id,
        buyerName,
        buyerEmail,
        buyerPhone: txn.billingDetails?.buyerPhone || '',
        status: 'paid',
      });
    } catch (e) {
      if (e.code === 11000) return existingFulfilment(txn);
      throw e;
    }
    await Transaction.updateOne({ _id: txn._id }, { $set: { serviceOrderId: order._id } });
    if (user) {
      await User.updateOne({ _id: user._id }, { $push: { purchasedServices: { serviceId: txn.itemId, enquiredAt: new Date(), status: 'active', requirements: `Order ${order.orderNo} — ${snap.name || ''}` } } });
    }
    const title = order.serviceTitle;
    await sendSafe({
      to: buyerEmail,
      subject: `Order confirmed: ${title} (${order.orderNo})`,
      text: `Hello ${buyerName},\n\nThank you — your payment for ${txn.itemTitle} is confirmed.\nOrder number: ${order.orderNo}\n\nWe'll contact you shortly to schedule the work${order.deliveryTime ? ` (typical delivery: ${order.deliveryTime})` : ''}.\n\nTransaction: ${txn.txnid}\nInvoice: ${txn.invoiceNo}\nAmount: ${money(txn.amount)}\n${tempPassword ? `\nAccount: ${buyerEmail}\nTemporary password: ${tempPassword}\n` : ''}`,
      html: wrap(`<h2 style="margin-top:0;color:#0f172a;">Order confirmed 🎉</h2>
        <p>Hello ${escapeHtml(buyerName)}, thank you — your payment for <strong>${escapeHtml(txn.itemTitle || title)}</strong> is confirmed.</p>
        <p>Your order number is <strong>${escapeHtml(order.orderNo)}</strong>. <strong>We'll contact you shortly to schedule the work</strong>${order.deliveryTime ? ` (typical delivery: ${escapeHtml(order.deliveryTime)})` : ''}.</p>
        ${accountBlock(buyerEmail, tempPassword)}${receiptRows(txn)}`),
    });
    notifyOwner(`🛎️ New service order: ${title}`, [['Order', order.orderNo], ['Package', snap.name || ''], ['Buyer', `${buyerName} <${buyerEmail}>`], ['Phone', order.buyerPhone || '—'], ['Amount', money(txn.amount)], ['Transaction', txn.txnid]]);
    return { itemTitle: txn.itemTitle, serviceOrder: order };
  }
  return { itemTitle: txn.itemTitle };
};

/** Looks up what an earlier call created for this transaction. */
export const existingFulfilment = async (txn) => {
  if (txn.itemType === 'software') {
    const lic = await License.findOne({ transactions: txn._id });
    return lic ? { itemTitle: txn.itemTitle, license: lic, licenseKey: decryptKey(lic.keyEnc), alreadyFulfilled: true } : { itemTitle: txn.itemTitle, alreadyFulfilled: true };
  }
  if (txn.itemType === 'service') {
    const order = await ServiceOrder.findOne({ transaction: txn._id });
    return { itemTitle: txn.itemTitle, serviceOrder: order, alreadyFulfilled: true };
  }
  return { alreadyFulfilled: true };
};

/** The public summary sent back to the success page. */
export const productResult = (f) => ({
  ...(f.licenseKey ? { licenseKey: f.licenseKey } : {}),
  ...(f.license ? { license: { id: f.license._id, software: f.license.softwareTitle, plan: f.license.planName, expiresAt: f.license.expiresAt, maxDevices: f.license.maxDevices, renewed: Boolean(f.renewed) } } : {}),
  ...(f.serviceOrder ? { serviceOrder: { orderNo: f.serviceOrder.orderNo, status: f.serviceOrder.status, packageName: f.serviceOrder.packageName, deliveryTime: f.serviceOrder.deliveryTime } } : {}),
});
