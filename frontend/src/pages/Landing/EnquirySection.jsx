import { Link } from 'react-router-dom';
import EnquiryForm from '../../components/EnquiryForm';
import Icon from '../../components/Icon';
import { SUPPORT_EMAIL, whatsappUrl } from '../../config/site';

/**
 * Final call to action + quick enquiry (#enquiry). The quick form handles course questions
 * and simple requests; bigger business enquiries go to the multi-step form on /contact.
 * WhatsApp stays a single small link (the owner prefers email).
 */
export default function EnquirySection({ user, featuredCourse = null }) {
  const wa = whatsappUrl();
  return (
    <section className="wt-section wt-section--dark lp-enquiry" id="enquiry" aria-labelledby="enquiry-title">
      <div className="wt-container lp-enquiry-grid">
        <div className="lp-enquiry-intro reveal">
          <p className="wt-eyebrow">Get in touch</p>
          <h2 className="wt-h2" id="enquiry-title">Have a question or a project in mind?</h2>
          <p className="wt-lead">Ask about a course, a software product or a service. We reply by email.</p>
          <div className="lp-enquiry-biz">
            <span className="wt-icon-tile"><Icon name="briefcase" size={22} /></span>
            <div>
              <strong>Planning something bigger?</strong>
              <p>Our business enquiry asks a few smart questions so we can reply with a useful answer the first time.</p>
              <Link to="/contact#business-enquiry" className="wt-btn wt-btn--light wt-btn--sm">Start a business enquiry <Icon name="arrow-right" size={16} /></Link>
            </div>
          </div>
          <ul className="lp-enquiry-alt">
            <li><a href={`mailto:${SUPPORT_EMAIL}`}><Icon name="mail" size={18} /> {SUPPORT_EMAIL}</a></li>
            {wa && <li><a href={wa} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} /> We're also on WhatsApp</a></li>}
          </ul>
        </div>
        <div className="lp-enquiry-card reveal" style={{ '--reveal-delay': '100ms' }}>
          <h3 className="wt-h3">Quick question</h3>
          <EnquiryForm user={user} source="landing_page" courseTitle={featuredCourse?.title || ''} />
        </div>
      </div>
    </section>
  );
}
