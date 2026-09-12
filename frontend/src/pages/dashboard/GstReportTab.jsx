import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';

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
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'b2b' | 'b2c' | 'sac' | 'settings'
  
  // Date filters
  const [filterPeriod, setFilterPeriod] = useState('all'); // 'all' | 'this_month' | 'last_month' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    legalName: '',
    tradeName: '',
    gstin: '',
    sellerState: 'Tamil Nadu',
    registeredAddress: '',
    hsnSacCode: '999249',
    gstRate: 18
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

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
        legalName: configData.legalName || '',
        tradeName: configData.tradeName || '',
        gstin: configData.gstin || '',
        sellerState: configData.sellerState || 'Tamil Nadu',
        registeredAddress: configData.registeredAddress || '',
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
      .catch(err => alert('Failed to export CSV: ' + err.message));
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
            GSTR-1 & GSTR-3B Tax Filing Summaries for {report?.sellerProfile?.legalName || 'WIDETECHNOS ACADEMY'} (GSTIN: {report?.sellerProfile?.gstin})
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
            📥 Export GSTR-1 CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Total Gross Revenue</p>
          <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.5rem', color: '#fff' }}>₹{summary.totalGrossSales?.toLocaleString('en-IN') || 0}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>{summary.totalInvoices || 0} Invoices Issued</p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Taxable Value (Base)</p>
          <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.5rem', color: '#10b981' }}>₹{summary.totalTaxableValue?.toLocaleString('en-IN') || 0}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Excl. 18% Tax</p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Total Tax Liability (GST)</p>
          <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.5rem', color: '#f59e0b' }}>₹{summary.totalGstCollected?.toLocaleString('en-IN') || 0}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>18% Output Tax</p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>CGST + SGST (Intra-state)</p>
          <h4 style={{ margin: '0.4rem 0 0 0', fontSize: '1.1rem', color: '#8b5cf6' }}>
            CGST: ₹{summary.totalCgst?.toLocaleString('en-IN') || 0}
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#a78bfa', margin: '0.1rem 0 0 0' }}>
            SGST: ₹{summary.totalSgst?.toLocaleString('en-IN') || 0}
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #ec4899' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>IGST (Inter-state)</p>
          <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.5rem', color: '#ec4899' }}>₹{summary.totalIgst?.toLocaleString('en-IN') || 0}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>B2B + B2C Out of State</p>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'overview', label: '📋 All Transactions' },
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

      {/* Tab Contents */}
      {activeSubTab === 'overview' && (
        <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <h3 style={{ marginBottom: '1rem' }}>All Tax Invoices ({report?.allTransactions?.length || 0})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Invoice No / Txn</th>
                <th style={{ padding: '0.75rem' }}>Date</th>
                <th style={{ padding: '0.75rem' }}>Buyer Name</th>
                <th style={{ padding: '0.75rem' }}>Buyer State (POS)</th>
                <th style={{ padding: '0.75rem' }}>Buyer GSTIN</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Gross (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Taxable Base (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>CGST (9%)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>SGST (9%)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>IGST (18%)</th>
              </tr>
            </thead>
            <tbody>
              {report?.allTransactions?.map((t, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{t.invoiceNo}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(t.date).toLocaleDateString()}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 500 }}>{t.buyerName}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{t.buyerState}</td>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: t.buyerGstin?.startsWith('N/A') ? 'var(--text-muted)' : '#10b981' }}>{t.buyerGstin}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>₹{t.gross?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#10b981' }}>₹{t.base?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>₹{t.cgst?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>₹{t.sgst?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ec4899' }}>₹{t.igst?.toFixed(2)}</td>
                </tr>
              ))}
              {(!report?.allTransactions || report.allTransactions.length === 0) && (
                <tr>
                  <td colSpan="10" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No successful tax invoice transactions found for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Total Qty</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total Value (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Taxable Base (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>IGST (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>CGST (₹)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>SGST (₹)</th>
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
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{sac.igst?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{sac.cgst?.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{sac.sgst?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                  placeholder="33AAAAA0000A1Z5"
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

    </div>
  );
}
