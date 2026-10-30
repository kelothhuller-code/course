/**
 * Download area + version history for software with uploaded versions (/software/:slug).
 * Files come from GET /api/software/:slugOrId/download (Content-Disposition: attachment), so a
 * plain link downloads straight away. When the product does not allow free trial downloads,
 * signed-in buyers get a short-lived link from the server instead.
 */
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import Icon from './Icon';
import Markdown from './Markdown';
import { toast } from './Toast';
import { tracker } from '../utils/tracker';
import { formatBytes } from '../utils/bytes';
import './SoftwareDownload.css';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Latest version per platform (for the platform switch). */
const latestPerPlatform = (versions) => {
  const seen = new Map();
  for (const v of versions) {
    const cur = seen.get(v.platform);
    if (!cur || (v.isLatest && !cur.isLatest)) seen.set(v.platform, v);
  }
  return [...seen.values()];
};

/** Guess the visitor's platform so the right build is preselected. */
const visitorPlatform = () => {
  if (typeof navigator === 'undefined') return '';
  const ua = `${navigator.userAgentData?.platform || ''} ${navigator.userAgent || ''}`.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/win/.test(ua)) return 'windows';
  if (/mac/.test(ua) && !/iphone|ipad/.test(ua)) return 'macos';
  if (/linux|x11/.test(ua)) return 'linux';
  return '';
};

function useDownloader(item, user) {
  const [busy, setBusy] = useState('');
  const slugOrId = item.slug || item._id;
  const free = item.allowFreeDownload !== false;
  const canDownload = free || Boolean(user);
  const href = (v) => api.softwareDownloadUrl(slugOrId, { version: v.version, platform: v.platform, sid: tracker.getSessionId?.() });
  const start = async (v) => {
    setBusy(v._id);
    try {
      await api.downloadSoftware(slugOrId, v.fileName, { version: v.version, platform: v.platform });
      toast.success('Your download has started.');
    } catch (e) {
      toast.error(e.status === 403 ? 'Downloads for this product are available after purchase.' : (e.message || 'Download is not available right now.'));
    } finally {
      setBusy('');
    }
  };
  return { free, canDownload, href, start, busy };
}

function Sha({ value }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('SHA-256 checksum copied');
    } catch {
      toast.info('Copy is blocked by the browser. Select the checksum and copy it.');
    }
  };
  return (
    <span className="sd-sha">
      <span className="sd-sha__label">SHA-256</span>
      <code title={value}>{value.slice(0, 12)}…{value.slice(-8)}</code>
      <button type="button" className="sd-sha__copy" onClick={copy} aria-label="Copy the full SHA-256 checksum"><Icon name="copy" size={14} />Copy</button>
    </span>
  );
}

