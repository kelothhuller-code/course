import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';

/** Slim, distraction-free header for checkout: brand, "Secure checkout" and a way back. */
export default function CheckoutHeader({ backTo, backLabel = 'Back' }) {
  return (
    <header className="co-header">
      <div className="co-header__inner">
        <Link to="/" className="co-header__brand" aria-label="WideTech home">
          <img src="/logo.svg" alt="" width="30" height="30" />
          <span>WideTech</span>
        </Link>
        <span className="co-header__secure"><Icon name="lock" size={16} /> Secure checkout</span>
        {backTo ? (
          <Link to={backTo} className="co-header__back"><Icon name="arrow-left" size={16} /><span>{backLabel}</span></Link>
        ) : <span />}
      </div>
    </header>
  );
}
