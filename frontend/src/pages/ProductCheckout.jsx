import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import NavHeader from './NavHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import tracker from '../utils/tracker';
import { SUPPORT_EMAIL } from '../config/site';
import { previewGst, GSTIN_RE, money, billingLabel } from '../utils/gst';
import { INDIAN_STATES } from '../config/indianStates';
import './Checkout.css';
import './ProductCheckout.css';

/**
 * Guest checkout for a software licence plan (/checkout/software/:slug?plan=ID[&renew=LICENCE_ID])
 * or a paid service (/checkout/service/:slug[?package=ID]).
 * Uses the same Razorpay order + verify endpoints as course checkout; the server picks the price,
 * calculates GST and verifies the payment signature. Amounts shown here are a preview only.
 */
export default function ProductCheckout({ user, onRefreshUser, kind = 'software' }) {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isService = kind === 'service';
  const renewId = isService ? '' : (params.get('renew') || '');

  const [state, setState] = useState({ item: null, sellerState: 'Kerala', loading: true, error: '' });
  const [variantId, setVariantId] = useState(params.get(isService ? 'package' : 'plan') || '');
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', state: 'Kerala', gstin: '', address: '' });
  const [showBusiness, setShowBusiness] = useState(false);
  const [errors, setErrors] = useState({});
  const [payError, setPayError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [mockOrder, setMockOrder] = useState(null);
  const [success, setSuccess] = useState(null);
  const [copied, setCopied] = useState(false);
  const payErrorRef = useRef(null);

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name || '', email: user.email || f.email, phone: f.phone || user.phone || '' }));
  }, [user]);

  useEffect(() => {
    let alive = true;
    (isService ? api.getService(slug) : api.getSoftware(slug))
      .then((d) => {
        if (!alive) return;
        const item = isService ? d?.service : d?.software;
        setState({ item: item || null, sellerState: d?.sellerState || 'Kerala', loading: false, error: item ? '' : 'This item could not be found.' });
      })
      .catch((e) => alive && setState({ item: null, sellerState: 'Kerala', loading: false, error: /not found/i.test(e.message || '') ? 'This item could not be found.' : 'We could not load this page. Please try again.' }));
    return () => { alive = false; };
  }, [slug, isService]);

  const item = state.item;
  const options = useMemo(() => {
    if (!item) return [];
    if (isService) {
      if (item.packages?.length) return item.packages.map((p) => ({ id: String(p._id), name: p.name, price: p.price, original: p.originalPrice, gstRate: p.gstRate, gstInclusive: p.gstInclusive, sub: p.deliveryTime ? `Delivery: ${p.deliveryTime}` : '', bullets: p.deliverables || [] }));
      if (item.mainOffer) return [{ id: 'main', name: item.title, price: item.mainOffer.price, original: item.mainOffer.originalPrice, gstRate: item.mainOffer.gstRate, gstInclusive: item.mainOffer.gstInclusive, sub: 'Fixed price', bullets: item.deliverables || [] }];
      return [];
    }
    const plans = (item.plans || []).filter((p) => !renewId || p.billing !== 'lifetime');
    return plans.map((p) => ({ id: String(p._id), name: p.name, price: p.price, gstRate: p.gstRate, gstInclusive: p.gstInclusive, sub: `${billingLabel(p)} · ${p.maxDevices || 1} device${(p.maxDevices || 1) === 1 ? '' : 's'}`, bullets: p.features || [] }));
  }, [item, isService, renewId]);

  const selected = options.find((o) => o.id === variantId) || options[0] || null;
  const gst = selected ? previewGst({ price: selected.price, rate: selected.gstRate, inclusive: selected.gstInclusive, buyerState: form.state, sellerState: state.sellerState }) : null;
  const backTo = item ? `${isService ? '/services' : '/software'}/${item.slug || item._id}` : (isService ? '/services' : '/software');

  useEffect(() => {
    if (item && selected) tracker.trackCheckoutStep({ courseId: item._id, courseTitle: `${item.title} – ${selected.name}`, amount: gst?.total || 0, step: 'entered_checkout' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?._id]);

  const set = (k) => (e) => { const v = k === 'gstin' ? e.target.value.toUpperCase() : e.target.value; setForm((f) => ({ ...f, [k]: v })); if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined })); };

  const showPayError = (m) => { setPayError(m); setTimeout(() => payErrorRef.current?.focus(), 50); };

  const finish = async (res, email) => {
    if (res.token) {
      localStorage.setItem('token', res.token);
      if (onRefreshUser) await onRefreshUser();
    }
    tracker.trackCheckoutStep({ courseId: item._id, courseTitle: item.title, amount: gst?.total || 0, buyerEmail: email, step: 'payment_success' });
    setSuccess({ email, licenseKey: res.licenseKey || '', license: res.license || null, serviceOrder: res.serviceOrder || null, newlyCreated: Boolean(res.newlyCreated) });
    window.scrollTo(0, 0);
  };

  const verify = async (order, payload, email) => {
    const res = await api.verifyRazorpayPayment({ ...payload, txnid: order.txnid });
    if (!res.success) throw new Error(res.message || 'verification failed');
    await finish(res, email);
  };

  const loadRazorpay = () => new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
    return undefined;
  });

  const pay = async () => {
    const name = form.name.trim();
    const email = (user?.email || form.email).trim().toLowerCase();
    const phone = form.phone.trim();
    const gstin = form.gstin.trim();
    const errs = {};
    if (!name) errs.name = 'Please enter your name. It goes on your invoice.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = isService ? 'Please enter a valid email. We contact you here.' : 'Please enter a valid email. Your licence key is sent here.';
    if (phone.replace(/\D/g, '').length < 10) errs.phone = 'Please enter a valid mobile number (at least 10 digits).';
    if (gstin && !GSTIN_RE.test(gstin)) errs.gstin = 'That GSTIN does not look right (15 characters, e.g. 32ABCDE1234F1Z5). Leave it empty if you do not have one.';
    setErrors(errs);
    setPayError('');
    const first = ['name', 'email', 'phone', 'gstin'].find((k) => errs[k]);
    if (first) { if (first === 'gstin') setShowBusiness(true); setTimeout(() => document.getElementById(`pc-${first}`)?.focus(), 0); return; }
    if (!selected) return;

    setProcessing(true);
    tracker.trackCheckoutStep({ courseId: item._id, courseTitle: `${item.title} – ${selected.name}`, amount: gst?.total || 0, buyerName: name, buyerEmail: email, buyerPhone: phone, buyerState: form.state, step: 'initiated_payment' });
    try {
      const order = await api.createRazorpayOrder({
        itemType: isService ? 'service' : 'software',
        itemId: item._id,
        variantId: selected.id === 'main' ? undefined : selected.id,
        renewLicenseId: renewId || undefined,
        buyerName: name, buyerEmail: email, phone, buyerState: form.state, buyerGstin: gstin, buyerAddress: form.address.trim(),
      });
      if (order.isMock) {
        setMockOrder({ ...order, email });
        setProcessing(false);
        return;
      }
      if (!(await loadRazorpay())) throw new Error('The payment window could not load. Please check your internet connection.');
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'WideTech',
        description: order.itemTitle,
        order_id: order.orderId,
        prefill: order.prefill,
        notes: { txnid: order.txnid },
        theme: { color: '#4f46e5' },
        handler: async (r) => {
          setProcessing(true);
          try {
            await verify(order, { razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature }, email);
          } catch (e) {
            showPayError(`We could not confirm your payment (${e.message}). If money was debited, email us your payment ID ${r.razorpay_payment_id} and we will sort it out.`);
          } finally {
            setProcessing(false);
          }
        },
        modal: { ondismiss: () => setProcessing(false) },
      });
      rzp.on('payment.failed', (r) => {
        tracker.trackCheckoutStep({ courseId: item._id, courseTitle: item.title, amount: gst?.total || 0, buyerEmail: email, step: 'payment_failed' });
        showPayError(r.error?.description || r.error?.reason || 'The payment was declined.');
        setProcessing(false);
      });
      rzp.open();
    } catch (e) {
      showPayError(e.message || 'We could not start the payment.');
      setProcessing(false);
    }
  };

  // Test mode only (no live Razorpay keys): the server refuses mock payments in production.
  const mockPay = async (ok) => {
    const order = mockOrder;
    setProcessing(true);
    try {
      if (!ok) { setMockOrder(null); showPayError('Payment cancelled (test mode). You can try again.'); return; }
      await verify(order, { razorpay_order_id: order.orderId, razorpay_payment_id: `pay_mock_${Date.now()}`, razorpay_signature: 'mock_signature' }, order.email);
      setMockOrder(null);
    } catch (e) {
      setMockOrder(null);
      showPayError(`Verification failed: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const copyKey = async () => {
    try { await navigator.clipboard.writeText(success.licenseKey); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* clipboard blocked */ }
  };

  if (state.loading) return <><NavHeader user={user} /><LoadingSpinner /></>;

  if (!item || !options.length || (isService && item.purchaseMode === 'quote')) {
    return (
      <>
        <NavHeader user={user} />
        <div className="checkout-page">
          <div className="checkout-success glass-card" role="alert">
            <h1>Checkout unavailable</h1>
            <p>{state.error || (isService ? 'This service is priced by quote. Please send us your requirements instead.' : 'This product cannot be bought online yet.')}</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate(backTo)}>Back</button>
          </div>
        </div>
      </>
    );
  }

  if (success) {
    const exp = success.license?.expiresAt ? new Date(success.license.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : null;
    return (
      <>
        <NavHeader user={user} />
        <div className="checkout-page">
          <div className="checkout-success glass-card pc-success" role="status" aria-live="polite">
            <div className="checkout-success-icon" aria-hidden="true">✅</div>
            <h1>Payment successful</h1>
            {success.licenseKey ? (
              <>
                <p>{success.license?.renewed ? 'Your licence has been renewed.' : 'Your licence key for'} <strong>{item.title}</strong>{success.license?.plan ? ` (${success.license.plan})` : ''}{success.license?.renewed ? '' : ' is ready.'}</p>
                <div className="pc-key" aria-label="Your licence key">
                  <code>{success.licenseKey}</code>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={copyKey}>{copied ? 'Copied' : 'Copy key'}</button>
                </div>
                <ul className="checkout-success-steps">
                  <li>🔑 Open {item.title}, choose <strong>Enter licence key</strong> and paste this key.</li>
                  <li>💻 Works on {success.license?.maxDevices || 1} device{(success.license?.maxDevices || 1) === 1 ? '' : 's'}. {exp ? `Valid until ${exp}.` : 'Lifetime licence.'}</li>
                  <li>📬 We emailed the key and your GST invoice to <strong>{success.email}</strong>.{success.newlyCreated ? ' Your new account login details are in the same inbox.' : ''}</li>
                  <li>📂 The key is always in your dashboard under <strong>My software</strong>.</li>
                </ul>
              </>
            ) : (
              <>
                <p>Thank you for buying <strong>{item.title}</strong>{success.serviceOrder?.packageName ? ` (${success.serviceOrder.packageName})` : ''}.</p>
                {success.serviceOrder?.orderNo && <p className="pc-orderno">Order number: <strong>{success.serviceOrder.orderNo}</strong></p>}
                <ul className="checkout-success-steps">
                  <li>📞 We'll contact you at <strong>{success.email}</strong> to schedule the work.</li>
                  {success.serviceOrder?.deliveryTime && <li>⏱️ Delivery time: {success.serviceOrder.deliveryTime} after we have what we need from you.</li>}
                  <li>🧾 Your GST invoice has been emailed.{success.newlyCreated ? ' Your new account login details are in the same inbox.' : ''}</li>
                </ul>
              </>
            )}
            <p className="pc-help">Questions? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
            <button type="button" className="btn btn-primary btn-lg checkout-success-cta" onClick={() => navigate('/dashboard')}>Go to my dashboard →</button>
          </div>
        </div>
      </>
    );
  }

  const fc = (k) => `checkout-input${errors[k] ? ' has-error' : ''}`;
  const err = (k) => (errors[k] ? <p className="checkout-error" id={`pc-${k}-err`}>{errors[k]}</p> : null);

  return (
    <>
      <NavHeader user={user} />
      <div className="checkout-page">
        <div className="checkout-container">
          <p className="pc-back"><Link to={backTo}>← Back to {item.title}</Link></p>
          <div className="checkout-grid">
            <section className="glass-card checkout-main" aria-labelledby="pc-title">
              <h1 id="pc-title" className="checkout-title">{renewId ? 'Renew your licence' : isService ? 'Book this service' : 'Buy a licence'}</h1>

              <fieldset className="pc-options">
                <legend className="pc-legend">{item.title}: choose {isService ? 'a package' : 'a plan'}</legend>
                {options.map((o) => (
                  <label key={o.id} className={`pc-option${selected?.id === o.id ? ' is-selected' : ''}`}>
                    <input type="radio" name="pc-variant" value={o.id} checked={selected?.id === o.id} onChange={() => setVariantId(o.id)} />
                    <span className="pc-option-main"><strong>{o.name}</strong>{o.sub && <small>{o.sub}</small>}</span>
                    <span className="pc-option-price">
                      {money(o.price)}{o.original ? <s>{money(o.original)}</s> : null}
                      <small>{o.gstInclusive === false ? '+ GST' : 'incl. GST'}</small>
                    </span>
                  </label>
                ))}
              </fieldset>

              {!user ? (
                <div className="checkout-guest-note">
                  <span><strong>No account needed.</strong> We'll create one and email your login details.</span>
                  <button type="button" className="link-button" onClick={() => navigate('/auth', { state: { from: window.location.pathname + window.location.search } })}>Already have an account? Sign in</button>
                </div>
              ) : <div className="checkout-user-note">👤 Signed in as {user.name} ({user.email})</div>}

              <form className="checkout-form" noValidate onSubmit={(e) => { e.preventDefault(); pay(); }}>
                <div className="checkout-field">
                  <label htmlFor="pc-name">Full name <span aria-hidden="true">*</span></label>
                  <input id="pc-name" className={fc('name')} autoComplete="name" value={form.name} onChange={set('name')} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'pc-name-err' : undefined} />
                  {err('name')}
                </div>
                <div className="checkout-field">
                  <label htmlFor="pc-email">Email <span aria-hidden="true">*</span></label>
                  <input id="pc-email" type="email" className={fc('email')} autoComplete="email" inputMode="email" value={user?.email || form.email} onChange={set('email')} disabled={Boolean(user?.email)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'pc-email-err' : 'pc-email-help'} />
                  {errors.email ? err('email') : <p className="checkout-help" id="pc-email-help">{isService ? 'We contact you here to schedule the work.' : 'Your licence key and invoice are sent here.'}</p>}
                </div>
                <div className="checkout-field">
                  <label htmlFor="pc-phone">Mobile number <span aria-hidden="true">*</span></label>
                  <input id="pc-phone" type="tel" className={fc('phone')} autoComplete="tel" inputMode="tel" value={form.phone} onChange={set('phone')} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'pc-phone-err' : undefined} />
                  {err('phone')}
                </div>
                <div className="checkout-field">
                  <label htmlFor="pc-state">Your state <span className="checkout-label-hint">(for the GST invoice)</span></label>
                  <select id="pc-state" className="checkout-input" autoComplete="address-level1" value={form.state} onChange={set('state')}>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <button type="button" className="link-button checkout-toggle" aria-expanded={showBusiness} aria-controls="pc-business" onClick={() => setShowBusiness((v) => !v)}>
                  {showBusiness ? '− Hide business invoice details' : '+ Need a business (B2B) GST invoice? Add GSTIN & address'}
                </button>
                {showBusiness && (
                  <div id="pc-business" className="checkout-business">
                    <div className="checkout-field">
                      <label htmlFor="pc-gstin">GSTIN <span className="checkout-label-hint">(optional, printed on the invoice)</span></label>
                      <input id="pc-gstin" className={`${fc('gstin')} checkout-mono`} value={form.gstin} onChange={set('gstin')} maxLength={15} placeholder="e.g. 32ABCDE1234F1Z5" aria-invalid={Boolean(errors.gstin)} aria-describedby={errors.gstin ? 'pc-gstin-err' : undefined} />
                      {err('gstin')}
                    </div>
                    <div className="checkout-field">
                      <label htmlFor="pc-address">Billing address <span className="checkout-label-hint">(optional)</span></label>
                      <input id="pc-address" className="checkout-input" autoComplete="street-address" value={form.address} onChange={set('address')} />
                    </div>
                  </div>
                )}

                {gst && (
                  <div className="checkout-summary" aria-live="polite">
                    <div className="checkout-summary-row"><span>{selected.name}{gst.isInclusive ? '' : ' (price before GST)'}</span><span>{money(gst.isInclusive ? selected.price : gst.baseAmount)}</span></div>
                    <div className="checkout-summary-row"><span>Taxable value</span><span>{money(gst.baseAmount)}</span></div>
                    {gst.isIntraState ? (
                      <>
                        <div className="checkout-summary-row"><span>CGST ({gst.rate / 2}%)</span><span>{money(gst.cgstAmount)}</span></div>
                        <div className="checkout-summary-row"><span>SGST ({gst.rate / 2}%)</span><span>{money(gst.sgstAmount)}</span></div>
                      </>
                    ) : (
                      <div className="checkout-summary-row"><span>IGST ({gst.rate}%)</span><span>{money(gst.igstAmount)}</span></div>
                    )}
                    <div className="checkout-summary-row checkout-total"><span>Total to pay</span><span>{money(gst.total)}</span></div>
                    <p className="checkout-help">{gst.isInclusive ? 'GST is already included in the price.' : 'GST is added to the price.'} The final amount is confirmed on the secure payment screen.</p>
                  </div>
                )}

                {payError && (
                  <div className="checkout-pay-error" role="alert" ref={payErrorRef} tabIndex={-1}>
                    <strong>Payment didn't go through.</strong> {payError}
                    <span className="checkout-pay-error-help">No money is taken for a failed payment. Try again, or email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</span>
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-lg checkout-pay-btn" disabled={processing} aria-busy={processing}>
                  {processing ? 'Opening secure payment…' : `🔒 Pay ${money(gst?.total)} securely`}
                </button>
                <ul className="checkout-trust" aria-label="What happens next">
                  <li>🔒 Secure payment by Razorpay: UPI, cards, net banking</li>
                  <li>🧾 GST invoice emailed automatically</li>
                  <li>{isService ? '📞 We contact you to schedule the work' : '🔑 Licence key shown right after payment and emailed to you'}</li>
                </ul>
                <p className="checkout-legal">
                  By paying you agree to our <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a>, <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> and <a href="/refund" target="_blank" rel="noopener noreferrer">Refund Policy</a>.
                </p>
              </form>
            </section>

            <aside className="glass-card checkout-side" aria-labelledby="pc-side-title">
              <h2 id="pc-side-title" className="checkout-side-title">What you get</h2>
              <ul className="checkout-benefits">
                {(selected?.bullets || []).map((b) => <li key={b}>✓ {b}</li>)}
                {!isService && <li>✓ {selected?.sub}</li>}
                {!isService && item.trialEnabled && !renewId && <li>✓ Not sure yet? The app includes a free {item.trialDays || 7}-day trial.</li>}
              </ul>
              <p className="checkout-side-help">Questions before paying? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
            </aside>
          </div>
        </div>
      </div>

      {mockOrder && (
        <div className="pc-modal" role="dialog" aria-modal="true" aria-labelledby="pc-mock-title">
          <div className="pc-modal-card">
            <h2 id="pc-mock-title">💳 Test payment</h2>
            <p>Test mode: no live payment keys are configured, so no money moves.</p>
            <dl>
              <div><dt>Amount</dt><dd>{money(mockOrder.amount / 100)}</dd></div>
              <div><dt>Item</dt><dd>{mockOrder.itemTitle}</dd></div>
              <div><dt>Transaction</dt><dd><code>{mockOrder.txnid}</code></dd></div>
            </dl>
            <div className="pc-modal-actions">
              <button type="button" className="btn btn-primary" disabled={processing} onClick={() => mockPay(true)}>✅ Simulate success</button>
              <button type="button" className="btn btn-secondary" disabled={processing} onClick={() => mockPay(false)}>❌ Simulate failure</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
