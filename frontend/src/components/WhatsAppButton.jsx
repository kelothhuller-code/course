import React, { useState } from 'react';

export default function WhatsAppButton() {
  const [showTooltip, setShowTooltip] = useState(true);
  const phoneNumber = '918281760168';
  const defaultMessage = encodeURIComponent(
    'Hi WideTech Academy! I would like to know more about your AI courses and workshops.'
  );
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${defaultMessage}`;

  return (
    <aside 
      aria-label="WhatsApp Support Desk"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}
    >
      {/* Floating Prompt Pill */}
      {showTooltip && (
        <div 
          style={{
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(12px)',
            color: '#fff',
            padding: '8px 14px',
            borderRadius: '24px',
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.82rem',
            fontWeight: 600,
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <span style={{ color: '#25D366' }}>●</span>
          <span>Chat on WhatsApp</span>
          <button 
            onClick={(e) => {
              e.preventDefault();
              setShowTooltip(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              marginLeft: '4px',
              padding: '0 2px',
              fontSize: '1rem',
              lineHeight: 1
            }}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Main WhatsApp Circular Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contact WideTech Academy on WhatsApp"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#25D366',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px -3px rgba(37, 211, 102, 0.5), 0 4px 6px -2px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease',
          textDecoration: 'none',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 15px 30px -3px rgba(37, 211, 102, 0.65)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = '0 10px 25px -3px rgba(37, 211, 102, 0.5)';
        }}
      >
        <svg 
          viewBox="0 0 32 32" 
          width="32" 
          height="32" 
          fill="#ffffff"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}
        >
          <path d="M16 2a13.9 13.9 0 0 0-12 21L2 30l7.2-1.9A13.9 13.9 0 1 0 16 2zm0 25.5a11.5 11.5 0 0 1-5.9-1.6l-.4-.3-4.3 1.1 1.1-4.2-.3-.5A11.6 11.6 0 1 1 16 27.5zm6.4-8.6c-.3-.2-2-1-2.3-1.1-.3-.1-.6-.2-.8.2-.3.3-.9 1.1-1.1 1.3-.2.2-.4.2-.7.1a9.2 9.2 0 0 1-2.7-1.7 10.2 10.2 0 0 1-1.9-2.3c-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6 0-.2 0-.4-.1-.5s-.8-2-1.1-2.7c-.3-.7-.6-.6-.8-.6h-.7a1.4 1.4 0 0 0-1 1.5 5.3 5.3 0 0 0 1.1 2.8 12.1 12.1 0 0 0 4.6 4.1c2.8 1.2 2.8.8 3.3.8.5 0 1.7-.7 1.9-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.3-.6-.4z"/>
        </svg>
      </a>
    </aside>
  );
}
