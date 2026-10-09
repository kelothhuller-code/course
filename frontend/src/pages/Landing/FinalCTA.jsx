import React from 'react';
import { Link } from 'react-router-dom';

export default function FinalCTA({ user, handleEnroll, featuredCourse }) {
  return (
    <section className="final-cta">
      <div className="container">
        <h2>Your AI Journey Can Start Today.</h2>
        <p>You don't need to know everything before you start. You just need to start.</p>
        <div className="cta-buttons">
          {featuredCourse ? (
            <Link 
              to={user ? '/dashboard' : '/auth'} 
              className="btn btn-primary btn-lg"
              onClick={(e) => {
                if (user && featuredCourse) {
                  e.preventDefault();
                  handleEnroll(featuredCourse, 'course');
                }
              }}
            >
              {featuredCourse.title} — {featuredCourse.isFree ? 'Free' : `₹${featuredCourse.discountedPrice || featuredCourse.price}`}
            </Link>
          ) : (
            <a href="#courses" className="btn btn-primary btn-lg">
              Explore All Courses →
            </a>
          )}
          <a href="#trials" className="btn btn-secondary btn-lg">
            Watch a Free Tutorial
          </a>
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