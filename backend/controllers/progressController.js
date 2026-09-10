import Progress from '../models/progress.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Certificate from '../models/Certificate.js';

// Helper function to find a lesson by ID in course content
const findLessonById = (course, lessonId) => {
  if (!course || !course.content) return null;
  
  for (const langContent of course.content) {
    for (const chapter of langContent.chapters || []) {
      // Check if chapter has lessons (embedded)
      for (const lesson of chapter.lessons || []) {
        if (lesson._id && lesson._id.toString() === lessonId.toString()) {
          return {
            lesson,
            chapter,
            language: langContent.language
          };
        }
      }
    }
  }
  return null;
};

// Helper function to get total lessons count
const getTotalLessons = (course) => {
  let count = 0;
  if (!course || !course.content) return count;
  
  for (const langContent of course.content) {
    for (const chapter of langContent.chapters || []) {
      count += (chapter.lessons || []).length;
    }
  }
  return count;
};

// Get user's progress for a specific course
export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Verify enrollment
    const user = await User.findById(userId);
    const isEnrolled = user.enrolledCourses?.some(
      c => c.courseId?.toString() === courseId || c.courseId === courseId
    );

    if (!isEnrolled) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    let progress = await Progress.findOne({ userId, courseId });

    if (!progress) {
      progress = new Progress({ userId, courseId });
      await progress.save();
    }

    // Get course to calculate total lessons
    const course = await Course.findById(courseId);

    const totalLessons = getTotalLessons(course);

    // Calculate progress
    progress.calculateProgress(totalLessons);

    // Get last watched lesson details
    let lastWatchedLesson = null;
    if (progress.lastWatchedLessonId && course) {
      const found = findLessonById(course, progress.lastWatchedLessonId);
      if (found) {
        lastWatchedLesson = {
          title: found.lesson.title,
          id: found.lesson._id,
          chapterTitle: found.chapter.title,
          language: found.language
        };
      }
    }

    // Get current lesson details
    let currentLesson = null;
    if (progress.currentLessonId && course) {
      const found = findLessonById(course, progress.currentLessonId);
      if (found) {
        currentLesson = {
          title: found.lesson.title,
          id: found.lesson._id,
          chapterTitle: found.chapter.title
        };
      }
    }

    res.json({
      progress: progress.progress,
      completedLessons: progress.completedLessons.length,
      totalLessons,
      completed: progress.completed || progress.progress === 100,
      completedAt: progress.completedAt,
      currentLesson,
      lastWatchedLesson,
      lastWatchedAt: progress.lastWatchedAt,
      activeLanguage: progress.activeLanguage || '',
      completedChapters: progress.completedChapters || [],
      lessonProgress: progress.lessonProgress || []
    });

  } catch (error) {
    console.error('Get course progress error:', error);
    res.status(500).json({ error: 'Failed to fetch course progress' });
  }
};

// Update video progress
export const updateVideoProgress = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user.id;
    const {
      videoProgressSeconds,
      videoDurationSeconds,
      videoProgressPercent,
      chapterId
    } = req.body;

    // Validate enrollment
    const user = await User.findById(userId);
    const isEnrolled = user.enrolledCourses?.some(
      c => c.courseId?.toString() === courseId || c.courseId === courseId
    );

    if (!isEnrolled) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    let progress = await Progress.findOne({ userId, courseId });
    if (!progress) {
      progress = new Progress({ userId, courseId });
    }

    // Find or create lesson progress
    let lessonProgress = progress.lessonProgress.find(
      lp => lp.lessonId.toString() === lessonId
    );

    if (!lessonProgress) {
      lessonProgress = {
        lessonId,
        chapterId: chapterId || progress.currentChapterId
      };
      progress.lessonProgress.push(lessonProgress);
    }

    // Update video progress
    lessonProgress.videoProgressSeconds = videoProgressSeconds || 0;
    lessonProgress.videoDurationSeconds = videoDurationSeconds || 0;
    lessonProgress.videoProgressPercent = videoProgressPercent || 0;
    lessonProgress.lastAccessedAt = new Date();
    lessonProgress.timesOpened = (lessonProgress.timesOpened || 0) + 1;

    // Check if video is complete (90% threshold)
    const completionThreshold = 90;
    if (videoProgressPercent >= completionThreshold && !lessonProgress.videoCompleted) {
      lessonProgress.videoCompleted = true;
    }

    // Mark lesson as completed if video is complete
    if (lessonProgress.videoCompleted && !lessonProgress.completed) {
      lessonProgress.completed = true;
      lessonProgress.completedAt = new Date();

      // Add to completed lessons if not already there
      if (!progress.completedLessons.includes(lessonId)) {
        progress.completedLessons.push(lessonId);
      }
    }

    // Update current and last watched
    progress.currentLessonId = lessonId;
    progress.currentChapterId = chapterId || progress.currentChapterId;
    progress.lastWatchedLessonId = lessonId;
    progress.lastWatchedAt = new Date();

    // Calculate overall progress
    const course = await Course.findById(courseId);
    const totalLessons = getTotalLessons(course);

    progress.calculateProgress(totalLessons);

    // Check if course is completed
    if (progress.progress === 100 && !progress.completed) {
      progress.completed = true;
      progress.completedAt = new Date();

      // Generate certificate
      await generateCertificate(userId, courseId, course.title);
    }

    await progress.save();

    res.json({
      message: 'Progress updated',
      progress: progress.progress,
      completed: progress.completed,
      completedAt: progress.completedAt,
      lessonCompleted: lessonProgress.completed,
      videoCompleted: lessonProgress.videoCompleted
    });

  } catch (error) {
    console.error('Update video progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
};

// Track material opened
export const trackMaterialOpen = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const isEnrolled = user.enrolledCourses?.some(
      c => c.courseId?.toString() === courseId || c.courseId === courseId
    );

    if (!isEnrolled) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    let progress = await Progress.findOne({ userId, courseId });
    if (!progress) {
      progress = new Progress({ userId, courseId });
    }

    let lessonProgress = progress.lessonProgress.find(
      lp => lp.lessonId.toString() === lessonId
    );

    if (!lessonProgress) {
      lessonProgress = {
        lessonId,
        chapterId: progress.currentChapterId
      };
      progress.lessonProgress.push(lessonProgress);
    }

    lessonProgress.materialOpened = true;
    lessonProgress.materialOpenedAt = new Date();
    lessonProgress.lastAccessedAt = new Date();
    lessonProgress.timesOpened = (lessonProgress.timesOpened || 0) + 1;

    await progress.save();

    res.json({
      message: 'Material access tracked',
      materialOpened: true,
      materialOpenedAt: lessonProgress.materialOpenedAt
    });

  } catch (error) {
    console.error('Track material open error:', error);
    res.status(500).json({ error: 'Failed to track material access' });
  }
};

