import express from 'express';
import crypto from 'crypto';
import { protect } from '../middleware/auth.js';
import Transaction from '../models/Transaction.js';
import Course from '../models/Course.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import ReferralLog from '../models/ReferralLog.js';
import { sendPurchaseEmail } from '../utils/mailer.js';

const router = express.Router();

// Helper to generate hash
const calculateHash = (key, txnid, amount, productinfo, firstname, email, salt) => {
  // Formula: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
  const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
  return crypto.createHash('sha512').update(hashString).digest('hex');
};

// Helper to verify response hash
const verifyResponseHash = (key, txnid, amount, productinfo, firstname, email, status, salt, responseHash) => {
  // Formula: sha512(salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
  const hashString = `${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');
  return calculatedHash === responseHash;
};

// @desc    Initiate a payment transaction
// @route   POST /api/payment/pay
// @access  Private
router.post('/pay', protect, async (req, res) => {
  const { itemId, itemType } = req.body; // itemType: 'course' or 'event'

  try {
    let item;
    if (itemType === 'course') {
      item = await Course.findById(itemId);
    } else if (itemType === 'event') {
      item = await Event.findById(itemId);
    }

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Use discountedPrice if available and lower than original price
    const price = (item.discountedPrice !== undefined && item.discountedPrice !== null && item.discountedPrice >= 0 && item.discountedPrice < item.price)
      ? item.discountedPrice 
      : item.price;

    if (price === 0) {
      return res.status(400).json({ message: 'Item is free. No payment required. Use /api/enroll/free' });
    }

    // Generate unique txn ID
    const txnid = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Create a pending transaction
    await Transaction.create({
      txnid,
      userId: req.user._id,
      itemType,
      itemId: item._id,
      amount: price,
      status: 'pending',
    });

    const key = process.env.PAYU_MERCHANT_KEY || 'mock_key';
    const salt = process.env.PAYU_MERCHANT_SALT || 'mock_salt';
    const actionUrl = key === 'mock_key' 
      ? 'mock' // Front-end will catch this and display a simulation modal/page
      : `${process.env.PAYU_BASE_URL || 'https://test.payu.in'}/_payment`;

    const productinfo = item.title;
    const firstname = req.user.name;
    const email = req.user.email;

    // Calculate PayU hash
    const hash = calculateHash(key, txnid, price, productinfo, firstname, email, salt);

    // Callbacks
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const surl = `${backendUrl}/api/payment/response`;
    const furl = `${backendUrl}/api/payment/response`;

    res.json({
      isMock: key === 'mock_key',
      action: actionUrl,
      key,
      txnid,
      amount: price,
      productinfo,
      firstname,
      email,
      phone: '9999999999', // placeholder phone
      surl,
      furl,
      hash,
      service_provider: 'payu_paisa',
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    PayU redirection callback (surl/furl)
// @route   POST /api/payment/response
// @access  Public
router.post('/response', async (req, res) => {
  // PayU sends URL-encoded form data in POST body
  const { status, txnid, amount, productinfo, firstname, email, hash } = req.body;

  try {
    const txn = await Transaction.findOne({ txnid });
    if (!txn) {
      return res.status(404).send('Transaction not found');
    }

    const key = process.env.PAYU_MERCHANT_KEY || 'mock_key';
    const salt = process.env.PAYU_MERCHANT_SALT || 'mock_salt';

    let isHashValid = false;
    if (key === 'mock_key') {
      // In mock mode, we bypass cryptographic check, or verify a simpler signature
      isHashValid = true;
    } else {
      isHashValid = verifyResponseHash(key, txnid, amount, productinfo, firstname, email, status, salt, hash);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (isHashValid && status === 'success') {
      txn.status = 'success';
      txn.payuResponse = req.body;
      await txn.save();

      // Enroll the user in the purchased course/event
      const user = await User.findById(txn.userId);
      if (txn.itemType === 'course') {
        const isAlreadyEnrolled = user.enrolledCourses.some(
          (c) => c.courseId.toString() === txn.itemId.toString()
        );
        if (!isAlreadyEnrolled) {
          user.enrolledCourses.push({
            courseId: txn.itemId,
            progress: 0,
            completed: false,
            completedChapters: [],
          });
        }
      } else if (txn.itemType === 'event') {
        const isAlreadyEnrolled = user.enrolledEvents.some(
          (e) => e.eventId.toString() === txn.itemId.toString()
        );
        if (!isAlreadyEnrolled) {
          user.enrolledEvents.push({
            eventId: txn.itemId,
          });
        }
      }
      await user.save();

      // Send purchase confirmation email
      sendPurchaseEmail(user.email, user.name, productinfo, txnid, amount);

      // Process Referral Commission
      if (txn.itemType === 'course' && user.referredBy) {
        const course = await Course.findById(txn.itemId);
        if (course && course.affiliateCommission > 0) {
          const referrer = await User.findById(user.referredBy);
          if (referrer) {
            referrer.walletBalance += course.affiliateCommission;
            await referrer.save();
            await ReferralLog.create({
              referrerId: referrer._id,
              refereeId: user._id,
              courseId: course._id,
              commissionAmount: course.affiliateCommission
            });
          }
        }
      }

      // Redirect client to dashboard with success query param
      res.redirect(`${frontendUrl}/dashboard?payment=success&txnid=${txnid}`);
    } else {
      txn.status = 'failed';
      txn.payuResponse = req.body;
      await txn.save();

      // Redirect client to dashboard with failure query param
      res.redirect(`${frontendUrl}/dashboard?payment=failed&txnid=${txnid}`);
    }
  } catch (error) {
    console.error('Payment response callback error:', error);
    res.status(500).send('An error occurred during payment processing');
  }
});

// @desc    Simulate response callback (For Mock Mode in Frontend)
// @route   POST /api/payment/mock-callback
// @access  Public (Simulates the PayU gateway returning post request)
router.post('/mock-callback', async (req, res) => {
  const { txnid, status } = req.body;

  try {
    const txn = await Transaction.findOne({ txnid });
    if (!txn) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const user = await User.findById(txn.userId);
    let itemTitle = 'WIDETECHNOS item';
    if (txn.itemType === 'course') {
      const c = await Course.findById(txn.itemId);
      if (c) itemTitle = c.title;
    } else {
      const e = await Event.findById(txn.itemId);
      if (e) itemTitle = e.title;
    }

    // Construct mock payload similar to PayU response structure
    const payload = {
      status,
      txnid,
      amount: txn.amount.toString(),
      productinfo: itemTitle,
      firstname: user.name,
      email: user.email,
      hash: 'mock_hash_value',
    };

    // Forward to our standard callback endpoint via axios or call the code logic directly.
    // Call the code logic directly to keep it self-contained:
    txn.status = status;
    txn.payuResponse = payload;
    await txn.save();

    if (status === 'success') {
      if (txn.itemType === 'course') {
        const isAlreadyEnrolled = user.enrolledCourses.some(
          (c) => c.courseId.toString() === txn.itemId.toString()
        );
        if (!isAlreadyEnrolled) {
          user.enrolledCourses.push({
            courseId: txn.itemId,
            progress: 0,
            completed: false,
            completedChapters: [],
          });
        }
      } else if (txn.itemType === 'event') {
        const isAlreadyEnrolled = user.enrolledEvents.some(
          (e) => e.eventId.toString() === txn.itemId.toString()
        );
        if (!isAlreadyEnrolled) {
          user.enrolledEvents.push({
            eventId: txn.itemId,
          });
        }
      }
      await user.save();

      // Send purchase confirmation email
      sendPurchaseEmail(user.email, user.name, itemTitle, txnid, txn.amount);

      // Process Referral Commission
      if (txn.itemType === 'course' && user.referredBy) {
        const course = await Course.findById(txn.itemId);
        if (course && course.affiliateCommission > 0) {
          const referrer = await User.findById(user.referredBy);
          if (referrer) {
            referrer.walletBalance += course.affiliateCommission;
            await referrer.save();
            await ReferralLog.create({
              referrerId: referrer._id,
              refereeId: user._id,
              courseId: course._id,
              commissionAmount: course.affiliateCommission
            });
          }
        }
      }
    }

    res.json({
      message: `Mock payment ${status} processed successfully`,
      redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?payment=${status}&txnid=${txnid}`,
    });
  } catch (error) {
    console.error('Mock payment callback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
