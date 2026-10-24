import { Link } from 'react-router-dom';
import CatalogCard from '../../components/CatalogCard';
import { SkeletonGrid } from '../../components/Skeleton';
import Icon from '../../components/Icon';

/**
 * Landing teaser for software or services. Items marked "Featured" in admin come first,
 * then the rest by display order, up to three. Renders nothing when the list is empty.
 */
export default function FeaturedCatalog({ kind = 'software', items = [], loading = false }) {
  const isService = kind === 'service';
  const show = [...items.filter((i) => i.isFeatured), ...items.filter((i) => !i.isFeatured)].slice(0, 3);
  if (!loading && show.length === 0) return null;

  const id = isService ? 'services' : 'software';
  return (
    <section className={`wt-section ${isService ? 'wt-section--white' : ''}`} id={id} aria-labelledby={`${id}-title`}>
      <div className="wt-container">
        <div className="lp-head-row reveal">
          <div>
            <p className="wt-eyebrow">{isService ? 'Services' : 'Software'}</p>
            <h2 id={`${id}-title`} className="wt-h2">
              {isService ? 'Done-for-you services for your business' : 'Software that runs the busywork'}
            </h2>
            <p className="wt-lead">
              {isService
                ? 'Automation, custom software and business administration, scoped to what you actually need.'
                : 'Ready-to-use tools for everyday operations. See the features, book a demo or ask for a quote.'}
            </p>
          </div>
          <Link to={isService ? '/services' : '/software'} className="wt-btn wt-btn--secondary">
            {isService ? 'All services' : 'All software'} <Icon name="arrow-right" size={18} />
          </Link>
        </div>
        {loading ? (
          <SkeletonGrid count={3} />
        ) : (
          <div className="wt-grid wt-grid--3">
            {show.map((item, i) => (
              <div key={item._id} className="reveal" style={{ '--reveal-delay': `${i * 80}ms` }}>
                <CatalogCard item={item} kind={kind} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
