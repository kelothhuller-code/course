import SiteHeader from './SiteHeader';
import Footer from '../pages/Landing/Footer';

/** Shared shell for public marketing pages: skip link, sticky header, <main>, footer. */
export default function PublicLayout({ user, children, className = '' }) {
  return (
    <div className={`wt-page ${className}`}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <SiteHeader user={user} />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <Footer />
    </div>
  );
}
