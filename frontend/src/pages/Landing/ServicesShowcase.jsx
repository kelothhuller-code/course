import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import tracker from '../../utils/tracker';

export default function ServicesShowcase() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalService, setModalService] = useState(null);
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
        const res = await api.getAllServices();
        setServices(res.services || []);
      } catch (err) {
        console.error('Error loading services showcase:', err);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Avoid section completely if nothing has been added
  if (!loading && services.length === 0) {
    return null;
  }

  if (loading) {
    return null;
  }

  const handleEnquiry = (svc) => {
    setModalService(svc);
  };

  const handleClose = () => {
    setModalService(null);
    setFormData({ name: '', email: '', phone: '', companyName: '', requirements: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.submitServiceEnquiry({
        ...formData,
        serviceId: modalService?._id || null
      });
      tracker.trackEvent('enquiry_submit', { source: 'service_modal' });
      alert('Thank you! Your enquiry has been received. The WideTech team will reply to you by email.');
      handleClose();
    } catch (err) {
      alert('Error submitting enquiry: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="services-section" id="services" style={{ padding: '5rem 0', background: 'var(--bg-dark)' }}>
      <div className="container">
        <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 3rem auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 800, color: '#0284c7', background: 'rgba(2,132,199,0.08)', padding: '4px 14px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            ENGINEERING & AUTOMATION AGENCY
          </div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 0.75rem 0' }}>
            AI Bot Automation & Custom Software Development
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
            We don’t just teach technology — we build and deploy production systems for businesses, creators, and enterprises worldwide.
          </p>
        </div>


        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.75rem' }}>
          {services.map(svc => (
            <div 
              key={svc._id} 
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                padding: '2rem 1.75rem',
                boxShadow: '0 10px 30px -4px rgba(15, 23, 42, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', background: 'rgba(2,132,199,0.08)', padding: '3px 10px', borderRadius: '6px' }}>
                    {svc.category}
                  </span>
                  {svc.highlightBadge && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: '20px' }}>
                      {svc.highlightBadge}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '0.5rem 0 0.75rem', lineHeight: 1.3 }}>
                  {svc.title}
                </h3>

                <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  {svc.description}
                </p>

                {/* Delivery SLA Box */}
                {svc.performance && (
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#0369a1', fontWeight: 600, marginBottom: '1.25rem' }}>
                    {svc.performance}
                  </div>
                )}

                {/* Deliverables List */}
                {svc.deliverables && svc.deliverables.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.84rem', color: '#334155' }}>
                    {svc.deliverables.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ color: '#10b981', fontWeight: 800, marginTop: '2px' }}>✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pricing & CTA */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Investment</span>
                  <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>
                    {svc.startingPrice ? `From ₹${svc.discountedPrice || svc.startingPrice}` : 'Custom Quote'}
                  </strong>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleEnquiry(svc)}
                    style={{ padding: '0.5rem 1.1rem', fontWeight: 700 }}
                  >
                    Get Consultation →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enquiry Modal */}
      {modalService && (
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
                  Enquire: {modalService.title}
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Get in touch with WideTech engineering lead for a free project scoping call
                </p>
              </div>
              <button 
                onClick={handleClose} 
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
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Company Name</label>
                  <input 
                    type="text" 
                    value={formData.companyName} 
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })} 
                    placeholder="Brand / Business"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>What are your project goals & requirements? *</label>
                <textarea 
                  required 
                  rows={4} 
                  value={formData.requirements} 
                  onChange={e => setFormData({ ...formData, requirements: e.target.value })} 
                  placeholder="Describe your current bottlenecks or what you want the custom software or AI bot to do..."
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Send Enquiry & Get Free Quote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
