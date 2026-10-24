import Course from '../models/Course.js';
import Transaction from '../models/Transaction.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { sanitizePublicCourse } from './publicCourse.js';

// Social-proof thresholds for the landing carousel / all-courses cards. Below these the
// number is simply not shown (a "2 students" label hurts more than it helps).
const SHOWCASE_MIN_STUDENTS_TO_SHOW = 10;
const SHOWCASE_MIN_SALES_FOR_BESTSELLER = 5;

/**
 * Ordered "major courses" for the landing carousel and the all-courses page (shared by
 * GET /api/courses/showcase and GET /api/home). Returns { courses, total }.
 * Order: featured -> admin-pinned (landingOrder 1, 2, ...) -> paid before free -> most sales -> newest.
 * With a limit, courses with landingOrder -1 are skipped.
 */
export const buildCourseShowcase = async (limit = null) => {
  const courses = await Course.find({}).select('-content.chapters.videoUrl').lean();
  const ids = courses.map(c => c._id);

  const [salesAgg, reviewAgg, studentAgg] = await Promise.all([
    Transaction.aggregate([
      { $match: { itemType: 'course', status: 'success', itemId: { $in: ids } } },
      { $group: { _id: '$itemId', count: { $sum: 1 } } }
    ]),
    Review.aggregate([
      { $match: { courseId: { $in: ids }, approved: true } },
      { $group: { _id: '$courseId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]),
    User.aggregate([
      { $unwind: '$enrolledCourses' },
      { $match: { 'enrolledCourses.courseId': { $in: ids } } },
      { $group: { _id: '$enrolledCourses.courseId', count: { $sum: 1 } } }
    ])
  ]);
  const toMap = (rows) => new Map(rows.map(r => [String(r._id), r]));
  const sales = toMap(salesAgg);
  const reviews = toMap(reviewAgg);
  const students = toMap(studentAgg);

  const isFreeCourse = (c) => c.isFree || !c.price;
  const salesOf = (c) => sales.get(String(c._id))?.count || 0;

  // "Bestseller" only when backed by real sales: the single top seller with enough sales
  const ranked = courses.filter(c => !isFreeCourse(c)).sort((a, b) => salesOf(b) - salesOf(a));
  const bestsellerId = ranked[0] && salesOf(ranked[0]) >= SHOWCASE_MIN_SALES_FOR_BESTSELLER &&
    (!ranked[1] || salesOf(ranked[0]) > salesOf(ranked[1])) ? String(ranked[0]._id) : null;

  const pinned = (c) => (Number.isFinite(c.landingOrder) && c.landingOrder > 0 ? c.landingOrder : Infinity);
  const sorted = [...courses].sort((a, b) =>
    (Number(b.isFeatured) - Number(a.isFeatured)) ||
    (pinned(a) - pinned(b)) ||
    (Number(isFreeCourse(a)) - Number(isFreeCourse(b))) ||
    (salesOf(b) - salesOf(a)) ||
    (new Date(b.createdAt) - new Date(a.createdAt))
  );

  const eligible = limit ? sorted.filter(c => c.landingOrder !== -1) : sorted;
  const selected = limit ? eligible.slice(0, limit) : eligible;

  const result = selected.map((c) => {
    const pub = sanitizePublicCourse(c);
    const r = reviews.get(String(c._id));
    const studentCount = students.get(String(c._id))?.count || 0;
    const badges = [];
    if (c.isFeatured) badges.push('Featured');
    if (bestsellerId === String(c._id)) badges.push('Bestseller');
    if (isFreeCourse(c)) badges.push('Free');
    pub.showcase = {
      badges,
      // Real numbers only; omitted entirely when there is no data (no placeholder ratings)
      rating: r && r.count > 0 ? { average: Math.round(r.avg * 10) / 10, count: r.count } : null,
      students: studentCount >= SHOWCASE_MIN_STUDENTS_TO_SHOW ? studentCount : null,
      chapterCount: new Set((c.content || []).flatMap(l => (l.chapters || []).map(ch => (ch.title || '').trim()).filter(Boolean))).size
    };
    delete pub.affiliateCommission;
    return pub;
  });

  return { courses: result, total: courses.length };
};

/** The admin-highlighted course for the homepage (public fields only), or null. */
export const getFeaturedCourse = async () => {
  // Not .lean(): one document, and hydrating keeps schema defaults (e.g. gstConfig fields)
  // identical to what /api/courses/featured has always returned.
  const featuredCourse = await Course.findOne({ isFeatured: true })
    .select('-content.chapters.videoUrl');
  return sanitizePublicCourse(featuredCourse);
};
