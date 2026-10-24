import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import { getMediaUrl, FALLBACK_COURSE_THUMBNAIL } from '../../utils/media';
import { getCoursePrice, isEnrolledIn, priceLabel } from '../../config/site';

/**
 * Above-the-fold hero: WideTech = courses + software + services.
 * The visual on the right is built from live data (featured course, first software
 * product, first service), so it always shows real things you sell. Nothing is invented.
 */
export default function Hero({ user, featuredCourse, software = [], services = [], loading = false }) {
  const price = getCoursePrice(featuredCourse);
  const enrolled = isEnrolledIn(user, featuredCourse);
  const courseUrl = featuredCourse ? (enrolled ? `/course/${featuredCourse._id}` : `/sale/${featuredCourse._id}`) : '/all-courses';
  const sw = software[0];
  const svc = services[0];

  return (
    <section className="lp-hero" aria-labelledby="hero-title">
      <div className="lp-hero-bg" aria-hidden="true" />
      <div className="wt-container lp-hero-grid">
        <div className="lp-hero-copy">
          <p className="wt-eyebrow"><Icon name="sparkles" size={16} /> Courses · Software · Services</p>
          <h1 id="hero-title" className="wt-h1 lp-hero-title">
            Learn new skills. <span className="lp-hero-accent">Run your business smarter.</span>
          </h1>
          <p className="wt-lead lp-hero-lead">
            WideTech brings together practical online courses, ready-to-use business software and
            done-for-you services like automation, custom software and business administration.
          </p>
          <div className="wt-actions lp-hero-ctas">
            <Link to="/all-courses" className="wt-btn wt-btn--primary wt-btn--lg">
              Browse courses <Icon name="arrow-right" size={18} />
            </Link>
            <Link to="/contact#business-enquiry" className="wt-btn wt-btn--secondary wt-btn--lg">
              Business enquiry
            </Link>
          </div>
          <ul className="lp-hero-points" aria-label="Why WideTech">
            <li><Icon name="check-circle" size={18} /> Instant access to courses</li>
            <li><Icon name="shield" size={18} /> Secure Razorpay checkout</li>
            <li><Icon name="mail" size={18} /> Real replies from our team</li>
          </ul>
        </div>

        <div className="lp-hero-visual">
          {loading ? (
            <div className="lp-hero-card" aria-hidden="true">
              <div className="wt-skeleton wt-skeleton--media" />
              <div className="lp-hero-card-body">
                <div className="wt-skeleton wt-skeleton--title" />
                <div className="wt-skeleton wt-skeleton--text" style={{ width: '50%' }} />
              </div>
            </div>
          ) : featuredCourse ? (
            <Link to={courseUrl} className="lp-hero-card" aria-label={`Featured course: ${featuredCourse.title}`}>
              <div className="lp-hero-card-media">
                <img
                  src={getMediaUrl(featuredCourse.thumbnail) || FALLBACK_COURSE_THUMBNAIL}
                  alt=""
                  width="640"
                  height="360"
                  fetchPriority="high"
                  decoding="async"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_COURSE_THUMBNAIL; }}
                />
                <span className="wt-badge lp-hero-card-tag"><Icon name="book" size={14} /> Featured course</span>
              </div>
              <div className="lp-hero-card-body">
                <p className="lp-hero-card-title">{featuredCourse.title}</p>
                <p className="lp-hero-card-meta">
                  <span className="wt-price">{price.label}</span>
                  {price.original && <s>₹{price.original}</s>}
                  {!price.isFree && <small>incl. GST</small>}
                </p>
              </div>
            </Link>
          ) : (
            <div className="lp-hero-card lp-hero-card--art" aria-hidden="true">
              <svg viewBox="0 0 320 200" width="100%" height="100%">
                <rect x="16" y="20" width="180" height="110" rx="14" fill="#eef0ff" />
                <rect x="34" y="40" width="110" height="12" rx="6" fill="#4338ca" opacity=".85" />
                <rect x="34" y="62" width="140" height="8" rx="4" fill="#c7cbff" />
                <rect x="34" y="78" width="120" height="8" rx="4" fill="#c7cbff" />
                <rect x="130" y="96" width="170" height="90" rx="14" fill="#fff" stroke="#e3e7ef" />
                <circle cx="160" cy="126" r="12" fill="#e6f5f3" /><path d="m154 126 4 4 8-8" stroke="#0f766e" strokeWidth="2.5" fill="none" />
                <rect x="182" y="120" width="96" height="10" rx="5" fill="#cfd6e3" />
                <rect x="150" y="152" width="128" height="10" rx="5" fill="#e3e7ef" />
              </svg>
            </div>
          )}

          {sw && (
            <Link to={`/software/${sw.slug || sw._id}`} className="lp-hero-chip lp-hero-chip--a">
              <span className="wt-icon-tile wt-icon-tile--accent"><Icon name="grid" size={18} /></span>
              <span><small>Software</small><strong>{sw.title}</strong><em>{priceLabel(sw, 'software')?.main}</em></span>
            </Link>
          )}
          {svc && (
            <Link to={`/services/${svc.slug || svc._id}`} className="lp-hero-chip lp-hero-chip--b">
              <span className="wt-icon-tile wt-icon-tile--warm"><Icon name={svc.icon || 'briefcase'} size={18} /></span>
              <span><small>Service</small><strong>{svc.title}</strong><em>{priceLabel(svc, 'service')?.main}</em></span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
