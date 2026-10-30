import { Link } from 'react-router-dom';
import './CatalogCard.css';
import Icon from './Icon';
import { getMediaUrl } from '../utils/media';
import { priceLabel, softwareCheckoutHref } from '../config/site';

/** Card for a software product or a service (listing pages + landing sections). */
export default function CatalogCard({ item, kind = 'software', headingLevel = 3, eager = false }) {
  const base = kind === 'service' ? '/services' : '/software';
  const href = `${base}/${item.slug || item._id}`;
  const p = priceLabel(item, kind);
  const img = getMediaUrl(item.thumbnail || item.images?.[0] || '');
  const text = kind === 'service' ? (item.summary || item.description) : (item.tagline || item.description);
  const H = `h${headingLevel}`;
  const buyHref = kind === 'software' ? softwareCheckoutHref(item) : null;
  return (
    <article className="wt-card wt-card--flush wt-card--interactive cc">
      {img ? (
        <div className="wt-card__media">
          <img src={img} alt="" width="640" height="360" loading={eager ? 'eager' : 'lazy'} decoding="async" />
        </div>
      ) : (
        <div className={`cc-icon cc-icon--${kind}`} aria-hidden="true">
          <Icon name={kind === 'service' ? (item.icon || 'briefcase') : 'grid'} size={30} />
        </div>
      )}
      <div className="wt-card__body">
        <div className="cc-tags">
          {item.category && <span className="wt-badge wt-badge--neutral">{item.category}</span>}
          {item.highlightBadge && <span className="wt-badge wt-badge--warm">{item.highlightBadge}</span>}
        </div>
        <H className="wt-card__title"><Link to={href}>{item.title}</Link></H>
        {text && <p className="wt-card__text cc-text">{String(text).replace(/[#*_`>[\]]/g, '').slice(0, 160)}</p>}
        <div className="wt-card__foot">
          <span className="cc-price">
            <strong>{p.main}</strong>
            {p.original && <s>{p.original}</s>}
            <small>{p.sub}</small>
          </span>
          {buyHref ? (
            <Link className="wt-btn wt-btn--primary wt-btn--sm cc-buy" to={buyHref} aria-label={`Buy ${item.title} now`}>Buy now</Link>
          ) : (
            <span className="wt-link" aria-hidden="true">Details <Icon name="arrow-right" size={16} /></span>
          )}
        </div>
      </div>
    </article>
  );
}
