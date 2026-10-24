import { verifyUrlFor } from './certificateLinks';
import { memo, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { FOUNDER, SITE_NAME } from '../../config/site';
import { epitrochoid, rosette, waveBandH, waveBandV } from './guilloche';
import './certificate.css';

/*
 * Premium A4-landscape certificate (1123 × 794 CSS px = 297 × 210 mm at 96 dpi).
 * Everything printed comes from real data: learner name, course title, completion date, module
 * count and total duration from the course, the unique certificate ID and a QR code that opens
 * the public /verify/<id> page. No accreditation claims are made.
 *
 * Optional signature image: VITE_FOUNDER_SIGNATURE_URL (e.g. /signature.png placed in /public).
 */
const W = 1123;
const H = 794;
const SIGNATURE_URL = String(import.meta.env.VITE_FOUNDER_SIGNATURE_URL || '').trim();


const Border = memo(function Border() {
  const d = useMemo(() => {
    const band = { amp: 7, wave: 34, lines: 6, step: 2 };
    const top = waveBandH(70, W - 70, 40, band);
    const bottom = waveBandH(70, W - 70, H - 40, band);
    const left = waveBandV(70, H - 70, 40, band);
    const right = waveBandV(70, H - 70, W - 40, band);
    const corners = [[40, 40], [W - 40, 40], [40, H - 40], [W - 40, H - 40]].map(([x, y]) => ({
      x, y, petals: rosette(x, y, { r0: 17, a: 7, n: 9, curves: 4, steps: 240 }),
    }));
    return { lines: [...top, ...bottom, ...left, ...right], corners };
  }, []);
  return (
    <svg className="cert-border" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" focusable="false">
      <rect x="14" y="14" width={W - 28} height={H - 28} fill="none" stroke="var(--cert-ink)" strokeWidth="2" />
      <rect x="22" y="22" width={W - 44} height={H - 44} fill="none" stroke="var(--cert-gold)" strokeWidth="0.8" />
      <g fill="none" stroke="var(--cert-gold)" strokeWidth="0.55" opacity="0.95">
        {d.lines.map((p, i) => <path key={i} d={p} />)}
      </g>
      <rect x="58" y="58" width={W - 116} height={H - 116} fill="none" stroke="var(--cert-gold)" strokeWidth="0.8" />
      <rect x="64" y="64" width={W - 128} height={H - 128} fill="none" stroke="var(--cert-ink)" strokeWidth="1.4" />
      {d.corners.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r="27" fill="var(--cert-paper)" stroke="var(--cert-ink)" strokeWidth="1.2" />
          <g fill="none" stroke="var(--cert-ink)" strokeWidth="0.5">{c.petals.map((p, j) => <path key={j} d={p} />)}</g>
        </g>
      ))}
    </svg>
  );
});

const Watermark = memo(function Watermark() {
  const paths = useMemo(() => [
    ...rosette(W / 2, H / 2 + 10, { r0: 230, a: 22, n: 30, curves: 6, steps: 900 }),
    ...rosette(W / 2, H / 2 + 10, { r0: 150, a: 18, n: 20, curves: 5, steps: 720 }),
    epitrochoid(W / 2, H / 2 + 10, { R: 60, r: 12, p: 30, scale: 1.2, steps: 1200 }),
  ], []);
  return (
    <svg className="cert-watermark" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" focusable="false">
      <g fill="none" stroke="var(--cert-ink)" strokeWidth="0.5">{paths.map((p, i) => <path key={i} d={p} />)}</g>
    </svg>
  );
});

