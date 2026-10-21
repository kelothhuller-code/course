import React from 'react';

export default function FounderSection() {
  return (
    <section className="founder-section" id="about">
      <div className="container">
        <div className="founder-card">
          <div className="founder-grid">
            <div className="founder-message">
              <div className="section-label">FOUNDER & INSTRUCTOR</div>
              <h3>WIDETECH exists to make AI less intimidating.</h3>
              <p style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                "AI ഇനി ആർക്കും പഠിക്കാം — Practical, Simple & Future-Ready."
              </p>
              <p>
                We believe AI education shouldn't belong only to computer programmers. A curious student, 
                a working professional, a business owner or a creator should all be able to harness 
                the superpower of Artificial Intelligence.
              </p>
              <p>
                Our mission is to make AI accessible, practical, and hands-on in Malayalam and English — regardless of your previous background.
              </p>
              <a 
                href="https://instagram.com/widetechai" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="founder-social"
              >
                📸 Follow @widetechai
              </a>
            </div>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ 
                position: 'relative',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                padding: '4px',
                background: 'linear-gradient(135deg, #6366f1, #0284c7)',
                boxShadow: '0 12px 30px -6px rgba(99, 102, 241, 0.45)',
                marginBottom: '1rem',
                overflow: 'hidden'
              }}>
                <img 
                  src="/founder.webp"
                  width="140"
                  height="140"
                  loading="lazy"
                  decoding="async" 
                  alt="Broffy, founder of WIDETECH" 
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              </div>
              <p style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '2px' }}>Broffy</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Founder, WIDETECH Academy</p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.78rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 10px', borderRadius: '12px' }}>
                <span>●</span> Wayanad, Kerala
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}