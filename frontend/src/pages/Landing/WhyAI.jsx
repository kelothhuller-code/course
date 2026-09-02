import React from 'react';

export default function WhyAI() {
  const reasons = [
    {
      icon: '🤖',
      title: 'AI as Your Coding Partner',
      desc: 'You don\'t have to memorize hundreds of lines of code. AI helps you write, debug, and understand code.'
    },
    {
      icon: '⚡',
      title: 'Build Faster',
      desc: 'Turn ideas into working prototypes much faster than traditional coding methods.'
    },
    {
      icon: '🧠',
      title: 'Learn by Building',
      desc: 'Understand concepts while creating real projects that you can actually use and share.'
    },
    {
      icon: '🌎',
      title: 'Skills for the AI Era',
      desc: 'Learn a practical skill that can be applied to websites, apps, automation and more.'
    }
  ];

  return (
    <section className="why-section" id="why-ai">
      <div className="container">
        <div className="section-label">WHY AI?</div>
        <h2 className="section-title">Why Learn Coding with AI?</h2>
        <div className="why-grid">
          {reasons.map((item, index) => (
            <div key={index} className="why-card">
              <div className="why-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}