import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import {
  getCourseAnalytics,
  getCourseComments,
  togglePinComment,
  adminToggleResolve,
  adminDeleteComment,
  adminReplyToComment,
  getEventAnalytics
} from '../controllers/adminController.js';

const router = express.Router();

// Course analytics
router.get('/courses/:courseId/analytics', protect, admin, getCourseAnalytics);
router.get('/courses/:courseId/comments', protect, admin, getCourseComments);

// Comment moderation
router.patch('/comments/:commentId/pin', protect, admin, togglePinComment);
router.patch('/comments/:commentId/resolve', protect, admin, adminToggleResolve);
router.delete('/comments/:commentId', protect, admin, adminDeleteComment);
router.post('/courses/:courseId/comments/:commentId/reply', protect, admin, adminReplyToComment);

// Event analytics
router.get('/events/:eventId/analytics', protect, admin, getEventAnalytics);

export default router;