import express from 'express';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// Apply admin protection to all routes in this router
router.use(protect);
router.use(admin);

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

export default router;
