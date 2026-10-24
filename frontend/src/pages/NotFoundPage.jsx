import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import Icon from '../components/Icon';
import { usePageMeta } from '../components/Seo';
import './NotFoundPage.css';

export default function NotFoundPage({ user }) {
  usePageMeta({ title: 'Page not found', description: 'The page you were looking for does not exist.' });
  // Ask search engines not to index this URL (removed again when leaving the page)
  useEffect(() => {
    const m = document.createElement('meta');
    m.name = 'robots';
    m.content = 'noindex';
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
  return (
    <PublicLayout user={user}>
      <section className="nf">
        <div className="wt-container nf-inner">
          <p className="nf-code" aria-hidden="true">404</p>
          <h1 className="wt-h2">We couldn't find that page</h1>
          <p className="wt-lead">The link may be old or mistyped. Here are some good places to go next.</p>
          <div className="wt-actions nf-actions">
            <Link to="/" className="wt-btn wt-btn--primary"><Icon name="arrow-left" size={18} /> Back to home</Link>
            <Link to="/all-courses" className="wt-btn wt-btn--secondary">Browse courses</Link>
          </div>
          <ul className="nf-links">
            <li><Link to="/software"><Icon name="grid" size={18} /> Software</Link></li>
            <li><Link to="/services"><Icon name="briefcase" size={18} /> Services</Link></li>
            <li><Link to="/contact"><Icon name="mail" size={18} /> Contact us</Link></li>
          </ul>
        </div>
      </section>
    </PublicLayout>
  );
}
