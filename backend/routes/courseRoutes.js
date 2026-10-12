import express from 'express';
import jwt from 'jsonwebtoken';
import Course from '../models/Course.js';
import Event from '../models/Event.js';
import TrialTutorial from '../models/TrialTutorial.js';
import User from '../models/User.js';
import { protect, admin, isUserAdmin } from '../middleware/auth.js';
import { getJwtSecret } from '../utils/jwtSecret.js';

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

    // Search filter - sanitize regex special characters to prevent ReDoS
    if (search && typeof search === 'string') {
      const sanitizedSearch = search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (sanitizedSearch) {
        query.$or = [
          { title: { $regex: sanitizedSearch, $options: 'i' } },
          { description: { $regex: sanitizedSearch, $options: 'i' } },
          { category: { $regex: sanitizedSearch, $options: 'i' } }
        ];
      }
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

// @desc    Get highlighted/featured course for homepage
// @route   GET /api/courses/featured
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const featuredCourse = await Course.findOne({ isFeatured: true })
      .select('-content.chapters.videoUrl');
    res.json({ featuredCourse });
  } catch (error) {
    console.error('Fetch featured course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single course basic info
// @route   GET /api/courses/:id
// @desc    Get dedicated sales page payload for a course
// @route   GET /api/courses/sales/:slugOrId
// @access  Public
router.get('/sales/:slugOrId', async (req, res) => {
  try {
    const { slugOrId } = req.params;
    let course;
    if (slugOrId.match(/^[0-9a-fA-F]{24}$/)) {
      course = await Course.findById(slugOrId).populate('continuationCourses', 'title price discountedPrice thumbnail category isFree description');
    } else {
      course = await Course.findOne({ 'salesPageConfig.slug': slugOrId }).populate('continuationCourses', 'title price discountedPrice thumbnail category isFree description');
    }

    if (!course) {
      return res.status(404).json({ message: 'Course sales page not found' });
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const salesPageUrl = `${frontendUrl}/sale/${course.salesPageConfig?.slug || course._id}`;

    // Sanitize course content to prevent leaking paid links on public sales pages
    const sanitizedCourse = course.toObject();
    if (sanitizedCourse.content) {
      sanitizedCourse.content.forEach(lang => {
        if (lang.chapters) {
          lang.chapters.forEach(ch => {
            delete ch.videoUrl;
            delete ch.driveLink;
            if (ch.materials && Array.isArray(ch.materials)) {
              ch.materials = ch.materials.map(m => ({
                _id: m._id,
                title: m.title,
                type: m.type
              }));
            }
          });
        }
      });
    }

    res.json({
      course: sanitizedCourse,
      salesPageUrl,
      salesPageConfig: course.salesPageConfig || {
        headline: course.title,
        subheadline: course.description,
        highlights: course.outcomes || [],
        badgeText: course.isFree ? 'FREE COURSE' : '18% GST INCLUSIVE',
        ctaText: course.isFree ? 'Enroll Now Free' : 'Get Instant Access'
      }
    });
  } catch (error) {
    console.error('Fetch sales page error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single course basic info
// @route   GET /api/courses/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.id || req.params.id)
      .populate('continuationCourses', 'title price discountedPrice thumbnail category isFree description');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Check if requester is authenticated admin or enrolled student
    let isAdmin = false;
    let isEnrolled = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, getJwtSecret());
        const user = await User.findById(decoded.id);
        if (user) {
          isAdmin = isUserAdmin(user);
          isEnrolled = user.enrolledCourses?.some(
            c => (c.courseId?._id || c.courseId)?.toString() === course._id.toString()
          );
        }
      } catch (err) {
        // Token invalid, treat as guest
      }
    }

    // If requester is Admin, enrolled student, or course is completely free: Return full unredacted course!
    if (isAdmin || isEnrolled || course.isFree) {
      const fullCourse = course.toObject();
      fullCourse.salesPageUrl = `${frontendUrl}/sale/${course.salesPageConfig?.slug || course._id}`;
      return res.json(fullCourse);
    }

    // For unenrolled public visitors: Redact sensitive video/drive/material links
    const outline = course.toObject();
    if (outline.content) {
      outline.content.forEach(lang => {
        if (lang.chapters) {
          lang.chapters.forEach(ch => {
            delete ch.videoUrl;
            delete ch.driveLink;
            if (ch.materials && Array.isArray(ch.materials)) {
              ch.materials = ch.materials.map(m => ({
                _id: m._id,
                title: m.title,
                type: m.type
              }));
            }
          });
        }
      });
    }
    outline.salesPageUrl = `${frontendUrl}/sale/${course.salesPageConfig?.slug || course._id}`;

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
    const course = await Course.findById(req.params.id)
      .populate('continuationCourses', 'title price discountedPrice thumbnail category isFree description');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const user = await User.findById(req.user._id);
    const isEnrolled = user.enrolledCourses.some(
      (c) => (c.courseId?._id || c.courseId)?.toString() === course._id.toString()
    );
    const isAdmin = isUserAdmin(user);

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
// @desc    Create a new course
// @route   POST /api/courses
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  const {
    title, description, type, category, isFree, outcomes,
    packageType, price, discountedPrice, affiliateCommission,
    thumbnail, languages, content, continuationCourses, salesPageConfig,
    isFeatured
  } = req.body;

  try {
    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({
        message: 'Title, description, and category are required fields'
      });
    }

    if (isFeatured) {
      await Course.updateMany({}, { isFeatured: false });
    }

    const course = await Course.create({
      title,
      description,
      type: type || 'Course',
      category,
      isFree: isFree || false,
      isFeatured: !!isFeatured,
      outcomes: outcomes || [],
      packageType: packageType || 'Starter',
      price: isFree ? 0 : (price || 0),
      discountedPrice: isFree ? 0 : (discountedPrice || 0),
      affiliateCommission: affiliateCommission || 0,
      thumbnail: thumbnail || '',
      languages: languages || [],
      content: content || [],
      continuationCourses: continuationCourses || [],
      salesPageConfig: salesPageConfig || {}
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const salesPageUrl = `${frontendUrl}/sale/${course.salesPageConfig?.slug || course._id}`;

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course,
      salesPageUrl
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
  const {
    title, description, type, category, isFree, outcomes, packageType,
    price, discountedPrice, thumbnail, languages, content,
    continuationCourses, salesPageConfig, isFeatured
  } = req.body;

  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (isFeatured !== undefined) {
      if (isFeatured) {
        // If enabling featured on this course, un-feature all others
        await Course.updateMany({ _id: { $ne: course._id } }, { isFeatured: false });
      }
      course.isFeatured = isFeatured;
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
    if (continuationCourses !== undefined) course.continuationCourses = continuationCourses;
    if (salesPageConfig !== undefined) course.salesPageConfig = salesPageConfig;

    const updatedCourse = await course.save();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const salesPageUrl = `${frontendUrl}/sale/${updatedCourse.salesPageConfig?.slug || updatedCourse._id}`;

    res.json({
      ...updatedCourse.toObject(),
      salesPageUrl
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(400).json({ message: 'Invalid course data', error: error.message });
  }
});

// @desc    Toggle featured/highlighted status of a course on homepage
// @route   PUT /api/courses/:id/highlight
// @access  Private/Admin
router.put('/:id/highlight', protect, admin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const newFeaturedState = !course.isFeatured;
    if (newFeaturedState) {
      // Un-highlight all other courses so this one is uniquely highlighted
      await Course.updateMany({ _id: { $ne: course._id } }, { isFeatured: false });
    }

    course.isFeatured = newFeaturedState;
    await course.save();

    res.json({
      success: true,
      isFeatured: course.isFeatured,
      message: course.isFeatured 
        ? `⭐ "${course.title}" is now highlighted on the homepage!` 
        : `Removed "${course.title}" from highlighted position.`
    });
  } catch (error) {
    console.error('Toggle course highlight error:', error);
    res.status(500).json({ message: 'Failed to toggle course highlight status' });
  }
});
//     console.error('Update course error:', error);
//     res.status(400).json({ message: 'Invalid course data', error: error.message });
//   }
// });

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
    })
  } catch (error) {
    console.error('Get Certificate Details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get secure playback token for a course lesson video
// @route   POST /api/courses/:id/video-token
// @access  Private
router.post('/:id/video-token', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const user = await User.findById(req.user._id);
    const isAdmin = isUserAdmin(user);
    const isEnrolled = user.enrolledCourses?.some(
      (c) => (c.courseId?._id || c.courseId)?.toString() === course._id.toString()
    );

    if (!isEnrolled && !isAdmin && !course.isFree) {
      return res.status(403).json({ message: 'Enrollment required to stream video' });
    }

    const { videoUrl } = req.body;

    // Issue short-lived 2-hour video access token
    const streamToken = jwt.sign(
      {
        userId: user._id,
        courseId: course._id,
        videoUrl,
        exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60)
      },
      getJwtSecret()
    );

    res.json({
      success: true,
      streamToken,
      expiresIn: 7200
    });
  } catch (error) {
    console.error('Video token generation error:', error);
    res.status(500).json({ message: 'Failed to generate video stream token' });
  }

});

export default router;
