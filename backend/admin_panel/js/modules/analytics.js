// Analytics & Abandoned Checkout Module
window.AnalyticsModule = {
    data: null,
    activeFilter: 'all', // 'all' | 'abandoned' | 'recovered'
    searchQuery: '',

    async render() {
        try {
            const res = await API.getAnalyticsOverview();
            if (!res || !res.success) {
                return Renderers.errorMessage(res?.message || 'Failed to load analytics overview');
            }
            this.data = res;
            return this.renderView();
        } catch (error) {
            console.error('Analytics load error:', error);
            return Renderers.errorMessage(error.message || 'Error connecting to analytics service');
        }
    },

    renderView() {
        const { traffic, funnel, topPages, abandonedStats, leads } = this.data;

        // Filter leads
        let filteredLeads = leads || [];
        if (this.activeFilter === 'abandoned') {
            filteredLeads = filteredLeads.filter(l => l.status === 'abandoned');
        } else if (this.activeFilter === 'recovered') {
            filteredLeads = filteredLeads.filter(l => l.status === 'recovered');
        }

        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            filteredLeads = filteredLeads.filter(l =>
                (l.buyerName && l.buyerName.toLowerCase().includes(q)) ||
                (l.buyerEmail && l.buyerEmail.toLowerCase().includes(q)) ||
                (l.buyerPhone && l.buyerPhone.includes(q)) ||
                (l.courseTitle && l.courseTitle.toLowerCase().includes(q))
            );
        }

        return `
            <div class="content-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:16px;">
                <div>
                    <h2 style="font-size:1.6rem;font-weight:700;margin-bottom:4px;color:var(--text-main);">📊 Traffic & Drop-off Funnel Analytics</h2>
                    <p style="color:var(--text-muted);font-size:0.9rem;">Real-time visitor counts, checkout drop-off rates, and abandoned cart leads saved inside your database.</p>
                </div>
                <div style="display:flex;gap:10px;">
                    <button class="btn btn-secondary" style="background:rgba(255,255,255,0.08);color:#fff;" onclick="AnalyticsModule.refresh()">
                        🔄 Refresh Data
                    </button>
                    <button class="btn btn-primary" onclick="AnalyticsModule.exportCsv()">
                        📥 Export Leads CSV
                    </button>
                </div>
            </div>

            <!-- KPI Cards Grid -->
            <div class="dashboard-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;margin-bottom:28px;">
                <div class="stat-card" style="padding:20px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;font-weight:600;">Today's Traffic</span>
                        <span style="font-size:1.2rem;">⚡</span>
                    </div>
                    <div style="font-size:1.9rem;font-weight:700;color:var(--text-main);margin-top:6px;">${traffic.viewsToday} <span style="font-size:0.9rem;color:var(--text-muted);font-weight:400;">views</span></div>
                    <div style="color:#38bdf8;font-size:0.85rem;margin-top:4px;">👤 ${traffic.visitorsToday} unique visitors</div>
                </div>

                <div class="stat-card" style="padding:20px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;font-weight:600;">Last 7 Days</span>
                        <span style="font-size:1.2rem;">📈</span>
                    </div>
                    <div style="font-size:1.9rem;font-weight:700;color:var(--text-main);margin-top:6px;">${traffic.views7d} <span style="font-size:0.9rem;color:var(--text-muted);font-weight:400;">views</span></div>
                    <div style="color:#a855f7;font-size:0.85rem;margin-top:4px;">👤 ${traffic.visitors7d} unique visitors</div>
                </div>

                <div class="stat-card" style="padding:20px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;font-weight:600;">Cart Abandonments</span>
                        <span style="font-size:1.2rem;">🛒</span>
                    </div>
                    <div style="font-size:1.9rem;font-weight:700;color:#f87171;margin-top:6px;">${abandonedStats.totalAbandoned} <span style="font-size:0.85rem;color:var(--text-muted);font-weight:400;">leads</span></div>
                    <div style="color:var(--text-muted);font-size:0.85rem;margin-top:4px;">Potential: ₹${abandonedStats.potentialLostRevenue.toLocaleString('en-IN')}</div>
                </div>

                <div class="stat-card" style="padding:20px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;font-weight:600;">Recovered Orders</span>
                        <span style="font-size:1.2rem;">🎉</span>
                    </div>
                    <div style="font-size:1.9rem;font-weight:700;color:#34d399;margin-top:6px;">${abandonedStats.totalRecovered} <span style="font-size:0.85rem;color:var(--text-muted);font-weight:400;">(${abandonedStats.recoveryRate})</span></div>
                    <div style="color:#34d399;font-size:0.85rem;margin-top:4px;">Recovered: ₹${abandonedStats.recoveredRevenue.toLocaleString('en-IN')}</div>
                </div>
            </div>

            <!-- Conversion & Drop-off Funnel Visualizer -->
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:28px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
                    <div>
                        <h3 style="font-size:1.15rem;font-weight:600;margin-bottom:4px;">🔍 Sales Conversion & Drop-off Funnel (Last 30 Days)</h3>
                        <p style="color:var(--text-muted);font-size:0.85rem;">See exactly where visitors leave your website before completing their purchase.</p>
                    </div>
                    <div style="background:rgba(99,102,241,0.12);color:#818cf8;padding:6px 14px;border-radius:20px;font-weight:600;font-size:0.88rem;border:1px solid rgba(99,102,241,0.25);">
                        Overall Conversion Rate: ${funnel.overallConversionRate}
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;">
                    ${funnel.stages.map((stage, idx) => {
                        const colors = ['#6366f1', '#38bdf8', '#fbbf24', '#10b981'];
                        const color = colors[idx] || '#6366f1';
                        return `
                            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px;position:relative;">
                                <div style="font-size:0.82rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;">${stage.name}</div>
                                <div style="font-size:1.8rem;font-weight:700;color:${color};margin:8px 0 4px;">${stage.count}</div>
                                ${idx < funnel.stages.length - 1 ? `
                                    <div style="font-size:0.82rem;color:${stage.dropOffAfter > 50 ? '#f87171' : '#fb923c'};background:rgba(239,68,68,0.1);padding:4px 8px;border-radius:6px;display:inline-block;margin-top:4px;">
                                        ⚠️ ${stage.dropOffLabel}
                                    </div>
                                ` : `
                                    <div style="font-size:0.82rem;color:#34d399;background:rgba(16,185,129,0.1);padding:4px 8px;border-radius:6px;display:inline-block;margin-top:4px;">
                                        ✨ Paid Students
                                    </div>
                                `}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Top Visited Pages -->
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:28px;">
                <h3 style="font-size:1.15rem;font-weight:600;margin-bottom:14px;">🔥 Top Visited Pages (Last 30 Days)</h3>
                <div class="table-container" style="overflow-x:auto;">
                    <table class="data-table" style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="border-bottom:1px solid var(--border);text-align:left;color:var(--text-muted);font-size:0.85rem;">
                                <th style="padding:10px 12px;">PAGE URL</th>
                                <th style="padding:10px 12px;">PAGE TITLE</th>
                                <th style="padding:10px 12px;text-align:right;">TOTAL HITS</th>
                                <th style="padding:10px 12px;text-align:right;">UNIQUE VISITORS</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topPages && topPages.length > 0 ? topPages.map(p => `
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.9rem;">
                                    <td style="padding:12px;font-family:monospace;color:#38bdf8;">${Helpers.escapeHtml(p.path)}</td>
                                    <td style="padding:12px;color:var(--text-main);">${Helpers.escapeHtml(p.pageTitle || '—')}</td>
                                    <td style="padding:12px;text-align:right;font-weight:600;">${p.views}</td>
                                    <td style="padding:12px;text-align:right;color:#a855f7;">${p.uniqueVisitors}</td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="4" style="padding:24px;text-align:center;color:var(--text-muted);">No page visits recorded yet. Visits will automatically appear here as users browse the website.</td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Abandoned Checkout Leads Section -->
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:14px;">
                    <div>
                        <h3 style="font-size:1.15rem;font-weight:600;margin-bottom:4px;">🎯 Abandoned Checkout Leads & Retargeting</h3>
                        <p style="color:var(--text-muted);font-size:0.85rem;">Users who filled contact info or entered checkout but dropped off. Reach them via WhatsApp or Email to close the sale.</p>
                    </div>

                    <!-- Search Input -->
                    <div style="display:flex;gap:10px;align-items:center;">
                        <input type="text"
                            placeholder="Search by name, email, phone..."
                            value="${Helpers.escapeHtml(this.searchQuery)}"
                            oninput="AnalyticsModule.handleSearch(this.value)"
                            style="padding:8px 14px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:8px;color:#fff;font-size:0.88rem;width:240px;"
                        />
                    </div>
                </div>

                <!-- Filter Tabs -->
                <div style="display:flex;gap:10px;margin-bottom:18px;border-bottom:1px solid var(--border);padding-bottom:12px;">
                    <button class="btn ${this.activeFilter === 'all' ? 'btn-primary' : ''}" style="${this.activeFilter !== 'all' ? 'background:rgba(255,255,255,0.06);color:var(--text-muted);' : ''}" onclick="AnalyticsModule.setFilter('all')">
                        All Leads (${leads.length})
                    </button>
                    <button class="btn ${this.activeFilter === 'abandoned' ? 'btn-primary' : ''}" style="${this.activeFilter !== 'abandoned' ? 'background:rgba(255,255,255,0.06);color:var(--text-muted);' : ''}" onclick="AnalyticsModule.setFilter('abandoned')">
                        ⏳ Abandoned (${abandonedStats.totalAbandoned})
                    </button>
                    <button class="btn ${this.activeFilter === 'recovered' ? 'btn-primary' : ''}" style="${this.activeFilter !== 'recovered' ? 'background:rgba(255,255,255,0.06);color:var(--text-muted);' : ''}" onclick="AnalyticsModule.setFilter('recovered')">
                        ✅ Recovered (${abandonedStats.totalRecovered})
                    </button>
                </div>

                <!-- Leads Table -->
                <div class="table-container" style="overflow-x:auto;">
                    <table class="data-table" style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="border-bottom:1px solid var(--border);text-align:left;color:var(--text-muted);font-size:0.82rem;">
                                <th style="padding:10px 12px;">DATE / TIME</th>
                                <th style="padding:10px 12px;">LEAD CONTACT</th>
                                <th style="padding:10px 12px;">COURSE & VALUE</th>
                                <th style="padding:10px 12px;">DROP-OFF STAGE</th>
                                <th style="padding:10px 12px;">STATUS</th>
                                <th style="padding:10px 12px;text-align:right;">QUICK ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredLeads.length > 0 ? filteredLeads.map(lead => {
                                const stepLabels = {
                                    entered_checkout: { label: 'Reached Checkout', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
                                    filled_contact: { label: 'Filled Contact Info', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
                                    initiated_payment: { label: 'Opened Payment Modal', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
                                    payment_failed: { label: 'Payment Gateway Failed', color: '#f87171', bg: 'rgba(248,113,113,0.1)' }
                                };
                                const st = stepLabels[lead.step] || stepLabels.entered_checkout;
                                const isRecovered = lead.status === 'recovered';
                                const cleanPhone = (lead.buyerPhone || '').replace(/[^0-9]/g, '');
                                const waPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
                                const waMsg = encodeURIComponent(`Hi ${lead.buyerName || 'there'}! We noticed you started checkout for "${lead.courseTitle || 'our course'}" on WideTech Academy. Let us know if you had any questions or needed help completing your enrollment!`);

                                return `
                                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.88rem;">
                                        <td style="padding:12px;color:var(--text-muted);white-space:nowrap;">
                                            ${Helpers.formatDate(lead.lastActiveAt || lead.createdAt)}
                                        </td>
                                        <td style="padding:12px;">
                                            <div style="font-weight:600;color:var(--text-main);">${Helpers.escapeHtml(lead.buyerName || 'Anonymous Visitor')}</div>
                                            <div style="font-size:0.82rem;color:#94a3b8;margin-top:2px;">
                                                ${lead.buyerEmail ? `<a href="mailto:${encodeURIComponent(lead.buyerEmail)}" style="color:#38bdf8;text-decoration:none;">📧 ${Helpers.escapeHtml(lead.buyerEmail)}</a>` : '<span style="color:#64748b;">No email entered</span>'}
                                            </div>
                                            <div style="font-size:0.82rem;color:#94a3b8;margin-top:2px;">
                                                ${lead.buyerPhone ? `📞 ${Helpers.escapeHtml(lead.buyerPhone)}` : ''}
                                                ${lead.buyerState ? ` • ${Helpers.escapeHtml(lead.buyerState)}` : ''}
                                            </div>
                                        </td>
                                        <td style="padding:12px;">
                                            <div style="font-weight:600;color:var(--text-main);">${Helpers.escapeHtml(lead.courseTitle || 'Academy Course')}</div>
                                            <div style="font-size:0.85rem;color:#34d399;font-weight:600;margin-top:2px;">₹${(lead.amount || 0).toLocaleString('en-IN')}</div>
                                        </td>
                                        <td style="padding:12px;">
                                            <span style="font-size:0.8rem;padding:4px 10px;border-radius:20px;font-weight:600;background:${st.bg};color:${st.color};display:inline-block;">
                                                ${st.label}
                                            </span>
                                        </td>
                                        <td style="padding:12px;">
                                            <span style="font-size:0.8rem;padding:4px 10px;border-radius:20px;font-weight:600;background:${isRecovered ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'};color:${isRecovered ? '#34d399' : '#f87171'};display:inline-block;">
                                                ${isRecovered ? '✅ Recovered' : '⏳ Abandoned'}
                                            </span>
                                        </td>
                                        <td style="padding:12px;text-align:right;">
                                            <div style="display:flex;gap:6px;justify-content:flex-end;align-items:center;">
                                                ${cleanPhone ? `
                                                    <a href="https://wa.me/${waPhone}?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="btn" style="padding:4px 8px;font-size:0.8rem;background:#25D366;color:#fff;text-decoration:none;border-radius:6px;" title="Chat on WhatsApp">
                                                        💬 WhatsApp
                                                    </a>
                                                ` : ''}
                                                <button class="btn" style="padding:4px 8px;font-size:0.8rem;background:rgba(255,255,255,0.08);color:#fff;border-radius:6px;" onclick="AnalyticsModule.toggleStatus('${lead._id}', '${lead.status}')" title="${isRecovered ? 'Mark Abandoned' : 'Mark Recovered'}">
                                                    ${isRecovered ? '↩️ Unrecover' : '✅ Mark Paid'}
                                                </button>
                                                <button class="btn" style="padding:4px 8px;font-size:0.8rem;background:rgba(239,68,68,0.15);color:#f87171;border-radius:6px;" onclick="AnalyticsModule.deleteLead('${lead._id}')" title="Delete">
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('') : `
                                <tr>
                                    <td colspan="6" style="padding:24px;text-align:center;color:var(--text-muted);">
                                        No abandoned cart leads found matching the filter.
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    setFilter(filter) {
        this.activeFilter = filter;
        document.getElementById('view-container').innerHTML = this.renderView();
    },

    handleSearch(query) {
        this.searchQuery = query;
        document.getElementById('view-container').innerHTML = this.renderView();
    },

    async refresh() {
        App.showLoading();
        const content = await this.render();
        document.getElementById('view-container').innerHTML = content;
    },

    async toggleStatus(id, currentStatus) {
        const newStatus = currentStatus === 'recovered' ? 'abandoned' : 'recovered';
        try {
            await API.updateAbandonedStatus(id, newStatus);
            // Update local memory
            const item = this.data.leads.find(l => l._id === id);
            if (item) item.status = newStatus;
            document.getElementById('view-container').innerHTML = this.renderView();
        } catch (err) {
            alert('Failed to update lead status: ' + err.message);
        }
    },

    async deleteLead(id) {
        if (!confirm('Are you sure you want to remove this abandoned cart lead?')) return;
        try {
            await API.deleteAbandonedLead(id);
            this.data.leads = this.data.leads.filter(l => l._id !== id);
            document.getElementById('view-container').innerHTML = this.renderView();
        } catch (err) {
            alert('Failed to delete lead: ' + err.message);
        }
    },

    exportCsv() {
        const leads = this.data?.leads || [];
        if (leads.length === 0) {
            alert('No leads to export');
            return;
        }

        const headers = ['Date', 'Buyer Name', 'Email', 'Phone', 'State', 'Course', 'Amount', 'Drop-off Stage', 'Status'];
        const rows = leads.map(l => [
            `"${l.createdAt ? new Date(l.createdAt).toLocaleString('en-IN') : ''}"`,
            `"${(l.buyerName || '').replace(/"/g, '""')}"`,
            `"${(l.buyerEmail || '').replace(/"/g, '""')}"`,
            `"${(l.buyerPhone || '').replace(/"/g, '""')}"`,
            `"${(l.buyerState || '').replace(/"/g, '""')}"`,
            `"${(l.courseTitle || '').replace(/"/g, '""')}"`,
            l.amount || 0,
            `"${l.step || ''}"`,
            `"${l.status || ''}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `abandoned_checkout_leads_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
