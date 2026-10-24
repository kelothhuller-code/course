import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import bcrypt from 'bcryptjs';
import { protect, optionalAuth, isUserAdmin } from '../middleware/auth.js';
import Transaction from '../models/Transaction.js';
import Course from '../models/Course.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import ReferralLog from '../models/ReferralLog.js';
import Coupon from '../models/Coupon.js';
import AbandonedCheckout from '../models/AbandonedCheckout.js';
import { sendPurchaseEmail, sendAccountCreatedWithPurchaseEmail } from '../utils/mailer.js';
import { generateToken, setAuthCookie } from './authRoutes.js';

import { getOrInitGstConfig } from './gstRoutes.js';
import { computeGst, taxSettingsFor, isValidGstin, nextInvoiceNo, isSequentialSeries } from '../utils/gst.js';
import { resolveProductOrder, fulfilProduct, existingFulfilment, productResult, OrderError } from '../utils/productOrders.js';

const router = express.Router();

// Helper to fulfill purchase, enroll user, credit affiliate, and send email safely
async function fulfillPurchase(txn, paymentDetails = {}, gateway = 'razorpay') {
  if (txn.status === 'success') {
    const existingUser = txn.userId ? await User.findById(txn.userId) : null;
    return { alreadyFulfilled: true, user: existingUser };
  }

  txn.status = 'success';
  txn.gateway = gateway;
  if (gateway === 'razorpay') {
    txn.razorpayOrderId = paymentDetails.razorpay_order_id || txn.razorpayOrderId;
    txn.razorpayPaymentId = paymentDetails.razorpay_payment_id || txn.razorpayPaymentId;
    txn.razorpaySignature = paymentDetails.razorpay_signature || txn.razorpaySignature;
    txn.razorpayResponse = paymentDetails;
  } else if (gateway === 'payu') {
    txn.payuResponse = paymentDetails;
  }

  let user = txn.userId ? await User.findById(txn.userId) : null;
  const buyerEmail = txn.billingDetails?.buyerEmail ? txn.billingDetails.buyerEmail.toLowerCase().trim() : null;
  const buyerName = txn.billingDetails?.buyerName ? txn.billingDetails.buyerName.trim() : 'Student';

  let newlyCreated = false;
  let tempPassword = null;

  if (!user && buyerEmail) {
    user = await User.findOne({ email: buyerEmail });
  }

  if (!user && buyerEmail) {
    // Automatically provision new user account for the buyer!
    newlyCreated = true;
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    tempPassword = `Wide@${randomSuffix}!`;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);
    const newReferralCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    user = await User.create({
      name: buyerName,
      email: buyerEmail,
      password: hashedPassword,
      role: 'user',
      referralCode: newReferralCode
    });
  }

  if (user) {
    txn.userId = user._id;
  }
  // Sequential invoice series (INVOICE_SERIES=sequential): numbers are given out only for
  // successful payments, so the series has no gaps. Legacy mode numbers at order creation.
  if (!txn.invoiceNo && isSequentialSeries()) {
    txn.invoiceNo = await nextInvoiceNo();
  }
  await txn.save();

  if (!user) return { success: true };

  // Software licences and service orders have their own fulfilment + emails
  if (txn.itemType === 'software' || txn.itemType === 'service') {
    const product = await fulfilProduct(txn, user, { tempPassword: newlyCreated ? tempPassword : null });
    if (txn.couponCode) {
      try { await Coupon.findOneAndUpdate({ code: txn.couponCode }, { $addToSet: { usedByUsers: user._id } }); } catch (cErr) { console.error('Failed to update coupon user usage:', cErr); }
    }
    return { success: true, itemTitle: product.itemTitle, user, newlyCreated, tempPassword, product };
  }

  let itemTitle = 'WIDETECHNOS Academy Item';

  if (txn.itemType === 'course') {
    const course = await Course.findById(txn.itemId);
    if (course) itemTitle = course.title;

    const isAlreadyEnrolled = user.enrolledCourses.some(
      (c) => (c.courseId?._id || c.courseId)?.toString() === txn.itemId.toString()
    );
    if (!isAlreadyEnrolled) {
      user.enrolledCourses.push({
        courseId: txn.itemId,
        progress: 0,
        completed: false,
        completedChapters: [],
      });
      await user.save();
    }

    // Process Referral Commission
    if (user.referredBy && course && course.affiliateCommission > 0) {
      const referrer = await User.findById(user.referredBy);
      if (referrer) {
        referrer.walletBalance = (referrer.walletBalance || 0) + course.affiliateCommission;
        await referrer.save();
        await ReferralLog.create({
          referrerId: referrer._id,
          refereeId: user._id,
          courseId: course._id,
          commissionAmount: course.affiliateCommission
        });
      }
    }
  } else if (txn.itemType === 'event') {
    const event = await Event.findById(txn.itemId);
    if (event) itemTitle = event.title;

    const isAlreadyEnrolled = user.enrolledEvents.some(
      (e) => (e.eventId?._id || e.eventId)?.toString() === txn.itemId.toString()
    );
    if (!isAlreadyEnrolled) {
      user.enrolledEvents.push({
        eventId: txn.itemId,
      });
      await user.save();
    }
  }

  // Track coupon redemption per user (C2)
  if (txn.couponCode) {
    try {
      await Coupon.findOneAndUpdate(
        { code: txn.couponCode },
        { $addToSet: { usedByUsers: user._id } }
      );
    } catch (cErr) {
      console.error('Failed to update coupon user usage:', cErr);
    }
  }

  // Send purchase confirmation email or new account welcome email
  try {
    if (newlyCreated && tempPassword) {
      await sendAccountCreatedWithPurchaseEmail(user.email, user.name, itemTitle, txn.txnid, txn.amount, tempPassword);
    } else {
      await sendPurchaseEmail(user.email, user.name, itemTitle, txn.txnid, txn.amount);
    }
  } catch (emailErr) {
    console.error('Failed to send purchase/welcome email:', emailErr);
  }

  // Mark abandoned checkout as recovered
  try {
    const buyerEmail = (user.email || txn.buyerEmail || '').toLowerCase().trim();
    if (buyerEmail) {
      await AbandonedCheckout.updateMany(
        { buyerEmail, status: 'abandoned', ...(txn.itemId ? { courseId: txn.itemId } : {}) },
        { status: 'recovered', recoveredAt: new Date(), lastActiveAt: new Date() }
      );
    }
  } catch (acErr) {
    console.error('Failed to update abandoned checkout status to recovered:', acErr);
  }

  return { success: true, itemTitle, user, newlyCreated, tempPassword };
}

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

