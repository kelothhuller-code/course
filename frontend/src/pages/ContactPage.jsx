import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NavHeader from './NavHeader';
import Footer from './Landing/Footer';
import './LegalPage.css';

export default function ContactPage({ user }) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: 'Course Inquiry',
    message: ''
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

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
            <p><a href="mailto:support@widetechnos.com" style={{ color: 'var(--primary)', fontWeight: 600 }}>support@widetechnos.com</a></p>
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

          {submitted ? (
            <div className="legal-highlight-box" style={{ background: '#f0fdf4', borderLeftColor: '#22c55e', color: '#166534' }}>
              <strong>Thank you for reaching out!</strong><br />
              Your message has been received. Our team will review your inquiry and reply to <strong>{formData.email}</strong> within 24 hours.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: '#334155' }}>Your Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: '#334155' }}>Your Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. rahul@example.com"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: '#334155' }}>Subject / Topic</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#fff' }}
                >
                  <option value="Course Inquiry">Course & Curriculum Inquiry</option>
                  <option value="Payment & Billing">Payment, Invoices & Billing Support</option>
                  <option value="Workshop Question">Workshop & Live Event Inquiry</option>
                  <option value="Technical Support">Technical & Login Support</option>
                  <option value="Partnership">Affiliate & Institutional Partnership</option>
                  <option value="Other">Other Question</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: '#334155' }}>Message</label>
                <textarea
                  rows="4"
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How can we help you today?"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>

              <div>
                <button type="submit" className="btn btn-primary btn-md" style={{ padding: '0.75rem 2rem', fontWeight: 700 }}>
                  Send Inquiry →
                </button>
              </div>
            </form>
          )}

          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
            <h3>Registered Business Details</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: '1.7' }}>
              <strong>Trade / Legal Entity Name:</strong> WIDE VENTURES<br />
              <strong>Operating Trade Names:</strong> WIDE TECH, BROFFY, WIDETECHNOS Academy<br />
              <strong>GSTIN:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>32FBEPK9712B1Z0</span><br />
              <strong>Registered Principal Place of Business:</strong> 8/7/a, Thettamala, Mananthavady Road, Wayanad, Kerala - 670731, India<br />
              <strong>Website / Platform:</strong> <a href="https://widetech.in" target="_blank" rel="noopener noreferrer">https://widetech.in</a><br />
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
