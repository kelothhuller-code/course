/**
 * Admin: software versions (installer / archive uploads).  Mounted at /api/admin/software
 *
 *   GET    /:id/versions               list (all, incl. unpublished, with download counts)
 *   POST   /:id/versions               multipart: file + version, platform, releaseDate, notes,
 *                                      requirements, published, isLatest
 *   PUT    /:id/versions/:versionId    edit notes / requirements / version / platform / date,
 *                                      publish / unpublish, mark latest
 *   DELETE /:id/versions/:versionId    delete the version AND its file (only explicit deletes
 *                                      ever remove a file)
 *
 * Admin auth (protect + admin) runs BEFORE multer, so nothing from a non-admin is written to disk.
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { protect, admin } from '../middleware/auth.js';
import Software from '../models/Software.js';
import SoftwareVersion, { VERSION_PLATFORMS } from '../models/SoftwareVersion.js';
import {
  softwareMulter, runUpload, downloadsDir, ensureDir, sha256File, sanitizeFilename, normalizeVersion,
  guessPlatform, adminVersion, sortVersions, storedPath,
} from '../utils/softwareDownloads.js';

const router = express.Router();
const isId = (v) => /^[a-f0-9]{24}$/i.test(String(v || ''));
const bool = (v, d) => (v === undefined || v === '' ? d : v === true || v === 'true' || v === '1' || v === 'on');

const upload = softwareMulter({
  field: 'file',
  // one sub-folder per product, e.g. private_downloads/6ae43f06c3f7b712c373ffa5/
  dest: (req) => path.join(downloadsDir(), String(req.params.id)),
});

/** Make sure the admin route targets a real product before accepting any bytes. */
const loadSoftware = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: 'Invalid software id' });
    const sw = await Software.findById(req.params.id).select('_id title slug').lean();
    if (!sw) return res.status(404).json({ message: 'Software not found' });
    req.software = sw;
    return next();
  } catch (e) {
    return next(e);
  }
};

const removeFile = (p) => p && fs.promises.unlink(p).catch(() => {});

