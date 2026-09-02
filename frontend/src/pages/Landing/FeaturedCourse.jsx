import React from 'react';
import { Link } from 'react-router-dom';

export default function FeaturedCourse({ course, user, handleEnroll }) {
  if (!course) return null;

  const isEnrolled = user && user.enrolledCourses?.some(c => 
    c.courseId?._id === course._id || c.courseId === course._id
  );

  const features = [
    'Beginner friendly',
    'Age 10+',
    'Video-based learning',
    'Build a real website',
    'Learn AI-assisted coding',
    'Publish your website',
    'Lifetime access'
  ];

  return (
    <section className="featured-section" id="courses">
      <div className="container">
        <div className="section-label">START HERE</div>
        <h2 className="section-title">Your First Step Into AI-Powered Coding</h2>
        
        <div className="featured-card">
          <div className="featured-badge">⭐ BEST FOR BEGINNERS</div>
          
          <div className="featured-grid">
            <div className="featured-info">
              <h3 className="featured-title">{course.title || 'Start Coding with AI'}</h3>
              <div className="featured-price">₹{course.price || 499}</div>
              <ul className="featured-features">
                {features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
              <Link 
                to={user ? '/dashboard' : '/auth'} 
                className="btn btn-primary btn-lg"
                onClick={(e) => {
                  if (user) {
                    e.preventDefault();
                    if (isEnrolled) {
                      // Navigate to dashboard
                      window.location.href = '/dashboard';
                    } else {
                      handleEnroll(course, 'course');
                    }
                  }
                }}
              >
                {isEnrolled ? 'Go to Course →' : 'Get the Course — ₹499'}
              </Link>
            </div>

            <div className="featured-visual">
              <div className="featured-icon">🚀</div>
              <div className="featured-stats">
                <div className="stat">
                  <span className="stat-number">10+</span>
                  <span className="stat-label">Age</span>
                </div>
                <div className="stat">
                  <span className="stat-number">8</span>
                  <span className="stat-label">Modules</span>
                </div>
                <div className="stat">
                  <span className="stat-number">✓</span>
                  <span className="stat-label">Certificate</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}