import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import PublicLayout from '../../components/PublicLayout';
import Icon from '../../components/Icon';
import Markdown from '../../components/Markdown';
import EnquiryForm from '../../components/EnquiryForm';
import { SkeletonPage } from '../../components/Skeleton';
import { usePageMeta } from '../../components/Seo';
import { getMediaUrl } from '../../utils/media';
import { priceLabel, SOFTWARE_CTA_LABEL, SERVICE_CTA_LABEL, SITE_NAME, SITE_URL } from '../../config/site';
import NotFoundPage from '../NotFoundPage';
import './catalog.css';

const isHttp = (u) => /^https?:\/\//i.test(String(u || ''));

/**
 * Public detail page for one software product or service (/software/:slug, /services/:slug).
 * The main button always leads to the on-page enquiry form with this item preselected.
 * Software "Buy" works the same way for now: direct payment for software is not wired
 * (the Razorpay order flow only supports courses/events), see the PR notes.
 * Mounted with key={slug} by the route wrappers so state resets between items.
 */
export default function CatalogDetailPage({ user, kind = 'software' }) {
  const { slug } = useParams();
  const isService = kind === 'service';
  const [state, setState] = useState({ item: null, loading: true, notFound: false, error: '' });
  const [shot, setShot] = useState(0);

  useEffect(() => {
    let alive = true;
    (isService ? api.getService(slug) : api.getSoftware(slug))
      .then((d) => alive && setState({ item: (isService ? d?.service : d?.software) || null, loading: false, notFound: !(isService ? d?.service : d?.software), error: '' }))
      .catch((e) => alive && setState({ item: null, loading: false, notFound: /not found|404/i.test(e.message || ''), error: e.message || 'Could not load.' }));
    return () => { alive = false; };
  }, [slug, isService]);

  const item = state.item;
  const base = isService ? '/services' : '/software';
  const price = item ? priceLabel(item, kind) : null;
  const images = item ? [item.thumbnail, ...(item.images || [])].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) : [];
  const text = item ? (isService ? item.summary : item.tagline) : '';
  const amount = item ? Number(item.discountedPrice) > 0 ? Number(item.discountedPrice) : Number(isService ? item.startingPrice : item.price) : 0;

  usePageMeta({
    title: item?.title || (state.loading ? (isService ? 'Service' : 'Software') : 'Not found'),
    description: text || item?.description?.slice(0, 160),
    image: images[0] ? getMediaUrl(images[0]) : undefined,
    path: item ? `${base}/${item.slug || item._id}` : undefined,
    type: 'product',
    jsonLd: item ? {
      '@context': 'https://schema.org',
      '@type': isService ? 'Service' : 'SoftwareApplication',
      name: item.title,
      description: (text || item.description || '').slice(0, 300),
      url: `${SITE_URL}${base}/${item.slug || item._id}`,
      ...(images[0] && isHttp(getMediaUrl(images[0])) ? { image: getMediaUrl(images[0]) } : {}),
      ...(isService
        ? { provider: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL }, ...(item.category ? { serviceType: item.category } : {}) }
        : { applicationCategory: 'BusinessApplication', ...(item.category ? { applicationSubCategory: item.category } : {}) }),
      ...(amount > 0 && item.pricingType !== 'quote' ? { offers: { '@type': 'Offer', price: amount, priceCurrency: 'INR', url: `${SITE_URL}${base}/${item.slug || item._id}` } } : {}),
    } : undefined,
  });

  if (state.loading) return <PublicLayout user={user}><SkeletonPage /></PublicLayout>;
  if (state.notFound || (!item && !state.error)) return <NotFoundPage user={user} />;
  if (!item) {
    return (
      <PublicLayout user={user}>
        <div className="wt-container wt-section"><div className="wt-alert wt-alert--error" role="alert">{state.error}</div></div>
      </PublicLayout>
    );
  }

  const ctaLabel = isService ? (SERVICE_CTA_LABEL[item.ctaType] || 'Enquire') : (SOFTWARE_CTA_LABEL[item.ctaType] || 'Enquire');
  const related = { type: isService ? 'service' : 'software', id: item._id, title: item.title };
  const bizLink = `/contact?type=${isService ? 'services' : 'software'}&item=${encodeURIComponent(item._id)}#business-enquiry`;
  const goToForm = () => {
    const el = document.getElementById('enquire');
    if (!el) return;
    el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => el.querySelector('input, select, textarea')?.focus({ preventScroll: true }), 450);
  };
  const steps = (item.processSteps || []).filter((s) => s?.title);
  const bullets = (isService ? item.deliverables : item.features) || [];

  return (
    <PublicLayout user={user}>
      <section className="cat-hero cat-hero--detail">
        <div className="wt-container cd-grid">
          <div className="cd-copy">
            <nav aria-label="Breadcrumb" className="cat-crumbs">
              <Link to="/">Home</Link> <span aria-hidden="true">/</span> <Link to={base}>{isService ? 'Services' : 'Software'}</Link>
              {item.category && <> <span aria-hidden="true">/</span> <Link to={`${base}?category=${encodeURIComponent(item.category)}`}>{item.category}</Link></>}
            </nav>
            <div className="cc-tags">
              {item.highlightBadge && <span className="wt-badge wt-badge--warm">{item.highlightBadge}</span>}
              {!isService && item.version && <span className="wt-badge wt-badge--neutral">v{item.version}</span>}
            </div>
            <h1 className="wt-h1 cat-title">{item.title}</h1>
            {text && <p className="wt-lead">{text}</p>}

            <div className="cd-buy">
              <p className="cd-price">
                <span className="wt-price">{price.main}</span>
                {price.original && <s>{price.original}</s>}
                <small>{price.sub}</small>
              </p>
              <div className="wt-actions">
                <button type="button" className="wt-btn wt-btn--primary wt-btn--lg" onClick={goToForm}>
                  {ctaLabel} <Icon name="arrow-right" size={18} />
                </button>
                {!isService && isHttp(item.demoUrl) && (
                  <a href={item.demoUrl} target="_blank" rel="noopener noreferrer" className="wt-btn wt-btn--secondary wt-btn--lg">
                    Try the demo <Icon name="external" size={16} />
                  </a>
                )}
              </div>
              {!isService && item.ctaType === 'buy' && (
                <p className="cd-note"><Icon name="info" size={16} /> Send your details below and we will reply by email to complete your purchase.</p>
              )}
            </div>
          </div>

          <div className="cd-media">
            {images.length > 0 ? (
              <>
                <div className="cd-shot">
                  <img src={getMediaUrl(images[shot])} alt={`${item.title} screenshot ${shot + 1}`} width="960" height="600" fetchPriority="high" decoding="async" />
                </div>
                {images.length > 1 && (
                  <ul className="cd-thumbs" aria-label="Screenshots">
                    {images.map((src, i) => (
                      <li key={src}>
                        <button type="button" aria-pressed={shot === i} aria-label={`Show screenshot ${i + 1}`} onClick={() => setShot(i)}>
                          <img src={getMediaUrl(src)} alt="" width="120" height="75" loading="lazy" decoding="async" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className={`cd-art cc-icon--${kind}`} aria-hidden="true"><Icon name={isService ? (item.icon || 'briefcase') : 'grid'} size={72} /></div>
            )}
          </div>
        </div>
      </section>

      <section className="wt-section wt-section--white">
        <div className="wt-container cd-body">
          <div className="cd-main">
            {bullets.length > 0 && (
              <div className="cd-block reveal">
                <h2 className="wt-h3">{isService ? 'What you get' : 'Key features'}</h2>
                <ul className="wt-checklist cd-checks">
                  {bullets.map((b) => <li key={b}>{b}</li>)}
                </ul>
              </div>
            )}

            {item.description && (
              <div className="cd-block reveal">
                <h2 className="wt-h3">{isService ? 'About this service' : 'About this software'}</h2>
                <Markdown source={item.description} />
              </div>
            )}

            {steps.length > 0 && (
              <div className="cd-block reveal">
                <h2 className="wt-h3">How it works</h2>
                <ol className="cd-steps">
                  {steps.map((s, i) => (
                    <li key={`${i}-${s.title}`}>
                      <span className="cd-step-num" aria-hidden="true">{i + 1}</span>
                      <div><h3>{s.title}</h3>{s.description && <p className="wt-muted">{s.description}</p>}</div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {!isService && isHttp(item.documentationUrl) && (
              <p><a className="wt-link" href={item.documentationUrl} target="_blank" rel="noopener noreferrer">Read the documentation <Icon name="external" size={14} /></a></p>
            )}
          </div>

          <aside className="cd-side" id="enquire" aria-labelledby="enquire-title">
            <div className="cd-form-card">
              <h2 className="wt-h3" id="enquire-title">{ctaLabel}</h2>
              <p className="wt-muted cd-form-lead">{item.title} is already selected. We reply by email.</p>
              <EnquiryForm
                user={user}
                related={related}
                defaultInterest={isService ? 'Service' : 'Software'}
                source={isService ? 'service_page' : 'software_page'}
                compact
              />
              <p className="cd-biz">Bigger project? <Link to={bizLink}>Use the detailed business enquiry</Link></p>
            </div>
          </aside>
        </div>
      </section>
    </PublicLayout>
  );
}
