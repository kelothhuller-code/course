import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import SiteHeader from '../components/SiteHeader';
import Footer from './Landing/Footer';
import Icon from '../components/Icon';
import { SITE_NAME } from '../config/site';
import './authpage.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 6; // matches the server rule for sign-up and password reset

/** Only same-site paths are allowed as a post-login destination (no open redirects). */
const safeRedirect = (url) => (
  url && typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.includes('\\') ? url : '/dashboard'
);

const validators = {
  name: (v) => (v.trim().length < 2 ? 'Please enter your name (at least 2 characters).' : ''),
  email: (v) => (!v.trim() ? 'Please enter your email address.' : !EMAIL_RE.test(v.trim()) ? 'That email address does not look right.' : ''),
  password: (v, mode) => (!v ? 'Please enter your password.' : mode !== 'login' && v.length < MIN_PASSWORD ? `Use at least ${MIN_PASSWORD} characters.` : ''),
  otp: (v) => (!/^\d{6}$/.test(v.trim()) ? 'Enter the 6-digit code from the email.' : ''),
};

function Field({ id, label, icon, error, hint, aside, children }) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`auth-field${error ? ' has-error' : ''}`}>
      <div className="auth-field__label-row">
        <label htmlFor={id}>{label}</label>
        {aside}
      </div>
      <div className="auth-field__control">
        <Icon name={icon} size={18} className="auth-field__icon" />
        {children({ 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      </div>
      {hint && !error && <p className="auth-field__hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="auth-field__error" id={`${id}-error`}><Icon name="alert-triangle" size={14} /> {error}</p>}
    </div>
  );
}

function PasswordInput({ id, value, onChange, onBlur, autoComplete, placeholder, inputRef, a11y }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <input ref={inputRef} id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange} onBlur={onBlur}
        autoComplete={autoComplete} placeholder={placeholder} required {...a11y} />
      <button type="button" className="auth-field__toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
        <Icon name={show ? 'eye-off' : 'eye'} size={18} />
      </button>
    </>
  );
}

