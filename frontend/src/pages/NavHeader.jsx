import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function NavHeader({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    if (onLogout) onLogout();
    navigate('/');
  };

  return (
    <nav className="navbar" style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
      <div className="container">
        <div className="navbar-inner" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '0.75rem 0'
        }}>
          {/* Logo / Brand */}
          <Link to="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
            <span className="brand-name" style={{ 
              fontFamily: "'Outfit', sans-serif",
              fontSize: '1.25rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              WIDETECHNOS Academy
            </span>
            <span className="brand-tagline" style={{ 
              fontSize: '0.55rem',
              fontWeight: 600,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              WebkitTextFillColor: 'var(--text-muted)',
              display: 'block'
            }}>
              LEARN AI & AUTOMATION
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="navbar-menu" style={{ display: 'flex', alignItems: 'center' }}>
            <div className="navbar-links" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1.5rem',
              flexWrap: 'wrap'
            }}>
              <Link to="/" className="nav-link" style={{ 
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: '0.9rem',
                transition: 'color var(--transition)'
              }}>
                Home
              </Link>
              
              {user ? (
                <>
                  <Link to="/dashboard" className="nav-link" style={{ 
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    transition: 'color var(--transition)'
                  }}>
                    Dashboard
                  </Link>
                  
                  {/* <Link to="/dashboard" className="nav-link" style={{ 
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    transition: 'color var(--transition)'
                  }}>
                    My Learning
                  </Link> */}

                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={handleLogout}
                    style={{ 
                      padding: '0.4rem 1rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/auth" className="btn btn-secondary btn-sm" style={{ 
                    padding: '0.4rem 1rem',
                    fontSize: '0.85rem',
                    textDecoration: 'none'
                  }}>
                    Login
                  </Link>
                  <Link to="/auth?signup=true" className="btn btn-primary btn-sm" style={{ 
                    padding: '0.4rem 1rem',
                    fontSize: '0.85rem',
                    textDecoration: 'none'
                  }}>
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}