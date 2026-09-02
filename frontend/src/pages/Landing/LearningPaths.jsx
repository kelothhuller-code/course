import React from 'react';

export default function LearningPaths() {
  const paths = [
    { icon: '💻', title: 'Coding with AI', desc: 'Build websites, apps and software.', status: 'Available' },
    { icon: '📈', title: 'Trading with AI', desc: 'Explore how AI can assist research and analysis.', status: 'Coming Soon' },
    { icon: '🏠', title: 'AI for Daily Life', desc: 'Use AI for learning, planning and productivity.', status: 'Coming Soon' },
    { icon: '⚙️', title: 'AI Automation', desc: 'Automate repetitive workflows.', status: 'Coming Soon' },
    { icon: '🎨', title: 'AI Creativity', desc: 'Create content, designs and projects.', status: 'Coming Soon' },
    { icon: '🚀', title: 'AI for Business', desc: 'Use AI to work smarter and build faster.', status: 'Coming Soon' },
  ];

  return (
    <section className="why-section" style={{ background: 'var(--background-white)' }}>
      <div className="container">
        <div className="section-label">ECOSYSTEM</div>
        <h2 className="section-title">What Else Can You Learn?</h2>
        <div className="why-grid">
          {paths.map((item, index) => (
            <div key={index} className="why-card" style={{ position: 'relative' }}>
              <div className="why-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
              <span style={{ 
                display: 'inline-block',
                fontSize: '0.65rem',
                fontWeight: 600,
                padding: '0.2rem 0.6rem',
                borderRadius: '40px',
                background: item.status === 'Available' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                color: item.status === 'Available' ? '#10B981' : 'var(--text-muted)',
                marginTop: '0.5rem'
              }}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}