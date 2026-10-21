import express from 'express';
import mongoose from 'mongoose';
import PageView from '../models/PageView.js';
import AbandonedCheckout from '../models/AbandonedCheckout.js';
import Transaction from '../models/Transaction.js';
import Course from '../models/Course.js';
import { protect, admin, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Helper to sanitize IP
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '';
};

// -------------------------------------------------------------
// Public Tracking Endpoints (Asynchronous / Non-blocking)
// -------------------------------------------------------------

/**
 * POST /api/analytics/track-view
 * Lightweight public endpoint to record page views
 */
router.post('/track-view', optionalAuth, async (req, res) => {
  try {
    const { path, pageTitle, referrer, sessionId, courseId, device } = req.body;

    if (!path || !sessionId) {
      return res.status(200).json({ success: false, reason: 'missing_path_or_session' });
    }

    // Skip admin panel views to keep public metrics clean
    if (path.includes('admin') || path.includes('/wide-admin-portal')) {
      return res.status(200).json({ success: true, skipped: true });
    }

    let parsedCourseId = null;
    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      parsedCourseId = courseId;
    }

    // Record view asynchronously
    PageView.create({
      path: path.slice(0, 500),
      pageTitle: (pageTitle || '').slice(0, 300),
      referrer: (referrer || '').slice(0, 500),
      sessionId: sessionId.slice(0, 100),
      userId: req.user?._id || null,
      courseId: parsedCourseId,
      device: ['mobile', 'tablet', 'desktop'].includes(device) ? device : 'unknown',
      ip: getClientIp(req).slice(0, 45),
      userAgent: (req.headers['user-agent'] || '').slice(0, 300),
      createdAt: new Date()
    }).catch(err => {
      console.error('PageView logging error (swallowed):', err.message);
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking view:', error);
    return res.status(200).json({ success: false }); // Always 200 so it never breaks frontend
  }
});

/**
 * POST /api/analytics/track-checkout-step
 * Records or updates abandoned checkout leads as users fill in the checkout form
 */
router.post('/track-checkout-step', optionalAuth, async (req, res) => {
  try {
    const {
      sessionId,
      courseId,
      courseTitle,
      amount,
      buyerName,
      buyerEmail,
      buyerPhone,
      buyerState,
      step
    } = req.body;

    if (!sessionId) {
      return res.status(200).json({ success: false, reason: 'missing_session_id' });
    }

    const cleanEmail = (buyerEmail || '').trim().toLowerCase();
    const cleanPhone = (buyerPhone || '').trim();
    const cleanName = (buyerName || '').trim();
    const cleanState = (buyerState || '').trim();
    const validStep = ['entered_checkout', 'filled_contact', 'initiated_payment', 'payment_failed'].includes(step)
      ? step
      : 'entered_checkout';

    let parsedCourseId = null;
    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      parsedCourseId = courseId;
    }

    // Find existing lead by (email + courseId) OR (sessionId + courseId)
    let lead = null;
    if (cleanEmail && parsedCourseId) {
      lead = await AbandonedCheckout.findOne({ buyerEmail: cleanEmail, courseId: parsedCourseId });
    }
    if (!lead) {
      lead = await AbandonedCheckout.findOne({ sessionId, ...(parsedCourseId ? { courseId: parsedCourseId } : {}) });
    }

    if (lead) {
      // If already recovered by payment, do not revert to abandoned unless explicit new attempt
      if (cleanName) lead.buyerName = cleanName;
      if (cleanEmail) lead.buyerEmail = cleanEmail;
      if (cleanPhone) lead.buyerPhone = cleanPhone;
      if (cleanState) lead.buyerState = cleanState;
      if (courseTitle) lead.courseTitle = courseTitle;
      if (amount) lead.amount = Number(amount);
      if (parsedCourseId) lead.courseId = parsedCourseId;
      lead.step = validStep;
      lead.lastActiveAt = new Date();
      await lead.save();
      return res.status(200).json({ success: true, leadId: lead._id, updated: true });
    }

    // Create new lead record
    const newLead = await AbandonedCheckout.create({
      sessionId,
      courseId: parsedCourseId,
      courseTitle: courseTitle || 'Academy Course',
      amount: Number(amount) || 0,
      buyerName: cleanName,
      buyerEmail: cleanEmail,
      buyerPhone: cleanPhone,
      buyerState: cleanState,
      step: validStep,
      status: 'abandoned',
      createdAt: new Date(),
      lastActiveAt: new Date()
    });

    return res.status(200).json({ success: true, leadId: newLead._id, created: true });
  } catch (error) {
    console.error('Error tracking checkout step:', error);
    return res.status(200).json({ success: false, error: error.message });
  }
});

// -------------------------------------------------------------
// Super Admin Analytics Endpoints
// -------------------------------------------------------------

/**
 * GET /api/analytics/admin/overview
 * Comprehensive dashboard metrics: visits, conversion funnel, drop-offs, and abandoned leads
 */
