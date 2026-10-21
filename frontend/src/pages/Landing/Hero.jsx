import React from 'react';
import { Link } from 'react-router-dom';
import { getMediaUrl, FALLBACK_COURSE_THUMBNAIL } from '../../utils/media';
import { getCoursePrice, isEnrolledIn, countChapters, openEnquiry } from '../../config/site';

const truncate = (text, max) => {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : max).trim()}…`;
};

/**
 * Above-the-fold hero.
 * Goal: in < 5 seconds a visitor should know (1) what they get, (2) what it costs and
 * (3) where to click to buy. All course copy comes from the featured course's own data
 * (sales-page headline/subheadline, title, description, outcomes) so the hero always
 * matches whatever course the owner features — nothing topic-specific is hardcoded.
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

  const cfg = featuredCourse?.salesPageConfig || {};
  const headline = String(cfg.headline || featuredCourse?.title || '').trim();
  // "Main promise: secondary line" titles get the second half highlighted
  const colon = headline.indexOf(':');
  const [headMain, headHighlight] = colon > 0 && colon < headline.length - 1
    ? [headline.slice(0, colon + 1), headline.slice(colon + 1).trim()]
    : [headline, ''];
  const description = truncate(cfg.subheadline || featuredCourse?.description, 240);
  const outcomes = (featuredCourse?.outcomes || []).filter(Boolean).slice(0, 3);
  const badge = featuredCourse
    ? [
        featuredCourse.category ? `${featuredCourse.category} course` : 'Featured course',
        featuredCourse.languages?.length ? featuredCourse.languages.join(' / ') : null,
      ].filter(Boolean).join(' • ').toUpperCase()
    : 'WIDETECH ACADEMY';

  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="container">
        <div className="hero-grid">
          <div className="hero-content">
            {loading ? (
              <div className="hero-text-skeleton" aria-hidden="true">
                <span /><span /><span />
              </div>
            ) : featuredCourse ? (
              <>
                <div className="hero-badge">🚀 {badge}</div>
                <h1 className="hero-title" id="hero-title">
                  {headMain}
                  {headHighlight && <>{' '}<span className="hero-highlight">{headHighlight}</span></>}
                </h1>
                {description && <p className="hero-description">{description}</p>}
              </>
            ) : (
              <>
                <div className="hero-badge">🚀 {badge}</div>
                <h1 className="hero-title" id="hero-title">
                  Practical Online Courses.{' '}
                  <span className="hero-highlight">Learn at Your Own Pace.</span>
                </h1>
                <p className="hero-description">
                  Self-paced courses with instant access and lifetime validity — plus ready-to-run software and
                  custom automation for businesses.
                </p>
              </>
            )}

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
              {outcomes.map((o) => <li key={o}>✓ {o}</li>)}
              <li>✓ Instant access · Lifetime access</li>
              <li>✓ Secure Razorpay checkout · GST invoice</li>
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
                    <li>⚡ Instant access</li>
                    <li>♾️ Lifetime access</li>
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
