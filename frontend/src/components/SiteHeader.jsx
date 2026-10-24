import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Icon from './Icon';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../config/site';
import './SiteHeader.css';

const NAV = [
  { to: '/all-courses', label: 'Courses' },
  { to: '/software', label: 'Software' },
  { to: '/services', label: 'Services' },
  { to: '/contact', label: 'Contact' },
];

/**
 * Public site header: sticky, shrinks after scrolling, one nav for every marketing page.
 * Courses · Software · Services · Contact, plus Instagram, login/dashboard and a
 * "Business enquiry" button that opens the multi-step enquiry on /contact.
 */
export default function SiteHeader({ user, onLogout }) {
  // The drawer remembers which URL it was opened on, so it closes itself after navigation
  const [openOn, setOpenOn] = useState(null);
  const [compact, setCompact] = useState(false);
  const location = useLocation();
  const here = `${location.pathname}${location.hash}`;
  const open = openOn === here;
  const setOpen = (v) => setOpenOn((prev) => {
    const next = typeof v === 'function' ? v(prev === here) : v;
    return next ? here : null;
  });
  const navigate = useNavigate();
  const toggleRef = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setCompact(window.scrollY > 24);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add('menu-open-scroll-lock');
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpenOn(null); toggleRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    drawerRef.current?.querySelector('a, button')?.focus();
    return () => {
      document.body.classList.remove('menu-open-scroll-lock');
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const logout = async () => {
    setOpen(false);
    try { await api.logout(); } catch { localStorage.removeItem('token'); }
    if (onLogout) onLogout();
    navigate('/');
  };

  const instagram = INSTAGRAM_URL && (
    <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="sh-icon-link" aria-label={`Instagram @${INSTAGRAM_HANDLE} (opens in a new tab)`}>
      <Icon name="instagram" size={20} />
    </a>
  );

  return (
    <>
    <header className={`sh ${compact ? 'sh--compact' : ''}`}>
      <div className="wt-container sh-inner">
        <Link to="/" className="sh-brand" aria-label="WideTech home">
          <img src="/logo.svg" alt="" width="34" height="34" />
          <span>WideTech</span>
        </Link>

        <nav className="sh-nav" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `sh-link ${isActive ? 'is-active' : ''}`}>{n.label}</NavLink>
          ))}
        </nav>

        <div className="sh-actions">
          {instagram}
          {user ? (
            <Link to="/dashboard" className="sh-link sh-link--account">Dashboard</Link>
          ) : (
            <Link to="/auth" className="sh-link sh-link--account">Log in</Link>
          )}
          <Link to="/contact#business-enquiry" className="wt-btn wt-btn--primary wt-btn--sm sh-cta">Business enquiry</Link>
          <button
            ref={toggleRef}
            type="button"
            className="sh-toggle"
            aria-expanded={open}
            aria-controls="sh-drawer"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name={open ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>
    </header>

      {/* Drawer lives outside <header>: the header's backdrop-filter would otherwise become
          the containing block for these fixed elements. */}
      {open && <div className="sh-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
      <div id="sh-drawer" ref={drawerRef} className={`sh-drawer ${open ? 'is-open' : ''}`} hidden={!open} role="dialog" aria-modal="true" aria-label="Menu">
        <button type="button" className="sh-drawer-close" aria-label="Close menu" onClick={() => { setOpen(false); toggleRef.current?.focus(); }}>
          <Icon name="close" size={22} />
        </button>
        <nav aria-label="Mobile">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `sh-drawer-link ${isActive ? 'is-active' : ''}`}>
              {n.label} <Icon name="chevron-right" size={18} />
            </NavLink>
          ))}
        </nav>
        <div className="sh-drawer-foot">
          <Link to="/contact#business-enquiry" className="wt-btn wt-btn--primary wt-btn--block">Business enquiry</Link>
          {user ? (
            <div className="sh-drawer-row">
              <Link to="/dashboard" className="wt-btn wt-btn--secondary wt-btn--block">Dashboard</Link>
              <button type="button" className="wt-btn wt-btn--ghost" onClick={logout}>Sign out</button>
            </div>
          ) : (
            <Link to="/auth" className="wt-btn wt-btn--secondary wt-btn--block">Log in</Link>
          )}
          {INSTAGRAM_URL && (
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="sh-drawer-social">
              <Icon name="instagram" size={20} /> Follow @{INSTAGRAM_HANDLE}
            </a>
          )}
        </div>
      </div>
    </>
  );
}
