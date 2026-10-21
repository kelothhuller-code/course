import React from 'react';
import { Link } from 'react-router-dom';
import { getCoursePrice, isEnrolledIn, openEnquiry } from '../../config/site';

export default function FinalCTA({ user, featuredCourse }) {
  const price = getCoursePrice(featuredCourse);
  const enrolled = isEnrolledIn(user, featuredCourse);

  return (
    <section className="final-cta" aria-labelledby="final-cta-title">
      <div className="container">
        <h2 id="final-cta-title">{featuredCourse && !enrolled ? 'Ready to Get Started?' : 'Your Journey Can Start Today.'}</h2>
        <p>
          {featuredCourse
            ? <>Get <strong>{featuredCourse.title}</strong> today — instant access after a secure checkout.</>
            : "You don't need to know everything before you start. You just need to start."}
        </p>
        <div className="cta-buttons">
          {featuredCourse ? (
            <Link
              to={enrolled ? `/course/${featuredCourse._id}` : `/sale/${featuredCourse._id}`}
              className="btn btn-primary btn-lg final-cta-course-btn"
              title={featuredCourse.title}
            >
              <span className="final-cta-btn-title">
                {enrolled ? 'Continue Learning' : price.isFree ? 'Start Learning Free' : 'Get Instant Access'}
              </span>
              {!enrolled && <span className="final-cta-btn-badge">{price.label}</span>}
            </Link>
          ) : (
            <Link to="/all-courses" className="btn btn-primary btn-lg">
              Explore All Courses →
            </Link>
          )}
          <button type="button" className="btn btn-secondary btn-lg" onClick={() => openEnquiry('Course')}>
            Ask a Question
          </button>
        </div>
        <div className="trust-tags">
          <span>✓ Instant access</span>
          <span>✓ Lifetime access</span>
          <span>✓ Prices incl. GST</span>
          <span>✓ Secure Razorpay checkout</span>
        </div>
      </div>
    </section>
  );
}
