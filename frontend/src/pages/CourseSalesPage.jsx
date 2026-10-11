import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import NavHeader from './NavHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import TrustBadges from '../components/TrustBadges';
import CourseReviews from '../components/CourseReviews';
import { getMediaUrl, FALLBACK_COURSE_THUMBNAIL } from '../utils/media';
import './CourseSalesPage.css';

export default function CourseSalesPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFaq, setActiveFaq] = useState(null);
  const [enrollingFree, setEnrollingFree] = useState(false);

  useEffect(() => {
    const fetchSalesPage = async () => {
      try {
        setLoading(true);
        const res = await api.getCourseSalesPage(id);
        setData(res);
      } catch (err) {
        console.error('Error loading course sales page:', err);
        // Fallback to normal course fetch if sales endpoint errs
        try {
          const courseData = await api.getCourse(id);
          setData({
            course: courseData,
            salesPageConfig: courseData.salesPageConfig || {
              headline: courseData.title,
              subheadline: courseData.description,
              highlights: courseData.outcomes || [],
              badgeText: courseData.isFree ? 'FREE COURSE' : '18% GST INCLUSIVE',
              ctaText: courseData.isFree ? 'Enroll Now Free' : 'Get Instant Access'
            }
          });
        } catch (e2) {
          alert('Course sales page not found');
          navigate('/all-courses');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSalesPage();
  }, [id, navigate]);

  const isAlreadyEnrolled = user?.enrolledCourses?.some(c =>
    (c.courseId?._id || c.courseId)?.toString() === id.toString()
  );

  const handleEnrollOrBuy = async () => {
    if (isAlreadyEnrolled) {
      navigate(`/course/${id}`);
      return;
    }

    if (!user) {
      navigate(`/auth?redirect=/sale/${id}`);
      return;
    }

    const course = data?.course;
    if (!course) return;

    if (course.isFree || course.price === 0) {
      setEnrollingFree(true);
      try {
        await api.enrollFree(course._id);
        alert('🎉 Congratulations! You have successfully enrolled in this free course.');
        window.location.href = `/course/${course._id}`;
      } catch (err) {
        alert(err.message || 'Free enrollment failed');
      } finally {
        setEnrollingFree(false);
      }
    } else {
      navigate(`/checkout/${course._id}`);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('🔗 Dedicated Sale Page link copied to clipboard!');
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  const course = data?.course;
  const config = data?.salesPageConfig || {};
  const isFree = course?.isFree || course?.price === 0;
  const basePrice = course?.discountedPrice && course.discountedPrice < course.price ? course.discountedPrice : course?.price;

  // Compute inclusive GST breakup for sales page display
  const taxableBase = basePrice ? Math.round((basePrice / 1.18) * 100) / 100 : 0;
  const gstPart = basePrice ? Math.round((basePrice - taxableBase) * 100) / 100 : 0;

  const ctaLabel = isAlreadyEnrolled
    ? '📖 Continue Learning'
    : (enrollingFree ? 'Enrolling...' : (config.ctaText || isFree) ? 'Enroll Now - Free' : `Buy Course - ₹  ${basePrice}`);
  return (
    <div className="sales-page-wrapper">
      <NavHeader user={user} />

      {/* Admin Quick Share Bar */}
      {user?.role === 'admin' && (
        <div className="sales-admin-bar">
          <span>👑 Admin View: Dedicated Sales Page Link: <strong>{window.location.href}</strong></span>
          <button onClick={handleCopyLink} style={{ background: '#fff', color: '#0f172a', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            📋 Copy Link
          </button>
        </div>
      )}

      {/* Hero Section */}
      <section className="sales-hero-section">
        <div className="sales-hero-grid">
          <div>
            <div className="sales-badge">
              {config.badgeText || (isFree ? '🎁 FREE ENROLLMENT' : '⚡ 18% GST INCLUSIVE')}
            </div>

            <h1 className="sales-title">
              {config.headline || course?.title}
            </h1>

            <p className="sales-subheadline">
              {config.subheadline || course?.description}
            </p>

            {/* Price pill */}
            <div className="sales-price-container">
              {isFree ? (
                <span className="sales-price-current" style={{ color: '#10b981' }}>FREE</span>
              ) : (
                <>
                  <span className="sales-price-current">₹{basePrice}</span>
                  {course?.discountedPrice && course.discountedPrice < course.price && (
                    <span className="sales-price-original">₹{course.price}</span>
                  )}
                  <span className="sales-gst-chip">
                    Incl. 18% GST (₹{taxableBase} + ₹{gstPart} GST)
                  </span>
                </>
              )}
            </div>

            <div className="sales-cta-group">
              <button
                className="btn btn-primary btn-lg sales-cta-btn"
                onClick={handleEnrollOrBuy}
                disabled={enrollingFree}
              >
                {ctaLabel}
              </button>

              <button
                className="btn btn-secondary btn-lg sales-share-btn"
                onClick={handleCopyLink}
              >
                🔗 Share Page
              </button>
            </div>

            <p className="sales-trust-line">
              🔒 Instant Access • Official GST Invoice • Lifetime Validity
            </p>
          </div>

          {/* Media / Trailer Card */}
          <div className="sales-media-card">
            {config.promoVideoUrl ? (
              <div style={{ position: 'relative', paddingTop: '56.25%' }}>
                <iframe
                  src={config.promoVideoUrl}
                  title="Course Trailer"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                  allowFullScreen
                />
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <img
                  src={getMediaUrl(course?.thumbnail) || FALLBACK_COURSE_THUMBNAIL}
                  alt={course?.title || 'Course Thumbnail'}
                  className="sales-thumbnail-img"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_COURSE_THUMBNAIL;
                  }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.85), transparent)', display: 'flex', alignItems: 'flex-end', padding: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700 }}>
                      {course?.category || 'Professional Program'}
                    </span>
                    <h3 style={{ margin: '0.2rem 0 0 0', color: '#fff', fontSize: '1.15rem' }}>{course?.title}</h3>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="sales-main-container">

        {/* Trust Badges Bar */}
        <TrustBadges />

        {/* Target Audience Pill Badges */}
        {(config.targetAudience && config.targetAudience.length > 0) && (
          <section className="sales-audience-box">
            <h3 className="sales-audience-title">
              🎯 Who Is This Program Built For?
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {config.targetAudience.map((audience, i) => (
                <span key={i} className="sales-audience-pill">
                  ✓ {audience}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Mapped Continuation Funnel Callout Banner */}
        {course?.continuationCourses && course.continuationCourses.length > 0 && (
          <div className="sales-roadmap-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🎯</span>
              <h3 style={{ margin: 0, color: '#7c3aed', fontSize: '1.2rem' }}>Structured Learning Roadmap</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.92rem', lineHeight: '1.6' }}>
              This course is part of an integrated career track! Upon completing this course, you can smoothly continue with the following next step program:
            </p>
            <div className="sales-roadmap-grid">
              {course.continuationCourses.map(nextCourse => (
                <div key={nextCourse._id} className="sales-next-card">
                  <img
                    src={getMediaUrl(nextCourse.thumbnail) || FALLBACK_COURSE_THUMBNAIL}
                    alt={nextCourse.title}
                    className="sales-next-thumb"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = FALLBACK_COURSE_THUMBNAIL;
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.95rem', wordBreak: 'break-word' }}>{nextCourse.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 700 }}>
                      {nextCourse.isFree ? 'FREE' : `₹${nextCourse.discountedPrice || nextCourse.price} (Incl. GST)`}
                    </p>
                  </div>
                  <Link to={`/sale/${nextCourse._id}`} className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }}>
                    View Next Step
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Highlights & Deliverables */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 className="sales-section-title">💡 What You Will Learn & Achieve</h2>
          <div className="sales-outcomes-grid">
            {(config.highlights && config.highlights.length > 0 ? config.highlights : course?.outcomes || [
              'Master practical real-world skills with step-by-step guidance',
              'Build portfolio-ready projects from scratch',
              'Earn an official verifiable Certificate upon completion'
            ]).map((outcome, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '1.25rem', borderRadius: '12px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ color: '#10b981', fontSize: '1.2rem', lineHeight: 1 }}>✅</span>
                <span style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{outcome}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Curriculum Preview */}
        {course?.content && course.content.length > 0 && (
          <section style={{ marginBottom: '3rem' }}>
            <h2 className="sales-section-title">📚 Course Curriculum Breakdown</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {course.content[0]?.chapters?.map((chapter, idx) => (
                <div key={idx} className="glass-card" style={{ padding: '1.15rem', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', wordBreak: 'break-word' }}>Chapter {idx + 1}: {chapter.title}</h3>
                    {chapter.duration && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>⏱️ {chapter.duration}</span>}
                  </div>
                  {chapter.description && <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{chapter.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Student Reviews Component */}
        <CourseReviews courseId={id} user={user} />

        {/* FAQs */}
        {config.faqs && config.faqs.length > 0 && (
          <section style={{ marginBottom: '3rem' }}>
            <h2 className="sales-section-title"> Frequently Asked Questions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '800px', margin: '0 auto' }}>
              {config.faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="glass-card"
                  style={{ padding: '1.15rem', borderRadius: '12px', cursor: 'pointer' }}
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: '0.95rem' }}>
                    <span>{faq.question}</span>
                    <span>{activeFaq === idx ? '−' : '+'}</span>
                  </div>
                  {activeFaq === idx && (
                    <p style={{ marginTop: '0.75rem', fontSize: '0.88rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '0.75rem', lineHeight: 1.6 }}>
                      {faq.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA Block */}
        <section className="glass-card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', borderRadius: '20px', background: 'radial-gradient(circle at center, rgba(99,102,241,0.2), transparent 70%)' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.1rem)', marginBottom: '0.75rem' }}>Ready to Start Learning?</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Enroll today to get immediate access to all video lessons, study materials, project code, and official certification.
          </p>
          <button
            className="btn btn-primary btn-lg sales-cta-btn"
            onClick={handleEnrollOrBuy}
            disabled={enrollingFree}
          >
            {enrollingFree ? 'Enrolling...' : (isFree ? 'Enroll Now - Free' : `Buy Course - ₹${basePrice}`)}
          </button>
        </section>

      </div>

      {/* Sticky Mobile / Bottom Buy Bar */}
      <div className="sales-sticky-bar">
        <div className="sales-sticky-info">
          <div className="sales-sticky-title">{course?.title}</div>
          <div className="sales-sticky-price">
            {isFree ? 'FREE ENROLLMENT' : `₹${basePrice} (Incl. 18% GST)`}
          </div>
        </div>

        <button
          className="sales-sticky-cta"
          onClick={handleEnrollOrBuy}
          disabled={enrollingFree}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
