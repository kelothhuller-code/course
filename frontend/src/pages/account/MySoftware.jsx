import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import Icon from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { ConfirmDialog, EmptyState, ErrorState, PageHeader, Pill, SkeletonList } from './ui';
import { daysUntil, fmtDate, inr, useAsync } from './format';
import { licenceStatus, maskKey } from './MySoftware.helpers';
import { formatBytes } from '../../utils/bytes';

const billingLabel = (p) => ({ monthly: 'per month', yearly: 'per year', lifetime: 'one-time', custom: p.customDays ? `for ${p.customDays} days` : '' }[p.billing] || '');

function Countdown({ licence }) {
  if (licence.lifetime) return <span className="acc-countdown acc-countdown--ok"><Icon name="check-circle" size={16} />Never expires</span>;
  const d = daysUntil(licence.expiresAt);
  if (d === null) return null;
  if (d <= 0) return <span className="acc-countdown acc-countdown--bad"><Icon name="alert-triangle" size={16} />Expired on {fmtDate(licence.expiresAt)}</span>;
  const tone = d <= 14 ? 'warn' : 'ok';
  return (
    <span className={`acc-countdown acc-countdown--${tone}`}>
      <Icon name="clock" size={16} />
      <span><strong>{d}</strong> day{d === 1 ? '' : 's'} left · ends {fmtDate(licence.expiresAt)}</span>
    </span>
  );
}

function KeyField({ licence }) {
  const toast = useToast();
  const [show, setShow] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(licence.key);
      toast.success('Licence key copied');
    } catch {
      setShow(true);
      toast.info('Copy is blocked by the browser. The key is now shown; select and copy it.');
    }
  };
  if (!licence.key) return <p className="acc-muted">Key ending …{licence.keyLast} (contact support to see the full key)</p>;
  return (
    <div className="acc-key">
      <code className="acc-key__value" aria-label={show ? 'Licence key' : 'Licence key (hidden)'}>{show ? licence.key : maskKey(licence.key)}</code>
      <button type="button" className="acc-icon-btn" onClick={() => setShow((v) => !v)} aria-pressed={show} aria-label={show ? 'Hide licence key' : 'Show licence key'}>
        <Icon name={show ? 'eye-off' : 'eye'} size={18} />
      </button>
      <button type="button" className="wt-btn wt-btn--secondary wt-btn--sm" onClick={copy}><Icon name="copy" size={16} />Copy</button>
    </div>
  );
}

