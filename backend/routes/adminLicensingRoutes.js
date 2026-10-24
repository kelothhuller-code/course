/**
 * Admin: licences, trial usage and paid service orders.  Mounted at /api/admin/licensing
 * (admin login required for every route).
 */
import express from 'express';
import mongoose from 'mongoose';
import { protect, admin } from '../middleware/auth.js';
import License from '../models/License.js';
import TrialDevice from '../models/TrialDevice.js';
import ServiceOrder, { SERVICE_ORDER_STATUSES } from '../models/ServiceOrder.js';
import Software from '../models/Software.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { generateLicenseKey, normalizeLicenseKey, hashLicenseKey, encryptKey, decryptKey, planExpiry } from '../utils/licensing.js';
import { sendCsv } from '../utils/csv.js';

const router = express.Router();
router.use(protect, admin);

const isId = (v) => typeof v === 'string' && mongoose.isValidObjectId(v);
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const gstOf = (t) => (t ? {
  txnid: t.txnid, invoiceNo: t.invoiceNo || '', amount: t.amount, status: t.status, date: t.createdAt,
  rate: t.gstDetails?.rate, isInclusive: t.gstDetails?.isInclusive, baseAmount: t.gstDetails?.baseAmount,
  gstAmount: t.gstDetails?.gstAmount, cgst: t.gstDetails?.cgstAmount, sgst: t.gstDetails?.sgstAmount, igst: t.gstDetails?.igstAmount,
  isIntraState: t.gstDetails?.isIntraState, hsnSacCode: t.gstDetails?.hsnSacCode || '', posState: t.gstDetails?.posState || '',
  buyerGstin: t.billingDetails?.buyerGstin || '', variantName: t.variantName || '', renewal: Boolean(t.renewLicenseId),
} : null);

const licStatus = (l) => (l.revoked ? 'revoked' : (l.expiresAt && new Date(l.expiresAt) <= new Date() ? 'expired' : 'active'));

const licenseQuery = async (q) => {
  const query = {};
  const search = typeof q.search === 'string' ? q.search.trim().slice(0, 100) : '';
  if (search) {
    const key = normalizeLicenseKey(search);
    if (key) query.keyHash = hashLicenseKey(key);
    else if (/^[0-9A-Z]{5}$/i.test(search)) query.keyLast = search.toUpperCase();
    else query.$or = [{ email: { $regex: escRe(search.toLowerCase()) } }, { buyerName: { $regex: escRe(search), $options: 'i' } }];
  }
  if (isId(q.software)) query.software = q.software;
  if (q.status === 'revoked') query.revoked = true;
  if (q.status === 'active') { query.revoked = false; query.$and = [{ $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }]; }
  if (q.status === 'expired') { query.revoked = false; query.expiresAt = { $ne: null, $lte: new Date() }; }
  return query;
};

const listItem = (l) => ({
  _id: l._id, softwareTitle: l.softwareTitle, software: l.software, appId: l.appId, planName: l.planName, billing: l.billing,
  keyMasked: `WT-•••••-•••••-•••••-${l.keyLast}`, email: l.email, buyerName: l.buyerName, source: l.source,
  expiresAt: l.expiresAt, maxDevices: l.maxDevices, devicesUsed: (l.devices || []).length, revoked: l.revoked,
  status: licStatus(l), createdAt: l.createdAt, lastValidatedAt: l.lastValidatedAt,
});

// ---- Licences -------------------------------------------------------------------------
router.get('/licenses', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const query = await licenseQuery(req.query);
    const [total, rows] = await Promise.all([
      License.countDocuments(query),
      License.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    res.json({ success: true, total, page, pages: Math.ceil(total / limit) || 1, licenses: rows.map(listItem) });
  } catch (e) {
    console.error('Admin licences error:', e.message);
    res.status(500).json({ message: 'Failed to load licences' });
  }
});

