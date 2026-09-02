import express from 'express';
import { protect, optionalAuth } from '../middleware/auth.js';
import {
  getCertificates,
  getCertificateByCourse,
  verifyCertificate,
  generateCertificate
} from '../controllers/certificateController.js';

const router = express.Router();

// Get user's certificates
router.get('/', protect, getCertificates);

// Get certificate for a specific course
router.get('/courses/:courseId', protect, getCertificateByCourse);

// Verify certificate (public)
router.get('/verify/:certificateId', verifyCertificate);

// Generate certificate (admin/instructor only)
router.post('/generate', protect, generateCertificate);

export default router;