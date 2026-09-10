import express from 'express';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Course from '../models/Course.js';
import Certificate from '../models/Certificate.js';
import Comment from '../models/Comment.js';
import ReferralLog from '../models/ReferralLog.js';
import { protect, admin } from '../middleware/auth.js';

import {
  getCourseAnalytics,
  getCourseComments,
  togglePinComment,
  adminToggleResolve,
  adminDeleteComment,
  adminReplyToComment,
  getEventAnalytics,
  broadcastEventEmail
} from '../controllers/adminController.js';

const router = express.Router();

// Course analytics


// Apply admin protection to all routes in this router
router.use(protect);
router.use(admin);
router.get('/courses/:courseId/analytics', protect, admin, getCourseAnalytics);
router.get('/courses/:courseId/comments', protect, admin, getCourseComments);

// Comment moderation
router.patch('/comments/:commentId/pin', protect, admin, togglePinComment);
router.patch('/comments/:commentId/resolve', protect, admin, adminToggleResolve);
router.delete('/comments/:commentId', protect, admin, adminDeleteComment);
router.post('/courses/:courseId/comments/:commentId/reply', protect, admin, adminReplyToComment);

// Event analytics
router.get('/events/:eventId/analytics', protect, admin, getEventAnalytics);
router.post('/events/:eventId/broadcast', protect, admin, broadcastEventEmail);
// @desc    Get all users list
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .populate('enrolledCourses.courseId', 'title category price');
    res.json(users);
  } catch (error) {
    console.error('Admin fetch users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all transaction histories
// @route   GET /api/admin/transactions
// @access  Private/Admin
router.get('/transactions', async (req, res) => {
  try {
    const txns = await Transaction.find({})
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json(txns);
  } catch (error) {
    console.error('Admin fetch transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get dashboard metrics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    
    // Calculate total payments received from successful transactions
    const successfulTxns = await Transaction.find({ status: 'success' });
    const totalPayments = successfulTxns.reduce((acc, txn) => acc + txn.amount, 0);

    const totalCourses = await Course.countDocuments({});
    const freeCourses = await Course.countDocuments({ isFree: true });
    
    // Count enrolled users across all courses
    const usersWithEnrollments = await User.find({ 'enrolledCourses.0': { $exists: true } });
    const totalEnrollments = usersWithEnrollments.reduce((acc, user) => acc + user.enrolledCourses.length, 0);

    res.json({
      totalUsers,
      totalPayments,
      totalCourses,
      freeCourses,
      paidCourses: totalCourses - freeCourses,
      totalEnrollments
    });
  } catch (error) {
    console.error('Admin fetch dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all certificates issued
// @route   GET /api/admin/certificates
// @access  Private/Admin
router.get('/certificates', async (req, res) => {
  try {
    const certificates = await Certificate.find({})
      .populate('userId', 'name email')
      .populate('courseId', 'title category')
      .sort({ issuedAt: -1 });
    res.json(certificates);
  } catch (error) {
    console.error('Admin fetch certificates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all comments for monitoring
// @route   GET /api/admin/comments
// @access  Private/Admin
router.get('/comments', async (req, res) => {
  try {
    const comments = await Comment.find({})
      .populate('userId', 'name email')
      .populate('courseId', 'title')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    console.error('Admin fetch comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get detailed stats for a specific course (Revenue, Students, Comments)
// @route   GET /api/admin/courses/:id/stats
// @access  Private/Admin
router.get('/courses/:id/stats', async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // 1. Revenue
    const successfulTxns = await Transaction.find({ itemId: courseId, status: 'success' });
    const revenue = successfulTxns.reduce((acc, txn) => acc + txn.amount, 0);

    // 2. Enrolled Students & Progress
    const enrolledUsers = await User.find({ 'enrolledCourses.courseId': courseId }).select('name email enrolledCourses');
    
    // Format students data
    const students = enrolledUsers.map(user => {
      const enrollment = user.enrolledCourses.find(c => c.courseId.toString() === courseId);
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        progress: enrollment ? enrollment.progress : 0,
        completed: enrollment ? enrollment.completed : false
      };
    });

    // 3. Comments & Replies
    const comments = await Comment.find({ courseId })
      .populate('userId', 'name email avatar')
      .populate({
        path: 'replies',
        populate: { path: 'userId', select: 'name email avatar' }
      })
      .sort({ createdAt: -1 });

    res.json({
      revenue,
      students,
      comments
    });
  } catch (error) {
    console.error('Course stats fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Admin reply to a comment
// @route   POST /api/admin/comments/:id/reply
// @access  Private/Admin
router.post('/comments/:id/reply', async (req, res) => {
  const { text } = req.body;
  const parentCommentId = req.params.id;

  try {
    const parentComment = await Comment.findById(parentCommentId);
    if (!parentComment) return res.status(404).json({ message: 'Comment not found' });

    const reply = await Comment.create({
      userId: req.user._id, // Admin
      courseId: parentComment.courseId,
      lessonId: parentComment.lessonId, // Inherit from parent
      parentCommentId,
      text,
      depth: parentComment.depth + 1
    });

    // Add reply to parent
    parentComment.replies.push(reply._id);
    await parentComment.save();

    // Populate user details for returning the fresh reply
    const populatedReply = await Comment.findById(reply._id).populate('userId', 'name email');

    res.status(201).json(populatedReply);
  } catch (error) {
    console.error('Admin reply error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Revoke course enrollment for a user
// @route   POST /api/admin/revoke-enrollment
// @access  Private/Admin
router.post('/revoke-enrollment', async (req, res) => {
  const { userId, courseId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Filter out the course enrollment
    user.enrolledCourses = user.enrolledCourses.filter(
      (c) => c.courseId.toString() !== courseId.toString()
    );

    await user.save();
    
    // Find populated updated user details and send back
    const updatedUser = await User.findById(userId)
      .select('-password')
      .populate('enrolledCourses.courseId', 'title category price');

    res.json({
      message: 'Course enrollment successfully revoked',
      user: updatedUser
    });
  } catch (error) {
    console.error('Admin revoke enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all referral logs
// @route   GET /api/admin/referrals
// @access  Private/Admin
router.get('/referrals', async (req, res) => {
  try {
    const logs = await ReferralLog.find({})
      .populate('referrerId', 'name email walletBalance')
      .populate('refereeId', 'name email')
      .populate('courseId', 'title affiliateCommission')
      .sort({ createdAt: -1 });
    
    res.json(logs);
  } catch (error) {
    console.error('Admin fetch referrals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get detailed data for a single user (profile, enrollments, transactions, referrals)
// @route   GET /api/admin/users/:id
// @access  Private/Admin
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('enrolledCourses.courseId', 'title category price thumbnail')
      .populate('referredBy', 'name email');

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Total money paid by this user
    const transactions = await Transaction.find({ userId: user._id, status: 'success' })
      .populate('itemId')
      .sort({ createdAt: -1 });
    const totalPaid = transactions.reduce((acc, t) => acc + t.amount, 0);

    // Referral logs where this user is the referrer
    const referralLogs = await ReferralLog.find({ referrerId: user._id })
      .populate('refereeId', 'name email')
      .populate('courseId', 'title')
      .sort({ createdAt: -1 });
    
    const totalEarned = referralLogs.reduce((acc, l) => acc + l.commissionAmount, 0);

    res.json({
      user,
      transactions,
      totalPaid,
      referralLogs,
      totalEarned
    });
  } catch (error) {
    console.error('Admin fetch user detail error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Manually record a settlement for an affiliate
// @route   POST /api/admin/affiliates/:userId/settle
// @access  Private/Admin
router.post('/affiliates/:userId/settle', async (req, res) => {
  const { amount, note } = req.body;
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const settleAmount = parseFloat(amount);
    if (isNaN(settleAmount) || settleAmount <= 0) {
      return res.status(400).json({ message: 'Invalid settlement amount' });
    }

    if (settleAmount > user.walletBalance) {
      return res.status(400).json({ message: 'Settlement amount exceeds wallet balance' });
    }

    user.walletBalance -= settleAmount;
    await user.save();

    res.json({ 
      message: `₹${settleAmount} settled for ${user.name}`,
      newBalance: user.walletBalance 
    });
  } catch (error) {
    console.error('Affiliate settlement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get course full content (chapters, videos) for admin preview
// @route   GET /api/admin/courses/:id/content
// @access  Private/Admin
router.get('/courses/:id/content', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (error) {
    console.error('Course content fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
