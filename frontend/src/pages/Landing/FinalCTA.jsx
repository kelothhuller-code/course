import React from 'react';
import { Link } from 'react-router-dom';

export default function FinalCTA({ user, handleEnroll, featuredCourse }) {
  return (
    <section className="final-cta">
      <div className="container">
        <h2>Your Journey Can Start Today.</h2>
        <p>You don't need to know everything before you start. You just need to start.</p>
        <div className="cta-buttons">
          {featuredCourse ? (
            <Link 
              to={user && user.enrolledCourses?.some(c => (c.courseId?._id || c.courseId)?.toString() === featuredCourse._id?.toString()) ? '/dashboard' : `/sale/${featuredCourse._id}`} 
              className="btn btn-primary btn-lg final-cta-course-btn"
              title={featuredCourse.title}
              onClick={(e) => {
                if (user && user.enrolledCourses?.some(c => (c.courseId?._id || c.courseId)?.toString() === featuredCourse._id?.toString())) {
                  e.preventDefault();
                  window.location.href = '/dashboard';
                }
              }}
            >
              <span className="final-cta-btn-title">{featuredCourse.title}</span>
              <span className="final-cta-btn-badge">
                {featuredCourse.isFree ? 'Free' : `₹${featuredCourse.discountedPrice || featuredCourse.price}`}
              </span>
            </Link>
          ) : (
            <Link to="/all-courses" className="btn btn-primary btn-lg">
              Explore All Courses →
            </Link>
          )}
          <Link to={user ? "/dashboard" : "/auth"} className="btn btn-secondary btn-lg">
            Watch a Free Tutorial
          </Link>
        </div>
        <div className="trust-tags">
          <span>✓ Beginner friendly</span>
          <span>✓ Age 10+</span>
          <span>✓ Learn by building</span>
        </div>
      </div>
    </section>
  );
}