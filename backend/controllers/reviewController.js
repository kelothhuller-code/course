import Review from '../models/Review.js';
import User from '../models/User.js';
import Course from '../models/Course.js';

// @desc    Get course reviews & rating distribution summary
// @route   GET /api/reviews/course/:courseId
// @access  Public
export const getCourseReviews = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating } = req.query;

    const query = { courseId, approved: true };
    if (rating && rating !== 'all') {
      if (rating === 'low') {
        query.rating = { $lte: 3 };
      } else if (rating === 'high') {
        query.rating = { $gte: 4 };
      } else if (!isNaN(Number(rating))) {
        query.rating = Number(rating);
      }
    }

    const allReviews = await Review.find({ courseId, approved: true });
    const totalReviews = allReviews.length;
    let avgRating = 0;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (totalReviews > 0) {
      const sum = allReviews.reduce((acc, curr) => {
        const r = Math.min(5, Math.max(1, Math.round(curr.rating)));
        distribution[r] = (distribution[r] || 0) + 1;
        return acc + curr.rating;
      }, 0);
      avgRating = Math.round((sum / totalReviews) * 10) / 10;
    }

    const filteredReviews = await Review.find(query)
      .populate('userId', 'name email profilePicture')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      stats: {
        totalReviews,
        avgRating,
        distribution
      },
      reviews: filteredReviews
    });
  } catch (error) {
    console.error('Error fetching course reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
};

// @desc    Create a review for a course
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res) => {
  try {
    const { courseId, rating, headline, comment } = req.body;
    const userId = req.user._id;

    if (!courseId || !rating || !comment) {
      return res.status(400).json({ message: 'Course ID, rating, and comment are required' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user already reviewed
    const existing = await Review.findOne({ courseId, userId });
    if (existing) {
      return res.status(400).json({ message: 'You have already submitted a review for this course' });
    }

    // Check if user is enrolled
    const user = await User.findById(userId);
    const isVerifiedPurchase = user.enrolledCourses?.some(c =>
      (c.courseId?._id || c.courseId)?.toString() === courseId.toString()
    ) || false;

    const numRating = Math.round(Number(rating));
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
    }

    const review = await Review.create({
      courseId,
      userId,
      rating: numRating,
      headline: headline || '',
      comment,
      isVerifiedPurchase,
      approved: true
    });

    const populatedReview = await Review.findById(review._id).populate('userId', 'name profilePicture');

    res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been published.',
      review: populatedReview
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Failed to post review' });
  }
};

// @desc    Admin reply to a review
// @route   POST /api/reviews/:id/reply
// @access  Private/Admin
export const replyToReview = async (req, res) => {
  try {
    const { replyText } = req.body;
    if (!replyText || !replyText.trim()) {
      return res.status(400).json({ message: 'Reply text is required' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.adminReply = {
      text: replyText.trim(),
      repliedAt: new Date()
    };
    await review.save();

    const updated = await Review.findById(review._id).populate('userId', 'name email profilePicture');

    res.json({
      success: true,
      message: 'Admin reply saved successfully',
      review: updated
    });
  } catch (error) {
    console.error('Error adding admin reply:', error);
    res.status(500).json({ message: 'Failed to save admin reply' });
  }
};

// @desc    Admin delete a review
// @route   DELETE /api/reviews/:id
// @access  Private/Admin
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Failed to delete review' });
  }
};
