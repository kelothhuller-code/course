import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCoursePrice, isEnrolledIn } from '../../config/site';

export default function Navbar({ user, featuredCourse, hasServices = false, hasEvents = false, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
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

  const closeMenu = () => setIsOpen(false);

  // Only link to sections that actually render (avoids dead anchors)
  const navLinks = [
    featuredCourse ? { id: 'featured-program', label: 'The Course' } : { id: 'courses', label: 'Courses' },
    { id: 'software', label: 'Software' },
    hasServices && { id: 'services', label: 'Services' },
    hasEvents && { id: 'events', label: 'Workshops' },
    { id: 'faq', label: 'FAQ' },
    { id: 'enquiry', label: 'Contact' },
  ].filter(Boolean);

  const price = getCoursePrice(featuredCourse);
  const enrolled = isEnrolledIn(user, featuredCourse);
  const buyCta = featuredCourse && !enrolled
    ? { to: `/sale/${featuredCourse._id}`, label: price.isFree ? 'Start Free' : `Buy Course · ${price.label}` }
    : { to: '/all-courses', label: 'Explore Courses' };

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    closeMenu();
    const el = document.getElementById(sectionId);
    if (el) {
      const yOffset = -70;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    } else {
      window.location.hash = sectionId;
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
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
            
            {/* Brand Logo & Name in One Single Horizontal Line */}
            <Link to="/" className="navbar-brand" onClick={closeMenu}>
              <img 
                src="/logo.svg" 
                alt="WideTech Logo" 
                className="navbar-brand-logo" 
              />
              <span className="brand-name">WIDETECH</span>
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

              {/* Hamburger Button to Open Side Nav */}
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

            {/* Desktop Navigation Links (Landing Page) */}
            <div className="navbar-desktop-nav">
              {navLinks.map((l) => (
                <a key={l.id} href={`#${l.id}`} onClick={(e) => scrollToSection(e, l.id)} className="nav-link">{l.label}</a>
              ))}

              <div className="nav-desktop-auth-actions" style={{ marginLeft: '1rem' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Link to="/auth" className="btn btn-ghost btn-sm">
                      Login
                    </Link>
                    <Link 
                      to={buyCta.to} 
                      className="btn btn-primary btn-sm"
                      onClick={closeMenu}
                    >
                      {buyCta.label}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* ── Mobile Side Nav Drawer (Matches Desktop Navigation Only) ── */}
            <aside 
              className={`navbar-sidenav ${isOpen ? 'navbar-sidenav-open' : ''}`}
              aria-label="Mobile Navigation Drawer"
              aria-hidden={!isOpen}
            >
              {/* Drawer Top Header */}
              <div className="sidenav-header">
                <Link to="/" className="navbar-brand" onClick={closeMenu}>
                  <img 
                    src="/logo.svg" 
                    alt="WideTech Logo" 
                    style={{ width: '32px', height: '32px', objectFit: 'contain' }} 
                  />
                  <span className="brand-name" style={{ fontSize: '1.25rem' }}>WIDETECH</span>
                </Link>
                <button 
                  className="sidenav-close-btn" 
                  onClick={closeMenu} 
                  aria-label="Close Navigation"
                >
                  ✕
                </button>
              </div>

              {/* User Account Strip if logged in */}
              {user && (
                <div className="sidenav-user-card">
                  <div className="nav-user-avatar">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="nav-user-meta">
                    <span className="nav-user-name">{user.name || 'Student'}</span>
                    <span className="nav-user-email">{user.email}</span>
                  </div>
                  <Link 
                    to="/dashboard" 
                    className="btn btn-primary btn-sm"
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    onClick={closeMenu}
                  >
                    Dashboard →
                  </Link>
                </div>
              )}

              {/* Sidenav Links - Exactly matching Computer Navigation */}
              <div className="sidenav-body">
                <div className="sidenav-group">
                  {navLinks.map((l) => (
                    <a key={l.id} href={`#${l.id}`} className="sidenav-link" onClick={(e) => scrollToSection(e, l.id)}>
                      {l.label}
                    </a>
                  ))}
                  <a href="#about" className="sidenav-link" onClick={(e) => scrollToSection(e, 'about')}>
                    About WideTech
                  </a>
                </div>
              </div>

              {/* Sidenav Bottom Auth Actions */}
              <div className="sidenav-footer">
                {user ? (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link 
                      to="/dashboard" 
                      className="btn btn-primary btn-md" 
                      style={{ flex: 1, textAlign: 'center' }}
                      onClick={closeMenu}
                    >
                      Dashboard
                    </Link>
                    <button 
                      onClick={() => { closeMenu(); onLogout(); }} 
                      className="btn btn-ghost btn-sm"
                      style={{ border: '1px solid #e2e8f0' }}
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <Link 
                      to="/auth" 
                      className="btn btn-secondary btn-md" 
                      style={{ textAlign: 'center' }}
                      onClick={closeMenu}
                    >
                      Sign In
                    </Link>
                    <Link 
                      to={buyCta.to} 
                      className="btn btn-primary btn-md" 
                      style={{ textAlign: 'center' }}
                      onClick={closeMenu}
                    >
                      {featuredCourse && !enrolled ? 'Buy Course' : 'Explore Courses'}
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