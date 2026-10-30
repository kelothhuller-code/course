import mongoose from 'mongoose';

/**
 * One uploaded release (installer / archive) of a software product.
 *
 * Its own collection (not an array inside Software) so large release histories do not bloat
 * every catalog read, and download counters can be bumped with a single atomic $inc.
 * Files live OUTSIDE the public /uploads folder (see utils/softwareDownloads.js → downloadsDir)
 * and are only ever served by GET /api/software/:slugOrId/download.
 *
 * Every upload gets its own unique file on disk. Uploading a new version never removes or
 * overwrites an older file; a file is removed only when the admin deletes that version.
 */
export const VERSION_PLATFORMS = ['windows', 'macos', 'linux', 'android', 'any'];

const SoftwareVersionSchema = new mongoose.Schema({
  software: { type: mongoose.Schema.Types.ObjectId, ref: 'Software', required: true, index: true },
  version: { type: String, required: true, trim: true, maxlength: 40 },   // e.g. 1.2.0, 2.0.0-beta.1
  platform: { type: String, enum: VERSION_PLATFORMS, default: 'windows' },
  releaseDate: { type: Date, default: Date.now },
  notes: { type: String, default: '', maxlength: 20000 },                 // changelog (Markdown / plain text)
  requirements: { type: String, default: '', maxlength: 500 },            // e.g. "Windows 10 or later, 4 GB RAM"
  // File on disk (relative to the private downloads folder) + what the visitor sees
  storedName: { type: String, required: true },
  originalName: { type: String, required: true, maxlength: 200 },
  size: { type: Number, required: true, min: 0 },                          // bytes
  sha256: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
  mimeType: { type: String, default: 'application/octet-stream' },
  published: { type: Boolean, default: true },                             // unpublished = never public
  isLatest: { type: Boolean, default: false },                             // default for "Download now" (per platform)
  downloadCount: { type: Number, default: 0, min: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
});

SoftwareVersionSchema.index({ software: 1, releaseDate: -1 });
SoftwareVersionSchema.index({ software: 1, version: 1, platform: 1 }, { unique: true });

export default mongoose.model('SoftwareVersion', SoftwareVersionSchema);
