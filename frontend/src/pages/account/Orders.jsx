import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import Icon from '../../components/Icon';
import GstInvoiceModal from '../dashboard/GstInvoiceModal';
import { EmptyState, ErrorState, PageHeader, Pill, SkeletonList } from './ui';
import { fmtDate, inr } from './format';

const TYPES = [
  { id: '', label: 'All' },
  { id: 'course', label: 'Courses' },
  { id: 'software', label: 'Software' },
  { id: 'service', label: 'Services' },
  { id: 'event', label: 'Events' },
];
const STATUS = {
  success: { label: 'Paid', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};
const TYPE_ICON = { course: 'book', software: 'key', service: 'briefcase', event: 'calendar' };

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: null, list: [], pagination: null });
  const invoiceTxn = params.get('invoice');

  const load = async (p = page, q = search) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.getMyInvoices({ page: p, limit: 10, type: type || undefined, status: status || undefined, search: q.trim() || undefined });
      setState({ loading: false, error: null, list: res.transactions || [], pagination: res.pagination || null });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }));
    }
  };
  useEffect(() => { setPage(1); load(1); }, [type, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const openInvoice = (txnid) => setParams((p) => { const n = new URLSearchParams(p); n.set('invoice', txnid); return n; });
  const closeInvoice = () => setParams((p) => { const n = new URLSearchParams(p); n.delete('invoice'); return n; }, { replace: true });
  const go = (p) => { setPage(p); load(p); };
  const filtered = Boolean(type || status || search.trim());
  const pg = state.pagination;

  return (
    <div className="acc-stack">
      <PageHeader icon="receipt" title="Orders & invoices" subtitle="Every course, software, service and event purchase, with GST tax invoices to view, print or save as PDF." />

      <div className="acc-card acc-toolbar">
        <div className="acc-filters" role="group" aria-label="Purchase type">
          {TYPES.map((t) => (
            <button key={t.id || 'all'} type="button" className={`wt-chip${type === t.id ? ' is-active' : ''}`} aria-pressed={type === t.id} onClick={() => setType(t.id)}>{t.label}</button>
          ))}
        </div>
        <form className="acc-toolbar__search" role="search" onSubmit={(e) => { e.preventDefault(); go(1); }}>
          <label className="acc-sr" htmlFor="ord-search">Search orders</label>
          <input id="ord-search" className="wt-input" type="search" placeholder="Invoice or transaction no." value={search} onChange={(e) => setSearch(e.target.value)} />
          <label className="acc-sr" htmlFor="ord-status">Status</label>
          <select id="ord-status" className="wt-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any status</option>
            <option value="success">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <button type="submit" className="wt-btn wt-btn--secondary wt-btn--sm"><Icon name="search" size={16} />Search</button>
        </form>
      </div>

      {state.loading && !state.list.length ? <SkeletonList rows={4} /> : state.error && !state.list.length ? <ErrorState error={state.error} onRetry={() => load()} /> : !state.list.length ? (
        filtered
          ? <EmptyState icon="search" title="No matching orders" text="Try a different filter or search term." cta="Clear filters" onCta={() => { setType(''); setStatus(''); setSearch(''); load(1, ''); }} />
          : <EmptyState icon="shopping-bag" title="No orders yet" text="When you buy a course, software or service, the order and its GST invoice appear here." cta="Explore courses" ctaTo="/all-courses" secondary={<Link to="/software" className="wt-btn wt-btn--secondary">Software</Link>} />
      ) : (
        <div className="acc-card acc-table-wrap">
          <table className="acc-table">
            <caption className="acc-sr">Your orders</caption>
            <thead>
              <tr><th scope="col">Item</th><th scope="col">Date</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col"><span className="acc-sr">Invoice</span></th></tr>
            </thead>
            <tbody>
              {state.list.map((t) => {
                const st = STATUS[t.status] || STATUS.pending;
                const kind = t.itemType || 'course';
                return (
                  <tr key={t._id || t.txnid}>
                    <td data-label="Item">
                      <div className="acc-table__item">
                        <span className="acc-list__icon" aria-hidden="true"><Icon name={TYPE_ICON[kind] || 'receipt'} size={18} /></span>
                        <div><strong>{t.itemTitle || 'Purchase'}</strong><span className="acc-muted acc-small">{kind[0].toUpperCase() + kind.slice(1)} · {t.invoiceNo || t.txnid}</span></div>
                      </div>
                    </td>
                    <td data-label="Date">{fmtDate(t.createdAt)}</td>
                    <td data-label="Amount" className="acc-num">{inr(t.amount)}</td>
                    <td data-label="Status"><Pill tone={st.tone}>{st.label}</Pill></td>
                    <td data-label="Invoice" className="acc-table__action">
                      {t.status === 'success' || t.status === 'refunded'
                        ? <button type="button" className="wt-btn wt-btn--ghost wt-btn--sm" onClick={() => openInvoice(t.txnid)}><Icon name="document" size={16} />GST invoice</button>
                        : <span className="acc-muted acc-small">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pg && pg.totalPages > 1 && (
            <nav className="acc-pager" aria-label="Pages">
              <button type="button" className="wt-btn wt-btn--secondary wt-btn--sm" disabled={!pg.hasPrevPage || state.loading} onClick={() => go(page - 1)}><Icon name="arrow-left" size={16} />Previous</button>
              <span className="acc-muted">Page {pg.currentPage} of {pg.totalPages}</span>
              <button type="button" className="wt-btn wt-btn--secondary wt-btn--sm" disabled={!pg.hasNextPage || state.loading} onClick={() => go(page + 1)}>Next<Icon name="arrow-right" size={16} /></button>
            </nav>
          )}
        </div>
      )}
      {invoiceTxn && <GstInvoiceModal txnid={invoiceTxn} onClose={closeInvoice} />}
    </div>
  );
}
