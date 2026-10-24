import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import Icon from '../../components/Icon';
import { EmptyState, ErrorState, PageHeader, Pill, SkeletonList } from './ui';
import { fmtDateTime, useAsync } from './format';

export default function Events() {
  const { loading, error, data, reload } = useAsync(() => api.getMyLearning());
  const events = (data?.events || []).map((e) => e.eventId).filter((e) => e && typeof e === 'object');
  const [now] = useState(() => Date.now());
  const sorted = [...events].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  return (
    <div className="acc-stack">
      <PageHeader icon="calendar" title="Live events" subtitle="Webinars and live sessions you have registered for." />
      {loading && !data ? <SkeletonList rows={2} /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !sorted.length ? (
        <EmptyState icon="calendar" title="No events yet" text="Registered live sessions will appear here with a join button." cta="Go to home page" ctaTo="/" />
      ) : (
        <ul className="acc-list acc-card">
          {sorted.map((ev) => {
            const start = new Date(ev.dateTime).getTime();
            const past = start + (Number(ev.duration) || 60) * 60000 < now;
            return (
              <li key={ev._id} className="acc-list__row">
                <span className="acc-list__icon" aria-hidden="true"><Icon name="calendar" size={18} /></span>
                <div className="acc-list__main"><strong>{ev.title}</strong><span className="acc-muted">{fmtDateTime(ev.dateTime)}{ev.type ? ` · ${ev.type}` : ''}</span></div>
                {past ? <Pill>Ended</Pill> : <Link to={`/event/${ev._id}/room`} className="wt-btn wt-btn--primary wt-btn--sm">Join</Link>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
