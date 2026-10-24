import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';
import NavHeader from './NavHeader';
import { SITE_NAME } from '../config/site';
import { ScaledCertificate } from '../components/certificate/CertificateTools';
import './CertificateVerify.css';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/** Public page behind the certificate QR code: /verify/:certificateId (old /certificate/verify/:id too). */
export default function CertificateVerify({ user }) {
  const { certificateId = '' } = useParams();
  const [state, setState] = useState({ loading: true, cert: null, error: '' });
  // Reset to the loading state when the ID in the URL changes (during render, not in the effect).
  const [shownId, setShownId] = useState(certificateId);
  if (shownId !== certificateId) {
    setShownId(certificateId);
    setState({ loading: true, cert: null, error: '' });
  }

  useEffect(() => {
    let alive = true;
    document.title = `Verify certificate · ${SITE_NAME}`;
    api.verifyCertificate(certificateId)
      .then((d) => alive && setState({ loading: false, cert: d.valid ? d.certificate : null, error: '' }))
      .catch((e) => alive && setState({ loading: false, cert: null, error: e.message || 'Could not check this certificate right now.' }));
    return () => { alive = false; };
  }, [certificateId]);

  const { loading, cert, error } = state;
  return (
    <div className="cv-page">
      <NavHeader user={user} />
      <div className="cv-wrap">
        {loading ? (
          <div className="cv-card" aria-busy="true">
            <div className="wt-skeleton" style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto' }} />
            <div className="wt-skeleton wt-skeleton--title" style={{ margin: '1rem auto 0', width: '50%' }} />
            <div className="wt-skeleton wt-skeleton--text" style={{ margin: '0.5rem auto 0', width: '70%' }} />
          </div>
        ) : error ? (
          <div className="cv-card cv-card--warn" role="alert">
            <span className="cv-badge cv-badge--warn"><Icon name="alert-triangle" size={30} /></span>
            <h1>We could not check this certificate</h1>
            <p>{error}</p>
            <button type="button" className="wt-btn wt-btn--secondary" onClick={() => window.location.reload()}><Icon name="refresh" size={18} />Try again</button>
          </div>
        ) : !cert ? (
          <div className="cv-card cv-card--bad">
            <span className="cv-badge cv-badge--bad"><Icon name="close" size={32} strokeWidth={2.4} /></span>
            <h1>Certificate not found</h1>
            <p>No {SITE_NAME} certificate has the ID <code>{certificateId.slice(0, 40)}</code>. Check that the ID was typed exactly as printed (letters and numbers, with dashes).</p>
            <p className="cv-muted">If you received this certificate from someone, ask them for the verification link from their {SITE_NAME} dashboard.</p>
            <Link to="/" className="wt-btn wt-btn--primary">Go to {SITE_NAME}</Link>
          </div>
        ) : (
          <>
            <div className="cv-card cv-card--ok">
              <span className="cv-badge cv-badge--ok"><Icon name="check" size={34} strokeWidth={2.6} /></span>
              <p className="cv-eyebrow">Genuine certificate</p>
              <h1>{cert.userName}</h1>
              <p className="cv-lead">completed <strong>{cert.courseTitle}</strong></p>
              <dl className="cv-facts">
                <div><dt>Issued by</dt><dd>{cert.issuer || SITE_NAME}</dd></div>
                <div><dt>Date of completion</dt><dd>{fmt(cert.issuedAt)}</dd></div>
                {cert.modules ? <div><dt>Modules</dt><dd>{cert.modules}</dd></div> : null}
                {cert.durationLabel ? <div><dt>Course length</dt><dd>{cert.durationLabel}</dd></div> : null}
                <div className="cv-fact--wide"><dt>Certificate ID</dt><dd className="cv-mono">{cert.id}</dd></div>
              </dl>
              {cert.legacyId && <p className="cv-muted cv-small">This is an earlier certificate ID. The name is partly hidden for privacy; the holder can share the current link from their dashboard.</p>}
              <p className="cv-muted cv-small">This page confirms that {SITE_NAME} issued this certificate after the learner completed the course on {SITE_NAME}.</p>
            </div>
            {!cert.legacyId && (
              <div className="cv-preview" aria-label="Certificate preview">
                <ScaledCertificate certificate={{ ...cert, certificateId: cert.id }} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
