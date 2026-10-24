import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import NavHeader from './NavHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { getMediaUrl, FALLBACK_COURSE_THUMBNAIL } from '../utils/media';
import tracker from '../utils/tracker';
import { countChapters, SUPPORT_EMAIL } from '../config/site';
import { previewGst, money } from '../utils/gst';
import './Checkout.css';
import { toast } from '../components/Toast';

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal'
];

export default function Checkout({ user, onRefreshUser }) {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [itemType, setItemType] = useState('course');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discountType, discountValue, message }
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Buyer & Billing Details state
  const [buyerName, setBuyerName] = useState(user?.name || '');
  const [buyerEmail, setBuyerEmail] = useState(user?.email || '');
  const [buyerPhone, setBuyerPhone] = useState(user?.phone || '');
  const [buyerState, setBuyerState] = useState('Kerala');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerGstin, setBuyerGstin] = useState('');

  // UX state: inline errors instead of alert(), collapsed optional sections, success screen
  const [formErrors, setFormErrors] = useState({});
  const [payError, setPayError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [showBusinessFields, setShowBusinessFields] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null); // { email, newlyCreated }
  const payErrorRef = useRef(null);
  const clearFieldError = (name) => setFormErrors(prev => (prev[name] ? { ...prev, [name]: undefined } : prev));

  // Keep state synced when user prop updates
  useEffect(() => {
    if (user) {
      if (!buyerName) setBuyerName(user.name || '');
      if (!buyerEmail) setBuyerEmail(user.email || '');
      if (!buyerPhone && user.phone) setBuyerPhone(user.phone);
    }
  }, [user]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchItem = async () => {
      try {
        // Try to fetch as course first
        try {
          const course = await api.getCourse(id);
          if (course) {
            setItem(course);
            setItemType('course');
          }
        } catch (err) {
          // If not a course, try as event
          try {
            const event = await api.getEvent(id);
            if (event) {
              setItem(event);
              setItemType('event');
            }
          } catch (err2) {
            // Previously: alert() + redirect to /dashboard, which bounced guests to the login page
            console.error('Item not found:', err2);
            setLoadError(err?.message && !/not found/i.test(err.message)
              ? 'We could not load this course right now. Please check your connection and try again.'
              : 'This course could not be found. It may have been moved or is no longer on sale.');
          }
        }
      } catch (err) {
        console.error('Error fetching item:', err);
        setLoadError('We could not load this course right now. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id, navigate]);

  // Compute final price
  const basePrice = item?.discountedPrice && item.discountedPrice < item.price
    ? item.discountedPrice
    : item?.price;

  const finalPrice = appliedCoupon
    ? appliedCoupon.discountType === 'percentage'
      ? Math.round(basePrice * (1 - appliedCoupon.discountValue / 100))
      : Math.max(0, basePrice - appliedCoupon.discountValue)
    : basePrice;

  // Track checkout step 1: entered checkout
  useEffect(() => {
    if (item) {
      tracker.trackCheckoutStep({
        courseId: id,
        courseTitle: item.title,
        amount: finalPrice || item.price || 0,
        buyerName,
        buyerEmail,
        buyerPhone,
        buyerState,
        step: 'entered_checkout'
      });
    }
  }, [item?.title]);

  // Track checkout step 2: filled contact info (debounced)
  useEffect(() => {
    if (!item) return;
    if (!buyerName && !buyerEmail && !buyerPhone) return;

    const timer = setTimeout(() => {
      tracker.trackCheckoutStep({
        courseId: id,
        courseTitle: item.title,
        amount: finalPrice || item.price || 0,
        buyerName,
        buyerEmail,
        buyerPhone,
        buyerState,
        step: 'filled_contact'
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [buyerName, buyerEmail, buyerPhone, buyerState, item?.title, finalPrice]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const showPayError = (message) => {
    setPayError(message);
    // Bring the message into view (the pay button can be far down on mobile)
    setTimeout(() => payErrorRef.current?.focus(), 50);
  };

  // Clear success screen replacing the old alert(): tells the buyer where their access and
  // login details are, then opens the course automatically.
  const showSuccess = (email, newlyCreated) => {
    setSuccessInfo({ email, newlyCreated: Boolean(newlyCreated) });
    window.scrollTo(0, 0);
    setTimeout(() => navigate(`/course/${id}`), 4000);
  };

  const handlePayment = async () => {
    const cleanName = (buyerName || user?.name || '').trim();
    const cleanEmail = (buyerEmail || user?.email || '').toLowerCase().trim();
    const cleanPhone = (buyerPhone || user?.phone || '').trim();

    const errors = {};
    if (!cleanName) errors.name = 'Please enter your name — it goes on your invoice.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) errors.email = 'Please enter a valid email — your access details are sent here.';
    if (cleanPhone.replace(/\D/g, '').length < 10) errors.phone = 'Please enter a valid mobile number (at least 10 digits).';
    setFormErrors(errors);
    setPayError('');
    const firstInvalid = ['name', 'email', 'phone'].find(k => errors[k]);
    if (firstInvalid) {
      const el = document.getElementById(`co-${firstInvalid}`);
      if (el) el.focus();
      return;
    }

    setProcessing(true);
    // Track checkout step 3: initiated payment
    tracker.trackCheckoutStep({
      courseId: id,
      courseTitle: item?.title,
      amount: finalPrice || item?.price || 0,
      buyerName: cleanName,
      buyerEmail: cleanEmail,
      buyerPhone: cleanPhone,
      buyerState,
      step: 'initiated_payment'
    });

    try {
      const orderPayload = {
        itemId: id,
        itemType,
        couponCode: appliedCoupon?.code || null,
        buyerName: cleanName,
        buyerEmail: cleanEmail,
        buyerAddress,
        buyerState,
        buyerGstin,
        phone: cleanPhone
      };

      const orderData = await api.createRazorpayOrder(orderPayload);
      setPaymentData(orderData);

      if (orderData.isMock) {
        // Mock mode (when running locally without live credentials)
        setShowPaymentModal(true);
        setProcessing(false);
      } else {
        // Load official Razorpay checkout script
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
        }

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'WideTechnos Academy',
          description: orderData.itemTitle || 'Course Purchase',
          image: '/favicon.ico',
          order_id: orderData.orderId,
          handler: async function (response) {
            try {
              setProcessing(true);
              const verifyRes = await api.verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                txnid: orderData.txnid
              });

              if (verifyRes.success) {
                if (verifyRes.token) {
                  localStorage.setItem('token', verifyRes.token);
                  if (onRefreshUser) await onRefreshUser();
                }
                showSuccess(cleanEmail, verifyRes.newlyCreated);
              } else {
                showPayError(`We could not confirm your payment (${verifyRes.message || 'verification failed'}). If money was debited, email us your payment ID ${response.razorpay_payment_id} and we will enrol you.`);
              }
            } catch (vErr) {
              console.error('Verification error:', vErr);
              showPayError(`${vErr.message || 'We could not confirm your payment.'} If money was debited, email us your payment ID ${response.razorpay_payment_id} and we will enrol you.`);
            } finally {
              setProcessing(false);
            }
          },
          prefill: orderData.prefill || {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || ''
          },
          notes: {
            txnid: orderData.txnid,
            itemId: id
          },
          theme: {
            color: '#4f46e5'
          },
          modal: {
            ondismiss: function () {
              setProcessing(false);
            }
          }
        };

        const razorpayInstance = new window.Razorpay(options);
        razorpayInstance.on('payment.failed', function (response) {
          tracker.trackCheckoutStep({
            courseId: id,
            courseTitle: item?.title,
            amount: finalPrice || item?.price || 0,
            buyerName: cleanName,
            buyerEmail: cleanEmail,
            buyerPhone: cleanPhone,
            buyerState,
            step: 'payment_failed'
          });
          console.error('Razorpay payment failed:', response.error);
          showPayError(response.error?.description || response.error?.reason || 'The payment was declined.');
          setProcessing(false);
        });
        razorpayInstance.open();
      }
    } catch (err) {
      console.error('Payment initiation error:', err);
      showPayError(err.message || 'We could not start the payment.');
      setProcessing(false);
    }
  };

  const handleMockPayment = async (status) => {
    setProcessing(true);
    try {
      if (status === 'success') {
        const verifyRes = await api.verifyRazorpayPayment({
          razorpay_order_id: paymentData.orderId,
          razorpay_payment_id: 'pay_mock_' + Date.now(),
          razorpay_signature: 'mock_signature',
          txnid: paymentData.txnid
        });

        if (verifyRes.success) {
          setPaymentStatus('success');
          if (verifyRes.token) {
            localStorage.setItem('token', verifyRes.token);
            if (onRefreshUser) await onRefreshUser();
          }
          setShowPaymentModal(false);
          showSuccess((buyerEmail || user?.email || '').toLowerCase().trim(), verifyRes.newlyCreated);
        } else {
          setShowPaymentModal(false);
          showPayError('Verification failed: ' + (verifyRes.message || 'unknown error'));
        }
      } else {
        setPaymentStatus('failed');
        setShowPaymentModal(false);
        showPayError('Payment cancelled (test mode). You can try again.');
      }
    } catch (err) {
      console.error('Mock payment error:', err);
      setShowPaymentModal(false);
      showPayError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    if (onRefreshUser) onRefreshUser();
    navigate('/');
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setAppliedCoupon(null);
    try {
      const result = await api.validateCoupon(couponInput.trim(), id);
      setAppliedCoupon({ code: couponInput.trim().toUpperCase(), ...result });
    } catch (err) {
      setCouponError(err.message || 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  };

  if (loading) {
    return (
      <>
        <NavHeader user={user} onLogout={handleLogout} />
        <LoadingSpinner />
      </>
    );
  }

  if (!item) {
    return (
      <>
        <NavHeader user={user} onLogout={handleLogout} />
        <div className="container" style={{ padding: '2rem 0' }}>
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }} role="alert">
            <h2>Checkout unavailable</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0.75rem 0 1.5rem' }}>
              {loadError || 'This course could not be found.'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => window.location.reload()}>Try again</button>
              <button className="btn btn-secondary" onClick={() => navigate('/all-courses')}>See all courses</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const isFree = item.price === 0 || item.isFree;

  if (isFree) {
    // Redirect to free enrollment
    return (
      <>
        <NavHeader user={user} onLogout={handleLogout} />
        <div className="container" style={{ padding: '2rem 0' }}>
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <h2>This is a free item!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              You can enroll for free right now.
            </p>
            <button 
              className="btn btn-primary" 
              onClick={async () => {
                try {
                  await api.enrollFree(id);
                  if (onRefreshUser) onRefreshUser();
                  navigate('/dashboard');
                } catch (err) {
                  toast.error(err.message);
                }
              }}
            >
              Enroll Now - Free
            </button>
          </div>
        </div>
      </>
    );
  }

  // Display only: the server recalculates GST when the order is created.
  const gstPreview = previewGst({ price: finalPrice, rate: item.gstRate ?? undefined, inclusive: item.gstInclusive !== false, buyerState, sellerState: 'Kerala' });
  const taxableBase = gstPreview.baseAmount;
  const gstTotal = gstPreview.gstAmount;
  const isIntraState = gstPreview.isIntraState;
  const cgst = gstPreview.cgstAmount;
  const sgst = gstPreview.sgstAmount;
  const gstRateShown = gstPreview.rate;
  const totalToPay = gstPreview.isInclusive ? finalPrice : gstPreview.total;
  const listPrice = Number(item.price) || 0;
  const savings = listPrice > finalPrice ? listPrice - finalPrice : 0;
  const chapterCount = countChapters(item);
  const outcomes = (item.outcomes || []).filter(Boolean).slice(0, 5);

  if (successInfo) {
    return (
      <>
        <NavHeader user={user} onLogout={handleLogout} />
        <div className="checkout-page">
          <div className="checkout-success glass-card" role="status" aria-live="polite">
            <div className="checkout-success-icon" aria-hidden="true">🎉</div>
            <h1>Payment successful — you're in!</h1>
            <p>
              You now have access to <strong>{item.title}</strong>.
            </p>
            <ul className="checkout-success-steps">
              {successInfo.newlyCreated ? (
                <li>📬 We created your account for <strong>{successInfo.email}</strong> and emailed your login password and GST invoice.</li>
              ) : (
                <li>📬 Your receipt and GST invoice have been emailed to <strong>{successInfo.email}</strong>.</li>
              )}
              <li>📚 The course is always available in your dashboard.</li>
              <li>❓ Trouble accessing it? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</li>
            </ul>
            <button type="button" className="btn btn-primary btn-lg checkout-success-cta" onClick={() => navigate(`/course/${id}`)}>
              {itemType === 'course' ? 'Open my course →' : 'Go to my dashboard →'}
            </button>
            <p className="checkout-success-note">Opening it for you automatically…</p>
          </div>
        </div>
      </>
    );
  }

  const fieldClass = (name) => `checkout-input${formErrors[name] ? ' has-error' : ''}`;

  return (
    <>
      <NavHeader user={user} onLogout={handleLogout} />
      <div className="checkout-page">
        <div className="checkout-container">
        <div className="checkout-grid">
          {/* Left: details + pay */}
          <section className="glass-card checkout-main" aria-labelledby="checkout-title">
            <h1 id="checkout-title" className="checkout-title">Complete your purchase</h1>

            <div className="checkout-item">
              <img
                className="checkout-item-thumb"
                src={getMediaUrl(item.thumbnail) || FALLBACK_COURSE_THUMBNAIL}
                alt=""
                width="80"
                height="80"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = FALLBACK_COURSE_THUMBNAIL;
                }}
              />
              <div className="checkout-item-info">
                <h2 className="checkout-item-title">{item.title}</h2>
                <p className="checkout-item-meta">
                  {itemType === 'course' ? '📚 Course' : '📅 Live event'}
                  {chapterCount > 0 && ` · ${chapterCount} module${chapterCount === 1 ? '' : 's'}`}
                  {item.languages?.length > 0 && ` · ${item.languages.join(', ')}`}
                </p>
              </div>
              <div className="checkout-item-price">
                <strong>₹{finalPrice}</strong>
                {savings > 0 && <s>₹{listPrice}</s>}
              </div>
            </div>
            <p className="checkout-price-note">
              {gstPreview.isInclusive
                ? `✅ Final price — ${gstRateShown}% GST already included. No extra charges at payment.`
                : `Price before GST. ${gstRateShown}% GST is added at checkout (see the total below).`}
            </p>

            {!user ? (
              <div className="checkout-guest-note">
                <span><strong>No account needed.</strong> We'll create one and email your login details.</span>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => navigate('/auth', { state: { from: `/checkout/${id}` } })}
                >
                  Already have an account? Sign in
                </button>
              </div>
            ) : (
              <div className="checkout-user-note">👤 Signed in as {user.name} ({user.email})</div>
            )}

            <form
              className="checkout-form"
              noValidate
              onSubmit={(e) => { e.preventDefault(); handlePayment(); }}
            >
              <div className="checkout-field">
                <label htmlFor="co-name">Full name <span aria-hidden="true">*</span></label>
                <input
                  id="co-name"
                  type="text"
                  autoComplete="name"
                  className={fieldClass('name')}
                  value={buyerName}
                  onChange={e => { setBuyerName(e.target.value); clearFieldError('name'); }}
                  placeholder="Your full name"
                  aria-invalid={Boolean(formErrors.name)}
                  aria-describedby={formErrors.name ? 'co-name-err' : undefined}
                />
                {formErrors.name && <p className="checkout-error" id="co-name-err">{formErrors.name}</p>}
              </div>

              <div className="checkout-field">
                <label htmlFor="co-email">Email <span aria-hidden="true">*</span></label>
                <input
                  id="co-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className={fieldClass('email')}
                  value={buyerEmail}
                  onChange={e => { setBuyerEmail(e.target.value); clearFieldError('email'); }}
                  placeholder="you@example.com"
                  disabled={Boolean(user?.email)}
                  aria-invalid={Boolean(formErrors.email)}
                  aria-describedby={formErrors.email ? 'co-email-err' : 'co-email-help'}
                />
                {formErrors.email
                  ? <p className="checkout-error" id="co-email-err">{formErrors.email}</p>
                  : <p className="checkout-help" id="co-email-help">Your access, login details and invoice are sent here.</p>}
              </div>

              <div className="checkout-field">
                <label htmlFor="co-phone">Mobile number <span aria-hidden="true">*</span></label>
                <input
                  id="co-phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  className={fieldClass('phone')}
                  value={buyerPhone}
                  onChange={e => { setBuyerPhone(e.target.value); clearFieldError('phone'); }}
                  placeholder="10-digit mobile number"
                  aria-invalid={Boolean(formErrors.phone)}
                  aria-describedby={formErrors.phone ? 'co-phone-err' : 'co-phone-help'}
                />
                {formErrors.phone
                  ? <p className="checkout-error" id="co-phone-err">{formErrors.phone}</p>
                  : <p className="checkout-help" id="co-phone-help">Needed by Razorpay for UPI / card payment.</p>}
              </div>

              <div className="checkout-field">
                <label htmlFor="co-state">Your state <span className="checkout-label-hint">(for the GST invoice)</span></label>
                <select
                  id="co-state"
                  className="checkout-input"
                  autoComplete="address-level1"
                  value={buyerState}
                  onChange={e => setBuyerState(e.target.value)}
                >
                  {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>

              {/* Optional business-invoice fields: hidden by default so most buyers see 4 fields only */}
              <button
                type="button"
                className="link-button checkout-toggle"
                aria-expanded={showBusinessFields}
                aria-controls="co-business"
                onClick={() => setShowBusinessFields(v => !v)}
              >
                {showBusinessFields ? '− Hide business invoice details' : '+ Need a business (B2B) GST invoice? Add GSTIN & address'}
              </button>
              {showBusinessFields && (
                <div id="co-business" className="checkout-business">
                  <div className="checkout-field">
                    <label htmlFor="co-gstin">GSTIN <span className="checkout-label-hint">(optional)</span></label>
                    <input
                      id="co-gstin"
                      type="text"
                      className="checkout-input checkout-mono"
                      value={buyerGstin}
                      onChange={e => setBuyerGstin(e.target.value.toUpperCase())}
                      placeholder="e.g. 33AAAAA0000A1Z5"
                    />
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="co-address">Billing address <span className="checkout-label-hint">(optional)</span></label>
                    <input
                      id="co-address"
                      type="text"
                      autoComplete="street-address"
                      className="checkout-input"
                      value={buyerAddress}
                      onChange={e => setBuyerAddress(e.target.value)}
                      placeholder="House / street / locality"
                    />
                  </div>
                </div>
              )}

              {/* Coupon: collapsed so buyers without a code are not sent off searching for one */}
              {appliedCoupon ? (
                <div className="checkout-coupon-applied">
                  <span>✅ {appliedCoupon.code} applied{appliedCoupon.message ? ` — ${appliedCoupon.message}` : ''}</span>
                  <button type="button" className="link-button" onClick={removeCoupon}>Remove</button>
                </div>
              ) : showCoupon ? (
                <div className="checkout-coupon">
                  <label htmlFor="co-coupon" className="sr-only">Coupon code</label>
                  <input
                    id="co-coupon"
                    type="text"
                    className={`checkout-input checkout-mono${couponError ? ' has-error' : ''}`}
                    placeholder="Coupon code"
                    value={couponInput}
                    onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    className="btn btn-secondary btn-sm"
                  >
                    {couponLoading ? '…' : 'Apply'}
                  </button>
                  {couponError && <p className="checkout-error checkout-coupon-error">{couponError}</p>}
                </div>
              ) : (
                <button type="button" className="link-button checkout-toggle" onClick={() => setShowCoupon(true)}>
                  Have a coupon code?
                </button>
              )}

              <div className="checkout-summary">
                {savings > 0 && (
                  <div className="checkout-summary-row">
                    <span>Price</span>
                    <span><s>₹{listPrice}</s></span>
                  </div>
                )}
                {item.discountedPrice && item.discountedPrice < item.price && (
                  <div className="checkout-summary-row checkout-saving">
                    <span>Discount</span>
                    <span>−₹{item.price - item.discountedPrice}</span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="checkout-summary-row checkout-saving">
                    <span>Coupon ({appliedCoupon.code})</span>
                    <span>−₹{basePrice - finalPrice}</span>
                  </div>
                )}
                <div className="checkout-summary-row checkout-total">
                  <span>Total to pay</span>
                  <span>₹{totalToPay}</span>
                </div>
                <details className="checkout-gst">
                  <summary>{gstPreview.isInclusive ? 'Includes' : 'Adds'} ₹{gstTotal.toFixed(2)} GST — see breakdown</summary>
                  <div className="checkout-summary-row"><span>Taxable value</span><span>₹{taxableBase.toFixed(2)}</span></div>
                  {isIntraState ? (
                    <>
                      <div className="checkout-summary-row"><span>CGST ({gstRateShown / 2}%)</span><span>₹{cgst.toFixed(2)}</span></div>
                      <div className="checkout-summary-row"><span>SGST ({gstRateShown / 2}%)</span><span>₹{sgst.toFixed(2)}</span></div>
                    </>
                  ) : (
                    <div className="checkout-summary-row"><span>IGST ({gstRateShown}%)</span><span>₹{gstTotal.toFixed(2)}</span></div>
                  )}
                </details>
              </div>

              {payError && (
                <div className="checkout-pay-error" role="alert" ref={payErrorRef} tabIndex={-1}>
                  <strong>Payment didn't go through.</strong> {payError}
                  <span className="checkout-pay-error-help">
                    No money is taken for a failed payment. Try again, or email{' '}
                    <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if it keeps failing.
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg checkout-pay-btn"
                disabled={processing}
                aria-busy={processing}
              >
                {processing ? 'Opening secure payment…' : `🔒 Pay ₹${totalToPay} securely`}
              </button>

              <ul className="checkout-trust" aria-label="Purchase guarantees">
                <li>⚡ Instant access right after payment</li>
                <li>🔒 Secure payment by Razorpay — UPI, GPay, cards, net banking</li>
                <li>🧾 GST invoice emailed automatically</li>
                <li>♾️ Lifetime access from your dashboard</li>
              </ul>

              <p className="checkout-legal">
                By paying you agree to our{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a>,{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> and{' '}
                <a href="/refund" target="_blank" rel="noopener noreferrer">Refund Policy</a>.
              </p>
            </form>
          </section>

          {/* Right: what the buyer gets — built from the item's own data, no generic claims */}
          <aside className="glass-card checkout-side" aria-labelledby="checkout-side-title">
            <h2 id="checkout-side-title" className="checkout-side-title">What you get</h2>
            <ul className="checkout-benefits">
              {itemType === 'course' ? (
                <>
                  {outcomes.map((o) => <li key={o}>✓ {o}</li>)}
                  {chapterCount > 0 && <li>✓ {chapterCount} module{chapterCount === 1 ? '' : 's'} you can go through at your own pace</li>}
                  {item.languages?.length > 0 && <li>✓ Language: {item.languages.join(', ')}</li>}
                  {item.duration && <li>✓ {item.duration} of content</li>}
                  <li>✓ Lifetime access, including future updates</li>
                </>
              ) : (
                <>
                  <li>✓ Live interactive session</li>
                  {item.dateTime && <li>✓ {new Date(item.dateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</li>}
                  <li>✓ Meeting link provided after registration</li>
                  {item.duration && <li>✓ Duration: {item.duration}</li>}
                </>
              )}
            </ul>
            <p className="checkout-side-help">
              Questions before paying?{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>
          </aside>
        </div>
          {/* Payment Modal (Mock Mode) */}
          {showPaymentModal && (
            <div className="modal-overlay" style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem'
            }} onClick={() => !processing && setShowPaymentModal(false)}>
              <div className="modal-content" style={{ 
                background: 'var(--background-white)',
                borderRadius: 'var(--radius-lg)',
                maxWidth: '450px',
                width: '100%',
                padding: '2rem',
                position: 'relative',
                textAlign: 'center'
              }} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ marginBottom: '0.5rem' }}>💳 Test Payment</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  This is a mock payment for testing purposes.
                </p>

                <div style={{ 
                  padding: '1rem',
                  background: 'var(--background)',
                  borderRadius: 'var(--radius)',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Amount</span>
                    {/* Razorpay order amounts are in paise; show rupees. */}
                    <span style={{ fontWeight: 'bold' }}>{money((paymentData?.amount || 0) / 100)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Item</span>
                    <span>{paymentData?.itemTitle || paymentData?.productinfo}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Transaction ID</span>
                    <span style={{ fontSize: '0.8rem' }}>{paymentData?.txnid}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleMockPayment('success')}
                    disabled={processing}
                    style={{ minWidth: '120px' }}
                  >
                    ✅ Success
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleMockPayment('failure')}
                    disabled={processing}
                    style={{ minWidth: '120px' }}
                  >
                    ❌ Failure
                  </button>
                </div>

                <button 
                  onClick={() => !processing && setShowPaymentModal(false)}
                  style={{
                    marginTop: '1rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                  disabled={processing}
                >
                  Cancel
                </button>

                {processing && (
                  <div style={{ marginTop: '1rem' }}>
                    <div className="logo-text" style={{ animation: 'pulse 1.5s infinite' }}>Processing...</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success/Failure Status */}
          {paymentStatus === 'success' && (
            <div style={{
              position: 'fixed',
              bottom: '2rem',
              right: '2rem',
              padding: '1rem 2rem',
              background: '#10b981',
              color: '#fff',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 1000,
              animation: 'slideIn 0.3s ease'
            }}>
              🎉 Payment Successful! Redirecting...
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}