import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import CheckoutHeader from './CheckoutHeader';
import './checkout.css';

/** Loading skeleton (same footprint as the real page, so nothing jumps). */
export function CheckoutLoading() {
  return (
    <div className="co-page">
      <CheckoutHeader />
      <main id="main-content" className="co-main" aria-busy="true">
        <div className="co-container">
          <span className="co-skel co-skel--md" style={{ width: 220, height: 28, marginBottom: 24 }} />
          <div className="co-grid">
            <aside className="co-summary"><div className="co-card" style={{ minHeight: 260 }}><span className="co-skel" /></div></aside>
            <section className="co-form-col"><div className="co-card" style={{ minHeight: 420 }}><span className="co-skel" /></div></section>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Simple centred message for unavailable / free / already-owned states. */
export function CheckoutMessage({ icon = 'info', title, children, actions, backTo, backLabel }) {
  return (
    <div className="co-page">
      <CheckoutHeader backTo={backTo} backLabel={backLabel} />
      <main id="main-content" className="co-main">
        <div className="co-container">
          <div className="co-card co-state">
            <div className="co-success__stepicon" style={{ width: 56, height: 56, margin: '0 auto 16px' }} aria-hidden="true"><Icon name={icon} size={26} /></div>
            <h1>{title}</h1>
            <p>{children}</p>
            {actions && <div className="wt-actions">{actions}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}

export const BackLink = ({ to, children, primary }) => (
  <Link to={to} className={`wt-btn ${primary ? 'wt-btn--primary' : 'wt-btn--secondary'}`}>{children}</Link>
);
