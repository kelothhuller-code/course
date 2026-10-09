import React, { useState } from 'react';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      q: 'Do I need coding experience?',
      a: 'No, our beginner curriculum is designed to start from the absolute basics. No prior coding knowledge is required.'
    },
    {
      q: 'What age is this for?',
      a: '10+ and anyone who wants to learn. The course is designed to be accessible to beginners of all ages.'
    },
    {
      q: 'Do I need to be good at math?',
      a: 'No advanced mathematics is required for starting with AI-powered website development.'
    },
    {
      q: 'What will I build?',
      a: 'You\'ll build and publish your own website using AI as your coding partner. The curriculum guides you step by step.'
    },
    {
      q: 'Is this a live course?',
      a: 'Our courses are pre-recorded video modules you can watch at your own pace with lifetime access. We also conduct live hands-on workshops separately.'
    },
    {
      q: 'Can I watch the lessons on mobile?',
      a: 'Yes, the course platform is fully responsive and works on mobile devices, tablets, and desktop computers.'
    },
    {
      q: 'How do I access the course after payment?',
      a: 'After enrollment, you get instant access to the course in your student dashboard. You can start learning right away.'
    },
    {
      q: 'Are workshops included with courses?',
      a: 'Self-paced video courses provide lifetime access to modules and certificates. Live interactive workshops are offered separately with their own schedules.'
    }
  ];

  return (
    <section className="faq-section">
      <div className="container">
        <div className="section-label">FAQ</div>
        <h2 className="section-title">Frequently Asked Questions</h2>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div key={index} className="faq-item">
              <button 
                className={`faq-question ${openIndex === index ? 'open' : ''}`}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                aria-expanded={openIndex === index}
              >
                <span>{faq.q}</span>
                <span className="faq-icon">▼</span>
              </button>
              {openIndex === index && (
                <div className="faq-answer">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}