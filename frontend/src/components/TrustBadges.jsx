import React from 'react';

export default function TrustBadges({ compact = false }) {
  const badges = [
    {
      icon: '🛡️',
      title: '100% Secure Checkout',
      desc: 'Encrypted payment via Razorpay — UPI, cards & more'
    },
    {
      icon: '📜',
      title: 'Instant GST Tax Invoice',
      desc: 'Compliant B2C & B2B GST tax invoice emailed automatically'
    },
    {
      icon: '🎓',
      title: 'Verifiable Certificate',
      desc: 'Earn a verifiable digital certificate upon 100% completion'
    },
    {
      icon: '💬',
      title: 'Direct Instructor Q&A',
      desc: 'Ask questions directly under every chapter and live session'
    }
  ];

  if (compact) {
    return (
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        justifyContent: 'center',
        padding: '0.8rem 1rem',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginTop: '1rem'
      }}>
        {badges.map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>
            <span>{b.icon}</span>
            <span>{b.title}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{
      margin: '2.5rem 0',
      padding: '2rem 1.5rem',
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)'
    }}>
      <h3 style={{
        textAlign: 'center',
        fontSize: '1.2rem',
        fontWeight: 800,
        color: '#0f172a',
        marginBottom: '1.5rem',
        letterSpacing: '-0.02em'
      }}>
        {/* TODO(owner): only add a learner count here if it is a real, verifiable number */}
        Why Learners Trust WideTech
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem'
      }}>
        {badges.map((b, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '1.2rem',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #f1f5f9'
          }}>
            <div style={{
              fontSize: '1.8rem',
              marginBottom: '0.6rem',
              padding: '0.4rem 0.6rem',
              background: 'rgba(99, 102, 241, 0.1)',
              borderRadius: '10px'
            }}>
              {b.icon}
            </div>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>
              {b.title}
            </h4>
            <p style={{ fontSize: '0.83rem', color: '#64748b', lineHeight: 1.45, margin: 0 }}>
              {b.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
