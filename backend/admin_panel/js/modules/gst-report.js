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
            const report = reportRes || { allTransactions: [], creditNotes: [], summary: {} };
            const summary = report.summary || {};
            const creditNotes = report.creditNotes || [];
            const txns = report.allTransactions || [];

            return `
                <div class="gst-report-module">
                    <div class="flex justify-between items-center" style="margin-bottom:24px; flex-wrap:wrap; gap:16px;">
                        <div>
                            <h2>🇮🇳 Indian GST Tax Reports (GSTR-1 / GSTR-3B)</h2>
                            <p class="text-muted" style="margin-top:4px;">Official GST Billing, Credit Notes (Sec 9B), Reversal Breakup & Net Tax Liability</p>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button id="export-gst-csv-btn" class="btn btn-primary" onclick="GstReportModule.exportCsv()" style="display:inline-flex; align-items:center; gap:8px;">
                                📥 Export GSTR-1 CSV (Invoices & Credit Notes)
                            </button>
                        </div>
                    </div>

                    <!-- GST Configuration Profile -->
                    <div class="stat-card" style="margin-bottom:24px;">
                        <div class="flex justify-between items-center" style="margin-bottom:16px;">
                            <h4 style="margin:0; font-size:1.1rem; font-weight:600;">⚙️ GST Registration Profile</h4>
                            <span class="badge" style="background:#059669;">State Code: ${config.sellerStateCode || '32'} (Kerala)</span>
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; font-size:0.9rem;">
                            <div>
                                <span class="stat-title" style="display:block;">Legal Trade Name</span>
                                <strong style="color:var(--text-main); font-size:0.95rem;">${config.tradeName || 'WIDE VENTURES (WIDE TECH / BROFFY)'}</strong>
                            </div>
                            <div>
                                <span class="stat-title" style="display:block;">GSTIN Number</span>
                                <strong style="color:var(--primary); font-family:monospace; font-size:1.05rem;">${config.gstin || '32FBEPK9712B1Z0'}</strong>
                            </div>
                            <div>
                                <span class="stat-title" style="display:block;">Principal Place of Business</span>
                                <strong style="color:var(--text-main); font-size:0.95rem;">${config.registeredAddress || '8/7/a, Thettamala, Mananthavady Road, Wayanad, Kerala - 670731'}</strong>
                            </div>
                            <div>
                                <span class="stat-title" style="display:block;">HSN / SAC Code</span>
                                <strong style="color:var(--text-main); font-size:0.95rem;">${config.hsnSacCode || '999249'} (Online Education)</strong>
                            </div>
                            <div>
                                <span class="stat-title" style="display:block;">Tax Rate</span>
                                <strong style="color:var(--success); font-size:0.95rem;">18% GST (9% CGST + 9% SGST in Kerala / 18% IGST Outside)</strong>
                            </div>
                        </div>
                    </div>

                    <!-- Key Metric Summary Cards -->
                    <div class="grid-cards" style="margin-bottom:24px;">
                        <div class="stat-card" style="border-left:4px solid #6366f1;">
                            <span class="stat-title">Gross Sales (Invoices)</span>
                            <div class="stat-value" style="color: var(--primary-text);">₹${(summary.totalGrossSales || 0).toLocaleString('en-IN')}</div>
                            <span style="font-size:0.75rem; color:var(--text-muted);">${summary.totalInvoices || 0} Successful Invoice(s)</span>
                        </div>
                        <div class="stat-card" style="border-left:4px solid #ef4444;">
                            <span class="stat-title">Refunds / Credit Notes (Sec 9B)</span>
                            <div class="stat-value" style="color: var(--danger);">-₹${(summary.totalRefundedAmount || 0).toLocaleString('en-IN')}</div>
                            <span style="font-size:0.75rem; color:var(--text-muted);">${summary.totalRefundsCount || 0} Reversal(s) Issued</span>
                        </div>
                        <div class="stat-card" style="border-left:4px solid #10b981;">
                            <span class="stat-title">Net Taxable Turnover</span>
                            <div class="stat-value" style="color: var(--success);">₹${(summary.netTaxableTurnover !== undefined ? summary.netTaxableTurnover : summary.totalTaxableValue || 0).toLocaleString('en-IN')}</div>
                            <span style="font-size:0.75rem; color:var(--text-muted);">(After Refund Adjustments)</span>
                        </div>
                        <div class="stat-card" style="border-left:4px solid #0284c7;">
                            <span class="stat-title">Net CGST Payable</span>
                            <div class="stat-value" style="color: var(--info);">₹${(summary.netCgstPayable !== undefined ? summary.netCgstPayable : summary.totalCgst || 0).toLocaleString('en-IN')}</div>
                            <span style="font-size:0.75rem; color:var(--text-muted);">Kerala Central Tax (9%)</span>
                        </div>
                        <div class="stat-card" style="border-left:4px solid #f59e0b;">
                            <span class="stat-title">Net SGST Payable</span>
                            <div class="stat-value" style="color: var(--warning);">₹${(summary.netSgstPayable !== undefined ? summary.netSgstPayable : summary.totalSgst || 0).toLocaleString('en-IN')}</div>
                            <span style="font-size:0.75rem; color:var(--text-muted);">Kerala State Tax (9%)</span>
                        </div>
                        <div class="stat-card" style="border-left:4px solid #ec4899;">
                            <span class="stat-title">Net IGST Payable</span>
                            <div class="stat-value" style="color: #be185d;">₹${(summary.netIgstPayable !== undefined ? summary.netIgstPayable : summary.totalIgst || 0).toLocaleString('en-IN')}</div>
                            <span style="font-size:0.75rem; color:var(--text-muted);">Inter-State Integrated Tax (18%)</span>
                        </div>
                    </div>

                    <!-- Credit Notes & Refunds Section (GSTR-1 Sec 9B) -->
                    ${creditNotes.length > 0 ? `
                    <div class="stat-card" style="margin-bottom:24px; border:1px solid var(--danger);">
                        <div class="flex justify-between items-center" style="margin-bottom:16px;">
                            <h3 style="font-size:1.15rem; margin:0; color: var(--danger);">⚠️ Credit Notes & Tax Reversals (GSTR-1 Section 9B)</h3>
                            <span class="badge" style="background:#ef4444;">${creditNotes.length} Credit Note(s)</span>
                        </div>
                        <div style="overflow-x:auto;">
                            <table style="width:100%; border-collapse:collapse; font-size:0.85rem; text-align:left; color:var(--text-main);">
                                <thead>
                                    <tr style="background: var(--danger-soft); border-bottom:2px solid var(--danger); color: var(--danger);">
                                        <th style="padding:10px;">Refund Date</th>
                                        <th style="padding:10px;">Credit Note No</th>
                                        <th style="padding:10px;">Original Invoice</th>
                                        <th style="padding:10px;">Customer</th>
                                        <th style="padding:10px;">Place of Supply</th>
                                        <th style="padding:10px;">Refund Amount</th>
                                        <th style="padding:10px;">Base Reversed</th>
                                        <th style="padding:10px;">Tax Reversed</th>
                                        <th style="padding:10px;">Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${creditNotes.map(cn => `
                                        <tr style="border-bottom:1px solid var(--border);">
                                            <td style="padding:10px; white-space:nowrap;">${new Date(cn.refundDate).toLocaleDateString('en-IN')}</td>
                                            <td style="padding:10px; font-family:monospace; font-weight:700; color: var(--danger);">${cn.creditNoteNo}</td>
                                            <td style="padding:10px; font-family:monospace; color:var(--text-muted);">${cn.originalInvoiceNo}</td>
                                            <td style="padding:10px; font-weight:600;">${cn.buyerName}</td>
                                            <td style="padding:10px;">${cn.buyerState}</td>
                                            <td style="padding:10px; font-weight:700; color: var(--danger);">-₹${cn.refundAmount}</td>
                                            <td style="padding:10px; color: var(--danger);">-₹${cn.refundBaseAmount}</td>
                                            <td style="padding:10px; color: var(--danger);">-₹${cn.refundGstAmount}</td>
                                            <td style="padding:10px; font-size:0.8rem; color:var(--text-muted);">${cn.reason || 'Cancellation'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>` : ''}

                    <!-- Tax Invoices & Transactions Table -->
                    <div class="stat-card">
                        <div class="flex justify-between items-center" style="margin-bottom:16px;">
                            <h3 style="font-size:1.15rem; margin:0;">🧾 B2C & B2B Tax Transactions Log</h3>
                            <span class="text-muted" style="font-size:0.85rem;">Total Records: <strong>${txns.length}</strong></span>
                        </div>

                        ${txns.length === 0 ? `
                            <div style="padding:32px; text-align:center; color:var(--text-muted);">
                                <p style="font-size:1.1rem; margin:0;">No transactions recorded in this period yet.</p>
                            </div>
                        ` : `
                            <div style="overflow-x:auto;">
                                <table style="width:100%; border-collapse:collapse; font-size:0.88rem; text-align:left; color:var(--text-main);">
                                    <thead>
                                        <tr style="background: var(--overlay); border-bottom:2px solid var(--border); color:var(--text-muted);">
                                            <th style="padding:12px;">Date</th>
                                            <th style="padding:12px;">Invoice No</th>
                                            <th style="padding:12px;">Buyer</th>
                                            <th style="padding:12px;">Place of Supply</th>
                                            <th style="padding:12px;">Gross (₹)</th>
                                            <th style="padding:12px;">Taxable (₹)</th>
                                            <th style="padding:12px;">Tax Breakdown</th>
                                            <th style="padding:12px;">Status</th>
                                            <th style="padding:12px;">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${txns.map(t => {
                                            const d = new Date(t.date).toLocaleDateString('en-IN');
                                            const isRefunded = t.status === 'refunded';
                                            const isIntraState = (t.buyerState || 'Kerala').trim().toLowerCase() === (config.sellerState || 'Kerala').trim().toLowerCase();
                                            return `
                                                <tr style="border-bottom:1px solid var(--border); ${isRefunded ? 'opacity:0.75; background: var(--danger-soft);' : ''}">
                                                    <td style="padding:12px; white-space:nowrap;">${d}</td>
                                                    <td style="padding:12px; font-family:monospace; font-weight:600; color:var(--primary);">
                                                        ${t.invoiceNo}
                                                        ${isRefunded ? `<div style="font-size:0.75rem; color: var(--danger); font-family:monospace;">CN: ${t.creditNoteNo}</div>` : ''}
                                                    </td>
                                                    <td style="padding:12px;">
                                                        <div style="font-weight:600;">${t.buyerName}</div>
                                                        ${t.buyerGstin && t.buyerGstin !== 'N/A (B2C)' ? `<span style="font-size:0.75rem; color: var(--primary-text); font-family:monospace;">GSTIN: ${t.buyerGstin}</span>` : '<span style="font-size:0.72rem; color:var(--text-muted);">B2C Consumer</span>'}
                                                    </td>
                                                    <td style="padding:12px;">
                                                        <span>${t.buyerState || 'Kerala'}</span>
                                                        <span style="font-size:0.72rem; display:block; color:${isIntraState ? 'var(--info)' : 'var(--primary-text)'}; font-weight:700;">
                                                            ${isIntraState ? 'INTRA-STATE (CGST+SGST)' : 'INTER-STATE (IGST)'}
                                                        </span>
                                                    </td>
                                                    <td style="padding:12px; font-weight:700; ${isRefunded ? 'color: var(--danger);' : ''}">₹${t.gross}</td>
                                                    <td style="padding:12px;">₹${t.base}</td>
                                                    <td style="padding:12px; font-size:0.8rem;">
                                                        ${isIntraState ? `
                                                            <div style="color: var(--success);">CGST: ₹${t.cgst}</div>
                                                            <div style="color: var(--warning);">SGST: ₹${t.sgst}</div>
                                                        ` : `
                                                            <div style="color: #be185d;">IGST: ₹${t.igst}</div>
                                                        `}
                                                    </td>
                                                    <td style="padding:12px;">
                                                        ${isRefunded ? `
                                                            <span class="badge" style="background:#ef4444;">REFUNDED</span>
                                                        ` : `
                                                            <span class="badge" style="background:#10b981;">PAID</span>
                                                        `}
                                                    </td>
                                                    <td style="padding:12px; white-space:nowrap;">
                                                        <a href="/api/payment/invoice/${t.txnid}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="margin-right:6px; text-decoration:none;">
                                                            📄 Invoice
                                                        </a>
                                                        ${!isRefunded ? `
                                                            <button class="btn btn-sm btn-danger" style="background:#dc2626; color:#fff;" onclick="GstReportModule.promptRefund('${t.id}', ${t.gross}, '${t.invoiceNo}')">
                                                                ↩ Refund
                                                            </button>
                                                        ` : ''}
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

    async promptRefund(txnId, amount, invoiceNo) {
        const reason = prompt(`Issue Refund and GST Credit Note for Invoice ${invoiceNo} (₹${amount})?\nEnter reason for refund:`, 'Student course cancellation');
        if (reason === null) return; // User cancelled

        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
        try {
            const res = await fetch(`/api/admin/transactions/${txnId}/refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                alert(`✓ ${data.message}`);
                App.navigateTo('gst-report');
            } else {
                alert(`Error: ${data.message || 'Refund failed'}`);
            }
        } catch (err) {
            alert('Refund failed: ' + err.message);
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

