import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import NavHeader from './NavHeader';
import Footer from './Landing/Footer';
import './LegalPage.css';

export default function PrivacyPage({ user }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-page-wrapper">
      <NavHeader user={user} />

      <header className="legal-header">
        <div className="container">
          <span className="legal-badge">Legal & Compliance</span>
          <h1>Privacy Policy</h1>
          <p>Learn how WIDETECHNOS Academy collects, uses, and safeguards your personal data.</p>
        </div>
      </header>

      <main className="legal-main">
        <div className="legal-quick-nav">
          <Link to="/terms" className="legal-nav-link">Terms & Conditions</Link>
          <Link to="/privacy" className="legal-nav-link active">Privacy Policy</Link>
          <Link to="/refund" className="legal-nav-link">Refund Policy</Link>
          <Link to="/contact" className="legal-nav-link">Contact Us</Link>
        </div>

        <article className="legal-card">
          <div className="legal-meta-tags">
            <span><strong>Effective Date:</strong> January 1, 2026</span>
            <span><strong>Last Updated:</strong> October 2026</span>
            <span><strong>Compliance:</strong> IT Act 2000 & Digital Personal Data Protection Act (DPDP), India</span>
          </div>

          <h2>1. Overview</h2>
          <p>
            At <strong>WIDETECHNOS Academy</strong> (operated via <code>widetech.in</code>), we take your privacy and the security of your personal information seriously. This Privacy Policy outlines what information we collect when you use our educational website, purchase courses, or attend workshops, and how that information is handled.
          </p>

          <h2>2. Information We Collect</h2>
          <p>
            We collect information strictly necessary to provide educational access, process payments, and communicate with you:
          </p>
          <ul>
            <li><strong>Account & Profile Data:</strong> Full Name, Email Address, and Phone Number provided during registration.</li>
            <li><strong>Billing & Invoicing Data:</strong> State / Place of Supply (for Indian GST computation), Billing Address, and optional GSTIN (for B2B business invoicing).</li>
            <li><strong>Course Progress & Learning Activity:</strong> Video progress, completed lessons, quiz scores, and issued certificates.</li>
            <li><strong>Technical Data:</strong> IP address, browser type, device information, and session logs used to maintain account security and prevent unauthorized sharing.</li>
          </ul>

          <h2>3. Payment Security & Financial Data</h2>
          <div className="legal-highlight-box">
            <strong>Zero Card Storage:</strong> We do NOT collect or store your Debit/Credit card numbers, CVVs, net banking passwords, or UPI PINs. All financial transactions are handled directly through PCI-DSS Level 1 certified payment gateways (such as <strong>Razorpay</strong> and PayU) over 256-bit encrypted SSL connections.
          </div>

          <h2>4. How We Use Your Information</h2>
          <p>We use the data collected for the following legitimate purposes:</p>
          <ul>
            <li>To grant you access to enrolled courses, workshops, and downloadable learning materials.</li>
            <li>To generate and issue automated GST invoices and verifiable course completion certificates.</li>
            <li>To send critical account notifications, enrollment confirmations, and workshop reminders via email.</li>
            <li>To track and credit student referral commissions in our affiliate program.</li>
            <li>To prevent fraud, multiple simultaneous logins, and account misuse.</li>
          </ul>

          <h2>5. Sharing of Personal Data</h2>
          <p>
            <strong>We do not sell, rent, or trade your personal data to third-party marketers or advertisers.</strong> We only share data with trusted service providers essential for platform operations:
          </p>
          <ul>
            <li><strong>Payment Gateways:</strong> Razorpay / PayU for processing student purchase transactions.</li>
            <li><strong>Email Services:</strong> Transactional email delivery providers (e.g., Brevo / Google Workspace) to deliver purchase receipts and course updates.</li>
            <li><strong>Legal & Regulatory Authorities:</strong> Only when required by Indian law, subpoena, or lawful court orders.</li>
          </ul>

          <h2>6. Cookies & Local Storage</h2>
          <p>
            We use secure browser cookies and local storage tokens (JWTs) to keep you logged in to your learning dashboard and save your lesson video playback progress. You can disable cookies in your browser, but some features of the learning viewer may not function properly without them.
          </p>

          <h2>7. Data Retention & Your Rights</h2>
          <p>
            We retain your course progress, certificates, and invoices for as long as your account is active. You have the right to:
          </p>
          <ul>
            <li>Access and review the personal information associated with your student account.</li>
            <li>Request corrections to any inaccurate profile or billing information.</li>
            <li>Request permanent deletion of your account and data by emailing <code>support@widetechnos.com</code> (subject to statutory financial/tax record retention requirements under Indian GST law).</li>
          </ul>

          <h2>8. Contact & Grievance Officer</h2>
          <p>
            In accordance with the Information Technology Act, 2000 and the rules made thereunder, for any queries or grievances regarding this Privacy Policy, please contact our Grievance Officer:
          </p>
          <div className="legal-highlight-box">
            <strong>Data Privacy & Grievance Officer</strong><br />
            WIDETECHNOS Academy<br />
            Email: <a href="mailto:support@widetechnos.com">support@widetechnos.com</a><br />
            Website: <a href="https://widetech.in">https://widetech.in</a><br />
            Response Window: Within 48 business hours
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
