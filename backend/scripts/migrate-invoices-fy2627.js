/**
 * One-time migration: FY 2026-27 invoice re-numbering
 * =====================================================
 * - Renames 8 existing transactions from random INV-… numbers to WT/26-27/001–008
 * - Seeds (or resets) the Counter so the NEXT invoice issued by the app is WT/26-27/009
 * - Corrects the GstConfig registered address in the live database
 * - Updates gstDetails for each transaction (rate, SAC, amounts) to the canonical values
 *
 * Run once from the backend directory:
 *   node --experimental-vm-modules scripts/migrate-invoices-fy2627.js
 * or (if package.json has "type": "module"):
 *   node scripts/migrate-invoices-fy2627.js
 *
 * Safe to re-run: uses $set so it is idempotent.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load .env from the backend root (one level up from scripts/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/widetechnos';

// ── Invoice mapping ──────────────────────────────────────────────────────────
// Each entry: { old: Razorpay/legacy invoice number, new: WT serial, date, name }
// Dates are stored as the createdAt of the transaction (we don't change createdAt,
// but the date is noted here for reference).
const REMAP = [
  { old: 'INV-241200-962', newNo: 'WT/26-27/001', buyer: 'Sayeed Kp',       date: '2026-10-15' },
  { old: 'INV-836215-481', newNo: 'WT/26-27/002', buyer: 'Arun Kannan',     date: '2026-10-18' },
  { old: 'INV-055091-142', newNo: 'WT/26-27/003', buyer: 'VISHNU P',        date: '2026-10-19' },
  { old: 'INV-504268-846', newNo: 'WT/26-27/004', buyer: 'Viji S',          date: '2026-10-24' },
  { old: 'INV-550096-451', newNo: 'WT/26-27/005', buyer: 'Muhammed Riyas',  date: '2026-10-24' },
  { old: 'INV-797172-592', newNo: 'WT/26-27/006', buyer: 'Asmeer',          date: '2026-10-26' },
  { old: 'INV-208868-744', newNo: 'WT/26-27/007', buyer: 'Nashwan',         date: '2026-11-04' },
  { old: 'INV-774090-627', newNo: 'WT/26-27/008', buyer: 'Akshai s',        date: '2026-11-07' },
];

// ── GST breakdown for ₹334 (18 % inclusive, intra-state Kerala) ─────────────
// base = round(334 / 1.18) = 283.05
// gst  = round(334 − 283.05) = 50.95
// cgst = round(50.95 / 2)   = 25.48
// sgst = 50.95 − 25.48      = 25.47
const GST_DETAILS = {
  rate:        18,
  isInclusive: true,
  baseAmount:  283.05,
  gstAmount:   50.95,
  cgstAmount:  25.48,
  sgstAmount:  25.47,
  igstAmount:  0,
  isIntraState: true,
  hsnSacCode:  '999249',
  posState:    'Kerala',
};

// ── Seller address correction ────────────────────────────────────────────────
const CORRECT_ADDRESS = 'Thettamala, Wayanad, Kerala - 670731';

// ── Schemas (minimal — only what we need) ───────────────────────────────────
const TransactionSchema = new mongoose.Schema({}, { strict: false });
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema, 'transactions');

const GstConfigSchema = new mongoose.Schema({}, { strict: false });
const GstConfig = mongoose.models.GstConfig || mongoose.model('GstConfig', GstConfigSchema, 'gstconfigs');

const CounterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema, 'counters');

async function run() {
  console.log('Connecting to MongoDB …');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  // 1. Re-number transactions ──────────────────────────────────────────────
  // The invoiceNo field is what the app writes on the GST invoice PDF / report.
  // Some older transactions stored the same random ID in the txnid field instead,
  // so we try both.
  console.log('── Step 1: Re-numbering invoices ──────────────────────────────');
  for (const entry of REMAP) {
    // Try matching on invoiceNo first, then fall back to txnid (legacy path)
    let result = await Transaction.updateOne(
      { invoiceNo: entry.old },
      { $set: { invoiceNo: entry.newNo, gstDetails: GST_DETAILS } }
    );
    if (result.matchedCount === 0) {
      // Fallback: invoiceNo was never set; the INV-… number may be the txnid
      result = await Transaction.updateOne(
        { txnid: entry.old, invoiceNo: { $exists: false } },
        { $set: { invoiceNo: entry.newNo, gstDetails: GST_DETAILS } }
      );
    }
    if (result.matchedCount === 0) {
      console.warn(`  ⚠  NOT FOUND  ${entry.old}  (buyer: ${entry.buyer}) — skipped (may already be renamed)`);
    } else if (result.modifiedCount === 0) {
      console.log(`  ✓  ALREADY OK  ${entry.old} → ${entry.newNo}  (no change needed)`);
    } else {
      console.log(`  ✓  UPDATED     ${entry.old} → ${entry.newNo}  (${entry.buyer}, ${entry.date})`);
    }
  }

  // 2. Seed / reset Counter ────────────────────────────────────────────────
  console.log('\n── Step 2: Seeding Counter for FY 26-27 ───────────────────────');
  const counterResult = await Counter.findOneAndUpdate(
    { _id: 'invoice:26-27' },
    { $set: { seq: 8 } },   // next call → $inc → 9 → WT/26-27/009
    { new: true, upsert: true }
  );
  console.log(`  Counter invoice:26-27 set to seq=${counterResult.seq}  (next invoice → WT/26-27/009)`);

  // 3. Fix GstConfig address ───────────────────────────────────────────────
  console.log('\n── Step 3: Correcting GstConfig registered address ─────────────');
  const cfgResult = await GstConfig.updateOne(
    {},
    {
      $set: {
        legalName:          'WIDE VENTURES',
        gstin:              '32FBEPK9712B1Z0',
        registeredAddress:  CORRECT_ADDRESS,
        hsnSacCode:         '999249',
        gstRate:            18,
        isInclusive:        true,
        sellerState:        'Kerala',
        sellerStateCode:    '32',
        updatedAt:          new Date(),
      },
    },
    { upsert: false }
  );
  if (cfgResult.matchedCount === 0) {
    console.warn('  ⚠  GstConfig document not found — it will be created with correct defaults on next server start.');
  } else {
    console.log(`  ✓  GstConfig address updated to: "${CORRECT_ADDRESS}"`);
  }

  // 4. Verify ──────────────────────────────────────────────────────────────
  console.log('\n── Verification ────────────────────────────────────────────────');
  for (const entry of REMAP) {
    const txn = await Transaction.findOne({ invoiceNo: entry.newNo }).select('invoiceNo billingDetails.buyerName amount gstDetails.baseAmount gstDetails.cgstAmount gstDetails.sgstAmount');
    if (txn) {
      console.log(`  ${txn.invoiceNo}  ${(txn.billingDetails?.buyerName || '').padEnd(18)}  ₹${txn.amount}  base ${txn.gstDetails?.baseAmount}  CGST ${txn.gstDetails?.cgstAmount}  SGST ${txn.gstDetails?.sgstAmount}`);
    } else {
      console.warn(`  ⚠  ${entry.newNo} not found after update`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDone. Migration complete.');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
