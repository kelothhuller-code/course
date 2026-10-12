import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import NavHeader from './NavHeader';
import Footer from './Landing/Footer';
import './authpage.css';

export default function AuthPage({ user, onLogout, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password flow state
  const [forgotStep, setForgotStep] = useState(0); // 0 = normal, 1 = request OTP, 2 = reset password
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('signup') === 'true' || params.get('mode') === 'signup') {
      setIsLogin(false);
    } else if (params.get('mode') === 'login') {
      setIsLogin(true);
    }
    window.scrollTo(0, 0);
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      let data;
      if (isLogin) {
        data = await api.login(email, password);
      } else {
        if (!name.trim()) {
          throw new Error('Please enter your full name');
        }
        data = await api.register(name.trim(), email.trim(), password);
      }

      localStorage.setItem('token', data.token);
      if (onLoginSuccess) {
        onLoginSuccess(data);
      }
      navigate(redirectTarget);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await api.forgotPassword(forgotEmail);
      setForgotStep(2);
      setSuccessMsg('A 6-digit OTP has been sent to your email address.');
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please check the email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await api.resetPassword(forgotEmail, otp, newPassword);
      setForgotStep(0);
      setForgotEmail('');
      setOtp('');
      setNewPassword('');
      setIsLogin(true);
      setSuccessMsg('Password reset successful! You can now sign in with your new password.');
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please check your OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      {/* Standard Header with Logo, Brand Name & Navigation */}
      <NavHeader user={user} onLogout={onLogout} />

      <main className="auth-main-section">
        <div className="auth-ambient-glow" aria-hidden="true" />
        <div className="container">
          <div className="auth-card-container">
            <div className="auth-card">
              {/* Header Badge & Title */}
              <div className="auth-card-header">
                <div className="auth-brand-badge">
                  <img src="/logo.svg" alt="WIDETECH" className="auth-badge-logo" />
                  <span className="auth-badge-name">WIDETECH</span>
                </div>

                <h1 className="auth-title">
                  {forgotStep === 1
                    ? 'Forgot Password'
                    : forgotStep === 2
                    ? 'Create New Password'
                    : isLogin
                    ? 'Welcome Back'
                    : 'Create Your Account'}
                </h1>
                <p className="auth-subtitle">
                  {forgotStep === 1
                    ? 'Enter your registered email address to receive a verification OTP'
                    : forgotStep === 2
                    ? 'Enter the 6-digit OTP code sent to your email and your new password'
                    : isLogin
                    ? 'Enter your credentials to access your courses & dashboard'
                    : 'Get started with practical AI learning and hands-on projects'}
                </p>
              </div>

              {/* Segmented Switcher (Sign In / Register) */}
              {forgotStep === 0 && (
                <div className="auth-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isLogin}
                    className={`auth-tab-btn ${isLogin ? 'active' : ''}`}
                    onClick={() => {
                      setIsLogin(true);
                      setError('');
                      setSuccessMsg('');
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!isLogin}
                    className={`auth-tab-btn ${!isLogin ? 'active' : ''}`}
                    onClick={() => {
                      setIsLogin(false);
                      setError('');
                      setSuccessMsg('');
                    }}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {/* Alerts: Error & Success Messages */}
              {error && (
                <div className="auth-alert auth-alert-error" role="alert">
                  <svg className="auth-alert-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="auth-alert auth-alert-success" role="alert">
                  <svg className="auth-alert-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Normal Login / Register Form */}
              {forgotStep === 0 && (
                <form onSubmit={handleSubmit} className="auth-form" noValidate>
                  {!isLogin && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="auth-name">Full Name</label>
                      <div className="input-field-wrapper">
                        <svg className="input-field-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        <input
                          id="auth-name"
                          type="text"
                          className="form-input"
                          placeholder="Your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          autoComplete="name"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label" htmlFor="auth-email">Email Address</label>
                    <div className="input-field-wrapper">
                      <svg className="input-field-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      <input
                        id="auth-email"
                        type="email"
                        className="form-input"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="form-label-row">
                      <label className="form-label" htmlFor="auth-password">Password</label>
                      {isLogin && (
                        <button
                          type="button"
                          className="forgot-password-link"
                          onClick={() => {
                            setForgotStep(1);
                            setError('');
                            setSuccessMsg('');
                            if (email) setForgotEmail(email);
                          }}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="input-field-wrapper">
                      <svg className="input-field-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        className="form-input"
                        placeholder={isLogin ? 'Enter your password' : 'Create a password (min. 6 characters)'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={isLogin ? 'current-password' : 'new-password'}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="auth-primary-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="btn-loading-content">
                        <span className="auth-spinner" />
                        <span>{isLogin ? 'Signing In...' : 'Creating Account...'}</span>
                      </span>
                    ) : (
                      <span>{isLogin ? 'Sign In to Dashboard' : 'Create Free Account'}</span>
                    )}
                  </button>

                  <div className="auth-footer-toggle">
                    <p>
                      {isLogin ? (
                        <>
                          New to WIDETECH?{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setIsLogin(false);
                              setError('');
                              setSuccessMsg('');
                            }}
                            className="auth-link-button"
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
                              setSuccessMsg('');
                            }}
                            className="auth-link-button"
                          >
                            Sign In
                          </button>
                        </>
                      )}
                    </p>
                  </div>
                </form>
              )}

              {/* Forgot Password Step 1: Request OTP */}
              {forgotStep === 1 && (
                <form onSubmit={handleForgotRequest} className="auth-form" noValidate>
                  <div className="form-group">
                    <label className="form-label" htmlFor="forgot-email">Registered Email</label>
                    <div className="input-field-wrapper">
                      <svg className="input-field-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      <input
                        id="forgot-email"
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
                    className="auth-primary-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="btn-loading-content">
                        <span className="auth-spinner" />
                        <span>Sending OTP...</span>
                      </span>
                    ) : (
                      'Send Verification OTP'
                    )}
                  </button>

                  <button
                    type="button"
                    className="auth-secondary-btn"
                    onClick={() => {
                      setForgotStep(0);
                      setError('');
                      setSuccessMsg('');
                    }}
                  >
                    ← Back to Sign In
                  </button>
                </form>
              )}

              {/* Forgot Password Step 2: Reset Password */}
              {forgotStep === 2 && (
                <form onSubmit={handleResetPassword} className="auth-form" noValidate>
                  <div className="form-group">
                    <label className="form-label" htmlFor="reset-otp">Verification OTP</label>
                    <div className="input-field-wrapper">
                      <svg className="input-field-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                      </svg>
                      <input
                        id="reset-otp"
                        type="text"
                        className="form-input"
                        placeholder="Enter 6-digit OTP code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="new-password">New Password</label>
                    <div className="input-field-wrapper">
                      <svg className="input-field-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      <input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        className="form-input"
                        placeholder="Enter new password (min. 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showNewPassword ? (
                          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="auth-primary-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="btn-loading-content">
                        <span className="auth-spinner" />
                        <span>Updating Password...</span>
                      </span>
                    ) : (
                      'Save & Update Password'
                    )}
                  </button>

                  <button
                    type="button"
                    className="auth-secondary-btn"
                    onClick={() => {
                      setForgotStep(0);
                      setError('');
                      setSuccessMsg('');
                    }}
                  >
                    ← Back to Sign In
                  </button>
                </form>
              )}

              {/* Trust & Security Badge at the bottom of the card */}
              <div className="auth-card-security">
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>256-bit encrypted secure access • WIDETECH Academy</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Standard Full Footer identical to other screens */}
      <Footer />
    </div>
  );
}