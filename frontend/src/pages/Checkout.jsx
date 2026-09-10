import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import NavHeader from './NavHeader';

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
            console.error('Item not found:', err2);
            alert('Item not found');
            navigate('/dashboard');
          }
        }
      } catch (err) {
        console.error('Error fetching item:', err);
        alert('Failed to load item details');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id, navigate]);

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const data = await api.initiatePayment(id, itemType, appliedCoupon?.code || null);
      setPaymentData(data);
      
      if (data.isMock) {
        // Mock mode - show payment modal
        setShowPaymentModal(true);
      } else {
        // Real PayU - submit form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.action;
        
        const fields = {
          key: data.key,
          txnid: data.txnid,
          amount: data.amount,
          productinfo: data.productinfo,
          firstname: data.firstname,
          email: data.email,
          phone: data.phone || '9999999999',
          surl: data.surl,
          furl: data.furl,
          hash: data.hash,
          service_provider: data.service_provider || 'payu_paisa'
        };
        
        Object.keys(fields).forEach(key => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = fields[key];
          form.appendChild(input);
        });
        
        document.body.appendChild(form);
        form.submit();
      }
    } catch (err) {
      console.error('Payment initiation error:', err);
      alert(err.message || 'Failed to initiate payment');
    } finally {
      setProcessing(false);
    }
  };

// In Checkout.js, ensure the mock payment callback uses the correct method name:
const handleMockPayment = async (status) => {
  setProcessing(true);
  try {
    const result = await api.mockPaymentCallback(paymentData.txnid, status);
    
    if (status === 'success') {
      setPaymentStatus('success');
      alert('🎉 Payment successful! You are now enrolled.');
      if (onRefreshUser) onRefreshUser();
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } else {
      setPaymentStatus('failed');
      alert('Payment failed. Please try again.');
      setShowPaymentModal(false);
    }
  } catch (err) {
    console.error('Mock payment error:', err);
    alert('Payment processing failed. Please try again.');
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

  // Compute final price
  const basePrice = item?.discountedPrice && item.discountedPrice < item.price
    ? item.discountedPrice
    : item?.price;

  const finalPrice = appliedCoupon
    ? appliedCoupon.discountType === 'percentage'
      ? Math.round(basePrice * (1 - appliedCoupon.discountValue / 100))
      : Math.max(0, basePrice - appliedCoupon.discountValue)
    : basePrice;

  if (loading) {
    return (
      <>
        <NavHeader user={user} onLogout={handleLogout} />
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div className="logo-text" style={{ animation: 'pulse 1.5s infinite' }}>LOADING CHECKOUT...</div>
        </div>
      </>
    );
  }

  if (!item) {
    return (
      <>
        <NavHeader user={user} onLogout={handleLogout} />
        <div className="container" style={{ padding: '2rem 0' }}>
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <h2>Item not found</h2>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
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
                  alert(err.message);
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

  return (
    <>
      <NavHeader user={user} onLogout={handleLogout} />
      <div className="landing-page" style={{ paddingTop: '1rem' }}>
        <div className="container" style={{ flexGrow: 1, paddingBottom: '2rem' }}>
          <div className="checkout-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '2rem',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            {/* Left: Order Summary */}
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Order Summary</h2>
              
              <div className="checkout-item" style={{ 
                display: 'flex', 
                gap: '1rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--border)',
                marginBottom: '1rem'
              }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: 'var(--radius)',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  <img 
                    src={item.thumbnail || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80'} 
                    alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ marginBottom: '0.25rem' }}>{item.title}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {itemType === 'course' ? '📚 Course' : '📅 Event'}
                  </p>
                  {item.languages && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Languages: {item.languages.join(', ')}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                  <span>₹{item.price}</span>
                </div>
                {item.discountedPrice && item.discountedPrice < item.price && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#10b981' }}>
                    <span>Course Discount</span>
                    <span>-₹{item.price - item.discountedPrice}</span>
                  </div>
                )}

                {/* ── Coupon Code Section ── */}
                <div style={{ margin: '1rem 0', padding: '1rem', background: 'var(--background)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>🏷️ Have a coupon?</p>
                  {appliedCoupon ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ flex: 1, fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>✅ {appliedCoupon.code} applied!</span>
                      <button
                        onClick={removeCoupon}
                        style={{ background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '6px', color: 'var(--danger, #ef4444)', padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.78rem' }}
                      >Remove</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Enter coupon code"
                        value={couponInput}
                        onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.75rem',
                          background: 'var(--background-white)',
                          border: `1px solid ${couponError ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                          outline: 'none',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                        className="btn btn-secondary btn-sm"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {couponLoading ? '...' : 'Apply'}
                      </button>
                    </div>
                  )}
                  {couponError && <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#ef4444' }}>{couponError}</p>}
                  {appliedCoupon && <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#10b981' }}>{appliedCoupon.message}</p>}
                </div>

                {appliedCoupon && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#10b981' }}>
                    <span>Coupon Discount</span>
                    <span>-₹{basePrice - finalPrice}</span>
                  </div>
                )}

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.75rem 0',
                  borderTop: '2px solid var(--border)',
                  marginTop: '0.5rem',
                  fontWeight: 'bold',
                  fontSize: '1.2rem'
                }}>
                  <span>Total</span>
                  <span>₹{finalPrice}</span>
                </div>
              </div>

              <button 
                className="btn btn-primary btn-lg" 
                onClick={handlePayment}
                disabled={processing}
                style={{ 
                  width: '100%', 
                  marginTop: '1.5rem',
                  opacity: processing ? 0.7 : 1
                }}
              >
                {processing ? 'Processing...' : `Pay ₹${finalPrice}`}
              </button>

              <p style={{ 
                fontSize: '0.75rem', 
                color: 'var(--text-muted)', 
                textAlign: 'center',
                marginTop: '1rem'
              }}>
                🔒 Secure payment powered by PayU
              </p>
            </div>

            {/* Right: Item Details */}
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>What you'll get</h3>
              <ul style={{ 
                listStyle: 'none', 
                padding: 0,
                margin: 0
              }}>
                {itemType === 'course' ? (
                  <>
                    <li style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>📹</span> Full video course content
                    </li>
                    <li style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>📚</span> Study materials & resources
                    </li>
                    <li style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>🎓</span> Certificate upon completion
                    </li>
                    <li style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>💬</span> Q&A with instructors
                    </li>
                    <li style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>🌍</span> {item.languages?.length || 0} language options
                    </li>
                    {item.duration && (
                      <li style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>⏱️</span> {item.duration} of content
                      </li>
                    )}
                  </>
                ) : (
                  <>
                    <li style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>🎤</span> Live interactive session
                    </li>
                    <li style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>📅</span> {new Date(item.dateTime).toLocaleString()}
                    </li>
                    <li style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>🔗</span> Meeting link provided
                    </li>
                    <li style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>💬</span> Q&A during session
                    </li>
                    {item.duration && (
                      <li style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>⏱️</span> Duration: {item.duration}
                      </li>
                    )}
                  </>
                )}
              </ul>

              <div style={{ 
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'var(--background)',
                borderRadius: 'var(--radius)'
              }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {itemType === 'course' 
                    ? 'Lifetime access with all future updates included.' 
                    : 'Registration includes full access to the live session and recording.'}
                </p>
              </div>
            </div>
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
                    <span style={{ fontWeight: 'bold' }}>₹{paymentData?.amount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Item</span>
                    <span>{paymentData?.productinfo}</span>
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