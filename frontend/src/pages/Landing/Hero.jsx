import React from 'react';
import { Link } from 'react-router-dom';
import { getMediaUrl, FALLBACK_COURSE_THUMBNAIL } from '../../utils/media';
import { getCoursePrice, isEnrolledIn, countChapters, openEnquiry } from '../../config/site';

/**
 * Above-the-fold hero.
 * Goal: in < 5 seconds a visitor should know (1) what they will be able to do,
 * (2) what it costs and (3) where to click to buy. All copy below is taken from
 * existing site content (course features, FAQ, journey section).
 */
export default function Hero({ user, featuredCourse, loading = false }) {
  const price = getCoursePrice(featuredCourse);
  const enrolled = isEnrolledIn(user, featuredCourse);
  const chapters = countChapters(featuredCourse);
  const saleUrl = featuredCourse ? (enrolled ? `/course/${featuredCourse._id}` : `/sale/${featuredCourse._id}`) : '/all-courses';

  const primaryLabel = !featuredCourse
    ? 'Explore Courses →'
    : enrolled
      ? 'Continue Learning →'
      : price.isFree
        ? 'Start Learning — Free'
        : `Get Instant Access — ${price.label}`;

  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="container">
        <div className="hero-grid">
          <div className="hero-content">
            <div className="hero-badge">🚀 BEGINNER-FRIENDLY AI COURSES • AGE 10+</div>
            <h1 className="hero-title" id="hero-title">
              Build Real Websites with AI.{' '}
              <span className="hero-highlight">Even If You've Never Coded.</span>
            </h1>
            <p className="hero-description">
              Learn how to talk to AI, generate code, customise it and publish your own website — step by step,
              in self-paced video lessons with lifetime access.
            </p>

            <div className="hero-ctas">
              <Link to={saleUrl} className="btn btn-primary btn-lg hero-primary-cta">
                {primaryLabel}
              </Link>
              {(featuredCourse || loading) && (
                <a href="#featured-program" className="btn btn-secondary btn-lg">
                  See What's Inside ↓
                </a>
              )}
            </div>

            <ul className="hero-trust" aria-label="Course highlights">
              <li>✓ No coding experience needed</li>
              <li>✓ Lifetime access</li>
              <li>✓ Certificate on completion</li>
              <li>✓ Secure checkout · GST invoice</li>
            </ul>

            <p className="hero-business-link">
              Need software or automation for your business?{' '}
              <button type="button" className="link-button" onClick={() => {
                const el = document.getElementById('software');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                else openEnquiry('Software');
              }}>
                See WideTech software →
              </button>
            </p>
          </div>

          <div className="hero-visual">
            {loading ? (
              <div className="hero-offer-card hero-offer-skeleton" aria-hidden="true" />
            ) : featuredCourse ? (
              <div className="hero-offer-card">
                <div className="hero-offer-thumb">
                  <img
                    src={getMediaUrl(featuredCourse.thumbnail) || FALLBACK_COURSE_THUMBNAIL}
                    alt=""
                    width="640"
                    height="360"
                    fetchPriority="high"
                    decoding="async"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_COURSE_THUMBNAIL; }}
                  />
                  <span className="hero-offer-tag">⭐ Featured course</span>
                </div>
                <div className="hero-offer-body">
                  <h2 className="hero-offer-title">{featuredCourse.title}</h2>
                  <div className="hero-offer-price">
                    <span className="hero-offer-price-now">{price.label}</span>
                    {price.original && <span className="hero-offer-price-was">₹{price.original}</span>}
                    {!price.isFree && <span className="hero-offer-price-note">incl. 18% GST</span>}
                  </div>
                  <ul className="hero-offer-facts">
                    {chapters > 0 && <li>📚 {chapters} module{chapters === 1 ? '' : 's'}</li>}
                    {featuredCourse.languages?.length > 0 && <li>🌐 {featuredCourse.languages.slice(0, 3).join(' · ')}</li>}
                    <li>♾️ Lifetime access</li>
                    <li>🎓 Verifiable certificate</li>
                  </ul>
                  <Link to={saleUrl} className="btn btn-primary hero-offer-cta">
                    {enrolled ? 'Go to course →' : price.isFree ? 'Enroll free →' : 'Buy now →'}
                  </Link>
                  {!enrolled && !price.isFree && (
                    <p className="hero-offer-small">No account needed before checkout · Instant access</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="hero-visual-card" aria-hidden="true">
                <div className="visual-flow">
                  <div className="flow-step"><span className="flow-icon">💡</span><span className="flow-label">Idea</span></div>
                  <div className="flow-arrow">→</div>
                  <div className="flow-step"><span className="flow-icon">🤖</span><span className="flow-label">AI</span></div>
                  <div className="flow-arrow">→</div>
                  <div className="flow-step"><span className="flow-icon">💻</span><span className="flow-label">Code</span></div>
                  <div className="flow-arrow">→</div>
                  <div className="flow-step"><span className="flow-icon">🌐</span><span className="flow-label">Website</span></div>
                </div>
                <div className="visual-badge">From idea → live website</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
