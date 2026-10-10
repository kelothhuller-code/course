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
            At <strong>WIDETECHNOS Academy</strong> (operated via <code>widetech.in</code>), our primary objective is to deliver high-quality, practical AI and web development education. We want every student to feel confident when investing in their learning. This Cancellation and Refund Policy outlines the terms and conditions under which refunds and cancellations are processed.
          </p>

          <h2>2. Digital Course Delivery & Fulfillment Policy</h2>
          <div className="legal-highlight-box">
            <strong>Instant Digital Fulfillment:</strong> All courses, video lessons, code repositories, and educational modules offered on WIDETECHNOS Academy are digital goods. Access is provisioned and unlocked automatically in the student's dashboard immediately upon successful payment confirmation. No physical delivery or shipping is involved.
          </div>

          <h2>3. Refund Eligibility Window</h2>
          <p>
            We offer a <strong>7-Day Money-Back Guarantee</strong> on our self-paced online courses under the following fair-use conditions:
          </p>
          <ul>
            <li><strong>Timeframe:</strong> The refund request must be submitted within <strong>7 calendar days</strong> from the date and time of purchase.</li>
            <li><strong>Consumption Cap:</strong> The student must not have consumed or watched more than <strong>25%</strong> of the total course lessons/chapters.</li>
            <li><strong>Certificate Status:</strong> If a certificate of completion has already been issued or claimed for the course, the purchase becomes strictly non-refundable.</li>
            <li><strong>Resource Downloads:</strong> Proprietary starter files, templates, or downloadable course software must not have been bulk-downloaded prior to the refund request.</li>
          </ul>

          <h2>4. Live Workshops & Events Cancellation Policy</h2>
          <p>
            For live interactive workshops, masterclasses, and bootcamps:
          </p>
          <ul>
            <li><strong>Cancellation 48+ Hours Before:</strong> If you cancel your event registration at least 48 hours prior to the scheduled start time, you are eligible for a 100% full refund.</li>
            <li><strong>Within 48 Hours:</strong> Cancellations made within 48 hours of the live session starting are non-refundable, but we will provide you with full access to the event recording and materials.</li>
            <li><strong>Organizer Rescheduling:</strong> If WIDETECHNOS Academy cancels or reschedules an event, registered attendees may choose either a full 100% refund or free transfer to the rescheduled date.</li>
          </ul>

          <h2>5. How to Request a Refund</h2>
          <p>
            To submit a cancellation or refund request, please follow these simple steps:
          </p>
          <ol style={{ paddingLeft: '1.5rem', marginBottom: '1.25rem', lineHeight: '1.8' }}>
            <li>Email our support team at <strong>support@widetechnos.com</strong> from your registered account email.</li>
            <li>Use the subject line: <code>Refund Request - [Your Transaction ID]</code>.</li>
            <li>Include your Course Name, Transaction ID (found in your invoice under <em>Dashboard &gt; Invoices</em>), and a brief description of why you are requesting a refund.</li>
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
            <strong>WIDETECHNOS Billing Support</strong><br />
            Email: <a href="mailto:support@widetechnos.com">support@widetechnos.com</a><br />
            Support Hours: Monday – Saturday, 9:00 AM – 6:00 PM IST<br />
            Resolution Window: Usually responded to within 24 business hours
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