router.get('/licenses.csv', async (req, res) => {
  try {
    const rows = await License.find(await licenseQuery(req.query)).sort({ createdAt: -1 }).limit(20000).lean();
    const txIds = rows.flatMap((l) => l.transactions || []);
    const txns = await Transaction.find({ _id: { $in: txIds } }).lean();
    const byId = new Map(txns.map((t) => [t._id.toString(), t]));
    const out = [];
    rows.forEach((l) => {
      const ts = (l.transactions || []).map((id) => byId.get(id.toString())).filter(Boolean);
      (ts.length ? ts : [null]).forEach((t) => {
        const g = gstOf(t) || {};
        out.push([l.softwareTitle, l.planName, `…${l.keyLast}`, l.email, l.buyerName, l.source, licStatus(l), l.expiresAt ? new Date(l.expiresAt).toISOString() : 'lifetime',
          l.maxDevices, (l.devices || []).length, l.createdAt, g.renewal ? 'renewal' : (t ? 'purchase' : ''), g.txnid || '', g.invoiceNo || '', g.date || '',
          g.amount ?? '', g.rate ?? '', g.isInclusive === undefined ? '' : (g.isInclusive ? 'inclusive' : 'exclusive'), g.baseAmount ?? '', g.cgst ?? '', g.sgst ?? '', g.igst ?? '', g.gstAmount ?? '',
          g.hsnSacCode || '', g.posState || '', g.buyerGstin || '']);
      });
    });
    sendCsv(res, `licences-${new Date().toISOString().slice(0, 10)}.csv`, ['Software', 'Plan', 'Key (last 5)', 'Email', 'Name', 'Source', 'Status', 'Expires', 'Max devices', 'Devices used', 'Issued',
      'Payment type', 'Transaction', 'Invoice no', 'Paid at', 'Amount paid', 'GST rate %', 'Price type', 'Taxable value', 'CGST', 'SGST', 'IGST', 'Total GST', 'HSN/SAC', 'Place of supply', 'Buyer GSTIN'], out);
  } catch (e) {
    console.error('Licence CSV error:', e.message);
    res.status(500).json({ message: 'CSV export failed' });
  }
});

router.get('/licenses/:id', async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  const l = await License.findById(req.params.id).lean();
  if (!l) return res.status(404).json({ message: 'Licence not found' });
  const txns = await Transaction.find({ _id: { $in: l.transactions || [] } }).sort({ createdAt: 1 }).lean();
  res.json({
    success: true,
    license: { ...listItem(l), notes: l.notes, revokedReason: l.revokedReason, devices: (l.devices || []).map((d) => ({ ...d, deviceHash: `${d.deviceHash.slice(0, 10)}…` })) },
    payments: txns.map(gstOf),
  });
});

/** Reveal the full key (admin only, on request) e.g. to resend it to a customer. */
router.get('/licenses/:id/key', async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  const l = await License.findById(req.params.id).select('keyEnc').lean();
  if (!l) return res.status(404).json({ message: 'Licence not found' });
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, key: decryptKey(l.keyEnc) });
});