const parseDate = (v) => {
  if (v === undefined || v === '') return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Only one "latest" per platform: unset it on the others of the same platform. */
const makeLatest = async (softwareId, version) => {
  await SoftwareVersion.updateMany(
    { software: softwareId, platform: version.platform, _id: { $ne: version._id } },
    { $set: { isLatest: false } },
  );
};

// Only the version paths: the rest of /api/admin/software/* is handled (and guarded) by adminRoutes.
router.use('/:id/versions', protect, admin);

router.get('/:id/versions', loadSoftware, async (req, res) => {
  try {
    const list = await SoftwareVersion.find({ software: req.software._id }).lean();
    res.json({ success: true, versions: sortVersions(list).map(adminVersion) });
  } catch (e) {
    console.error('List versions error:', e.message);
    res.status(500).json({ message: 'Could not load versions' });
  }
});

router.post('/:id/versions', loadSoftware, (req, res, next) => { ensureDir(downloadsDir()); next(); }, runUpload(upload.single('file')), async (req, res) => {
  const file = req.file;
  try {
    if (!file) return res.status(400).json({ message: 'Choose a file to upload.' });
    const version = normalizeVersion(req.body.version);
    if (!version) {
      await removeFile(file.path);
      return res.status(400).json({ message: 'Version must look like 1.2.0 (numbers and dots, optional -beta.1).' });
    }
    const platform = String(req.body.platform || guessPlatform(file.originalname)).toLowerCase();
    if (!VERSION_PLATFORMS.includes(platform)) {
      await removeFile(file.path);
      return res.status(400).json({ message: 'Invalid platform.' });
    }
    const releaseDate = parseDate(req.body.releaseDate);
    if (releaseDate === null) {
      await removeFile(file.path);
      return res.status(400).json({ message: 'Invalid release date.' });
    }
    if (await SoftwareVersion.exists({ software: req.software._id, version, platform })) {
      await removeFile(file.path);
      return res.status(409).json({ message: `Version ${version} for this platform already exists. Use a new version number (older files are never overwritten).` });
    }
    const sha256 = await sha256File(file.path);
    const published = bool(req.body.published, true);
    const doc = await SoftwareVersion.create({
      software: req.software._id,
      version,
      platform,
      releaseDate: releaseDate || new Date(),
      notes: String(req.body.notes || '').slice(0, 20000),
      requirements: String(req.body.requirements || '').slice(0, 500),
      storedName: path.relative(downloadsDir(), file.path).split(path.sep).join('/'),
      originalName: sanitizeFilename(file.originalname),
      size: file.size,
      sha256,
      mimeType: 'application/octet-stream',
      published,
      isLatest: published && bool(req.body.isLatest, true),
      uploadedBy: req.user?._id || null,
    });
    if (doc.isLatest) await makeLatest(req.software._id, doc);
    return res.status(201).json({ success: true, message: `Version ${version} uploaded`, version: adminVersion(doc) });
  } catch (e) {
    if (file) await removeFile(file.path);
    if (e?.code === 11000) return res.status(409).json({ message: 'That version already exists for this platform.' });
    console.error('Upload version error:', e.message);
    return res.status(500).json({ message: 'Could not save the version' });
  }
});

router.put('/:id/versions/:versionId', loadSoftware, async (req, res) => {
  try {
    if (!isId(req.params.versionId)) return res.status(400).json({ message: 'Invalid version id' });
    const v = await SoftwareVersion.findOne({ _id: req.params.versionId, software: req.software._id });
    if (!v) return res.status(404).json({ message: 'Version not found' });
    const b = req.body || {};
    if (b.version !== undefined) {
      const n = normalizeVersion(b.version);
      if (!n) return res.status(400).json({ message: 'Version must look like 1.2.0.' });
      v.version = n;
    }
    if (b.platform !== undefined) {
      if (!VERSION_PLATFORMS.includes(b.platform)) return res.status(400).json({ message: 'Invalid platform.' });
      v.platform = b.platform;
    }
    if (b.releaseDate !== undefined) {
      const d = parseDate(b.releaseDate);
      if (d === null) return res.status(400).json({ message: 'Invalid release date.' });
      if (d) v.releaseDate = d;
    }
    if (b.notes !== undefined) v.notes = String(b.notes).slice(0, 20000);
    if (b.requirements !== undefined) v.requirements = String(b.requirements).slice(0, 500);
    if (b.published !== undefined) v.published = bool(b.published, true);
    if (b.isLatest !== undefined) v.isLatest = bool(b.isLatest, false);
    if (!v.published) v.isLatest = false; // an unpublished build can't be the public default
    await v.save();
    if (v.isLatest) await makeLatest(req.software._id, v);
    return res.json({ success: true, version: adminVersion(v) });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ message: 'That version already exists for this platform.' });
    console.error('Update version error:', e.message);
    return res.status(500).json({ message: 'Could not update the version' });
  }
});

router.delete('/:id/versions/:versionId', loadSoftware, async (req, res) => {
  try {
    if (!isId(req.params.versionId)) return res.status(400).json({ message: 'Invalid version id' });
    const v = await SoftwareVersion.findOne({ _id: req.params.versionId, software: req.software._id }).lean();
    if (!v) return res.status(404).json({ message: 'Version not found' });
    await SoftwareVersion.deleteOne({ _id: v._id });
    // Remove the file only if no other version points at it.
    if (!(await SoftwareVersion.exists({ storedName: v.storedName }))) await removeFile(storedPath(v.storedName));
    return res.json({ success: true, message: `Version ${v.version} deleted` });
  } catch (e) {
    console.error('Delete version error:', e.message);
    return res.status(500).json({ message: 'Could not delete the version' });
  }
});

export default router;
