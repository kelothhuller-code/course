import fs from 'fs/promises';
import path from 'path';

/**
 * Image optimisation with sharp: resize to at most MAX_WIDTH wide (never upscale), fix EXIF
 * rotation, strip metadata and save as WebP next to the original (`photo_123.png` →
 * `photo_123.webp`).
 *
 * sharp is loaded lazily so the server still starts (and uploads still work, unoptimised) if
 * the native module is missing on a machine; a warning is logged instead.
 */
export const MAX_WIDTH = Number(process.env.IMAGE_MAX_WIDTH) || 1600;
export const WEBP_QUALITY = Number(process.env.IMAGE_WEBP_QUALITY) || 80;
export const OPTIMIZABLE_EXTS = ['.jpg', '.jpeg', '.png', '.webp']; // GIFs are left alone (may be animated)

let sharpPromise = null;
export const loadSharp = () => {
  if (!sharpPromise) {
    sharpPromise = import('sharp')
      .then((m) => m.default || m)
      .catch((err) => {
        console.warn(`⚠️  sharp not available, images will not be optimised: ${err.message}`);
        return null;
      });
  }
  return sharpPromise;
};

export const webpPathFor = (filePath) => {
  const ext = path.extname(filePath);
  return filePath.slice(0, filePath.length - ext.length) + '.webp';
};

/**
 * Convert one image file. Returns
 *   { ok: true, output, inputBytes, outputBytes, width, height } on success,
 *   { ok: false, reason } when skipped (unsupported type, sharp missing, not smaller, error).
 * The original file is never deleted here.
 * Options: { maxWidth, quality, dryRun, overwrite }.
 */
export const optimizeImageFile = async (filePath, { maxWidth = MAX_WIDTH, quality = WEBP_QUALITY, dryRun = false, overwrite = false } = {}) => {
  const ext = path.extname(filePath).toLowerCase();
  if (!OPTIMIZABLE_EXTS.includes(ext)) return { ok: false, reason: 'unsupported type' };
  const sharp = await loadSharp();
  if (!sharp) return { ok: false, reason: 'sharp not installed' };

  try {
    const inputBytes = (await fs.stat(filePath)).size;
    const meta = await sharp(filePath).metadata();
    if (meta.pages && meta.pages > 1) return { ok: false, reason: 'animated image' };

    const output = ext === '.webp' ? filePath.replace(/\.webp$/i, '.opt.webp') : webpPathFor(filePath);
    if (!overwrite) {
      const existing = await fs.stat(output).catch(() => null);
      if (existing) return { ok: true, output, inputBytes, outputBytes: existing.size, existed: true };
    }

    const pipeline = sharp(filePath)
      .rotate() // respect EXIF orientation, then metadata is dropped
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality, effort: 4 });

    const buffer = await pipeline.toBuffer({ resolveWithObject: true });
    const outputBytes = buffer.info.size;
    // Already small/optimal (WebP would not be smaller): keep the original
    if (outputBytes >= inputBytes) return { ok: false, reason: 'already optimal' };
    if (!dryRun) await fs.writeFile(output, buffer.data);
    return { ok: true, output, inputBytes, outputBytes, width: buffer.info.width, height: buffer.info.height, dryRun };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
};