router.patch('/licenses/:id', async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  const l = await License.findById(req.params.id);
  if (!l) return res.status(404).json({ message: 'Licence not found' });
  const b = req.body || {};
  const action = String(b.action || '');
  if (action === 'extend') {
    const days = parseInt(b.days, 10);
    if (b.lifetime === true) l.expiresAt = null;
    else if (typeof b.expiresAt === 'string' && !Number.isNaN(Date.parse(b.expiresAt))) l.expiresAt = new Date(b.expiresAt);
    else if (days >= 1 && days <= 3650) {
      const from = l.expiresAt && l.expiresAt > new Date() ? l.expiresAt : new Date();
      l.expiresAt = new Date(from.getTime() + days * 86400000);
    } else return res.status(400).json({ message: 'Give days (1–3650), a date, or lifetime.' });
  } else if (action === 'revoke') {
    l.revoked = true; l.revokedReason = String(b.reason || '').slice(0, 300);
  } else if (action === 'unrevoke') {
    l.revoked = false; l.revokedReason = '';
  } else if (action === 'reset_devices') {
    l.devices = [];
  } else if (action === 'remove_device') {
    const prefix = String(b.deviceHash || '').replace(/…$/, '');
    if (prefix.length < 6) return res.status(400).json({ message: 'deviceHash required' });
    l.devices = l.devices.filter((d) => !d.deviceHash.startsWith(prefix));
  } else if (action === 'update') {
    if (b.maxDevices !== undefined) {
      const m = parseInt(b.maxDevices, 10);
      if (!(m >= 1 && m <= 1000)) return res.status(400).json({ message: 'maxDevices must be 1–1000' });
      l.maxDevices = m;
    }
    if (typeof b.notes === 'string') l.notes = b.notes.slice(0, 1000);
  } else {
    return res.status(400).json({ message: 'Unknown action' });
  }
  await l.save();
  res.json({ success: true, license: listItem(l.toObject()) });
});

/** Manually issue a key (e.g. offline payment, giveaway, replacement). The key is shown once. */
router.post('/licenses', async (req, res) => {
  try {
    const b = req.body || {};
    if (!isId(b.softwareId)) return res.status(400).json({ message: 'Choose a software product' });
    const sw = await Software.findById(b.softwareId);
    if (!sw) return res.status(404).json({ message: 'Software not found' });
    const email = String(b.email || '').toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Valid email required' });
    const plan = isId(b.planId) ? sw.plans.id(b.planId) : null;
    let expiresAt;
    if (b.lifetime === true) expiresAt = null;
    else if (parseInt(b.days, 10) >= 1) expiresAt = new Date(Date.now() + Math.min(3650, parseInt(b.days, 10)) * 86400000);
    else if (plan) expiresAt = planExpiry(plan);
    else return res.status(400).json({ message: 'Choose a plan, a number of days or lifetime' });
    const maxDevices = parseInt(b.maxDevices, 10) || plan?.maxDevices || 1;
    if (maxDevices < 1 || maxDevices > 1000) return res.status(400).json({ message: 'maxDevices must be 1–1000' });
    const user = await User.findOne({ email }).select('_id name');
    const key = generateLicenseKey();
    const lic = await License.create({
      software: sw._id, appId: sw.appId || sw.slug, softwareTitle: sw.title,
      planId: plan?._id, planName: plan?.name || String(b.planName || 'Manual').slice(0, 60), billing: plan?.billing || (expiresAt ? 'custom_days' : 'lifetime'),
      keyHash: hashLicenseKey(key), keyEnc: encryptKey(key), keyLast: key.slice(-5),
      email, buyerName: String(b.name || user?.name || '').slice(0, 120), userId: user?._id,
      source: 'manual', expiresAt, maxDevices, notes: String(b.notes || '').slice(0, 1000),
    });
    res.set('Cache-Control', 'no-store');
    res.status(201).json({ success: true, key, license: listItem(lic.toObject()) });
  } catch (e) {
    console.error('Issue licence error:', e.message);
    res.status(500).json({ message: 'Failed to issue licence' });
  }
});

// ---- Trials ---------------------------------------------------------------------------
router.get('/trials', async (req, res) => {
  const query = isId(req.query.software) ? { software: req.query.software } : {};
  const [rows, total, active] = await Promise.all([
    TrialDevice.find(query).sort({ startedAt: -1 }).limit(500).populate('software', 'title').lean(),
    TrialDevice.countDocuments(query),
    TrialDevice.countDocuments({ ...query, expiresAt: { $gt: new Date() } }),
  ]);
  res.json({
    success: true, total, active,
    trials: rows.map((t) => ({ _id: t._id, software: t.software?.title || t.appId, device: `${t.deviceHash.slice(0, 10)}…`, deviceName: t.deviceName, appVersion: t.appVersion, startedAt: t.startedAt, expiresAt: t.expiresAt, lastSeenAt: t.lastSeenAt, checks: t.checks, active: new Date(t.expiresAt) > new Date() })),
  });
});

