import { useState } from 'react';
import { api } from '../../api';
import Icon from '../../components/Icon';

/**
 * Shown on the success page when a guest paid with an email that already has an account.
 * The purchase is already on that account; the buyer signs in (or resets the password with the
 * existing 6-digit email code flow) to reach it. No session is ever issued without this step.
 */
export default function SignInToAccess({ email, onSignedIn }) {
  const [mode, setMode] = useState('login'); // login | code
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const signIn = async (pass) => {
    const data = await api.login(email, pass);
    if (data?.token) localStorage.setItem('token', data.token);
    await onSignedIn?.();
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    if (!password) { setError('Enter your password.'); return; }
    setBusy(true); setError('');
    try { await signIn(password); } catch (err) { setError(err.message || 'Could not sign you in.'); } finally { setBusy(false); }
  };

  const sendCode = async () => {
    setBusy(true); setError(''); setNote('');
    try {
      await api.forgotPassword(email);
      setMode('code');
      setNote(`We emailed a 6-digit code to ${email}.`);
    } catch (err) { setError(err.message || 'Could not send the code. Please try again.'); } finally { setBusy(false); }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) { setError('Enter the 6-digit code from the email.'); return; }
    if (newPassword.length < 6) { setError('Use at least 6 characters for the new password.'); return; }
    setBusy(true); setError('');
    try {
      await api.resetPassword(email, otp.trim(), newPassword);
      await signIn(newPassword);
    } catch (err) { setError(err.message || 'Could not reset the password.'); } finally { setBusy(false); }
  };

  return (
    <section className="co-signin" aria-labelledby="co-signin-h">
      <div className="co-signin__head">
        <span className="co-signin__icon" aria-hidden="true"><Icon name="lock" size={18} /></span>
        <div>
          <h2 id="co-signin-h" className="co-signin__title">This email already has an account</h2>
          <p className="co-signin__text">Sign in to access your purchase. It is already saved to <strong>{email}</strong>.</p>
        </div>
      </div>

      {mode === 'login' ? (
        <form className="co-signin__form" onSubmit={submitLogin} noValidate>
          <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
          <label htmlFor="co-signin-pass" className="wt-label">Password</label>
          <input id="co-signin-pass" type="password" className="wt-input co-input" autoComplete="current-password" value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? 'co-signin-err' : undefined} />
          {error && <p className="co-error" id="co-signin-err" role="alert">{error}</p>}
          <button type="submit" className="wt-btn wt-btn--primary wt-btn--block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in and open my purchase'}</button>
          <button type="button" className="co-linkbtn co-signin__alt" onClick={sendCode} disabled={busy}>Forgot password? Email me a code</button>
        </form>
      ) : (
        <form className="co-signin__form" onSubmit={submitReset} noValidate>
          {note && <p className="co-signin__note" role="status">{note}</p>}
          <label htmlFor="co-signin-otp" className="wt-label">6-digit code</label>
          <input id="co-signin-otp" className="wt-input co-input co-mono" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp}
            onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }} />
          <label htmlFor="co-signin-new" className="wt-label">New password</label>
          <input id="co-signin-new" type="password" className="wt-input co-input" autoComplete="new-password" value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setError(''); }} aria-describedby={error ? 'co-signin-err' : undefined} />
          {error && <p className="co-error" id="co-signin-err" role="alert">{error}</p>}
          <button type="submit" className="wt-btn wt-btn--primary wt-btn--block" disabled={busy}>{busy ? 'Saving…' : 'Set password and sign in'}</button>
          <button type="button" className="co-linkbtn co-signin__alt" onClick={() => { setMode('login'); setError(''); setNote(''); }}>Back to password sign-in</button>
        </form>
      )}
    </section>
  );
}
