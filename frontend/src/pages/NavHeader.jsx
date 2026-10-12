import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';

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

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await api.logout();
    } catch (e) {
      localStorage.removeItem('token');
    }
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
            
            {/* Left Brand & Side Nav Toggle for BOTH Mobile & Big Screen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <button
                className={`navbar-toggle ${isOpen ? 'is-active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? "Close side nav drawer" : "Open side nav drawer"}
                title="Toggle Side Navigation"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: isOpen ? 'var(--primary)' : 'rgba(255, 255, 255, 0.9)',
                  cursor: 'pointer',
                  padding: '6px',
                  flexDirection: 'column',
                  gap: '4.5px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
              >
                <span className="hamburger-line" style={{ background: isOpen ? '#ffffff' : '#0f172a', transition: 'all 0.2s ease' }}></span>
                <span className="hamburger-line" style={{ background: isOpen ? '#ffffff' : '#0f172a', transition: 'all 0.2s ease' }}></span>
                <span className="hamburger-line" style={{ background: isOpen ? '#ffffff' : '#0f172a', transition: 'all 0.2s ease' }}></span>
              </button>

              <Link to="/" className="navbar-brand" onClick={closeMenu} style={{ margin: 0 }}>
                <img 
                  src="/logo.svg" 
                  alt="WideTech Logo" 
                  className="navbar-brand-logo" 
                />
                <span className="brand-name">WIDETECH</span>
              </Link>
            </div>

            {/* Desktop Navigation - Clean, Uncongested Bar */}
            <div className="navbar-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <Link to="/dashboard?tab=explore" className="nav-link" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                🎓 Explore Courses
              </Link>
              <Link to="/" className="nav-link" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                🌐 Website Home
              </Link>

              <div className="nav-desktop-auth-actions" style={{ marginLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {user ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Link 
                      to="/dashboard?tab=dashboard" 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        textDecoration: 'none',
                        padding: '0.3rem 0.75rem',
                        borderRadius: '20px',
                        background: 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid rgba(99, 102, 241, 0.2)'
                      }}
                    >
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.78rem'
                      }}>
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {user.name || 'User'}
                      </span>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="btn btn-ghost btn-sm nav-signout-btn"
                      style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
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
                  <Link to="/dashboard?tab=explore" className="sidenav-link" onClick={closeMenu}>
                    Explore Courses
                  </Link>
                  <Link to="/dashboard?tab=events" className="sidenav-link" onClick={closeMenu}>
                    Live Workshops
                  </Link>
                  <Link to="/dashboard?tab=certs" className="sidenav-link" onClick={closeMenu}>
                    Certificates
                  </Link>
                  <Link to="/dashboard?tab=software" className="sidenav-link" onClick={closeMenu}>
                    Software & Tools
                  </Link>
                  <Link to="/dashboard?tab=services" className="sidenav-link" onClick={closeMenu}>
                    Services & Automation
                  </Link>
                  <Link to="/dashboard?tab=invoices" className="sidenav-link" onClick={closeMenu}>
                    My GST Invoices
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