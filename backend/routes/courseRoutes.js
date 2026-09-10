import express from 'express';
import Course from '../models/Course.js';
import Event from '../models/Event.js';
import TrialTutorial from '../models/TrialTutorial.js';
import User from '../models/User.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
// router.get('/', async (req, res) => {
//   try {
//     // Return all courses, hiding internal chapter videoUrls for safety
//     const courses = await Course.find({}).select('-content.chapters.videoUrl');
//     res.json(courses);
//   } catch (error) {
//     console.error('Fetch courses error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });
// GET /api/courses - Get courses with pagination
router.get('/', async (req, res) => {
  try {
    console.log(req.query)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const skip = (page - 1) * limit;
    const showAll = req.query.showAll === 'true';

    // Build query - you can add filters here if needed
    const query = {};

    // Get total count for pagination
    const total = await Course.countDocuments(query);
    // If showAll is true, get all courses without pagination
    let courses;
    if (showAll) {
      courses = await Course.find(query)
        .select('-content.chapters.videoUrl')
        .sort({ createdAt: -1 });
    } else {
      courses = await Course.find(query)
        .select('-content.chapters.videoUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    }

    res.json({
      courses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      },
      showAll: showAll
    });
  } catch (error) {
    console.error('Fetch courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// In your courses route file
router.get('/paginated', async (req, res) => {
  try {
    console.log('xxdsd')
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const search = req.query.search || '';
    const category = req.query.category || 'All';
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Category filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // Get total count
    const total = await Course.countDocuments(query);

    // Get courses
    const courses = await Course.find(query)
      .select('-content.chapters.videoUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      courses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Fetch courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// GET /api/courses/all - Get all courses (no pagination)
router.get('/all', async (req, res) => {
  try {
    const courses = await Course.find({})
      .select('-content.chapters.videoUrl')
      .sort({ createdAt: -1 }).limit(3);

    res.json({
      courses,
      total: courses.length
    });
  } catch (error) {
    console.error('Fetch all courses error:', error);
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
  const { 
    title, description, type, category, isFree, outcomes, 
    packageType, price, discountedPrice, affiliateCommission,
    thumbnail, languages, content 
  } = req.body;

  try {
    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({ 
        message: 'Title, description, and category are required fields' 
      });
    }

    const course = await Course.create({
      title,
      description,
      type: type || 'Course',
      category,
      isFree: isFree || false,
      outcomes: outcomes || [],
      packageType: packageType || 'Starter',
      price: isFree ? 0 : (price || 0),
      discountedPrice: isFree ? 0 : (discountedPrice || 0),
      affiliateCommission: affiliateCommission || 0,
      thumbnail: thumbnail || '',
      languages: languages || [],
      content: content || [],
    });

    res.status(201).json({ 
      success: true, 
      message: 'Course created successfully', 
      course 
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(400).json({ 
      message: 'Invalid course data', 
      error: error.message 
    });
  }
});



// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  const { title, description, type, category, isFree, outcomes, packageType, price, discountedPrice, thumbnail, languages, content } = req.body;

  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    course.title = title || course.title;
    course.description = description || course.description;
    course.type = type || course.type;
    course.category = category || course.category;
    course.isFree = isFree !== undefined ? isFree : course.isFree;
    course.outcomes = outcomes || course.outcomes;
    course.packageType = packageType || course.packageType;
    course.price = price !== undefined ? price : course.price;
    course.discountedPrice = discountedPrice !== undefined ? discountedPrice : course.discountedPrice;
    course.thumbnail = thumbnail || course.thumbnail;
    course.languages = languages || course.languages;
    course.content = content || course.content;

    const updatedCourse = await course.save();
    res.json(updatedCourse);
  } catch (error) {
    console.error('Update course error:', error);
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
      instructor: 'WIDETECHNOS Academy (Vision by @widetechai)',
      verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-cert/${course._id}-${user._id}`,
    });
  } catch (error) {
    console.error('Certificate details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
