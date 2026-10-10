import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar({ user, featuredCourse, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Lock body scroll when mobile menu is open
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

  const closeMenu = () => setIsOpen(false);

  const navCtaText = featuredCourse 
    ? (featuredCourse.isFree ? 'Start Learning — Free' : `Start Learning — ₹${featuredCourse.discountedPrice || featuredCourse.price}`)
    : 'Explore Courses';

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div 
          className="nav-backdrop" 
          onClick={closeMenu} 
          aria-hidden="true" 
        />
      )}

      <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
        <div className="container">
          <div className="navbar-inner">
            {/* Brand Logo */}
            <Link to="/" className="navbar-brand" onClick={closeMenu} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <img src="/logo.png" alt="WideTech Logo" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="brand-name">WIDETECHNOS</span>
                <span className="brand-tagline">ACADEMY</span>
              </div>
            </Link>

            {/* Mobile Header Quick Actions */}
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

              {/* Animated Hamburger Toggle Button */}
              <button 
                className={`navbar-toggle ${isOpen ? 'is-active' : ''}`} 
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isOpen}
              >
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
              </button>
            </div>

            {/* Navigation Menu (Desktop & Mobile Drawer) */}
            <div className={`navbar-menu ${isOpen ? 'navbar-menu-open' : ''}`}>
              {/* Logged-in User Card (Mobile Only) */}
              {user && (
                <div className="nav-user-drawer-card">
                  <div className="nav-user-avatar">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
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
                <a href="#courses" className="nav-link" onClick={closeMenu}>
                  Courses
                </a>
                {featuredCourse && (
                  <a href="#curriculum" className="nav-link" onClick={closeMenu}>
                    Curriculum
                  </a>
                )}
                <a href="#events" className="nav-link" onClick={closeMenu}>
                  Workshops
                </a>
                <a href="#trials" className="nav-link" onClick={closeMenu}>
                  Free Tutorials
                </a>
                <a href="#why-ai" className="nav-link" onClick={closeMenu}>
                  Why AI?
                </a>
                <a href="#about" className="nav-link" onClick={closeMenu}>
                  About
                </a>
                <Link to="/all-courses" className="nav-link" onClick={closeMenu}>
                  All Courses
                </Link>

                {/* Desktop Buttons */}
                <div className="nav-desktop-auth-actions">
                  {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Link to="/dashboard" className="btn btn-primary btn-sm nav-dashboard-btn">
                        Dashboard
                      </Link>
                      <button 
                        onClick={onLogout} 
                        className="btn btn-ghost btn-sm nav-signout-btn" 
                        title="Sign Out"
                      >
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Link to="/auth" className="btn btn-ghost btn-sm">
                        Login
                      </Link>
                      {featuredCourse ? (
                        <Link 
                          to="/auth" 
                          className="btn btn-primary btn-sm"
                        >
                          {navCtaText}
                        </Link>
                      ) : (
                        <a 
                          href="#courses" 
                          className="btn btn-primary btn-sm"
                        >
                          {navCtaText}
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Mobile Drawer Bottom Actions */}
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
                        onClick={() => { closeMenu(); onLogout(); }} 
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
                        Join Free
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