import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import GstInvoiceModal from './GstInvoiceModal';

export default function MyInvoicesTab() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const res = await api.getMyInvoices();
        setTransactions(res.transactions || []);
      } catch (err) {
        console.error('Fetch invoices error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="logo-text" style={{ animation: 'pulse 1.5s infinite' }}>LOADING YOUR INVOICES...</div>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(2,132,199,0.15))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.4rem'
        }}>
          🧾
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem' }}>My GST Tax Invoices & Bills</h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Official GST tax receipts and payment statements for all course, software, and service purchases.
          </p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No payment invoices found yet</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Official GST tax invoices will be automatically generated whenever you purchase courses or products.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
          {transactions.map((t) => {
            const isRefund = t.status === 'refunded';
            const invoiceNumber = t.invoiceNo || (isRefund ? (t.creditNoteNo || `CN-${t.txnid}`) : t.txnid);
            const dateStr = new Date(t.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });

            return (
              <div 
                key={t._id} 
                style={{
                  background: 'var(--bg-card)',
                  border: isRefund ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
                  transition: 'border-color 0.2s ease, transform 0.2s ease'
                }}
              >
                {/* Left: Invoice Identity & Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 280px', minWidth: '240px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: isRefund ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    flexShrink: 0
                  }}>
                    {isRefund ? '⚠️' : '🧾'}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                      <span style={{ 
                        fontFamily: 'monospace', 
                        fontWeight: 700, 
                        fontSize: '0.92rem', 
                        color: 'var(--text-primary)' 
                      }}>
                        {invoiceNumber}
                      </span>
                      <span style={{
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: 'var(--primary)',
                        padding: '1px 7px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        textTransform: 'uppercase'
                      }}>
                        {t.itemType || 'Course'}
                      </span>
                      <span style={{
                        padding: '1px 7px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: t.status === 'success' 
                          ? 'rgba(16, 185, 129, 0.15)' 
                          : (isRefund ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                        color: t.status === 'success' 
                          ? '#10b981' 
                          : (isRefund ? '#ef4444' : '#f59e0b')
                      }}>
                        {isRefund ? 'REFUNDED' : (t.status || 'SUCCESS').toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                      <span>📅 {dateStr}</span>
                      <span>📍 State: {t.billingDetails?.buyerState || 'Kerala'}</span>
                      <span style={{ color: 'var(--text-muted)' }}>SAC: 999249</span>
                    </div>
                  </div>
                </div>

                {/* Right: Price & Quick Action */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1.25rem', 
                  flex: '0 0 auto',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  minWidth: '220px'
                }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: 800, 
                      color: isRefund ? '#ef4444' : 'var(--text-primary)' 
                    }}>
                      {isRefund ? `-₹${t.amount?.toFixed(2)}` : `₹${t.amount?.toFixed(2)}`}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {isRefund ? 'Amount Reversed' : 'Incl. 18% GST'}
                    </div>
                  </div>

                  {(t.status === 'success' || isRefund) && (
                    <button
                      onClick={() => setSelectedTxn(t.txnid)}
                      className={isRefund ? 'btn btn-outline-danger btn-sm' : 'btn btn-primary btn-sm'}
                      style={{ 
                        fontSize: '0.82rem', 
                        padding: '0.45rem 0.95rem', 
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        flex: '1 1 auto',
                        justifyContent: 'center'
                      }}
                    >
                      {isRefund ? '📄 Credit Note' : '📄 Tax Invoice'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice Modal */}
      {selectedTxn && (
        <GstInvoiceModal
          txnid={selectedTxn}
          onClose={() => setSelectedTxn(null)}
        />
      )}
    </div>
  );
}
