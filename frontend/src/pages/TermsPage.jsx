import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import NavHeader from './NavHeader';
import Footer from './Landing/Footer';
import './LegalPage.css';

export default function TermsPage({ user }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-page-wrapper">
      <NavHeader user={user} />

      <header className="legal-header">
        <div className="container">
          <span className="legal-badge">Legal & Compliance</span>
          <h1>Terms and Conditions</h1>
          <p>Please read these terms and conditions carefully before using WIDETECHNOS Academy.</p>
        </div>
      </header>

      <main className="legal-main">
        <div className="legal-quick-nav">
          <Link to="/terms" className="legal-nav-link active">Terms & Conditions</Link>
          <Link to="/privacy" className="legal-nav-link">Privacy Policy</Link>
          <Link to="/refund" className="legal-nav-link">Refund Policy</Link>
          <Link to="/contact" className="legal-nav-link">Contact Us</Link>
        </div>

        <article className="legal-card">
          <div className="legal-meta-tags">
            <span><strong>Effective Date:</strong> January 1, 2026</span>
            <span><strong>Last Updated:</strong> October 2026</span>
            <span><strong>Platform:</strong> WIDETECHNOS Academy (widetech.in)</span>
          </div>

          <h2>1. Introduction & Acceptance</h2>
          <p>
            Welcome to <strong>WIDETECHNOS Academy</strong>, operated by <strong>WIDE VENTURES</strong> (operating trade names: <strong>WIDE TECH</strong>, <strong>BROFFY</strong>, and WIDETECHNOS Academy; GSTIN: <strong>32FBEPK9712B1Z0</strong>) with registered office at 8/7/a, Thettamala, Mananthavady Road, Wayanad, Kerala - 670731, India ("we," "our," or "us"). By accessing or using our website located at <code>widetech.in</code>, mobile applications, courses, workshops, and educational services (collectively, the "Platform"), you agree to be bound by these Terms and Conditions ("Terms").
          </p>
          <p>
            If you do not agree with any part of these Terms, you must not access or register for our courses or use any of our services.
          </p>

          <h2>2. User Accounts & Eligibility</h2>
          <p>
            To enroll in our courses, workshops, or access digital materials, you must register for an account using accurate, complete, and current information.
          </p>
          <ul>
            <li>You must be at least 10 years of age. If you are under 18 years of age, you represent that you are accessing the Platform with the consent and supervision of a parent or legal guardian.</li>
            <li>You are solely responsible for maintaining the confidentiality of your login credentials and for all activities conducted through your account.</li>
            <li>Sharing account access, credentials, or courses with multiple unauthorized users is strictly prohibited and may result in immediate suspension without refund.</li>
          </ul>

          <h2>3. Course Access & Intellectual Property License</h2>
          <p>
            When you purchase a course or enroll in an educational program on WIDETECHNOS Academy:
          </p>
          <ul>
            <li>We grant you a personal, limited, non-exclusive, non-transferable license to view and access the course content for your own personal educational purposes.</li>
            <li>All videos, source code, written lectures, graphics, logos, and materials remain the exclusive intellectual property of WIDETECHNOS Academy.</li>
            <li>You may not copy, record, reproduce, distribute, resell, or publicly broadcast any course materials without our prior written consent.</li>
          </ul>

          <h2>4. Payments, Pricing & Invoicing</h2>
          <p>
            All course and workshop prices are listed in Indian Rupees (INR) and are inclusive of applicable Goods and Services Tax (GST) unless specified otherwise.
          </p>
          <ul>
            <li>Payments are processed securely through RBI-authorized payment gateways, including <strong>Razorpay</strong> and PayU. We do not store your credit/debit card numbers or UPI MPINs.</li>
            <li>Upon successful payment, an automated GST-compliant tax invoice is generated and made accessible in your student dashboard under <strong>Dashboard &gt; Invoices</strong>.</li>
            <li>We reserve the right to revise course prices, introduce promotional discounts, or modify coupon terms at any time without prior notice.</li>
          </ul>

          <h2>5. Digital Delivery & Fulfillment Policy</h2>
          <div className="legal-highlight-box">
            <strong>Immediate Access:</strong> WIDETECHNOS Academy delivers digital learning content. Course and tutorial access is fulfilled automatically and granted immediately upon successful transaction confirmation. No physical shipping is required.
          </div>
          <p>
            If your payment succeeds but you do not see the course in your dashboard within 15 minutes, please contact us at <code>support@widetechnos.com</code> with your Transaction ID for prompt assistance.
          </p>

          <h2>6. Certificates of Completion</h2>
          <p>
            Verified certificates are awarded to students upon 100% completion of course chapters and required assessments. Certificates include a unique verification ID that can be authenticated on our public verification portal at <code>/certificate/verify/:id</code>.
          </p>

          <h2>7. Student Code of Conduct</h2>
          <p>
            As a student or participant in our community workshops and forums, you agree not to:
          </p>
          <ul>
            <li>Post unlawful, abusive, harassing, or defamatory content in discussion comments or live chat.</li>
            <li>Attempt to reverse-engineer, exploit vulnerabilities, or inject malicious scripts into the Platform.</li>
            <li>Misrepresent your identity or tamper with course completion progress or certificates.</li>
          </ul>

          <h2>8. Limitation of Liability</h2>
          <p>
            WIDETECHNOS Academy provides educational training designed to teach AI, programming, and web development skills. While we strive for the highest quality of instruction, we make no guarantees regarding specific employment outcomes, job offers, or earnings. To the maximum extent permitted by applicable Indian law, WIDETECHNOS Academy shall not be liable for any indirect, incidental, or consequential damages resulting from the use of our Platform.
          </p>

          <h2>9. Governing Law & Jurisdiction</h2>
          <p>
            These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of India. Any legal disputes arising out of or related to these Terms shall be subject to the exclusive jurisdiction of the courts located in Kerala, India.
          </p>

          <h2>10. Contact Us</h2>
          <p>
            If you have questions or concerns regarding these Terms, please contact our legal and support team:
          </p>
          <div className="legal-highlight-box">
            <strong>WIDE VENTURES (WIDE TECH / BROFFY)</strong><br />
            GSTIN: 32FBEPK9712B1Z0<br />
            Address: 8/7/a, Thettamala, Mananthavady Road, Wayanad, Kerala - 670731, India<br />
            Email: <a href="mailto:support@widetechnos.com">support@widetechnos.com</a><br />
            Website: <a href="https://widetech.in">https://widetech.in</a><br />
            Support Hours: Monday – Saturday, 9:00 AM – 6:00 PM IST
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
