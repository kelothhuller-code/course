import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { sendRegistrationEmail, sendCustomEmail } from '../utils/mailer.js';
import crypto from 'crypto';

import { getJwtSecret } from '../utils/jwtSecret.js';

const router = express.Router();

// Generate JWT token with tokenVersion for concurrent session control (F2)
export const generateToken = (id, tokenVersion = 0) => {
  return jwt.sign({ id, tokenVersion }, getJwtSecret(), {
    expiresIn: '30d',
  });
};

export const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password, referralCode } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'Name is required' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ message: 'A valid email address is required' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    const userExists = await User.findOne({ email: cleanEmail });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // All publicly registered accounts are strictly regular users
    const role = 'user';

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
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role,
      referralCode: newReferralCode,
      referredBy
    });

    if (user) {
      // Send welcome email (asynchronous, non-blocking)
      sendRegistrationEmail(user.email, user.name);

      const token = generateToken(user._id);
      setAuthCookie(res, token);

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getAdminCredentials = () => {
  let email = '';
  let pass = '';

  const envPaths = [
    path.join(__dirname, '..', '.env'),
    path.join(process.cwd(), 'backend', '.env'),
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '..', '.env')
  ];

  for (const envPath of envPaths) {
    try {
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const emailMatch = envContent.match(/^\s*ADMIN_EMAIL\s*=\s*(.+)$/m);
        const passMatch = envContent.match(/^\s*ADMIN_PASSWORD\s*=\s*(.+)$/m);
        if (!email && emailMatch && emailMatch[1]) {
          email = emailMatch[1].trim().replace(/^["']|["']$/g, '').toLowerCase();
        }
        if (!pass && passMatch && passMatch[1]) {
          pass = passMatch[1].trim().replace(/^["']|["']$/g, '');
        }
      }
    } catch (e) {
      // ignore
    }
    if (email && pass) break;
  }

  if (!email) email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!pass) pass = (process.env.ADMIN_PASSWORD || '').trim().replace(/^["']|["']$/g, '');

  return { email, pass };
};

// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide both email and password.' });
  }

  try {
    const { email: adminEmail, pass: adminPassword } = getAdminCredentials();
    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = typeof password === 'string' ? password.trim() : password;

    // Check strictly against configured .env admin credentials
    const isMasterAdmin = Boolean(
      adminEmail &&
      adminPassword &&
      cleanEmail === adminEmail &&
      cleanPassword === adminPassword
    );

    if (isMasterAdmin) {
      let superAdmin = await User.findOne({ email: cleanEmail });
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      if (!superAdmin) {
        superAdmin = await User.create({
          name: 'Super Admin',
          email: cleanEmail,
          password: hashedPassword,
          role: 'admin',
        });
      } else {
        superAdmin.password = hashedPassword;
        superAdmin.role = 'admin';
        await superAdmin.save();
      }

      const token = generateToken(superAdmin._id, superAdmin.tokenVersion || 0);
      setAuthCookie(res, token);

      return res.json({
        _id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
        token,
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Invalidate any previous concurrent sessions (F2)
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();

      // Admin role is strictly controlled by .env ADMIN_EMAIL
      const effectiveRole = (cleanEmail === adminEmail && user.role === 'admin') ? 'admin' : 'user';

      const token = generateToken(user._id, user.tokenVersion);
      setAuthCookie(res, token);

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: effectiveRole,
        token,
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
  // existing profile handler stays unchanged
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('enrolledCourses.courseId')
      .populate('enrolledEvents.eventId')
      .populate('purchasedSoftware.softwareId')
      .populate('purchasedServices.serviceId');

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

// @desc    Logout user and clear auth cookie
// @route   POST /api/auth/logout
// @access  Public
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

// Forgot password: request OTP (60s cooldown, max 5 per hour)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const now = new Date();

    // 1. Short cooldown: 60 seconds between resend attempts
    if (user.lastForgotAttempt && (now - user.lastForgotAttempt) < 60 * 1000) {
      const waitSeconds = Math.ceil((60 * 1000 - (now - user.lastForgotAttempt)) / 1000);
      return res.status(429).json({ message: `Please wait ${waitSeconds} seconds before requesting another code.` });
    }

    // 2. Hourly rate limit: Max 5 OTP requests per hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    if (!user.forgotRequestWindow || user.forgotRequestWindow < oneHourAgo) {
      user.forgotRequestWindow = now;
      user.forgotRequestCount = 0;
    }
    if (user.forgotRequestCount >= 5) {
      return res.status(429).json({ message: 'Too many password reset requests. Please try again after an hour.' });
    }
    user.forgotRequestCount = (user.forgotRequestCount || 0) + 1;

    // Generate 6‑digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.forgotPasswordOTP = otp;
    user.forgotPasswordExpires = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
    user.forgotPasswordAttempts = 0; // Reset failed attempts counter on new OTP
    user.lastForgotAttempt = now;
    await user.save();

    // Send OTP email
    const emailHtml = `
      <p>Hi ${user.name || ''},</p>
      <p>Your password reset code is <strong style="font-size:1.2em;">${otp}</strong>. It expires in 10 minutes.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `;
    await sendCustomEmail({
      to: user.email,
      subject: 'Password Reset Code',
      html: emailHtml,
    });
    res.json({ message: 'OTP sent to your email address' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password with OTP (Brute-force protection: Max 5 failed attempts)
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ message: 'Missing fields' });
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long' });
  }
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if OTP attempts exceeded
    if (user.forgotPasswordAttempts >= 5) {
      user.forgotPasswordOTP = undefined;
      user.forgotPasswordExpires = undefined;
      user.forgotPasswordAttempts = 0;
      await user.save();
      return res.status(400).json({ message: 'Maximum OTP verification attempts exceeded. Please request a new code.' });
    }

    if (!user.forgotPasswordExpires || user.forgotPasswordExpires < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new code.' });
    }

    if (!user.forgotPasswordOTP || user.forgotPasswordOTP !== String(otp).trim()) {
      user.forgotPasswordAttempts = (user.forgotPasswordAttempts || 0) + 1;
      const reachedMax = user.forgotPasswordAttempts >= 5;
      if (reachedMax) {
        user.forgotPasswordOTP = undefined;
        user.forgotPasswordExpires = undefined;
      }
      await user.save();
      const remaining = 5 - user.forgotPasswordAttempts;
      return res.status(400).json({
        message: remaining > 0
          ? `Invalid OTP code. You have ${remaining} attempts remaining.`
          : 'Invalid OTP code. Maximum attempts exceeded. The code has been invalidated. Please request a new code.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    user.password = hashed;

    // Clear OTP and rate-limiting fields
    user.forgotPasswordOTP = undefined;
    user.forgotPasswordExpires = undefined;
    user.forgotPasswordAttempts = 0;
    user.lastForgotAttempt = undefined;
    await user.save();
    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
