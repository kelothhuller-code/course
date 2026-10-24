import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import Icon from '../../components/Icon';
import tracker from '../../utils/tracker';
import { GSTIN_RE, money } from '../../utils/gst';
import { INDIAN_STATES } from '../../config/indianStates';
import { SUPPORT_EMAIL, whatsappUrl } from '../../config/site';
import CheckoutHeader from './CheckoutHeader';
import PaymentSuccess from './PaymentSuccess';
import './checkout.css';

const MockPaymentDialog = lazy(() => import('./MockPaymentDialog'));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (v) => String(v || '').replace(/\D/g, '');
const LAST_STATE_KEY = 'wt_checkout_state';

const validators = {
  name: (v) => (v.trim().length >= 2 ? '' : 'Please enter your full name. It goes on your invoice.'),
  email: (v) => (EMAIL_RE.test(v.trim()) ? '' : 'Please enter a valid email, e.g. name@gmail.com.'),
  phone: (v) => {
    const d = digits(v);
    return d.length >= 10 && d.length <= 13 ? '' : 'Please enter a 10-digit mobile number.';
  },
  gstin: (v) => (!v.trim() || GSTIN_RE.test(v.trim().toUpperCase()) ? '' : 'That GSTIN does not look right (15 characters, e.g. 32ABCDE1234F1Z5). Leave it empty if you don\'t have one.'),
};

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) { resolve(true); return; }
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.onload = () => resolve(true);
  s.onerror = () => resolve(false);
  document.body.appendChild(s);
});

const initialState = (user, sellerState) => {
  let saved = '';
  try { saved = localStorage.getItem(LAST_STATE_KEY) || ''; } catch { /* storage blocked */ }
  const fromUser = user?.state && INDIAN_STATES.includes(user.state) ? user.state : '';
  return fromUser || (INDIAN_STATES.includes(saved) ? saved : '') || sellerState || 'Kerala';
};

/**
 * One-page checkout shared by courses, live events, software licences and paid services.
 *
 * Money safety: every amount shown comes from POST /payment/quote (server-side pricing), the
 * order is priced again on the server when it is created, and the payment is confirmed only
 * after the server verifies Razorpay's signature. Nothing here decides what is charged.
 */
