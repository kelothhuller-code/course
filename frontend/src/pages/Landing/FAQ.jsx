import { useState } from 'react';
import Icon from '../../components/Icon';
import { Link } from 'react-router-dom';
import { BUYING_FAQS } from '../../config/faqs';
import { openEnquiry } from '../../config/site';

export default function FAQ({ faqs = BUYING_FAQS }) {
  // First question open by default so visitors immediately see the format
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="wt-section wt-section--white faq-section" id="faq" aria-labelledby="faq-title">
      <div className="wt-container wt-container--narrow">
        <div className="wt-section-head reveal">
          <p className="wt-eyebrow">FAQ</p>
          <h2 className="wt-h2" id="faq-title">Questions before you buy?</h2>
          <p className="wt-lead">Pricing, payment, access and how enquiries work.</p>
        </div>
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
                    <Icon name="chevron-down" size={20} className="faq-icon" />
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