/** Allow one device a fresh trial (e.g. the customer asked for more time to evaluate). */
router.delete('/trials/:id', async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  await TrialDevice.deleteOne({ _id: req.params.id });
  res.json({ success: true });
});

// ---- Service orders ---------------------------------------------------------------------
const orderQuery = (q) => {
  const query = {};
  if (SERVICE_ORDER_STATUSES.includes(q.status)) query.status = q.status;
  const s = typeof q.search === 'string' ? q.search.trim().slice(0, 100) : '';
  if (s) query.$or = ['orderNo', 'buyerEmail', 'buyerName', 'serviceTitle', 'txnid'].map((f) => ({ [f]: { $regex: escRe(s), $options: 'i' } }));
  return query;
};

router.get('/service-orders', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  const query = orderQuery(req.query);
  const [total, rows, counts] = await Promise.all([
    ServiceOrder.countDocuments(query),
    ServiceOrder.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('transaction').lean(),
    ServiceOrder.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  res.json({
    success: true, total, page, pages: Math.ceil(total / limit) || 1,
    counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    orders: rows.map((o) => ({ ...o, transaction: undefined, gst: gstOf(o.transaction) })),
  });
});

router.patch('/service-orders/:id', async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  const update = {};
  if (req.body?.status !== undefined) {
    if (!SERVICE_ORDER_STATUSES.includes(req.body.status)) return res.status(400).json({ message: 'Invalid status' });
    update.status = req.body.status;
  }
  if (typeof req.body?.adminNotes === 'string') update.adminNotes = req.body.adminNotes.slice(0, 2000);
  const o = await ServiceOrder.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
  if (!o) return res.status(404).json({ message: 'Order not found' });
  res.json({ success: true, order: o });
});

router.get('/service-orders.csv', async (req, res) => {
  const rows = await ServiceOrder.find(orderQuery(req.query)).sort({ createdAt: -1 }).limit(20000).populate('transaction').lean();
  sendCsv(res, `service-orders-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Order no', 'Date', 'Service', 'Package', 'Status', 'Buyer', 'Email', 'Phone', 'Transaction', 'Invoice no', 'Amount paid', 'GST rate %', 'Price type', 'Taxable value', 'CGST', 'SGST', 'IGST', 'Total GST', 'HSN/SAC', 'Place of supply', 'Buyer GSTIN', 'Notes'],
    rows.map((o) => {
      const g = gstOf(o.transaction) || {};
      return [o.orderNo, o.createdAt, o.serviceTitle, o.packageName, o.status, o.buyerName, o.buyerEmail, o.buyerPhone, o.txnid, o.invoiceNo, r2(o.amount),
        g.rate ?? '', g.isInclusive === undefined ? '' : (g.isInclusive ? 'inclusive' : 'exclusive'), g.baseAmount ?? '', g.cgst ?? '', g.sgst ?? '', g.igst ?? '', g.gstAmount ?? '', g.hsnSacCode || '', g.posState || '', g.buyerGstin || '', o.adminNotes];
    }));
});

// Any unexpected error in the async handlers above becomes a plain 500 (Express 4 does not catch
// rejected promises itself, and the global error handler could echo internal details in dev).
for (const layer of router.stack) {
  for (const l of layer.route?.stack || []) {
    const fn = l.handle;
    l.handle = (req, res, next) => {
      try {
        const out = fn(req, res, next);
        if (out && typeof out.catch === 'function') {
          out.catch((e) => {
            console.error('Admin licensing error:', e?.message);
            if (!res.headersSent) res.status(500).json({ message: 'Request failed' });
          });
        }
      } catch (e) {
        console.error('Admin licensing error:', e?.message);
        if (!res.headersSent) res.status(500).json({ message: 'Request failed' });
      }
    };
  }
}

export default router;
