/**
 * Software version uploads + downloads: shared helpers (no database access here, so the
 * rules can be unit-tested). Used by routes/softwareVersionAdminRoutes.js (admin upload),
 * routes/softwareRoutes.js (public download) and routes/uploadRoutes.js (legacy package upload).
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Installer / archive types an admin may upload as a software version. */
export const VERSION_EXTENSIONS = ['.zip', '.exe', '.msi', '.msix', '.dmg', '.pkg', '.apk', '.appimage', '.deb', '.rar', '.7z'];

export const PLATFORM_LABELS = { windows: 'Windows', macos: 'macOS', linux: 'Linux', android: 'Android', any: 'Any' };

/** Upload size limit for software files: SOFTWARE_MAX_UPLOAD_MB (default 2048 MB = 2 GB). */
export const maxUploadMb = () => {
  const n = Number.parseInt(process.env.SOFTWARE_MAX_UPLOAD_MB || '', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 20480) : 2048;
};
export const maxUploadBytes = () => maxUploadMb() * 1024 * 1024;

/**
 * Private folder for version files: SOFTWARE_DOWNLOADS_DIR or backend/private_downloads.
 * Never inside backend/public, so express.static can't serve it.
 */
export const downloadsDir = () => path.resolve(process.env.SOFTWARE_DOWNLOADS_DIR || path.join(__dirname, '..', 'private_downloads'));

export const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

/** Lower-case extension ('.appimage', '.7z', …). */
export const extOf = (name) => path.extname(String(name || '')).toLowerCase();

export const isAllowedVersionFile = (name) => VERSION_EXTENSIONS.includes(extOf(name));

/**
 * Safe display/download file name: no folders, no control or shell characters, max 150 chars,
 * keeps the (lower-cased) extension. "../../Wide POS Setup (x64).EXE" → "Wide_POS_Setup_x64.exe"
 */
export const sanitizeFilename = (name, fallback = 'download') => {
  const base = path.basename(String(name || '').replace(/\\/g, '/'));
  const ext = extOf(base);
  const stem = base.slice(0, base.length - ext.length)
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 140);
  return `${stem || fallback}${ext.replace(/[^a-z0-9.]/g, '')}`;
};

/** Platform guess from the extension (admin can change it). */
export const guessPlatform = (name) => {
  const ext = extOf(name);
  if (['.exe', '.msi', '.msix'].includes(ext)) return 'windows';
  if (['.dmg', '.pkg'].includes(ext)) return 'macos';
  if (['.appimage', '.deb'].includes(ext)) return 'linux';
  if (ext === '.apk') return 'android';
  return 'any';
};

/** "1.2.0", "v2.0.1-beta.1", "2026.10" … → normalised (no leading "v"), or null. */
export const VERSION_RE = /^\d+(\.\d+){0,3}([-+][0-9A-Za-z.-]{1,30})?$/;
export const normalizeVersion = (v) => {
  const s = String(v ?? '').trim().replace(/^v(?=\d)/i, '');
  return VERSION_RE.test(s) ? s : null;
};

/** Compare two version strings numerically (1.10.0 > 1.9.3). Pre-release sorts before release. */
export const compareVersions = (a, b) => {
  const [ma, pa = ''] = String(a).split(/[-+]/, 2);
  const [mb, pb = ''] = String(b).split(/[-+]/, 2);
  const na = ma.split('.').map(Number);
  const nb = mb.split('.').map(Number);
  for (let i = 0; i < Math.max(na.length, nb.length); i += 1) {
    const d = (na[i] || 0) - (nb[i] || 0);
    if (d) return d;
  }
  if (pa === pb) return 0;
  if (!pa) return 1;
  if (!pb) return -1;
  return pa < pb ? -1 : 1;
};

/** Newest first: release date, then version number. */
export const sortVersions = (list) => [...list].sort((a, b) =>
  (new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0)) || compareVersions(b.version, a.version));

