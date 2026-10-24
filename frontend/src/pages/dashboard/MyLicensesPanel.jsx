import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { billingLabel } from '../../utils/gst';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '');

/** "My licences" list in the dashboard: full keys, expiry, devices and a Renew button. */
export default function MyLicensesPanel() {
  const [state, setState] = useState({ loading: true, licenses: [], error: '' });
  const [copied, setCopied] = useState('');

  useEffect(() => {
    let alive = true;
    api.getMyLicenses()
      .then((d) => alive && setState({ loading: false, licenses: d.licenses || [], error: '' }))
      .catch(() => alive && setState({ loading: false, licenses: [], error: 'Could not load your licences. Please refresh.' }));
    return () => { alive = false; };
  }, []);

  const copy = async (key) => {
    try { await navigator.clipboard.writeText(key); setCopied(key); setTimeout(() => setCopied(''), 2500); } catch { /* clipboard blocked */ }
  };

  if (state.loading) return null;
  if (state.error) return <p className="dl-error" role="alert">{state.error}</p>;
  if (!state.licenses.length) return null;

  return (
    <section className="dl-panel" aria-labelledby="dl-lic-title">
      <h3 id="dl-lic-title" className="dl-title">My licence keys</h3>
      <ul className="dl-list">
        {state.licenses.map((l) => {
          const status = l.revoked ? 'revoked' : l.expired ? 'expired' : 'active';
          const slug = l.software?.slug || l.software?._id;
          return (
            <li key={l._id} className="dl-card">
              <div className="dl-head">
                <div>
                  <strong>{l.software?.title || 'Software'}</strong>
                  <span className="dl-sub">{l.planName}{l.billing ? ` · ${billingLabel({ billing: l.billing })}` : ''}</span>
                </div>
                <span className={`dl-badge dl-badge--${status}`}>{status === 'active' ? 'Active' : status === 'expired' ? 'Expired' : 'Revoked'}</span>
              </div>
              <div className="dl-key">
                <code>{l.key || 'Key unavailable, contact support'}</code>
                {l.key && <button type="button" className="btn btn-sm" onClick={() => copy(l.key)}>{copied === l.key ? 'Copied' : 'Copy'}</button>}
              </div>
              <p className="dl-meta">
                {l.lifetime ? 'Lifetime licence' : `${l.expired ? 'Expired' : 'Valid until'} ${fmtDate(l.expiresAt)}`}
                {' · '}{(l.devices || []).length} of {l.maxDevices} device{l.maxDevices === 1 ? '' : 's'} in use
              </p>
              {(l.devices || []).length > 0 && (
                <ul className="dl-devices">
                  {l.devices.map((d, i) => <li key={`${d.deviceName}-${i}`}>{d.deviceName || 'Device'}{d.appVersion ? ` (v${d.appVersion})` : ''}, last seen {fmtDate(d.lastSeenAt)}</li>)}
                </ul>
              )}
              {!l.revoked && slug && l.renewPlans?.length > 0 && (
                <div className="dl-actions">
                  {l.renewPlans.map((p) => (
                    <Link key={p._id} className="btn btn-primary btn-sm" to={`/checkout/software/${encodeURIComponent(slug)}?plan=${encodeURIComponent(p._id)}&renew=${encodeURIComponent(l._id)}`}>
                      Renew: {p.name}
                    </Link>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="dl-help">Need to move a licence to a new computer? Deactivate it in the app first, or email us and we will reset your devices.</p>
    </section>
  );
}
