import React from 'react';

export default function CourseCurriculum({ course }) {
  const modules = course?.modules || [
    { title: 'Understanding AI as Your Coding Partner', duration: '15 min' },
    { title: 'Setting Up Your Tools', duration: '20 min' },
    { title: 'How to Prompt AI for Code', duration: '25 min' },
    { title: 'Build Your First Website', duration: '30 min' },
    { title: 'Customize Design and Content', duration: '20 min' },
    { title: 'Fix Errors with AI', duration: '15 min' },
    { title: 'Make Your Website Mobile Friendly', duration: '20 min' },
    { title: 'Publish Your Website', duration: '15 min' },
  ];

  return (
    <section className="why-section" style={{ background: 'var(--background-white)' }}>
      <div className="container">
        <div className="section-label">CURRICULUM</div>
        <h2 className="section-title">What You'll Learn</h2>
        <p className="section-subtitle">Designed for absolute beginners — every module builds on the last.</p>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {modules.map((module, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              borderBottom: index < modules.length - 1 ? '1px solid var(--border)' : 'none',
              gap: '1rem'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  background: 'var(--primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {index + 1}
                </span>
                <span style={{ fontWeight: 500 }}>{module.title}</span>
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {module.duration}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}