import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import { SUPPORT_EMAIL } from '../../config/site';
import { money } from '../../utils/gst';
import CheckoutHeader from './CheckoutHeader';

const GstInvoiceModal = lazy(() => import('../dashboard/GstInvoiceModal'));

/** Light, CSS-only confetti: 18 small pieces, runs once, skipped with reduced motion. */
function Confetti() {
  const colors = ['#4338ca', '#0f766e', '#f59e0b', '#ec4899', '#22c55e', '#6366f1'];
  return (
    <div className="co-confetti" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => (
        <span key={i} style={{ '--x': `${(i * 37) % 100}%`, '--d': `${(i % 6) * 90}ms`, '--r': `${(i * 47) % 360}deg`, background: colors[i % colors.length] }} />
      ))}
    </div>
  );
}

export default function PaymentSuccess({ kind, item, selected, success, user }) {
  const [copied, setCopied] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const headingRef = useRef(null);
  useEffect(() => { headingRef.current?.focus(); }, []);

  const copyKey = async () => {
    try { await navigator.clipboard.writeText(success.licenseKey); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* clipboard blocked */ }
  };
  const lic = success.license;
  const exp = lic?.expiresAt ? new Date(lic.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : null;
  const devices = lic?.maxDevices || 1;
  const signedIn = Boolean(user || success.hasSession);

  const primary = kind === 'course' ? { to: `/course/${item.id}`, label: 'Start learning', icon: 'play' }
    : kind === 'event' ? { to: '/dashboard/events', label: 'View my event', icon: 'calendar' }
      : kind === 'software' ? { to: '/dashboard/software', label: 'Open My software', icon: 'key' }
        : { to: '/dashboard/services', label: 'Track my order', icon: 'briefcase' };

  const steps = [];
  if (kind === 'course') {
    steps.push({ icon: 'play', text: <>Your course is unlocked. Start any time from <strong>My courses</strong>.</> });
  } else if (kind === 'event') {
    steps.push({ icon: 'calendar', text: <>You're registered. The joining link is in <strong>My events</strong>.</> });
  } else if (kind === 'software') {
    steps.push({ icon: 'monitor', text: <>Open {item.title} and enter the licence key above when the app asks for it.</> });
    steps.push({ icon: 'shield', text: <>Works on {devices} device{devices === 1 ? '' : 's'}. {exp ? `Valid until ${exp}.` : 'Lifetime licence.'}</> });
  } else {
    steps.push({ icon: 'phone', text: <>We'll contact you at <strong>{success.email}</strong> to collect what we need and schedule the work.</> });
    if (success.serviceOrder?.deliveryTime) steps.push({ icon: 'clock', text: <>Typical delivery: {success.serviceOrder.deliveryTime} after we have your inputs.</> });
    steps.push({ icon: 'briefcase', text: <>Follow each step of your order in <strong>Service orders</strong>.</> });
  }
  steps.push({ icon: 'mail', text: success.newlyCreated
    ? <>We created your account for <strong>{success.email}</strong> and emailed your login details{kind === 'software' ? ', licence key' : ''} and GST invoice.</>
    : <>Your receipt{kind === 'software' ? ', licence key' : ''} and GST invoice are on their way to <strong>{success.email}</strong>.</> });

  return (
    <div className="co-page">
      <CheckoutHeader />
      <main id="main-content" className="co-main">
        <div className="co-success">
          <Confetti />
          <div className="co-card co-success__card" role="status" aria-live="polite">
            <div className="co-success__badge" aria-hidden="true"><Icon name="check" size={34} strokeWidth={2.4} /></div>
            <h1 className="co-success__title" tabIndex={-1} ref={headingRef}>
              {kind === 'software' ? (lic?.renewed ? 'Licence renewed!' : 'Your licence is ready!') : kind === 'service' ? 'Order confirmed!' : "Payment successful — you're in!"}
            </h1>
            <p className="co-success__lead">
              {item.title}{selected?.name && selected.name !== item.title ? ` · ${selected.name}` : ''}
              {success.amount != null && <> · <strong>{money(success.amount)}</strong> paid</>}
            </p>
            {(success.serviceOrder?.orderNo || success.invoiceNo) && (
              <p className="co-success__ids">
                {success.serviceOrder?.orderNo && <span>Order <strong>{success.serviceOrder.orderNo}</strong></span>}
                {success.invoiceNo && <span>Invoice <strong>{success.invoiceNo}</strong></span>}
              </p>
            )}

            {success.licenseKey && (
              <div className="co-key">
                <span className="co-key__label">Your licence key</span>
                <div className="co-key__row">
                  <code>{success.licenseKey}</code>
                  <button type="button" className="wt-btn wt-btn--secondary wt-btn--sm" onClick={copyKey}><Icon name={copied ? 'check' : 'copy'} size={16} />{copied ? 'Copied' : 'Copy'}</button>
                </div>
              </div>
            )}

            <h2 className="co-success__next">Next steps</h2>
            <ul className="co-success__steps">
              {steps.map((s, i) => <li key={i}><span className="co-success__stepicon"><Icon name={s.icon} size={18} /></span><span>{s.text}</span></li>)}
            </ul>

            <div className="co-success__actions">
              <Link to={primary.to} className="wt-btn wt-btn--primary wt-btn--lg wt-btn--block"><Icon name={primary.icon} size={18} />{primary.label}</Link>
              <div className="co-success__secondary">
                {signedIn && success.txnid
                  ? <button type="button" className="wt-btn wt-btn--secondary" onClick={() => setInvoiceOpen(true)}><Icon name="download" size={18} />GST invoice</button>
                  : <Link to="/dashboard/orders" className="wt-btn wt-btn--secondary"><Icon name="download" size={18} />GST invoice</Link>}
                <Link to="/dashboard" className="wt-btn wt-btn--secondary"><Icon name="grid" size={18} />Go to dashboard</Link>
              </div>
            </div>
            <p className="co-success__help">Need help? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
          </div>
        </div>
      </main>
      {invoiceOpen && (
        <Suspense fallback={null}>
          <GstInvoiceModal txnid={success.txnid} onClose={() => setInvoiceOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
