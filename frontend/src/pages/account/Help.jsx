import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import SmartEnquiryForm from '../../components/SmartEnquiryForm';
import { SUPPORT_EMAIL, WHATSAPP_NUMBER, whatsappUrl } from '../../config/site';
import { PageHeader } from './ui';

const FAQ = [
  { q: 'How do I move my software licence to a new computer?', a: <>Open <Link to="/dashboard/software">My software</Link>, find the old computer under the licence and choose Deactivate. Then enter your key in the app on the new computer.</> },
  { q: 'Where can I download my GST invoice?', a: <>Go to <Link to="/dashboard/orders">Orders &amp; invoices</Link> and choose GST invoice next to a paid order. Use Print to save it as a PDF.</> },
  { q: 'Where do I download the software I bought?', a: <>Each licence in <Link to="/dashboard/software">My software</Link> has a Download button when a download is available. Downloads only work while you are signed in.</> },
  { q: 'When do I get my course certificate?', a: <>As soon as you finish every lesson of a course it appears in <Link to="/dashboard/certificates">Certificates</Link>, ready to print or share.</> },
  { q: 'I forgot my password.', a: <>Sign out, then use “Forgot password?” on the <Link to="/auth">sign-in page</Link>. If you are signed in, you can change it in <Link to="/dashboard/profile">Profile &amp; security</Link>.</> },
];

export default function Help({ user }) {
  return (
    <div className="acc-stack">
      <PageHeader icon="help-circle" title="Help & support" subtitle="Find a quick answer, or send us a message and we will reply by email." />
      <div className="acc-grid-2 acc-grid-2--wide-left">
        <section className="acc-card" aria-labelledby="help-form-h">
          <h2 id="help-form-h" className="acc-card__title">Send us a message</h2>
          <p className="acc-muted acc-small">Pick a topic so it reaches the right person. Replies appear in <Link to="/dashboard/enquiries">My enquiries</Link>.</p>
          <SmartEnquiryForm user={user} source="dashboard_help" />
        </section>
        <div className="acc-stack">
          <section className="acc-card" aria-labelledby="help-contact-h">
            <h2 id="help-contact-h" className="acc-card__title">Other ways to reach us</h2>
            <ul className="acc-list">
              <li className="acc-list__row">
                <span className="acc-list__icon" aria-hidden="true"><Icon name="mail" size={18} /></span>
                <div className="acc-list__main"><strong>Email</strong><a href={`mailto:${SUPPORT_EMAIL}`} className="acc-link">{SUPPORT_EMAIL}</a></div>
              </li>
              {WHATSAPP_NUMBER && (
                <li className="acc-list__row">
                  <span className="acc-list__icon" aria-hidden="true"><Icon name="whatsapp" size={18} /></span>
                  <div className="acc-list__main"><strong>WhatsApp</strong><a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="acc-link">Chat with us</a></div>
                </li>
              )}
            </ul>
          </section>
          <section className="acc-card" aria-labelledby="help-faq-h">
            <h2 id="help-faq-h" className="acc-card__title">Common questions</h2>
            <div className="acc-faq">
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}<Icon name="chevron-down" size={18} /></summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
