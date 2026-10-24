#!/usr/bin/env node
/**
 * Read-only check of the transactions.txnid index (nothing is changed).
 *
 *   MONGODB_URI=mongodb://... node scripts/check-indexes.mjs
 *
 * Expected: an index on { txnid: 1 } with unique: true. If it is not unique, the script prints
 * duplicate txnids (if any) and the commands to fix it manually. See docs/OPERATIONS.md.
 */
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('Set MONGODB_URI'); process.exit(1); }
await mongoose.connect(uri);
const col = mongoose.connection.db.collection('transactions');
const idx = (await col.indexes()).filter((i) => JSON.stringify(i.key) === '{"txnid":1}');
console.log('txnid indexes:', idx.map((i) => ({ name: i.name, unique: Boolean(i.unique) })));
if (idx.some((i) => i.unique)) {
  console.log('OK: txnid is unique. No action needed.');
} else {
  const dups = await col.aggregate([{ $group: { _id: '$txnid', n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }, { $limit: 20 }]).toArray();
  console.log(dups.length ? `Duplicate txnids found (fix these first): ${dups.map((d) => d._id).join(', ')}` : 'No duplicate txnids.');
  console.log('To fix (after a backup):\n  db.transactions.dropIndex("txnid_1")\n  db.transactions.createIndex({ txnid: 1 }, { unique: true })');
}
await mongoose.disconnect();
