// Landing/CourseGrid.jsx - Update the view all button
import React from 'react';
import { useNavigate } from 'react-router-dom';

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
    <section className="course-grid-section" id="all-courses">
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
            return (
              <div key={course._id || Math.random()} className="course-card">
                <div className="card-img">
                  <img 
                    src={course.thumbnail || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80'} 
                    alt={course.title || 'Course'} 
                    loading="lazy"
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
                    <div className="card-price">₹{course.price || 0}</div>
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={() => handleEnroll(course, 'course')}
                    >
                      {isEnrolled ? '📖 Continue' : '🎯 Enroll'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="course-grid-footer">
          <span className="course-count">
            Showing {Math.min(courseList.length, 6)} of {pagination?.totalItems || courseList.length} courses
          </span>
          <button onClick={handleViewAllClick} className="btn btn-secondary">
            View All {pagination?.totalItems || courseList.length} Courses →
          </button>
        </div>
      </div>
    </section>
  );
}