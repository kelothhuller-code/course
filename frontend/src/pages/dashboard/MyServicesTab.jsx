import React, { useState, useEffect } from 'react';
import { api } from '../../api';

export default function MyServicesTab({ profile }) {
  const [services, setServices] = useState([]);
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phone: '',
    companyName: '',
    requirements: ''
  });

  const purchasedServices = profile?.purchasedServices || [];

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await api.getAllServices();
        setServices(res.services || []);
      } catch (err) {
        console.error('Error fetching services:', err);
      }
    };
    fetchServices();
  }, []);

  const handleOpenModal = (service = null) => {
    setSelectedService(service);
    setShowEnquiryModal(true);
  };

  const handleSubmitEnquiry = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.submitServiceEnquiry({
        ...formData,
        serviceId: selectedService?._id || null
      });
      alert('Your service request has been received! WideTech engineers will reach out to you within 24 hours on WhatsApp/Phone.');
      setShowEnquiryModal(false);
      setFormData({ name: profile?.name || '', email: profile?.email || '', phone: '', companyName: '', requirements: '' });
      window.location.reload();
    } catch (err) {
      alert('Error submitting enquiry: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
      case 'active':
        return { label: 'LIVE & DEPLOYED', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
      case 'in_progress':
        return { label: 'IN DEVELOPMENT', bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' };
      case 'in_scoping':
        return { label: 'SCOPING & ARCHITECTURE', bg: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' };
      default:
        return { label: 'ENQUIRY RECEIVED', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
            My Services & AI Automations
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Track your bespoke software engineering, bot automation pipelines, and custom development milestones.
          </p>
        </div>
        <button 
          className="btn btn-primary btn-sm" 
          onClick={() => handleOpenModal(null)}
          style={{ padding: '0.5rem 1.25rem', fontWeight: 600 }}
        >
          + Request New Automation / App
        </button>
      </div>

      {/* ── User Active Services ── */}
      {purchasedServices.length === 0 ? (
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '16px', 
          padding: '2.5rem 1.5rem', 
          textAlign: 'center',
          boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)'
        }}>
          <h3 style={{ fontSize: '1.15rem', color: '#0f172a', marginBottom: '0.5rem', fontWeight: 700 }}>
            No Active Custom Services Yet
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
            Looking for a custom WhatsApp AI Bot, Web App, or Mobile App built for your business? Request a free consultation below.
          </p>
          <button className="btn btn-primary" onClick={() => handleOpenModal(null)}>
            Get a Free Consultation / Quote →
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {purchasedServices.map((item, idx) => {
            const svc = item.serviceId || {};
            const badge = getStatusBadge(item.status);

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>
                      {svc.category || 'Bespoke Engineering'}
                    </span>
                    <h3 style={{ margin: '0.25rem 0', fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>
                      {svc.title || 'Custom AI Bot & Software Project'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                      Requirements: {item.requirements || 'Bespoke client specification'}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, background: badge.bg, color: badge.color, padding: '4px 12px', borderRadius: '20px' }}>
                    {badge.label}
                  </span>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Timeline / SLA</span>
                    <strong style={{ color: '#0284c7' }}>{svc.performance || 'Turnaround: 7-14 Days • 24/7 SLA'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Contact Phone</span>
                    <strong style={{ color: '#334155' }}>{item.contactPhone || profile?.phone || '8281760168'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Requested On</span>
                    <strong style={{ color: '#334155' }}>{new Date(item.enquiredAt || Date.now()).toLocaleDateString()}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <a 
                    href={`https://wa.me/918281760168?text=${encodeURIComponent(`Hi WideTech Engineering Lead! I have an update regarding my project: ${svc.title || 'Custom Service'}`)}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                  >
                    💬 Message Assigned Engineer on WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Services Catalog ── */}
      <div style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
          WideTech Agency & Engineering Packages
        </h3>
        <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem' }}>
          End-to-end custom systems engineered, tested, and handed over with complete source code & training.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
          {services.map(svc => (
            <div key={svc._id} style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(99,102,241,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                    {svc.category}
                  </span>
                  {svc.highlightBadge && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px' }}>
                      {svc.highlightBadge}
                    </span>
                  )}
                </div>

                <h4 style={{ margin: '0.4rem 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>
                  {svc.title}
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, marginBottom: '0.85rem' }}>
                  {svc.description}
                </p>

                <div style={{ fontSize: '0.75rem', color: '#0284c7', background: '#f0f9ff', padding: '6px 8px', borderRadius: '6px', marginBottom: '1rem' }}>
                  {svc.performance}
                </div>

                {svc.deliverables && svc.deliverables.length > 0 && (
                  <ul style={{ margin: '0 0 1rem 0', paddingLeft: '1.1rem', fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {svc.deliverables.slice(0, 3).map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Starting from</span>
                  <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>
                    {svc.startingPrice ? `₹${svc.discountedPrice || svc.startingPrice}` : 'Custom Quote'}
                  </strong>
                </div>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => handleOpenModal(svc)}
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  Enquire Now →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* ── Enquiry Modal ── */}
      {showEnquiryModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(6px)',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                  {selectedService ? selectedService.title : 'Request Custom Software / AI Bot'}
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  WideTech bespoke engineering & automation consulting
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
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Your Name *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Email Address *</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })} 
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>WhatsApp / Phone *</label>
                  <input 
                    type="tel" 
                    required 
                    placeholder="e.g. 9876543210" 
                    value={formData.phone} 
                    onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Company / Brand Name</label>
                  <input 
                    type="text" 
                    placeholder="Optional" 
                    value={formData.companyName} 
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })} 
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Tell us about what you want to build *</label>
                <textarea 
                  required 
                  rows={4} 
                  placeholder="e.g. I need an automated WhatsApp chatbot for my restaurant/agency, or I need an iOS and Android app with payment integration..."
                  value={formData.requirements} 
                  onChange={e => setFormData({ ...formData, requirements: e.target.value })} 
                  style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEnquiryModal(false)} disabled={submitting}>
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
    </div>
  );
}
