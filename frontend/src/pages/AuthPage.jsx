import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import './authpage.css'
export default function AuthPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const rawRedirect = searchParams.get('redirect');
  const getSafeRedirect = (url) => {
    if (url && typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) {
      return url;
    }
    return '/dashboard';
  };
  const redirectTarget = getSafeRedirect(rawRedirect);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data;
      if (isLogin) {
        data = await api.login(email, password);
      } else {
        if (!name) {
          throw new Error('Name is required');
        }
        data = await api.register(name, email, password);
      }
      
      localStorage.setItem('token', data.token);
      onLoginSuccess(data);
      navigate(redirectTarget);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Simple Navbar for Auth Page */}
      <header className="auth-navbar">
        <div className="container auth-nav-container">
          <Link to="/" className="auth-brand" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/logo.svg" alt="WideTech Logo" style={{ width: '36px', height: '30px', objectFit: 'contain' }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span className="brand-name" style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.5px' }}>WIDETECH</span>
              <span className="brand-tagline" style={{ fontSize: '0.65rem', letterSpacing: '1.2px', opacity: 0.8 }}>ACADEMY</span>
            </div>
          </Link>
          <Link to="/" className="btn btn-ghost btn-sm">
            ← Back to Home
          </Link>
        </div>
      </header>

      <div className="auth-main">
        <div className="container">
          <div className="auth-card-wrapper">
            <div className="auth-card">
              <div className="auth-header">
                <div className="auth-icon">
                  {isLogin ? '👋' : '🚀'}
                </div>
                <h2>{isLogin ? 'Welcome Back' : 'Create Your Account'}</h2>
                <p>
                  {isLogin 
                    ? 'Sign in to continue your AI learning journey' 
                    : 'Start your AI learning journey today — no experience needed'}
                </p>
              </div>

              {error && (
                <div className="auth-error">
                  <span>⚠️</span> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                {!isLogin && (
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <div className="input-wrapper">
                      <span className="input-icon">👤</span>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="input-wrapper">
                    <span className="input-icon">📧</span>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔒</span>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  {isLogin && (
                    <div className="form-extra">
                      <a href="#" className="forgot-link">Forgot password?</a>
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-lg auth-submit" 
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading-spinner">⟳</span>
                  ) : isLogin ? (
                    'Sign In'
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <div className="auth-divider">
                <span>or</span>
              </div>

              <div className="auth-toggle">
                <p>
                  {isLogin ? (
                    <>
                      New to WIDETECH?{' '}
                      <button 
                        onClick={() => { setIsLogin(false); setError(''); }} 
                        className="toggle-link"
                      >
                        Create an account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button 
                        onClick={() => { setIsLogin(true); setError(''); }} 
                        className="toggle-link"
                      >
                        Sign In
                      </button>
                    </>
                  )}
                </p>
              </div>

              <div className="auth-features">
                <div className="feature-item">
                  <span>✓</span> Access to all your courses
                </div>
                <div className="feature-item">
                  <span>✓</span> Join live workshops
                </div>
                <div className="feature-item">
                  <span>✓</span> Track your progress
                </div>
              </div>
            </div>

            <div className="auth-side">
              <div className="auth-side-content">
                <div className="auth-side-icon">🌟</div>
                <h3>Start Your AI Journey</h3>
                <p>
                  Join thousands of learners building real projects with AI. 
                  No prior coding experience needed.
                </p>
                <div className="auth-side-stats">
                  <div className="stat-item">
                    <span className="stat-number">100%</span>
                    <span className="stat-label">Practical & Hands-on</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">10+</span>
                    <span className="stat-label">Age to start</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">8</span>
                    <span className="stat-label">Course modules</span>
                  </div>
                </div>
                <Link to="/" className="btn btn-secondary btn-sm">
                  Explore Free Tutorials
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Footer */}
      <footer className="auth-footer">
        <div className="container">
          <p>© {new Date().getFullYear()} WIDETECH Academy. Made with ❤️ by @widetechai</p>
          <div className="auth-footer-links">
            <Link to="/">Home</Link>
            <a href="https://instagram.com/widetechai" target="_blank" rel="noopener noreferrer">Instagram</a>
          </div>
        </div>
      </footer>
    </div>
  );
}