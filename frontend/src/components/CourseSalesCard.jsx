import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMediaUrl, FALLBACK_COURSE_THUMBNAIL } from '../utils/media';
import { getCoursePrice, isEnrolledIn, countChapters } from '../config/site';
import tracker from '../utils/tracker';
import './CourseSalesCard.css';

const BADGE_ICONS = { Featured: '⭐', Bestseller: '🔥', Free: '🎁' };

/** One short benefit line: first outcome, else the sales sub-headline, else the description. */
const benefitLine = (course) =>
  String((course.outcomes || []).find(Boolean) || course.salesPageConfig?.subheadline || course.description || '').trim();

/**
 * Buy-focused course card used by the landing carousel and the all-courses page.
 * Everything shown comes from the course data: badges, rating and student count only
 * appear when /api/courses/showcase returns real values for them.
 */
export default function CourseSalesCard({ course, user, source = 'course_card', headingLevel = 3, priority = false }) {
  const navigate = useNavigate();
  const price = getCoursePrice(course) || { isFree: true, label: 'Free' };
  const enrolled = isEnrolledIn(user, course);
  const salesUrl = `/sale/${course.salesPageConfig?.slug || course._id}`;
  const chapters = course.showcase?.chapterCount || countChapters(course);
  const badges = course.showcase?.badges || (course.isFeatured ? ['Featured'] : []);
  const rating = course.showcase?.rating;
  const students = course.showcase?.students;
  const Heading = `h${headingLevel}`;
  const benefit = benefitLine(course);

  const onBuy = () => {
    if (enrolled) {
      navigate(`/course/${course._id}`);
      return;
    }
    if (price.isFree) {
      // Free courses are opened from their sales page (handles free enrolment)
      navigate(salesUrl);
      return;
    }
    tracker.trackEvent('buy_click', { courseId: course._id, source });
    navigate(`/checkout/${course._id}`);
  };

  const primaryLabel = enrolled ? 'Continue learning →' : price.isFree ? 'Start free →' : `Buy Now — ${price.label}`;

  return (
    <article className="sales-card" aria-label={course.title}>
      <Link to={salesUrl} className="sales-card-media" tabIndex={-1} aria-hidden="true">
        <img
          src={getMediaUrl(course.thumbnail) || FALLBACK_COURSE_THUMBNAIL}
          alt=""
          width="640"
          height="360"
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_COURSE_THUMBNAIL; }}
        />
        {badges.length > 0 && (
          <span className="sales-card-badges">
            {badges.map((b) => (
              <span key={b} className={`sales-card-badge sales-card-badge--${b.toLowerCase()}`}>
                {BADGE_ICONS[b] || ''} {b}
              </span>
            ))}
          </span>
        )}
      </Link>

      <div className="sales-card-body">
        {course.category && <p className="sales-card-category">{course.category}</p>}
        <Heading className="sales-card-title">
          <Link to={salesUrl}>{course.title}</Link>
        </Heading>
        {benefit && <p className="sales-card-benefit">✓ {benefit}</p>}

        <ul className="sales-card-facts">
          {rating && (
            <li className="sales-card-rating" aria-label={`Rated ${rating.average} out of 5 from ${rating.count} review${rating.count === 1 ? '' : 's'}`}>
              <span aria-hidden="true">★ {rating.average.toFixed(1)}</span>
              <span className="sales-card-muted" aria-hidden="true"> ({rating.count})</span>
            </li>
          )}
          {students && <li>👥 {students.toLocaleString('en-IN')} students</li>}
          {chapters > 0 && <li>📚 {chapters} module{chapters === 1 ? '' : 's'}</li>}
          {course.languages?.length > 0 && <li>🌐 {course.languages.slice(0, 2).join(' · ')}</li>}
        </ul>

        <div className="sales-card-footer">
          <div className="sales-card-price">
            <span className="sales-card-price-now">{price.label}</span>
            {price.original && (
              <s className="sales-card-price-was" aria-label={`Original price ₹${price.original}`}>₹{price.original}</s>
            )}
            {!price.isFree && <span className="sales-card-price-note">incl. GST</span>}
          </div>
          <button type="button" className="btn btn-primary sales-card-buy" onClick={onBuy}>
            {primaryLabel}
          </button>
          <Link to={salesUrl} className="sales-card-details">
            View details<span className="sr-only"> about {course.title}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
