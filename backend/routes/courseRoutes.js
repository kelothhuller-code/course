import express from 'express';
import Course from '../models/Course.js';
import User from '../models/User.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Return all courses, hiding internal chapter videoUrls for safety
    const courses = await Course.find({}).select('-content.chapters.videoUrl');
    res.json(courses);
  } catch (error) {
    console.error('Fetch courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single course basic info
// @route   GET /api/courses/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.id || req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Create an outline version (hide videoUrl)
    const outline = course.toObject();
    if (outline.content) {
      outline.content.forEach(lang => {
        if (lang.chapters) {
          lang.chapters.forEach(ch => {
            delete ch.videoUrl;
          });
        }
      });
    }
    res.json(outline);
  } catch (error) {
    console.error('Fetch single course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get full course content for learning (Requires enrollment)
// @route   GET /api/courses/:id/learn
// @access  Private
router.get('/:id/learn', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const user = await User.findById(req.user._id);
    const isEnrolled = user.enrolledCourses.some(
      (c) => c.courseId.toString() === course._id.toString()
    );
    const isAdmin = user.role === 'admin';

    if (!isEnrolled && !isAdmin) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    res.json(course);
  } catch (error) {
    console.error('Learn content fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create a new course
// @route   POST /api/courses
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  const { title, description, category, packageType, price, thumbnail, languages, content } = req.body;

  try {
    const course = await Course.create({
      title,
      description,
      category,
      packageType,
      price,
      thumbnail,
      languages: languages || [],
      content: content || [],
    });

    res.status(201).json(course);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(400).json({ message: 'Invalid course data', error: error.message });
  }
});

// @desc    Update learning progress
// @route   POST /api/courses/:id/progress
// @access  Private
router.post('/:id/progress', protect, async (req, res) => {
  const { chapterTitle, language, completed } = req.body;

  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const user = await User.findById(req.user._id);
    const enrollmentIndex = user.enrolledCourses.findIndex(
      (c) => c.courseId.toString() === course._id.toString()
    );

    if (enrollmentIndex === -1) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    let enrollment = user.enrolledCourses[enrollmentIndex];
    let completedChapters = [...enrollment.completedChapters];

    if (completed) {
      if (!completedChapters.includes(chapterTitle)) {
        completedChapters.push(chapterTitle);
      }
    } else {
      completedChapters = completedChapters.filter(title => title !== chapterTitle);
    }

    // Calculate progress based on the selected language contents
    const languageContent = course.content.find((c) => c.language.toLowerCase() === language.toLowerCase());
    
    let progress = 0;
    if (languageContent && languageContent.chapters.length > 0) {
      const totalChapters = languageContent.chapters.length;
      // Filter user's completed chapters to only those in the current language structure
      const languageChapterTitles = languageContent.chapters.map(ch => ch.title);
      const completedInLanguage = completedChapters.filter(title => languageChapterTitles.includes(title));
      
      progress = Math.round((completedInLanguage.length / totalChapters) * 100);
    }

    enrollment.completedChapters = completedChapters;
    enrollment.progress = progress;

    if (progress === 100) {
      if (!enrollment.completed) {
        enrollment.completed = true;
        enrollment.completedAt = new Date();
      }
    } else {
      enrollment.completed = false;
      enrollment.completedAt = null;
    }

    user.enrolledCourses[enrollmentIndex] = enrollment;
    await user.save();

    res.json({
      message: 'Progress updated',
      progress,
      completed: enrollment.completed,
      completedChapters,
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get Certificate Details on course completion
// @route   GET /api/courses/:id/certificate
// @access  Private
router.get('/:id/certificate', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const user = await User.findById(req.user._id);
    const enrollment = user.enrolledCourses.find(
      (c) => c.courseId.toString() === course._id.toString()
    );

    if (!enrollment || !enrollment.completed) {
      return res.status(400).json({ message: 'Course not completed yet' });
    }

    res.json({
      certificateId: `CERT-${course._id.toString().substring(18)}-${user._id.toString().substring(18)}`.toUpperCase(),
      userName: user.name,
      courseTitle: course.title,
      completedAt: enrollment.completedAt,
      instructor: 'WIDETECHNOS Academy (Vision by @videdreamer)',
      verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-cert/${course._id}-${user._id}`,
    });
  } catch (error) {
    console.error('Certificate details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
