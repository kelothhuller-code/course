import React from 'react';

export default function AudienceSection() {
  const audiences = [
    { emoji: '🧒', label: 'Kids 10+', desc: 'Learn by creating.' },
    { emoji: '🎓', label: 'Students', desc: 'Build useful projects.' },
    { emoji: '💼', label: 'Professionals', desc: 'Work smarter with AI.' },
    { emoji: '👩', label: 'Parents', desc: 'Understand the technology.' },
    { emoji: '👴', label: 'Seniors', desc: 'Learn AI at your own pace.' },
    { emoji: '🚀', label: 'Entrepreneurs', desc: 'Turn ideas into prototypes.' },
  ];

  return (
    <section className="audience-section">
      <div className="container">
        <div className="section-label">FOR EVERYONE</div>
        <h2 className="section-title">AI Has No Age Limit.</h2>
        <div className="audience-grid">
          {audiences.map((item, index) => (
            <div key={index} className="audience-card">
              <span className="audience-emoji">{item.emoji}</span>
              <h4>{item.label}</h4>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}