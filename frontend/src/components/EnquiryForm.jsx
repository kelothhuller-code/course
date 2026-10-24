import React, { useEffect, useState } from 'react';
import { api } from '../api';
import tracker from '../utils/tracker';
import { useEnquiryForm } from '../hooks/useCatalog';
import './EnquiryForm.css';

const ENQUIRY_INTERESTS = ['Course', 'Software', 'Service', 'Other'];

// Option values: "Course" | "Software" | "Service" | "Other" | "software:<id>" | "service:<id>"
const parseChoice = (value) => {
  const m = /^(software|service):(.+)$/.exec(value || '');
  if (m) return { interest: m[1] === 'software' ? 'Software' : 'Service', relatedType: m[1], relatedId: m[2] };
  return { interest: ENQUIRY_INTERESTS.includes(value) ? value : 'Other', relatedType: '', relatedId: '' };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s()-]{6,19}$/;

/**
 * Enquiry / contact form.
 * Posts to POST /api/leads/contact, which validates, stores the enquiry in the
 * ContactMessage collection (visible in the admin portal → Inquiries) and emails
 * the owner if ENQUIRY_NOTIFY_EMAIL + SMTP are configured on the backend.
 */
export default function EnquiryForm({ user, defaultInterest = 'Course', related = null, source = 'landing_page', compact = false, courseTitle = '' }) {
  // Interest options are built from the live software/services lists (admin-managed)
  const { catalog } = useEnquiryForm();
  const initialChoice = related?.type && related?.id ? `${related.type}:${related.id}` : defaultInterest;
  // Name the actual course when we know it (e.g. the featured course), otherwise stay generic
  const courseOptionLabel = courseTitle
    ? `Course: ${courseTitle.length > 48 ? `${courseTitle.slice(0, 45).trim()}…` : courseTitle}`
    : 'A course';
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    interest: initialChoice || 'Course',
    message: '',
    website: '', // honeypot — real users never see or fill this
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [serverMsg, setServerMsg] = useState('');

  // Allow other sections (e.g. "Enquire about software" buttons) to preselect the interest
  useEffect(() => {
    const onPrefill = (e) => {
      const { interest, relatedType, relatedId } = e.detail || {};
      const choice = relatedType && relatedId ? `${relatedType}:${relatedId}` : interest;
      if (ENQUIRY_INTERESTS.includes(choice) || /^(software|service):/.test(choice || '')) {
        setForm((f) => ({ ...f, interest: choice }));
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
    const choice = parseChoice(form.interest);
    try {
      const res = await api.submitContactForm({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        interest: choice.interest,
        relatedType: choice.relatedType,
        relatedId: choice.relatedId,
        message: form.message.trim(),
        website: form.website,
        source,
      });
      setServerMsg(res?.message || '');
      setStatus('sent');
      tracker.trackEvent('enquiry_submit', { source: `${source || 'enquiry_form'}:${choice.interest}` });
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
            <option value="Course">{courseOptionLabel}</option>
            {catalog.software.length > 0 ? (
              <optgroup label="Software">
                {catalog.software.map((p) => <option key={p.id} value={`software:${p.id}`}>{p.title}</option>)}
                <option value="Software">Other software / not sure</option>
              </optgroup>
            ) : <option value="Software">Software</option>}
            {catalog.service.length > 0 ? (
              <optgroup label="Services">
                {catalog.service.map((p) => <option key={p.id} value={`service:${p.id}`}>{p.title}</option>)}
                <option value="Service">Other service / not sure</option>
              </optgroup>
            ) : <option value="Service">A service (automation, custom software, admin)</option>}
            {related?.type && related?.id && !catalog[related.type]?.some((p) => p.id === related.id) && (
              <option value={`${related.type}:${related.id}`}>{related.title || 'This product'}</option>
            )}
            <option value="Other">Something else</option>
          </select>
        </div>
      </div>

      <div className="enquiry-field">
        <label htmlFor="enq-message">Message *</label>
        <textarea id="enq-message" rows={compact ? 3 : 4} maxLength={3000} value={form.message} onChange={update('message')}
          aria-invalid={!!errors.message} aria-describedby={errors.message ? 'enq-message-err' : undefined}
          placeholder={form.interest === 'Course' || form.interest === 'Other' ? 'How can we help?' : 'What would you like to automate, build or improve?'} />
        {errors.message && <span className="enquiry-error" id="enq-message-err">{errors.message}</span>}
      </div>

      {/* Honeypot field: hidden from humans, bots tend to fill it */}
      <div className="enquiry-hp" aria-hidden="true">
        <label htmlFor="enq-website">Website</label>
        <input id="enq-website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={update('website')} />
      </div>

      {status === 'error' && <div className="enquiry-server-error" role="alert">{serverMsg}</div>}

      <button type="submit" className="wt-btn wt-btn--primary wt-btn--lg enquiry-submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send Enquiry'}
      </button>
      <p className="enquiry-privacy">We reply by email, usually within 24 business hours. We never share your details.</p>
    </form>
  );
}
