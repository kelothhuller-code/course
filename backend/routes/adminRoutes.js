import express from 'express';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Course from '../models/Course.js';
import Certificate from '../models/Certificate.js';
import Comment from '../models/Comment.js';
import ReferralLog from '../models/ReferralLog.js';
import { protect, admin } from '../middleware/auth.js';
import { sendCustomEmail, verifySmtpConnection } from '../utils/mailer.js';
import Razorpay from 'razorpay';
import Coupon from '../models/Coupon.js';

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

// @desc    Process refund and generate GST Credit Note (GSTR-1 Sec 9B)
// @route   POST /api/admin/transactions/:id/refund
// @access  Private/Admin
router.post('/transactions/:id/refund', async (req, res) => {
  const { reason, refundAmount } = req.body;
  const txnId = req.params.id;

  try {
    const txn = await Transaction.findById(txnId).populate('userId', 'name email');
    if (!txn) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (txn.status !== 'success') {
      return res.status(400).json({ message: `Cannot refund transaction with status '${txn.status}'` });
    }

    const amountToRefund = (refundAmount !== undefined && refundAmount !== null && Number(refundAmount) > 0)
      ? Number(refundAmount)
      : txn.amount;

    if (amountToRefund > txn.amount) {
      return res.status(400).json({ message: 'Refund amount cannot exceed original transaction amount' });
    }

    // Generate formal sequential GST Credit Note Number (GSTR-1 Section 9B)
    const yearMonth = new Date().toISOString().slice(2, 7).replace('-', '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const creditNoteNo = `CN-${yearMonth}-${randomSuffix}`;

    // Calculate GST Reversal Breakdown
    const gstRate = txn.gstDetails?.rate || 18;
    const pos = txn.billingDetails?.buyerState || txn.gstDetails?.posState || 'Kerala';
    const isIntraState = txn.gstDetails?.isIntraState !== undefined
      ? txn.gstDetails.isIntraState
      : (pos.trim().toLowerCase() === 'kerala');
    const refundBaseAmount = Math.round((amountToRefund / (1 + gstRate / 100)) * 100) / 100;
    const refundGstAmount = Math.round((amountToRefund - refundBaseAmount) * 100) / 100;

    let refundCgstAmount = 0, refundSgstAmount = 0, refundIgstAmount = 0;
    if (isIntraState) {
      refundCgstAmount = Math.round((refundGstAmount / 2) * 100) / 100;
      refundSgstAmount = Math.round((refundGstAmount - refundCgstAmount) * 100) / 100;
    } else {
      refundIgstAmount = refundGstAmount;
    }

    // Process Gateway Refund if using Razorpay
    let gatewayRefundId = `rfnd_manual_${Date.now()}`;
    const key_id = process.env.RAZORPAY_KEY_ID || '';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || '';
    const isRzpLive = key_id && !key_id.includes('placeholder') && !key_id.startsWith('mock');

    if (isRzpLive && txn.razorpayPaymentId) {
      try {
        const razorpay = new Razorpay({ key_id, key_secret });
        const rzpRefund = await razorpay.payments.refund(txn.razorpayPaymentId, {
          amount: Math.round(amountToRefund * 100),
          notes: {
            creditNoteNo,
            reason: reason || 'Course refund',
            txnid: txn.txnid
          }
        });
        gatewayRefundId = rzpRefund.id;
      } catch (rzpErr) {
        console.error('Razorpay gateway refund error:', rzpErr);
        return res.status(500).json({
          message: 'Razorpay refund failed: ' + (rzpErr.error?.description || rzpErr.message),
          error: rzpErr
        });
      }
    }

    // Update Transaction to refunded
    txn.status = 'refunded';
    txn.creditNoteNo = creditNoteNo;
    txn.refundDetails = {
      refundId: gatewayRefundId,
      refundAmount: amountToRefund,
      refundDate: new Date(),
      refundReason: reason || 'Requested by student / admin cancellation',
      refundBaseAmount,
      refundGstAmount,
      refundCgstAmount,
      refundSgstAmount,
      refundIgstAmount
    };
    await txn.save();

    // Revoke course enrollment for the user
    if (txn.userId) {
      const student = await User.findById(txn.userId._id || txn.userId);
      if (student) {
        if (txn.itemType === 'course') {
          student.enrolledCourses = (student.enrolledCourses || []).filter(
            c => (c.courseId?._id || c.courseId)?.toString() !== txn.itemId.toString()
          );
        } else if (txn.itemType === 'event') {
          student.enrolledEvents = (student.enrolledEvents || []).filter(
            e => (e.eventId?._id || e.eventId)?.toString() !== txn.itemId.toString()
          );
        }
        await student.save();

        // Send formal refund & GST credit note email
        try {
          await sendCustomEmail({
            to: student.email,
            subject: `Refund Processed & GST Credit Note: ${creditNoteNo}`,
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:28px;border:1px solid #e2e8f0;border-radius:14px;background:#ffffff;">
                <h2 style="color:#ef4444;margin-top:0;">Refund Processed</h2>
                <p>Hello ${student.name},</p>
                <p>Your refund of <strong>₹${amountToRefund}</strong> has been processed successfully. In accordance with Indian GST regulations, an official <strong>GST Credit Note</strong> has been issued for this reversal.</p>
                
                <div style="background:#f8fafc;padding:16px;border-radius:10px;margin:20px 0;border:1px solid #e2e8f0;font-size:0.9rem;">
                  <h4 style="margin:0 0 10px 0;color:#0f172a;">Credit Note Details (GSTR-1 Sec 9B):</h4>
                  <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
                    <tr><td style="color:#64748b;padding:4px 0;">Credit Note No:</td><td style="text-align:right;font-weight:bold;font-family:monospace;color:#ef4444;">${creditNoteNo}</td></tr>
                    <tr><td style="color:#64748b;padding:4px 0;">Original Invoice:</td><td style="text-align:right;font-family:monospace;">${txn.invoiceNo || txn.txnid}</td></tr>
                    <tr><td style="color:#64748b;padding:4px 0;">Refund Amount:</td><td style="text-align:right;font-weight:bold;color:#ef4444;">₹${amountToRefund}</td></tr>
                    <tr><td style="color:#64748b;padding:4px 0;">Taxable Base Reversed:</td><td style="text-align:right;">₹${refundBaseAmount}</td></tr>
                    <tr><td style="color:#64748b;padding:4px 0;">GST Reversed (18%):</td><td style="text-align:right;">₹${refundGstAmount}</td></tr>
                  </table>
                </div>

                <p style="color:#64748b;font-size:13px;line-height:1.6;">
                  The refund will reflect back in your original payment method (bank account / UPI / card) within 5 to 7 business days.
                </p>
              </div>
            `
          });
        } catch (mailErr) {
          console.error('Failed to dispatch refund email:', mailErr);
        }
      }
    }

    res.json({
      success: true,
      message: `Refund of ₹${amountToRefund} processed successfully. Credit Note ${creditNoteNo} issued.`,
      creditNoteNo,
      transaction: txn
    });
  } catch (error) {
    console.error('Refund processing error:', error);
    res.status(500).json({ message: 'Server error processing refund', error: error.message });
  }
});

// @desc    Get dashboard metrics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    
    // Calculate total payments received from successful transactions
    const successfulTxns = await Transaction.find({ status: 'success' }).sort({ createdAt: -1 });
    const refundedTxns = await Transaction.find({ status: 'refunded' });
    const totalPayments = successfulTxns.reduce((acc, txn) => acc + txn.amount, 0);
    const totalRefunded = refundedTxns.reduce((acc, txn) => acc + (txn.refundDetails?.refundAmount || txn.amount), 0);

    const totalCourses = await Course.countDocuments({});
    const freeCourses = await Course.countDocuments({ isFree: true });
    
    // Count enrolled users across all courses
    const usersWithEnrollments = await User.find({ 'enrolledCourses.0': { $exists: true } });
    const totalEnrollments = usersWithEnrollments.reduce((acc, user) => acc + user.enrolledCourses.length, 0);

    // Compute last 7 days revenue and signups trend
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      last7Days.push({
        date: dayStr,
        day: dayLabel,
        revenue: 0,
        orders: 0,
        signups: 0
      });
    }

    // Populate daily revenue from successful transactions
    successfulTxns.forEach(txn => {
      const txnDate = new Date(txn.createdAt).toISOString().split('T')[0];
      const match = last7Days.find(d => d.date === txnDate);
      if (match) {
        match.revenue += txn.amount;
        match.orders += 1;
      }
    });

    // Populate daily signups
    const recentUsers = await User.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).select('createdAt');
    recentUsers.forEach(u => {
      const uDate = new Date(u.createdAt).toISOString().split('T')[0];
      const match = last7Days.find(d => d.date === uDate);
      if (match) {
        match.signups += 1;
      }
    });

    // Calculate top enrolled courses
    const courseStatsMap = {};
    usersWithEnrollments.forEach(u => {
      u.enrolledCourses.forEach(ec => {
        const cId = ec.courseId?.toString();
        if (cId) {
          courseStatsMap[cId] = (courseStatsMap[cId] || 0) + 1;
        }
      });
    });

    const coursesList = await Course.find({}).select('title price category isFree');
    const topCourses = coursesList.map(c => ({
      id: c._id,
      title: c.title,
      category: c.category,
      price: c.price,
      isFree: c.isFree,
      enrollments: courseStatsMap[c._id.toString()] || 0
    })).sort((a, b) => b.enrollments - a.enrollments).slice(0, 5);

    res.json({
      totalUsers,
      totalPayments,
      totalRefunded,
      netRevenue: totalPayments - totalRefunded,
      totalCourses,
      freeCourses,
      paidCourses: totalCourses - freeCourses,
      totalEnrollments,
      totalRefundsCount: refundedTxns.length,
      dailyTrend: last7Days,
      topCourses
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

// @desc    Send custom email to a user or broadcast to all students
// @route   POST /api/admin/send-email
// @access  Private/Admin
router.post('/send-email', async (req, res) => {
  const { recipientEmail, subject, message, isBroadcast } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ message: 'Subject and message are required' });
  }

  try {
    if (isBroadcast) {
      const users = await User.find({}).select('email name');
      let sentCount = 0;
      let failedCount = 0;

      for (const u of users) {
        if (!u.email) continue;
        try {
          await sendCustomEmail({
            to: u.email,
            subject,
            text: message,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
                <h2 style="color:#4f46e5;margin-top:0;">WIDETECHNOS Academy</h2>
                <p>Hello ${u.name || 'Student'},</p>
                <div style="font-size:15px;line-height:1.6;color:#334155;margin:16px 0;">
                  ${message.replace(/\n/g, '<br>')}
                </div>
                <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;" />
                <p style="font-size:12px;color:#94a3b8;margin:0;">
                  Sent from WIDETECHNOS Academy Admin Portal. If you have questions, reply directly to this email or visit <a href="${process.env.FRONTEND_URL || 'https://widetech.in'}">widetech.in</a>.
                </p>
              </div>
            `
          });
          sentCount++;
        } catch (err) {
          failedCount++;
        }
      }

      return res.json({
        success: true,
        message: `Broadcast complete: sent to ${sentCount} user(s)${failedCount > 0 ? `, failed: ${failedCount}` : ''}`
      });
    }

    if (!recipientEmail) {
      return res.status(400).json({ message: 'Recipient email is required' });
    }

    const info = await sendCustomEmail({
      to: recipientEmail,
      subject,
      text: message,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
          <h2 style="color:#4f46e5;margin-top:0;">WIDETECHNOS Academy</h2>
          <div style="font-size:15px;line-height:1.6;color:#334155;margin:16px 0;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;" />
          <p style="font-size:12px;color:#94a3b8;margin:0;">
            Sent from WIDETECHNOS Academy Support. Visit <a href="${process.env.FRONTEND_URL || 'https://widetech.in'}">widetech.in</a>.
          </p>
        </div>
      `
    });

    res.json({
      success: true,
      message: `Email successfully sent to ${recipientEmail}`,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Admin send email error:', error);
    res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
});

// @desc    Test SMTP connection and send a test verification email
// @route   POST /api/admin/test-smtp
// @access  Private/Admin
router.post('/test-smtp', async (req, res) => {
  const { testEmail } = req.body;
  if (!testEmail) {
    return res.status(400).json({ message: 'Test email address is required' });
  }

  try {
    const smtpCheck = await verifySmtpConnection();
    if (!smtpCheck.success) {
      return res.status(500).json({
        success: false,
        message: 'SMTP authentication failed. Check your SMTP_USER and SMTP_PASS in .env',
        error: smtpCheck.error
      });
    }

    const info = await sendCustomEmail({
      to: testEmail,
      subject: '✅ SMTP Test: WIDETECHNOS Academy Mailer is Working!',
      text: 'Congratulations! Your SMTP configuration is working properly.',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
          <h2 style="color:#10b981;margin-top:0;">🎉 SMTP Connection Successful!</h2>
          <p>This is a test email sent from your <strong>WIDETECHNOS Academy</strong> backend.</p>
          <div style="background:#f8fafc;padding:12px 16px;border-radius:8px;font-family:monospace;font-size:13px;margin:16px 0;">
            SMTP Host: ${process.env.SMTP_HOST || 'default'}<br />
            SMTP Port: ${process.env.SMTP_PORT || '587'}<br />
            From: ${process.env.SMTP_FROM || 'noreply'}<br />
            Dispatched at: ${new Date().toISOString()}
          </div>
          <p style="color:#64748b;font-size:13px;margin:0;">
            Your automated emails (course purchase invoices, registration emails, and student announcements) are ready to go!
          </p>
        </div>
      `
    });

    res.json({
      success: true,
      message: `Test email successfully dispatched to ${testEmail}!`,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('SMTP test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

// ── Admin Coupon CRUD API (C1) ──

// @desc    Get all coupons with analytics
// @route   GET /api/admin/coupons
// @access  Private/Admin
router.get('/coupons', async (req, res) => {
  try {
    const coupons = await Coupon.find({})
      .populate('applicableCourses', 'title price')
      .sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    console.error('Fetch coupons error:', error);
    res.status(500).json({ message: 'Failed to fetch coupons', error: error.message });
  }
});

// @desc    Create new coupon
// @route   POST /api/admin/coupons
// @access  Private/Admin
router.post('/coupons', async (req, res) => {
  const {
    code,
    discountType,
    discountValue,
    applicableCourses,
    expiryDate,
    usageLimit,
    maxUsesPerUser,
    isActive
  } = req.body;

  if (!code || !discountType || discountValue === undefined) {
    return res.status(400).json({ message: 'Code, discountType, and discountValue are required' });
  }

  try {
    const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ message: `Coupon with code '${code.toUpperCase().trim()}' already exists` });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      discountType,
      discountValue: Number(discountValue),
      applicableCourses: applicableCourses || [],
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      usageLimit: usageLimit !== undefined && usageLimit !== null ? Number(usageLimit) : null,
      maxUsesPerUser: maxUsesPerUser !== undefined && maxUsesPerUser !== null ? Number(maxUsesPerUser) : 1,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    res.status(201).json({
      success: true,
      message: `Coupon '${coupon.code}' created successfully!`,
      coupon
    });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ message: 'Failed to create coupon', error: error.message });
  }
});

// @desc    Update an existing coupon
// @route   PUT /api/admin/coupons/:id
// @access  Private/Admin
router.put('/coupons/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    const {
      code,
      discountType,
      discountValue,
      applicableCourses,
      expiryDate,
      usageLimit,
      maxUsesPerUser,
      isActive
    } = req.body;

    if (code) coupon.code = code.toUpperCase().trim();
    if (discountType) coupon.discountType = discountType;
    if (discountValue !== undefined) coupon.discountValue = Number(discountValue);
    if (applicableCourses !== undefined) coupon.applicableCourses = applicableCourses;
    if (expiryDate !== undefined) coupon.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit !== null ? Number(usageLimit) : null;
    if (maxUsesPerUser !== undefined) coupon.maxUsesPerUser = Number(maxUsesPerUser);
    if (isActive !== undefined) coupon.isActive = Boolean(isActive);

    await coupon.save();

    res.json({
      success: true,
      message: `Coupon '${coupon.code}' updated successfully!`,
      coupon
    });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ message: 'Failed to update coupon', error: error.message });
  }
});

// @desc    Delete coupon
// @route   DELETE /api/admin/coupons/:id
// @access  Private/Admin
router.delete('/coupons/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.json({ success: true, message: `Coupon '${coupon.code}' deleted successfully` });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ message: 'Failed to delete coupon', error: error.message });
  }
});

export default router;
