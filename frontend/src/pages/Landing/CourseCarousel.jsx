import React, { useCallback, useEffect, useRef, useState } from 'react';
import './CourseCarousel.css';
import { Link } from 'react-router-dom';
import CourseSalesCard from '../../components/CourseSalesCard';

/**
 * "Top courses" section shown right after the hero.
 * Courses come from GET /api/courses/showcase?limit=3 (featured → admin-pinned → best-selling →
 * newest), so nothing here is tied to a particular course.
 * Desktop/tablet: a plain responsive grid (3 cards side by side, no scrolling).
 * Mobile (≤ 720px): the same list becomes a native horizontal scroll row with scroll-snap
 * and a peeking next card; it is focusable so keyboard users can scroll it with arrow keys.
 */
export default function CourseCarousel({ courses = [], total = 0, user, loading = false }) {
  const trackRef = useRef(null);
  const [scrollState, setScrollState] = useState({ overflow: false });

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // Only true on mobile, where the grid turns into a scroll row
    const overflow = el.scrollWidth - el.clientWidth > 4;
    setScrollState((prev) => (prev.overflow === overflow ? prev : { overflow }));
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [updateScrollState, courses.length, loading]);

  if (!loading && courses.length === 0) return null;

  const single = courses.length === 1;
  const moreCount = total > courses.length ? total - courses.length : 0;

  return (
    <section
      className={`course-carousel-section${single ? ' is-single' : ''}`}
      id="courses"
      aria-labelledby="course-carousel-title"
    >
      <div className="container">
        <div className="course-carousel-header">
          <div>
            <div className="section-label">{single ? 'OUR COURSE' : 'TOP COURSES'}</div>
            <h2 className="course-carousel-title" id="course-carousel-title">
              {single ? 'Start Learning Today' : 'Pick Your Course & Start Today'}
            </h2>
            <p className="course-carousel-subtitle">
              Instant access after a secure Razorpay checkout · Prices include GST · Lifetime access
            </p>
          </div>
        </div>

        {loading ? (
          <div className="course-carousel-track" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="course-carousel-item">
                <div className="course-carousel-skeleton" />
              </div>
            ))}
          </div>
        ) : (
          <ul
            ref={trackRef}
            id="course-carousel-track"
            className="course-carousel-track"
            // Focusable so keyboard users can scroll it with the arrow keys
            tabIndex={scrollState.overflow ? 0 : undefined}
            aria-label={`${courses.length} course${courses.length === 1 ? '' : 's'}${scrollState.overflow ? ', scroll horizontally for more' : ''}`}
          >
            {courses.map((course, index) => (
              <li key={course._id} className="course-carousel-item">
                <CourseSalesCard course={course} user={user} source="landing_carousel" priority={index === 0} />
              </li>
            ))}
          </ul>
        )}

        <div className="course-carousel-footer">
          <Link to="/all-courses" className="btn btn-secondary btn-lg course-carousel-viewall">
            View all courses{moreCount > 0 ? ` (${total})` : ''} →
          </Link>
        </div>
      </div>
    </section>
  );
}