export default function AuthPage({ user, onLogout, onLoginSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirectTarget = safeRedirect(params.get('next') || params.get('redirect'));

  // mode: login | signup | forgot | reset
  const [mode, setMode] = useState(() => (params.get('signup') === 'true' || params.get('mode') === 'signup' ? 'signup' : 'login'));
  const [values, setValues] = useState({ name: '', email: '', password: '', otp: '', newPassword: '' });
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const firstRef = useRef(null);
  const headingRef = useRef(null);

  // Follow ?mode=signup|login when the URL changes (adjusting state during render, not in an effect).
  const [seenSearch, setSeenSearch] = useState(location.search);
  if (seenSearch !== location.search) {
    setSeenSearch(location.search);
    const p = new URLSearchParams(location.search);
    if (p.get('signup') === 'true' || p.get('mode') === 'signup') setMode('signup');
    else if (p.get('mode') === 'login') setMode('login');
  }
  useEffect(() => { window.scrollTo(0, 0); }, [location.search]);

  // Already signed in: go straight to the destination.
  useEffect(() => { if (user) navigate(redirectTarget, { replace: true }); }, [user, navigate, redirectTarget]);

  const fieldsFor = (m) => ({ login: ['email', 'password'], signup: ['name', 'email', 'password'], forgot: ['email'], reset: ['otp', 'newPassword'] }[m]);
  const check = (field, v = values[field], m = mode) => (field === 'newPassword' ? validators.password(v, 'reset') : validators[field](v, m));

  const switchMode = (m) => {
    setMode(m); setErrors({}); setTouched({}); setFormError('');
    if (m !== 'login') setNotice('');
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const set = (field) => (e) => {
    const v = e.target.value;
    setValues((s) => ({ ...s, [field]: v }));
    if (touched[field]) setErrors((s) => ({ ...s, [field]: check(field, v) }));
  };
  const blur = (field) => () => {
    setTouched((s) => ({ ...s, [field]: true }));
    setErrors((s) => ({ ...s, [field]: check(field) }));
  };

  const validateAll = () => {
    const fields = fieldsFor(mode);
    const next = Object.fromEntries(fields.map((f) => [f, check(f)]));
    setErrors(next);
    setTouched(Object.fromEntries(fields.map((f) => [f, true])));
    const first = fields.find((f) => next[f]);
    if (first) document.getElementById(`auth-${first}`)?.focus();
    return !first;
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validateAll()) return;
    setLoading(true);
    try {
      if (mode === 'login' || mode === 'signup') {
        const data = mode === 'login'
          ? await api.login(values.email.trim(), values.password)
          : await api.register(values.name.trim(), values.email.trim(), values.password);
        localStorage.setItem('token', data.token);
        onLoginSuccess?.(data);
        navigate(redirectTarget);
      } else if (mode === 'forgot') {
        await api.forgotPassword(values.email.trim());
        setNotice('If an account exists for that email, a 6-digit code is on its way. It is valid for a few minutes.');
        switchMode('reset');
      } else {
        await api.resetPassword(values.email.trim(), values.otp.trim(), values.newPassword);
        setValues((s) => ({ ...s, password: '', otp: '', newPassword: '' }));
        switchMode('login');
        setNotice('Password updated. Sign in with your new password.');
      }
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copy = {
    login: { title: 'Welcome back', sub: 'Sign in to continue your courses and manage your software and orders.', cta: 'Sign in', busy: 'Signing in…' },
    signup: { title: 'Create your account', sub: 'One account for your courses, certificates, software licences and invoices.', cta: 'Create account', busy: 'Creating account…' },
    forgot: { title: 'Reset your password', sub: 'Enter the email you signed up with and we will send you a 6-digit code.', cta: 'Send code', busy: 'Sending…' },
    reset: { title: 'Choose a new password', sub: `Enter the code we emailed to ${values.email || 'you'} and pick a new password.`, cta: 'Update password', busy: 'Updating…' },
  }[mode];

  return (
    <div className="wt-auth">
      <SiteHeader user={user} onLogout={onLogout} />
      <section className="auth-shell" aria-labelledby="auth-heading">
        <div className="auth-grid">
          <aside className="auth-brand" aria-label={`Why a ${SITE_NAME} account`}>
            <div className="auth-brand__inner">
              <span className="auth-brand__logo"><img src="/logo.svg" alt="" width="34" height="28" /> {SITE_NAME}</span>
              <h2>Everything you buy from {SITE_NAME}, in one place.</h2>
              <ul>
                <li><Icon name="book" size={18} /> Pick up every course where you left off</li>
                <li><Icon name="award" size={18} /> Download and share verifiable certificates</li>
                <li><Icon name="key" size={18} /> Manage licence keys, computers and renewals</li>
                <li><Icon name="receipt" size={18} /> Download GST invoices for every purchase</li>
              </ul>
              <p className="auth-brand__note"><Icon name="shield" size={16} /> Your password is stored hashed and never shown to anyone.</p>
            </div>
          </aside>

          <div className="auth-card">
            <h1 id="auth-heading" ref={headingRef} tabIndex={-1}>{copy.title}</h1>
            <p className="auth-card__sub">{copy.sub}</p>

            {(mode === 'login' || mode === 'signup') && (
              <div className="auth-switch" role="group" aria-label="Sign in or create an account">
                <button type="button" aria-pressed={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => switchMode('login')}>Sign in</button>
                <button type="button" aria-pressed={mode === 'signup'} className={mode === 'signup' ? 'is-active' : ''} onClick={() => switchMode('signup')}>Create account</button>
              </div>
            )}

            <div aria-live="polite" className="auth-live">
              {notice && <div className="auth-banner auth-banner--ok"><Icon name="check-circle" size={18} /> <span>{notice}</span></div>}
            </div>
            {formError && <div className="auth-banner auth-banner--err" role="alert"><Icon name="alert-triangle" size={18} /> <span>{formError}</span></div>}

            <form onSubmit={submit} noValidate className="auth-form">
              {mode === 'signup' && (
                <Field id="auth-name" label="Full name" icon="user" error={errors.name} hint="This is the name printed on your certificates.">
                  {(a) => <input ref={firstRef} id="auth-name" type="text" value={values.name} onChange={set('name')} onBlur={blur('name')} autoComplete="name" placeholder="Your full name" required {...a} />}
                </Field>
              )}
              {mode !== 'reset' && (
                <Field id="auth-email" label="Email address" icon="mail" error={errors.email}>
                  {(a) => <input id="auth-email" type="email" inputMode="email" value={values.email} onChange={set('email')} onBlur={blur('email')} autoComplete="email" placeholder="you@example.com" required {...a} />}
                </Field>
              )}
              {(mode === 'login' || mode === 'signup') && (
                <Field id="auth-password" label="Password" icon="lock" error={errors.password}
                  hint={mode === 'signup' ? `At least ${MIN_PASSWORD} characters. A longer passphrase is safer.` : undefined}
                  aside={mode === 'login' && <button type="button" className="auth-textlink" onClick={() => switchMode('forgot')}>Forgot password?</button>}>
                  {(a) => <PasswordInput id="auth-password" value={values.password} onChange={set('password')} onBlur={blur('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'login' ? 'Your password' : 'Create a password'} a11y={a} />}
                </Field>
              )}
              {mode === 'reset' && (
                <>
                  <Field id="auth-otp" label="6-digit code" icon="key" error={errors.otp}>
                    {(a) => <input id="auth-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={values.otp} onChange={set('otp')} onBlur={blur('otp')} placeholder="123456" required {...a} />}
                  </Field>
                  <Field id="auth-newPassword" label="New password" icon="lock" error={errors.newPassword} hint={`At least ${MIN_PASSWORD} characters.`}>
                    {(a) => <PasswordInput id="auth-newPassword" value={values.newPassword} onChange={set('newPassword')} onBlur={blur('newPassword')} autoComplete="new-password" placeholder="New password" a11y={a} />}
                  </Field>
                </>
              )}

              <button type="submit" className="wt-btn wt-btn--primary wt-btn--lg wt-btn--block auth-submit" disabled={loading} aria-busy={loading || undefined}>
                {loading ? <><span className="auth-spinner" aria-hidden="true" /> {copy.busy}</> : <>{copy.cta} <Icon name="arrow-right" size={18} /></>}
              </button>

              {(mode === 'forgot' || mode === 'reset') && (
                <button type="button" className="auth-back" onClick={() => switchMode('login')}><Icon name="arrow-left" size={16} /> Back to sign in</button>
              )}
              {mode === 'signup' && (
                <p className="auth-legal">By creating an account you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</p>
              )}
            </form>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
