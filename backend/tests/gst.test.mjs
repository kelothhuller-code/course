// node --test tests/   (no database needed)
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeGst, taxSettingsFor, isValidGstin, financialYear, payableFor } from '../utils/gst.js';

const KERALA = 'Kerala';

test('inclusive + intra-state: price stays the same, CGST/SGST split', () => {
  const g = computeGst({ price: 334, rate: 18, inclusive: true, buyerState: 'kerala ', sellerState: KERALA });
  assert.equal(g.total, 334);
  assert.equal(g.baseAmount, 283.05);
  assert.equal(g.gstAmount, 50.95);
  assert.equal(g.cgstAmount, 25.48);
  assert.equal(g.sgstAmount, 25.47);
  assert.equal(g.igstAmount, 0);
  assert.equal(g.isIntraState, true);
  assert.equal(Math.round((g.cgstAmount + g.sgstAmount) * 100), Math.round(g.gstAmount * 100));
});

test('inclusive + inter-state: IGST only', () => {
  const g = computeGst({ price: 4999, rate: 18, inclusive: true, buyerState: 'Maharashtra', sellerState: KERALA });
  assert.equal(g.total, 4999);
  assert.equal(g.baseAmount, 4236.44);
  assert.equal(g.gstAmount, 762.56);
  assert.equal(g.igstAmount, 762.56);
  assert.equal(g.cgstAmount + g.sgstAmount, 0);
  assert.equal(g.isIntraState, false);
  assert.equal(g.posState, 'Maharashtra');
});

test('exclusive + intra-state: GST added on top', () => {
  const g = computeGst({ price: 3999, rate: 18, inclusive: false, buyerState: KERALA, sellerState: KERALA });
  assert.equal(g.baseAmount, 3999);
  assert.equal(g.gstAmount, 719.82);
  assert.equal(g.total, 4718.82);
  assert.equal(g.cgstAmount, 359.91);
  assert.equal(g.sgstAmount, 359.91);
});

test('exclusive + inter-state: IGST added on top', () => {
  const g = computeGst({ price: 19999, rate: 18, inclusive: false, buyerState: 'Tamil Nadu', sellerState: KERALA });
  assert.equal(g.total, 23598.82);
  assert.equal(g.igstAmount, 3599.82);
});

test('paise rounding: odd paisa goes to SGST and parts always add up', () => {
  for (const price of [1, 99, 101.5, 499, 8999, 9999, 12345.67]) {
    for (const inclusive of [true, false]) {
      for (const rate of [5, 12, 18, 28]) {
        const g = computeGst({ price, rate, inclusive, buyerState: KERALA, sellerState: KERALA });
        assert.equal(Math.round((g.baseAmount + g.gstAmount) * 100), Math.round(g.total * 100));
        assert.equal(Math.round((g.cgstAmount + g.sgstAmount) * 100), Math.round(g.gstAmount * 100));
        for (const v of [g.baseAmount, g.gstAmount, g.cgstAmount, g.sgstAmount, g.total]) {
          assert.ok(Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, `${v} has more than 2 decimals`);
        }
      }
    }
  }
});

test('no buyer state → treated as seller state (same as the old course checkout)', () => {
  const g = computeGst({ price: 118, rate: 18, inclusive: true, buyerState: '', sellerState: KERALA });
  assert.equal(g.isIntraState, true);
  assert.equal(g.baseAmount, 100);
});

test('taxSettingsFor: most specific layer wins, defaults to config rate and inclusive', () => {
  assert.deepEqual(taxSettingsFor([{}], { gstRate: 18 }), { rate: 18, inclusive: true, hsnSacCode: '' });
  assert.deepEqual(taxSettingsFor([{ gstRate: null, gstInclusive: null }, { gstRate: 12, gstInclusive: false, hsnSacCode: '998431' }], { gstRate: 18 }),
    { rate: 12, inclusive: false, hsnSacCode: '998431' });
  assert.equal(taxSettingsFor([{ gstRate: 0 }], { gstRate: 18 }).rate, 0);
  assert.equal(taxSettingsFor([{}], {}).rate, 18);
  assert.equal(payableFor(3999, { rate: 18, inclusive: false }), 4718.82);
  assert.equal(payableFor(499, { rate: 18, inclusive: true }), 499);
});

test('GSTIN validation (format + check character)', () => {
  assert.equal(isValidGstin('27AAPFU0939F1ZV'), true);
  assert.equal(isValidGstin('27aapfu0939f1zv'), true);
  assert.equal(isValidGstin('27AAPFU0939F1ZX'), false); // wrong check char
  assert.equal(isValidGstin('27AAPFU0939F1Z'), false);
  assert.equal(isValidGstin('<script>'), false);
  assert.equal(isValidGstin(''), false);
});

test('financial year label', () => {
  assert.equal(financialYear(new Date(2026, 9, 24)), '26-27');
  assert.equal(financialYear(new Date(2027, 2, 31)), '26-27');
  assert.equal(financialYear(new Date(2027, 3, 1)), '27-28');
});
