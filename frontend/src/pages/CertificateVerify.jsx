import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

export default function CertificateVerify() {
  const { certificateId } = useParams();
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const data = await api.verifyCertificate(certificateId);
        if (data.valid) {
          setCertificate(data.certificate);
        } else {
          setError('Certificate not found or invalid');
        }
      } catch (err) {
        setError(err.message || 'Failed to verify certificate');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [certificateId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="logo-text" style={{ animation: 'pulse 1.5s infinite' }}>VERIFYING CERTIFICATE...</div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="container" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
          <h2>Invalid Certificate</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{error || 'This certificate could not be verified.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem 0' }}>
      <div className="glass-card" style={{ padding: '3rem', maxWidth: '700px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '4rem' }}>🎓</div>
          <h1 style={{ color: 'var(--primary)' }}>Verified Certificate</h1>
          <p style={{ color: 'var(--text-muted)' }}>This certificate is valid and officially issued</p>
        </div>

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
              {certificate.userName}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>for completing</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.25rem 0' }}>
              {certificate.courseTitle}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.7, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
            <div>
              <div>Issued: {new Date(certificate.issuedAt).toLocaleDateString()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>ID: {certificate.id}</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Verified ✓</div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Verify this certificate at {window.location.origin}/certificate/verify/{certificate.id}
          </p>
          <button className="btn btn-primary" onClick={() => window.print()}>
            🖨️ Print Certificate
          </button>
        </div>
      </div>
    </div>
  );
}