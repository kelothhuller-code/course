// Admin GST Tax Reports Module - Dark Admin Theme
const GstReportModule = {
    async render() {
        try {
            const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
            const [configRes, reportRes] = await Promise.all([
                fetch('/api/admin/gst/config', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(r => r.json()).catch(() => ({})),
                fetch('/api/admin/gst/report', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(r => r.json()).catch(() => ({}))
            ]);

            const config = configRes || {};
            const report = reportRes || { transactions: [], summary: {} };
            const summary = report.summary || {};

            return `
                <div class="gst-report-module">
                    <div class="flex justify-between items-center" style="margin-bottom:24px; flex-wrap:wrap; gap:16px;">
                        <div>
                            <h2>🇮🇳 Indian GST Tax Reports (GSTR-1 / GSTR-3B)</h2>
                            <p class="text-muted" style="margin-top:4px;">Official GST Billing, Tax Split Breakup & Tax Return Summary</p>
                        </div>
                        <div>
                            <button id="export-gst-csv-btn" class="btn btn-primary" onclick="GstReportModule.exportCsv()" style="display:inline-flex; align-items:center; gap:8px;">
                                📥 Export GSTR-1 CSV
                            </button>
                        </div>
                    </div>

                    <!-- GST Configuration Profile -->
                    <div class="stat-card" style="margin-bottom:24px;">
                        <div class="flex justify-between items-center" style="margin-bottom:16px;">
                            <h4 style="margin:0; font-size:1.1rem; font-weight:600;">⚙️ GST Registration Profile</h4>
                            <span class="badge">State Code: ${config.sellerStateCode || '33'}</span>
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; font-size:0.9rem;">
                            <div>
                                <span class="stat-title" style="display:block;">Legal Name</span>
                                <strong style="color:var(--text-main); font-size:0.95rem;">${config.legalName || 'WIDETECHNOS ACADEMY PRIVATE LIMITED'}</strong>
                            </div>
                            <div>
                                <span class="stat-title" style="display:block;">GSTIN Number</span>
                                <strong style="color:var(--primary); font-family:monospace; font-size:1.05rem;">${config.gstin || '33AAAAA0000A1Z5'}</strong>
                            </div>
                            <div>
                                <span class="stat-title" style="display:block;">Seller State</span>
                                <strong style="color:var(--text-main); font-size:0.95rem;">${config.sellerState || 'Tamil Nadu'}</strong>
                            </div>
                            <div>
                                <span class="stat-title" style="display:block;">HSN / SAC Code</span>
                                <strong style="color:var(--text-main); font-size:0.95rem;">${config.hsnSacCode || '999249'} (Online Education)</strong>
                            </div>
                            <div>
                                <span class="stat-title" style="display:block;">Tax Rate</span>
                                <strong style="color:var(--success); font-size:0.95rem;">18% GST (9% CGST + 9% SGST / 18% IGST)</strong>
                            </div>
                        </div>
                    </div>

                    <!-- Key Metric Summary Cards -->
                    <div class="grid-cards" style="margin-bottom:24px;">
                        <div class="stat-card" style="border-left:4px solid #6366f1;">
                            <span class="stat-title">Total Gross Sales</span>
                            <div class="stat-value" style="color:#a5b4fc;">₹${(summary.totalGrossSales || 0).toLocaleString('en-IN')}</div>
                            <span style="font-size:0.75rem; color:var(--text-muted);">(Inclusive of 18% Tax)</span>
                        </div>
                        <div class="stat-card" style="border-left:4px solid #0284c7;">
                            <span class="stat-title">Net Taxable Base Value</span>
                            <div class="stat-value" style="color:#38bdf8;">₹${(summary.totalTaxableValue || 0).toLocaleString('en-IN')}</div>
                            <span style="font-size:0.75rem; color:var(--text-muted);">(Before GST Application)</span>
                        </div>
                        <div class="stat-card" style="border-left:4px solid #10b981;">
                            <span class="stat-title">Total CGST (9%)</span>
                            <div class="stat-value" style="color:#34d399;">₹${(summary.totalCgst || 0).toLocaleString('en-IN')}</div>
                            <span style="font-size:0.75rem; color:var(--text-muted);">Intra-State Central Tax</span>
                        </div>
                        <div class="stat-card" style="border-left:4px solid #f59e0b;">
                            <span class="stat-title">Total SGST (9%)</span>
                            <div class="stat-value" style="color:#fbbf24;">₹${(summary.totalSgst || 0).toLocaleString('en-IN')}</div>
                            <span style="font-size:0.75rem; color:var(--text-muted);">Intra-State State Tax</span>
                        </div>
                        <div class="stat-card" style="border-left:4px solid #ec4899;">
                            <span class="stat-title">Total IGST (18%)</span>
                            <div class="stat-value" style="color:#f472b6;">₹${(summary.totalIgst || 0).toLocaleString('en-IN')}</div>
                            <span style="font-size:0.75rem; color:var(--text-muted);">Inter-State Integrated Tax</span>
                        </div>
                    </div>

                    <!-- Tax Invoices & Transactions Table -->
                    <div class="stat-card">
                        <div class="flex justify-between items-center" style="margin-bottom:16px;">
                            <h3 style="font-size:1.15rem; margin:0;">🧾 B2C & B2B Tax Transactions Log</h3>
                            <span class="text-muted" style="font-size:0.85rem;">Total Orders: <strong>${(report.transactions || []).length}</strong></span>
                        </div>

                        ${(report.transactions || []).length === 0 ? `
                            <div style="padding:32px; text-align:center; color:var(--text-muted);">
                                <p style="font-size:1.1rem; margin:0;">No successful transactions logged in this period yet.</p>
                            </div>
                        ` : `
                            <div style="overflow-x:auto;">
                                <table style="width:100%; border-collapse:collapse; font-size:0.88rem; text-align:left; color:var(--text-main);">
                                    <thead>
                                        <tr style="background:rgba(15, 23, 42, 0.8); border-bottom:2px solid var(--border); color:var(--text-muted);">
                                            <th style="padding:12px;">Date</th>
                                            <th style="padding:12px;">Txn ID / Invoice</th>
                                            <th style="padding:12px;">Buyer</th>
                                            <th style="padding:12px;">Place of Supply</th>
                                            <th style="padding:12px;">Gross (₹)</th>
                                            <th style="padding:12px;">Taxable (₹)</th>
                                            <th style="padding:12px;">CGST (9%)</th>
                                            <th style="padding:12px;">SGST (9%)</th>
                                            <th style="padding:12px;">IGST (18%)</th>
                                            <th style="padding:12px;">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${report.transactions.map(t => {
                                            const d = new Date(t.createdAt).toLocaleDateString();
                                            const isIntraState = t.supplyType === 'INTRA_STATE' || (t.buyerState || 'Tamil Nadu').toLowerCase() === (config.sellerState || 'Tamil Nadu').toLowerCase();
                                            return `
                                                <tr style="border-bottom:1px solid var(--border);">
                                                    <td style="padding:12px; white-space:nowrap;">${d}</td>
                                                    <td style="padding:12px; font-family:monospace; font-weight:600; color:var(--primary);">${t.txnid}</td>
                                                    <td style="padding:12px;">
                                                        <div style="font-weight:600;">${t.buyerName || t.userId?.name || 'Student'}</div>
                                                        ${t.buyerGstin ? `<span style="font-size:0.75rem; color:#818cf8; font-family:monospace;">GSTIN: ${t.buyerGstin}</span>` : ''}
                                                    </td>
                                                    <td style="padding:12px;">
                                                        <span>${t.buyerState || 'Tamil Nadu'}</span>
                                                        <span style="font-size:0.72rem; display:block; color:${isIntraState ? '#38bdf8' : '#c084fc'}; font-weight:700;">
                                                            ${isIntraState ? 'INTRA-STATE' : 'INTER-STATE'}
                                                        </span>
                                                    </td>
                                                    <td style="padding:12px; font-weight:700;">₹${t.amount}</td>
                                                    <td style="padding:12px;">₹${t.taxableAmount || Math.round((t.amount / 1.18) * 100) / 100}</td>
                                                    <td style="padding:12px; color:#34d399;">₹${t.cgstAmount || (isIntraState ? Math.round(((t.amount - (t.amount / 1.18)) / 2) * 100) / 100 : 0)}</td>
                                                    <td style="padding:12px; color:#fbbf24;">₹${t.sgstAmount || (isIntraState ? Math.round(((t.amount - (t.amount / 1.18)) / 2) * 100) / 100 : 0)}</td>
                                                    <td style="padding:12px; color:#f472b6;">₹${t.igstAmount || (!isIntraState ? Math.round((t.amount - (t.amount / 1.18)) * 100) / 100 : 0)}</td>
                                                    <td style="padding:12px;">
                                                        <a href="/api/payment/invoice/${t.txnid}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="padding:4px 10px; font-size:0.78rem; text-decoration:none;">
                                                            📄 Invoice PDF
                                                        </a>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `}
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Error rendering GST Report module:', err);
            return `<div class="stat-card"><h3 style="color:var(--danger);">Failed to load GST Tax Report</h3><p>${err.message}</p></div>`;
        }
    },

    exportCsv() {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
        fetch('/api/admin/gst/report/export', {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `GSTR1_Tax_Report_${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        })
        .catch(err => alert('CSV Export failed: ' + err.message));
    }
};

window.GstReportModule = GstReportModule;