export function DownloadPanel({ item, user, buyHref, onQuote }) {
  const location = useLocation();
  const versions = useMemo(() => item.versions || [], [item.versions]);
  const options = useMemo(() => latestPerPlatform(versions), [versions]);
  const [platform, setPlatform] = useState(() => {
    const mine = visitorPlatform();
    const def = item.latestVersion?.platform;
    return options.some((o) => o.platform === mine) ? mine : (def || options[0]?.platform);
  });
  const v = options.find((o) => o.platform === platform) || item.latestVersion || versions[0];
  const { free, canDownload, href, start, busy } = useDownloader(item, user);
  if (!v) return null;
  const trial = Boolean(item.licensingEnabled && item.trialEnabled && free);
  const label = trial ? 'Download free trial' : 'Download now';

  return (
    <div className="sd-panel">
      {options.length > 1 && (
        <div className="sd-platforms" role="group" aria-label="Choose your platform">
          {options.map((o) => (
            <button key={o.platform} type="button" aria-pressed={o.platform === platform} onClick={() => setPlatform(o.platform)}>{o.platformLabel}</button>
          ))}
        </div>
      )}
      <div className="wt-actions sd-actions">
        {free ? (
          <a className="wt-btn wt-btn--primary wt-btn--lg sd-primary" href={href(v)} rel="nofollow" download={v.fileName}>
            <Icon name="download" size={20} />{label}
          </a>
        ) : canDownload ? (
          <button type="button" className="wt-btn wt-btn--primary wt-btn--lg sd-primary" onClick={() => start(v)} disabled={busy === v._id}>
            <Icon name="download" size={20} />{busy === v._id ? 'Preparing…' : 'Download now'}
          </button>
        ) : (
          <Link className="wt-btn wt-btn--primary wt-btn--lg sd-primary" to={`/auth?next=${encodeURIComponent(location.pathname)}`}>
            <Icon name="lock" size={18} />Sign in to download
          </Link>
        )}
        {buyHref ? (
          <Link className="wt-btn wt-btn--lg sd-buy" to={buyHref}>Buy now <Icon name="arrow-right" size={18} /></Link>
        ) : onQuote ? (
          <button type="button" className="wt-btn wt-btn--secondary wt-btn--lg" onClick={onQuote}>Request a quote <Icon name="arrow-right" size={18} /></button>
        ) : null}
      </div>
      <p className="sd-meta">
        <span><strong>v{v.version}</strong></span>
        <span>{v.platformLabel}</span>
        <span>{formatBytes(v.size)}</span>
        {v.releaseDate && <span>Released {fmtDate(v.releaseDate)}</span>}
      </p>
      {v.requirements && <p className="sd-req"><Icon name="monitor" size={15} /> {v.requirements}</p>}
      <Sha value={v.sha256} />
      <p className="cd-note sd-note"><Icon name="shield" size={16} />{trial
        ? `Free ${item.trialDays || 7}-day trial. Install and open the app to start it, then activate with a licence key anytime.`
        : free ? 'Free download. Install it and open the app to get started.'
          : user ? 'Available to buyers and licence owners of this product.' : 'Downloads are available to buyers. Sign in with the account you bought it with.'}
      </p>
    </div>
  );
}

export function VersionHistory({ item, user }) {
  const versions = item.versions || [];
  const { canDownload, free, href, start, busy } = useDownloader(item, user);
  if (!versions.length) return null;
  return (
    <section className="wt-section sd-history" id="versions" aria-labelledby="versions-title">
      <div className="wt-container">
        <h2 className="wt-h2" id="versions-title">What's new &amp; version history</h2>
        <p className="wt-muted sd-history__lead">Every release stays available. Each file has a SHA-256 checksum, so you can check that your download is complete and unchanged.</p>
        <ol className="sd-list">
          {versions.map((v, i) => (
            <li key={v._id} className="sd-item">
              <div className="sd-item__head">
                <div className="sd-item__title">
                  <h3>Version {v.version}</h3>
                  {v.isLatest && <span className="wt-badge sd-badge-latest">Latest</span>}
                  <span className="wt-badge wt-badge--neutral">{v.platformLabel}</span>
                </div>
                <p className="sd-item__meta">{fmtDate(v.releaseDate)} · {formatBytes(v.size)} · {v.fileName}</p>
              </div>
              {v.notes ? (
                i === 0 ? <div className="sd-notes"><Markdown source={v.notes} /></div> : (
                  <details className="sd-details"><summary>Release notes</summary><div className="sd-notes"><Markdown source={v.notes} /></div></details>
                )
              ) : null}
              {v.requirements && <p className="sd-req"><Icon name="monitor" size={15} /> {v.requirements}</p>}
              <div className="sd-item__foot">
                <Sha value={v.sha256} />
                {canDownload && (free ? (
                  <a className="wt-btn wt-btn--ghost wt-btn--sm" href={href(v)} rel="nofollow" download={v.fileName}><Icon name="download" size={16} />Download v{v.version}</a>
                ) : (
                  <button type="button" className="wt-btn wt-btn--ghost wt-btn--sm" onClick={() => start(v)} disabled={busy === v._id}><Icon name="download" size={16} />{busy === v._id ? 'Preparing…' : `Download v${v.version}`}</button>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
