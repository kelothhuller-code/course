import express from 'express';
import TrialTutorial from '../models/TrialTutorial.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all trial tutorials
// @route   GET /api/trials
// @access  Public
router.get('/', async (req, res) => {
  try {
    const trials = await TrialTutorial.find({}).sort({ createdAt: -1 });
    res.json(trials);
  } catch (error) {
    console.error('Fetch trials error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create a trial tutorial
// @route   POST /api/trials
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  const { title, description, videoUrl, category, duration, thumbnail } = req.body;

  try {
    // Validate required fields
    if (!title || !description || !videoUrl) {
      return res.status(400).json({ 
        message: 'Title, description, and video URL are required fields' 
      });
    }

    const tutorial = await TrialTutorial.create({
      title,
      description,
      videoUrl,
      category: category || 'General',
      duration: duration || '',
      thumbnail: thumbnail || '',
    });

    res.status(201).json({ 
      success: true, 
      message: 'Trial tutorial created successfully', 
      tutorial 
    });
  } catch (error) {
    console.error('Create tutorial error:', error);
    res.status(400).json({ 
      message: 'Invalid tutorial data', 
      error: error.message 
    });
  }
});


// @desc    Delete a trial tutorial
// @route   DELETE /api/trials/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const trial = await TrialTutorial.findById(req.params.id);
    if (!trial) {
      return res.status(404).json({ message: 'Trial tutorial not found' });
    }

    await trial.deleteOne();
    res.json({ message: 'Trial tutorial deleted' });
  } catch (error) {
    console.error('Delete trial error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
