import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect, admin, isUserAdmin } from '../middleware/auth.js';
import Course from '../models/Course.js';
import User from '../models/User.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadBaseDir = path.join(__dirname, '..', 'public', 'uploads');
const thumbnailDir = path.join(uploadBaseDir, 'thumbnails');
const privateBaseDir = path.join(__dirname, '..', 'private_storage');
const softwareDir = path.join(privateBaseDir, 'software');
const materialsDir = path.join(privateBaseDir, 'materials');
const legacyMaterialsDir = path.join(uploadBaseDir, 'materials');

[uploadBaseDir, thumbnailDir, privateBaseDir, softwareDir, materialsDir].forEach(dir => {
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

// File Filter with strict extension and MIME type validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  // 1. Explicitly block SVG across all endpoints to prevent Stored XSS
  if (ext === '.svg' || mime.includes('svg')) {
    return cb(new Error('SVG files are strictly disallowed due to security restrictions (Stored XSS prevention).'), false);
  }

  // 2. Explicitly block dangerous web script and shell extensions
  const blockedScriptExtensions = [
    '.sh', '.py', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.php', '.phtml',
    '.cgi', '.pl', '.jsp', '.asp', '.aspx', '.bat', '.cmd', '.vbs', '.htm',
    '.html', '.com', '.scr', '.vbe', '.wsf', '.wsh', '.ps1'
  ];
  if (
    blockedScriptExtensions.includes(ext) ||
    mime.includes('javascript') ||
    mime.includes('x-sh') ||
    mime.includes('x-python') ||
    mime.includes('html') ||
    mime.includes('application/x-msdownload')
  ) {
    if (file.fieldname !== 'softwareFile' && file.fieldname !== 'software' && req.query.type !== 'software') {
      return cb(new Error(`File type ${ext} is restricted for security. Executable or script files are not allowed.`), false);
    }
  }

  // 3. Thumbnail images: raster images only (strict raster extension & MIME check)
  if (file.fieldname === 'thumbnail' || req.query.type === 'thumbnail') {
    const allowedImageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedImageExts.includes(ext) && (allowedImageMimes.includes(mime) || mime.startsWith('image/'))) {
      return cb(null, true);
    }
    return cb(new Error('Invalid image format. Allowed formats: JPG, PNG, WEBP, GIF.'), false);
  }

  // 4. Software files: software installers and archives (restricted to admin)
  if (file.fieldname === 'softwareFile' || file.fieldname === 'software' || req.query.type === 'software') {
    const allowedSoftwareExts = ['.zip', '.tar', '.gz', '.tgz', '.7z', '.rar', '.dmg', '.pkg', '.deb', '.exe', '.json'];
    if (allowedSoftwareExts.includes(ext)) {
      return cb(null, true);
    }
    return cb(new Error(`Software package format ${ext} is not allowed. Supported formats: ZIP, TAR, GZ, 7Z, RAR, DMG, PKG, DEB, EXE.`), false);
  }

  // 5. Learning Materials: Documents, notes, slides, sheets, archives (MIME & extension check)
  const allowedMaterialExts = [
    '.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt', '.zip',
    '.xlsx', '.xls', '.csv', '.tsv', '.ods',
    '.jpg', '.jpeg', '.png', '.webp'
  ];

  const allowedMaterialMimes = [
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/vnd.oasis.opendocument.spreadsheet',
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (allowedMaterialExts.includes(ext)) {
    if (mime === '' || allowedMaterialMimes.includes(mime) || mime.startsWith('image/')) {
      return cb(null, true);
    }
  }

  return cb(new Error(`File type ${ext} with MIME ${mime || 'unknown'} is not allowed. Supported formats: PDF, DOCX, PPTX, XLSX, CSV, TXT, ZIP, and standard images.`), false);
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

    const publicUrl = `/api/upload/material/download/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get('host')}${publicUrl}`;

    res.json({
      success: true,
      message: 'Learning material saved to secure private storage successfully',
      fileName: req.file.filename,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      url: publicUrl,
      downloadUrl: publicUrl,
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

    // Check access: Authorized .env Admin or Enrolled Student in the course referencing this file
    const isAdmin = isUserAdmin(req.user);

    if (!isAdmin) {
      // Find course referencing this material filename
      const escapedFilename = safeFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const course = await Course.findOne({
        'content.chapters.materials.link': { $regex: escapedFilename, $options: 'i' }
      });

      if (course) {
        const isFree = course.isFree || course.price === 0;
        const isEnrolled = req.user.enrolledCourses?.some(
          c => (c.courseId?._id || c.courseId)?.toString() === course._id.toString()
        );

        if (!isFree && !isEnrolled) {
          return res.status(403).json({
            message: 'Access denied: You must be enrolled in this course to view or download its study materials.'
          });
        }
      }
    }

    const isInline = req.query.inline === 'true' || req.query.view === '1';

    if (isInline) {
      const ext = path.extname(safeFilename).toLowerCase();

      // For security, prevent inline rendering of SVG files to block stored XSS
      if (ext === '.svg') {
        return res.download(filePath, safeFilename);
      }

      // Send file for browser inline display (e.g., embedded PDF or image)
      let contentType = 'application/octet-stream';
      if (ext === '.pdf') contentType = 'application/pdf';
      else if (['.png', '.jpg', '.jpeg'].includes(ext)) contentType = `image/${ext.replace('.', '')}`;
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.csv') contentType = 'text/csv';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
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
      const publicUrl = isThumb
        ? `/api/uploads/thumbnails/${f.filename}`
        : `/api/upload/material/download/${f.filename}`;
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