// Get user's learning overview
export const getMyLearning = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .populate({
        path: 'enrolledCourses.courseId',
        select: 'title thumbnail description category price discountedPrice instructor duration languages content type isFree'
      })
      .populate({
        path: 'enrolledEvents.eventId',
        select: 'title description dateTime type duration meetingLink thumbnail'
      });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get progress for all enrolled courses
    const enrolledCourses = user.enrolledCourses || [];
    const progressPromises = enrolledCourses.map(async (enrollment) => {
      const courseId = enrollment.courseId?._id || enrollment.courseId;
      if (!courseId) return null;

      const progress = await Progress.findOne({ userId, courseId });
      const course = await Course.findById(courseId);

      // Get last watched lesson details
      let lastWatchedLesson = null;
      if (progress?.lastWatchedLessonId && course) {
        const found = findLessonById(course, progress.lastWatchedLessonId);
        if (found) {
          lastWatchedLesson = {
            title: found.lesson.title,
            id: found.lesson._id,
            chapterTitle: found.chapter.title
          };
        }
      }

      const totalLessons = getTotalLessons(course);

      return {
        course: enrollment.courseId,
        enrolledAt: enrollment.enrolledAt,
        progress: progress?.progress || 0,
        completed: progress?.completed || false,
        completedAt: progress?.completedAt,
        completedLessons: progress?.completedLessons?.length || 0,
        totalLessons,
        lastWatchedLesson,
        lastWatchedAt: progress?.lastWatchedAt,
        currentLessonId: progress?.currentLessonId
      };
    });

    const enrolledWithProgress = await Promise.all(progressPromises);

    // Get certificates
    const certificates = await Certificate.find({ userId });

    res.json({
      courses: enrolledWithProgress.filter(c => c !== null),
      events: user.enrolledEvents || [],
      certificates: certificates || [],
      totalCourses: enrolledCourses.length,
      completedCourses: enrolledWithProgress.filter(c => c?.completed).length,
      inProgressCourses: enrolledWithProgress.filter(c => c?.progress > 0 && c?.progress < 100).length
    });

  } catch (error) {
    console.error('Get my learning error:', error);
    res.status(500).json({ error: 'Failed to fetch learning data' });
  }
};

// Helper function to generate certificate
async function generateCertificate(userId, courseId, courseTitle) {
  try {
    const user = await User.findById(userId);
    const certificateId = `WTA-${new Date().getFullYear()}-AI-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

    const certificate = new Certificate({
      userId,
      courseId,
      certificateId,
      courseTitle,
      userName: user.name,
      userEmail: user.email,
      issuedAt: new Date()
    });

    await certificate.save();

    // Add to user's certificates
    user.certificates = user.certificates || [];
    user.certificates.push({
      courseId,
      certificateId,
      issuedAt: new Date(),
      courseTitle
    });
    await user.save();

    return certificate;
  } catch (error) {
    console.error('Certificate generation error:', error);
    throw error;
  }
}