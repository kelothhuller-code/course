import React from 'react';

export default function TrustStrip() {
  const audiences = [
    { emoji: '🧒', label: '10+ Kids' },
    { emoji: '🎓', label: 'Students' },
    { emoji: '💼', label: 'Professionals' },
    { emoji: '👩', label: 'Parents' },
    { emoji: '👴', label: 'Seniors' },
    { emoji: '🚀', label: 'Entrepreneurs' },
  ];

  return (
    <section className="trust-section">
      <div className="container">
        <div className="trust-content">
          <p className="trust-message">Built for curious minds, not just programmers.</p>
          <div className="trust-audience">
            {audiences.map((item, index) => (
              <span key={index} className="trust-chip">
                <span>{item.emoji}</span> {item.label}
              </span>
            ))}
          </div>
          <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            One AI skill. Unlimited possibilities.
          </p>
        </div>
      </div>
    </section>
  );
}