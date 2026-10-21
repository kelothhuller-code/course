import React from 'react';
import EnquiryForm from '../../components/EnquiryForm';
import { SUPPORT_EMAIL, whatsappUrl } from '../../config/site';

/**
 * Landing-page enquiry section (#enquiry).
 * Email/form is the primary channel; WhatsApp is intentionally a single, small
 * text link here only (trust signal) — the owner prefers enquiries by email.
 */
export default function EnquirySection({ user, featuredCourse = null }) {
  const wa = whatsappUrl();
  return (
    <section className="enquiry-section" id="enquiry" aria-labelledby="enquiry-title">
      <div className="container">
        <div className="enquiry-grid">
          <div className="enquiry-intro">
            <div className="section-label">ENQUIRIES</div>
            <h2 className="section-title" id="enquiry-title">Have a Question or a Project?</h2>
            <p>
              Ask about a course, or tell us about the software or automation your business needs.
              Send the form and we'll get back to you by email.
            </p>
            <ul className="enquiry-points">
              <li>🎓 Course questions — pricing, access, certificates</li>
              <li>🛠️ Software & custom bot/automation projects</li>
              <li>🏫 Partnerships and anything else</li>
            </ul>
            <p className="enquiry-alt">
              Prefer email? Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
              {wa && (
                <>
                  <br />
                  <a className="enquiry-wa-link" href={wa} target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 32 32" width="14" height="14" aria-hidden="true" fill="currentColor">
                      <path d="M16 2a13.9 13.9 0 0 0-12 21L2 30l7.2-1.9A13.9 13.9 0 1 0 16 2zm0 25.5a11.5 11.5 0 0 1-5.9-1.6l-.4-.3-4.3 1.1 1.1-4.2-.3-.5A11.6 11.6 0 1 1 16 27.5z" />
                    </svg>
                    We're also on WhatsApp
                  </a>
                </>
              )}
            </p>
          </div>
          <div className="enquiry-card">
            <EnquiryForm user={user} source="landing_page" courseTitle={featuredCourse?.title || ''} />
          </div>
        </div>
      </div>
    </section>
  );
}
