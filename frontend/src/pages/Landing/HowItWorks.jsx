import React from 'react';

/**
 * How buying works — universal for every course, and answers the "what happens after I pay?"
 * question that stops first-time buyers. Every step reflects the real checkout flow.
 */
export default function HowItWorks() {
  const steps = [
    { number: '01', title: 'Pay securely', desc: 'Checkout with Razorpay — UPI, cards or net banking. No account needed beforehand; the price already includes GST.' },
    { number: '02', title: 'Get instant access', desc: 'You go straight to the course. Your login details and GST invoice are emailed to you.' },
    { number: '03', title: 'Learn at your pace', desc: 'Lifetime access from your dashboard, on your phone or computer.' },
  ];

  return (
    <section className="how-section">
      <div className="container">
        <div className="section-label">HOW IT WORKS</div>
        <h2 className="section-title">Start in 3 Simple Steps</h2>
        <div className="how-steps">
          {steps.map((step) => (
            <div key={step.number} className="how-step">
              <div className="how-number">{step.number}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
