import React, { useEffect, useState } from 'react';
import { api } from '../api';
import './EnquiryForm.css';

const ENQUIRY_INTERESTS = ['Course', 'Software', 'Other'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s()-]{6,19}$/;

/**
 * Enquiry / contact form.
 * Posts to POST /api/leads/contact, which validates, stores the enquiry in the
 * ContactMessage collection (visible in the admin portal → Inquiries) and emails
 * the owner if ENQUIRY_NOTIFY_EMAIL + SMTP are configured on the backend.
 */
export default function EnquiryForm({ user, defaultInterest = 'Course', source = 'landing_page', compact = false }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    interest: ENQUIRY_INTERESTS.includes(defaultInterest) ? defaultInterest : 'Course',
    message: '',
    website: '', // honeypot — real users never see or fill this
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [serverMsg, setServerMsg] = useState('');

  // Allow other sections (e.g. "Enquire about software" buttons) to preselect the interest
  useEffect(() => {
    const onPrefill = (e) => {
      const interest = e.detail?.interest;
      if (ENQUIRY_INTERESTS.includes(interest)) {
        setForm((f) => ({ ...f, interest }));
        setStatus((s) => (s === 'sent' ? 'idle' : s));
      }
    };
    window.addEventListener('enquiry:prefill', onPrefill);
    return () => window.removeEventListener('enquiry:prefill', onPrefill);
  }, []);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const validate = () => {
    const er = {};
    if (!form.name.trim()) er.name = 'Please enter your name.';
    if (!EMAIL_RE.test(form.email.trim())) er.email = 'Please enter a valid email address.';
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) er.phone = 'Please enter a valid phone number (or leave it blank).';
    if (form.message.trim().length < 5) er.message = 'Please tell us a little about what you need.';
    setErrors(er);
    const first = Object.keys(er)[0];
    if (first) document.getElementById(`enq-${first}`)?.focus();
    return Object.keys(er).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'sending' || !validate()) return;
    setStatus('sending');
    setServerMsg('');
    try {
      const res = await api.submitContactForm({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        interest: form.interest,
        message: form.message.trim(),
        website: form.website,
        source,
      });
      setServerMsg(res?.message || '');
      setStatus('sent');
    } catch (err) {
      setServerMsg(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="enquiry-success" role="status">
        <strong>✅ Thank you, {form.name.split(' ')[0] || 'there'}!</strong>
        <p>{serverMsg || 'Your enquiry has been received.'} We'll reply to <strong>{form.email}</strong>.</p>
        <button
          type="button"
          className="link-button"
          onClick={() => { setForm((f) => ({ ...f, message: '' })); setStatus('idle'); }}
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form className={`enquiry-form ${compact ? 'enquiry-form-compact' : ''}`} onSubmit={handleSubmit} noValidate>
      <div className="enquiry-row">
        <div className="enquiry-field">
          <label htmlFor="enq-name">Name *</label>
          <input id="enq-name" type="text" autoComplete="name" maxLength={100} value={form.name} onChange={update('name')}
            aria-invalid={!!errors.name} aria-describedby={errors.name ? 'enq-name-err' : undefined} placeholder="Your full name" />
          {errors.name && <span className="enquiry-error" id="enq-name-err">{errors.name}</span>}
        </div>
        <div className="enquiry-field">
          <label htmlFor="enq-email">Email *</label>
          <input id="enq-email" type="email" autoComplete="email" maxLength={200} value={form.email} onChange={update('email')}
            aria-invalid={!!errors.email} aria-describedby={errors.email ? 'enq-email-err' : undefined} placeholder="you@example.com" />
          {errors.email && <span className="enquiry-error" id="enq-email-err">{errors.email}</span>}
        </div>
      </div>

      <div className="enquiry-row">
        <div className="enquiry-field">
          <label htmlFor="enq-phone">Phone <span className="enquiry-optional">(optional)</span></label>
          <input id="enq-phone" type="tel" autoComplete="tel" maxLength={20} value={form.phone} onChange={update('phone')}
            aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'enq-phone-err' : undefined} placeholder="+91 98765 43210" />
          {errors.phone && <span className="enquiry-error" id="enq-phone-err">{errors.phone}</span>}
        </div>
        <div className="enquiry-field">
          <label htmlFor="enq-interest">I'm interested in *</label>
          <select id="enq-interest" value={form.interest} onChange={update('interest')}>
            <option value="Course">A course</option>
            <option value="Software">Software / automation</option>
            <option value="Other">Something else</option>
          </select>
        </div>
      </div>

      <div className="enquiry-field">
        <label htmlFor="enq-message">Message *</label>
        <textarea id="enq-message" rows={compact ? 3 : 4} maxLength={3000} value={form.message} onChange={update('message')}
          aria-invalid={!!errors.message} aria-describedby={errors.message ? 'enq-message-err' : undefined}
          placeholder={form.interest === 'Software' ? 'What would you like to automate or build?' : 'How can we help?'} />
        {errors.message && <span className="enquiry-error" id="enq-message-err">{errors.message}</span>}
      </div>

      {/* Honeypot field: hidden from humans, bots tend to fill it */}
      <div className="enquiry-hp" aria-hidden="true">
        <label htmlFor="enq-website">Website</label>
        <input id="enq-website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={update('website')} />
      </div>

      {status === 'error' && <div className="enquiry-server-error" role="alert">{serverMsg}</div>}

      <button type="submit" className="btn btn-primary btn-lg enquiry-submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send Enquiry'}
      </button>
      <p className="enquiry-privacy">We reply by email, usually within 24 business hours. We never share your details.</p>
    </form>
  );
}
