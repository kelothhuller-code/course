import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import { getCoursePrice, isEnrolledIn, openEnquiry } from '../../config/site';

/** The offer: one clear next step (the featured course, or the full catalogue). */
export default function FinalCTA({ user, featuredCourse }) {
  const price = getCoursePrice(featuredCourse);
  const enrolled = isEnrolledIn(user, featuredCourse);

  return (
    <section className="wt-section lp-offer-band" aria-labelledby="final-cta-title">
      <div className="wt-container">
        <div className="lp-offer reveal">
          <div className="lp-offer-copy">
            <p className="wt-eyebrow">{featuredCourse ? 'Featured course' : 'Get started'}</p>
            <h2 id="final-cta-title" className="wt-h2">
              {featuredCourse ? featuredCourse.title : 'Start learning today'}
            </h2>
            <ul className="lp-offer-points">
              <li><Icon name="check" size={18} /> Instant access after checkout</li>
              <li><Icon name="check" size={18} /> Lifetime access, self-paced</li>
              <li><Icon name="check" size={18} /> Price includes GST, invoice emailed</li>
            </ul>
          </div>
          <div className="lp-offer-action">
            {featuredCourse && !enrolled && (
              <p className="lp-offer-price">
                <span className="wt-price">{price.label}</span>
                {price.original && <s>₹{price.original}</s>}
              </p>
            )}
            {featuredCourse ? (
              <Link
                to={enrolled ? `/course/${featuredCourse._id}` : `/sale/${featuredCourse._id}`}
                className="wt-btn wt-btn--light wt-btn--lg final-cta-course-btn"
              >
                {enrolled ? 'Continue learning' : price.isFree ? 'Start learning free' : 'Get instant access'} <Icon name="arrow-right" size={18} />
              </Link>
            ) : (
              <Link to="/all-courses" className="wt-btn wt-btn--light wt-btn--lg">Explore all courses <Icon name="arrow-right" size={18} /></Link>
            )}
            <button type="button" className="wt-btn wt-btn--outline-light" onClick={() => openEnquiry('Course')}>
              Ask a question first
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
