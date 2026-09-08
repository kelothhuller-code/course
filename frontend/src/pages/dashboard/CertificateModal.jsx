// src/pages/dashboard/CertificateModal.jsx
import React from 'react';

export default function CertificateModal({ 
  selectedCert, 
  setSelectedCert, 
  profile,
  handlePrintCert 
}) {
  if (!selectedCert) return null;

  return (
    <div className="modal-overlay" onClick={() => setSelectedCert(null)} style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div className="modal-content" style={{ 
        background: 'var(--background-white)',
        borderRadius: 'var(--radius-lg)',
        maxWidth: '700px',
        width: '100%',
        padding: '2rem',
        position: 'relative'
      }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setSelectedCert(null)} style={{
          position: 'absolute',
          top: '0.75rem',
          right: '1rem',
          background: 'none',
          border: 'none',
          fontSize: '2rem',
          cursor: 'pointer',
          color: 'var(--text-muted)'
        }}>×</button>
        
        <div className="certificate-preview-container">
          <div id="cert-print-area">
            <div className="certificate-card" style={{ 
              padding: '2rem',
              background: 'linear-gradient(135deg, #1a1a2e, #2d1b4e)',
              borderRadius: 'var(--radius-lg)',
              color: '#fff',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                WIDETECHNOS ACADEMY
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1.5rem' }}>
                Certificate of Accomplishment
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>This is proudly presented to</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#c084fc', margin: '0.25rem 0' }}>
                  {selectedCert.userName || profile?.name}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>for completing</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.25rem 0' }}>
                  {selectedCert.courseTitle}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.7, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                <div>
                  <div>Date: {new Date(selectedCert.issuedAt).toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>ID: {selectedCert.certificateId}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Verified ✓</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handlePrintCert}>
              🖨️ Print / Download PDF
            </button>
            <button className="btn btn-secondary" onClick={() => setSelectedCert(null)}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}