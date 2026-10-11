// Landing/CourseGrid.jsx - Update the view all button
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getMediaUrl, FALLBACK_COURSE_THUMBNAIL } from '../../utils/media';

export default function CourseGrid({ 
  courses = [], 
  user, 
  handleEnroll, 
  pagination, 
  onPageChange,
  onShowAll,
  onShowPaginated,
  showAll 
}) {
  const navigate = useNavigate();
  
  // Ensure courses is an array
  const courseList = Array.isArray(courses) ? courses : [];
  
  if (courseList.length === 0) {
    return (
      <section className="course-grid-section">
        <div className="container">
          <div className="section-label">COURSES</div>
          <h2 className="section-title">Explore Our Courses</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
            No courses available at the moment. Please check back later.
          </p>
        </div>
      </section>
    );
  }

  const handleViewAllClick = () => {
    navigate('/all-courses');
  };

  return (
    <section className="course-grid-section" id="courses">
      <div className="container">
        <div className="course-grid-header">
          <div>
            <div className="section-label">ALL COURSES</div>
            <h2 className="section-title">Explore Our Course Library</h2>
          </div>
          <div className="course-grid-actions">
            <button onClick={handleViewAllClick} className="btn btn-primary btn-sm">
              View All Courses →
            </button>
          </div>
        </div>

        <div className="course-grid">
          {courseList.slice(0, 6).map(course => {
            const isEnrolled = user && user.enrolledCourses?.some(c => 
              c.courseId?._id === course._id || c.courseId === course._id
            );
            const hasDiscount = course.discountedPrice && course.discountedPrice < course.price;

            const handleCardClick = () => {
              if (isEnrolled) {
                navigate(`/course/${course._id}`);
              } else {
                navigate(`/sale/${course._id}`);
              }
            };

            return (
              <div 
                key={course._id || Math.random()} 
                className="course-card"
                onClick={handleCardClick}
                style={{ cursor: 'pointer' }}
                title={`View ${course.title || 'Course'} details`}
              >
                <div className="card-img">
                  <img 
                    src={getMediaUrl(course.thumbnail) || FALLBACK_COURSE_THUMBNAIL} 
                    alt={course.title || 'Course'} 
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = FALLBACK_COURSE_THUMBNAIL;
                    }}
                  />
                  {course.category && (
                    <span className="card-tag">{course.category}</span>
                  )}
                </div>
                <div className="course-card-content">
                  <h3 className="card-title">{course.title || 'Untitled Course'}</h3>
                  <p className="card-desc">{course.description || 'No description available'}</p>
                  <div className="card-languages">
                    {course.languages?.slice(0, 3).map(lang => (
                      <span key={lang} className="language-pill">🌐 {lang}</span>
                    ))}
                  </div>
                  <div className="card-meta">
                    <div className="card-price">
                      {hasDiscount ? (
                        <span>
                          <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.85rem', marginRight: '0.35rem' }}>
                            ₹{course.price}
                          </span>
                          ₹{course.discountedPrice}
                        </span>
                      ) : (
                        <span>{course.isFree || course.price === 0 ? 'Free' : `₹${course.price || 0}`}</span>
                      )}
                    </div>
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEnroll(course, 'course');
                      }}
                    >
                      {isEnrolled ? '📖 Continue' : (course.isFree || course.price === 0 ? '🎯 Enroll Free' : '🛒 View Details')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* <div className="course-grid-footer">
          {/* <span className="course-count">
            Showing {Math.min(courseList.length, 6)} of {pagination?.totalItems || courseList.length} courses
          </span> */}
          {/* <button onClick={handleViewAllClick} className="btn btn-secondary">
            View All {pagination?.totalItems || courseList.length} Courses →
          </button> *
        </div> */}
      </div>
    </section>
  );
}