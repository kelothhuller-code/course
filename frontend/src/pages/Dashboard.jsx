// The logged-in account area (/dashboard/*): app shell + nested pages.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';
import { SITE_NAME } from '../config/site';
import Overview from './account/Overview';
import { SkeletonList } from './account/ui';
import './account/account.css';

const MyCourses = lazy(() => import('./account/MyCourses'));
const Certificates = lazy(() => import('./account/Certificates'));
const MySoftware = lazy(() => import('./account/MySoftware'));
const ServiceOrders = lazy(() => import('./account/ServiceOrders'));
const Orders = lazy(() => import('./account/Orders'));
const Enquiries = lazy(() => import('./account/Enquiries'));
const Profile = lazy(() => import('./account/Profile'));
const Help = lazy(() => import('./account/Help'));
const Events = lazy(() => import('./account/Events'));
const GstReportTab = lazy(() => import('./dashboard/GstReportTab'));

const NAV = [
  { group: 'Learning', items: [
    { to: '/dashboard', end: true, icon: 'home', label: 'Overview' },
    { to: '/dashboard/courses', icon: 'book', label: 'My courses' },
    { to: '/dashboard/certificates', icon: 'award', label: 'Certificates' },
    { to: '/dashboard/events', icon: 'calendar', label: 'Live events' },
  ] },
  { group: 'Products', items: [
    { to: '/dashboard/software', icon: 'key', label: 'My software' },
    { to: '/dashboard/services', icon: 'briefcase', label: 'Service orders' },
    { to: '/dashboard/orders', icon: 'receipt', label: 'Orders & invoices' },
  ] },
  { group: 'Account', items: [
    { to: '/dashboard/enquiries', icon: 'chat', label: 'My enquiries' },
    { to: '/dashboard/profile', icon: 'user', label: 'Profile & security' },
    { to: '/dashboard/help', icon: 'help-circle', label: 'Help & support' },
  ] },
];
const ADMIN_NAV = { to: '/dashboard/gst', icon: 'chart', label: 'GST report' };
const TABBAR = [
  { to: '/dashboard', end: true, icon: 'home', label: 'Home' },
  { to: '/dashboard/courses', icon: 'book', label: 'Courses' },
  { to: '/dashboard/software', icon: 'key', label: 'Software' },
  { to: '/dashboard/orders', icon: 'receipt', label: 'Orders' },
];

// Old links used /dashboard?tab=…; keep them working.
const LEGACY_TABS = {
  dashboard: '/dashboard', continue: '/dashboard/courses', courses: '/dashboard/courses', software: '/dashboard/software',
  services: '/dashboard/services', events: '/dashboard/events', certs: '/dashboard/certificates', invoices: '/dashboard/orders',
  gst_report: '/dashboard/gst', explore: '/all-courses',
};

const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || 'U';

function NavItems({ items, onNavigate }) {
  return items.map((it) => (
    <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `acc-nav__link${isActive ? ' is-active' : ''}`} onClick={onNavigate}>
      <Icon name={it.icon} size={20} />
      <span>{it.label}</span>
    </NavLink>
  ));
}