function LicenceCard({ licence, onChanged }) {
  const toast = useToast();
  const st = licenceStatus(licence);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const sw = licence.software || {};

  const deactivate = async () => {
    setBusy(true);
    try {
      await api.deactivateLicenseDevice(licence._id, confirm.ref);
      toast.success(`${confirm.deviceName || 'Computer'} removed. You can activate the licence on another computer now.`);
      setConfirm(null);
      onChanged();
    } catch (e) {
      toast.error(e.message || 'Could not remove the computer.');
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const lv = sw.latestVersion;
      await api.downloadSoftware(sw._id, lv?.fileName || `${sw.slug || 'software'}`, lv ? { version: lv.version, platform: lv.platform } : {});
      toast.success('Your download has started.');
    } catch (e) {
      toast.error(e.message || 'Download is not available right now.');
    } finally {
      setDownloading(false);
    }
  };

  const used = licence.devices?.length || 0;
  return (
    <article className="acc-card acc-licence" aria-labelledby={`lic-${licence._id}`}>
      <div className="acc-licence__head">
        <span className="acc-licence__icon" aria-hidden="true"><Icon name="key" size={22} /></span>
        <div className="acc-licence__title">
          <h2 id={`lic-${licence._id}`}>{sw.title || 'Software'}</h2>
          <p className="acc-muted">{licence.planName || 'Licence'}{licence.lifetime ? (/lifetime/i.test(licence.planName || '') ? '' : ' · Lifetime') : licence.billing && !new RegExp(licence.billing, 'i').test(licence.planName || '') ? ` · ${licence.billing}` : ''} · bought {fmtDate(licence.createdAt)}</p>
        </div>
        <Pill tone={st.tone}>{st.label}</Pill>
      </div>

      <KeyField licence={licence} />
      <Countdown licence={licence} />

      <div className="acc-devices">
        <div className="acc-devices__head">
          <h3>Computers <span className="acc-muted">({used} of {licence.maxDevices || 1} used)</span></h3>
          <div className="acc-meter" aria-hidden="true"><span style={{ width: `${Math.min(100, (used / (licence.maxDevices || 1)) * 100)}%` }} /></div>
        </div>
        {used ? (
          <ul className="acc-devices__list">
            {licence.devices.map((d) => (
              <li key={d.ref}>
                <Icon name="monitor" size={18} />
                <div className="acc-list__main">
                  <strong>{d.deviceName || 'Computer'}</strong>
                  <span className="acc-muted acc-small">Activated {fmtDate(d.activatedAt)}{d.lastSeenAt ? ` · last seen ${fmtDate(d.lastSeenAt)}` : ''}{d.appVersion ? ` · v${d.appVersion}` : ''}</span>
                </div>
                <button type="button" className="wt-btn wt-btn--ghost wt-btn--sm acc-danger-text" disabled={licence.revoked || licence.selfDeactivate?.remaining === 0}
                  onClick={() => setConfirm(d)}>
                  <Icon name="trash" size={16} />Deactivate
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="acc-muted acc-small">Not activated on any computer yet. Open the app and paste your key to activate.</p>}
        {licence.selfDeactivate && (
          <p className="acc-muted acc-small">
            {licence.selfDeactivate.limit === 0
              ? 'To move this licence to another computer, contact support.'
              : `You can remove ${licence.selfDeactivate.remaining} more computer${licence.selfDeactivate.remaining === 1 ? '' : 's'} in the next 30 days.`}
          </p>
        )}
      </div>

      <div className="acc-licence__actions">
        {sw.hasDownload && !licence.revoked && (
          <button type="button" className="wt-btn wt-btn--primary wt-btn--sm" onClick={download} disabled={downloading}>
            <Icon name="download" size={16} />{downloading ? 'Preparing…' : sw.latestVersion ? `Download v${sw.latestVersion.version}` : 'Download'}
          </button>
        )}
        {sw.hasDownload && !licence.revoked && sw.latestVersion && (
          <span className="acc-dl-meta" title={`SHA-256 ${sw.latestVersion.sha256}`}>
            {sw.latestVersion.platformLabel} · {formatBytes(sw.latestVersion.size)}{sw.latestVersion.releaseDate ? ` · ${fmtDate(sw.latestVersion.releaseDate)}` : ''}
            {sw.slug && <> · <Link to={`/software/${encodeURIComponent(sw.slug)}#versions`}>All versions</Link></>}
          </span>
        )}
        {licence.renewPlans?.length > 0 && sw.slug && !licence.revoked && (
          <div className="acc-plan-links">
            {licence.renewPlans.map((p) => (
              <Link key={p._id} className="wt-btn wt-btn--secondary wt-btn--sm" to={`/checkout/software/${encodeURIComponent(sw.slug)}?plan=${p._id}&renew=${licence._id}`}>
                <Icon name="refresh" size={16} />Renew: {p.name} {inr(p.price)} {billingLabel(p)}
              </Link>
            ))}
          </div>
        )}
        {licence.upgradePlans?.length > 0 && sw.slug && !licence.revoked && licence.upgradePlans.map((p) => (
          <Link key={p._id} className="wt-btn wt-btn--ghost wt-btn--sm" to={`/checkout/software/${encodeURIComponent(sw.slug)}?plan=${p._id}`} title="Buys a separate lifetime licence with a new key">
            <Icon name="sparkles" size={16} />Upgrade to {p.name} ({inr(p.price)}, new key)
          </Link>
        ))}
        {sw.slug && <Link className="acc-link" to={`/software/${sw.slug}`}>Product page</Link>}
      </div>
      {licence.revoked && <p className="wt-alert wt-alert--error" role="note">This licence has been revoked. If you think this is a mistake, please <Link to="/dashboard/help">contact support</Link>.</p>}

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Deactivate this computer?"
        text={`${confirm?.deviceName || 'This computer'} will stop working with this licence until you activate it again. This frees one slot for another computer.`}
        confirmLabel="Deactivate"
        busy={busy}
        onConfirm={deactivate}
        onCancel={() => !busy && setConfirm(null)}
      />
    </article>
  );
}

export default function MySoftware() {
  const { loading, error, data, reload } = useAsync(() => api.getMyLicenses());
  const licences = data?.licenses || [];
  return (
    <div className="acc-stack">
      <PageHeader icon="key" title="My software" subtitle="Licence keys, the computers using them, renewals and downloads." actions={<Link to="/software" className="wt-btn wt-btn--secondary wt-btn--sm"><Icon name="code" size={16} />Browse software</Link>} />
      {loading && !data ? <SkeletonList rows={2} /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !licences.length ? (
        <EmptyState icon="key" title="No software licences yet" text="When you buy a software plan, the key, computers and downloads show up here." cta="Browse software" ctaTo="/software" />
      ) : (
        <div className="acc-stack">{licences.map((l) => <LicenceCard key={l._id} licence={l} onChanged={reload} />)}</div>
      )}
    </div>
  );
}
