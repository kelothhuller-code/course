import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import { toast } from '../../components/Toast';

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal'
];

export default function GstReportTab() {
  const [report, setReport] = useState(null);
  const [gstConfig, setGstConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'creditNotes' | 'b2b' | 'b2c' | 'sac' | 'settings'
  
  // Date filters
  const [filterPeriod, setFilterPeriod] = useState('all'); // 'all' | 'this_month' | 'last_month' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    legalName: '',
    tradeName: '',
    gstin: '',
    sellerState: 'Kerala',
    registeredAddress: '',
    hsnSacCode: '999249',
    gstRate: 18
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  // Refund Modal State
  const [refundModalTxn, setRefundModalTxn] = useState(null);
  const [refundReason, setRefundReason] = useState('Requested by student / course cancellation');
  const [refundAmountInput, setRefundAmountInput] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);
  const [refundError, setRefundError] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      let params = {};
      const now = new Date();
      if (filterPeriod === 'this_month') {
        params.month = now.getMonth() + 1;
        params.year = now.getFullYear();
      } else if (filterPeriod === 'last_month') {
        const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        params.month = lastM.getMonth() + 1;
        params.year = lastM.getFullYear();
      } else if (filterPeriod === 'custom' && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const [reportData, configData] = await Promise.all([
        api.getGstReport(params),
        api.getGstConfig()
      ]);

      setReport(reportData);
      setGstConfig(configData);
      setSettingsForm({
        legalName: configData.legalName || 'WIDE VENTURES',
        tradeName: configData.tradeName || 'WIDE VENTURES (WIDE TECH / BROFFY)',
        gstin: configData.gstin || '32FBEPK9712B1Z0',
        sellerState: configData.sellerState || 'Kerala',
        registeredAddress: configData.registeredAddress || '8/7/a, Thettamala, Mananthavady Road, Wayanad, Kerala - 670731',
        hsnSacCode: configData.hsnSacCode || '999249',
        gstRate: configData.gstRate || 18
      });
    } catch (err) {
      console.error('Error fetching GST report:', err);
    } finally {
      setLoading(false);
    }
  }, [filterPeriod, startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCsv = () => {
    let url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/gst/report/export`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    const token = localStorage.getItem('token');
    
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `GSTR1_Tax_Report_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => toast.error('Failed to export CSV: ' + err.message));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMsg('');
    try {
      const res = await api.updateGstConfig(settingsForm);
      setGstConfig(res.config);
      setSettingsMsg('✅ GST Profile settings updated successfully!');
      fetchReport();
    } catch (err) {
      setSettingsMsg('❌ Error updating GST settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const openRefundModal = (txn) => {
    setRefundModalTxn(txn);
    setRefundAmountInput(txn.gross ? txn.gross.toString() : '');
    setRefundReason('Course cancellation requested by student');
    setRefundError('');
  };

  const handleProcessRefundSubmit = async (e) => {
    e.preventDefault();
    if (!refundModalTxn) return;

    setProcessingRefund(true);
    setRefundError('');
    try {
      const res = await api.refundTransaction(refundModalTxn.id, {
        reason: refundReason,
        refundAmount: refundAmountInput ? Number(refundAmountInput) : undefined
      });
      toast.success(res.message || 'Refund successfully processed and Credit Note generated!');
      setRefundModalTxn(null);
      fetchReport();
    } catch (err) {
      setRefundError(err.message || 'Refund processing failed');
    } finally {
      setProcessingRefund(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="logo-text" style={{ animation: 'pulse 1.5s infinite' }}>LOADING GST TAX REPORT...</div>
      </div>
    );
  }

  const summary = report?.summary || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header & Controls */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🇮🇳</span>
            <h2 style={{ margin: 0 }}>Indian GST Tax Filing Report</h2>
          </div>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            GSTR-1 & GSTR-3B Tax Filing Summaries for <strong>{report?.sellerProfile?.legalName || 'WIDE VENTURES'}</strong> (GSTIN: <span style={{ fontFamily: 'monospace' }}>{report?.sellerProfile?.gstin}</span>)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Period Filter */}
          <select 
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              background: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          >
            <option value="all">All Time</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {filterPeriod === 'custom' && (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background)', color: '#fff', fontSize: '0.8rem' }} 
              />
              <span>to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background)', color: '#fff', fontSize: '0.8rem' }} 
              />
            </div>
          )}

          <button onClick={handleExportCsv} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            📥 Export GSTR-1 CSV (Invoices & Credit Notes)
          </button>
        </div>
      </div>

      {/* KPI Cards: Gross Sales, Credit Notes Reversed, Net Taxable & Net Tax Liability */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        
        {/* Gross Sales */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Gross Revenue (Before Refunds)</p>
          <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.4rem', color: '#fff' }}>₹{summary.totalGrossSales?.toLocaleString('en-IN') || 0}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>{summary.totalInvoices || 0} Tax Invoices</p>
        </div>

        {/* Refunds / Credit Notes (Sec 9B) */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <p style={{ fontSize: '0.8rem', color: '#f87171', margin: 0 }}>Total Refunds (Credit Notes Sec 9B)</p>
          <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.4rem', color: '#ef4444' }}>-₹{summary.totalRefundedAmount?.toLocaleString('en-IN') || 0}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>{summary.totalRefundsCount || 0} Credit Notes Issued</p>
        </div>

        {/* Net Taxable Value (Base) */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Net Taxable Turnover (GSTR-3B)</p>
          <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.4rem', color: '#10b981' }}>₹{summary.netTaxableTurnover?.toLocaleString('en-IN') || 0}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Excl. 18% Tax (Net of Returns)</p>
        </div>

        {/* Net GST Output Tax Payable */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Net Tax Liability (GST Payable)</p>
          <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.4rem', color: '#f59e0b' }}>₹{summary.netGstPayable?.toLocaleString('en-IN') || 0}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>GSTR-3B Table 3.1 Net Output Tax</p>
        </div>

        {/* Net CGST + SGST (Intra-state Kerala) */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Net CGST + SGST (Kerala Intra-state)</p>
          <h4 style={{ margin: '0.4rem 0 0 0', fontSize: '1.1rem', color: '#8b5cf6' }}>
            CGST: ₹{summary.netCgstPayable?.toLocaleString('en-IN') || 0}
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#a78bfa', margin: '0.1rem 0 0 0' }}>
            SGST: ₹{summary.netSgstPayable?.toLocaleString('en-IN') || 0}
          </p>
        </div>

        {/* Net IGST (Inter-state) */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #ec4899' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Net IGST (Inter-state)</p>
          <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.4rem', color: '#ec4899' }}>₹{summary.netIgstPayable?.toLocaleString('en-IN') || 0}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Outside Kerala (B2B + B2C)</p>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'overview', label: `📋 All Transactions (${report?.allTransactions?.length || 0})` },
          { id: 'creditNotes', label: `↩️ Credit Notes / Refunds (${report?.creditNotes?.length || 0})` },
          { id: 'b2b', label: `🏢 GSTR-1 B2B (${report?.b2bInvoices?.length || 0})` },
          { id: 'b2c', label: `🛍️ GSTR-1 B2C State Aggregate (${report?.b2cSummary?.length || 0})` },
          { id: 'sac', label: '🏷️ SAC 999249 Summary' },
          { id: 'settings', label: '⚙️ Seller GST Settings' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            style={{
              padding: '0.6rem 1.2rem',
              border: 'none',
              borderRadius: '8px',
              background: activeSubTab === t.id ? 'var(--primary)' : 'transparent',
              color: activeSubTab === t.id ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: activeSubTab === t.id ? '600' : '400',
              fontSize: '0.88rem'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tab 1: Overview (All Transactions with Refund Action) */}
      {activeSubTab === 'overview' && (
        <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>All Transactions & Invoices ({report?.allTransactions?.length || 0})</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click "↩ Refund" to reverse GST & issue an official Credit Note</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Document / Invoice</th>
                <th style={{ padding: '0.75rem' }}>Date</th>
                <th style={{ padding: '0.75rem' }}>Buyer Name</th>
                <th style={{ padding: '0.75rem' }}>Place of Supply</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Gross (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Taxable Base (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total Tax (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {report?.allTransactions?.map((t, idx) => {
                const isRefunded = t.status === 'refunded';
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isRefunded ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>
                      <div>{t.invoiceNo}</div>
                      {isRefunded && (
                        <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                          Credit Note: {t.creditNoteNo || `CN-${t.txnid}`}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(t.date).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                      {t.buyerName}
                      {t.buyerGstin && !t.buyerGstin.startsWith('N/A') && (
                        <div style={{ fontSize: '0.72rem', color: '#10b981', fontFamily: 'monospace' }}>GSTIN: {t.buyerGstin}</div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{t.buyerState}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: isRefunded ? '#ef4444' : '#fff' }}>
                      {isRefunded ? `-₹${t.gross?.toFixed(2)}` : `₹${t.gross?.toFixed(2)}`}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: isRefunded ? '#ef4444' : '#10b981' }}>
                      {isRefunded ? `-₹${t.base?.toFixed(2)}` : `₹${t.base?.toFixed(2)}`}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: isRefunded ? '#ef4444' : '#f59e0b' }}>
                      {isRefunded ? `-₹${t.gst?.toFixed(2)}` : `₹${t.gst?.toFixed(2)}`}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: isRefunded ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: isRefunded ? '#ef4444' : '#10b981'
                      }}>
                        {isRefunded ? 'REFUNDED (CN)' : 'PAID'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {!isRefunded ? (
                        <button
                          onClick={() => openRefundModal(t)}
                          className="btn btn-outline-danger btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                        >
                          ↩ Refund & CN
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Reversed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!report?.allTransactions || report.allTransactions.length === 0) && (
                <tr>
                  <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No transaction records found for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Sub-tab 2: Credit Notes / Refunds Table (GSTR-1 Section 9B) */}
      {activeSubTab === 'creditNotes' && (
        <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0 }}>GSTR-1 Table 9B: Credit Notes & Tax Reversals ({report?.creditNotes?.length || 0})</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Section 9B Credit Notes officially reduce Output Tax liability in GSTR-3B Table 3.1 & Table 4
              </p>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 600 }}>Total Reversal: ₹{summary.totalRefundedAmount?.toFixed(2) || 0}</span>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Credit Note No</th>
                <th style={{ padding: '0.75rem' }}>Original Invoice Ref</th>
                <th style={{ padding: '0.75rem' }}>Refund Date</th>
                <th style={{ padding: '0.75rem' }}>Buyer Name</th>
                <th style={{ padding: '0.75rem' }}>Place of Supply</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Refund Amount (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Taxable Base Reversed (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>CGST Reversed (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>SGST Reversed (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>IGST Reversed (₹)</th>
                <th style={{ padding: '0.75rem' }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {report?.creditNotes?.map((cn, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 700, color: '#f87171' }}>
                    {cn.creditNoteNo}
                  </td>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {cn.originalInvoiceNo}
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                    {new Date(cn.refundDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                    {cn.buyerName}
                    {cn.buyerGstin && <div style={{ fontSize: '0.72rem', color: '#10b981', fontFamily: 'monospace' }}>GSTIN: {cn.buyerGstin}</div>}
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{cn.buyerState}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>
                    -₹{cn.refundAmount?.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#f87171' }}>
                    -₹{cn.refundBaseAmount?.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    -₹{cn.cgstReversed?.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    -₹{cn.sgstReversed?.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ec4899' }}>
                    -₹{cn.igstReversed?.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {cn.reason}
                  </td>
                </tr>
              ))}
              {(!report?.creditNotes || report.creditNotes.length === 0) && (
                <tr>
                  <td colSpan="11" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No credit notes or refunded transactions issued yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Sub-tab 3: B2B Invoices */}
      {activeSubTab === 'b2b' && (
        <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>GSTR-1 Table 4A: B2B Invoices ({report?.b2bInvoices?.length || 0})</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registered businesses requiring Input Tax Credit (ITC)</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Invoice No</th>
                <th style={{ padding: '0.75rem' }}>Date</th>
                <th style={{ padding: '0.75rem' }}>Buyer Legal Name</th>
                <th style={{ padding: '0.75rem' }}>Buyer GSTIN</th>
                <th style={{ padding: '0.75rem' }}>Place of Supply</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Taxable Base (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>IGST (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>CGST (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>SGST (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Invoice Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {report?.b2bInvoices?.map((b, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{b.invoiceNo}</td>
                  <td style={{ padding: '0.75rem' }}>{new Date(b.date).toLocaleDateString()}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{b.buyerName}</td>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#10b981', fontWeight: 700 }}>{b.buyerGstin}</td>
                  <td style={{ padding: '0.75rem' }}>{b.buyerState}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{b.taxableBase?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{b.igst?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{b.cgst?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{b.sgst?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>₹{b.grossAmount?.toFixed(2)}</td>
                </tr>
              ))}
              {(!report?.b2bInvoices || report.b2bInvoices.length === 0) && (
                <tr>
                  <td colSpan="10" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No B2B registered business invoices found in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Sub-tab 4: B2C State Aggregate */}
      {activeSubTab === 'b2c' && (
        <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>GSTR-1 Table 7: B2C State-Wise Place of Supply Aggregation</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Consolidated consumer sales by State & Rate (18%)</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Place of Supply (State)</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Orders Count</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Rate %</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Gross Revenue (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Taxable Base (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>CGST (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>SGST (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>IGST (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total Tax (₹)</th>
              </tr>
            </thead>
            <tbody>
              {report?.b2cSummary?.map((s, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{s.posState}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>{s.count}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>18%</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>₹{s.grossSales?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#10b981' }}>₹{s.taxableBase?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{s.cgst?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{s.sgst?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ec4899' }}>₹{s.igst?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>₹{s.totalGst?.toFixed(2)}</td>
                </tr>
              ))}
              {(!report?.b2cSummary || report.b2cSummary.length === 0) && (
                <tr>
                  <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No B2C transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Sub-tab 5: SAC Summary */}
      {activeSubTab === 'sac' && (
        <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <h3>GSTR-1 Table 12: HSN / SAC Summary</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            SAC Code 999249 - Online education services (E-learning, courses, webinars).
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>SAC Code</th>
                <th style={{ padding: '0.75rem' }}>Description</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Net Count</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Net Turnover (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Net Base (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>CGST (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>SGST (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>IGST (₹)</th>
              </tr>
            </thead>
            <tbody>
              {report?.sacSummary?.map((sac, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--secondary)' }}>{sac.hsnSacCode}</td>
                  <td style={{ padding: '0.75rem' }}>{sac.description}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>{sac.count}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>₹{sac.totalValue?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#10b981' }}>₹{sac.taxableBase?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{sac.cgst?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{sac.sgst?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{sac.igst?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sub-tab 6: Settings */}
      {activeSubTab === 'settings' && (
        <div className="glass-card" style={{ padding: '2rem', maxWidth: '700px' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>⚙️ Seller GST Profile & Business Info</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            These business details appear on all official GST tax invoices and GSTR-1 filings.
          </p>

          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Legal Business Name (Registered on GST Portal):
              </label>
              <input
                type="text"
                value={settingsForm.legalName}
                onChange={e => setSettingsForm({ ...settingsForm, legalName: e.target.value })}
                required
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Trade Name (Brand Name):
              </label>
              <input
                type="text"
                value={settingsForm.tradeName}
                onChange={e => setSettingsForm({ ...settingsForm, tradeName: e.target.value })}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Seller GSTIN:
                </label>
                <input
                  type="text"
                  value={settingsForm.gstin}
                  onChange={e => setSettingsForm({ ...settingsForm, gstin: e.target.value.toUpperCase() })}
                  required
                  placeholder="32FBEPK9712B1Z0"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: '#fff', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Registered State (Seller State):
                </label>
                <select
                  value={settingsForm.sellerState}
                  onChange={e => setSettingsForm({ ...settingsForm, sellerState: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: '#fff' }}
                >
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Principal Registered Address:
              </label>
              <textarea
                value={settingsForm.registeredAddress}
                onChange={e => setSettingsForm({ ...settingsForm, registeredAddress: e.target.value })}
                rows="3"
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Default SAC Code:
                </label>
                <input
                  type="text"
                  value={settingsForm.hsnSacCode}
                  onChange={e => setSettingsForm({ ...settingsForm, hsnSacCode: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: '#fff', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  GST Rate (%):
                </label>
                <input
                  type="number"
                  value={settingsForm.gstRate}
                  onChange={e => setSettingsForm({ ...settingsForm, gstRate: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: '#fff' }}
                />
              </div>
            </div>

            {settingsMsg && (
              <p style={{ margin: '0.5rem 0', fontSize: '0.85rem', color: settingsMsg.startsWith('✅') ? '#10b981' : '#ef4444' }}>
                {settingsMsg}
              </p>
            )}

            <button type="submit" className="btn btn-primary" disabled={savingSettings} style={{ marginTop: '0.5rem' }}>
              {savingSettings ? 'Saving Settings...' : 'Save GST Business Profile'}
            </button>
          </form>
        </div>
      )}

      {/* Modal: Process Refund & Issue GST Credit Note */}
      {refundModalTxn && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-card" style={{ maxWidth: '520px', width: '100%', padding: '2rem', background: '#0f172a', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>↩️</span> Issue GST Credit Note & Refund
              </h3>
              <button onClick={() => setRefundModalTxn(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              In accordance with Indian GST regulations, processing this refund will generate an official <strong>GST Credit Note (GSTR-1 Section 9B)</strong> and legally reverse the tax liability for this sale.
            </p>

            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Invoice Ref:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{refundModalTxn.invoiceNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Customer:</span>
                <span>{refundModalTxn.buyerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Original Gross Amount:</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>₹{refundModalTxn.gross?.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleProcessRefundSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Refund Amount (INR):
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={refundModalTxn.gross}
                  min="1"
                  value={refundAmountInput}
                  onChange={e => setRefundAmountInput(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Reason for Credit Note / Cancellation:
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: '#fff' }}
                />
              </div>

              {refundError && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#ef4444' }}>
                  {refundError}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setRefundModalTxn(null)}
                  className="btn btn-secondary"
                  disabled={processingRefund}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={processingRefund}
                  style={{ background: '#dc2626', color: '#fff', border: 'none' }}
                >
                  {processingRefund ? 'Generating Credit Note...' : 'Confirm Refund & Issue CN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
