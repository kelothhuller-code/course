import express from 'express';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Event from '../models/Event.js';

const router = express.Router();

// @desc    Enroll in free course or event
// @route   POST /api/enroll/free
// @access  Private
router.post('/free', protect, async (req, res) => {
  const { itemId } = req.body;

  try {
    // Check if it's a course
    let course = await Course.findById(itemId);
    if (course) {
      // Check if free
      if (course.price > 0 && !course.isFree) {
        return res.status(400).json({ message: 'This course is not free' });
      }

      const user = await User.findById(req.user._id);
      
      // Check if already enrolled
      const alreadyEnrolled = user.enrolledCourses.some(
        c => c.courseId.toString() === itemId
      );
      
      if (alreadyEnrolled) {
        return res.status(400).json({ message: 'Already enrolled in this course' });
      }

      user.enrolledCourses.push({
        courseId: itemId,
        progress: 0,
        completed: false,
        completedChapters: []
      });
      
      await user.save();

      return res.json({
        message: 'Successfully enrolled in free course',
        itemType: 'course'
      });
    }

    // Check if it's an event
    let event = await Event.findById(itemId);
    if (event) {
      // Check if free
      if (event.price > 0 && !event.isFree) {
        return res.status(400).json({ message: 'This event is not free' });
      }

      const user = await User.findById(req.user._id);
      
      // Check if already registered
      const alreadyRegistered = user.enrolledEvents.some(
        e => e.eventId.toString() === itemId
      );
      
      if (alreadyRegistered) {
        return res.status(400).json({ message: 'Already registered for this event' });
      }

      user.enrolledEvents.push({
        eventId: itemId
      });
      
      await user.save();

      return res.json({
        message: 'Successfully registered for free event',
        itemType: 'event'
      });
    }

    return res.status(404).json({ message: 'Item not found' });

  } catch (error) {
    console.error('Free enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;