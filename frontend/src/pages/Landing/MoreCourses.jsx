import React from 'react';
import { Link } from 'react-router-dom';
import { getMediaUrl, FALLBACK_COURSE_THUMBNAIL } from '../../utils/media';
import { getCoursePrice, isEnrolledIn } from '../../config/site';

/**
 * Compact "also available" strip used instead of the full course-library grid when the
 * catalogue only has one or two courses besides the featured one. A big "Explore Our Course
 * Library" grid with a single card looked empty and pulled attention away from the main offer.
 */
export default function MoreCourses({ courses = [], user }) {
  if (!courses.length) return null;
  return (
    <section className="more-courses-section" id="courses" aria-labelledby="more-courses-title">
      <div className="container">
        <h2 className="more-courses-title" id="more-courses-title">Also available</h2>
        <ul className="more-courses-list">
          {courses.map((course) => {
            const price = getCoursePrice(course);
            const enrolled = isEnrolledIn(user, course);
            return (
              <li key={course._id} className="more-course">
                <img
                  src={getMediaUrl(course.thumbnail) || FALLBACK_COURSE_THUMBNAIL}
                  alt=""
                  width="96"
                  height="54"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_COURSE_THUMBNAIL; }}
                />
                <div className="more-course-info">
                  <h3>{course.title}</h3>
                  <p>
                    {price.isFree ? 'Free' : price.label}
                    {course.languages?.length > 0 && ` · ${course.languages.join(', ')}`}
                  </p>
                </div>
                <Link className="btn btn-secondary btn-sm" to={enrolled ? `/course/${course._id}` : `/sale/${course._id}`}>
                  {enrolled ? 'Open →' : price.isFree ? 'Start free →' : 'View →'}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
