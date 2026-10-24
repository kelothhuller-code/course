import React from 'react';
import { Link } from 'react-router-dom';
import { countChapters } from '../../config/site';

export default function FeaturedCourse({ course, user }) {
  const isEnrolled = course && user && user.enrolledCourses?.some(c => 
    c.courseId?._id === course._id || c.courseId === course._id
  );

  // Universal fallback, only used when the course has no outcomes filled in (admin → course → outcomes)
  const defaultFeatures = [
    'Self-paced — go through it whenever it suits you',
    'Instant access right after payment',
    'Lifetime access from your dashboard',
    'Works on mobile, tablet and desktop'
  ];

  // If a specific course is highlighted from backend
  if (course) {
    const displayPrice = course.isFree ? 'Free' : (course.discountedPrice ? `₹${course.discountedPrice}` : `₹${course.price || 0}`);
    const originalPrice = (!course.isFree && course.discountedPrice && course.price > course.discountedPrice) ? `₹${course.price}` : null;
    const features = (course.outcomes && course.outcomes.length > 0) ? course.outcomes : defaultFeatures;
    // Real module count only — never show an invented number
    const chapterCount = countChapters(course);
    const hasCurriculum = chapterCount > 0 || (course.outcomes && course.outcomes.length > 0);

    return (
      <section className="featured-section" id="featured-program">
        <div className="container">
          <div className="section-label">FEATURED PROGRAM</div>
          <h2 className="section-title">Everything You Get</h2>
          
          <div className="featured-card">
            <div className="featured-badge">⭐ {course.packageType ? `${course.packageType.toUpperCase()} PROGRAM` : 'HIGHLIGHTED COURSE'}</div>
            
            <div className="featured-grid">
              <div className="featured-info">
                <h3 className="featured-title" style={{
                  fontSize: 'clamp(1.25rem, 3.5vw, 1.85rem)',
                  lineHeight: 1.3,
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  margin: '0.25rem 0 0.75rem 0'
                }}>
                  {course.title}
                </h3>
                <div className="featured-price" style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                  <span>{displayPrice}</span>
                  {originalPrice && (
                    <span style={{ fontSize: '1.1rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                      {originalPrice}
                    </span>
                  )}
                </div>
                {!course.isFree && (
                  <p className="featured-price-note">
                    Price includes 18% GST · Secure Razorpay checkout · Instant access · Lifetime access
                  </p>
                )}
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.25rem', lineHeight: '1.6' }}>
                  {course.description}
                </p>
                <ul className="featured-features">
                  {features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
                <div className="featured-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '1.25rem' }}>
                  <Link 
                    to={isEnrolled ? '/dashboard' : `/sale/${course._id}`} 
                    className="btn btn-primary btn-lg"
                    onClick={(e) => {
                      if (isEnrolled) {
                        e.preventDefault();
                        window.location.href = '/dashboard';
                      }
                    }}
                  >
                    {isEnrolled ? 'Go to Course →' : (course.isFree ? 'Start Learning — Free' : `Get the Course — ${displayPrice}`)}
                  </Link>
                  {hasCurriculum && (
                    <a href="#curriculum" className="btn btn-secondary btn-lg">
                      View Curriculum ↓
                    </a>
                  )}
                </div>
              </div>

              <div className="featured-visual">
                <div className="featured-icon">🚀</div>
                <div className="featured-stats">
                  {course.languages?.length > 0 && (
                    <div className="stat">
                      <span className="stat-number" style={{ fontSize: course.languages.length > 1 ? undefined : '1.1rem' }}>
                        {course.languages.length > 1 ? course.languages.length : course.languages[0]}
                      </span>
                      <span className="stat-label">{course.languages.length > 1 ? 'Languages' : 'Language'}</span>
                    </div>
                  )}
                  {chapterCount > 0 && (
                    <div className="stat">
                      <span className="stat-number">{chapterCount}</span>
                      <span className="stat-label">Modules</span>
                    </div>
                  )}
                  <div className="stat">
                    <span className="stat-number">∞</span>
                    <span className="stat-label">Lifetime access</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Fallback when NO course is highlighted in the backend
  return (
    <section className="featured-section" id="featured-program">
      <div className="container">
        <div className="section-label">AI ACADEMY</div>
        <h2 className="section-title">Master Practical AI & Web Engineering</h2>
        
        <div className="featured-card">
          <div className="featured-badge">🚀 EXPERT-LED CURRICULUM</div>
          
          <div className="featured-grid">
            <div className="featured-info">
              <h3 className="featured-title">Next-Gen Hands-On AI Programs</h3>
              <div className="featured-price" style={{ fontSize: '1.4rem' }}>
                Self-Paced & Interactive Workshops
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.25rem', lineHeight: '1.6' }}>
                Learn how to build real-world software, automate workflows, and deploy live applications using AI as your creative partner.
              </p>
              <ul className="featured-features">
                <li>Beginner to advanced AI roadmaps</li>
                <li>Build and publish live web projects</li>
                <li>Master modern prompt engineering & workflows</li>
                <li>Live interactive workshops & masterclasses</li>
                <li>Verified certificates of completion</li>
              </ul>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                <Link to="/all-courses" className="btn btn-primary btn-lg">
                  Explore All Courses →
                </Link>
                <Link to={user ? "/dashboard" : "/auth"} className="btn btn-secondary btn-lg">
                  Watch Free Tutorials
                </Link>
              </div>
            </div>

            <div className="featured-visual">
              <div className="featured-icon">💡</div>
              <div className="featured-stats">
                <div className="stat">
                  <span className="stat-number">100%</span>
                  <span className="stat-label">Practical</span>
                </div>
                <div className="stat">
                  <span className="stat-number">Live</span>
                  <span className="stat-label">Events</span>
                </div>
                <div className="stat">
                  <span className="stat-number">✓</span>
                  <span className="stat-label">Certificates</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}