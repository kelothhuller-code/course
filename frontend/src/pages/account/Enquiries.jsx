import { Link } from 'react-router-dom';
import { api } from '../../api';
import Icon from '../../components/Icon';
import { EmptyState, ErrorState, PageHeader, Pill, SkeletonList } from './ui';
import { fmtDate, fmtDateTime, useAsync } from './format';

const TONE = { received: 'info', replied: 'success', 'in discussion': 'warning', closed: 'neutral' };

export default function Enquiries() {
  const { loading, error, data, reload } = useAsync(() => api.getMyEnquiries());
  const list = data?.enquiries || [];
  return (
    <div className="acc-stack">
      <PageHeader icon="chat" title="My enquiries" subtitle="Messages you sent us from this account's email address, and our replies." actions={<Link to="/dashboard/help" className="wt-btn wt-btn--primary wt-btn--sm"><Icon name="chat" size={16} />New enquiry</Link>} />
      {loading && !data ? <SkeletonList rows={2} /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !list.length ? (
        <EmptyState icon="chat" title="No enquiries yet" text="Questions you send while signed in (or with this email) will be listed here with their status." cta="Ask a question" ctaTo="/dashboard/help" />
      ) : (
        <ul className="acc-stack" aria-label="Enquiries">
          {list.map((m) => (
            <li key={m._id} className="acc-card acc-enquiry">
              <div className="acc-order__head">
                <div>
                  <h2>{m.subject || m.topic || 'Enquiry'}</h2>
                  <p className="acc-muted acc-small">{m.topic && m.subject ? `${m.topic} · ` : ''}Sent {fmtDateTime(m.createdAt)}</p>
                </div>
                <Pill tone={TONE[m.status] || 'info'}>{m.status[0].toUpperCase() + m.status.slice(1)}</Pill>
              </div>
              <details className="acc-enquiry__body">
                <summary>Your message</summary>
                <p>{m.message}</p>
              </details>
              {m.reply && (
                <div className="acc-enquiry__reply">
                  <p className="acc-small"><strong>Reply from WideTech</strong>{m.repliedAt ? ` · ${fmtDate(m.repliedAt)}` : ''}</p>
                  <p>{m.reply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="acc-muted acc-small">Only enquiries sent after you created this account are shown here.</p>
    </div>
  );
}