const Seal = memo(function Seal() {
  const paths = useMemo(() => [
    ...rosette(70, 70, { r0: 56, a: 6, n: 24, curves: 4, steps: 480 }),
    epitrochoid(70, 70, { R: 20, r: 5, p: 11, scale: 1.2, steps: 600 }),
  ], []);
  return (
    <svg className="cert-seal" viewBox="0 0 140 140" width="140" height="140" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="cert-seal-g" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#f3e3b8" />
          <stop offset="60%" stopColor="#d8b56a" />
          <stop offset="100%" stopColor="#a7803c" />
        </radialGradient>
        <path id="cert-seal-arc" d="M70 70 m-45 0 a45 45 0 1 1 90 0 a45 45 0 1 1 -90 0" />
      </defs>
      <circle cx="70" cy="70" r="64" fill="url(#cert-seal-g)" />
      <g fill="none" stroke="#7a5a22" strokeWidth="0.6" opacity="0.9">{paths.map((p, i) => <path key={i} d={p} />)}</g>
      <circle cx="70" cy="70" r="36" fill="#fbf4e1" stroke="#7a5a22" strokeWidth="1" />
      <text className="cert-seal__ring"><textPath href="#cert-seal-arc" startOffset="0">{`${SITE_NAME.toUpperCase()} · CERTIFICATE OF COMPLETION · `}</textPath></text>
      <text x="70" y="66" textAnchor="middle" className="cert-seal__mark">{SITE_NAME}</text>
      <text x="70" y="82" textAnchor="middle" className="cert-seal__small">COMPLETED</text>
    </svg>
  );
});

function QrBlock({ id }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toString(verifyUrlFor(id), { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1b1f3b', light: '#0000' } })
      .then((s) => { if (alive) setSvg(s); })
      .catch(() => {});
    return () => { alive = false; };
  }, [id]);
  // The SVG string comes from the QR library (generated locally from our own URL), not from user input.
  return <div className="cert-qr" role="img" aria-label={`QR code to verify certificate ${id}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

const fmtLongDate = (d) => {
  const date = d ? new Date(d) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
};

export default function PremiumCertificate({ certificate, className = '' }) {
  const c = certificate || {};
  const id = c.certificateId || c.id;
  const facts = [
    c.modules ? `${c.modules} module${c.modules === 1 ? '' : 's'}` : '',
    c.durationLabel ? `${c.durationLabel} of content` : '',
  ].filter(Boolean).join(' · ');
  const nameSize = (c.userName || '').length > 28 ? 46 : (c.userName || '').length > 20 ? 54 : 62;
  const titleSize = (c.courseTitle || '').length > 60 ? 22 : (c.courseTitle || '').length > 38 ? 26 : 30;

  return (
    <div className={`cert-sheet ${className}`} lang="en">
      <Watermark />
      <Border />
      <div className="cert-body">
        <header className="cert-head">
          <img src="/logo.svg" alt="" className="cert-logo" width="54" height="44" />
          <span className="cert-brand">{SITE_NAME}</span>
        </header>
        <p className="cert-kicker">Certificate of Completion</p>
        <p className="cert-lead">This is to certify that</p>
        <h1 className="cert-name" style={{ fontSize: `${nameSize}px` }}>{c.userName}</h1>
        <div className="cert-rule" aria-hidden="true"><span /><i /><span /></div>
        <p className="cert-lead">has successfully completed the course</p>
        <h2 className="cert-course" style={{ fontSize: `${titleSize}px` }}>{c.courseTitle}</h2>
        {facts && <p className="cert-facts">{facts}</p>}

        <footer className="cert-foot">
          <div className="cert-sign">
            {SIGNATURE_URL ? <img className="cert-sign__img" src={SIGNATURE_URL} alt="" /> : <span className="cert-sign__space" />}
            <span className="cert-sign__line" />
            {FOUNDER.name ? <strong>{FOUNDER.name}</strong> : <strong>{SITE_NAME}</strong>}
            <span>{FOUNDER.name ? (FOUNDER.role || `Founder, ${SITE_NAME}`) : 'Issuer'}</span>
          </div>
          <div className="cert-center">
            <Seal />
            <div className="cert-date"><span>Date of completion</span><strong>{fmtLongDate(c.issuedAt)}</strong></div>
          </div>
          <div className="cert-verify">
            {id && <QrBlock id={id} />}
            <div className="cert-verify__text">
              <span>Certificate ID</span>
              <strong className="cert-id">{id}</strong>
              <span>Verify at {window.location.host}/verify</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
