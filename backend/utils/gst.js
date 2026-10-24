/**
 * GST helpers shared by every paid item (courses, events, software plans, service packages).
 *
 * The rounding below is the same as the original course checkout code (round to paise with
 * Math.round(x * 100) / 100), so course invoices are unchanged:
 *   inclusive:  base = round(price / (1 + rate/100)), gst = round(price - base), total = price
 *   exclusive:  base = price, gst = round(price * rate/100), total = round(base + gst)
 * Intra-state (buyer state == seller state) → CGST + SGST (half each, SGST takes the odd paisa);
 * otherwise → IGST.
 */
import mongoose from 'mongoose';

const r2 = (n) => Math.round(n * 100) / 100;

/** Valid GST rates under the current slabs. Anything else is rejected in admin forms. */
export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28, 40];

export const computeGst = ({ price, rate = 18, inclusive = true, buyerState, sellerState }) => {
  const p = Number(price) || 0;
  const rt = Number.isFinite(Number(rate)) ? Number(rate) : 18;
  let baseAmount;
  let gstAmount;
  let total;
  if (inclusive) {
    baseAmount = r2(p / (1 + rt / 100));
    gstAmount = r2(p - baseAmount);
    total = p;
  } else {
    baseAmount = r2(p);
    gstAmount = r2(p * rt / 100);
    total = r2(baseAmount + gstAmount);
  }
  const seller = String(sellerState || '').trim().toLowerCase();
  const posState = String(buyerState || sellerState || '').trim();
  const isIntraState = posState.toLowerCase() === seller;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  if (isIntraState) {
    cgstAmount = r2(gstAmount / 2);
    sgstAmount = r2(gstAmount - cgstAmount);
  } else {
    igstAmount = gstAmount;
  }
  return { total, rate: rt, isInclusive: Boolean(inclusive), baseAmount, gstAmount, cgstAmount, sgstAmount, igstAmount, isIntraState, posState };
};

/**
 * Effective tax settings for one item: the item's own values when the admin set them,
 * otherwise the store-wide GST settings (admin → GST). Prices are GST-inclusive unless
 * the item says otherwise (that is how every course has always been sold).
 */
const isSet = (v) => v !== undefined && v !== null && v !== '';
/**
 * `layers` = most specific first, e.g. [plan, softwareProduct] or [package, service] or [course].
 */
export const taxSettingsFor = (layers, gstConfig = {}) => {
  const list = (Array.isArray(layers) ? layers : [layers]).filter(Boolean);
  const pick = (key) => list.map((l) => l[key]).find(isSet);
  const rate = pick('gstRate');
  const inclusive = pick('gstInclusive');
  return {
    rate: isSet(rate) ? Number(rate) : (gstConfig.gstRate || 18),
    inclusive: inclusive === false ? false : true,
    hsnSacCode: String(pick('hsnSacCode') || '').trim() || gstConfig.hsnSacCode || '',
  };
};

/** Amount the buyer pays for a list price under the item's tax settings. */
export const payableFor = (price, tax) => computeGst({ price, rate: tax.rate, inclusive: tax.inclusive, buyerState: '', sellerState: '' }).total;

/** 15-character GSTIN: 2-digit state code, PAN (5 letters, 4 digits, 1 letter), entity no., Z, check char. */
export const GSTIN_RE = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** Validates format and the official mod-36 check character. */
export const isValidGstin = (value) => {
  const g = String(value || '').toUpperCase().trim();
  if (!GSTIN_RE.test(g)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const v = GSTIN_CHARS.indexOf(g[i]);
    const prod = v * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(prod / 36) + (prod % 36);
  }
  const check = GSTIN_CHARS[(36 - (sum % 36)) % 36];
  return check === g[14];
};

// ---- Invoice numbers -------------------------------------------------------------------
const CounterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

/** Indian financial year label for a date, e.g. 2026-10-24 → "26-27". */
export const financialYear = (d = new Date()) => {
  const y = d.getFullYear();
  const start = d.getMonth() >= 3 ? y : y - 1;
  return `${String(start).slice(-2)}-${String(start + 1).slice(-2)}`;
};

/**
 * One invoice series for every item type.
 * INVOICE_SERIES=legacy (default) keeps the format courses have always used.
 * INVOICE_SERIES=sequential gives gap-free consecutive numbers per financial year,
 * e.g. WT/26-27/00001 (max 16 characters, as GST rules require). Turn it on once your CA agrees.
 */
export const isSequentialSeries = () => String(process.env.INVOICE_SERIES || 'legacy').toLowerCase() === 'sequential';

export const nextInvoiceNo = async (date = new Date()) => {
  if (!isSequentialSeries()) {
    return `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  }
  const fy = financialYear(date);
  const prefix = String(process.env.INVOICE_PREFIX || 'WT').replace(/[^A-Z0-9]/gi, '').slice(0, 4) || 'WT';
  const c = await Counter.findOneAndUpdate({ _id: `invoice:${fy}` }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return `${prefix}/${fy}/${String(c.seq).padStart(5, '0')}`;
};
