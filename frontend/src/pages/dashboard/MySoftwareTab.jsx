import React, { useState, useEffect } from 'react';
import { api } from '../../api';

export default function MySoftwareTab({ profile, setActiveTab }) {
  const [allSoftwares, setAllSoftwares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);

  const purchasedList = profile?.purchasedSoftware || [];

  useEffect(() => {
    const fetchSoftwares = async () => {
      try {
        const res = await api.getAllSoftware();
        setAllSoftwares(res.softwares || []);
      } catch (err) {
        console.error('Error loading softwares:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSoftwares();
  }, []);

  const copyToClipboard = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleUnlockDemo = async (swId) => {
    try {
      const res = await api.unlockSoftware(swId);
      alert(res.message || 'Software unlocked! Refreshing profile...');
      window.location.reload();
    } catch (err) {
      alert(err.message || 'Failed to unlock software');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Tab Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div>
            <h2 className="section-title" style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              My Softwares & AI Tools
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Access your software licenses, repositories, performance specs, and documentation.
            </p>
          </div>
          <button 
            className="btn btn-sm" 
            onClick={() => {
              const el = document.getElementById('explore-software-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{ background: '#f1f5f9', color: '#0f172a', fontWeight: 600, border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 14px' }}
          >
            Browse New Software Tools ↓
          </button>
        </div>
      </div>

      {/* ── Section 1: Purchased Softwares ── */}
      {purchasedList.length === 0 ? (
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '16px', 
          padding: '2.5rem 1.5rem', 
          textAlign: 'center',
          boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)'
        }}>
          <h3 style={{ fontSize: '1.15rem', color: '#0f172a', marginBottom: '0.5rem', fontWeight: 700 }}>
            No Software Products Owned Yet
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
            Unlock ready-to-deploy AI WhatsApp bots, lead enrichment tools, and full-stack MERN production templates below.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {purchasedList.map((item, idx) => {
            const sw = item.softwareId || {};
            const licenseKey = item.licenseKey || `WT-SW-DEMO-${idx + 100}`;

            return (
              <div key={idx} style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <img 
                      src={sw.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80'} 
                      alt={sw.title || 'Software'} 
                      style={{ width: '80px', height: '60px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                    />
                    <div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>
                        {sw.category || 'AI Tool'}
                      </span>
                      <h3 style={{ margin: '0.25rem 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>
                        {sw.title || 'WideTech Software Tool'}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                        {sw.description?.substring(0, 95)}...
                      </p>
                    </div>
                  </div>

                  <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 12px', borderRadius: '20px' }}>
                    ● ACTIVE LICENSE
                  </span>
                </div>

                {/* Specs & Performance */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Performance Specs</span>
                    <strong style={{ color: '#0284c7' }}>{sw.performance || 'Sub-150ms latency • 99.9% Uptime'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Practical Usefulness</span>
                    <strong style={{ color: '#334155' }}>{sw.usefulness || 'Autonomous customer lead handling'}</strong>
                  </div>
                </div>

                {/* License Key Box */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f1f5f9', border: '1px dashed #cbd5e1', padding: '0.6rem 1rem', borderRadius: '8px', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.82rem' }}>
                    <span style={{ color: '#64748b' }}>License Key: </span>
                    <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1', fontSize: '0.9rem' }}>{licenseKey}</code>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(licenseKey)}
                    style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: '#334155' }}
                  >
                    {copiedKey === licenseKey ? '✓ Copied' : 'Copy Key'}
                  </button>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <a 
                    href={sw.downloadUrl || 'https://github.com/kelothhuller-code/course'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                  >
                    Download Files / Repo
                  </a>
                  <a 
                    href={sw.demoUrl || 'https://wa.me/918281760168?text=Hi%20WideTech!%20I%20have%20questions%20about%20my%20software%20license.'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                  >
                    Technical Support Desk
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Section 2: Explore Available Softwares & Bots ── */}
      <div id="explore-software-section" style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
          Available Software Products & Bot Systems
        </h3>
        <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem' }}>
          Tested and deployed enterprise bots and workflow accelerators engineered by WideTech.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
          {allSoftwares.map(sw => (
            <div key={sw._id} style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ height: '140px', position: 'relative', overflow: 'hidden' }}>
                  {sw.highlightBadge && (
                    <span style={{ position: 'absolute', top: '10px', right: '10px', background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', zIndex: 1 }}>
                      {sw.highlightBadge}
                    </span>
                  )}
                  <img 
                    src={sw.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'} 
                    alt={sw.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <div style={{ padding: '1.25rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(99,102,241,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                    {sw.category}
                  </span>
                  <h4 style={{ margin: '0.4rem 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
                    {sw.title}
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                    {sw.usefulness || sw.description?.substring(0, 85) + '...'}
                  </p>
                  <div style={{ fontSize: '0.75rem', color: '#0284c7', background: '#f0f9ff', padding: '6px 8px', borderRadius: '6px', marginBottom: '0.75rem' }}>
                    {sw.performance}
                  </div>
                </div>
              </div>


              <div style={{ padding: '1.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                    ₹{sw.discountedPrice || sw.price}
                  </span>
                  {sw.discountedPrice && sw.discountedPrice < sw.price && (
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', textDecoration: 'line-through', marginLeft: '6px' }}>
                      ₹{sw.price}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <a 
                    href={`https://wa.me/918281760168?text=${encodeURIComponent(`Hi WideTech! I would like to get software tool: ${sw.title}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                  >
                    🛒 Get Tool
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
