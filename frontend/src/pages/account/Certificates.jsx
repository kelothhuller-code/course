import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import Icon from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { ScaledCertificate } from '../../components/certificate/CertificateTools';
import { useCertificatePrint } from '../../components/certificate/useCertificatePrint';
import { linkedInAddUrl, verifyUrlFor } from '../../components/certificate/certificateLinks';
import { EmptyState, ErrorState, PageHeader, SkeletonList } from './ui';
import { fmtDate, useAsync } from './format';

function Viewer({ cert, onClose, onPrint }) {
  const toast = useToast();
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [onClose]);
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(verifyUrlFor(cert.certificateId)); toast.success('Verification link copied'); } catch { toast.error('Could not copy. The link is on the verification page.'); }
  };
  return (
    <div className="acc-viewer" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="acc-viewer__box" role="dialog" aria-modal="true" aria-label={`Certificate for ${cert.courseTitle}`} tabIndex={-1} ref={ref}>
        <div className="acc-viewer__bar">
          <div className="acc-viewer__title"><strong>{cert.courseTitle}</strong><span className="acc-muted acc-small">ID {cert.certificateId}</span></div>
          <div className="acc-viewer__actions">
            <button type="button" className="wt-btn wt-btn--primary wt-btn--sm" onClick={() => onPrint(cert)}><Icon name="print" size={16} />Print / Save PDF</button>
            <a className="wt-btn wt-btn--secondary wt-btn--sm" href={linkedInAddUrl(cert)} target="_blank" rel="noopener noreferrer"><Icon name="linkedin" size={16} />Add to LinkedIn</a>
            <button type="button" className="wt-btn wt-btn--ghost wt-btn--sm" onClick={copyLink}><Icon name="copy" size={16} />Copy link</button>
            <button type="button" className="acc-icon-btn" onClick={onClose} aria-label="Close certificate"><Icon name="close" size={20} /></button>
          </div>
        </div>
        <div className="acc-viewer__stage"><ScaledCertificate certificate={cert} /></div>
        <p className="acc-muted acc-small acc-viewer__hint">Tip: in the print dialog choose “Save as PDF”. The page is set to A4 landscape with no margins.</p>
      </div>
    </div>
  );
}

export default function Certificates() {
  const { loading, error, data, reload } = useAsync(() => api.getCertificates());
  const [params, setParams] = useSearchParams();
  const { print, portal } = useCertificatePrint();
  const list = data?.certificates || [];
  const openId = params.get('view');
  const open = list.find((c) => c.certificateId === openId) || null;
  const setOpen = (c) => setParams((p) => { const n = new URLSearchParams(p); if (c) n.set('view', c.certificateId); else n.delete('view'); return n; }, { replace: !c });

  return (
    <div className="acc-stack">
      <PageHeader icon="award" title="Certificates" subtitle="Finish every lesson of a course to earn its certificate. Each one has a public verification link." />
      {loading && !data ? <SkeletonList rows={2} media /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !list.length ? (
        <EmptyState icon="award" title="No certificates yet" text="Complete a course and your certificate appears here, ready to print, save as PDF or add to LinkedIn." cta="Continue learning" ctaTo="/dashboard/courses" />
      ) : (
        <ul className="acc-cert-grid">
          {list.map((c) => (
            <li key={c.certificateId} className="acc-card acc-cert">
              <button type="button" className="acc-cert__preview" onClick={() => setOpen(c)} aria-label={`Open certificate for ${c.courseTitle}`}>
                <span className="acc-cert__ribbon" aria-hidden="true"><Icon name="award" size={30} /></span>
                <span className="acc-cert__mini">Certificate of Completion</span>
              </button>
              <div className="acc-cert__body">
                <h2>{c.courseTitle}</h2>
                <p className="acc-muted acc-small">Completed {fmtDate(c.issuedAt)}{c.modules ? ` · ${c.modules} modules` : ''}{c.durationLabel ? ` · ${c.durationLabel}` : ''}</p>
                <p className="acc-small acc-mono">{c.certificateId}</p>
                <div className="acc-cert__actions">
                  <button type="button" className="wt-btn wt-btn--primary wt-btn--sm" onClick={() => setOpen(c)}><Icon name="eye" size={16} />View</button>
                  <button type="button" className="wt-btn wt-btn--secondary wt-btn--sm" onClick={() => print(c)}><Icon name="print" size={16} />Print / PDF</button>
                  <Link className="acc-link" to={`/verify/${c.certificateId}`} target="_blank" rel="noopener">Verification page<Icon name="external" size={14} /></Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && <Viewer cert={open} onClose={() => setOpen(null)} onPrint={print} />}
      {portal}
    </div>
  );
}
