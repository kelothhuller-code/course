import { useEffect, useRef } from 'react';
import { money } from '../../utils/gst';

/**
 * Test-mode payment dialog. Only shown when the server created a mock order, which it does
 * only with ALLOW_MOCK_PAYMENTS=true outside production (never on the live site).
 */
export default function MockPaymentDialog({ order, busy, onResult }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="co-modal" role="dialog" aria-modal="true" aria-labelledby="co-mock-title">
      <div className="co-modal__card" tabIndex={-1} ref={ref}>
        <span className="wt-badge wt-badge--warm">Test mode</span>
        <h2 id="co-mock-title">Simulated payment</h2>
        <p className="wt-help">No live payment keys are configured on this server, so no money moves.</p>
        <dl className="co-modal__dl">
          <div><dt>Amount</dt><dd>{money((order.amount || 0) / 100)}</dd></div>
          <div><dt>Item</dt><dd>{order.itemTitle}</dd></div>
          <div><dt>Transaction</dt><dd><code>{order.txnid}</code></dd></div>
        </dl>
        <div className="co-modal__actions">
          <button type="button" className="wt-btn wt-btn--primary" disabled={busy} onClick={() => onResult(true)}>{busy ? 'Confirming…' : 'Simulate success'}</button>
          <button type="button" className="wt-btn wt-btn--secondary" disabled={busy} onClick={() => onResult(false)}>Simulate failure</button>
        </div>
      </div>
    </div>
  );
}
