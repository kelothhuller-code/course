import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, SUPPORT_EMAIL, SITE_TAGLINE, whatsappUrl } from '../../config/site';
import './Footer.css';

/** Site footer: what we offer, company, policies, and the three ways to reach us. */
export default function Footer() {
  const year = new Date().getFullYear();
  const wa = whatsappUrl();

  return (
    <footer className="ft" aria-labelledby="ft-title">
      <h2 id="ft-title" className="sr-only">Site footer</h2>
      <div className="wt-container">
        <div className="ft-grid">
          <div className="ft-brand">
            <Link to="/" className="ft-logo" aria-label="WideTech home">
              <img src="/logo.svg" alt="" width="32" height="32" loading="lazy" />
              <span>WideTech</span>
            </Link>
            <p>{SITE_TAGLINE}</p>
            <ul className="ft-contact">
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`}><Icon name="mail" size={18} /> {SUPPORT_EMAIL}</a>
              </li>
              {wa && (
                <li>
                  <a href={wa} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} /> Chat on WhatsApp</a>
                </li>
              )}
              {INSTAGRAM_URL && (
                <li>
                  <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"><Icon name="instagram" size={18} /> @{INSTAGRAM_HANDLE}</a>
                </li>
              )}
            </ul>
          </div>

          <nav className="ft-col" aria-label="Offerings">
            <h3>Explore</h3>
            <ul>
              <li><Link to="/all-courses">Courses</Link></li>
              <li><Link to="/software">Software</Link></li>
              <li><Link to="/services">Services</Link></li>
              <li><Link to="/contact#business-enquiry">Business enquiry</Link></li>
            </ul>
          </nav>

          <nav className="ft-col" aria-label="Account">
            <h3>Students</h3>
            <ul>
              <li><Link to="/auth">Log in</Link></li>
              <li><Link to="/dashboard">My dashboard</Link></li>
              <li><Link to="/contact">Help &amp; support</Link></li>
            </ul>
          </nav>

          <nav className="ft-col" aria-label="Policies">
            <h3>Policies</h3>
            <ul>
              <li><Link to="/terms">Terms &amp; conditions</Link></li>
              <li><Link to="/privacy">Privacy policy</Link></li>
              <li><Link to="/refund">Refund policy</Link></li>
            </ul>
          </nav>
        </div>

        <div className="ft-bottom">
          <span>© {year} WideTech (Wide Ventures). All rights reserved.</span>
          <span className="ft-secure"><Icon name="lock" size={16} /> Payments secured by Razorpay</span>
        </div>
      </div>
    </footer>
  );
}
