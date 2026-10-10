import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { sendRegistrationEmail } from '../utils/mailer.js';
import crypto from 'crypto';

import { getJwtSecret } from '../utils/jwtSecret.js';

const router = express.Router();

// Generate JWT token with tokenVersion for concurrent session control (F2)
const generateToken = (id, tokenVersion = 0) => {
  return jwt.sign({ id, tokenVersion }, getJwtSecret(), {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password, referralCode } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check if this is the first user in the system. If so, make them admin.
    const isFirstUser = (await User.countDocuments({})) === 0;
    const role = isFirstUser ? 'admin' : 'user';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        referredBy = referrer._id;
      }
    }

    const newReferralCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      referralCode: newReferralCode,
      referredBy
    });

    if (user) {
      // Send welcome email (asynchronous, non-blocking)
      sendRegistrationEmail(user.email, user.name);

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  console.log('here')
  const { email, password } = req.body;

  try {
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();

    // Check for special super admin credentials
    if (adminEmail && adminPassword && email.toLowerCase().trim() === adminEmail && password === adminPassword) {
      let superAdmin = await User.findOne({ email: adminEmail });
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      if (!superAdmin) {
        superAdmin = await User.create({
          name: 'Super Admin',
          email: adminEmail,
          password: hashedPassword,
          role: 'admin',
        });
      } else {
        // Keep DB record and role in sync
        superAdmin.password = hashedPassword;
        superAdmin.role = 'admin';
        await superAdmin.save();
      }

      return res.json({
        _id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
        token: generateToken(superAdmin._id),
      });
    }

    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Invalidate any previous concurrent sessions (F2)
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.tokenVersion),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('enrolledCourses.courseId')
      .populate('enrolledEvents.eventId');

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
