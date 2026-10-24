/**
 * GST preview for checkout pages. DISPLAY ONLY: the server recalculates every amount when
 * the order is created (backend/utils/gst.js uses the same rules), and the payment is always
 * for the server's figure.
 */
const r2 = (n) => Math.round(Number(n) * 100) / 100;

export const DEFAULT_GST_RATE = 18;

/** price = the item's price; inclusive = GST already inside it (default) or added on top. */
export function previewGst({ price, rate = DEFAULT_GST_RATE, inclusive = true, buyerState = '', sellerState = 'Kerala' }) {
  const p = r2(price || 0);
  const gstRate = Number.isFinite(Number(rate)) && rate !== null && rate !== '' ? Number(rate) : DEFAULT_GST_RATE;
  let baseAmount;
  let gstAmount;
  if (inclusive !== false) {
    baseAmount = r2(p / (1 + gstRate / 100));
    gstAmount = r2(p - baseAmount);
  } else {
    baseAmount = p;
    gstAmount = r2(p * gstRate / 100);
  }
  const total = r2(baseAmount + gstAmount);
  const isIntraState = String(buyerState || '').trim().toLowerCase() === String(sellerState || 'Kerala').trim().toLowerCase();
  const cgstAmount = isIntraState ? r2(gstAmount / 2) : 0;
  const sgstAmount = isIntraState ? r2(gstAmount - cgstAmount) : 0;
  const igstAmount = isIntraState ? 0 : gstAmount;
  return { rate: gstRate, isInclusive: inclusive !== false, baseAmount, gstAmount, cgstAmount, sgstAmount, igstAmount, isIntraState, total };
}

/** Same pattern the server uses (15 chars: state code, PAN, entity, Z, checksum char). */
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const BILLING_LABEL = { monthly: 'per month', yearly: 'per year', lifetime: 'one-time, lifetime', custom: 'for a fixed period' };
export const billingLabel = (plan) => (plan?.billing === 'custom' && plan.customDays ? `for ${plan.customDays} days` : (BILLING_LABEL[plan?.billing] || ''));
