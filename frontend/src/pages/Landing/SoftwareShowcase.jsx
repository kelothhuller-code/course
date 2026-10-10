import React, { useState, useEffect } from 'react';
import { api } from '../../api';

const FALLBACK_SOFTWARES = [
  {
    _id: 'default-sw-1',
    title: 'WideTech AI WhatsApp Support & Lead Bot',
    description: 'Autonomous 24/7 WhatsApp AI Assistant powered by GPT-4o. Qualifies incoming customer enquiries, answers FAQs with zero hallucinations, books meetings, and synchronizes real-time leads to Google Sheets / CRM.',
    category: 'AI Bot & Automation',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    performance: 'Sub-150ms Response • 99.9% Uptime • Zero Server Lock-in',
    usefulness: 'Saves 20+ hours weekly on customer support, captures leads automatically 24/7 without extra human staff.',
    features: [
      'Multi-turn AI conversations in Malayalam & English',
      'Automated Lead qualification & CRM webhook sync',
      'Media message handling (PDF brochures & catalog)',
      'Custom knowledge base ingestion'
    ],
    price: 9999,
    discountedPrice: 4999,
    couponEligible: true,
    highlightBadge: 'BESTSELLER',
    isFeatured: true
  },
  {
    _id: 'default-sw-2',
    title: 'Automated Lead Enrichment & Prospecting System',
    description: 'High-speed automated bot that extracts B2B leads from Google Maps / Directories, enriches emails, verifies phone numbers, and generates personalized outreach pitches using AI.',
    category: 'Business Tool',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    performance: 'Scrapes & enriches 1,000+ verified leads/hour • 98% Email accuracy',
    usefulness: 'Directly powers your outbound sales engine. Never run out of high-ticket clients or business contacts.',
    features: [
      'Automated Google Places & Directory lead extraction',
      'Real-time MX-record and SMTP email verification',
      'AI Icebreaker & personalized cold email generator'
    ],
    price: 12000,
    discountedPrice: 6499,
    couponEligible: true,
    highlightBadge: 'HIGH ROI',
    isFeatured: true
  },
  {
    _id: 'default-sw-3',
    title: 'Full-Stack MERN + AI SaaS Production Starter Kit',
    description: 'Complete production-ready boilerplate codebase including Authentication, Razorpay payment gateway, GST automated invoicing, Super Admin control panel, and OpenAI API integration.',
    category: 'Developer Kit',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    performance: 'Deploy in under 10 minutes on Vercel & Render • Zero Tech Debt',
    usefulness: 'Cuts development time by 3 to 4 weeks. Build and sell your own SaaS or client apps effortlessly.',
    features: [
      'React (Vite) + Node.js (Express) + MongoDB architecture',
      'Integrated Razorpay webhook verified checkout & GST receipts',
      'Role-based access control (Student & Super Admin roles)'
    ],
    price: 5999,
    discountedPrice: 2999,
    couponEligible: true,
    highlightBadge: 'DEVELOPER CHOICE',
    isFeatured: true
  }
];

export default function SoftwareShowcase() {
  const [softwares, setSoftwares] = useState(FALLBACK_SOFTWARES);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getAllSoftware();
        if (res.softwares && res.softwares.length > 0) {
          setSoftwares(res.softwares);
        }
      } catch (err) {
        console.error('Error loading software showcase:', err);
      }
    };
    load();
  }, []);

  return (
    <section className="software-section" id="software" style={{ padding: '5rem 0', background: 'var(--bg-card)' }}>
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
                    src={item.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'} 
                    alt={item.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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

                  {/* Performance Specs Box */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem', fontSize: '0.8rem', color: '#0284c7', fontWeight: 600, marginBottom: '1rem' }}>
                    {item.performance || 'Sub-150ms Response • 99.9% Uptime'}
                  </div>

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
                  <a 
                    href={`https://wa.me/918281760168?text=${encodeURIComponent(`Hi WideTech! I am interested in purchasing software: ${item.title}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ padding: '0.5rem 1.1rem', fontWeight: 700 }}
                  >
                    Buy Tool →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
