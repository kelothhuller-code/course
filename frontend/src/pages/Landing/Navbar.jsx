import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="container">
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand">
            <span className="brand-name">WIDETECHNOS</span>
            <span className="brand-tagline">ACADEMY</span>
          </Link>

          <button 
            className="navbar-toggle" 
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>

          <div className={`navbar-menu ${isOpen ? 'navbar-menu-open' : ''}`}>
            <div className="navbar-links">
              <a href="#courses" className="nav-link">Courses</a>
              <a href="#events" className="nav-link">Workshops</a>
              <a href="#trials" className="nav-link">Free Tutorials</a>
              <a href="#why-ai" className="nav-link">Why AI?</a>
              <a href="#about" className="nav-link">About</a>
              {user ? (
                <button onClick={onLogout} className="btn btn-ghost btn-sm">
                  Sign Out
                </button>
              ) : (
                <Link to="/auth" className="btn btn-ghost btn-sm">
                  Login
                </Link>
              )}
              <Link 
                to={user ? '/dashboard' : '/auth'} 
                className="btn btn-primary btn-sm"
              >
                Start Learning — ₹499
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}