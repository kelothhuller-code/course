import { useEffect, useState } from 'react';
import { money } from '../../utils/gst';

const LABEL = { paid: 'Paid, we will contact you', in_progress: 'In progress', delivered: 'Delivered', closed: 'Closed', cancelled: 'Cancelled', refunded: 'Refunded' };

/** Paid service orders in the dashboard. */
export default function MyServiceOrdersPanel({ loader }) {
  const [state, setState] = useState({ loading: true, orders: [], error: '' });
  useEffect(() => {
    let alive = true;
    loader()
      .then((d) => alive && setState({ loading: false, orders: d.orders || [], error: '' }))
      .catch(() => alive && setState({ loading: false, orders: [], error: 'Could not load your orders. Please refresh.' }));
    return () => { alive = false; };
  }, [loader]);

  if (state.loading) return null;
  if (state.error) return <p className="dl-error" role="alert">{state.error}</p>;
  if (!state.orders.length) return null;
  return (
    <section className="dl-panel" aria-labelledby="dl-so-title">
      <h3 id="dl-so-title" className="dl-title">My service orders</h3>
      <ul className="dl-list">
        {state.orders.map((o) => (
          <li key={o._id} className="dl-card">
            <div className="dl-head">
              <div>
                <strong>{o.service?.title || o.serviceTitle}</strong>
                <span className="dl-sub">{o.packageName}{o.deliveryTime ? ` · delivery ${o.deliveryTime}` : ''}</span>
              </div>
              <span className={`dl-badge dl-badge--${o.status === 'delivered' || o.status === 'closed' ? 'active' : o.status === 'cancelled' || o.status === 'refunded' ? 'revoked' : 'pending'}`}>{LABEL[o.status] || o.status}</span>
            </div>
            <p className="dl-meta">Order {o.orderNo} · {money(o.amount)} · {new Date(o.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}{o.invoiceNo ? ` · Invoice ${o.invoiceNo}` : ''}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
