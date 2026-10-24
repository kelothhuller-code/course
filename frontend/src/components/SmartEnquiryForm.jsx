import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import tracker from '../utils/tracker';
import Icon from './Icon';
import { useEnquiryForm } from '../hooks/useCatalog';
import './SmartEnquiryForm.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s()-]{6,19}$/;
const STEPS = ['What you need', 'A few details', 'Your contact'];

const isEmpty = (q, v) => {
  if (q.type === 'multiselect') return !Array.isArray(v) || v.length === 0;
  return v === undefined || v === null || String(v).trim() === '';
};

/**
 * Multi-step business enquiry. The categories and their follow-up questions come from
 * GET /api/leads/enquiry-form (admin → Enquiry Form), so nothing here is hard-coded.
 * Step 1: pick a category · Step 2: its questions · Step 3: contact details.
 *
 * Props: initialCategory (key), related ({ type, id, title }) to preselect a product,
 * source (stored with the enquiry and sent to the tracker).
 */
export default function SmartEnquiryForm({ user, initialCategory = '', related = null, source = 'enquiry_form' }) {
  const { categories, catalog, loading, error: loadError } = useEnquiryForm();
  const [step, setStep] = useState(0);
  const [categoryKey, setCategoryKey] = useState('');
  const [answers, setAnswers] = useState({});
  const [contact, setContact] = useState({ name: user?.name || '', email: user?.email || '', phone: '', company: '', country: '', message: '', website: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [serverMsg, setServerMsg] = useState('');
  const headingRef = useRef(null);
  const firstRender = useRef(true);

  const category = useMemo(() => categories.find((c) => c.key === categoryKey) || null, [categories, categoryKey]);

  // Preselect a category (e.g. /contact?type=services&item=<id>) once the form has loaded
  useEffect(() => {
    if (!categories.length || categoryKey) return;
    const wanted = categories.find((c) => c.key === initialCategory);
    if (!wanted) return;
    setCategoryKey(wanted.key);
    if (related?.id) {
      const q = (wanted.questions || []).find((x) => x.type === 'catalog');
      if (q) setAnswers((a) => ({ ...a, [q.key]: related.id }));
    }
    setStep(1);
  }, [categories, initialCategory, related, categoryKey]);

  // Move focus to the step heading for keyboard and screen-reader users
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus();
  }, [step]);

  const catalogOptions = (q) => {
    const src = q.catalogSource;
    const pool = src === 'service' ? catalog.service : src === 'software' ? catalog.software : [...catalog.software, ...catalog.service];
    return pool;
  };

  const setAnswer = (key, value) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const chooseCategory = (key) => {
    if (key !== categoryKey) {
      setAnswers({});
      setErrors({});
    }
    setCategoryKey(key);
    setStep(1);
  };

  const validateQuestions = () => {
    const er = {};
    (category?.questions || []).forEach((q) => {
      if (q.required && isEmpty(q, answers[q.key])) er[q.key] = 'Please answer this question.';
      if ((q.type === 'number') && !isEmpty(q, answers[q.key])) {
        const n = Number(answers[q.key]);
        if (!Number.isFinite(n)) er[q.key] = 'Please enter a number.';
        else if (q.min !== null && q.min !== undefined && n < q.min) er[q.key] = `Minimum is ${q.min}.`;
        else if (q.max !== null && q.max !== undefined && n > q.max) er[q.key] = `Maximum is ${q.max}.`;
      }
    });
    setErrors(er);
    const first = Object.keys(er)[0];
    if (first) document.getElementById(`sq-${first}`)?.focus();
    return !first;
  };

  const validateContact = () => {
    const er = {};
    if (!contact.name.trim()) er.name = 'Please enter your name.';
    if (!EMAIL_RE.test(contact.email.trim())) er.email = 'Please enter a valid email address.';
    if (contact.phone.trim() && !PHONE_RE.test(contact.phone.trim())) er.phone = 'Please enter a valid phone number (or leave it blank).';
    setErrors(er);
    const first = Object.keys(er)[0];
    if (first) document.getElementById(`sc-${first}`)?.focus();
    return !first;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'sending' || !validateContact()) return;
    setStatus('sending');
    setServerMsg('');
    const payload = {
      category: categoryKey,
      answers,
      name: contact.name.trim(),
      email: contact.email.trim(),
      phone: contact.phone.trim(),
      company: contact.company.trim(),
      country: contact.country.trim(),
      message: contact.message.trim(),
      website: contact.website,
      source,
      relatedType: related?.type || '',
      relatedId: related?.id || '',
    };
    try {
      const res = await api.submitSmartEnquiry(payload);
      setServerMsg(res?.message || '');
      setStatus('sent');
      // The tracker stores name/source/path only, so the category rides in source (e.g. contact_page:coffee)
      tracker.trackEvent('enquiry_submit', { source: `${source}:${categoryKey}` });
    } catch (err) {
      setServerMsg(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const contactField = (key, label, opts = {}) => (
    <div className={`wt-field ${opts.wide ? 'se-wide' : ''}`}>
      <label className="wt-label" htmlFor={`sc-${key}`}>
        {label} {opts.required ? <span className="req" aria-hidden="true">*</span> : <span className="se-optional">(optional)</span>}
      </label>
      {opts.textarea ? (
        <textarea id={`sc-${key}`} className="wt-textarea" rows={3} maxLength={3000} value={contact[key]}
          onChange={(e) => setContact((c) => ({ ...c, [key]: e.target.value }))} placeholder={opts.placeholder} />
      ) : (
        <input id={`sc-${key}`} className="wt-input" type={opts.type || 'text'} autoComplete={opts.autoComplete} maxLength={opts.max || 120}
          value={contact[key]} required={opts.required} aria-required={opts.required || undefined}
          aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `sc-${key}-err` : undefined}
          onChange={(e) => { setContact((c) => ({ ...c, [key]: e.target.value })); if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined })); }}
          placeholder={opts.placeholder} />
      )}
      {errors[key] && <span className="wt-error" id={`sc-${key}-err`}>{errors[key]}</span>}
    </div>
  );

  const renderQuestion = (q) => {
    const id = `sq-${q.key}`;
    const val = answers[q.key];
    const err = errors[q.key];
    const describedBy = err ? `${id}-err` : undefined;
    const label = (
      <span className="wt-label" id={`${id}-label`}>
        {q.label} {q.required ? <span className="req" aria-hidden="true">*</span> : <span className="se-optional">(optional)</span>}
      </span>
    );
    let control;
    switch (q.type) {
      case 'select':
        control = (
          <div className="se-options" role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={describedBy}>
            {q.options.map((op, i) => (
              <label key={op} className={`se-option ${val === op ? 'is-selected' : ''}`}>
                <input id={i === 0 ? id : undefined} type="radio" name={id} value={op} checked={val === op} onChange={() => setAnswer(q.key, op)} />
                <span>{op}</span>
              </label>
            ))}
          </div>
        );
        break;
      case 'multiselect': {
        const arr = Array.isArray(val) ? val : [];
        control = (
          <div className="se-options" role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy}>
            {q.options.map((op, i) => (
              <label key={op} className={`se-option ${arr.includes(op) ? 'is-selected' : ''}`}>
                <input id={i === 0 ? id : undefined} type="checkbox" value={op} checked={arr.includes(op)}
                  onChange={(e) => setAnswer(q.key, e.target.checked ? [...arr, op] : arr.filter((x) => x !== op))} />
                <span>{op}</span>
              </label>
            ))}
          </div>
        );
        break;
      }
      case 'catalog': {
        const pool = catalogOptions(q);
        control = (
          <select id={id} className="wt-select" value={val || ''} aria-labelledby={`${id}-label`} aria-describedby={describedBy} aria-invalid={!!err}
            onChange={(e) => setAnswer(q.key, e.target.value)}>
            <option value="">Choose…</option>
            {pool.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            <option value="not_sure">Not sure yet / something custom</option>
          </select>
        );
        break;
      }
      case 'range': {
        const min = q.min ?? 0;
        const max = q.max ?? 100;
        const cur = val === undefined || val === '' ? '' : Number(val);
        control = (
          <div className="se-range">
            <input id={id} type="range" min={min} max={max} step={q.step || 1} value={cur === '' ? min : cur}
              aria-labelledby={`${id}-label`} aria-describedby={describedBy} aria-valuetext={cur === '' ? 'Not set' : `${cur} ${q.unit || ''}`}
              onChange={(e) => setAnswer(q.key, e.target.value)} />
            <output htmlFor={id} className="se-range-value">{cur === '' ? 'Slide to choose' : `${Number(cur).toLocaleString('en-IN')} ${q.unit || ''}`}</output>
          </div>
        );
        break;
      }
      case 'number':
        control = (
          <div className="se-number">
            <input id={id} className="wt-input" type="number" inputMode="decimal" min={q.min ?? undefined} max={q.max ?? undefined} step={q.step || 'any'}
              value={val ?? ''} placeholder={q.placeholder} aria-labelledby={`${id}-label`} aria-describedby={describedBy} aria-invalid={!!err}
              onChange={(e) => setAnswer(q.key, e.target.value)} />
            {q.unit && <span className="se-unit">{q.unit}</span>}
          </div>
        );
        break;
      case 'textarea':
        control = (
          <textarea id={id} className="wt-textarea" rows={3} maxLength={3000} value={val || ''} placeholder={q.placeholder}
            aria-labelledby={`${id}-label`} aria-describedby={describedBy} aria-invalid={!!err} onChange={(e) => setAnswer(q.key, e.target.value)} />
        );
        break;
      default:
        control = (
          <input id={id} className="wt-input" type="text" maxLength={300} value={val || ''} placeholder={q.placeholder}
            aria-labelledby={`${id}-label`} aria-describedby={describedBy} aria-invalid={!!err} onChange={(e) => setAnswer(q.key, e.target.value)} />
        );
    }
    return (
      <div key={q.key} className={`wt-field se-q se-q--${q.type}`}>
        {label}
        {control}
        {err && <span className="wt-error" id={`${id}-err`}>{err}</span>}
      </div>
    );
  };

  if (status === 'sent') {
    return (
      <div className="se-card se-success" role="status">
        <span className="wt-icon-tile wt-icon-tile--accent"><Icon name="check-circle" size={26} /></span>
        <h3>Thank you, {contact.name.split(' ')[0] || 'there'}!</h3>
        <p>{serverMsg || 'Your enquiry has been received.'} We'll reply to <strong>{contact.email}</strong>.</p>
        <button type="button" className="wt-btn wt-btn--secondary wt-btn--sm" onClick={() => { setStatus('idle'); setStep(0); setCategoryKey(''); setAnswers({}); setContact((c) => ({ ...c, message: '' })); }}>
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <div className="se-card">
      <ol className="se-progress" aria-label="Enquiry steps">
        {STEPS.map((label, i) => (
          <li key={label} className={i === step ? 'is-current' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
            <span className="se-progress-dot">{i < step ? <Icon name="check" size={14} strokeWidth={2.6} /> : i + 1}</span>
            <span className="se-progress-label">{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section aria-labelledby="se-step1">
          <h3 id="se-step1" ref={headingRef} tabIndex={-1} className="se-title">What can we help you with?</h3>
          {loading && (
            <div className="se-cats" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="wt-skeleton" style={{ height: 88, borderRadius: 'var(--radius-md)' }} />)}
            </div>
          )}
          {loadError && <div className="wt-alert wt-alert--error" role="alert">{loadError}</div>}
          {!loading && !loadError && (
            <ul className="se-cats">
              {categories.map((c) => (
                <li key={c.key}>
                <button type="button" className={`se-cat ${c.key === categoryKey ? 'is-selected' : ''}`} aria-pressed={c.key === categoryKey} onClick={() => chooseCategory(c.key)}>
                  <span className="wt-icon-tile"><Icon name={c.icon || 'spark'} size={22} /></span>
                  <span className="se-cat-text">
                    <strong>{c.label}</strong>
                    {c.description && <small>{c.description}</small>}
                  </span>
                  <Icon name="chevron-right" size={18} className="se-cat-arrow" />
                </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {step === 1 && category && (
        <form noValidate onSubmit={(e) => { e.preventDefault(); if (validateQuestions()) setStep(2); }} aria-labelledby="se-step2">
          <h3 id="se-step2" ref={headingRef} tabIndex={-1} className="se-title">
            <Icon name={category.icon || 'spark'} size={22} /> {category.label}
          </h3>
          {related?.title && <p className="se-related">About: <strong>{related.title}</strong></p>}
          <div className="se-questions">
            {(category.questions || []).length ? category.questions.map(renderQuestion) : <p className="wt-muted">No extra questions. Continue to your contact details.</p>}
          </div>
          <div className="se-nav">
            <button type="button" className="wt-btn wt-btn--ghost" onClick={() => setStep(0)}><Icon name="arrow-left" size={18} /> Back</button>
            <button type="submit" className="wt-btn wt-btn--primary">Continue <Icon name="arrow-right" size={18} /></button>
          </div>
        </form>
      )}

      {step === 2 && category && (
        <form noValidate onSubmit={submit} aria-labelledby="se-step3">
          <h3 id="se-step3" ref={headingRef} tabIndex={-1} className="se-title">How can we reach you?</h3>
          <div className="se-grid">
            {contactField('name', 'Name', { required: true, autoComplete: 'name', placeholder: 'Your full name', max: 100 })}
            {contactField('email', 'Email', { required: true, type: 'email', autoComplete: 'email', placeholder: 'you@example.com', max: 200 })}
            {contactField('phone', 'Phone / WhatsApp', { type: 'tel', autoComplete: 'tel', placeholder: '+91 98765 43210', max: 20 })}
            {contactField('company', 'Company', { autoComplete: 'organization', placeholder: 'Company or brand' })}
            {contactField('country', 'Country', { autoComplete: 'country-name', placeholder: 'e.g. India', max: 80 })}
            {contactField('message', 'Anything else we should know?', { textarea: true, wide: true, placeholder: 'Optional' })}
          </div>
          <div className="enquiry-hp" aria-hidden="true">
            <label htmlFor="sc-website">Website</label>
            <input id="sc-website" type="text" tabIndex={-1} autoComplete="off" value={contact.website} onChange={(e) => setContact((c) => ({ ...c, website: e.target.value }))} />
          </div>
          {status === 'error' && <div className="wt-alert wt-alert--error" role="alert">{serverMsg}</div>}
          <div className="se-nav">
            <button type="button" className="wt-btn wt-btn--ghost" onClick={() => setStep(1)}><Icon name="arrow-left" size={18} /> Back</button>
            <button type="submit" className="wt-btn wt-btn--primary" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Send enquiry'} <Icon name="arrow-right" size={18} />
            </button>
          </div>
          <p className="se-privacy">We reply by email. We never share your details.</p>
        </form>
      )}
    </div>
  );
}
