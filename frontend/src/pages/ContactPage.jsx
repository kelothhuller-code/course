import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import SmartEnquiryForm from '../components/SmartEnquiryForm';
import InstagramCard from '../components/InstagramCard';
import Icon from '../components/Icon';
import { usePageMeta } from '../components/Seo';
import { SUPPORT_EMAIL, whatsappUrl } from '../config/site';
import './LegalPage.css';
import './ContactPage.css';

// /contact?type=software&item=<id> preselects a category (and product) in the business enquiry
const TYPE_TO_CATEGORY = { software: 'software', services: 'services', service: 'services' };

export default function ContactPage({ user }) {
  const [params] = useSearchParams();
  const rawType = (params.get('type') || '').toLowerCase();
  const initialCategory = TYPE_TO_CATEGORY[rawType] || rawType.replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  const itemId = (params.get('item') || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
  const related = useMemo(
    () => (itemId && (initialCategory === 'software' || initialCategory === 'services')
      ? { type: initialCategory === 'software' ? 'software' : 'service', id: itemId }
      : null),
    [itemId, initialCategory],
  );
  const wa = whatsappUrl();

  usePageMeta({
    title: 'Contact & business enquiries',
    description: 'Ask about a course, software or a service, or send a detailed business enquiry. We reply by email.',
    path: '/contact',
  });

  return (
    <PublicLayout user={user} className="contact-page">
      <section className="cat-hero contact-hero">
        <div className="wt-container">
          <p className="wt-eyebrow">Contact</p>
          <h1 className="wt-h1">Let's talk about what you need</h1>
          <p className="wt-lead">Questions about a course or your account, or a business project? Pick a topic below and we will reply by email.</p>
        </div>
      </section>

      <section className="wt-section contact-main">
        <div className="wt-container contact-layout">
          <div className="contact-form-col" id="business-enquiry">
            <div className="contact-form-card">
              <h2 className="wt-h3">Business enquiry</h2>
              <p className="wt-muted contact-form-lead">Three short steps. Your answers help us reply with something useful the first time.</p>
              <SmartEnquiryForm user={user} initialCategory={initialCategory} related={related} source="contact_page" />
            </div>
          </div>

          <aside className="contact-side" aria-label="Other ways to reach us">
            <div className="wt-card contact-tile">
              <span className="wt-icon-tile"><Icon name="mail" size={22} /></span>
              <div>
                <h2 className="contact-tile-title">Email support</h2>
                <p><a href={`mailto:${SUPPORT_EMAIL}`} className="wt-link">{SUPPORT_EMAIL}</a></p>
                <p className="wt-help">Replies within 24 business hours</p>
              </div>
            </div>
            <div className="wt-card contact-tile">
              <span className="wt-icon-tile wt-icon-tile--accent"><Icon name="clock" size={22} /></span>
              <div>
                <h2 className="contact-tile-title">Operating hours</h2>
                <p>Mon – Sat: 9:00 AM – 6:00 PM IST</p>
                <p className="wt-help">Sunday: closed (emails are logged)</p>
              </div>
            </div>
            {wa && (
              <div className="wt-card contact-tile">
                <span className="wt-icon-tile wt-icon-tile--accent"><Icon name="whatsapp" size={22} /></span>
                <div>
                  <h2 className="contact-tile-title">WhatsApp</h2>
                  <p><a href={wa} target="_blank" rel="noopener noreferrer" className="wt-link">Message us on WhatsApp</a></p>
                  <p className="wt-help">Email is the fastest way to get a detailed reply</p>
                </div>
              </div>
            )}
            <InstagramCard compact />
          </aside>
        </div>
      </section>

      <section className="wt-section wt-section--white">
        <div className="wt-container wt-container--narrow">
          <h2 className="wt-h3">Registered business details</h2>
          <dl className="contact-dl">
            <dt>Trade / legal entity name</dt><dd>WIDE VENTURES</dd>
            <dt>Operating trade names</dt><dd>WIDE TECH, BROFFY, WIDETECHNOS Academy</dd>
            <dt>Registered place of business</dt><dd>8/7/a, Thettamala, Mananthavady Road, Wayanad, Kerala - 670731, India</dd>
            <dt>Website</dt><dd><a href="https://widetech.in" className="wt-link">https://widetech.in</a></dd>
            <dt>Support email</dt><dd><a href={`mailto:${SUPPORT_EMAIL}`} className="wt-link">{SUPPORT_EMAIL}</a></dd>
            <dt>Jurisdiction</dt><dd>Wayanad, Kerala, India</dd>
            <dt>Grievance redressal</dt><dd>All enquiries and grievances are acknowledged within 24 business hours and resolved within 7 working days.</dd>
          </dl>
          <p className="contact-policies">
            <Link to="/terms">Terms &amp; Conditions</Link> · <Link to="/privacy">Privacy Policy</Link> · <Link to="/refund">Refund Policy</Link>
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
