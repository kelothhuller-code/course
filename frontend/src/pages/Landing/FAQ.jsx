import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BUYING_FAQS } from '../../config/faqs';
import { openEnquiry } from '../../config/site';

export default function FAQ({ faqs = BUYING_FAQS }) {
  // First question open by default so visitors immediately see the format
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="faq-section" id="faq">
      <div className="container">
        <div className="section-label">FAQ</div>
        <h2 className="section-title">Questions Before You Buy?</h2>
        <p className="section-subtitle">Everything you need to know about pricing, payment and access.</p>
        <div className="faq-list">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            return (
              <div key={faq.q} className="faq-item">
                <h3 className="faq-heading">
                  <button
                    type="button"
                    className={`faq-question ${isOpen ? 'open' : ''}`}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                  >
                    <span>{faq.q}</span>
                    <span className="faq-icon" aria-hidden="true">▼</span>
                  </button>
                </h3>
                {isOpen && (
                  <div className="faq-answer" id={panelId}>
                    {faq.a}
                    {faq.link && (
                      <>
                        {' '}
                        <Link to={faq.link.to}>{faq.link.label} →</Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="faq-more">
          Still have a question?{' '}
          <button type="button" className="link-button" onClick={() => openEnquiry()}>
            Send us an enquiry
          </button>{' '}
          — we reply by email.
        </p>
      </div>
    </section>
  );
}
