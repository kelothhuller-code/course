import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import './authpage.css';

export default function AuthPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Forgot password flow state
  const [forgotStep, setForgotStep] = useState(0); // 0 = none, 1 = request OTP, 2 = reset password
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

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

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(forgotEmail);
      setForgotStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.resetPassword(forgotEmail, otp, newPassword);
      setForgotStep(0);
      setForgotEmail('');
      setOtp('');
      setNewPassword('');
      alert('Password reset successful. You can now sign in.');
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Simple Navbar for Auth Page */}
      <header className="auth-navbar">
        <div className="container auth-nav-container">
          <Link to="/" className="navbar-brand">
            <img src="/logo.svg" alt="WideTech Logo" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
            <span className="brand-name">WIDETECH</span>
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
                  {forgotStep > 0 ? '🔑' : isLogin ? '👋' : '🚀'}
                </div>
                <h2>
                  {forgotStep === 1
                    ? 'Forgot Password'
                    : forgotStep === 2
                    ? 'Set New Password'
                    : isLogin
                    ? 'Welcome Back'
                    : 'Create Your Account'}
                </h2>
                <p>
                  {forgotStep === 1
                    ? 'Enter your registered email address to receive a verification OTP'
                    : forgotStep === 2
                    ? 'Enter the 6-digit OTP sent to your email and your new password'
                    : isLogin
                    ? 'Sign in to continue your AI learning journey'
                    : 'Start your AI learning journey today — no experience needed'}
                </p>
              </div>

              {error && (
                <div className="auth-error">
                  <span>⚠️</span> {error}
                </div>
              )}

              {/* Normal Login / Register Form */}
              {forgotStep === 0 && (
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
                        <button
                          type="button"
                          className="forgot-link"
                          onClick={() => {
                            setForgotStep(1);
                            setError('');
                            if (email) setForgotEmail(email);
                          }}
                        >
                          Forgot password?
                        </button>
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
              )}

              {/* Forgot password request step */}
              {forgotStep === 1 && (
                <form onSubmit={handleForgotRequest} className="auth-form">
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <div className="input-wrapper">
                      <span className="input-icon">📧</span>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="you@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg auth-submit"
                    disabled={loading}
                  >
                    {loading ? <span className="loading-spinner">⟳</span> : 'Send OTP'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-lg auth-cancel"
                    onClick={() => {
                      setForgotStep(0);
                      setError('');
                    }}
                  >
                    ← Back to Sign In
                  </button>
                </form>
              )}

              {/* Forgot password reset step */}
              {forgotStep === 2 && (
                <form onSubmit={handleResetPassword} className="auth-form">
                  <div className="form-group">
                    <label className="form-label">Verification OTP</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🔢</span>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🔒</span>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg auth-submit"
                    disabled={loading}
                  >
                    {loading ? <span className="loading-spinner">⟳</span> : 'Reset Password'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-lg auth-cancel"
                    onClick={() => {
                      setForgotStep(0);
                      setError('');
                    }}
                  >
                    ← Back to Sign In
                  </button>
                </form>
              )}

              {/* Toggle Login / Register (only in normal mode) */}
              {forgotStep === 0 && (
                <>
                  <div className="auth-divider">
                    <span>or</span>
                  </div>

                  <div className="auth-toggle">
                    <p>
                      {isLogin ? (
                        <>
                          New to WIDETECH?{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setIsLogin(false);
                              setError('');
                            }}
                            className="toggle-link"
                          >
                            Create an account
                          </button>
                        </>
                      ) : (
                        <>
                          Already have an account?{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setIsLogin(true);
                              setError('');
                            }}
                            className="toggle-link"
                          >
                            Sign In
                          </button>
                        </>
                      )}
                    </p>
                  </div>
                </>
              )}

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