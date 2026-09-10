import express from 'express';
import Lead from '../models/Lead.js';

const router = express.Router();

// @desc    Capture a new lead (email signup)
// @route   POST /api/leads
// @access  Public
router.post('/', async (req, res) => {
  const { email, name, source } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  try {
    // Upsert: don't create duplicate leads for the same email
    const existingLead = await Lead.findOne({ email: email.toLowerCase().trim() });
    if (existingLead) {
      return res.status(200).json({ message: 'You are already on the list!', alreadyExists: true });
    }

    await Lead.create({
      email: email.toLowerCase().trim(),
      name: name || '',
      source: source || 'landing_page',
    });

    res.status(201).json({ message: 'Successfully subscribed! Check your email for the free resource.' });
  } catch (error) {
    console.error('Lead capture error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

export default router;
