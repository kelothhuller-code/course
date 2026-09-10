import express from 'express';
import jwt from 'jsonwebtoken';
import Event from '../models/Event.js';
import User from '../models/User.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// Helper to check user enrollment / admin and return details
const processEventForUser = (event, user) => {
  const eventObj = event.toObject();
  const isAdmin = user && user.role === 'admin';
  const isEnrolled = user && user.enrolledEvents.some(
    (e) => e.eventId.toString() === event._id.toString()
  );

  // If it's a free event, they still need to register to get the meeting link,
  // this is standard practice so we know who is attending.
  if (!isEnrolled && !isAdmin) {
    delete eventObj.meetingLink;
  }
  return eventObj;
};

// @desc    Get all webinars and workshops
// @route   GET /api/events
// @access  Public (Optional auth to show meeting links)
router.get('/', async (req, res) => {
  try {
    let user = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforwidetechnos2027');
        user = await User.findById(decoded.id);
      } catch (err) {
        // Token invalid, treat as guest
      }
    }

    const events = await Event.find({}).sort({ dateTime: 1 });
    const processedEvents = events.map(e => processEventForUser(e, user));
    
    res.json(processedEvents);
  } catch (error) {
    console.error('Fetch events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single webinar / workshop details
// @route   GET /api/events/:id
// @access  Public (Optional auth)
router.get('/:id', async (req, res) => {
  try {
    let user = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforwidetechnos2027');
        user = await User.findById(decoded.id);
      } catch (err) {
        // Token invalid
      }
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(processEventForUser(event, user));
  } catch (error) {
    console.error('Fetch single event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create a new webinar / workshop
// @route   POST /api/events
// @access  Private/Admin
// ==================== EVENT ROUTES ====================
router.post('/', protect, admin, async (req, res) => {
  const { 
    title, description, type, isPaid, price, 
    dateTime, meetingLink, duration, thumbnail 
  } = req.body;

  try {
    // Validate required fields
    if (!title || !description || !type || !dateTime || !meetingLink) {
      return res.status(400).json({ 
        message: 'Title, description, type, date/time, and meeting link are required fields' 
      });
    }

    const event = await Event.create({
      title,
      description,
      type,
      isPaid: isPaid || false,
      price: isPaid ? (price || 0) : 0,
      dateTime: new Date(dateTime),
      meetingLink,
      duration: duration || '',
      thumbnail: thumbnail || '',
    });

    res.status(201).json({ 
      success: true, 
      message: 'Event created successfully', 
      event 
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(400).json({ 
      message: 'Invalid event data', 
      error: error.message 
    });
  }
});


// @desc    Free register for free webinars/workshops
// @route   POST /api/events/:id/register-free
// @access  Private
router.post('/:id/register-free', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.isPaid) {
      return res.status(400).json({ message: 'This is a paid event, registration requires purchase' });
    }

    const user = await User.findById(req.user._id);
    const isEnrolled = user.enrolledEvents.some(
      (e) => e.eventId.toString() === event._id.toString()
    );

    if (isEnrolled) {
      return res.status(400).json({ message: 'You are already registered for this event' });
    }

    user.enrolledEvents.push({ eventId: event._id });
    await user.save();

    res.json({ message: 'Successfully registered for event', event: processEventForUser(event, user) });
  } catch (error) {
    console.error('Register free event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