export default function Dashboard({ user, onRefreshUser, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const toast = useToast();
  const [drawer, setDrawer] = useState(false);
  const drawerRef = useRef(null);
  const contentRef = useRef(null);
  const isAdmin = user?.role === 'admin';
  const groups = useMemo(() => (isAdmin ? [...NAV, { group: 'Admin', items: [ADMIN_NAV] }] : NAV), [isAdmin]);

  // Not signed in: go to the sign-in page and come back here afterwards.
  useEffect(() => {
    if (!user) navigate(`/auth?next=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Legacy ?tab= links and payment return messages.
  useEffect(() => {
    const tab = params.get('tab');
    const payment = params.get('payment');
    if (payment === 'success') {
      toast.success('Payment verified. Your purchase is ready.');
      onRefreshUser?.();
    } else if (payment === 'failed') {
      toast.error('The payment failed or was cancelled. You have not been charged; please try again.');
    }
    if (tab && LEGACY_TABS[tab]) {
      const target = LEGACY_TABS[tab];
      if (target.startsWith('/dashboard')) navigate(target, { replace: true });
      else navigate(target);
    } else if (payment) {
      navigate(location.pathname, { replace: true });
    }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close the drawer on navigation; move focus to the page for screen readers.
  useEffect(() => {
    setDrawer(false);
    contentRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setDrawer(false); };
    window.addEventListener('keydown', onKey);
    drawerRef.current?.querySelector('a,button')?.focus();
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [drawer]);

  const logout = useCallback(() => { onLogout?.(); }, [onLogout]);

  if (!user) return null;
  const firstName = (user.name || '').trim().split(/\s+/)[0] || 'there';

  const userCard = (
    <div className="acc-usercard">
      <span className="acc-avatar" aria-hidden="true">{initials(user.name)}</span>
      <div className="acc-usercard__text">
        <strong>{user.name || 'Your account'}</strong>
        <span>{user.email}</span>
      </div>
    </div>
  );

  return (
    <div className="acc">
      <a href="#account-content" className="acc-skip">Skip to content</a>
      <aside className="acc-side" aria-label="Account navigation">
        <Link to="/" className="acc-brand" aria-label={`${SITE_NAME} home`}>
          <img src="/logo.svg" alt="" width="32" height="32" />
          <span>{SITE_NAME}</span>
        </Link>
        <nav className="acc-nav">
          {groups.map((g) => (
            <div className="acc-nav__group" key={g.group}>
              <p className="acc-nav__label">{g.group}</p>
              <NavItems items={g.items} />
            </div>
          ))}
        </nav>
        <div className="acc-side__foot">
          {userCard}
          <button type="button" className="acc-nav__link acc-nav__logout" onClick={logout}>
            <Icon name="logout" size={20} /><span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="acc-main">
        <header className="acc-top">
          <Link to="/" className="acc-brand acc-brand--top" aria-label={`${SITE_NAME} home`}>
            <img src="/logo.svg" alt="" width="28" height="28" />
            <span>{SITE_NAME}</span>
          </Link>
          <p className="acc-top__hello">Hi, {firstName}</p>
          <nav className="acc-top__links" aria-label="Browse">
            <Link to="/all-courses">Courses</Link>
            <Link to="/software">Software</Link>
            <Link to="/services">Services</Link>
          </nav>
          <Link to="/dashboard/profile" className="acc-avatar acc-avatar--sm" aria-label="Profile and security">{initials(user.name)}</Link>
        </header>

        <section id="account-content" className="acc-content" ref={contentRef} tabIndex={-1} aria-label="Account">
          <Suspense fallback={<SkeletonList rows={3} />}>
            <Routes>
              <Route index element={<Overview user={user} />} />
              <Route path="courses" element={<MyCourses />} />
              <Route path="certificates" element={<Certificates user={user} />} />
              <Route path="events" element={<Events />} />
              <Route path="software" element={<MySoftware />} />
              <Route path="services" element={<ServiceOrders />} />
              <Route path="orders" element={<Orders />} />
              <Route path="enquiries" element={<Enquiries />} />
              <Route path="profile" element={<Profile user={user} onRefreshUser={onRefreshUser} onLogout={logout} />} />
              <Route path="help" element={<Help user={user} />} />
              {isAdmin && <Route path="gst" element={<div className="acc-card"><GstReportTab /></div>} />}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </section>
      </div>

      <nav className="acc-tabbar" aria-label="Account sections">
        <NavItems items={TABBAR} />
        <button type="button" className={`acc-nav__link${drawer ? ' is-active' : ''}`} onClick={() => setDrawer(true)} aria-haspopup="dialog" aria-expanded={drawer}>
          <Icon name="more" size={20} /><span>More</span>
        </button>
      </nav>

      {drawer && (
        <div className="acc-drawer" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setDrawer(false); }}>
          <div className="acc-drawer__panel" role="dialog" aria-modal="true" aria-label="All account sections" ref={drawerRef}>
            <div className="acc-drawer__head">
              {userCard}
              <button type="button" className="acc-icon-btn" onClick={() => setDrawer(false)} aria-label="Close menu"><Icon name="close" size={20} /></button>
            </div>
            <nav className="acc-nav">
              {groups.map((g) => (
                <div className="acc-nav__group" key={g.group}>
                  <p className="acc-nav__label">{g.group}</p>
                  <NavItems items={g.items} onNavigate={() => setDrawer(false)} />
                </div>
              ))}
              <div className="acc-nav__group">
                <p className="acc-nav__label">Browse</p>
                <NavItems items={[{ to: '/all-courses', icon: 'book', label: 'All courses' }, { to: '/software', icon: 'code', label: 'Software' }, { to: '/services', icon: 'briefcase', label: 'Services' }]} />
              </div>
            </nav>
            <button type="button" className="acc-nav__link acc-nav__logout" onClick={logout}><Icon name="logout" size={20} /><span>Log out</span></button>
          </div>
        </div>
      )}
    </div>
  );
}
