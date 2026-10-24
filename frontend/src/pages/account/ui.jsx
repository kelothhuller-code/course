import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';

/* Shared building blocks for the account area (/dashboard/*). */


export function PageHeader({ title, subtitle, icon, actions }) {
  return (
    <header className="acc-page-head">
      <div className="acc-page-head__text">
        {icon && <span className="acc-page-head__icon" aria-hidden="true"><Icon name={icon} size={22} /></span>}
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="acc-page-head__actions">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon = 'sparkles', title, text, cta, ctaTo, ctaHref, onCta, secondary }) {
  return (
    <div className="acc-empty">
      <span className="acc-empty__icon" aria-hidden="true"><Icon name={icon} size={28} /></span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      <div className="acc-empty__actions">
        {cta && ctaTo && <Link to={ctaTo} className="wt-btn wt-btn--primary">{cta}<Icon name="arrow-right" size={18} /></Link>}
        {cta && ctaHref && <a href={ctaHref} className="wt-btn wt-btn--primary">{cta}</a>}
        {cta && onCta && <button type="button" className="wt-btn wt-btn--primary" onClick={onCta}>{cta}</button>}
        {secondary}
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="acc-empty acc-empty--error" role="alert">
      <span className="acc-empty__icon" aria-hidden="true"><Icon name="alert-triangle" size={28} /></span>
      <h2>Something went wrong</h2>
      <p>{error?.message || 'We could not load this section.'}</p>
      {onRetry && <button type="button" className="wt-btn wt-btn--secondary" onClick={onRetry}><Icon name="refresh" size={18} />Try again</button>}
    </div>
  );
}

export function SkeletonList({ rows = 3, media = false }) {
  return (
    <div className="acc-skel-list" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="acc-card acc-skel-row" key={i}>
          {media && <div className="wt-skeleton acc-skel-media" />}
          <div style={{ flex: 1 }}>
            <div className="wt-skeleton wt-skeleton--title" style={{ width: '45%' }} />
            <div className="wt-skeleton wt-skeleton--text" style={{ width: '80%' }} />
            <div className="wt-skeleton wt-skeleton--text" style={{ width: '60%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const TONES = {
  success: 'acc-pill--success', warning: 'acc-pill--warning', danger: 'acc-pill--danger', info: 'acc-pill--info', neutral: 'acc-pill--neutral',
};
export function Pill({ tone = 'neutral', children, icon }) {
  return <span className={`acc-pill ${TONES[tone] || TONES.neutral}`}>{icon && <Icon name={icon} size={14} />}{children}</span>;
}

export function ProgressBar({ value = 0, label }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="acc-progress">
      <div className="acc-progress__track" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label || 'Progress'}>
        <span className="acc-progress__bar" style={{ width: `${v}%` }} />
      </div>
      <span className="acc-progress__value">{v}%</span>
    </div>
  );
}

/** Accessible confirm dialog (replaces window.confirm). */
export function ConfirmDialog({ open, title, text, confirmLabel = 'Confirm', tone = 'danger', busy, onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    ref.current?.querySelector('button')?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="acc-modal" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}>
      <div className="acc-modal__box" role="alertdialog" aria-modal="true" aria-labelledby="acc-confirm-title" aria-describedby="acc-confirm-text" ref={ref}>
        <h2 id="acc-confirm-title">{title}</h2>
        <p id="acc-confirm-text">{text}</p>
        <div className="acc-modal__actions">
          <button type="button" className="wt-btn wt-btn--secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={`wt-btn wt-btn--primary ${tone === 'danger' ? 'acc-btn-danger' : ''}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
