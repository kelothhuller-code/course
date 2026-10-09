import express from 'express';
import { getCourseReviews, createReview, replyToReview, deleteReview } from '../controllers/reviewController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.get('/course/:courseId', getCourseReviews);
router.post('/', protect, createReview);

router.post('/:id/reply', protect, admin, replyToReview);
router.delete('/:id', protect, admin, deleteReview);

export default router;
