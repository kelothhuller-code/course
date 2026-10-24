import { Link } from 'react-router-dom';
import { api } from '../../api';
import Icon from '../../components/Icon';
import { EmptyState, ErrorState, PageHeader, Pill, SkeletonList } from './ui';
import { fmtDate, fmtDateTime, inr, useAsync } from './format';

const STEPS = [
  { id: 'paid', label: 'Order placed', hint: 'Payment received' },
  { id: 'in_progress', label: 'In progress', hint: 'We are working on it' },
  { id: 'delivered', label: 'Delivered', hint: 'Work handed over' },
  { id: 'closed', label: 'Closed', hint: 'Order complete' },
];
const TONE = { paid: 'info', in_progress: 'warning', delivered: 'success', closed: 'neutral' };

function Timeline({ order }) {
  const current = Math.max(0, STEPS.findIndex((s) => s.id === order.status));
  const when = {};
  (order.statusHistory || []).forEach((h) => { when[h.status] = h.at; });
  if (!when.paid) when.paid = order.createdAt;
  return (
    <ol className="acc-timeline" aria-label="Order progress">
      {STEPS.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={s.id} className={`acc-timeline__step is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="acc-timeline__dot" aria-hidden="true">{state === 'done' || (state === 'current' && i === STEPS.length - 1) ? <Icon name="check" size={14} strokeWidth={2.4} /> : i + 1}</span>
            <span className="acc-timeline__label">{s.label}</span>
            <span className="acc-timeline__when">{when[s.id] ? fmtDate(when[s.id]) : state === 'todo' ? s.hint : ''}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function ServiceOrders() {
  const { loading, error, data, reload } = useAsync(() => api.getMyServiceOrders());
  const orders = data?.orders || [];
  return (
    <div className="acc-stack">
      <PageHeader icon="briefcase" title="Service orders" subtitle="Track each service you booked, step by step." actions={<Link to="/services" className="wt-btn wt-btn--secondary wt-btn--sm"><Icon name="briefcase" size={16} />Browse services</Link>} />
      {loading && !data ? <SkeletonList rows={2} /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !orders.length ? (
        <EmptyState icon="briefcase" title="No service orders yet" text="Book a fixed-price service and follow its progress here." cta="See services" ctaTo="/services" />
      ) : orders.map((o) => (
        <article key={o._id} className="acc-card acc-order" aria-labelledby={`so-${o._id}`}>
          <div className="acc-order__head">
            <div>
              <h2 id={`so-${o._id}`}>{o.service?.title || o.serviceTitle}</h2>
              <p className="acc-muted">{o.packageName ? `${o.packageName} · ` : ''}Order {o.orderNo || o._id.slice(-6).toUpperCase()} · {inr(o.amount)}</p>
            </div>
            <Pill tone={TONE[o.status] || 'neutral'}>{STEPS.find((s) => s.id === o.status)?.label || o.status}</Pill>
          </div>
          <Timeline order={o} />
          <div className="acc-order__foot">
            <span className="acc-muted acc-small">Placed {fmtDateTime(o.statusHistory?.[0]?.at || o.createdAt)}{o.deliveryTime ? ` · Typical delivery: ${o.deliveryTime}` : ''}</span>
            <span className="acc-order__links">
              {o.txnid && <Link className="acc-link" to={`/dashboard/orders?invoice=${encodeURIComponent(o.txnid)}`}><Icon name="receipt" size={16} />Invoice</Link>}
              <Link className="acc-link" to="/dashboard/help"><Icon name="chat" size={16} />Ask about this order</Link>
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
