import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadBaseDir = path.join(__dirname, '..', 'public', 'uploads');
const thumbnailDir = path.join(uploadBaseDir, 'thumbnails');
const materialsDir = path.join(uploadBaseDir, 'materials');

[uploadBaseDir, thumbnailDir, materialsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage Engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'thumbnail' || req.query.type === 'thumbnail') {
      cb(null, thumbnailDir);
    } else {
      cb(null, materialsDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBaseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    cb(null, `${cleanBaseName}_${uniqueSuffix}${ext}`);
  }
});

// File Filter
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    // Images
    '.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif',
    // Documents & Slides
    '.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt', '.zip'
  ];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} is not allowed. Supported formats: images (PNG, JPG, WebP, SVG) and documents (PDF, PPTX, DOCX, ZIP).`), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB max limit
  },
  fileFilter
});

// @desc    Upload course thumbnail or banner image
// @route   POST /api/upload/thumbnail
// @access  Private/Admin
router.post('/thumbnail', protect, admin, upload.single('thumbnail'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const publicUrl = `/uploads/thumbnails/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get('host')}${publicUrl}`;

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully to local server',
      fileName: req.file.filename,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      url: publicUrl,
      fullUrl
    });
  } catch (error) {
    console.error('Thumbnail upload error:', error);
    res.status(500).json({ message: 'Error uploading thumbnail', error: error.message });
  }
});

// @desc    Upload learning material (PDF notes, slide decks, documents)
// @route   POST /api/upload/material
// @access  Private/Admin
router.post('/material', protect, admin, upload.single('material'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No document file uploaded' });
    }

    const publicUrl = `/uploads/materials/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get('host')}${publicUrl}`;

    res.json({
      success: true,
      message: 'Learning material uploaded successfully to local server',
      fileName: req.file.filename,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      url: publicUrl,
      fullUrl
    });
  } catch (error) {
    console.error('Material upload error:', error);
    res.status(500).json({ message: 'Error uploading material', error: error.message });
  }
});

// @desc    Generic multi-file upload for course assets
// @route   POST /api/upload/multiple
// @access  Private/Admin
router.post('/multiple', protect, admin, upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const uploadedList = req.files.map(f => {
      const isThumb = f.destination.includes('thumbnails');
      const folder = isThumb ? 'thumbnails' : 'materials';
      const publicUrl = `/uploads/${folder}/${f.filename}`;
      return {
        fileName: f.filename,
        originalName: f.originalname,
        sizeBytes: f.size,
        mimeType: f.mimetype,
        url: publicUrl,
        fullUrl: `${req.protocol}://${req.get('host')}${publicUrl}`
      };
    });

    res.json({
      success: true,
      message: `${uploadedList.length} files uploaded successfully`,
      files: uploadedList
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ message: 'Error uploading multiple files', error: error.message });
  }
});

export default router;
