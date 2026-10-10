import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function NavHeader({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Lock body scroll when mobile side nav is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('menu-open-scroll-lock');
    } else {
      document.body.classList.remove('menu-open-scroll-lock');
    }
    return () => {
      document.body.classList.remove('menu-open-scroll-lock');
    };
  }, [isOpen]);

  const handleLogout = () => {
    setIsOpen(false);
    localStorage.removeItem('token');
    if (onLogout) onLogout();
    navigate('/');
  };

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {isOpen && (
        <div
          className="nav-backdrop"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      <nav className="navbar navbar-scrolled" style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
        <div className="container">
          <div className="navbar-inner">
            
            {/* Logo / Brand in Single Line */}
            <Link to="/" className="navbar-brand" onClick={closeMenu}>
              <img 
                src="/logo.svg" 
                alt="WideTech Logo" 
                style={{ width: '34px', height: '34px', objectFit: 'contain', flexShrink: 0 }} 
              />
              <span className="brand-name">WIDETECH</span>
            </Link>

            {/* Mobile Header Quick Bar */}
            <div className="nav-mobile-bar-actions">
              {user ? (
                <Link to="/dashboard" className="mobile-dash-pill" onClick={closeMenu}>
                  Dashboard
                </Link>
              ) : (
                <Link to="/auth" className="mobile-login-pill" onClick={closeMenu}>
                  Login
                </Link>
              )}

              <button
                className={`navbar-toggle ${isOpen ? 'is-active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? "Close side nav" : "Open side nav"}
                aria-expanded={isOpen}
              >
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
              </button>
            </div>

            {/* Desktop Navigation - User Panel Views */}
            <div className="navbar-desktop-nav">
              <Link to="/dashboard?tab=dashboard" className="nav-link">Dashboard</Link>
              <Link to="/dashboard?tab=courses" className="nav-link">My Courses</Link>
              <Link to="/dashboard?tab=software" className="nav-link">Software & Tools</Link>
              <Link to="/dashboard?tab=services" className="nav-link">Services & Automation</Link>
              <Link to="/dashboard?tab=events" className="nav-link">Workshops</Link>
              <Link to="/dashboard?tab=certs" className="nav-link">Certificates</Link>
              <Link to="/dashboard?tab=invoices" className="nav-link">Invoices</Link>
              <Link to="/dashboard?tab=explore" className="nav-link">Store</Link>

              <div className="nav-desktop-auth-actions" style={{ marginLeft: '1rem' }}>
                {user ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Link to="/" className="btn btn-ghost btn-sm" title="Go to public website">
                      Website
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="btn btn-ghost btn-sm nav-signout-btn"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Link to="/auth" className="btn btn-ghost btn-sm">
                      Login
                    </Link>
                    <Link to="/auth?signup=true" className="btn btn-primary btn-sm">
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* ── Mobile Side Nav Drawer (User Portal Sections Only) ── */}
            <aside 
              className={`navbar-sidenav ${isOpen ? 'navbar-sidenav-open' : ''}`}
              aria-label="User Mobile Navigation Drawer"
            >
              <div className="sidenav-header">
                <Link to="/" className="navbar-brand" onClick={closeMenu}>
                  <img src="/logo.svg" alt="WideTech Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                  <span className="brand-name" style={{ fontSize: '1.25rem' }}>WIDETECH</span>
                </Link>
                <button className="sidenav-close-btn" onClick={closeMenu} aria-label="Close Navigation">
                  ✕
                </button>
              </div>

              {user && (
                <div className="sidenav-user-card">
                  <div className="nav-user-avatar">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="nav-user-meta">
                    <span className="nav-user-name">{user.name || 'User'}</span>
                    <span className="nav-user-email">{user.email}</span>
                  </div>
                </div>
              )}

              <div className="sidenav-body">
                <div className="sidenav-group">
                  <div className="sidenav-group-title">User Panel Navigation</div>
                  <Link to="/dashboard?tab=dashboard" className="sidenav-link" onClick={closeMenu}>
                    Dashboard Overview
                  </Link>
                  <Link to="/dashboard?tab=courses" className="sidenav-link" onClick={closeMenu}>
                    My Courses
                  </Link>
                  <Link to="/dashboard?tab=software" className="sidenav-link" onClick={closeMenu}>
                    Software & Tools
                  </Link>
                  <Link to="/dashboard?tab=services" className="sidenav-link" onClick={closeMenu}>
                    Services & Automation
                  </Link>
                  <Link to="/dashboard?tab=events" className="sidenav-link" onClick={closeMenu}>
                    Live Workshops
                  </Link>
                  <Link to="/dashboard?tab=certs" className="sidenav-link" onClick={closeMenu}>
                    Certificates
                  </Link>
                  <Link to="/dashboard?tab=invoices" className="sidenav-link" onClick={closeMenu}>
                    My GST Invoices
                  </Link>
                  <Link to="/dashboard?tab=explore" className="sidenav-link" onClick={closeMenu}>
                    Explore Store Catalog
                  </Link>
                </div>

                <div className="sidenav-group">
                  <div className="sidenav-group-title">General</div>
                  <Link to="/" className="sidenav-link" onClick={closeMenu}>
                    Website Home
                  </Link>
                  <Link to="/contact" className="sidenav-link" onClick={closeMenu}>
                    Support & Helpdesk
                  </Link>
                </div>
              </div>

              <div className="sidenav-footer">
                {user ? (
                  <button 
                    onClick={handleLogout} 
                    className="btn btn-secondary btn-md" 
                    style={{ width: '100%', textAlign: 'center' }}
                  >
                    Sign Out
                  </button>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <Link to="/auth" className="btn btn-secondary btn-md" style={{ textAlign: 'center' }} onClick={closeMenu}>
                      Sign In
                    </Link>
                    <Link to="/auth?signup=true" className="btn btn-primary btn-md" style={{ textAlign: 'center' }} onClick={closeMenu}>
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </aside>

          </div>
        </div>
      </nav>
    </>
  );
}