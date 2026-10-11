import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadBaseDir = path.join(__dirname, '..', 'public', 'uploads');
const thumbnailDir = path.join(uploadBaseDir, 'thumbnails');
const softwareDir = path.join(uploadBaseDir, 'software');
const materialsDir = path.join(uploadBaseDir, 'materials');
const legacyMaterialsDir = path.join(__dirname, '..', 'private_storage', 'materials');

[uploadBaseDir, thumbnailDir, softwareDir, materialsDir, legacyMaterialsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage Engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'thumbnail' || req.query.type === 'thumbnail') {
      cb(null, thumbnailDir);
    } else if (file.fieldname === 'softwareFile' || file.fieldname === 'software' || req.query.type === 'software') {
      cb(null, softwareDir);
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
    '.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif', '.bmp', '.ico',
    // Spreadsheets & Worksheets (Excel / CSV)
    '.xlsx', '.xls', '.csv', '.tsv', '.ods',
    // Documents & Slides
    '.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt', '.zip',
    // Software packages & archives
    '.tar', '.gz', '.tgz', '.7z', '.rar', '.exe', '.dmg', '.pkg', '.deb', '.sh', '.py', '.js', '.json'
  ];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} is not allowed. Supported formats: images, spreadsheets (XLSX, CSV, ODS), documents (PDF, DOCX, PPTX), and software packages.`), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB max limit
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

    const publicUrl = `/api/uploads/thumbnails/${req.file.filename}`;
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

// @desc    Upload software file package to dedicated server folder
// @route   POST /api/upload/software
// @access  Private/Admin
router.post('/software', protect, admin, upload.single('softwareFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No software package file uploaded' });
    }

    const publicUrl = `/api/uploads/software/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get('host')}${publicUrl}`;

    res.json({
      success: true,
      message: 'Software package saved to server software folder successfully',
      fileName: req.file.filename,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      url: publicUrl,
      downloadUrl: publicUrl,
      fullUrl
    });
  } catch (error) {
    console.error('Software package upload error:', error);
    res.status(500).json({ message: 'Error uploading software package', error: error.message });
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

    const publicUrl = `/api/uploads/materials/${req.file.filename}`;
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

// @desc    Download or view protected course material (PDF, slides, notes, sheets, images) (B2)
// @route   GET /api/upload/material/download/:filename
// @access  Private (Enrolled students or admin)
router.get('/material/download/:filename', protect, async (req, res) => {
  try {
    const filename = req.params.filename;
    const safeFilename = path.basename(filename);
    // Sanitize against directory traversal (e.g. ../../)
    let filePath = path.join(materialsDir, safeFilename);
    if (!fs.existsSync(filePath) && fs.existsSync(path.join(legacyMaterialsDir, safeFilename))) {
      filePath = path.join(legacyMaterialsDir, safeFilename);
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Requested material file not found on server.' });
    }

    // Admins or enrolled users have access
    const isInline = req.query.inline === 'true' || req.query.view === '1';

    if (isInline) {
      // Send file for browser inline display (e.g., embedded PDF or image)
      const ext = path.extname(safeFilename).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.pdf') contentType = 'application/pdf';
      else if (['.png', '.jpg', '.jpeg'].includes(ext)) contentType = `image/${ext.replace('.', '')}`;
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.svg') contentType = 'image/svg+xml';
      else if (ext === '.csv') contentType = 'text/csv';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
      return res.sendFile(filePath);
    }

    res.download(filePath, safeFilename);
  } catch (error) {
    console.error('Download material error:', error);
    res.status(500).json({ message: 'Error downloading material', error: error.message });
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
      const publicUrl = `/api/uploads/${folder}/${f.filename}`;
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