router.get('/admin/overview', protect, admin, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Visitor Counts (Parallel)
    const [
      viewsToday,
      views7d,
      views30d,
      viewsAll,
      sessionsToday,
      sessions7d,
      sessions30d,
      sessionsAll
    ] = await Promise.all([
      PageView.countDocuments({ createdAt: { $gte: todayStart } }),
      PageView.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      PageView.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      PageView.countDocuments({}),
      PageView.distinct('sessionId', { createdAt: { $gte: todayStart } }),
      PageView.distinct('sessionId', { createdAt: { $gte: sevenDaysAgo } }),
      PageView.distinct('sessionId', { createdAt: { $gte: thirtyDaysAgo } }),
      PageView.distinct('sessionId', {})
    ]);

    // 2. Conversion & Drop-off Funnel (Last 30 Days)
    // Stage 1: Visited Homepage or Course Catalog
    // Stage 2: Viewed a Course Sales Page or Preview
    // Stage 3: Clicked Buy / Entered Checkout Page
    // Stage 4: Successfully Completed Purchase
    const funnelDateFilter = { createdAt: { $gte: thirtyDaysAgo } };

    const [
      stage1Sessions,
      stage2Sessions,
      stage3Sessions,
      completedTransactions
    ] = await Promise.all([
      PageView.distinct('sessionId', {
        ...funnelDateFilter,
        path: { $in: ['/', '/all-courses'] }
      }),
      PageView.distinct('sessionId', {
        ...funnelDateFilter,
        $or: [
          { path: { $regex: '^/sale/' } },
          { path: { $regex: '^/course/.+/preview' } }
        ]
      }),
      PageView.distinct('sessionId', {
        ...funnelDateFilter,
        path: { $regex: '^/checkout/' }
      }),
      Transaction.countDocuments({
        ...funnelDateFilter,
        status: 'success'
      })
    ]);

    const s1 = stage1Sessions.length;
    const s2 = stage2Sessions.length;
    const s3 = stage3Sessions.length;
    const s4 = completedTransactions;

    // Drop-off calculations
    const s1_to_s2_drop = s1 > 0 ? Math.max(0, Math.round(((s1 - s2) / s1) * 100)) : 0;
    const s2_to_s3_drop = s2 > 0 ? Math.max(0, Math.round(((s2 - s3) / s2) * 100)) : 0;
    const s3_to_s4_drop = s3 > 0 ? Math.max(0, Math.round(((s3 - s4) / s3) * 100)) : 0;
    const overallConversion = s1 > 0 ? ((s4 / s1) * 100).toFixed(1) : 0;

    const funnel = {
      stages: [
        { name: '1. Store & Catalog Visitors', count: s1, dropOffAfter: s1_to_s2_drop, dropOffLabel: `${s1_to_s2_drop}% left before viewing a course` },
        { name: '2. Course Sales Page Views', count: s2, dropOffAfter: s2_to_s3_drop, dropOffLabel: `${s2_to_s3_drop}% left without clicking Buy Now` },
        { name: '3. Reached Checkout', count: s3, dropOffAfter: s3_to_s4_drop, dropOffLabel: `${s3_to_s4_drop}% abandoned cart at payment` },
        { name: '4. Completed Purchases', count: s4, dropOffAfter: 0, dropOffLabel: 'Enrolled' }
      ],
      overallConversionRate: `${overallConversion}%`
    };

    // 3. Top Visited Pages
    const topPages = await PageView.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$path',
          pageTitle: { $last: '$pageTitle' },
          views: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          path: '$_id',
          pageTitle: 1,
          views: 1,
          uniqueVisitors: { $size: '$uniqueSessions' }
        }
      },
      { $sort: { views: -1 } },
      { $limit: 10 }
    ]);

    // 4. Abandoned Checkouts & Leads
    const abandonedLeads = await AbandonedCheckout.find()
      .sort({ lastActiveAt: -1 })
      .limit(100)
      .lean();

    const [
      totalAbandonedDocs,
      totalRecoveredDocs,
      abandonedValueAgg,
      recoveredValueAgg
    ] = await Promise.all([
      AbandonedCheckout.countDocuments({ status: 'abandoned' }),
      AbandonedCheckout.countDocuments({ status: 'recovered' }),
      AbandonedCheckout.aggregate([
        { $match: { status: 'abandoned' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      AbandonedCheckout.aggregate([
        { $match: { status: 'recovered' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const potentialLostRevenue = abandonedValueAgg[0]?.total || 0;
    const recoveredRevenue = recoveredValueAgg[0]?.total || 0;
    const totalLeads = totalAbandonedDocs + totalRecoveredDocs;
    const recoveryRate = totalLeads > 0 ? ((totalRecoveredDocs / totalLeads) * 100).toFixed(1) : 0;

    return res.status(200).json({
      success: true,
      traffic: {
        viewsToday,
        views7d,
        views30d,
        viewsAll,
        visitorsToday: sessionsToday.length,
        visitors7d: sessions7d.length,
        visitors30d: sessions30d.length,
        visitorsAll: sessionsAll.length
      },
      funnel,
      topPages,
      abandonedStats: {
        totalAbandoned: totalAbandonedDocs,
        totalRecovered: totalRecoveredDocs,
        recoveryRate: `${recoveryRate}%`,
        potentialLostRevenue,
        recoveredRevenue
      },
      leads: abandonedLeads
    });
  } catch (error) {
    console.error('Error getting analytics overview:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/analytics/admin/abandoned/:id/status
 * Toggle status of an abandoned lead (e.g. from abandoned to recovered)
 */
router.patch('/admin/abandoned/:id/status', protect, admin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['abandoned', 'recovered'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const lead = await AbandonedCheckout.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    lead.status = status;
    if (status === 'recovered') {
      lead.recoveredAt = new Date();
    }
    await lead.save();

    return res.status(200).json({ success: true, lead });
  } catch (error) {
    console.error('Error updating lead status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/analytics/admin/abandoned/:id
 * Delete an abandoned lead entry
 */
router.delete('/admin/abandoned/:id', protect, admin, async (req, res) => {
  try {
    const lead = await AbandonedCheckout.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    return res.status(200).json({ success: true, message: 'Lead removed' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
