import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import NavHeader from './NavHeader';
import Footer from './Landing/Footer';
import './LegalPage.css';

export default function RefundPage({ user }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-page-wrapper">
      <NavHeader user={user} />

      <header className="legal-header">
        <div className="container">
          <span className="legal-badge">Legal & Compliance</span>
          <h1>Cancellation & Refund Policy</h1>
          <p>Transparent guidelines on course cancellations, digital fulfillment, and refund eligibility.</p>
        </div>
      </header>

      <main className="legal-main">
        <div className="legal-quick-nav">
          <Link to="/terms" className="legal-nav-link">Terms & Conditions</Link>
          <Link to="/privacy" className="legal-nav-link">Privacy Policy</Link>
          <Link to="/refund" className="legal-nav-link active">Refund Policy</Link>
          <Link to="/contact" className="legal-nav-link">Contact Us</Link>
        </div>

        <article className="legal-card">
          <div className="legal-meta-tags">
            <span><strong>Effective Date:</strong> January 1, 2026</span>
            <span><strong>Policy:</strong> Indian eCommerce & Consumer Protection Guidelines</span>
            <span><strong>Payment Gateway:</strong> Razorpay / PayU Verified</span>
          </div>

          <h2>1. Overview & Commitment</h2>
          <p>
            At <strong>WIDETECHNOS Academy</strong>, operated by <strong>WIDE VENTURES</strong> (Trade Names: <strong>WIDE TECH</strong>, <strong>BROFFY</strong>) located at 8/7/a, Thettamala, Mananthavady Road, Wayanad, Kerala - 670731, India (via <code>widetech.in</code>), our primary objective is to deliver high-quality, practical AI and web development education. We want every student to feel confident when investing in their learning. This Cancellation and Refund Policy outlines the terms and conditions under which refunds and cancellations are processed.
          </p>

          <h2>2. Digital Course Delivery & Fulfillment Policy</h2>
          <div className="legal-highlight-box">
            <strong>Instant Digital Fulfillment:</strong> All courses, video lessons, code repositories, and educational modules offered on WIDETECHNOS Academy are digital goods. Access is provisioned and unlocked automatically in the student's dashboard immediately upon successful payment confirmation. No physical delivery or shipping is involved.
          </div>

          <h2>3. All Sales Are Final (No Discretionary Refunds)</h2>
          <p>
            Because all courses, workshops, video lectures, and learning materials on WIDETECHNOS Academy are <strong>instant-access digital goods</strong>, all course and workshop enrollments are <strong>final and non-refundable</strong> once access has been unlocked in your dashboard. We do not provide discretionary refunds, change-of-mind refunds, or refunds after curriculum consumption.
          </p>

          <h2>4. Exceptions: When Refunds Are Processed (Platform Fault Only)</h2>
          <p>
            A refund will strictly be granted <strong>only if there is a verified fault from our side</strong>, including:
          </p>
          <ul>
            <li><strong>Duplicate Payment / Double Debit:</strong> If your bank account or card was charged more than once for the same transaction due to a payment gateway timeout, the duplicate charge will be refunded 100% automatically.</li>
            <li><strong>Verified Platform Technical Failure:</strong> If you are unable to access the course or digital content due to a server-side technical error that our support engineering team is unable to resolve within 48 business hours of your report.</li>
            <li><strong>Workshop Cancellation by Organizer:</strong> If WIDETECHNOS Academy cancels a scheduled live workshop or event without providing an alternative rescheduled date.</li>
          </ul>

          <h2>5. Reporting a Technical Fault or Double Debit</h2>
          <p>
            If you have experienced a technical error or duplicate debit caused by our system or gateway, please report it within <strong>7 days of transaction</strong>:
          </p>
          <ol style={{ paddingLeft: '1.5rem', marginBottom: '1.25rem', lineHeight: '1.8' }}>
            <li>Email our billing desk at <strong>support@widetech.in</strong> from your registered account email.</li>
            <li>Use the subject line: <code>Billing Issue - [Your Transaction ID]</code>.</li>
            <li>Attach your payment confirmation receipt or screenshot showing the duplicate deduction.</li>
          </ol>

          <h2>6. Refund Processing Time & Payment Mode</h2>
          <div className="legal-highlight-box">
            <strong>Timeline:</strong> Once approved, refunds are initiated immediately through our payment gateway (Razorpay). The refund amount will be credited back to your original source of payment (UPI, Credit/Debit Card, or Net Banking account) within <strong>5 to 7 business days</strong>, depending on your bank's processing timelines.
          </div>

          <h2>7. Fraud Prevention & Abuse</h2>
          <p>
            WIDETECHNOS Academy reserves the right to decline refund requests if we detect repetitive refund abuse, suspicious account activity, or violations of our Terms of Service.
          </p>

          <h2>8. Contact for Billing & Refund Support</h2>
          <p>
            If you have any questions regarding your invoice, payment failure, or cancellation, please reach out to our dedicated billing desk:
          </p>
          <div className="legal-highlight-box">
            <strong>WIDE VENTURES Billing & Refund Support</strong><br />
            Operating Trade Names: WIDE TECH, BROFFY<br />
            Address: 8/7/a, Thettamala, Mananthavady Road, Wayanad, Kerala - 670731, India<br />
            Email: <a href="mailto:support@widetech.in">support@widetech.in</a><br />
            Support Hours: Monday – Saturday, 9:00 AM – 6:00 PM IST<br />
            Resolution Window: Usually responded to within 24 business hours
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
