import React, { useState, useEffect } from 'react';
import { api } from '../../api';

const FALLBACK_SERVICES = [
  {
    _id: 'default-svc-1',
    title: 'Custom AI Bot & Workflow Automation',
    description: 'We design and deploy fully customized AI WhatsApp bots, Telegram assistants, and automated business workflows that talk to your proprietary databases, qualify inbound leads, and trigger internal alerts.',
    category: 'AI Bot Automation',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    performance: 'Rapid 7-10 Days Turnaround • Custom LLM Tuning • High Accuracy',
    usefulness: 'Completely removes manual support bottleneck. Operates 24/7/365 with multilingual Malayalam & English proficiency.',
    deliverables: [
      'Official Meta WhatsApp Business Cloud API integration',
      'Knowledge ingestion with custom company FAQs & PDFs',
      'Google Sheets, Zoho, or webhook CRM synchronization',
      '30 days dedicated support & maintenance'
    ],
    startingPrice: 14999,
    discountedPrice: 9999,
    highlightBadge: 'MOST POPULAR',
    isFeatured: true
  },
  {
    _id: 'default-svc-2',
    title: 'Custom Software & Web Application Development',
    description: 'Bespoke web applications, SaaS platforms, ERP micro-portals, and client management software built with ultra-modern scalable architecture (React, Node.js, Next.js, and Cloud Infrastructure).',
    category: 'Custom Software',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    performance: 'Sub-second page speeds • Enterprise-grade encryption • Scalable',
    usefulness: 'Turn your unique business requirements or product vision into a bulletproof commercial software application.',
    deliverables: [
      'Interactive UI/UX design & prototype',
      'Scalable full-stack application development',
      'Payment gateways (Razorpay, Stripe) & GST invoices',
      'Deployment to AWS / Vercel / DigitalOcean'
    ],
    startingPrice: 24999,
    discountedPrice: 19999,
    highlightBadge: 'ENTERPRISE',
    isFeatured: true
  },
  {
    _id: 'default-svc-3',
    title: 'Mobile App Engineering (iOS & Android)',
    description: 'Native-feel cross-platform mobile apps for startups and local businesses. Push notifications, offline caching, GPS tracking, and seamless camera/media capabilities.',
    category: 'Mobile App Development',
    thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80',
    performance: 'Smooth 60 FPS • Lightweight APK/IPA • Store Ready',
    usefulness: 'Direct real estate on your customers’ home screens with instant push engagement and mobile commerce.',
    deliverables: [
      'Cross-platform Flutter / React Native architecture',
      'Authentication via Mobile OTP / Google Login',
      'Real-time push notifications setup (Firebase)',
      'Assistance with Google Play Store & Apple App Store submission'
    ],
    startingPrice: 29999,
    discountedPrice: 24999,
    highlightBadge: 'HIGH IMPACT',
    isFeatured: true
  }
];

export default function ServicesShowcase() {
  const [services, setServices] = useState(FALLBACK_SERVICES);
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
        if (res.services && res.services.length > 0) {
          setServices(res.services);
        }
      } catch (err) {
        console.error('Error loading services showcase:', err);
      }
    };
    load();
  }, []);

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
      alert('Thank you! Your enquiry has been received. WideTech engineering team will reach out to you within 24 hours on WhatsApp.');
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
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#0369a1', fontWeight: 600, marginBottom: '1.25rem' }}>
                  {svc.performance || 'Turnaround: 7-14 Days • 24/7 SLA'}
                </div>

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
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>WhatsApp / Phone *</label>
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
