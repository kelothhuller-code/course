import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getCourseProgress,
  updateVideoProgress,
  trackMaterialOpen,
  getMyLearning
} from '../controllers/progressController.js';

const router = express.Router();

// Get user's learning overview
router.get('/my-learning', protect, getMyLearning);

// Get progress for a specific course
router.get('/courses/:courseId/progress', protect, getCourseProgress);

// Update video progress
router.post('/courses/:courseId/lessons/:lessonId/video-progress', protect, updateVideoProgress);

// Track material opened
router.post('/courses/:courseId/lessons/:lessonId/material-open', protect, trackMaterialOpen);

export default router;