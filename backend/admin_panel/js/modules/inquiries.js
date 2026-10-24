// Inquiries & Support Messages Module
// All user-submitted fields are HTML-escaped before rendering: the contact form is public,
// so unescaped values were a stored-XSS risk inside the admin portal.
const escInquiry = (v) => Helpers.escapeHtml(v);

window.InquiriesModule = {
    messages: [],
    filters: { category: 'all', priority: '', status: '', from: '', to: '' },
    categories: [],
    expanded: {},

    STATUS: {
        new: ['New', 'var(--danger)', 'var(--danger-soft)'],
        contacted: ['Contacted', 'var(--info)', 'var(--info-soft)'],
        qualified: ['Qualified', 'var(--success)', 'var(--success-soft)'],
        closed: ['Closed', 'var(--text-muted)', 'var(--bg-hover)'],
    },
    normStatus(s) { return s === 'unread' ? 'new' : s === 'replied' ? 'contacted' : (s || 'new'); },

    query() {
        const p = new URLSearchParams();
        Object.entries(this.filters).forEach(([k, v]) => { if (v && v !== 'all') p.set(k, v); });
        const q = p.toString();
        return q ? `?${q}` : '';
    },

    async render() {
        try {
            const [raw, cats] = await Promise.all([
                API.get(`/api/leads/messages${this.query()}`),
                API.get('/api/admin/catalog/enquiry-categories').catch(() => ({ categories: [] })),
            ]);
            this.messages = Array.isArray(raw) ? raw : (raw?.data || []);
            this.categories = cats.categories || [];
            const f = this.filters;
            const count = (st) => this.messages.filter((m) => this.normStatus(m.status) === st).length;

            const rows = this.messages.length === 0
                ? `<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--text-muted);">No enquiries match these filters.</td></tr>`
                : this.messages.map((m) => {
                    const st = this.normStatus(m.status);
                    const [stLabel, stColor, stBg] = this.STATUS[st] || this.STATUS.new;
                    const pr = m.priority || '';
                    const prColor = pr === 'high' ? 'var(--danger)' : pr === 'medium' ? 'var(--warning)' : 'var(--text-muted)';
                    const dateStr = new Date(m.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const answers = (m.answers || []);
                    const open = this.expanded[m._id];
                    // The stored message ends with a plain-text copy of the answers (for email/reply context); hide that copy here
                    const summary = answers.map((a) => `${a.label}: ${a.value}`).join('\n');
                    const note = answers.length && m.message ? m.message.replace(summary, '').trim().replace(new RegExp(`^${(m.categoryLabel || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} enquiry$`), '').trim() : m.message;
                    return `
                        <tr>
                            <td style="font-weight:600;">
                                <div style="color:var(--text-main);font-size:0.95rem;">${escInquiry(m.name || '—')}</div>
                                <a href="mailto:${escInquiry(m.email || '')}" style="color:var(--primary);font-size:0.8rem;">${escInquiry(m.email)}</a>
                                ${m.phone ? `<div style="font-size:0.8rem;color:var(--text-muted);">📞 ${escInquiry(m.phone)}</div>` : ''}
                                ${m.company || m.country ? `<div style="font-size:0.78rem;color:var(--text-muted);">${escInquiry([m.company, m.country].filter(Boolean).join(' · '))}</div>` : ''}
                            </td>
                            <td>
                                <span class="badge" style="background: var(--primary-soft);color: var(--primary-text);font-size:0.75rem;">${escInquiry(m.categoryLabel || m.interest || 'General')}</span>
                                ${m.relatedTitle ? `<div style="margin-top:4px;font-size:0.75rem;color: var(--text-secondary);">${escInquiry(m.relatedTitle)}</div>` : ''}
                                <div style="margin-top:4px;font-size:0.72rem;color:var(--text-muted);">${escInquiry(m.source || '')}</div>
                            </td>
                            <td>${pr ? `<span style="color:${prColor};font-weight:700;text-transform:capitalize;">${escInquiry(pr)}</span><div style="font-size:0.72rem;color:var(--text-muted);">score ${Number(m.score) || 0}</div>` : '<span style="color:var(--text-muted);">—</span>'}</td>
                            <td style="max-width:380px;">
                                ${answers.length ? `
                                    <dl class="inq-answers ${open ? 'open' : ''}">
                                        ${(open ? answers : answers.slice(0, 3)).map((a) => `<div><dt>${escInquiry(a.label)}</dt><dd>${escInquiry(a.value)}</dd></div>`).join('')}
                                    </dl>
                                    ${answers.length > 3 || note ? `<button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:0.75rem;" onclick="InquiriesModule.toggle('${escInquiry(m._id)}')">${open ? 'Show less' : 'Show all answers'}</button>` : ''}
                                ` : `<div style="font-size:0.86rem;color: var(--text-secondary);line-height:1.4;${open ? '' : 'display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;'}white-space:pre-wrap;">${escInquiry(m.message)}</div>
                                   ${(m.message || '').length > 140 ? `<button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:0.75rem;" onclick="InquiriesModule.toggle('${escInquiry(m._id)}')">${open ? 'Show less' : 'Show full message'}</button>` : ''}`}
                                ${open && answers.length && note ? `<div style="margin-top:6px;font-size:0.8rem;color: var(--text-secondary);white-space:pre-wrap;"><strong>Message:</strong> ${escInquiry(note)}</div>` : ''}
                                ${m.replyMessage ? `<div style="margin-top:6px;font-size:0.75rem;color: var(--success);"><strong>Your reply:</strong> ${escInquiry(Helpers.truncate(m.replyMessage, 60))}</div>` : ''}
                            </td>
                            <td style="font-size:0.8rem;color:var(--text-muted);white-space:nowrap;">${dateStr}</td>
                            <td>
                                <select aria-label="Status" onchange="InquiriesModule.setStatus('${escInquiry(m._id)}', this.value)" style="background:${stBg};color:${stColor};border:1px solid ${stColor};border-radius:6px;padding:4px 6px;font-weight:600;">
                                    ${Object.entries(this.STATUS).map(([k, [l]]) => `<option value="${k}" ${k === st ? 'selected' : ''}>${l}</option>`).join('')}
                                </select>
                            </td>
                            <td>
                                <div style="display:flex;gap:6px;align-items:center;">
                                    <button class="btn btn-sm btn-primary" style="padding:6px 12px;font-size:0.8rem;" onclick="InquiriesModule.openReplyModal('${escInquiry(m._id)}')">✉️ Reply</button>
                                    <button class="btn btn-sm" style="padding:6px 8px;font-size:0.8rem;background: var(--danger-soft);color: var(--danger);border:1px solid var(--danger);" onclick="InquiriesModule.deleteMessage('${escInquiry(m._id)}')" title="Delete" aria-label="Delete">🗑️</button>
                                </div>
                            </td>
                        </tr>`;
                }).join('');

            const sel = (id, label, value, options) => `
                <label style="display:flex;flex-direction:column;gap:4px;font-size:0.75rem;color:var(--text-muted);">${label}
                    <select id="${id}" onchange="InquiriesModule.setFilter('${id.replace('inq-f-', '')}', this.value)" style="padding:6px 8px;border-radius:8px;background:var(--bg-card);color:var(--text-main);border:1px solid var(--border);">
                        ${options.map(([v, l]) => `<option value="${escInquiry(v)}" ${String(value) === String(v) ? 'selected' : ''}>${escInquiry(l)}</option>`).join('')}
                    </select></label>`;

            return `
                <div class="content-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:16px;">
                    <div>
                        <h2 style="font-size:1.6rem;font-weight:700;margin-bottom:4px;">📬 Enquiries</h2>
                        <p style="color:var(--text-muted);font-size:0.9rem;">Business enquiries (with their detailed answers) and contact messages. Edit the questions under <a href="#" onclick="App.navigateTo('enquiry-form');return false;" style="color:var(--primary);">Enquiry Form</a>.</p>
                    </div>
                    <button class="btn btn-secondary" onclick="InquiriesModule.exportCsv()">⬇ Export CSV (current filters)</button>
                </div>
                <div class="dashboard-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:12px;margin-bottom:18px;">
                    ${[['Shown', this.messages.length, 'var(--text-main)'], ['New', count('new'), 'var(--danger)'], ['Contacted', count('contacted'), 'var(--info)'], ['Qualified', count('qualified'), 'var(--success)'], ['High priority', this.messages.filter((m) => m.priority === 'high').length, 'var(--warning)']]
                        .map(([l, n, c]) => `<div class="stat-card" style="padding:14px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;"><div style="color:var(--text-muted);font-size:0.75rem;text-transform:uppercase;font-weight:600;">${l}</div><div style="font-size:1.6rem;font-weight:700;color:${c};">${n}</div></div>`).join('')}
                </div>
                <div class="card" style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;padding:14px 16px;margin-bottom:16px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
                    ${sel('inq-f-category', 'Category', f.category, [['all', 'All categories'], ...this.categories.map((c) => [c.key, c.label]), ['general', 'General contact (no category)']])}
                    ${sel('inq-f-priority', 'Priority', f.priority, [['', 'Any priority'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']])}
                    ${sel('inq-f-status', 'Status', f.status, [['', 'Any status'], ['new', 'New'], ['contacted', 'Contacted'], ['qualified', 'Qualified'], ['closed', 'Closed']])}
                    <label style="display:flex;flex-direction:column;gap:4px;font-size:0.75rem;color:var(--text-muted);">From<input type="date" value="${escInquiry(f.from)}" onchange="InquiriesModule.setFilter('from', this.value)" style="padding:5px 8px;border-radius:8px;background:var(--bg-card);color:var(--text-main);border:1px solid var(--border);"></label>
                    <label style="display:flex;flex-direction:column;gap:4px;font-size:0.75rem;color:var(--text-muted);">To<input type="date" value="${escInquiry(f.to)}" onchange="InquiriesModule.setFilter('to', this.value)" style="padding:5px 8px;border-radius:8px;background:var(--bg-card);color:var(--text-main);border:1px solid var(--border);"></label>
                    <button class="btn btn-sm btn-secondary" onclick="InquiriesModule.clearFilters()">Clear</button>
                </div>
                <div class="card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden;">
                    <div style="overflow-x:auto;">
                        <table class="table" style="width:100%;border-collapse:collapse;text-align:left;">
                            <thead>
                                <tr style="border-bottom:1px solid var(--border);color:var(--text-muted);font-size:0.8rem;text-transform:uppercase;">
                                    <th style="padding:14px 18px;">From</th>
                                    <th style="padding:14px 18px;">Category</th>
                                    <th style="padding:14px 18px;">Priority</th>
                                    <th style="padding:14px 18px;">Answers / message</th>
                                    <th style="padding:14px 18px;">Received</th>
                                    <th style="padding:14px 18px;">Status</th>
                                    <th style="padding:14px 18px;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>

                <!-- Reply Modal -->
                <div id="inquiryReplyModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(4px);">
                    <div style="background: var(--bg-card);border:1px solid var(--border);width:100%;max-width:560px;border-radius:16px;padding:26px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.6);margin:20px;max-height:90vh;overflow-y:auto;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                            <h3 style="font-size:1.25rem;font-weight:700;">Reply to Inquiry</h3>
                            <button onclick="InquiriesModule.closeReplyModal()" style="background:none;border:none;color:var(--text-muted);font-size:1.5rem;cursor:pointer;">&times;</button>
                        </div>
                        <div id="inquiryDetails" style="background: var(--bg-subtle);padding:14px;border-radius:8px;border:1px solid var(--border);margin-bottom:16px;font-size:0.88rem;"></div>
                        <form id="inquiryReplyForm" onsubmit="InquiriesModule.submitReply(event)">
                            <input type="hidden" id="replyMsgId" />
                            <div style="margin-bottom:14px;">
                                <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;">Your Reply Message *</label>
                                <textarea id="replyText" rows="6" class="form-control" required placeholder="Type your response to the student..."
                                          style="width:100%;padding:10px 14px;border-radius:8px;background: var(--input-bg);border:1px solid var(--border-strong);color: var(--text-main);font-family:inherit;font-size:0.9rem;resize:vertical;"></textarea>
                            </div>
                            <div id="replyModalError" style="display:none;color: var(--danger);font-size:0.85rem;margin-bottom:12px;padding:8px 12px;background: var(--danger-soft);border-radius:6px;"></div>
                            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                                <a id="directMailtoBtn" href="#" target="_blank" class="btn" style="background: var(--bg-subtle);color: var(--text-muted);font-size:0.82rem;text-decoration:none;padding:8px 14px;border-radius:6px;">
                                    ↗️ Open in Email App (Mailto)
                                </a>
                                <div style="display:flex;gap:8px;">
                                    <button type="button" class="btn" onclick="InquiriesModule.closeReplyModal()" style="padding:9px 16px;background: var(--bg-subtle);color: var(--text-main);">Cancel</button>
                                    <button type="submit" id="replySubmitBtn" class="btn btn-primary" style="padding:9px 18px;font-weight:600;">
                                        Send & Record Reply
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('InquiriesModule render error:', error);
            return `<div class="card" style="padding:24px;color: var(--danger);">Error loading inquiries: ${error.message}</div>`;
        }
    },

    setFilter(key, value) { this.filters[key] = value; App.navigateTo('inquiries'); },
    clearFilters() { this.filters = { category: 'all', priority: '', status: '', from: '', to: '' }; App.navigateTo('inquiries'); },
    toggle(id) { this.expanded[id] = !this.expanded[id]; App.navigateTo('inquiries'); },

    async setStatus(id, status) {
        try {
            await API.request(`/api/leads/messages/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
            const m = this.messages.find((x) => x._id === id);
            if (m) m.status = status;
        } catch (err) {
            alert('Could not update status: ' + err.message);
        }
    },

    async exportCsv() {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`/api/leads/messages/export${this.query()}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            if (!res.ok) throw new Error(`Export failed (${res.status})`);
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        } catch (err) {
            alert(err.message);
        }
    },

    openReplyModal(id) {
        const msg = this.messages.find(m => m._id === id);
        if (!msg) return;

        document.getElementById('replyMsgId').value = id;
        document.getElementById('inquiryDetails').innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <strong>${escInquiry(msg.name)}</strong>
                <span style="color:var(--text-muted);">${new Date(msg.createdAt).toLocaleDateString()}</span>
            </div>
            <div style="color:var(--primary);font-size:0.82rem;margin-bottom:6px;">📧 ${escInquiry(msg.email)}${msg.phone ? ` | 📞 ${escInquiry(msg.phone)}` : ''} | Topic: ${escInquiry(msg.subject)}${msg.interest ? ` | Interest: ${escInquiry(msg.interest)}` : ''}</div>
            <div style="color: var(--text-secondary);margin-top:6px;background: var(--bg-subtle);padding:8px;border-radius:6px;font-style:italic;white-space:pre-wrap;">"${escInquiry(msg.message)}"</div>
        `;

        document.getElementById('replyText').value = `Hi ${msg.name},\n\nThank you for contacting WIDETECHNOS Academy regarding "${msg.subject}".\n\n\n\nBest regards,\nWIDETECHNOS Academy Support Desk`;
        
        // Mailto prefill
        const mailto = `mailto:${encodeURIComponent(msg.email || '')}?subject=${encodeURIComponent('Re: ' + msg.subject + ' - WIDETECHNOS Support')}&body=${encodeURIComponent('Hi ' + msg.name + ',\n\n')}`;
        document.getElementById('directMailtoBtn').href = mailto;

        const modal = document.getElementById('inquiryReplyModal');
        if (modal) modal.style.display = 'flex';
        const err = document.getElementById('replyModalError');
        if (err) err.style.display = 'none';
    },

    closeReplyModal() {
        const modal = document.getElementById('inquiryReplyModal');
        if (modal) modal.style.display = 'none';
    },

    async submitReply(e) {
        e.preventDefault();
        const id = document.getElementById('replyMsgId').value;
        const text = document.getElementById('replyText').value;
        const btn = document.getElementById('replySubmitBtn');
        const err = document.getElementById('replyModalError');

        if (!text.trim()) return;

        btn.disabled = true;
        btn.textContent = 'Sending...';
        err.style.display = 'none';

        try {
            const res = await API.replyToInquiry(id, text);
            if (res.message && !res.success) throw new Error(res.message);
            this.closeReplyModal();
            App.navigateTo('inquiries');
        } catch (error) {
            err.textContent = error.message || 'Failed to send reply';
            err.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Send & Record Reply';
        }
    },

    async deleteMessage(id) {
        const name = (this.messages.find(m => m._id === id) || {}).name || 'this sender';
        if (!confirm(`Are you sure you want to delete inquiry from "${name}"?`)) return;
        try {
            await API.deleteInquiry(id);
            App.navigateTo('inquiries');
        } catch (error) {
            alert('Failed to delete inquiry: ' + error.message);
        }
    }
};
