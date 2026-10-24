import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import Icon from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { INDIAN_STATES } from '../../config/indianStates';
import { GSTIN_RE } from '../../utils/gst';
import { ConfirmDialog, PageHeader } from './ui';

const PHONE_RE = /^\+?[0-9][0-9\s-]{6,17}$/;

function Field({ id, label, hint, error, children }) {
  return (
    <div className={`acc-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="acc-field__error" id={`${id}-err`} role="alert"><Icon name="alert-triangle" size={14} />{error}</p>
        : hint ? <p className="acc-field__hint" id={`${id}-hint`}>{hint}</p> : null}
    </div>
  );
}
const describedBy = (id, error, hint) => (error ? `${id}-err` : hint ? `${id}-hint` : undefined);

function validateProfile(f) {
  const e = {};
  if (!f.name.trim() || f.name.trim().length < 2) e.name = 'Please enter your name (at least 2 characters).';
  if (f.phone.trim() && !PHONE_RE.test(f.phone.trim())) e.phone = 'Enter a valid phone number (digits, optional + country code).';
  if (f.gstin.trim() && !GSTIN_RE.test(f.gstin.trim().toUpperCase())) e.gstin = 'A GSTIN has 15 characters, like 32ABCDE1234F1Z5.';
  return e;
}

function ProfileForm({ user, onRefreshUser }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: user.name || '', phone: user.phone || '', state: user.state || '', gstin: user.gstin || '',
    businessName: user.businessName || '', billingAddress: user.billingAddress || '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => {
    const next = { ...form, [k]: e.target.value };
    setForm(next);
    if (touched[k]) setErrors(validateProfile(next));
  };
  const blur = (k) => () => { setTouched((t) => ({ ...t, [k]: true })); setErrors(validateProfile(form)); };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateProfile(form);
    setErrors(errs);
    setTouched({ name: true, phone: true, gstin: true });
    if (Object.keys(errs).length) {
      document.getElementById(`pf-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile({ ...form, gstin: form.gstin.trim().toUpperCase() });
      toast.success('Profile saved');
      onRefreshUser?.();
    } catch (err) {
      if (err.data?.errors) setErrors(err.data.errors);
      toast.error(err.message || 'Could not save your profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="acc-card acc-form" onSubmit={submit} noValidate aria-labelledby="pf-h">
      <h2 id="pf-h" className="acc-card__title">Personal & billing details</h2>
      <p className="acc-muted acc-small">Your state and GSTIN are used on future GST invoices.</p>
      <div className="acc-form__grid">
        <Field id="pf-name" label="Full name" error={errors.name}>
          <input id="pf-name" className="wt-input" autoComplete="name" value={form.name} onChange={set('name')} onBlur={blur('name')} aria-invalid={Boolean(errors.name)} aria-describedby={describedBy('pf-name', errors.name)} required />
        </Field>
        <Field id="pf-email" label="Email" hint="Your sign-in email cannot be changed here.">
          <input id="pf-email" className="wt-input" value={user.email || ''} readOnly aria-describedby="pf-email-hint" />
        </Field>
        <Field id="pf-phone" label="Phone (optional)" error={errors.phone}>
          <input id="pf-phone" className="wt-input" type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={set('phone')} onBlur={blur('phone')} aria-invalid={Boolean(errors.phone)} aria-describedby={describedBy('pf-phone', errors.phone)} />
        </Field>
        <Field id="pf-state" label="State" error={errors.state} hint="Place of supply for GST.">
          <select id="pf-state" className="wt-select" value={form.state} onChange={set('state')} aria-describedby={describedBy('pf-state', errors.state, true)}>
            <option value="">Select your state</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field id="pf-gstin" label="GSTIN (optional)" error={errors.gstin} hint="Only if you want business invoices.">
          <input id="pf-gstin" className="wt-input acc-mono" maxLength={15} value={form.gstin} onChange={set('gstin')} onBlur={blur('gstin')} aria-invalid={Boolean(errors.gstin)} aria-describedby={describedBy('pf-gstin', errors.gstin, true)} style={{ textTransform: 'uppercase' }} />
        </Field>
        <Field id="pf-biz" label="Business name (optional)">
          <input id="pf-biz" className="wt-input" autoComplete="organization" value={form.businessName} onChange={set('businessName')} maxLength={120} />
        </Field>
        <div className="acc-form__full">
          <Field id="pf-addr" label="Billing address (optional)">
            <textarea id="pf-addr" className="wt-textarea" rows={2} autoComplete="street-address" value={form.billingAddress} onChange={set('billingAddress')} maxLength={300} />
          </Field>
        </div>
      </div>
      <div className="acc-form__actions"><button type="submit" className="wt-btn wt-btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
    </form>
  );
}

function PasswordForm() {
  const toast = useToast();
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const validate = (v) => {
    const e = {};
    if (!v.current) e.current = 'Enter your current password.';
    if (v.next.length < 8) e.next = 'Use at least 8 characters.';
    else if (v.next.length > 128) e.next = 'Use 128 characters or fewer.';
    else if (v.next === v.current) e.next = 'Choose a password different from the current one.';
    if (v.confirm !== v.next) e.confirm = 'The passwords do not match.';
    return e;
  };
  const set = (k) => (e) => { const n = { ...f, [k]: e.target.value }; setF(n); if (Object.keys(errors).length) setErrors(validate(n)); };
  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(f);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await api.changePassword(f.current, f.next);
      setF({ current: '', next: '', confirm: '' });
      toast.success('Password changed. Other devices have been signed out.');
    } catch (err) {
      const se = err.data?.errors || {};
      setErrors({ current: se.currentPassword, next: se.newPassword });
      toast.error(err.message || 'Could not change your password');
    } finally {
      setSaving(false);
    }
  };
  const strength = f.next.length >= 12 && /[A-Z]/.test(f.next) && /\d/.test(f.next) ? 'Strong' : f.next.length >= 8 ? 'OK' : f.next ? 'Too short' : '';
  return (
    <form className="acc-card acc-form" onSubmit={submit} noValidate aria-labelledby="pw-h">
      <h2 id="pw-h" className="acc-card__title">Change password</h2>
      <Field id="pw-cur" label="Current password" error={errors.current}>
        <input id="pw-cur" className="wt-input" type={show ? 'text' : 'password'} autoComplete="current-password" value={f.current} onChange={set('current')} aria-invalid={Boolean(errors.current)} aria-describedby={describedBy('pw-cur', errors.current)} />
      </Field>
      <Field id="pw-new" label="New password" error={errors.next} hint={strength ? `Strength: ${strength}` : 'At least 8 characters.'}>
        <input id="pw-new" className="wt-input" type={show ? 'text' : 'password'} autoComplete="new-password" value={f.next} onChange={set('next')} aria-invalid={Boolean(errors.next)} aria-describedby={describedBy('pw-new', errors.next, true)} />
      </Field>
      <Field id="pw-conf" label="Confirm new password" error={errors.confirm}>
        <input id="pw-conf" className="wt-input" type={show ? 'text' : 'password'} autoComplete="new-password" value={f.confirm} onChange={set('confirm')} aria-invalid={Boolean(errors.confirm)} aria-describedby={describedBy('pw-conf', errors.confirm)} />
      </Field>
      <label className="acc-check"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords</label>
      <div className="acc-form__actions"><button type="submit" className="wt-btn wt-btn--primary" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</button></div>
    </form>
  );
}

