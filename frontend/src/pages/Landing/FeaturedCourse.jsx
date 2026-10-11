import React from 'react';
import { Link } from 'react-router-dom';

export default function FeaturedCourse({ course, user, handleEnroll }) {
  const isEnrolled = course && user && user.enrolledCourses?.some(c => 
    c.courseId?._id === course._id || c.courseId === course._id
  );

  const defaultFeatures = [
    'Beginner friendly',
    'Age 10+',
    'Video-based learning',
    'Build a real website',
    'Learn AI-assisted coding',
    'Publish your website',
    'Lifetime access'
  ];

  // If a specific course is highlighted from backend
  if (course) {
    const displayPrice = course.isFree ? 'Free' : (course.discountedPrice ? `₹${course.discountedPrice}` : `₹${course.price || 0}`);
    const originalPrice = (!course.isFree && course.discountedPrice && course.price > course.discountedPrice) ? `₹${course.price}` : null;
    const features = (course.outcomes && course.outcomes.length > 0) ? course.outcomes : defaultFeatures;
    const chapterCount = (course.content || []).reduce((n, lang) => n + (lang.chapters?.length || 0), 0) || 8;

    return (
      <section className="featured-section" id="featured-program">
        <div className="container">
          <div className="section-label">FEATURED PROGRAM</div>
          <h2 className="section-title">Your First Step Into AI-Powered Coding</h2>
          
          <div className="featured-card">
            <div className="featured-badge">⭐ {course.packageType ? `${course.packageType.toUpperCase()} PROGRAM` : 'HIGHLIGHTED COURSE'}</div>
            
            <div className="featured-grid">
              <div className="featured-info">
                <h3 className="featured-title">{course.title}</h3>
                <div className="featured-price" style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                  <span>{displayPrice}</span>
                  {originalPrice && (
                    <span style={{ fontSize: '1.1rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                      {originalPrice}
                    </span>
                  )}
                </div>
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
                  <a href="#curriculum" className="btn btn-secondary btn-lg">
                    View Curriculum ↓
                  </a>
                </div>
              </div>

              <div className="featured-visual">
                <div className="featured-icon">🚀</div>
                <div className="featured-stats">
                  <div className="stat">
                    <span className="stat-number">10+</span>
                    <span className="stat-label">Age</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">{chapterCount}</span>
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