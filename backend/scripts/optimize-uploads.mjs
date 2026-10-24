#!/usr/bin/env node
/**
 * One-off: shrink existing uploaded images (course/event/software/service/trial thumbnails and
 * screenshots) by writing a resized WebP copy next to each large JPG/PNG/WebP, then pointing the
 * database at the WebP. New uploads are already optimised by POST /api/upload/thumbnail.
 *
 * DRY RUN by default: nothing is written and the database is not touched.
 *
 *   cd backend
 *   node scripts/optimize-uploads.mjs                 # dry run: what would change + estimated savings
 *   node scripts/optimize-uploads.mjs --apply         # write .webp files and update DB references
 *
 * Options:
 *   --apply            actually write files and update the database
 *   --min-kb=100       only touch images larger than this (default 100 KB) or wider than --max-width
 *   --max-width=1600   resize wider images down to this width
 *   --quality=80       WebP quality (1-100)
 *   --dir=<path>       uploads folder (default backend/public/uploads/thumbnails)
 *   --no-db            only write .webp files, don't update the database
 *
 * Safe to re-run: existing .webp files are reused and references already pointing at a .webp are
 * left alone. Originals are NEVER deleted, so old links (and anything outside the database that
 * still uses the old URL) keep working. Once you've checked the site you may delete originals
 * yourself; the summary lists which ones are no longer referenced.
 *
 * Reads MONGODB_URI from the environment or backend/.env (same as the server). Take a database
 * backup (mongodump) before running with --apply.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { optimizeImageFile, loadSharp, OPTIMIZABLE_EXTS } from '../utils/imageOptimizer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v === undefined ? true : v];
}));
const APPLY = Boolean(args.apply);
const MIN_BYTES = Number(args['min-kb'] ?? 100) * 1024;
const MAX_WIDTH = Number(args['max-width'] ?? 1600);
const QUALITY = Number(args.quality ?? 80);
const DIR = path.resolve(args.dir || path.join(__dirname, '..', 'public', 'uploads', 'thumbnails'));
const UPDATE_DB = !args['no-db'];
// Collections whose documents may hold upload URLs (any nested string field is checked)
const COLLECTIONS = ['courses', 'events', 'softwares', 'services', 'trialtutorials'];

const kb = (n) => `${Math.round(n / 1024)} KB`;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sharp = await loadSharp();
if (!sharp) { console.error('sharp is not installed. Run `npm ci` in backend first.'); process.exit(1); }

console.log(`${APPLY ? 'APPLY' : 'DRY RUN (add --apply to make changes)'} · folder ${DIR}`);
console.log(`Images > ${kb(MIN_BYTES)} or wider than ${MAX_WIDTH}px → WebP q${QUALITY}, max ${MAX_WIDTH}px wide\n`);

const files = (await fs.readdir(DIR).catch(() => [])).filter((f) => OPTIMIZABLE_EXTS.includes(path.extname(f).toLowerCase()) && !/\.opt\.webp$/i.test(f));
const renames = new Map(); // old file name -> new file name
let before = 0;
let after = 0;

for (const name of files) {
  const full = path.join(DIR, name);
  const stat = await fs.stat(full);
  const meta = await sharp(full).metadata().catch(() => ({}));
  if (stat.size <= MIN_BYTES && !(meta.width > MAX_WIDTH)) continue;
  // WebP files are already compressed: only touch them if they are too wide. This also makes
  // re-runs safe (the .webp files written by an earlier run are left alone).
  if (path.extname(name).toLowerCase() === '.webp' && !(meta.width > MAX_WIDTH)) continue;
  const res = await optimizeImageFile(full, { maxWidth: MAX_WIDTH, quality: QUALITY, dryRun: !APPLY });
  if (!res.ok) { console.log(`  skip  ${name}: ${res.reason}`); continue; }
  before += res.inputBytes;
  after += res.outputBytes;
  const out = path.basename(res.output);
  renames.set(name, out);
  console.log(`  ${res.existed ? 'reuse' : APPLY ? 'wrote' : 'would'} ${name} (${kb(res.inputBytes)}, ${meta.width || '?'}px) → ${out} (${kb(res.outputBytes)})`);
}
console.log(`\n${renames.size} image(s): ${kb(before)} → ${kb(after)}${before ? ` (−${Math.round((1 - after / before) * 100)}%)` : ''}`);

if (!UPDATE_DB || renames.size === 0) {
  if (!UPDATE_DB) console.log('--no-db: database not checked.');
  process.exit(0);
}

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('Set MONGODB_URI (or backend/.env) to update database references.'); process.exit(1); }
await mongoose.connect(uri);
const db = mongoose.connection.db;

// Matches ".../uploads/thumbnails/<old name>" inside any URL form (relative, /api/..., absolute)
const patterns = [...renames].map(([from, to]) => ({ from, to, re: new RegExp(`(uploads/thumbnails/)${escapeRe(from)}(?=$|[?#"'\\s)])`, 'g') }));

const rewrite = (value) => {
  if (typeof value === 'string') {
    let out = value;
    for (const p of patterns) {
      if (out.includes(`uploads/thumbnails/${p.from}`)) {

        out = out.replace(p.re, `$1${p.to}`);
      }
    }
    return out;
  }
  if (Array.isArray(value)) return value.map(rewrite);
  if (value && typeof value === 'object' && !(value instanceof Date) && !(value._bsontype)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewrite(v)]));
  }
  return value;
};

let changedDocs = 0;
for (const name of COLLECTIONS) {
  const col = db.collection(name);
  const cursor = col.find({});
  for await (const doc of cursor) {
    const set = {};
    for (const [key, val] of Object.entries(doc)) {
      if (key === '_id') continue;
      const next = rewrite(val);
      if (JSON.stringify(next) !== JSON.stringify(val)) set[key] = next;
    }
    if (Object.keys(set).length) {
      changedDocs += 1;
      console.log(`  ${APPLY ? 'updated' : 'would update'} ${name} ${doc._id} (${doc.title || doc.name || ''}): ${Object.keys(set).join(', ')}`);
      if (APPLY) await col.updateOne({ _id: doc._id }, { $set: set });
    }
  }
}

// Read-only check of every other collection (users, transactions, settings, ...): an original
// that is still mentioned there must be kept.
const otherRefs = new Map(); // file -> Set(collection)
const otherCols = (await db.listCollections().toArray()).map((c) => c.name)
  .filter((n) => !COLLECTIONS.includes(n) && !n.startsWith('system.'));
for (const name of otherCols) {
  for await (const doc of db.collection(name).find({})) {
    const text = JSON.stringify(doc);
    if (!text.includes('uploads/thumbnails/')) continue;
    for (const from of renames.keys()) {
      if (text.includes(`uploads/thumbnails/${from}`)) {
        if (!otherRefs.has(from)) otherRefs.set(from, new Set());
        otherRefs.get(from).add(name);
      }
    }
  }
}

console.log(`\n${changedDocs} document(s) ${APPLY ? 'updated' : 'would be updated'}.`);
const deletable = [...renames.keys()].filter((f) => !otherRefs.has(f));
if (otherRefs.size) {
  console.log('\nKeep these originals (still used outside the course/catalog collections):');
  for (const [f, cols] of otherRefs) console.log(`  ${f}  (${[...cols].join(', ')})`);
}
if (deletable.length) {
  console.log(`\nOriginals were NOT deleted. ${APPLY ? 'The database now points at the .webp versions, so these' : 'After --apply, these'} originals are unused and can be deleted once you've checked the site (keep your backup):`);
  for (const f of deletable) console.log(`  ${f}`);
}
await mongoose.disconnect();