export default function Profile({ user, onRefreshUser, onLogout }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const logoutAll = async () => {
    setBusy(true);
    try {
      await api.logoutAll();
      toast.success('Signed out of all devices.');
      onRefreshUser?.();
      navigate('/auth');
    } catch (err) {
      toast.error(err.message || 'Could not sign out of all devices');
      setBusy(false);
    }
  };
  return (
    <div className="acc-stack">
      <PageHeader icon="user" title="Profile & security" subtitle="Keep your details up to date and manage how you sign in." />
      <ProfileForm user={user} onRefreshUser={onRefreshUser} />
      <div className="acc-grid-2">
        <PasswordForm />
        <section className="acc-card acc-form" aria-labelledby="sess-h">
          <h2 id="sess-h" className="acc-card__title">Sessions</h2>
          <p className="acc-muted">Signed in on a shared or lost device? Sign out everywhere. You will need to sign in again on every device, including this one.</p>
          <div className="acc-form__actions acc-form__actions--start">
            <button type="button" className="wt-btn wt-btn--secondary acc-danger-text" onClick={() => setConfirm(true)}><Icon name="shield" size={18} />Log out of all devices</button>
            <button type="button" className="wt-btn wt-btn--ghost" onClick={onLogout}><Icon name="logout" size={18} />Log out here</button>
          </div>
        </section>
      </div>
      <ConfirmDialog open={confirm} title="Log out of all devices?" text="Every device signed in to this account, including this one, will be signed out." confirmLabel="Log out everywhere" busy={busy} onConfirm={logoutAll} onCancel={() => !busy && setConfirm(false)} />
    </div>
  );
}