export default function CheckoutView({
  kind, item, variants = null, initialVariantId = '', renewId = '', couponEnabled = false,
  sellerState = 'Kerala', user, onRefreshUser, onPaid, title,
}) {
  const itemType = kind;
  const [variantId, setVariantId] = useState(initialVariantId || variants?.[0]?.id || '');
  const selected = variants ? (variants.find((v) => v.id === variantId) || variants[0]) : null;

  const [form, setForm] = useState(() => ({
    name: user?.name || '', email: user?.email || '', phone: user?.phone || '',
    state: initialState(user, sellerState), gstin: '', business: '', address: '',
  }));
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [gstOpen, setGstOpen] = useState(false);

  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);

  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoteBusy, setQuoteBusy] = useState(true);

  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState(null); // { message, paymentId?, retryVerify? }
  const [notice, setNotice] = useState('');
  const [mockOrder, setMockOrder] = useState(null);
  const [success, setSuccess] = useState(null);

  const [signInOpen, setSignInOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  const [signInBusy, setSignInBusy] = useState(false);

  const payErrorRef = useRef(null);
  const pendingVerify = useRef(null);
  const variantName = selected ? ` – ${selected.name}` : '';
  const total = quote?.total;

  // Prefill when the user signs in (inline or elsewhere)
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: f.name || user.name || '',
      email: user.email || f.email,
      phone: f.phone || user.phone || '',
      state: user.state && INDIAN_STATES.includes(user.state) && !touched.state ? user.state : f.state,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Server-side price breakdown (re-quoted when the plan, coupon or state changes)
  useEffect(() => {
    let alive = true;
    setQuoteBusy(true);
    const t = setTimeout(() => {
      api.getCheckoutQuote({
        itemType, itemId: item.id, variantId: selected && selected.id !== 'main' ? selected.id : undefined,
        renewLicenseId: renewId || undefined, couponCode: couponCode || undefined, buyerState: form.state,
      })
        .then((q) => { if (alive) { setQuote(q); setQuoteError(''); } })
        .catch((e) => { if (alive) setQuoteError(e.message || 'We could not calculate the price.'); })
        .finally(() => { if (alive) setQuoteBusy(false); });
    }, 120);
    return () => { alive = false; clearTimeout(t); };
  }, [itemType, item.id, selected?.id, renewId, couponCode, form.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Analytics: one checkout_view per item, plus the existing drop-off funnel step
  useEffect(() => {
    tracker.trackEvent('checkout_view', { courseId: item.id, source: `checkout:${kind}` });
    tracker.trackCheckoutStep({ courseId: item.id, courseTitle: `${item.title}${variantName}`, step: 'entered_checkout' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  useEffect(() => {
    if (!form.name && !form.email && !form.phone) return undefined;
    const t = setTimeout(() => tracker.trackCheckoutStep({
      courseId: item.id, courseTitle: `${item.title}${variantName}`, amount: total || 0,
      buyerName: form.name.trim(), buyerEmail: form.email.trim().toLowerCase(), buyerPhone: form.phone.trim(), buyerState: form.state, step: 'filled_contact',
    }), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name, form.email, form.phone]);

  const validateField = (k, v) => (validators[k] ? validators[k](v ?? form[k]) : '');
  const setField = (k) => (e) => {
    const v = k === 'gstin' ? e.target.value.toUpperCase().replace(/\s/g, '') : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (k === 'state') setTouched((t) => ({ ...t, state: true }));
    if (touched[k] || errors[k]) setErrors((x) => ({ ...x, [k]: validateField(k, v) }));
  };
  const blur = (k) => () => {
    setTouched((t) => ({ ...t, [k]: true }));
    if (form[k]) setErrors((x) => ({ ...x, [k]: validateField(k) }));
  };

  const showPayError = (err) => {
    setPayError(err);
    setTimeout(() => payErrorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 30);
  };

  const finish = async (res, email) => {
    onPaid?.(); // tell the page not to swap to its "already owned" state when the user refreshes
    if (res.token) {
      localStorage.setItem('token', res.token);
      if (onRefreshUser) await onRefreshUser();
    }
    try { localStorage.setItem(LAST_STATE_KEY, form.state); } catch { /* ignore */ }
    tracker.trackEvent('payment_success', { courseId: item.id, source: `checkout:${kind}` });
    pendingVerify.current = null;
    setSuccess({
      email, txnid: res.txnid, invoiceNo: res.invoiceNo, hasSession: Boolean(res.token || user),
      // Paid as a guest with an email that already has an account: no session is issued, so the
      // success page asks the buyer to sign in to that account to reach the purchase.
      signInRequired: Boolean(res.signInRequired && !res.token && !user),
      newlyCreated: Boolean(res.newlyCreated), licenseKey: res.licenseKey || '', license: res.license || null,
      serviceOrder: res.serviceOrder || null, amount: total,
    });
    window.scrollTo(0, 0);
  };

  const verify = async (payload) => {
    const res = await api.verifyRazorpayPayment(payload.body);
    if (!res.success) throw new Error(res.message || 'verification failed');
    await finish(res, payload.email);
  };

  const failed = (message, extra = {}) => {
    tracker.trackEvent('payment_failed', { courseId: item.id, source: `checkout:${kind}` });
    tracker.trackCheckoutStep({ courseId: item.id, courseTitle: `${item.title}${variantName}`, amount: total || 0, buyerEmail: form.email.trim().toLowerCase(), buyerPhone: form.phone.trim(), step: 'payment_failed' });
    showPayError({ message, ...extra });
  };

  const retryVerify = async () => {
    const p = pendingVerify.current;
    if (!p) return;
    setProcessing(true);
    setPayError(null);
    try { await verify(p); } catch (e) {
      showPayError({ message: `We still could not confirm your payment (${e.message}).`, paymentId: p.body.razorpay_payment_id, retryVerify: true });
    } finally { setProcessing(false); }
  };

  const pay = async (e) => {
    e?.preventDefault();
    if (processing) return;
    const keys = ['name', 'email', 'phone', 'gstin'];
    const errs = {};
    keys.forEach((k) => { const m = validateField(k); if (m) errs[k] = m; });
    setErrors(errs);
    setTouched({ name: true, email: true, phone: true, gstin: true, state: touched.state });
    setPayError(null);
    setNotice('');
    const first = keys.find((k) => errs[k]);
    if (first) {
      if (first === 'gstin') setGstOpen(true);
      setTimeout(() => {
        const el = document.getElementById(`co-${first}`);
        el?.focus({ preventScroll: true });
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 0);
      return;
    }
    if (!quote || quoteError) { showPayError({ message: quoteError || 'Please wait a moment while we confirm the price.' }); return; }

    const name = form.name.trim();
    const email = (user?.email || form.email).trim().toLowerCase();
    const phone = form.phone.trim();
    const gstin = form.gstin.trim().toUpperCase();
    const address = [form.business.trim(), form.address.trim()].filter(Boolean).join(', ');

    setProcessing(true);
    tracker.trackEvent('checkout_start', { courseId: item.id, source: `checkout:${kind}` });
    tracker.trackCheckoutStep({ courseId: item.id, courseTitle: `${item.title}${variantName}`, amount: total || 0, buyerName: name, buyerEmail: email, buyerPhone: phone, buyerState: form.state, step: 'initiated_payment' });

    try {
      const order = await api.createRazorpayOrder({
        itemType, itemId: item.id,
        ...(variants ? { variantId: selected && selected.id !== 'main' ? selected.id : undefined } : {}),
        ...(renewId ? { renewLicenseId: renewId } : {}),
        ...(couponEnabled ? { couponCode: couponCode || null } : {}),
        buyerName: name, buyerEmail: email, phone, buyerState: form.state, buyerGstin: gstin, buyerAddress: address,
      });
      if (order.isMock) {
        setMockOrder({ ...order, email });
        setProcessing(false);
        return;
      }
      if (!(await loadRazorpay())) throw new Error('The payment window could not load. Please check your internet connection and try again.');
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'WideTech',
        description: order.itemTitle || item.title,
        image: '/logo.png',
        order_id: order.orderId,
        prefill: order.prefill || { name, email, contact: phone },
        notes: { txnid: order.txnid },
        theme: { color: '#4338ca' },
        handler: async (r) => {
          setProcessing(true);
          const payload = { email, body: { razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature, txnid: order.txnid } };
          pendingVerify.current = payload;
          try { await verify(payload); } catch (err) {
            showPayError({ message: `Your payment went through but we could not confirm it yet (${err.message}).`, paymentId: r.razorpay_payment_id, retryVerify: true });
          } finally { setProcessing(false); }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            setNotice('Payment window closed before the payment finished. Tap Pay whenever you are ready to try again.');
          },
        },
      });
      rzp.on('payment.failed', (r) => {
        setProcessing(false);
        failed(r.error?.description || r.error?.reason || 'The payment was declined by your bank or UPI app.');
      });
      rzp.open();
    } catch (err) {
      setProcessing(false);
      failed(err.message || 'We could not start the payment.');
    }
  };

  // Local test mode only: the server refuses mock payments unless ALLOW_MOCK_PAYMENTS=true outside production.
  const mockPay = async (ok) => {
    const order = mockOrder;
    if (!ok) { setMockOrder(null); failed('Payment cancelled (test mode).'); return; }
    setProcessing(true);
    try {
      await verify({ email: order.email, body: { razorpay_order_id: order.orderId, razorpay_payment_id: `pay_mock_${Date.now()}`, razorpay_signature: 'mock_signature', txnid: order.txnid } });
      setMockOrder(null);
    } catch (err) {
      setMockOrder(null);
      failed(`Verification failed: ${err.message}`);
    } finally { setProcessing(false); }
  };

  const applyCoupon = async (e) => {
    e?.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponBusy(true);
    setCouponError('');
    try {
      await api.validateCoupon(code, item.id);
      const q = await api.getCheckoutQuote({ itemType, itemId: item.id, couponCode: code, buyerState: form.state });
      if (!q.coupon?.applied) throw new Error(q.coupon?.message || 'This coupon cannot be used for this item.');
      setQuote(q);
      setCouponCode(code);
      setCouponOpen(false);
    } catch (err) {
      setCouponError(err.message || 'That coupon is not valid.');
    } finally { setCouponBusy(false); }
  };
  const removeCoupon = () => { setCouponCode(''); setCouponInput(''); setCouponError(''); };

  const signIn = async (e) => {
    e?.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || !password) { setSignInError('Enter your email above and your password.'); return; }
    setSignInBusy(true);
    setSignInError('');
    try {
      const data = await api.login(email, password);
      if (data?.token) localStorage.setItem('token', data.token);
      setPassword('');
      setSignInOpen(false);
      if (onRefreshUser) await onRefreshUser();
    } catch (err) {
      setSignInError(err.message || 'Could not sign you in.');
    } finally { setSignInBusy(false); }
  };

  const signOutHere = async () => {
    try { await api.logout(); } catch { localStorage.removeItem('token'); }
    if (onRefreshUser) await onRefreshUser();
    setForm((f) => ({ ...f, email: '', name: '', phone: '' }));
  };

  const includes = useMemo(() => (typeof item.includes === 'function' ? item.includes(selected) : item.includes) || [], [item, selected]);

  const fieldProps = useCallback((k) => ({
    id: `co-${k}`,
    'aria-invalid': Boolean(errors[k]) || undefined,
    'aria-describedby': errors[k] ? `co-${k}-err` : (k === 'email' || k === 'phone' ? `co-${k}-help` : undefined),
    className: `wt-input co-input${errors[k] ? ' is-invalid' : ''}${touched[k] && !errors[k] && form[k] ? ' is-valid' : ''}`,
    value: form[k],
    onChange: setField(k),
    onBlur: blur(k),
  }), [errors, touched, form]); // eslint-disable-line react-hooks/exhaustive-deps

  if (success) {
    return <PaymentSuccess kind={kind} item={item} selected={selected} success={success} user={user} onRefreshUser={onRefreshUser} />;
  }

  const payLabel = processing ? 'Opening secure payment…' : (total != null && !quoteError ? `Pay ${money(total)} securely` : 'Pay securely');
  const gst = quote?.gst;
  const wa = whatsappUrl(`Hi WideTech! I have a question before buying: ${item.title}`);

  return (
    <div className="co-page">
      <CheckoutHeader backTo={item.backTo} backLabel={item.backLabel} />
      <main id="main-content" className="co-main">
        <div className="co-container">
          <h1 className="co-title">{title || 'Checkout'}</h1>

          <div className="co-grid">
            {/* ---------- Order summary (first on mobile, right column on desktop) ---------- */}
            <aside className="co-summary" aria-labelledby="co-summary-title">
              <div className="co-card co-summary__card">
                <h2 id="co-summary-title" className="sr-only">Order summary</h2>
                <div className="co-item">
                  <div className="co-item__thumb" aria-hidden="true">
                    {item.thumb
                      ? <img src={item.thumb} alt="" width="72" height="72" loading="eager" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                      : <Icon name={item.icon || 'shopping-bag'} size={28} />}
                  </div>
                  <div className="co-item__info">
                    <span className="co-item__kind">{item.kindLabel}</span>
                    <p className="co-item__title">{item.title}</p>
                    {(selected?.name || item.metaLine) && <p className="co-item__meta">{[selected?.name !== item.title ? selected?.name : '', item.metaLine].filter(Boolean).join(' · ')}</p>}
                  </div>
                </div>

                {includes.length > 0 && (
                  <div className="co-includes">
                    <p className="co-includes__title">What's included</p>
                    <ul className="co-includes__list">
                      {includes.slice(0, 6).map((b) => <li key={b}><Icon name="check" size={16} />{b}</li>)}
                    </ul>
                  </div>
                )}

                {couponEnabled && (
                  <div className="co-coupon">
                    {couponCode ? (
                      <div className="co-coupon__applied">
                        <span><Icon name="tag" size={16} /> <strong>{couponCode}</strong> applied</span>
                        <button type="button" className="co-linkbtn" onClick={removeCoupon}>Remove</button>
                      </div>
                    ) : couponOpen ? (
                      <form className="co-coupon__form" onSubmit={applyCoupon} noValidate>
                        <label htmlFor="co-coupon" className="sr-only">Coupon code</label>
                        <input id="co-coupon" className={`wt-input co-input co-mono${couponError ? ' is-invalid' : ''}`} placeholder="Coupon code" autoComplete="off" autoCapitalize="characters" spellCheck="false"
                          value={couponInput} onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }} aria-invalid={Boolean(couponError) || undefined} aria-describedby={couponError ? 'co-coupon-err' : undefined} />
                        <button type="submit" className="wt-btn wt-btn--secondary co-coupon__apply" disabled={couponBusy || !couponInput.trim()}>{couponBusy ? 'Checking…' : 'Apply'}</button>
                        {couponError && <p className="co-error" id="co-coupon-err" role="alert">{couponError}</p>}
                      </form>
                    ) : (
                      <button type="button" className="co-linkbtn" aria-expanded="false" onClick={() => setCouponOpen(true)}><Icon name="tag" size={16} /> Have a coupon?</button>
                    )}
                  </div>
                )}

                <dl className={`co-breakdown${quoteBusy && quote ? ' is-updating' : ''}`} aria-live="polite" aria-busy={quoteBusy}>
                  {!quote && !quoteError && (
                    <>
                      <div className="co-row"><dt><span className="co-skel" /></dt><dd><span className="co-skel co-skel--sm" /></dd></div>
                      <div className="co-row"><dt><span className="co-skel" /></dt><dd><span className="co-skel co-skel--sm" /></dd></div>
                      <div className="co-row co-row--total"><dt>Total</dt><dd><span className="co-skel co-skel--md" /></dd></div>
                    </>
                  )}
                  {quoteError && !quote && <p className="co-error" role="alert">{quoteError}</p>}
                  {quote && gst && (
                    <>
                      <div className="co-row"><dt>Price</dt><dd>{money(quote.listPrice)}</dd></div>
                      {quote.itemDiscount > 0 && <div className="co-row co-row--save"><dt>Discount</dt><dd>−{money(quote.itemDiscount)}</dd></div>}
                      {quote.couponDiscount > 0 && <div className="co-row co-row--save"><dt>Coupon {quote.coupon?.code}</dt><dd>−{money(quote.couponDiscount)}</dd></div>}
                      <div className="co-row co-row--sub"><dt>Taxable value</dt><dd>{money(gst.baseAmount)}</dd></div>
                      {gst.isIntraState ? (
                        <>
                          <div className="co-row co-row--sub"><dt>CGST {gst.rate / 2}%</dt><dd>{money(gst.cgstAmount)}</dd></div>
                          <div className="co-row co-row--sub"><dt>SGST {gst.rate / 2}%</dt><dd>{money(gst.sgstAmount)}</dd></div>
                        </>
                      ) : (
                        <div className="co-row co-row--sub"><dt>IGST {gst.rate}%</dt><dd>{money(gst.igstAmount)}</dd></div>
                      )}
                      <div className="co-row co-row--total"><dt>Total</dt><dd>{money(quote.total)}</dd></div>
                      <p className="co-note">{gst.isInclusive ? `Includes ${money(gst.gstAmount)} GST.` : `${gst.rate}% GST added to the price.`} Billing state: {quote.posState}.</p>
                    </>
                  )}
                </dl>
              </div>

              <p className="co-help-line">
                Questions? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
                {wa && <> · <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a></>}
              </p>
            </aside>

            {/* ---------- Details + pay ---------- */}
            <section className="co-form-col" aria-labelledby="co-details-title">
              <form id="co-form" className="co-card co-form" noValidate onSubmit={pay}>
                {variants && variants.length > 0 && (
                  <fieldset className="co-variants">
                    <legend className="co-step"><span className="co-step__n">1</span>{kind === 'service' ? 'Choose a package' : 'Choose a plan'}</legend>
                    <div className="co-variants__list">
                      {variants.map((v) => (
                        <label key={v.id} className={`co-variant${selected?.id === v.id ? ' is-selected' : ''}`}>
                          <input type="radio" name="co-variant" value={v.id} checked={selected?.id === v.id} onChange={() => setVariantId(v.id)} />
                          <span className="co-variant__main"><strong>{v.name}</strong>{v.sub && <small>{v.sub}</small>}</span>
                          <span className="co-variant__price">{money(v.price)}{v.original > v.price ? <s>{money(v.original)}</s> : null}<small>{v.gstInclusive === false ? '+ GST' : 'incl. GST'}</small></span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                <h2 id="co-details-title" className="co-step"><span className="co-step__n">{variants?.length ? 2 : 1}</span>Your details</h2>

                {user ? (
                  <div className="co-signed">
                    <Icon name="user" size={18} />
                    <span>Signed in as <strong>{user.email}</strong></span>
                    <button type="button" className="co-linkbtn" onClick={signOutHere}>Not you?</button>
                  </div>
                ) : (
                  <p className="co-guest">No account needed. We create one for you and email your login.{' '}
                    <button type="button" className="co-linkbtn" aria-expanded={signInOpen} aria-controls="co-signin" onClick={() => { setSignInOpen((v) => !v); setSignInError(''); }}>
                      {signInOpen ? 'Continue as guest' : 'Have an account? Sign in'}
                    </button>
                  </p>
                )}

                <div className="co-fields">
                  <div className="wt-field co-field">
                    <label className="wt-label" htmlFor="co-name">Full name</label>
                    <input {...fieldProps('name')} type="text" name="name" autoComplete="name" autoCapitalize="words" enterKeyHint="next" placeholder="As it should appear on the invoice" />
                    {errors.name && <p className="co-error" id="co-name-err">{errors.name}</p>}
                  </div>

                  <div className="wt-field co-field">
                    <label className="wt-label" htmlFor="co-email">Email</label>
                    <input {...fieldProps('email')} type="email" name="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck="false" enterKeyHint="next" placeholder="you@example.com" readOnly={Boolean(user?.email)} />
                    {errors.email ? <p className="co-error" id="co-email-err">{errors.email}</p>
                      : <p className="wt-help" id="co-email-help">{kind === 'software' ? 'Your licence key and invoice are sent here.' : kind === 'service' ? 'We contact you here and send your invoice.' : 'Your access and invoice are sent here.'}</p>}
                  </div>

                  {signInOpen && !user && (
                    <div className="co-signin" id="co-signin">
                      <div className="wt-field co-field">
                        <label className="wt-label" htmlFor="co-password">Password</label>
                        <input id="co-password" className="wt-input co-input" type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setSignInError(''); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') signIn(e); }} />
                      </div>
                      {signInError && <p className="co-error" role="alert">{signInError}</p>}
                      <div className="co-signin__actions">
                        <button type="button" className="wt-btn wt-btn--secondary" onClick={signIn} disabled={signInBusy}>{signInBusy ? 'Signing in…' : 'Sign in'}</button>
                        <Link to="/auth" state={{ from: window.location.pathname + window.location.search }} className="co-linkbtn">Forgot password?</Link>
                      </div>
                    </div>
                  )}

                  <div className="wt-field co-field">
                    <label className="wt-label" htmlFor="co-phone">Mobile number</label>
                    <div className="co-phone">
                      <span className="co-phone__cc" aria-hidden="true">+91</span>
                      <input {...fieldProps('phone')} type="tel" name="tel" autoComplete="tel-national" inputMode="tel" enterKeyHint="done" placeholder="10-digit mobile number" maxLength={16} />
                    </div>
                    {errors.phone ? <p className="co-error" id="co-phone-err">{errors.phone}</p>
                      : <p className="wt-help" id="co-phone-help">Used for payment (UPI) and order updates only.</p>}
                  </div>
                </div>

                <div className={`co-gst${gstOpen ? ' is-open' : ''}`}>
                  <button type="button" className="co-gst__toggle" aria-expanded={gstOpen} aria-controls="co-gst-panel" onClick={() => setGstOpen((v) => !v)}>
                    <span><Icon name="receipt" size={18} /> Need a GST invoice?</span>
                    <span className="co-gst__hint">{gstOpen ? '' : `State: ${form.state}`}<Icon name="chevron-down" size={18} /></span>
                  </button>
                  {gstOpen && (
                    <div className="co-gst__panel" id="co-gst-panel">
                      <p className="wt-help">Every order gets a GST invoice. Add your GSTIN to claim input tax credit.</p>
                      <div className="wt-field co-field">
                        <label className="wt-label" htmlFor="co-state">State (place of supply)</label>
                        <select id="co-state" className="wt-select co-input" autoComplete="address-level1" value={form.state} onChange={setField('state')}>
                          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="wt-field co-field">
                        <label className="wt-label" htmlFor="co-gstin">GSTIN <span className="co-opt">optional</span></label>
                        <input {...fieldProps('gstin')} type="text" className={`${fieldProps('gstin').className} co-mono`} maxLength={15} autoCapitalize="characters" spellCheck="false" autoComplete="off" placeholder="e.g. 32ABCDE1234F1Z5" />
                        {errors.gstin && <p className="co-error" id="co-gstin-err">{errors.gstin}</p>}
                      </div>
                      <div className="wt-field co-field">
                        <label className="wt-label" htmlFor="co-business">Business name <span className="co-opt">optional</span></label>
                        <input id="co-business" className="wt-input co-input" type="text" autoComplete="organization" value={form.business} onChange={setField('business')} />
                      </div>
                      <div className="wt-field co-field">
                        <label className="wt-label" htmlFor="co-address">Billing address <span className="co-opt">optional</span></label>
                        <input id="co-address" className="wt-input co-input" type="text" autoComplete="street-address" value={form.address} onChange={setField('address')} />
                      </div>
                    </div>
                  )}
                </div>

                {notice && !payError && <p className="co-notice" role="status"><Icon name="info" size={18} />{notice}</p>}
                {payError && (
                  <div className="co-payerror" role="alert" ref={payErrorRef}>
                    <Icon name="alert-triangle" size={20} />
                    <div>
                      <strong>Payment didn't go through</strong>
                      <p>{payError.message}</p>
                      {payError.paymentId && <p>Payment ID: <code>{payError.paymentId}</code>. If money was debited, email <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Payment ${payError.paymentId}`)}`}>{SUPPORT_EMAIL}</a> with this ID and we will sort it out.</p>}
                      <div className="co-payerror__actions">
                        {payError.retryVerify
                          ? <button type="button" className="wt-btn wt-btn--secondary wt-btn--sm" onClick={retryVerify} disabled={processing}><Icon name="refresh" size={16} /> Check again</button>
                          : <button type="submit" className="wt-btn wt-btn--secondary wt-btn--sm" disabled={processing}><Icon name="refresh" size={16} /> Try again</button>}
                      </div>
                    </div>
                  </div>
                )}

                <div className="co-paybox">
                  <button type="submit" className="wt-btn wt-btn--primary wt-btn--lg wt-btn--block co-paybtn" disabled={processing} aria-busy={processing}>
                    {processing ? <span className="co-spinner" aria-hidden="true" /> : <Icon name="lock" size={18} />}
                    <span>{payLabel}</span>
                  </button>
                  <TrustRow kind={kind} />
                </div>

                <p className="co-legal">
                  By paying you agree to our <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a>, <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy</a> and <a href="/refund" target="_blank" rel="noopener noreferrer">Refund policy</a>.
                </p>
              </form>
            </section>
          </div>
        </div>
      </main>

      {/* Mobile: sticky pay bar (submits the same form) */}
      <div className="co-paybar" role="region" aria-label="Pay">
        <div className="co-paybar__total">
          <span>Total</span>
          <strong>{total != null && !quoteError ? money(total) : '—'}</strong>
        </div>
        <button type="submit" form="co-form" className="wt-btn wt-btn--primary co-paybar__btn" disabled={processing} aria-busy={processing}>
          {processing ? <span className="co-spinner" aria-hidden="true" /> : <Icon name="lock" size={16} />}
          <span>{processing ? 'Opening…' : 'Pay securely'}</span>
        </button>
      </div>

      {mockOrder && (
        <Suspense fallback={null}>
          <MockPaymentDialog order={mockOrder} busy={processing} onResult={mockPay} />
        </Suspense>
      )}
    </div>
  );
}

const PayChip = ({ children }) => <span className="co-paychip">{children}</span>;

/** Facts only: how the payment is processed and what happens after it. */
export function TrustRow({ kind }) {
  const after = kind === 'software' ? { icon: 'key', text: 'Licence key instantly' }
    : kind === 'service' ? { icon: 'check-circle', text: 'Order confirmed instantly' }
      : { icon: 'automation', text: 'Instant access' };
  return (
    <div className="co-trust">
      <p className="co-trust__secure"><Icon name="shield" size={16} /> Payments secured by <strong>Razorpay</strong></p>
      <div className="co-trust__methods" aria-label="Accepted payment methods">
        <PayChip>UPI</PayChip><PayChip>Cards</PayChip><PayChip>Netbanking</PayChip>
      </div>
      <ul className="co-trust__list">
        <li><Icon name={after.icon} size={16} />{after.text}</li>
        <li><Icon name="receipt" size={16} />GST invoice by email</li>
      </ul>
    </div>
  );
}
