import Comment from '../models/Comment.js';
import Course from '../models/Course.js';
import User from '../models/User.js';

// Get comments for a lesson
export const getComments = async (req, res) => {
  try {
    console.log('sdsdsd')
    const { courseId, lessonId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    // Verify enrollment for protected content
    const userId = req.user.id;
    const user = await User.findById(userId);
    const isEnrolled = user.enrolledCourses?.some(
      c => c.courseId?.toString() === courseId || c.courseId === courseId
    );

    // Check if course is free
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Allow access if free or enrolled
    const isFree = course.price === 0 || course.isFree;
    if (!isFree && !isEnrolled) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const query = {
      courseId,
      lessonId,
      parentCommentId: null // Only top-level comments
    };

    const comments = await Comment.find(query)
      .populate('userId', 'name email profilePicture')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get reply count for each comment
    const commentsWithReplies = await Promise.all(comments.map(async (comment) => {
      const replyCount = await Comment.countDocuments({
        parentCommentId: comment._id
      });
      
      // Get first 3 replies
      const replies = await Comment.find({
        parentCommentId: comment._id
      })
        .populate('userId', 'name email profilePicture')
        .sort({ createdAt: 1 })
        .limit(3);

      return {
        ...comment.toObject(),
        replyCount,
        replies
      };
    }));

    const totalComments = await Comment.countDocuments(query);

    res.json({
      comments: commentsWithReplies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalComments,
        pages: Math.ceil(totalComments / limit)
      }
    });

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

// Create a comment
export const createComment = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user.id;
    const { text, parentCommentId, isQuestion } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    // Verify enrollment
    const user = await User.findById(userId);
    const isEnrolled = user.enrolledCourses?.some(
      c => c.courseId?.toString() === courseId || c.courseId === courseId
    );

    const course = await Course.findById(courseId);
    const isFree = course?.price === 0 || course?.isFree;

    if (!isFree && !isEnrolled) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate parent comment if replying
    let depth = 0;
    if (parentCommentId) {
      const parent = await Comment.findById(parentCommentId);
      if (!parent) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
      depth = parent.depth + 1;
      
      // Limit nesting depth
      if (depth > 3) {
        return res.status(400).json({ error: 'Maximum reply depth exceeded' });
      }
    }

    const comment = new Comment({
      userId,
      courseId,
      lessonId,
      text: text.trim(),
      parentCommentId: parentCommentId || null,
      isQuestion: isQuestion || false,
      depth
    });

    await comment.save();

    // If this is a reply, add to parent's replies
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, {
        $push: { replies: comment._id }
      });
    }

    await comment.populate('userId', 'name email profilePicture');

    res.status(201).json({
      message: 'Comment created successfully',
      comment
    });

  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

// Update a comment
export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const { text } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check ownership
    if (comment.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this comment' });
    }

    comment.text = text.trim();
    await comment.save();

    res.json({
      message: 'Comment updated successfully',
      comment
    });

  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
};

// Delete a comment
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check ownership or admin
    const user = await User.findById(userId);
    const isAdmin = user.role === 'admin' || user.role === 'instructor';
    
    if (comment.userId.toString() !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    // Delete all replies
    if (comment.parentCommentId === null) {
      await Comment.deleteMany({ parentCommentId: comment._id });
    }

    // Remove from parent's replies
    if (comment.parentCommentId) {
      await Comment.findByIdAndUpdate(comment.parentCommentId, {
        $pull: { replies: comment._id }
      });
    }

    await comment.deleteOne();

    res.json({
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

// Toggle like on comment
export const toggleLike = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const likeIndex = comment.likes.indexOf(userId);
    if (likeIndex > -1) {
      comment.likes.splice(likeIndex, 1);
    } else {
      comment.likes.push(userId);
    }

    await comment.save();

    res.json({
      message: 'Like toggled',
      liked: likeIndex === -1,
      likeCount: comment.likes.length
    });

  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

// Mark question as resolved
export const markResolved = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user owns the question
    if (comment.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Only the question owner can mark as resolved' });
    }

    comment.isResolved = !comment.isResolved;
    await comment.save();

    res.json({
      message: 'Question resolution toggled',
      isResolved: comment.isResolved
    });

  } catch (error) {
    console.error('Mark resolved error:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
};