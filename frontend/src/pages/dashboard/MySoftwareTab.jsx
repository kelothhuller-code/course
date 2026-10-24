import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { getMediaUrl, FALLBACK_SOFTWARE_THUMBNAIL } from '../../utils/media';
import MyLicensesPanel from './MyLicensesPanel';
import './dashboardLicensing.css';

export default function MySoftwareTab({ profile, setActiveTab }) {
  const [allSoftwares, setAllSoftwares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);
  const [selectedSoftware, setSelectedSoftware] = useState(null);
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phone: '',
    companyName: '',
    requirements: ''
  });

  // Licence-plan purchases (stored with a masked key "…ABCDE") are listed by MyLicensesPanel instead
  const purchasedList = (profile?.purchasedSoftware || []).filter((p) => !String(p.licenseKey || '').startsWith('…'));

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

  const handleOpenEnquiry = (sw) => {
    setSelectedSoftware(sw);
    setShowEnquiryModal(true);
  };

  const handleSubmitEnquiry = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.submitSoftwareEnquiry({
        ...formData,
        softwareId: selectedSoftware?._id || null
      });
      alert('Your enquiry has been received in our backend! WideTech engineers will reach out to you directly within 24 hours.');
      setShowEnquiryModal(false);
      setFormData({ name: profile?.name || '', email: profile?.email || '', phone: '', companyName: '', requirements: '' });
    } catch (err) {
      alert('Error submitting enquiry: ' + err.message);
    } finally {
      setSubmitting(false);
    }
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

      <MyLicensesPanel />

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
                      src={getMediaUrl(sw.thumbnail) || FALLBACK_SOFTWARE_THUMBNAIL} 
                      alt={sw.title || 'Software'} 
                      style={{ width: '80px', height: '60px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = FALLBACK_SOFTWARE_THUMBNAIL;
                      }}
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
                    <code style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.9rem' }}>{licenseKey}</code>
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
                    href="/contact"
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
                    <span style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--color-primary)', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', zIndex: 1 }}>
                      {sw.highlightBadge}
                    </span>
                  )}
                  <img 
                    src={getMediaUrl(sw.thumbnail) || FALLBACK_SOFTWARE_THUMBNAIL} 
                    alt={sw.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = FALLBACK_SOFTWARE_THUMBNAIL;
                    }}
                  />
                </div>

                <div style={{ padding: '1.25rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(67, 56, 202,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
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
                  <button 
                    type="button"
                    onClick={() => handleOpenEnquiry(sw)}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                  >
                    🛒 Enquire / Get Tool
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── On-Page Software Enquiry Modal (Direct to Backend) ── */}
      {showEnquiryModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: 800 }}>
                  Enquire: {selectedSoftware ? selectedSoftware.title : 'Software Product'}
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Request software licensing, repo files, and technical deployment
                </p>
              </div>
              <button 
                onClick={() => setShowEnquiryModal(false)} 
                style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEnquiry} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Your Name *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="Your Name"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Email Address *</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })} 
                  placeholder="you@company.com"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Contact Phone *</label>
                  <input 
                    type="tel" 
                    required 
                    value={formData.phone} 
                    onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                    placeholder="9876543210"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Company Name</label>
                  <input 
                    type="text" 
                    value={formData.companyName} 
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })} 
                    placeholder="Agency / Personal"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Custom Requirements / Questions</label>
                <textarea 
                  rows="3"
                  value={formData.requirements} 
                  onChange={e => setFormData({ ...formData, requirements: e.target.value })} 
                  placeholder="Describe your use-case or any custom features required..."
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical' }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowEnquiryModal(false)} 
                  className="btn btn-secondary"
                  style={{ padding: '0.55rem 1rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ padding: '0.55rem 1.25rem', fontWeight: 700 }}
                >
                  {submitting ? 'Submitting...' : '🚀 Submit Software Enquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
