import Progress from '../models/Progress.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Certificate from '../models/Certificate.js';
import { createCertificateForUser, courseFacts } from './certificateController.js';

// Helper function to find a lesson by ID in course content
const findLessonById = (course, lessonId) => {
  if (!course || !course.content) return null;
  
  for (const langContent of course.content) {
    for (const chapter of langContent.chapters || []) {
      // Direct match (chapters themselves act as lessons in this schema)
      if (chapter._id && chapter._id.toString() === lessonId.toString()) {
        return {
          lesson: chapter,
          chapter,
          language: langContent.language
        };
      }
      // Check if chapter has nested lessons
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

// Helper function to get total lessons count for course
const getTotalLessons = (course, language) => {
  if (!course || !course.content || course.content.length === 0) return 0;
  
  // Pick the specified language content, or the first language content available
  const langContent = (language 
    ? course.content.find(c => c.language === language) 
    : null) || course.content[0];

  if (!langContent || !langContent.chapters) return 0;

  let count = 0;
  for (const chapter of langContent.chapters) {
    if (Array.isArray(chapter.lessons) && chapter.lessons.length > 0) {
      count += chapter.lessons.length;
    } else {
      count += 1;
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
      return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
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
      completedLessons: (progress.completedLessons || []).map(id => id.toString()),
      completedLessonsCount: (progress.completedLessons || []).length,
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
    res.status(500).json({ success: false, message: 'Failed to fetch course progress' });
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
      chapterId,
      completed
    } = req.body;

    // Validate enrollment
    const user = await User.findById(userId);
    const isEnrolled = user.enrolledCourses?.some(
      c => c.courseId?.toString() === courseId || c.courseId === courseId
    );

    if (!isEnrolled) {
      return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    let progress = await Progress.findOne({ userId, courseId });
    if (!progress) {
      progress = new Progress({ userId, courseId });
    }

    const totalLessons = getTotalLessons(course, progress.activeLanguage);

    // Find or create lesson progress
    let lessonProgress = progress.lessonProgress.find(
      lp => lp.lessonId && lp.lessonId.toString() === lessonId.toString()
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

    // Check if video or lesson is complete
    const completionThreshold = 90;
    const isExplicitlyUncompleted = completed === false;
    const isMarkedCompleted = completed === true;

    if (isExplicitlyUncompleted) {
      lessonProgress.completed = false;
      lessonProgress.videoCompleted = false;
      lessonProgress.videoProgressPercent = 0;
      // Remove from completedLessons
      progress.completedLessons = (progress.completedLessons || []).filter(
        l => l && l.toString() !== lessonId.toString()
      );
      if (progress.completed && progress.completedLessons.length < totalLessons) {
        progress.completed = false;
        progress.completedAt = null;
      }
    } else {
      if (isMarkedCompleted || (videoProgressPercent >= completionThreshold && !lessonProgress.videoCompleted)) {
        lessonProgress.videoCompleted = true;
      }

      // Mark lesson as completed if video is complete or explicitly marked completed
      if (isMarkedCompleted || (lessonProgress.videoCompleted && !lessonProgress.completed)) {
        lessonProgress.completed = true;
        lessonProgress.completedAt = new Date();

        // Add to completed lessons if not already there
        const isAlreadyCompleted = (progress.completedLessons || []).some(
          l => l && l.toString() === lessonId.toString()
        );
        if (!isAlreadyCompleted) {
          progress.completedLessons.push(lessonId);
        }
      }
    }

    // Update current and last watched
    progress.currentLessonId = lessonId;
    progress.currentChapterId = chapterId || progress.currentChapterId;
    progress.lastWatchedLessonId = lessonId;
    progress.lastWatchedAt = new Date();

    // Calculate overall progress
    progress.calculateProgress(totalLessons);

    // Sync progress back to user.enrolledCourses for backward compatibility
    const userEnrollment = user.enrolledCourses?.find(
      c => c.courseId?.toString() === courseId.toString()
    );
    if (userEnrollment) {
      userEnrollment.progress = progress.progress;
      if (progress.progress >= 100) {
        userEnrollment.completed = true;
        if (!userEnrollment.completedAt) {
          userEnrollment.completedAt = new Date();
        }
      } else {
        userEnrollment.completed = false;
      }
      await user.save();
    }

    // Check if course is completed
    if (progress.progress === 100 && !progress.completed) {
      progress.completed = true;
      progress.completedAt = new Date();

      // Generate certificate
      try {
        await createCertificateForUser(userId, courseId, course.title);
      } catch (certErr) {
        console.error('Auto certificate generation error:', certErr);
      }
    }

    await progress.save();

    res.json({
      message: 'Progress updated',
      progress: progress.progress,
      completedLessons: (progress.completedLessons || []).map(id => id.toString()),
      completedLessonsCount: (progress.completedLessons || []).length,
      totalLessons,
      completed: progress.completed,
      completedAt: progress.completedAt,
      lessonCompleted: lessonProgress.completed,
      videoCompleted: lessonProgress.videoCompleted
    });

  } catch (error) {
    console.error('Update video progress error:', error);
    res.status(500).json({ success: false, message: 'Failed to update progress' });
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
      return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
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
    res.status(500).json({ success: false, message: 'Failed to track material access' });
  }
};

// Get user's learning overview
export const getMyLearning = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .populate({
        path: 'enrolledCourses.courseId',
        // The full lesson content (video/file URLs) is not needed for the dashboard list.
        select: 'title thumbnail description category price discountedPrice instructor duration languages type isFree'
      })
      .populate({
        path: 'enrolledEvents.eventId',
        select: 'title description dateTime type duration meetingLink thumbnail'
      });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
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
      // Two progress systems exist (lesson progress in Progress, chapter progress on the
      // enrolment). Show whichever is further along so the dashboard matches the player.
      const lessonPct = progress?.progress || 0;
      const chapterPct = enrollment.progress || 0;
      const completed = Boolean(progress?.completed || enrollment.completed);
      const facts = course ? courseFacts(course) : null;

      return {
        course: enrollment.courseId,
        enrolledAt: enrollment.enrolledAt,
        progress: completed ? 100 : Math.max(lessonPct, chapterPct),
        completed,
        completedAt: progress?.completedAt || enrollment.completedAt,
        modules: facts?.modules || 0,
        durationLabel: facts?.durationLabel || '',
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
    res.status(500).json({ success: false, message: 'Failed to fetch learning data' });
  }
};
