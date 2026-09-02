import React from 'react';

export default function BuildJourney() {
  const steps = [
    { icon: '💡', label: 'Choose an idea' },
    { icon: '🤖', label: 'Ask AI' },
    { icon: '💻', label: 'Generate code' },
    { icon: '🎨', label: 'Customize' },
    { icon: '🌐', label: 'Publish' },
    { icon: '🎉', label: 'Share' },
  ];

  return (
    <section className="build-journey">
      <div className="container">
        <div className="section-label">YOUR JOURNEY</div>
        <h2 className="section-title">From 'I Know Nothing' to 'My Website Is Live.'</h2>
        <p className="section-subtitle">
          Learn how to communicate with AI and understand the basics — not just copy code.
        </p>
        <div className="journey-steps">
          {steps.map((step, index) => (
            <div key={index} className="journey-step">
              <span className="journey-icon">{step.icon}</span>
              <span className="journey-label">{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}