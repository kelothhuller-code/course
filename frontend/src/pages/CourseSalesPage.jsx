import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import NavHeader from './NavHeader';
import TrustBadges from '../components/TrustBadges';
import CourseReviews from '../components/CourseReviews';

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
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc', color: '#0f172a' }}>
        <div className="logo-text" style={{ fontSize: '1.8rem', animation: 'pulse 1.5s infinite' }}>LOADING SALES PAGE...</div>
      </div>
    );
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
    : (enrollingFree ? 'Enrolling...' : (config.ctaText || (isFree ? 'Enroll Now - Free' : `Buy Course - ₹${basePrice}`)));

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      <NavHeader user={user} />

      {/* Admin Quick Share Bar */}
      {user?.role === 'admin' && (
        <div style={{ background: 'linear-gradient(90deg, #2563eb, #7c3aed)', color: '#fff', padding: '0.6rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
          <span>👑 Admin View: Dedicated Sales Page Link: <strong>{window.location.href}</strong></span>
          <button onClick={handleCopyLink} style={{ background: '#fff', color: '#0f172a', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            📋 Copy Link
          </button>
        </div>
      )}

      {/* Hero Section */}
      <section style={{ padding: '3.5rem 1.5rem 2.5rem 1.5rem', background: 'radial-gradient(circle at top center, rgba(99, 102, 241, 0.12), transparent 70%)', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '3rem', alignItems: 'center' }}>
          
          <div>
            <div style={{ display: 'inline-block', padding: '0.35rem 0.9rem', borderRadius: '50px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#4f46e5', fontSize: '0.82rem', fontWeight: 700, marginBottom: '1.25rem', letterSpacing: '0.05em' }}>
              {config.badgeText || (isFree ? '🎁 FREE ENROLLMENT' : '⚡ 18% GST INCLUSIVE')}
            </div>

            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1rem', color: '#0f172a' }}>
              {config.headline || course?.title}
            </h1>

            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {config.subheadline || course?.description}
            </p>

            {/* Price pill */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1.5rem' }}>
              {isFree ? (
                <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#10b981' }}>FREE</span>
              ) : (
                <>
                  <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--secondary)' }}>₹{basePrice}</span>
                  {course?.discountedPrice && course.discountedPrice < course.price && (
                    <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{course.price}</span>
                  )}
                  <span style={{ fontSize: '0.85rem', color: '#047857', background: 'rgba(16, 185, 129, 0.12)', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
                    Incl. 18% GST (₹{taxableBase} + ₹{gstPart} GST)
                  </span>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                className="btn btn-primary btn-lg"
                onClick={handleEnrollOrBuy}
                disabled={enrollingFree}
                style={{ padding: '1rem 2.2rem', fontSize: '1.1rem', fontWeight: 700, borderRadius: '12px', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)' }}
              >
                {ctaLabel}
              </button>

              <button 
                className="btn btn-secondary btn-lg"
                onClick={handleCopyLink}
                style={{ padding: '1rem 1.5rem', borderRadius: '12px' }}
              >
                🔗 Share Page
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              🔒 Instant Access • Official GST Invoice • Lifetime Validity
            </p>
          </div>

          {/* Media / Trailer Card */}
          <div className="glass-card" style={{ overflow: 'hidden', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px rgba(15,23,42,0.08)' }}>
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
                  src={course?.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'} 
                  alt={course?.title}
                  style={{ width: '100%', height: '280px', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.85), transparent)', display: 'flex', alignItems: 'flex-end', padding: '1.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700 }}>{course?.category}</span>
                    <h3 style={{ margin: '0.2rem 0 0 0', color: '#fff' }}>{course?.title}</h3>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Main Content Area */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem', width: '100%', paddingBottom: '6rem' }}>
        
        {/* Trust Badges Bar */}
        <TrustBadges />

        {/* Target Audience Pill Badges */}
        {(config.targetAudience && config.targetAudience.length > 0) && (
          <section style={{ marginBottom: '3rem', padding: '1.5rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🎯 Who Is This Program Built For?
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {config.targetAudience.map((audience, i) => (
                <span key={i} style={{ padding: '0.4rem 0.9rem', borderRadius: '50px', background: 'rgba(99, 102, 241, 0.08)', color: '#4f46e5', border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '0.88rem', fontWeight: 600 }}>
                  ✓ {audience}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Mapped Continuation Funnel Callout Banner */}
        {course?.continuationCourses && course.continuationCourses.length > 0 && (
          <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08))', border: '1px solid rgba(168, 85, 247, 0.3)', marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.6rem' }}>🎯</span>
              <h3 style={{ margin: 0, color: '#7c3aed' }}>Structured Learning Roadmap</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              This course is part of an integrated career track! Upon completing this course, you can smoothly continue with the following next step program:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {course.continuationCourses.map(nextCourse => (
                <div key={nextCourse._id} style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <img src={nextCourse.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80'} alt={nextCourse.title} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.95rem' }}>{nextCourse.title}</h4>
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
        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', textAlign: 'center' }}>💡 What You Will Learn & Achieve</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {(config.highlights && config.highlights.length > 0 ? config.highlights : course?.outcomes || [
              'Master practical real-world skills with step-by-step guidance',
              'Build portfolio-ready projects from scratch',
              'Earn an official verifiable Certificate upon completion'
            ]).map((outcome, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '1.25rem', borderRadius: '12px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ color: '#10b981', fontSize: '1.2rem', lineHeight: 1 }}>✅</span>
                <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{outcome}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Curriculum Preview */}
        {course?.content && course.content.length > 0 && (
          <section style={{ marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>📚 Course Curriculum Breakdown</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {course.content[0]?.chapters?.map((chapter, idx) => (
                <div key={idx} className="glass-card" style={{ padding: '1.25rem', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Chapter {idx + 1}: {chapter.title}</h3>
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
          <section style={{ marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', textAlign: 'center' }}>❓ Frequently Asked Questions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '800px', margin: '0 auto' }}>
              {config.faqs.map((faq, idx) => (
                <div 
                  key={idx} 
                  className="glass-card" 
                  style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer' }}
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                    <span>{faq.question}</span>
                    <span>{activeFaq === idx ? '−' : '+'}</span>
                  </div>
                  {activeFaq === idx && (
                    <p style={{ marginTop: '0.75rem', fontSize: '0.88rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                      {faq.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA Block */}
        <section className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center', borderRadius: '20px', background: 'radial-gradient(circle at center, rgba(99,102,241,0.2), transparent 70%)' }}>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>Ready to Start Learning?</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
            Enroll today to get immediate access to all video lessons, study materials, project code, and official certification.
          </p>
          <button 
            className="btn btn-primary btn-lg"
            onClick={handleEnrollOrBuy}
            disabled={enrollingFree}
            style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', fontWeight: 700, borderRadius: '12px' }}
          >
            {enrollingFree ? 'Enrolling...' : (isFree ? 'Enroll Now - Free' : `Buy Course - ₹${basePrice}`)}
          </button>
        </section>

      </div>

      {/* Sticky Mobile / Bottom Buy Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '0.8rem 1.2rem',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        zIndex: 99
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{course?.title}</div>
          <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>
            {isFree ? 'FREE ENROLLMENT' : `₹${basePrice} (Incl. 18% GST)`}
          </div>
        </div>

        <button
          onClick={handleEnrollOrBuy}
          disabled={enrollingFree}
          style={{
            padding: '0.75rem 1.6rem',
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(79,70,229,0.3)'
          }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
