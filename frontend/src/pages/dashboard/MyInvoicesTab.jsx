import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import GstInvoiceModal from './GstInvoiceModal';

export default function MyInvoicesTab() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const data = await api.getProfile();
        // Fetch user's profile to retrieve transaction records or call profile endpoint
        if (data?.enrolledCourses) {
          // Fetch transactions list
          const txns = await api.adminGetTransactions().catch(() => []);
          // Filter transactions matching this user
          const myTxns = txns.filter(t => t.userId?._id === data._id || t.userId === data._id);
          setTransactions(myTxns);
        }
      } catch (err) {
        console.error('Fetch invoices error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '1.5rem' }}>🧾</span>
        <div>
          <h2 style={{ margin: 0 }}>My GST Tax Invoices</h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Official GST tax receipts and payment statements for your course purchases.
          </p>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.75rem' }}>Invoice No</th>
              <th style={{ padding: '0.75rem' }}>Date</th>
              <th style={{ padding: '0.75rem' }}>Type</th>
              <th style={{ padding: '0.75rem' }}>Place of Supply</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount (Incl. GST)</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>
                  {t.invoiceNo || t.txnid}
                </td>
                <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>
                  {t.itemType || 'course'}
                </td>
                <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                  {t.billingDetails?.buyerState || 'Tamil Nadu'}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--secondary)' }}>
                  ₹{t.amount?.toFixed(2)}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: t.status === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: t.status === 'success' ? '#10b981' : '#ef4444'
                  }}>
                    {t.status?.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                  {t.status === 'success' && (
                    <button
                      onClick={() => setSelectedTxn(t.txnid)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                    >
                      📄 View GST Invoice
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan="7" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No payment invoice records found yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
