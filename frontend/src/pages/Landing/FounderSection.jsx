import React from 'react';

export default function FounderSection() {
  return (
    <section className="founder-section" id="about">
      <div className="container">
        <div className="founder-card">
          <div className="founder-grid">
            <div className="founder-message">
              <div className="section-label">FOUNDER</div>
              <h3>WIDETECHNOS exists to make AI less intimidating.</h3>
              <p>
                We believe AI education shouldn't belong only to programmers. A curious 10-year-old, 
                a college student, a working professional or a grandparent should all be able to learn 
                how to use AI.
              </p>
              <p>
                Our mission is to make AI accessible, practical, and fun — regardless of your background 
                or previous experience.
              </p>
              <a 
                href="https://instagram.com/videdreamer" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="founder-social"
              >
                📸 Follow @videdreamer
              </a>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '6rem', 
                marginBottom: '0.5rem',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                borderRadius: '50%',
                width: '120px',
                height: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto'
              }}>
                🚀
              </div>
              <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>@videdreamer</p>
              <p style={{ color: 'var(--text-muted)' }}>Founder, WIDETECHNOS</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}