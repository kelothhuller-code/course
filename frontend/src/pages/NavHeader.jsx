import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function NavHeader({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

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
            {/* Logo / Brand */}
            <Link to="/" className="navbar-brand" onClick={closeMenu}>
              <span className="brand-name">WIDETECHNOS</span>
              <span className="brand-tagline">ACADEMY</span>
            </Link>

            {/* Mobile Header Quick Bar */}
            <div className="nav-mobile-bar-actions">
              {user ? (
                <Link to="/dashboard" className="mobile-dash-pill" onClick={closeMenu}>
                  ⚡ Dashboard
                </Link>
              ) : (
                <Link to="/auth" className="mobile-login-pill" onClick={closeMenu}>
                  Login
                </Link>
              )}

              <button
                className={`navbar-toggle ${isOpen ? 'is-active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? "Close menu" : "Open menu"}
                aria-expanded={isOpen}
              >
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
              </button>
            </div>

            {/* Nav Menu */}
            <div className={`navbar-menu ${isOpen ? 'navbar-menu-open' : ''}`}>
              {user && (
                <div className="nav-user-drawer-card">
                  <div className="nav-user-avatar">
                    {user.name ? user.name.charAt(0).toUpperCase() : '👤'}
                  </div>
                  <div className="nav-user-meta">
                    <span className="nav-user-name">{user.name || 'Student'}</span>
                    <span className="nav-user-email">{user.email}</span>
                  </div>
                  <Link
                    to="/dashboard"
                    className="btn btn-primary btn-sm nav-user-dash-link"
                    onClick={closeMenu}
                  >
                    Dashboard →
                  </Link>
                </div>
              )}

              <div className="navbar-links">
                <Link to="/" className="nav-link" onClick={closeMenu}>
                  Home
                </Link>
                <Link to="/all-courses" className="nav-link" onClick={closeMenu}>
                  All Courses
                </Link>
                {/* {user && (
                  <Link to="/dashboard" className="nav-link" onClick={closeMenu}>
                    Dashboard
                  </Link>
                )} */}

                {/* Desktop Buttons */}
                <div className="nav-desktop-auth-actions">
                  {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Link to="/dashboard" className="btn btn-primary btn-sm nav-dashboard-btn">
                        Dashboard
                      </Link>
                      <button
                        className="btn btn-ghost btn-sm nav-signout-btn"
                        onClick={handleLogout}
                      >
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Link to="/auth" className="btn btn-secondary btn-sm">
                        Login
                      </Link>
                      <Link to="/auth?signup=true" className="btn btn-primary btn-sm">
                        Sign Up
                      </Link>
                    </div>
                  )}
                </div>

                {/* Mobile Bottom Actions */}
                <div className="nav-mobile-bottom-actions">
                  {user ? (
                    <>
                      <Link
                        to="/dashboard"
                        className="btn btn-primary btn-md mobile-cta-btn"
                        onClick={closeMenu}
                      >
                        Go to Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="btn btn-ghost btn-sm mobile-signout-btn"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <div className="mobile-auth-grid">
                      <Link
                        to="/auth"
                        className="btn btn-secondary btn-md"
                        onClick={closeMenu}
                      >
                        Login
                      </Link>
                      <Link
                        to="/auth?signup=true"
                        className="btn btn-primary btn-md"
                        onClick={closeMenu}
                      >
                        🚀 Sign Up Free
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}