// @desc    Validate a coupon code
// @route   POST /api/payment/validate-coupon
// @access  Public / Optional Auth
router.post('/validate-coupon', optionalAuth, async (req, res) => {
  const { code, courseId } = req.body;
  if (!code) return res.status(400).json({ message: 'Coupon code is required.' });

  try {
    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), isActive: true });

    if (!coupon) return res.status(404).json({ message: 'Invalid or expired coupon code.' });

    // Check expiry
    if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
      return res.status(400).json({ message: 'This coupon has expired.' });
    }

    // Check usage limit
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'This coupon has reached its usage limit.' });
    }

    // Check single-use per user tracking (C2)
    const userUsageCount = req.user ? (coupon.usedByUsers || []).filter(u => u.toString() === req.user._id.toString()).length : 0;
    const maxPerUser = coupon.maxUsesPerUser || 1;
    if (userUsageCount >= maxPerUser) {
      return res.status(400).json({ message: `You have already redeemed this coupon code.` });
    }

    // Check if restricted to specific courses
    if (coupon.applicableCourses.length > 0 && courseId) {
      const isApplicable = coupon.applicableCourses.some(c => c.toString() === courseId);
      if (!isApplicable) return res.status(400).json({ message: 'This coupon is not valid for this course.' });
    }

    res.json({
      valid: true,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      message: `Coupon applied! ${coupon.discountType === 'percentage' ? coupon.discountValue + '% off' : '₹' + coupon.discountValue + ' off'}`,
    });
  } catch (error) {
    console.error('Coupon validation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Initiate a payment transaction (PayU)
// @route   POST /api/payment/pay
// @access  Public / Optional Auth
router.post('/pay', optionalAuth, async (req, res) => {
  const { itemId, itemType, couponCode, buyerName, buyerEmail, buyerAddress, buyerState, buyerGstin, phone } = req.body;

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

    // Resolve buyer info
    let resolvedUserId = req.user ? req.user._id : null;
    let resolvedEmail = req.user ? req.user.email : (buyerEmail || '').toLowerCase().trim();
    let resolvedName = req.user ? (buyerName || req.user.name) : (buyerName || '').trim();
    let resolvedPhone = req.user ? (phone || req.user.phone || '9999999999') : (phone || '9999999999');

    if (!req.user) {
      if (!resolvedEmail || !resolvedEmail.includes('@')) {
        return res.status(400).json({ message: 'A valid email address is required for checkout.' });
      }
      if (!resolvedName) {
        return res.status(400).json({ message: 'Your name is required for checkout.' });
      }

      const existingUser = await User.findOne({ email: resolvedEmail });
      if (existingUser) {
        resolvedUserId = existingUser._id;
        if (itemType === 'course') {
          const isAlreadyEnrolled = existingUser.enrolledCourses?.some(
            (c) => (c.courseId?._id || c.courseId)?.toString() === item._id.toString()
          );
          if (isAlreadyEnrolled) {
            return res.status(400).json({ message: 'An account with this email is already enrolled in this course. Please sign in to access it.' });
          }
        }
      }
    } else {
      // Check logged in user enrollment
      const user = await User.findById(req.user._id);
      if (itemType === 'course') {
        const isAlreadyEnrolled = user.enrolledCourses?.some(
          (c) => (c.courseId?._id || c.courseId)?.toString() === item._id.toString()
        );
        if (isAlreadyEnrolled) {
          return res.status(400).json({ message: 'You are already enrolled in this course.' });
        }
      }
    }

    // Use discountedPrice if available and lower than original price
    let price = (item.discountedPrice !== undefined && item.discountedPrice !== null && item.discountedPrice >= 0 && item.discountedPrice < item.price)
      ? item.discountedPrice
      : item.price;

    // Apply coupon discount server-side
    let appliedCoupon = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim(), isActive: true });
      if (coupon) {
        const isExpired = coupon.expiryDate && new Date() > new Date(coupon.expiryDate);
        const isLimitReached = coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit;
        const isApplicable = coupon.applicableCourses.length === 0 || coupon.applicableCourses.some(c => c.toString() === itemId);

        if (!isExpired && !isLimitReached && isApplicable) {
          if (coupon.discountType === 'percentage') {
            price = Math.round(price * (1 - coupon.discountValue / 100));
          } else {
            price = Math.max(0, price - coupon.discountValue);
          }
          appliedCoupon = coupon;
        }
      }
    }

    if (price === 0) {
      return res.status(400).json({ message: 'Item is free (after coupon). No payment required. Use /api/enroll/free' });
    }

    // Compute Indian GST Calculations
    const gstConfig = await getOrInitGstConfig();
    const rate = gstConfig.gstRate || 18;
    const posState = buyerState || gstConfig.sellerState || 'Kerala';
    const isIntraState = posState.trim().toLowerCase() === gstConfig.sellerState.trim().toLowerCase();

    // Course prices are inclusive of GST
    const baseAmount = Math.round((price / (1 + rate / 100)) * 100) / 100;
    const gstAmount = Math.round((price - baseAmount) * 100) / 100;

    let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
    if (isIntraState) {
      cgstAmount = Math.round((gstAmount / 2) * 100) / 100;
      sgstAmount = Math.round((gstAmount - cgstAmount) * 100) / 100;
    } else {
      igstAmount = gstAmount;
    }

    const isB2B = Boolean(buyerGstin && buyerGstin.trim().length > 5);
    const invoiceNo = `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // Generate unique txn ID
    const txnid = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Create a pending transaction
    await Transaction.create({
      txnid,
      invoiceNo,
      userId: resolvedUserId,
      itemType,
      itemId: item._id,
      amount: price,
      status: 'pending',
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      billingDetails: {
        buyerName: resolvedName,
        buyerEmail: resolvedEmail,
        buyerPhone: resolvedPhone,
        buyerAddress: buyerAddress || '',
        buyerState: posState,
        buyerGstin: buyerGstin ? buyerGstin.toUpperCase().trim() : '',
        isB2B
      },
      gstDetails: {
        rate,
        isInclusive: true,
        baseAmount,
        gstAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        isIntraState,
        hsnSacCode: gstConfig.hsnSacCode || '999249',
        posState
      }
    });

    // Increment coupon usage count
    if (appliedCoupon) {
      await Coupon.findByIdAndUpdate(appliedCoupon._id, { $inc: { usedCount: 1 } });
    }

    const key = process.env.PAYU_MERCHANT_KEY || 'mock_key';
    const salt = process.env.PAYU_MERCHANT_SALT || 'mock_salt';
    const actionUrl = key === 'mock_key'
      ? 'mock'
      : `${process.env.PAYU_BASE_URL || 'https://test.payu.in'}/_payment`;

    const productinfo = item.title;
    const firstname = resolvedName;
    const email = resolvedEmail;

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
      phone: resolvedPhone,
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

    if (process.env.NODE_ENV === 'production' && (!process.env.PAYU_MERCHANT_KEY || key === 'mock_key')) {
      console.error('Critical Security Error: Live PAYU_MERCHANT_KEY required in production.');
      return res.status(500).send('Payment gateway configuration error in production');
    }

    let isHashValid = false;
    if (key === 'mock_key') {
      // In non-production dev environments only
      isHashValid = process.env.NODE_ENV !== 'production';
    } else {
      isHashValid = verifyResponseHash(key, txnid, amount, productinfo, firstname, email, status, salt, hash);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (isHashValid && status === 'success') {
      const fulfillment = await fulfillPurchase(txn, req.body, 'payu');
      const user = fulfillment.user || (txn.userId ? await User.findById(txn.userId) : null);
      if (user) {
        const token = generateToken(user._id, user.tokenVersion || 0);
        setAuthCookie(res, token);
      }
      res.redirect(`${frontendUrl}/course/${txn.itemId}?payment=success&txnid=${txnid}`);
    } else {
      txn.status = 'failed';
      txn.payuResponse = req.body;
      await txn.save();
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
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Mock payment callbacks are forbidden in production environment.' });
  }

  const { txnid, status } = req.body;

  try {
    const txn = await Transaction.findOne({ txnid });
    if (!txn) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (status === 'success') {
      const fulfillment = await fulfillPurchase(txn, { mock: true, status }, 'payu');
      const user = fulfillment.user || (txn.userId ? await User.findById(txn.userId) : null);
      let token = null;
      if (user) {
        token = generateToken(user._id, user.tokenVersion || 0);
        setAuthCookie(res, token);
      }
      return res.json({
        success: true,
        message: 'Mock payment completed successfully',
        token,
        newlyCreated: Boolean(fulfillment.newlyCreated),
        redirectUrl: `/course/${txn.itemId}`
      });
    } else {
      txn.status = 'failed';
      await txn.save();
      return res.json({ success: false, message: 'Mock payment was cancelled or failed' });
    }
  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all transactions/invoices for logged in user with pagination and search
// @route   GET /api/payment/my-invoices
// @access  Private
router.get('/my-invoices', protect, async (req, res) => {
  try {
    const isPaginated = Boolean(req.query.page || req.query.limit || req.query.search || req.query.status);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    let query = { userId: req.user._id };

    const search = req.query.search;
    if (search && typeof search === 'string') {
      const safeSearch = search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (safeSearch) {
        query.$or = [
          { txnid: { $regex: safeSearch, $options: 'i' } },
          { invoiceNo: { $regex: safeSearch, $options: 'i' } },
          { itemType: { $regex: safeSearch, $options: 'i' } }
        ];
      }
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (isPaginated) {
      const total = await Transaction.countDocuments(query);
      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return res.json({
        success: true,
        transactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit) || 1,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      });
    }

    const transactions = await Transaction.find(query).sort({ createdAt: -1 });
    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Fetch my invoices error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get GST Invoice Details for a transaction
// @route   GET /api/payment/invoice/:txnid
// @access  Private
router.get('/invoice/:txnid', protect, async (req, res) => {
  try {
    const txn = await Transaction.findOne({ txnid: req.params.txnid }).populate('userId', 'name email');
    if (!txn) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check authorization: must be transaction owner or authorized .env admin
    if (txn.userId._id.toString() !== req.user._id.toString() && !isUserAdmin(req.user)) {
      return res.status(403).json({ message: 'Not authorized to view this invoice' });
    }

    let itemTitle = 'WIDETECHNOS Course Item';
    if (txn.itemType === 'course') {
      const c = await Course.findById(txn.itemId);
      if (c) itemTitle = c.title;
    } else if (txn.itemType === 'event') {
      const e = await Event.findById(txn.itemId);
      if (e) itemTitle = e.title;
    } else if (txn.itemTitle) {
      itemTitle = txn.itemTitle; // software plan / service package, as named at purchase time
    }

    const gstConfig = await getOrInitGstConfig();

    res.json({
      seller: gstConfig,
      invoiceNo: txn.invoiceNo || txn.txnid,
      creditNoteNo: txn.creditNoteNo || '',
      isRefunded: txn.status === 'refunded',
      refundDetails: txn.refundDetails || null,
      txnid: txn.txnid,
      date: txn.createdAt,
      itemTitle,
      itemType: txn.itemType,
      amount: txn.amount,
      listPrice: txn.listPrice,
      status: txn.status,
      billingDetails: txn.billingDetails || {
        buyerName: req.user.name,
        buyerEmail: req.user.email,
        buyerState: gstConfig.sellerState,
        buyerGstin: '',
        isB2B: false
      },
      gstDetails: txn.gstDetails || {
        rate: gstConfig.gstRate || 18,
        isInclusive: true,
        baseAmount: Math.round((txn.amount / 1.18) * 100) / 100,
        gstAmount: Math.round((txn.amount - (txn.amount / 1.18)) * 100) / 100,
        cgstAmount: Math.round(((txn.amount - (txn.amount / 1.18)) / 2) * 100) / 100,
        sgstAmount: Math.round(((txn.amount - (txn.amount / 1.18)) / 2) * 100) / 100,
        igstAmount: 0,
        isIntraState: true,
        hsnSacCode: gstConfig.hsnSacCode || '999249',
        posState: gstConfig.sellerState
      }
    });
  } catch (error) {
    console.error('Fetch invoice error:', error);
    res.status(500).json({ message: 'Server error fetching invoice' });
  }
});

// @desc    Initiate a Razorpay Order
// @route   POST /api/payment/razorpay/create-order
// @access  Public / Optional Auth
router.post('/razorpay/create-order', optionalAuth, async (req, res) => {
  const { itemId, itemType, couponCode, buyerName, buyerEmail, buyerAddress, buyerState, buyerGstin, phone } = req.body;

  // Software plans and service packages: separate, stricter path (courses/events unchanged below)
  if (itemType === 'software' || itemType === 'service') {
    return createProductOrder(req, res);
  }

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

    // Resolve buyer info
    let resolvedUserId = req.user ? req.user._id : null;
    let resolvedEmail = req.user ? req.user.email : (buyerEmail || '').toLowerCase().trim();
    let resolvedName = req.user ? (buyerName || req.user.name) : (buyerName || '').trim();
    let resolvedPhone = req.user ? (phone || req.user.phone || '9999999999') : (phone || '9999999999');

    if (!req.user) {
      if (!resolvedEmail || !resolvedEmail.includes('@')) {
        return res.status(400).json({ message: 'A valid email address is required for checkout.' });
      }
      if (!resolvedName) {
        return res.status(400).json({ message: 'Your name is required for checkout.' });
      }

      const existingUser = await User.findOne({ email: resolvedEmail });
      if (existingUser) {
        resolvedUserId = existingUser._id;
        if (itemType === 'course') {
          const isAlreadyEnrolled = existingUser.enrolledCourses?.some(
            (c) => (c.courseId?._id || c.courseId)?.toString() === item._id.toString()
          );
          if (isAlreadyEnrolled) {
            return res.status(400).json({ message: 'An account with this email is already enrolled in this course. Please sign in to access it.' });
          }
        }
      }
    } else {
      // Check logged-in user enrollment
      const user = await User.findById(req.user._id);
      if (itemType === 'course') {
        const isAlreadyEnrolled = user.enrolledCourses?.some(
          (c) => (c.courseId?._id || c.courseId)?.toString() === item._id.toString()
        );
        if (isAlreadyEnrolled) {
          return res.status(400).json({ message: 'You are already enrolled in this course.' });
        }
      }
    }

    // Determine price
    let price = (item.discountedPrice !== undefined && item.discountedPrice !== null && item.discountedPrice >= 0 && item.discountedPrice < item.price)
      ? item.discountedPrice
      : item.price;

    // Apply coupon discount server-side
    let appliedCoupon = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim(), isActive: true });
      if (coupon) {
        const isExpired = coupon.expiryDate && new Date() > new Date(coupon.expiryDate);
        const isLimitReached = coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit;
        const isApplicable = coupon.applicableCourses.length === 0 || coupon.applicableCourses.some(c => c.toString() === itemId);

        if (!isExpired && !isLimitReached && isApplicable) {
          if (coupon.discountType === 'percentage') {
            price = Math.round(price * (1 - coupon.discountValue / 100));
          } else {
            price = Math.max(0, price - coupon.discountValue);
          }
          appliedCoupon = coupon;
        }
      }
    }

    if (price <= 0) {
      return res.status(400).json({ message: 'Item is free. No payment required.' });
    }

    // Indian GST Breakdown (shared helper; identical numbers to before for GST-inclusive items).
    // A course may override the store-wide rate / mark its price as GST-exclusive in admin.
    const gstConfig = await getOrInitGstConfig();
    const tax = taxSettingsFor([item], gstConfig);
    const rate = tax.rate;
    const posState = buyerState || gstConfig.sellerState || 'Kerala';
    const listPrice = price;
    const gst = computeGst({ price, rate, inclusive: tax.inclusive, buyerState: posState, sellerState: gstConfig.sellerState });
    const { isIntraState, baseAmount, gstAmount, cgstAmount, sgstAmount, igstAmount } = gst;
    price = gst.total; // amount actually charged (equals the list price when GST-inclusive)

    const isB2B = Boolean(buyerGstin && buyerGstin.trim().length > 5);
    const invoiceNo = isSequentialSeries() ? undefined : await nextInvoiceNo();
    const txnid = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_placeholder';
    const isMock = key_id === 'rzp_test_placeholder' || key_id.startsWith('mock');

    if (process.env.NODE_ENV === 'production' && isMock) {
      return res.status(500).json({ 
        message: 'Production configuration error: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured with live credentials in production environment.' 
      });
    }

    let razorpayOrderId = `order_mock_${txnid}`;

    if (!isMock) {
      const razorpay = new Razorpay({ key_id, key_secret });
      const order = await razorpay.orders.create({
        amount: Math.round(price * 100), // paise
        currency: 'INR',
        receipt: txnid,
        notes: {
          txnid,
          itemId: item._id.toString(),
          itemType,
          userId: resolvedUserId ? resolvedUserId.toString() : '',
          buyerEmail: resolvedEmail
        }
      });
      razorpayOrderId = order.id;
    }

    // Create pending transaction in MongoDB
    await Transaction.create({
      txnid,
      invoiceNo,
      userId: resolvedUserId,
      itemType,
      itemId: item._id,
      amount: price,
      ...(tax.inclusive ? {} : { listPrice }),
      status: 'pending',
      gateway: 'razorpay',
      razorpayOrderId,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      billingDetails: {
        buyerName: resolvedName,
        buyerEmail: resolvedEmail,
        buyerPhone: resolvedPhone,
        buyerAddress: buyerAddress || '',
        buyerState: posState,
        buyerGstin: buyerGstin ? buyerGstin.toUpperCase().trim() : '',
        isB2B
      },
      gstDetails: {
        rate,
        isInclusive: tax.inclusive,
        baseAmount,
        gstAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        isIntraState,
        hsnSacCode: tax.hsnSacCode || '999249',
        posState
      }
    });

    if (appliedCoupon) {
      await Coupon.findByIdAndUpdate(appliedCoupon._id, { $inc: { usedCount: 1 } });
    }

    res.json({
      success: true,
      isMock,
      keyId: key_id,
      orderId: razorpayOrderId,
      amount: Math.round(price * 100), // in paise
      currency: 'INR',
      txnid,
      itemTitle: item.title,
      itemDescription: item.description?.substring(0, 100) || 'Course Enrollment',
      prefill: {
        name: resolvedName,
        email: resolvedEmail,
        contact: resolvedPhone
      }
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ message: 'Failed to create Razorpay order', error: error.message });
  }
});

// @desc    Verify Razorpay Payment Signature
// @route   POST /api/payment/razorpay/verify
// @access  Public / Optional Auth
router.post('/razorpay/verify', optionalAuth, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, txnid } = req.body;

  try {
    let txn = null;
    if (txnid) {
      txn = await Transaction.findOne({ txnid });
    }
    if (!txn && razorpay_order_id) {
      txn = await Transaction.findOne({ razorpayOrderId: razorpay_order_id });
    }

    if (!txn) {
      return res.status(404).json({ success: false, message: 'Transaction record not found' });
    }

    // Ownership validation: If user is logged in and txn had an assigned user, verify match
    if (req.user && txn.userId) {
      if (txn.userId.toString() !== req.user._id.toString() && !isUserAdmin(req.user)) {
        return res.status(403).json({ success: false, message: 'Not authorized to verify this transaction.' });
      }
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_placeholder';
    const isMock = (process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder') === 'rzp_test_placeholder' || txn.razorpayOrderId.startsWith('order_mock_');

    // Proof of payment for THIS transaction: Razorpay's signature over this transaction's own
    // order id. (Checking the order id stops a signature from a different, cheaper order being
    // replayed against this transaction.)
    const signatureValid = () => {
      if (!razorpay_order_id || razorpay_order_id !== txn.razorpayOrderId) return false;
      const expected = crypto
        .createHmac('sha256', key_secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      return typeof razorpay_signature === 'string' && expected === razorpay_signature;
    };

    // Idempotency: if already completed, return immediately with session token.
    // A login token / licence key is only handed out again with valid proof of payment.
    if (txn.status === 'success') {
      if (process.env.NODE_ENV === 'production' && isMock) {
        return res.status(400).json({ success: false, message: 'Security error: Mock payments cannot be verified in production environment.' });
      }
      if (!isMock && !signatureValid()) {
        return res.status(400).json({ success: false, message: 'Payment verification failed: Signature mismatch.' });
      }
      const user = txn.userId ? await User.findById(txn.userId) : null;
      let token = null;
      if (user) {
        token = generateToken(user._id, user.tokenVersion || 0);
        setAuthCookie(res, token);
      }
      return res.json({
        success: true,
        message: 'Payment already completed',
        txnid: txn.txnid,
        invoiceNo: txn.invoiceNo,
        token,
        ...((txn.itemType === 'software' || txn.itemType === 'service') ? productResult(await existingFulfilment(txn)) : {}),
        user: user ? { _id: user._id, name: user.name, email: user.email, role: user.role } : null
      });
    }

    if (process.env.NODE_ENV === 'production' && isMock) {
      return res.status(400).json({ 
        success: false, 
        message: 'Security error: Mock payments cannot be verified in production environment.' 
      });
    }

    if (!isMock) {
      // Cryptographic signature check: HMAC-SHA256(order_id + "|" + payment_id, secret),
      // and the signed order id must be this transaction's own Razorpay order.
      if (!signatureValid()) {
        txn.status = 'failed';
        txn.razorpayResponse = req.body;
        await txn.save();
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed: Signature mismatch. Potential tampering detected.'
        });
      }
    }

    // Fulfill the purchase securely (auto-creates account if guest)
    const fulfillment = await fulfillPurchase(txn, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      verifiedAt: new Date()
    }, 'razorpay');

    const user = fulfillment.user || (txn.userId ? await User.findById(txn.userId) : null);
    let token = null;
    if (user) {
      token = generateToken(user._id, user.tokenVersion || 0);
      setAuthCookie(res, token);
    }

    res.json({
      success: true,
      message: txn.itemType === 'software'
        ? 'Payment verified! Your licence key is ready.'
        : txn.itemType === 'service'
        ? "Payment verified! Your order is confirmed and we'll contact you to schedule it."
        : fulfillment.newlyCreated 
        ? 'Payment verified! An account has been created for your email and your course is unlocked.'
        : 'Payment verified and enrollment confirmed!',
      txnid: txn.txnid,
      invoiceNo: txn.invoiceNo,
      token,
      newlyCreated: Boolean(fulfillment.newlyCreated),
      ...(fulfillment.product ? productResult(fulfillment.product) : (fulfillment.alreadyFulfilled && (txn.itemType === 'software' || txn.itemType === 'service') ? productResult(await existingFulfilment(txn)) : {})),
      user: user ? {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      } : null
    });
  } catch (error) {
    console.error('Razorpay verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during payment verification' });
  }
});

// @desc    Razorpay Server-to-Server Webhook
// @route   POST /api/payment/razorpay/webhook
// @access  Public
router.post('/razorpay/webhook', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // 1. Strictly require signature header - reject unsigned requests immediately
    if (!signature) {
      return res.status(400).json({ status: 'missing_signature', message: 'x-razorpay-signature header is required.' });
    }

    if (!webhookSecret) {
      return res.status(500).json({ status: 'server_configuration_error', message: 'Webhook secret is not configured.' });
    }

    // 2. Validate cryptographic signature
    const rawPayload = req.rawBody ? req.rawBody : JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawPayload)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ status: 'invalid_signature', message: 'Cryptographic signature mismatch.' });
    }

    const { event, payload } = req.body;

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const txn = await Transaction.findOne({ razorpayOrderId: orderId });
        if (txn && txn.status !== 'success') {
          await fulfillPurchase(txn, {
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            webhookEvent: event
          }, 'razorpay');
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ status: 'error' });
  }
});

/**
 * Razorpay order for a software plan or a service package.
 * - Price, GST rate and inclusive/exclusive come only from the database.
 * - Coupons are not accepted for these items.
 * - Same mock / production protections as course orders.
 */
async function createProductOrder(req, res) {
  const { itemId, itemType, variantId, renewLicenseId, buyerName, buyerEmail, buyerAddress, buyerState, buyerGstin, phone } = req.body;
  try {
    const gstConfig = await getOrInitGstConfig();
    const order = await resolveProductOrder({ itemType, itemId, variantId, renewLicenseId, user: req.user || null, gstConfig });

    const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const resolvedUserId = req.user ? req.user._id : null;
    const resolvedEmail = req.user ? req.user.email : str(buyerEmail, 200).toLowerCase();
    const resolvedName = str(buyerName, 120) || (req.user ? req.user.name : '');
    const resolvedPhone = str(phone, 20) || (req.user && req.user.phone) || '9999999999';
    if (!resolvedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedEmail)) {
      return res.status(400).json({ message: 'A valid email address is required for checkout.' });
    }
    if (!resolvedName) return res.status(400).json({ message: 'Your name is required for checkout.' });

    const gstin = str(buyerGstin, 20).toUpperCase();
    if (gstin && !isValidGstin(gstin)) {
      return res.status(400).json({ message: 'That GSTIN does not look valid. Please check it, or leave it empty.' });
    }
    const posState = str(buyerState, 60) || gstConfig.sellerState || 'Kerala';
    const gst = computeGst({ price: order.listPrice, rate: order.tax.rate, inclusive: order.tax.inclusive, buyerState: posState, sellerState: gstConfig.sellerState });
    const amount = gst.total;
    if (!(amount > 0)) return res.status(400).json({ message: 'Invalid price.' });

    let userId = resolvedUserId;
    if (!userId) {
      const existing = await User.findOne({ email: resolvedEmail }).select('_id');
      if (existing) userId = existing._id;
    }

    const invoiceNo = isSequentialSeries() ? undefined : await nextInvoiceNo();
    const txnid = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_placeholder';
    const isMock = key_id === 'rzp_test_placeholder' || key_id.startsWith('mock');
    if (process.env.NODE_ENV === 'production' && isMock) {
      return res.status(500).json({ message: 'Production configuration error: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured with live credentials in production environment.' });
    }

    let razorpayOrderId = `order_mock_${txnid}`;
    if (!isMock) {
      const razorpay = new Razorpay({ key_id, key_secret });
      const rzpOrder = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: txnid,
        notes: { txnid, itemId: order.item._id.toString(), itemType, variantId: String(order.variant?._id || 'main'), userId: userId ? userId.toString() : '', buyerEmail: resolvedEmail },
      });
      razorpayOrderId = rzpOrder.id;
    }

    await Transaction.create({
      txnid,
      invoiceNo,
      userId,
      itemType,
      itemId: order.item._id,
      variantId: order.variant?._id,
      variantName: order.snapshot.name,
      variantSnapshot: order.snapshot,
      itemTitle: order.itemTitle,
      renewLicenseId: order.renewLicense?._id,
      listPrice: order.listPrice,
      amount,
      status: 'pending',
      gateway: 'razorpay',
      razorpayOrderId,
      billingDetails: {
        buyerName: resolvedName,
        buyerEmail: resolvedEmail,
        buyerPhone: resolvedPhone,
        buyerAddress: str(buyerAddress, 300),
        buyerState: posState,
        buyerGstin: gstin,
        isB2B: Boolean(gstin),
      },
      gstDetails: {
        rate: gst.rate,
        isInclusive: gst.isInclusive,
        baseAmount: gst.baseAmount,
        gstAmount: gst.gstAmount,
        cgstAmount: gst.cgstAmount,
        sgstAmount: gst.sgstAmount,
        igstAmount: gst.igstAmount,
        isIntraState: gst.isIntraState,
        hsnSacCode: order.hsn, // TODO(owner): blank until you set the HSN/SAC in admin (confirm with your CA)
        posState,
      },
    });

    res.json({
      success: true,
      isMock,
      keyId: key_id,
      orderId: razorpayOrderId,
      amount: Math.round(amount * 100),
      currency: 'INR',
      txnid,
      itemTitle: order.itemTitle,
      itemDescription: order.description,
      gst: { rate: gst.rate, isInclusive: gst.isInclusive, baseAmount: gst.baseAmount, gstAmount: gst.gstAmount, cgstAmount: gst.cgstAmount, sgstAmount: gst.sgstAmount, igstAmount: gst.igstAmount, isIntraState: gst.isIntraState, total: amount },
      prefill: { name: resolvedName, email: resolvedEmail, contact: resolvedPhone },
    });
  } catch (error) {
    if (error instanceof OrderError) return res.status(error.status).json({ message: error.message });
    console.error('Product order creation error:', error.message);
    res.status(500).json({ message: 'Failed to create order' });
  }
}

export default router;
