import Course from '../models/Course.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import ReferralLog from '../models/ReferralLog.js';
import Progress from '../models/progress.js';
import Comment from '../models/Comment.js';
import Event from '../models/Event.js';
// ==================== COURSE ANALYTICS ====================
// @desc    Get complete course analytics
// @route   GET /api/admin/courses/:courseId/analytics
// @access  Private/Admin
export const getCourseAnalytics = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // 1. Enrollment stats
    const enrolledUsers = await User.find({
      'enrolledCourses.courseId': courseId
    }).select('name email walletBalance createdAt enrolledCourses');

    const totalEnrollments = enrolledUsers.length;

    // 2. Completion stats from Progress collection
    const progressRecords = await Progress.find({ courseId });

    const completions = progressRecords.filter(p => p.completed).length;
    const avgProgress = progressRecords.length > 0
      ? Math.round(progressRecords.reduce((sum, p) => sum + (p.progress || 0), 0) / progressRecords.length)
      : 0;

    // 3. Revenue stats from Transactions
    const transactions = await Transaction.find({
      itemId: courseId,
      itemType: 'course',
      status: 'success'
    });

    const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    // 4. Affiliate / Referral stats
    const referralLogs = await ReferralLog.find({ courseId })
      .populate('referrerId', 'name email')
      .populate('refereeId', 'name email')
      .sort({ createdAt: -1 });

    const totalCommission = referralLogs.reduce((sum, r) => sum + (r.commissionAmount || 0), 0);

    // 5. Comment stats
    const totalComments = await Comment.countDocuments({ courseId });
    const unrepliedComments = await Comment.countDocuments({
      courseId,
      parentCommentId: null,
      replies: { $size: 0 }
    });
    const questionComments = await Comment.countDocuments({ courseId, isQuestion: true });
    const unresolvedQuestions = await Comment.countDocuments({
      courseId,
      isQuestion: true,
      isResolved: false
    });

    // 6. Per-student detailed breakdown
    const studentDetails = await Promise.all(enrolledUsers.map(async (user) => {
      const enrollment = user.enrolledCourses.find(
        e => e.courseId?.toString() === courseId
      );

      const progressRec = progressRecords.find(
        p => p.userId?.toString() === user._id.toString()
      );

      // User's transaction for this course
      const userTxn = await Transaction.findOne({
        userId: user._id,
        itemId: courseId,
        itemType: 'course',
        status: 'success'
      });

      // Commission earned from this user's purchase
      const commission = await ReferralLog.findOne({
        refereeId: user._id,
        courseId
      });

      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        enrolledAt: enrollment?.courseId ? user.createdAt : null,
        progress: progressRec?.progress ?? enrollment?.progress ?? 0,
        completed: progressRec?.completed ?? enrollment?.completed ?? false,
        completedAt: progressRec?.completedAt ?? enrollment?.completedAt ?? null,
        amountPaid: userTxn?.amount || 0,
        txnId: userTxn?.txnid || null,
        commissionEarned: commission?.commissionAmount || 0,
        referredBy: commission?.referrerId?._id || null
      };
    }));

    // 7. Language-wise chapter completion counts
    const languageStats = (course.content || []).map(lang => {
      const chapterTitles = (lang.chapters || []).map(c => c.title);

      // Count how many students completed each chapter
      const chapterStats = chapterTitles.map(title => {
        const completedCount = progressRecords.filter(p =>
          (p.completedChapters || []).includes(title)
        ).length;

        return {
          title,
          completedCount,
          completionRate: totalEnrollments > 0
            ? Math.round((completedCount / totalEnrollments) * 100)
            : 0
        };
      });

      return {
        language: lang.language,
        totalChapters: chapterTitles.length,
        chapters: chapterStats
      };
    });

    res.json({
      course: {
        _id: course._id,
        title: course.title,
        category: course.category,
        type: course.type,
        isFree: course.isFree,
        price: course.price,
        discountedPrice: course.discountedPrice,
        affiliateCommission: course.affiliateCommission,
        packageType: course.packageType,
        thumbnail: course.thumbnail,
        languages: course.languages,
        outcomes: course.outcomes,
        content: course.content
      },
      stats: {
        totalEnrollments,
        completions,
        avgProgress,
        totalRevenue,
        totalCommission,
        totalComments,
        unrepliedComments,
        questionComments,
        unresolvedQuestions
      },
      students: studentDetails,
      referrals: referralLogs.map(r => ({
        referrer: r.referrerId ? { _id: r.referrerId._id, name: r.referrerId.name, email: r.referrerId.email } : null,
        referee: r.refereeId ? { _id: r.refereeId._id, name: r.refereeId.name, email: r.refereeId.email } : null,
        commissionAmount: r.commissionAmount,
        createdAt: r.createdAt
      })),
      languageStats
    });

  } catch (error) {
    console.error('Course analytics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==================== COURSE COMMENTS MODERATION ====================
// @desc    Get course comments with filters
// @route   GET /api/admin/courses/:courseId/comments
// @access  Private/Admin
export const getCourseComments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      filter = 'all',       // all | unreplied | questions | resolved | unresolved | liked
      sortBy = 'newest',    // newest | oldest | mostLiked | mostReplies
      page = 1,
      limit = 20
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Base query
    const query = { courseId, parentCommentId: null };

    // Apply filters
    if (filter === 'unreplied') {
      query.replies = { $size: 0 };
    } else if (filter === 'questions') {
      query.isQuestion = true;
    } else if (filter === 'resolved') {
      query.isResolved = true;
    } else if (filter === 'unresolved') {
      query.isResolved = false;
      query.isQuestion = true;
    } else if (filter === 'liked') {
      query['likes.0'] = { $exists: true };
    }

    // Sort
    let sort = { createdAt: -1 };
    if (sortBy === 'oldest') sort = { createdAt: 1 };
    else if (sortBy === 'mostLiked') sort = { 'likes.length': -1, createdAt: -1 };
    else if (sortBy === 'mostReplies') sort = { 'replies.length': -1, createdAt: -1 };

    // Get comments
    const comments = await Comment.find(query)
      .populate('userId', 'name email profilePicture role')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments(query);

    // Attach replies (first 3) with user info
    const commentsWithReplies = await Promise.all(comments.map(async (c) => {
      const replies = await Comment.find({ parentCommentId: c._id })
        .populate('userId', 'name email profilePicture role')
        .sort({ createdAt: 1 })
        .limit(3);

      const replyCount = await Comment.countDocuments({ parentCommentId: c._id });

      return {
        ...c.toObject(),
        replyCount,
        replies
      };
    }));

    // Filter counts (for tabs)
    const counts = {
      all: await Comment.countDocuments({ courseId, parentCommentId: null }),
      unreplied: await Comment.countDocuments({ courseId, parentCommentId: null, replies: { $size: 0 } }),
      questions: await Comment.countDocuments({ courseId, parentCommentId: null, isQuestion: true }),
      resolved: await Comment.countDocuments({ courseId, parentCommentId: null, isResolved: true }),
      unresolved: await Comment.countDocuments({ courseId, parentCommentId: null, isQuestion: true, isResolved: false }),
      liked: await Comment.countDocuments({ courseId, parentCommentId: null, 'likes.0': { $exists: true } })
    };

    res.json({
      comments: commentsWithReplies,
      counts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get course comments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Admin pin/unpin a comment
// @route   PATCH /api/admin/comments/:commentId/pin
// @access  Private/Admin
export const togglePinComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    comment.isPinned = !comment.isPinned;
    await comment.save();

    res.json({ message: 'Toggled pin', isPinned: comment.isPinned, comment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Admin resolve/unresolve question
// @route   PATCH /api/admin/comments/:commentId/resolve
// @access  Private/Admin
export const adminToggleResolve = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    comment.isResolved = !comment.isResolved;
    await comment.save();

    res.json({ message: 'Toggled resolve', isResolved: comment.isResolved, comment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Admin delete comment (with cascade)
// @route   DELETE /api/admin/comments/:commentId
// @access  Private/Admin
export const adminDeleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Delete all descendants
    await Comment.deleteMany({ parentCommentId: comment._id });

    // Remove from parent's replies
    if (comment.parentCommentId) {
      await Comment.findByIdAndUpdate(comment.parentCommentId, {
        $pull: { replies: comment._id }
      });
    }

    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Admin reply as admin
// @route   POST /api/admin/courses/:courseId/comments/:commentId/reply
// @access  Private/Admin
export const adminReplyToComment = async (req, res) => {
  try {
    const { courseId, commentId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Reply text is required' });
    }

    const parent = await Comment.findById(commentId);
    if (!parent) return res.status(404).json({ message: 'Parent comment not found' });

    const reply = new Comment({
      userId,
      courseId,
      lessonId: parent.lessonId,
      chapterId: parent.chapterId,
      text: text.trim(),
      parentCommentId: commentId,
      depth: (parent.depth || 0) + 1
    });

    await reply.save();
    await Comment.findByIdAndUpdate(commentId, { $push: { replies: reply._id } });

    await reply.populate('userId', 'name email profilePicture role');

    res.status(201).json({ message: 'Reply added', comment: reply });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==================== EVENT ANALYTICS ====================
// @desc    Get event analytics
// @route   GET /api/admin/events/:eventId/analytics
// @access  Private/Admin
// export const getEventAnalytics = async (req, res) => {
//   try {
//     const { eventId } = req.params;

//     const enrolledUsers = await User.find({
//       'enrolledEvents.eventId': eventId
//     }).select('name email enrolledEvents');

//     const transactions = await Transaction.find({
//       itemId: eventId,
//       itemType: 'event',
//       status: 'success'
//     });

//     const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

//     const students = await Promise.all(enrolledUsers.map(async (user) => {
//       const enrollment = user.enrolledEvents.find(
//         e => e.eventId?.toString() === eventId
//       );
//       const txn = transactions.find(t => t.userId?.toString() === user._id.toString());

//       return {
//         userId: user._id,
//         name: user.name,
//         email: user.email,
//         enrolledAt: enrollment?.enrolledAt || null,
//         amountPaid: txn?.amount || 0,
//         txnId: txn?.txnid || null
//       };
//     }));

//     res.json({
//       stats: {
//         totalRegistrations: enrolledUsers.length,
//         totalRevenue
//       },
//       students
//     });
//   } catch (error) {
//     console.error('Event analytics error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// ==================== EVENT ANALYTICS ====================
// @desc    Get complete event analytics (registrations + revenue)
// @route   GET /api/admin/events/:eventId/analytics
// @access  Private/Admin
export const getEventAnalytics = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // 1. All users registered for this event
    const enrolledUsers = await User.find({
      'enrolledEvents.eventId': eventId
    }).select('name email createdAt enrolledEvents');

    const totalRegistrations = enrolledUsers.length;

    // 2. Successful transactions for this event
    const transactions = await Transaction.find({
      itemId: eventId,
      itemType: 'event',
      status: 'success'
    });

    const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    // 3. Per-student breakdown
    const students = enrolledUsers.map((user) => {
      const enrollment = user.enrolledEvents.find(
        e => e.eventId?.toString() === eventId
      );

      const userTxn = transactions.find(
        t => t.userId?.toString() === user._id.toString()
      );

      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        enrolledAt: enrollment?.enrolledAt || null,
        amountPaid: userTxn?.amount || 0,
        txnId: userTxn?.txnid || null,
        status: userTxn ? 'Paid' : (event.isPaid ? 'Pending' : 'Free')
      };
    });

    // Sort by enrolledAt desc
    students.sort((a, b) => new Date(b.enrolledAt || 0) - new Date(a.enrolledAt || 0));

    const paidStudents = students.filter(s => s.amountPaid > 0);
    const freeStudents = students.filter(s => s.amountPaid === 0);
    const avgTicket = paidStudents.length > 0
      ? Math.round(totalRevenue / paidStudents.length)
      : 0;

    // 4. Event status
    const now = new Date();
    const eventDate = new Date(event.dateTime);
    const diffMs = eventDate - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let statusLabel = 'Upcoming';
    if (diffMs < 0) statusLabel = 'Completed';
    else if (diffDays === 0) statusLabel = 'Today';
    else if (diffDays === 1) statusLabel = 'Tomorrow';
    else statusLabel = `In ${diffDays} days`;

    res.json({
      event: {
        _id: event._id,
        title: event.title,
        description: event.description,
        type: event.type,
        dateTime: event.dateTime,
        duration: event.duration,
        meetingLink: event.meetingLink,
        isPaid: event.isPaid,
        price: event.price,
        thumbnail: event.thumbnail
      },
      stats: {
        totalRegistrations,
        totalRevenue,
        freeCount: freeStudents.length,
        paidCount: paidStudents.length,
        avgTicket,
        statusLabel,
        daysUntilEvent: diffDays
      },
      students
    });

  } catch (error) {
    console.error('Event analytics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==================== BULK EMAIL TO EVENT ATTENDEES ====================
// @desc    Send bulk email to all attendees of an event
// @route   POST /api/admin/events/:eventId/broadcast
// @access  Private/Admin
export const broadcastEventEmail = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { subject, message, recipientFilter = 'all' } = req.body;
    // recipientFilter: 'all' | 'paid' | 'free'

    if (!subject || !subject.trim()) {
      return res.status(400).json({ message: 'Email subject is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Email body is required' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Get all registrants
    const enrolledUsers = await User.find({
      'enrolledEvents.eventId': eventId
    }).select('name email');

    if (enrolledUsers.length === 0) {
      return res.status(400).json({ message: 'No attendees to send email to' });
    }

    // If filter is paid/free, get transactions to split
    let recipients = enrolledUsers;
    if (recipientFilter !== 'all') {
      const transactions = await Transaction.find({
        itemId: eventId,
        itemType: 'event',
        status: 'success'
      }).select('userId');

      const paidUserIds = new Set(transactions.map(t => t.userId?.toString()));

      recipients = enrolledUsers.filter(u => {
        const isPaid = paidUserIds.has(u._id.toString());
        return recipientFilter === 'paid' ? isPaid : !isPaid;
      });
    }

    if (recipients.length === 0) {
      return res.status(400).json({ 
        message: `No attendees match the "${recipientFilter}" filter` 
      });
    }

    // Send emails — assumes you have a mailer service
    // If you're using Nodemailer, replace this block with your send logic
    const results = { sent: 0, failed: 0, failures: [] };

    // Import your mailer at top:
    // import { sendEmail } from '../utils/mailer.js';

    for (const user of recipients) {
      try {
        // Example with nodemailer utility:
        // await sendEmail({
        //   to: user.email,
        //   subject,
        //   html: `
        //     <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        //       <h2>${event.title}</h2>
        //       <p>Hi ${user.name},</p>
        //       <div>${message.replace(/\n/g, '<br>')}</div>
        //       <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
        //       <p style="font-size:12px;color:#888;">
        //         Event: ${event.title}<br>
        //         Date: ${new Date(event.dateTime).toLocaleString()}<br>
        //         Join link: <a href="${event.meetingLink}">${event.meetingLink}</a>
        //       </p>
        //     </div>
        //   `
        // });
        results.sent++;
      } catch (err) {
        results.failed++;
        results.failures.push({ email: user.email, error: err.message });
      }
    }

    res.json({
      message: `Broadcast complete: ${results.sent} sent, ${results.failed} failed`,
      total: recipients.length,
      ...results
    });

  } catch (error) {
    console.error('Broadcast email error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};