import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import EnquiryForm from '../components/EnquiryForm';
import NavHeader from './NavHeader';
import Footer from './Landing/Footer';
import './LegalPage.css';

export default function ContactPage({ user }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-page-wrapper">
      <NavHeader user={user} />

      <header className="legal-header">
        <div className="container">
          <span className="legal-badge">Help & Support</span>
          <h1>Contact Us</h1>
          <p>Have questions about courses, workshops, or your account? We're here to help.</p>
        </div>
      </header>

      <main className="legal-main">
        <div className="legal-quick-nav">
          <Link to="/terms" className="legal-nav-link">Terms & Conditions</Link>
          <Link to="/privacy" className="legal-nav-link">Privacy Policy</Link>
          <Link to="/refund" className="legal-nav-link">Refund Policy</Link>
          <Link to="/contact" className="legal-nav-link active">Contact Us</Link>
        </div>

        <div className="contact-grid">
          <div className="contact-card">
            <span className="contact-icon">📧</span>
            <h3>Email Support</h3>
            <p><a href="mailto:support@widetech.in" style={{ color: 'var(--primary)', fontWeight: 600 }}>support@widetech.in</a></p>
            <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>Response within 24 business hours</p>
          </div>

          <div className="contact-card">
            <span className="contact-icon">📸</span>
            <h3>Instagram & Community</h3>
            <p><a href="https://instagram.com/widetechai" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>@widetechai</a></p>
            <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>Updates, tutorials & daily tips</p>
          </div>

          <div className="contact-card">
            <span className="contact-icon">⏰</span>
            <h3>Operating Hours</h3>
            <p style={{ fontWeight: 600, color: '#1e293b' }}>Mon – Sat: 9:00 AM – 6:00 PM IST</p>
            <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>Sunday: Closed (Emails logged)</p>
          </div>
        </div>

        <article className="legal-card">
          <h2>Send Us a Message</h2>
          <p>Fill out the form below and our educational advisory team will get back to you promptly:</p>

          <div style={{ marginTop: '1.5rem' }}>
            <EnquiryForm user={user} source="contact_page" />
          </div>

          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
            <h3>Registered Business Details</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: '1.7' }}>
              <strong>Trade / Legal Entity Name:</strong> WIDE VENTURES<br />
              <strong>Operating Trade Names:</strong> WIDE TECH, BROFFY, WIDETECHNOS Academy<br />
              <strong>Registered Principal Place of Business:</strong> 8/7/a, Thettamala, Mananthavady Road, Wayanad, Kerala - 670731, India<br />
              <strong>Website / Platform:</strong> <a href="https://widetech.in" target="_blank" rel="noopener noreferrer">https://widetech.in</a><br />
              <strong>Official Support Email:</strong> <a href="mailto:support@widetech.in">support@widetech.in</a><br />
              <strong>Jurisdiction:</strong> Wayanad, Kerala, India<br />
              <strong>Grievance Redressal:</strong> All inquiries and grievances are acknowledged within 24 business hours and resolved within 7 working days.
            </p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
