import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import './CoursePreview.css';

export default function CoursePreview({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openChapter, setOpenChapter] = useState(null);
  const [selectedLang, setSelectedLang] = useState(null);

  useEffect(() => {
    api.getCourse(id)
      .then(data => {
        setCourse(data);
        setSelectedLang(data.languages?.[0] || 'English');
      })
      .catch(() => navigate('/all-courses'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleEnroll = () => {
    if (!localStorage.getItem('token')) {
      navigate('/auth');
      return;
    }
    const isEnrolled = user?.enrolledCourses?.some(
      c => (c.courseId?._id || c.courseId)?.toString() === id
    );
    if (isEnrolled) {
      navigate(`/course/${id}`);
    } else if (course.isFree || course.price === 0) {
      api.enrollFree(id).then(() => navigate(`/course/${id}`)).catch(e => alert(e.message));
    } else {
      navigate(`/checkout/${id}`);
    }
  };

  const isEnrolled = user?.enrolledCourses?.some(
    c => (c.courseId?._id || c.courseId)?.toString() === id
  );

  const displayPrice = course?.discountedPrice && course.discountedPrice < course.price
    ? course.discountedPrice
    : course?.price;

  const selectedContent = course?.content?.find(c => c.language === selectedLang) || course?.content?.[0];
  const chapters = selectedContent?.chapters || [];

  const totalLessons = chapters.length;
  const enrollBtnLabel = isEnrolled
    ? '▶ Continue Learning'
    : (course?.isFree || course?.price === 0 ? '🎯 Enroll Free' : `🛒 Enroll Now — ₹${displayPrice}`);

  if (loading) {
    return (
      <div className="cp-loading">
        <div className="cp-spinner" />
        <p>Loading course...</p>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="cp-page">
      {/* ─── Navbar ─── */}
      <header className="cp-navbar">
        <div className="cp-navbar-inner">
          <Link to="/" className="navbar-brand">
            <img src="/logo.svg" alt="WideTech Logo" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
            <span className="brand-name">WIDETECH</span>
          </Link>
          <nav className="cp-nav-links">
            <Link to="/all-courses" className="cp-nav-link">All Courses</Link>
            {user
              ? <Link to="/dashboard" className="cp-nav-link">Dashboard</Link>
              : <Link to="/auth" className="cp-btn-outline">Sign In</Link>
            }
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="cp-hero">
        <div className="cp-hero-inner">
          <div className="cp-hero-text">
            {course.category && <span className="cp-category-pill">{course.category}</span>}
            <h1 className="cp-hero-title">{course.title}</h1>
            <p className="cp-hero-desc">{course.description}</p>

            <div className="cp-hero-meta">
              <span className="cp-meta-badge">⭐ 4.8 rating</span>
              <span className="cp-meta-badge">👥 2,400+ students</span>
              <span className="cp-meta-badge">📚 {totalLessons} chapters</span>
              {course.languages?.length > 0 && (
                <span className="cp-meta-badge">🌐 {course.languages.join(', ')}</span>
              )}
            </div>

            <div className="cp-hero-cta">
              <div className="cp-price-block">
                {course.discountedPrice && course.discountedPrice < course.price ? (
                  <>
                    <span className="cp-price-original">₹{course.price}</span>
                    <span className="cp-price-current">₹{course.discountedPrice}</span>
                    <span className="cp-price-badge">
                      {Math.round((1 - course.discountedPrice / course.price) * 100)}% OFF
                    </span>
                  </>
                ) : (
                  <span className="cp-price-current">
                    {course.isFree || course.price === 0 ? 'Free' : `₹${course.price}`}
                  </span>
                )}
              </div>
              <button className="cp-enroll-btn" onClick={handleEnroll}>{enrollBtnLabel}</button>
              <p className="cp-guarantee">✅ 30-day money-back guarantee</p>
            </div>
          </div>

          <div className="cp-hero-visual">
            <div className="cp-vsl-card">
              <img
                src={course.thumbnail || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80'}
                alt={course.title}
                className="cp-thumbnail"
              />
              <div className="cp-vsl-overlay">
                <div className="cp-play-btn">▶</div>
                <span className="cp-play-label">Watch Free Preview</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Outcomes ─── */}
      {course.outcomes?.length > 0 && (
        <section className="cp-section cp-outcomes-section">
          <div className="cp-container">
            <h2 className="cp-section-title">What You'll Learn</h2>
            <div className="cp-outcomes-grid">
              {course.outcomes.map((o, i) => (
                <div key={i} className="cp-outcome-item">
                  <span className="cp-outcome-check">✓</span>
                  <span>{o}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Syllabus ─── */}
      <section className="cp-section">
        <div className="cp-container">
          <h2 className="cp-section-title">Course Content</h2>

          {/* Language Tabs */}
          {course.languages?.length > 1 && (
            <div className="cp-lang-tabs">
              {course.languages.map(lang => (
                <button
                  key={lang}
                  className={`cp-lang-tab ${selectedLang === lang ? 'active' : ''}`}
                  onClick={() => setSelectedLang(lang)}
                >
                  🌐 {lang}
                </button>
              ))}
            </div>
          )}

          <div className="cp-accordion">
            {chapters.map((ch, idx) => (
              <div key={idx} className={`cp-accordion-item ${openChapter === idx ? 'open' : ''}`}>
                <button
                  className="cp-accordion-header"
                  onClick={() => setOpenChapter(openChapter === idx ? null : idx)}
                >
                  <div className="cp-accordion-left">
                    <span className="cp-chapter-num">{String(idx + 1).padStart(2, '0')}</span>
                    <span className="cp-chapter-title">{ch.title}</span>
                  </div>
                  <div className="cp-accordion-right">
                    {ch.duration && <span className="cp-chapter-dur">⏱ {ch.duration}</span>}
                    <span className="cp-accordion-arrow">{openChapter === idx ? '▲' : '▼'}</span>
                  </div>
                </button>
                {openChapter === idx && (
                  <div className="cp-accordion-body">
                    {ch.description && <p className="cp-chapter-desc">{ch.description}</p>}
                    {ch.materials?.length > 0 && (
                      <ul className="cp-materials-list">
                        {ch.materials.map((m, mi) => (
                          <li key={mi} className="cp-material-item">
                            <span className="cp-material-icon">
                              {m.type === 'video' ? '📹' : m.type === 'pdf' ? '📄' : '📎'}
                            </span>
                            <span>{m.title || m.type}</span>
                            {idx === 0 && (
                              <span className="cp-free-pill">Free Preview</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {!ch.materials?.length && (
                      <p className="cp-chapter-locked">🔒 Enroll to access this chapter</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Instructor ─── */}
      <section className="cp-section cp-instructor-section">
        <div className="cp-container">
          <h2 className="cp-section-title">Your Instructor</h2>
          <div className="cp-instructor-card">
            <div className="cp-instructor-avatar">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
                alt="Instructor"
              />
            </div>
            <div className="cp-instructor-info">
              <h3 className="cp-instructor-name">WIDETECHNOS Team</h3>
              <p className="cp-instructor-title">AI Education Specialists</p>
              <div className="cp-instructor-stats">
                <span>⭐ 4.8 avg rating</span>
                <span>👥 15,000+ students</span>
                <span>📚 12 courses</span>
              </div>
              <p className="cp-instructor-bio">
                WIDETECHNOS Academy is dedicated to making cutting-edge AI education accessible to everyone —
                from beginners to professionals. Our team of AI practitioners brings real-world experience
                into every course.
              </p>
              <div className="cp-instructor-social">
                <a href="https://instagram.com/widetechai" target="_blank" rel="noopener noreferrer" className="cp-social-link">
                  📸 @widetechai
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Reviews ─── */}
      <section className="cp-section">
        <div className="cp-container">
          <h2 className="cp-section-title">Student Reviews</h2>
          <div className="cp-reviews-summary">
            <div className="cp-rating-big">4.8</div>
            <div className="cp-stars-big">⭐⭐⭐⭐⭐</div>
            <p className="cp-rating-label">Course Rating</p>
          </div>
          <div className="cp-reviews-grid">
            {[
              { name: 'Priya S.', rating: 5, text: 'Absolutely brilliant course! The explanations are crystal clear and the content is very practical. Highly recommend for anyone getting into AI.' },
              { name: 'Arjun M.', rating: 5, text: 'I was a complete beginner and this course made AI feel approachable. The multi-language support is a huge bonus!' },
              { name: 'Fatima R.', rating: 4, text: 'Great content and well structured. The certificate at the end was a great touch. Looking forward to more courses from WIDETECHNOS.' },
            ].map((r, i) => (
              <div key={i} className="cp-review-card">
                <div className="cp-review-header">
                  <div className="cp-review-avatar">{r.name[0]}</div>
                  <div>
                    <div className="cp-review-name">{r.name}</div>
                    <div className="cp-review-stars">{'⭐'.repeat(r.rating)}</div>
                  </div>
                  <span className="cp-verified-badge">✓ Verified</span>
                </div>
                <p className="cp-review-text">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Sticky Buy Bar (Mobile) ─── */}
      <div className="cp-sticky-bar">
        <div className="cp-sticky-inner">
          <div className="cp-sticky-price">
            {course.isFree || course.price === 0 ? (
              <span className="cp-sticky-price-current">Free</span>
            ) : (
              <>
                {course.discountedPrice && course.discountedPrice < course.price && (
                  <span className="cp-sticky-price-original">₹{course.price}</span>
                )}
                <span className="cp-sticky-price-current">₹{displayPrice}</span>
              </>
            )}
          </div>
          <button className="cp-sticky-btn" onClick={handleEnroll}>{enrollBtnLabel}</button>
        </div>
      </div>
    </div>
  );
}
