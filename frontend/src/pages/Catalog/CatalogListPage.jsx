import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import PublicLayout from '../../components/PublicLayout';
import CatalogCard from '../../components/CatalogCard';
import { SkeletonGrid } from '../../components/Skeleton';
import Icon from '../../components/Icon';
import { usePageMeta } from '../../components/Seo';
import { SITE_URL } from '../../config/site';
import './catalog.css';

const COPY = {
  software: {
    path: '/software',
    eyebrow: 'Software',
    title: 'Ready-to-use software for your business',
    lead: 'Tools that save hours every week. See features, pricing and demos, then buy or ask us anything.',
    metaTitle: 'Business software',
    empty: 'No software is listed yet. Tell us what you need and we will suggest the right tool.',
    listKey: 'softwares',
    enquiryType: 'software',
  },
  service: {
    path: '/services',
    eyebrow: 'Services',
    title: 'Services that get the work done',
    lead: 'Automation, custom software and business administration, scoped clearly and delivered by our team.',
    metaTitle: 'Business services',
    empty: 'No services are listed yet. Describe your project and we will reply with options.',
    listKey: 'services',
    enquiryType: 'services',
  },
};

/** Public list of software or services, filtered by admin-managed categories (?category=). */
export default function CatalogListPage({ user, kind = 'software' }) {
  const c = COPY[kind];
  const [params, setParams] = useSearchParams();
  const active = params.get('category') || '';
  const [state, setState] = useState({ items: [], loading: true, error: '' });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let alive = true;
    const fetcher = kind === 'service' ? api.getServicesList : api.getSoftwareList;
    fetcher()
      .then((d) => alive && setState({ items: Array.isArray(d?.[c.listKey]) ? d[c.listKey] : [], loading: false, error: '' }))
      .catch((e) => alive && setState({ items: [], loading: false, error: e.message || 'Could not load.' }));
    api.getCategories(kind).then((d) => alive && setCategories(Array.isArray(d?.categories) ? d.categories : [])).catch(() => {});
    return () => { alive = false; };
  }, [kind, c.listKey]);

  // Only offer categories that actually have items (admin order kept); include any uncategorised names too
  const chips = useMemo(() => {
    const used = new Set(state.items.map((i) => i.category).filter(Boolean));
    const fromAdmin = categories.map((x) => x.name).filter((n) => used.has(n));
    const extra = [...used].filter((n) => !fromAdmin.includes(n));
    return [...fromAdmin, ...extra];
  }, [categories, state.items]);

  const shown = active ? state.items.filter((i) => i.category === active) : state.items;

  usePageMeta({
    title: active ? `${active} ${kind === 'service' ? 'services' : 'software'}` : c.metaTitle,
    description: c.lead,
    path: c.path,
    jsonLd: state.items.length ? {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: state.items.slice(0, 30).map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}${c.path}/${it.slug || it._id}`, name: it.title })),
    } : undefined,
  });

  const setCategory = (name) => {
    const next = new URLSearchParams(params);
    if (name) next.set('category', name); else next.delete('category');
    setParams(next, { replace: true });
  };

  return (
    <PublicLayout user={user}>
      <section className="cat-hero">
        <div className="wt-container">
          <nav aria-label="Breadcrumb" className="cat-crumbs"><Link to="/">Home</Link> <span aria-hidden="true">/</span> <span aria-current="page">{c.eyebrow}</span></nav>
          <p className="wt-eyebrow">{c.eyebrow}</p>
          <h1 className="wt-h1 cat-title">{c.title}</h1>
          <p className="wt-lead">{c.lead}</p>
        </div>
      </section>

      <section className="wt-section cat-body">
        <div className="wt-container">
          {chips.length > 1 && (
            <div className="cat-filters" role="group" aria-label="Filter by category">
              <button type="button" className="wt-chip" aria-pressed={!active} onClick={() => setCategory('')}>All</button>
              {chips.map((name) => (
                <button key={name} type="button" className="wt-chip" aria-pressed={active === name} onClick={() => setCategory(name)}>{name}</button>
              ))}
            </div>
          )}

          {state.loading ? (
            <SkeletonGrid count={3} />
          ) : state.error ? (
            <div className="wt-alert wt-alert--error" role="alert">{state.error}</div>
          ) : shown.length === 0 ? (
            <div className="cat-empty">
              <span className="wt-icon-tile"><Icon name={kind === 'service' ? 'briefcase' : 'grid'} size={26} /></span>
              <p>{active ? `Nothing in “${active}” yet.` : c.empty}</p>
              <Link to={`/contact?type=${c.enquiryType}#business-enquiry`} className="wt-btn wt-btn--primary">Send a business enquiry</Link>
            </div>
          ) : (
            <ul className="wt-grid wt-grid--3 cat-grid">
              {shown.map((item, i) => (
                <li key={item._id} className="reveal" style={{ '--reveal-delay': `${Math.min(i, 5) * 60}ms` }}>
                  <CatalogCard item={item} kind={kind} headingLevel={2} eager={i < 3} />
                </li>
              ))}
            </ul>
          )}

          <aside className="cat-help">
            <div>
              <h2 className="wt-h3">Not sure what fits?</h2>
              <p className="wt-muted">Answer a few quick questions and we will recommend the right {kind === 'service' ? 'service' : 'software'}, or a mix.</p>
            </div>
            <Link to={`/contact?type=${c.enquiryType}#business-enquiry`} className="wt-btn wt-btn--secondary">Start a business enquiry <Icon name="arrow-right" size={16} /></Link>
          </aside>
        </div>
      </section>
    </PublicLayout>
  );
}
