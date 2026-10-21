import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import tracker from '../../utils/tracker';
import { getMediaUrl, FALLBACK_SOFTWARE_THUMBNAIL } from '../../utils/media';
import { openEnquiry } from '../../config/site';

export default function SoftwareShowcase() {
  const [softwares, setSoftwares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalSoftware, setModalSoftware] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    requirements: ''
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getAllSoftware();
        setSoftwares(res.softwares || []);
      } catch (err) {
        console.error('Error loading software showcase:', err);
        setSoftwares([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleEnquiry = (sw) => {
    setModalSoftware(sw);
  };

  const handleClose = () => {
    setModalSoftware(null);
    setFormData({ name: '', email: '', phone: '', companyName: '', requirements: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.submitSoftwareEnquiry({
        ...formData,
        softwareId: modalSoftware?._id || null
      });
      tracker.trackEvent('enquiry_submit', { source: 'software_modal' });
      alert('Thank you! Your enquiry has been received. The WideTech team will reply to you by email.');
      handleClose();
    } catch (err) {
      alert('Error submitting enquiry: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return null; // Don't flash empty state
  }

  // No software published yet: still show a clear "software for your business" offer
  // (copy reused from the existing hero) so business visitors have a path to enquire.
  // TODO(owner): add your software products in the admin portal → Software; they will
  // automatically replace this block with real product cards and prices.
  if (softwares.length === 0) {
    return (
      <section className="software-section software-fallback" id="software" aria-labelledby="software-title">
        <div className="container">
          <div className="section-label">SOFTWARE & AUTOMATION FOR BUSINESSES</div>
          <h2 className="section-title" id="software-title">Ready-to-Run Software & Custom Bots</h2>
          <p className="section-subtitle">
            Deploy WideTech's ready-to-run commercial software systems, or have us engineer custom bots and
            business automations for you.
          </p>
          <div className="software-fallback-grid">
            <div className="software-fallback-card">
              <span className="software-fallback-icon" aria-hidden="true">🧩</span>
              <h3>Ready-to-run software</h3>
              <p>Commercial tools and production templates you can deploy for your business.</p>
            </div>
            <div className="software-fallback-card">
              <span className="software-fallback-icon" aria-hidden="true">🤖</span>
              <h3>Custom bots & automation</h3>
              <p>Bots and workflow automations engineered around your process.</p>
            </div>
          </div>
          <div className="software-fallback-cta">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => openEnquiry('Software')}>
              Tell Us What You Need →
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="software-section" id="software" style={{ padding: '5rem 0', background: 'var(--background-white)' }}>
      <div className="container">
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3rem auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(99,102,241,0.08)', padding: '4px 14px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            COMMERCIAL SOFTWARE & BOT SYSTEMS
          </div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 0.75rem 0' }}>
            Ready-to-Deploy Softwares & AI Tools
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
            Proven commercial tools, AI WhatsApp bots, and full-stack production templates built by WideTech. Tested for performance, zero lock-in, and immediate business ROI.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.75rem' }}>
          {softwares.map(item => (
            <div 
              key={item._id} 
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 10px 30px -4px rgba(15, 23, 42, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease'
              }}
            >
              <div>
                {/* Thumbnail & Badge */}
                <div style={{ height: '170px', position: 'relative', overflow: 'hidden', background: '#0f172a' }}>
                  {item.highlightBadge && (
                    <span style={{ 
                      position: 'absolute', 
                      top: '12px', 
                      right: '12px', 
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
                      color: '#fff', 
                      fontSize: '0.72rem', 
                      fontWeight: 800, 
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      zIndex: 2,
                      boxShadow: '0 4px 12px rgba(217, 119, 6, 0.4)'
                    }}>
                      {item.highlightBadge}
                    </span>
                  )}
                  <img 
                    src={getMediaUrl(item.thumbnail) || FALLBACK_SOFTWARE_THUMBNAIL} 
                    alt={item.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = FALLBACK_SOFTWARE_THUMBNAIL;
                    }}
                  />
                </div>

                {/* Details */}
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(99,102,241,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                      {item.category}
                    </span>
                    {item.couponEligible && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#059669', background: 'rgba(16,185,129,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                        Coupons Accepted
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0.35rem 0 0.5rem', lineHeight: 1.3 }}>
                    {item.title}
                  </h3>
                  
                  <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1rem' }}>
                    {item.usefulness || item.description}
                  </p>

                  {/* Performance Specs Box (only when the owner has entered real specs) */}
                  {item.performance && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem', fontSize: '0.8rem', color: '#0284c7', fontWeight: 600, marginBottom: '1rem' }}>
                      {item.performance}
                    </div>
                  )}

                  {/* Feature Bullets */}
                  {item.features && item.features.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', color: '#334155' }}>
                      {item.features.slice(0, 3).map((feat, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Price & Action */}
              <div style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                    ₹{item.discountedPrice || item.price}
                  </span>
                  {item.discountedPrice && item.discountedPrice < item.price && (
                    <span style={{ fontSize: '0.82rem', color: '#94a3b8', textDecoration: 'line-through', marginLeft: '6px' }}>
                      ₹{item.price}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    type="button"
                    onClick={() => handleEnquiry(item)}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '0.5rem 1.1rem', fontWeight: 700 }}
                  >
                    Get This Software →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* On-Page Software Enquiry Modal (Direct to Backend) */}
      {modalSoftware && (
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
          <div role="dialog" aria-modal="true" aria-label={`Enquire about ${modalSoftware.title}`} style={{
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
                  Enquire: {modalSoftware.title}
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Request product access, licensing, and direct deployment support
                </p>
              </div>
              <button 
                onClick={handleClose} 
                aria-label="Close"
                style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Your Name *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="e.g. Rahul Sharma"
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
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Phone (optional)</label>
                  <input 
                    type="tel" 
                    value={formData.phone} 
                    onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                    placeholder="9876543210"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Company / Use Case</label>
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
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Requirements / Questions</label>
                <textarea 
                  rows="3"
                  value={formData.requirements} 
                  onChange={e => setFormData({ ...formData, requirements: e.target.value })} 
                  placeholder="Tell us what you plan to build or any custom feature requirements..."
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical' }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={handleClose} 
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
                  {submitting ? 'Submitting...' : '🚀 Submit Enquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
