// src/pages/dashboard/CertificatesTab.jsx
import React from 'react';

export default function CertificatesTab({ certificates, setSelectedCert, certLoading, setActiveTab }) {
  if (certificates.length === 0) {
    return (
      <div>
        <h2 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Certificates</h2>
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Complete a course 100% to earn your credentials!
          </p>
          <button className="btn btn-primary" onClick={() => setActiveTab('courses')}>
            View My Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Certificates</h2>
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {certificates.map(cert => (
          <div key={cert._id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{cert.courseTitle}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Issued: {new Date(cert.issuedAt).toLocaleDateString()}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                ID: {cert.certificateId}
              </p>
            </div>
            <button 
              className="btn btn-accent btn-sm" 
              onClick={() => setSelectedCert(cert)} 
              disabled={certLoading}
            >
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}