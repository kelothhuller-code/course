import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import SiteHeader from '../components/SiteHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { usePageMeta } from '../components/Seo';
import { SITE_NAME, SITE_URL } from '../config/site';
import TrustBadges from '../components/TrustBadges';
import CourseReviews from '../components/CourseReviews';
import { getMediaUrl, FALLBACK_COURSE_THUMBNAIL } from '../utils/media';
import { buildBuyingFaqs } from '../config/faqs';
import tracker from '../utils/tracker';
import './CourseSalesPage.css';
import { toast } from '../components/Toast';

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
          toast.error('Course sales page not found');
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

    const course = data?.course;
    if (!course) return;

    if (course.isFree || course.price === 0) {
      // Free courses are immediately accessible to everyone
      if (user) {
        setEnrollingFree(true);
        try {
          await api.enrollFree(course._id);
        } catch (err) {
          console.log('Enroll free background note:', err);
        } finally {
          setEnrollingFree(false);
        }
      }
      navigate(`/course/${course._id}`);
      return;
    }

    // Paid courses: Allow direct checkout without prior login
    tracker.trackEvent('buy_click', { courseId: course._id, source: 'sales_page' });
    navigate(`/checkout/${course._id}`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('🔗 Dedicated Sale Page link copied to clipboard!');
  };

  // Per-course title/description/share image + Course structured data built from the real course record
  const mc = data?.course;
  const metaPrice = mc ? (mc.discountedPrice && mc.discountedPrice < mc.price ? mc.discountedPrice : mc.price) : 0;
  const metaImage = mc?.thumbnail ? getMediaUrl(mc.thumbnail) : undefined;
  const metaDesc = String(mc?.description || '').replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 300);
  usePageMeta({
    title: mc?.title,
    description: metaDesc || undefined,
    image: metaImage,
    path: mc ? `/sale/${mc._id}` : undefined,
    type: 'product',
    jsonLd: mc ? {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: mc.title,
      description: metaDesc || mc.title,
      url: `${SITE_URL}/sale/${mc._id}`,
      ...(metaImage && /^https?:/i.test(metaImage) ? { image: metaImage } : {}),
      provider: { '@type': 'Organization', name: SITE_NAME, sameAs: SITE_URL },
      ...(mc.category ? { about: mc.category } : {}),
      offers: {
        '@type': 'Offer',
        category: mc.isFree || !metaPrice ? 'Free' : 'Paid',
        price: mc.isFree ? 0 : Number(metaPrice) || 0,
        priceCurrency: 'INR',
        url: `${SITE_URL}/sale/${mc._id}`,
        availability: 'https://schema.org/InStock',
      },
      hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'Online' },
    } : undefined,
  });

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

  // Course-specific FAQs from the admin sales builder first, then facts derived from the course
  // data and the shared buyer FAQs (pricing, payment, access, refunds), so buyers' common
  // questions are always answered on-page.
  const faqs = buildBuyingFaqs(course ? { ...course, salesPageConfig: { faqs: config.faqs || [] } } : null)
    .map(f => ({ question: f.q, answer: f.a, link: f.link }));

  const ctaLabel = isAlreadyEnrolled
    ? '📖 Continue Learning'
    : enrollingFree
    ? 'Enrolling...'
    : isFree
    ? (config.ctaText || 'Enroll Now - Free')
    : (config.ctaText ? `${config.ctaText} - ₹${basePrice}` : `Buy Course - ₹${basePrice}`);
  return (
    <div className="sales-page-wrapper">
      <SiteHeader user={user} />

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

              {!isFree && !isAlreadyEnrolled && (
                <a href="#sales-faq" className="btn btn-secondary btn-lg sales-share-btn">
                  Questions? See FAQ ↓
                </a>
              )}
            </div>

            <p className="sales-trust-line">
              🔒 Secure Razorpay checkout • No account needed before paying • Instant access • GST invoice • Lifetime access
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
                  width="640"
                  height="360"
                  fetchPriority="high"
                  decoding="async"
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
                    width="120"
                    height="120"
                    loading="lazy"
                    decoding="async"
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
            {(config.highlights?.length > 0 ? config.highlights : course?.outcomes?.length > 0 ? course.outcomes : [
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

        {/* Downloadable Resource Bundles & Package Files */}
        {course?.resourceBundles && course.resourceBundles.length > 0 && (
          <section style={{ marginBottom: '3rem' }}>
            <h2 className="sales-section-title">📦 Included Downloadable Files & Assets</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
              Enrolling in this course grants you lifetime access to these project assets, cheat sheets & resource bundles:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {course.resourceBundles.map((bundle, bIdx) => {
                const getIcon = (type) => {
                  const t = (type || '').toLowerCase();
                  if (t === 'zip' || t === 'archive') return '📦';
                  if (t === 'pdf') return '📄';
                  if (t === 'sheet' || t.includes('xls') || t === 'csv') return '📊';
                  if (t === 'code') return '💻';
                  return '📁';
                };
                return (
                  <div key={bundle._id || bIdx} className="glass-card" style={{ padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.75rem' }}>{getIcon(bundle.fileType)}</span>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(67, 56, 202, 0.1)', color: 'var(--color-primary)' }}>
                            {(bundle.fileType || 'BUNDLE').toUpperCase()}
                          </span>
                          {bundle.fileSize && (
                            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'var(--background)', color: 'var(--text-muted)' }}>
                              {bundle.fileSize}
                            </span>
                          )}
                        </div>
                      </div>
                      <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem' }}>{bundle.title}</h4>
                      {bundle.description && <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{bundle.description}</p>}
                    </div>
                    {bundle.isFreePreview && bundle.fileUrl && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)' }}>
                        <a
                          href={bundle.fileUrl.startsWith('http') ? bundle.fileUrl : `/api/upload/material/download/${bundle.fileUrl.split('/').pop()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ width: '100%', fontSize: '0.75rem', textAlign: 'center', display: 'block' }}
                        >
                          🎁 Download Free Sample
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Student Reviews Component */}
        <CourseReviews courseId={id} user={user} />

        {/* FAQs */}
        {faqs.length > 0 && (
          <section style={{ marginBottom: '3rem' }} id="sales-faq">
            <h2 className="sales-section-title">❓ Frequently Asked Questions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '800px', margin: '0 auto' }}>
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="glass-card"
                  style={{ padding: '1.15rem', borderRadius: '12px' }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    aria-expanded={activeFaq === idx}
                    style={{ all: 'unset', boxSizing: 'border-box', width: '100%', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '0.95rem' }}
                  >
                    <span>{faq.question}</span>
                    <span aria-hidden="true">{activeFaq === idx ? '−' : '+'}</span>
                  </button>
                  {activeFaq === idx && (
                    <p style={{ marginTop: '0.75rem', fontSize: '0.88rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '0.75rem', lineHeight: 1.6 }}>
                      {faq.answer}
                      {faq.link && <> <Link to={faq.link.to}>{faq.link.label} →</Link></>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA Block */}
        <section className="glass-card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', borderRadius: '20px', background: 'radial-gradient(circle at center, rgba(67, 56, 202,0.2), transparent 70%)' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.1rem)', marginBottom: '0.75rem' }}>Ready to Start Learning?</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Enroll today to get immediate access to all video lessons, study materials, project code, and official certification.
          </p>
          <button
            className="btn btn-primary btn-lg sales-cta-btn"
            onClick={handleEnrollOrBuy}
            disabled={enrollingFree}
          >
            {ctaLabel}
          </button>
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Still unsure? <Link to="/contact">Send us a question</Link> — we reply by email.
          </p>
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
