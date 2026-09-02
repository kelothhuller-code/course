import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  toggleLike,
  markResolved
} from '../controllers/commentController.js';

const router = express.Router();

// Get comments for a lesson (supports pagination)
router.get('/courses/:courseId/lessons/:lessonId/comments', protect, getComments);

// Create a comment
router.post('/courses/:courseId/lessons/:lessonId/comments', protect, createComment);

// Update a comment
router.put('/:commentId', protect, updateComment);

// Delete a comment
router.delete('/:commentId', protect, deleteComment);

// Toggle like on a comment
router.post('/:commentId/like', protect, toggleLike);

// Mark question as resolved
router.post('/:commentId/resolve', protect, markResolved);

export default router;