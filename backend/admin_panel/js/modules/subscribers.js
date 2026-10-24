// Newsletter Subscribers & Automated Email Engine Module
window.SubscribersModule = {
    subscribers: [],
    config: null,
    activeTab: 'list', // 'list' | 'config' | 'broadcast'

    async render() {
        try {
            const [subsData, configData] = await Promise.all([
                API.getSubscribers(),
                API.getNewsletterConfig()
            ]);

            this.subscribers = Array.isArray(subsData) ? subsData : (subsData?.data || []);
            this.config = configData || {};

            const total = this.subscribers.length;
            const active = this.subscribers.filter(s => s.isSubscribed !== false).length;
            const unsubscribed = total - active;
            const welcomeSent = this.subscribers.filter(s => s.welcomeEmailSent).length;

            return `
                <div class="content-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:16px;">
                    <div>
                        <h2 style="font-size:1.6rem;font-weight:700;margin-bottom:4px;">👥 Free Toolkit Subscribers & Email Engine</h2>
                        <p style="color:var(--text-muted);font-size:0.9rem;">Manage newsletter leads, configure automated welcome emails (free course links & PDFs), and broadcast updates.</p>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <button class="btn" style="background: var(--bg-subtle);color: var(--text-main);" onclick="SubscribersModule.exportCsv()">
                            📥 Export CSV
                        </button>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div class="dashboard-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(210px, 1fr));gap:16px;margin-bottom:24px;">
                    <div class="stat-card" style="padding:18px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
                        <div class="stat-title" style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;font-weight:600;">Total Subscribers</div>
                        <div style="font-size:1.9rem;font-weight:700;color:var(--text-main);margin-top:4px;">${total}</div>
                    </div>
                    <div class="stat-card" style="padding:18px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
                        <div class="stat-title" style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;font-weight:600;">Active Subscribers</div>
                        <div style="font-size:1.9rem;font-weight:700;color: var(--success);margin-top:4px;">${active}</div>
                    </div>
                    <div class="stat-card" style="padding:18px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
                        <div class="stat-title" style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;font-weight:600;">Welcome Sent</div>
                        <div style="font-size:1.9rem;font-weight:700;color: var(--info);margin-top:4px;">${welcomeSent}</div>
                    </div>
                    <div class="stat-card" style="padding:18px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
                        <div class="stat-title" style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;font-weight:600;">Unsubscribed</div>
                        <div style="font-size:1.9rem;font-weight:700;color: var(--text-muted);margin-top:4px;">${unsubscribed}</div>
                    </div>
                </div>

                <!-- Tab Controls -->
                <div style="display:flex;gap:12px;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:12px;">
                    <button class="btn ${this.activeTab === 'list' ? 'btn-primary' : ''}" style="${this.activeTab !== 'list' ? 'background: var(--bg-subtle);color:var(--text-muted);' : ''}" onclick="SubscribersModule.switchTab('list')">
                        📋 Subscribers List (${active})
                    </button>
                    <button class="btn ${this.activeTab === 'config' ? 'btn-primary' : ''}" style="${this.activeTab !== 'config' ? 'background: var(--bg-subtle);color:var(--text-muted);' : ''}" onclick="SubscribersModule.switchTab('config')">
                        ⚙️ Automated Welcome Email & Links Setup
                    </button>
                    <button class="btn ${this.activeTab === 'broadcast' ? 'btn-primary' : ''}" style="${this.activeTab !== 'broadcast' ? 'background: var(--bg-subtle);color:var(--text-muted);' : ''}" onclick="SubscribersModule.switchTab('broadcast')">
                        📢 Broadcast Email Campaign
                    </button>
                </div>

                <!-- Tab Contents -->
                <div id="subscribersTabContent">
                    ${this.renderActiveTab()}
                </div>
            `;
        } catch (error) {
            console.error('SubscribersModule render error:', error);
            return `<div class="card" style="padding:24px;color: var(--danger);">Error loading subscribers: ${error.message}</div>`;
        }
    },

    switchTab(tab) {
        this.activeTab = tab;
        const container = document.getElementById('subscribersTabContent');
        if (container) {
            container.innerHTML = this.renderActiveTab();
        } else {
            App.navigateTo('subscribers');
        }
    },

    renderActiveTab() {
        if (this.activeTab === 'config') {
            return this.renderConfigTab();
        }
        if (this.activeTab === 'broadcast') {
            return this.renderBroadcastTab();
        }
        return this.renderListTab();
    },

    renderListTab() {
        let rows = `
            <tr>
                <td colspan="5" style="text-align:center; padding:32px; color:var(--text-muted);">
                    No subscribers found yet. Anyone submitting the "Free AI Starter Toolkit" form on the home page will be listed here.
                </td>
            </tr>
        `;

        if (this.subscribers.length > 0) {
            rows = this.subscribers.map(s => {
                const isActive = s.isSubscribed !== false;
                const statusBadge = isActive
                    ? `<span class="badge" style="background: var(--success-soft);color: var(--success);">Active</span>`
                    : `<span class="badge" style="background: var(--bg-hover);color: var(--text-muted);">Unsubscribed</span>`;

                const welcomeBadge = s.welcomeEmailSent
                    ? `<span style="color: var(--success);font-size:0.8rem;font-weight:600;">✓ Dispatched</span>`
                    : `<span style="color:var(--text-muted);font-size:0.8rem;">Pending</span>`;

                const dateStr = new Date(s.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric'
                });

                return `
                    <tr>
                        <td>
                            <strong style="color:var(--text-main);">${s.email}</strong>
                            <div style="font-size:0.75rem;color:var(--text-muted);">${Helpers.safeString(s.name, 'No name provided')}</div>
                        </td>
                        <td>${dateStr}</td>
                        <td>${statusBadge}</td>
                        <td>${welcomeBadge}</td>
                        <td>
                            <button class="btn btn-sm" style="padding:5px 8px;font-size:0.8rem;background: var(--danger-soft);color: var(--danger);border:1px solid var(--danger);"
                                    onclick="SubscribersModule.deleteSub('${s._id}', '${s.email}')" title="Delete">
                                🗑️
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        return `
            <div class="card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden;">
                <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
                    <h3 style="font-size:1.1rem;font-weight:600;">Subscribers Directory</h3>
                    <span style="font-size:0.8rem;color:var(--text-muted);">Unsubscribe links are automatically provided at the footer of all emails</span>
                </div>
                <div style="overflow-x:auto;">
                    <table class="table" style="width:100%;border-collapse:collapse;text-align:left;">
                        <thead>
                            <tr style="border-bottom:1px solid var(--border);color:var(--text-muted);font-size:0.8rem;text-transform:uppercase;">
                                <th style="padding:14px 18px;">Subscriber Email / Name</th>
                                <th style="padding:14px 18px;">Joined Date</th>
                                <th style="padding:14px 18px;">Status</th>
                                <th style="padding:14px 18px;">Welcome Toolkit</th>
                                <th style="padding:14px 18px;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderConfigTab() {
        const c = this.config || {};
        return `
            <div class="card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:850px;">
                <div style="margin-bottom:20px;">
                    <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:4px;">Automated Welcome Email Configuration</h3>
                    <p style="color:var(--text-muted);font-size:0.88rem;">This email is automatically dispatched whenever a user enters their email on the home page lead magnet form. You can configure what courses, resource links, and PDF files they receive.</p>
                </div>

                <form id="welcomeConfigForm" onsubmit="SubscribersModule.saveConfig(event)">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding:12px 16px;background: var(--info-soft);border:1px solid rgba(59,130,246,0.2);border-radius:8px;">
                        <input type="checkbox" id="cfgAutoSend" ${c.autoSendWelcome !== false ? 'checked' : ''} style="width:18px;height:18px;" />
                        <label for="cfgAutoSend" style="font-size:0.9rem;font-weight:600;cursor:pointer;">
                            Enable Automated Welcome Email (Dispatches instantly upon subscription)
                        </label>
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;">Email Subject Line *</label>
                        <input type="text" id="cfgSubject" class="form-control" required value="${Helpers.safeString(c.welcomeSubject)}"
                               style="width:100%;padding:10px 14px;border-radius:8px;background: var(--input-bg);border:1px solid var(--border-strong);color: var(--text-main);" />
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;">Email Headline *</label>
                        <input type="text" id="cfgHeadline" class="form-control" required value="${Helpers.safeString(c.welcomeHeadline)}"
                               style="width:100%;padding:10px 14px;border-radius:8px;background: var(--input-bg);border:1px solid var(--border-strong);color: var(--text-main);" />
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;">Welcome Message Body *</label>
                        <textarea id="cfgMessage" rows="4" class="form-control" required
                                  style="width:100%;padding:10px 14px;border-radius:8px;background: var(--input-bg);border:1px solid var(--border-strong);color: var(--text-main);font-family:inherit;resize:vertical;">${Helpers.safeString(c.welcomeMessage)}</textarea>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
                        <div>
                            <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;">Free Courses Landing Link *</label>
                            <input type="url" id="cfgCourseUrl" class="form-control" required value="${Helpers.safeString(c.freeCourseUrl, 'https://widetech.in/#courses')}"
                                   style="width:100%;padding:10px 14px;border-radius:8px;background: var(--input-bg);border:1px solid var(--border-strong);color: var(--text-main);" />
                            <small style="color:var(--text-muted);font-size:0.75rem;">Button in email linking to free course catalog</small>
                        </div>
                        <div>
                            <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;">Free AI Toolkit PDF Download URL (Optional)</label>
                            <input type="url" id="cfgPdfUrl" class="form-control" value="${Helpers.safeString(c.toolkitPdfUrl)}" placeholder="https://.../ai-toolkit.pdf"
                                   style="width:100%;padding:10px 14px;border-radius:8px;background: var(--input-bg);border:1px solid var(--border-strong);color: var(--text-main);" />
                            <small style="color:var(--text-muted);font-size:0.75rem;">Download button for cheat sheets & prompt PDFs</small>
                        </div>
                    </div>

                    <div id="cfgFeedback" style="display:none;margin-bottom:14px;padding:10px;border-radius:6px;font-size:0.85rem;"></div>

                    <button type="submit" id="cfgSubmitBtn" class="btn btn-primary" style="padding:10px 24px;font-weight:600;">
                        💾 Save Welcome Email Template
                    </button>
                </form>
            </div>
        `;
    },

    renderBroadcastTab() {
        const activeCount = this.subscribers.filter(s => s.isSubscribed !== false).length;
        return `
            <div class="card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:850px;">
                <div style="margin-bottom:20px;">
                    <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:4px;">📢 Broadcast Custom Email Campaign</h3>
                    <p style="color:var(--text-muted);font-size:0.88rem;">
                        Send a custom announcement, new course release, or discount offer to all <strong>${activeCount} active subscribers</strong>. Every email automatically includes the mandatory one-click unsubscribe link at the footer.
                    </p>
                </div>

                <form id="broadcastForm" onsubmit="SubscribersModule.sendBroadcast(event)">
                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;">Campaign Subject *</label>
                        <input type="text" id="bcSubject" class="form-control" required placeholder="e.g. 🚀 New Free AI Workshop & Updated Prompt Library Available"
                               style="width:100%;padding:10px 14px;border-radius:8px;background: var(--input-bg);border:1px solid var(--border-strong);color: var(--text-main);" />
                    </div>

                    <div style="margin-bottom:20px;">
                        <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;">Message Content *</label>
                        <textarea id="bcBody" rows="7" class="form-control" required placeholder="Write your announcement or newsletter update here..."
                                  style="width:100%;padding:10px 14px;border-radius:8px;background: var(--input-bg);border:1px solid var(--border-strong);color: var(--text-main);font-family:inherit;resize:vertical;"></textarea>
                    </div>

                    <div id="bcFeedback" style="display:none;margin-bottom:14px;padding:10px;border-radius:6px;font-size:0.85rem;"></div>

                    <button type="submit" id="bcSubmitBtn" class="btn btn-primary" style="padding:10px 24px;font-weight:600;">
                        🚀 Send Campaign to ${activeCount} Subscribers
                    </button>
                </form>
            </div>
        `;
    },

    async saveConfig(e) {
        e.preventDefault();
        const btn = document.getElementById('cfgSubmitBtn');
        const feedback = document.getElementById('cfgFeedback');

        btn.disabled = true;
        btn.textContent = 'Saving...';
        feedback.style.display = 'none';

        try {
            const payload = {
                welcomeSubject: document.getElementById('cfgSubject').value.trim(),
                welcomeHeadline: document.getElementById('cfgHeadline').value.trim(),
                welcomeMessage: document.getElementById('cfgMessage').value.trim(),
                freeCourseUrl: document.getElementById('cfgCourseUrl').value.trim(),
                toolkitPdfUrl: document.getElementById('cfgPdfUrl').value.trim(),
                autoSendWelcome: document.getElementById('cfgAutoSend').checked
            };

            const res = await API.updateNewsletterConfig(payload);
            this.config = res.config || payload;

            feedback.style.background = 'var(--success-soft)';
            feedback.style.color = 'var(--success)';
            feedback.textContent = '✓ Template saved successfully! Future subscribers will receive these updated links.';
            feedback.style.display = 'block';
        } catch (error) {
            feedback.style.background = 'var(--danger-soft)';
            feedback.style.color = 'var(--danger)';
            feedback.textContent = error.message || 'Failed to save configuration';
            feedback.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = '💾 Save Welcome Email Template';
        }
    },

    async sendBroadcast(e) {
        e.preventDefault();
        const btn = document.getElementById('bcSubmitBtn');
        const feedback = document.getElementById('bcFeedback');
        const subject = document.getElementById('bcSubject').value.trim();
        const body = document.getElementById('bcBody').value.trim();

        if (!confirm(`Are you sure you want to broadcast this email to all active subscribers?`)) return;

        btn.disabled = true;
        btn.textContent = 'Broadcasting...';
        feedback.style.display = 'none';

        try {
            const res = await API.broadcastToSubscribers({ subject, bodyContent: body });
            feedback.style.background = 'var(--success-soft)';
            feedback.style.color = 'var(--success)';
            feedback.textContent = `✓ ${res.message || 'Campaign broadcast successfully!'}`;
            feedback.style.display = 'block';
            document.getElementById('bcSubject').value = '';
            document.getElementById('bcBody').value = '';
        } catch (error) {
            feedback.style.background = 'var(--danger-soft)';
            feedback.style.color = 'var(--danger)';
            feedback.textContent = error.message || 'Broadcast failed';
            feedback.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = '🚀 Send Campaign';
        }
    },

    async deleteSub(id, email) {
        if (!confirm(`Remove subscriber "${email}"?`)) return;
        try {
            await API.deleteSubscriber(id);
            App.navigateTo('subscribers');
        } catch (error) {
            alert('Failed to delete subscriber: ' + error.message);
        }
    },

    exportCsv() {
        if (!this.subscribers || this.subscribers.length === 0) {
            alert('No subscribers to export.');
            return;
        }

        const headers = ['Email', 'Name', 'Source', 'IsSubscribed', 'JoinedDate'];
        const rows = this.subscribers.map(s => [
            `"${s.email}"`,
            `"${(s.name || '').replace(/"/g, '""')}"`,
            `"${s.source || 'landing_page'}"`,
            s.isSubscribed !== false ? 'Active' : 'Unsubscribed',
            `"${new Date(s.createdAt).toISOString()}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `WIDETECHNOS_Subscribers_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
};
