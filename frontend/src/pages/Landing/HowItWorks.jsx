import React from 'react';

export default function HowItWorks() {
  const steps = [
    { number: '01', title: 'Pick a lesson', desc: 'Choose from beginner-friendly courses and tutorials.' },
    { number: '02', title: 'Build with AI', desc: 'Follow along and use AI to create your projects.' },
    { number: '03', title: 'Create something real', desc: 'Publish your work and share it with the world.' },
  ];

  return (
    <section className="how-section">
      <div className="container">
        <div className="section-label">HOW IT WORKS</div>
        <h2 className="section-title">Start Learning in 3 Simple Steps</h2>
        <div className="how-steps">
          {steps.map((step, index) => (
            <div key={index} className="how-step">
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