/** SHA-256 of a file on disk, streamed (never reads the whole file into memory). */
export const sha256File = (file) => new Promise((resolve, reject) => {
  const h = crypto.createHash('sha256');
  fs.createReadStream(file).on('error', reject).on('data', (c) => h.update(c)).on('end', () => resolve(h.digest('hex')));
});

/** Absolute path for a stored version file, refusing anything that escapes the folder. */
export const storedPath = (storedName, dir = downloadsDir()) => {
  const p = path.resolve(dir, String(storedName || ''));
  return p.startsWith(dir + path.sep) ? p : null;
};

/**
 * Which version a download request gets.
 *   ?version=1.2.0 (and optional ?platform=) → that exact version
 *   ?platform=windows                       → the latest for that platform
 *   nothing                                 → the version marked latest (newest if several), else the newest
 * `versions` should already be filtered to what the caller may see.
 */
export const pickVersion = (versions, { version, platform } = {}) => {
  const list = sortVersions(versions || []);
  const plat = platform ? String(platform).toLowerCase() : '';
  const want = version ? normalizeVersion(version) : null;
  if (version) {
    if (!want) return null;
    return list.find((v) => v.version === want && (!plat || v.platform === plat || v.platform === 'any'))
      || null;
  }
  const pool = plat ? list.filter((v) => v.platform === plat || v.platform === 'any') : list;
  return pool.find((v) => v.isLatest) || pool[0] || null;
};

/** The admin toggle "Allow free trial download before purchase" (default ON). */
export const allowsFreeDownload = (software) => Boolean(software) && software.allowFreeDownload !== false;

/** What the public page may know about a version (no disk path, no counters). */
export const publicVersion = (v) => ({
  _id: v._id,
  version: v.version,
  platform: v.platform,
  platformLabel: PLATFORM_LABELS[v.platform] || 'Any',
  releaseDate: v.releaseDate,
  notes: v.notes || '',
  requirements: v.requirements || '',
  fileName: v.originalName,
  size: v.size,
  sha256: v.sha256,
  isLatest: Boolean(v.isLatest),
});

/** Admin view (adds counters + flags). */
export const adminVersion = (v) => ({
  ...publicVersion(v),
  published: v.published !== false,
  downloadCount: v.downloadCount || 0,
  createdAt: v.createdAt,
});

/**
 * multer (disk storage, streamed: the file is never held in memory) for software files.
 * `allowed` = extension allowlist; files go to `dest` under a unique name, so an upload can
 * never overwrite an existing file.
 */
export const softwareMulter = ({ dest, allowed = VERSION_EXTENSIONS, field = 'file' } = {}) => multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      try { cb(null, ensureDir(typeof dest === 'function' ? dest(req) : dest)); } catch (e) { cb(e); }
    },
    filename: (req, file, cb) => {
      const safe = sanitizeFilename(file.originalname);
      cb(null, `${Date.now()}_${crypto.randomBytes(6).toString('hex')}_${safe}`);
    },
  }),
  limits: { fileSize: maxUploadBytes(), files: 1, fields: 20, fieldSize: 64 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname !== field && !(Array.isArray(field) && field.includes(file.fieldname))) {
      return cb(Object.assign(new Error('Unexpected file field.'), { status: 400 }));
    }
    if (!allowed.includes(extOf(file.originalname))) {
      return cb(Object.assign(new Error(`File type ${extOf(file.originalname) || '(none)'} is not allowed. Allowed: ${allowed.join(', ')}`), { status: 400 }));
    }
    return cb(null, true);
  },
});

/** Run a multer middleware and turn its errors into clean 400 / 413 JSON answers. */
export const runUpload = (mw) => (req, res, next) => {
  // Big files on slow connections: don't let Node's per-socket timeout cut the upload.
  req.setTimeout?.(0);
  mw(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: `File is too large. The limit is ${maxUploadMb()} MB (SOFTWARE_MAX_UPLOAD_MB).` });
    }
    const status = err.status || (err instanceof multer.MulterError ? 400 : 500);
    return res.status(status).json({ success: false, message: err.message || 'Upload failed' });
  });
};
