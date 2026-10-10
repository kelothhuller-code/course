// Inquiries & Support Messages Module
window.InquiriesModule = {
    messages: [],

    async render() {
        try {
            const raw = await API.getInquiries();
            this.messages = Array.isArray(raw) ? raw : (raw?.data || []);

            const total = this.messages.length;
            const unread = this.messages.filter(m => m.status === 'unread').length;
            const replied = this.messages.filter(m => m.status === 'replied').length;

            let rows = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">
                        No contact inquiries received yet. When students submit the contact form, their queries will appear here.
                    </td>
                </tr>
            `;

            if (this.messages.length > 0) {
                rows = this.messages.map(m => {
                    const isUnread = m.status === 'unread';
                    const statusBadge = isUnread
                        ? `<span class="badge" style="background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.3);">🔴 New / Unread</span>`
                        : `<span class="badge" style="background:rgba(16,185,129,0.2);color:#34d399;border:1px solid rgba(16,185,129,0.3);">✅ Replied</span>`;

                    const dateStr = new Date(m.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    });

                    return `
                        <tr style="${isUnread ? 'background:rgba(59,130,246,0.04);' : ''}">
                            <td style="font-weight:600;">
                                <div style="color:var(--text-main);font-size:0.95rem;">${Helpers.safeString(m.name, 'Student')}</div>
                                <a href="mailto:${m.email}" style="color:var(--primary);font-size:0.8rem;text-decoration:none;">${m.email}</a>
                            </td>
                            <td>
                                <span class="badge" style="background:rgba(139,92,246,0.15);color:#c084fc;font-size:0.75rem;">
                                    ${Helpers.safeString(m.subject, 'Inquiry')}
                                </span>
                            </td>
                            <td style="max-width:320px;">
                                <div style="font-size:0.86rem;color:#cbd5e1;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                                    ${Helpers.safeString(m.message)}
                                </div>
                                ${m.replyMessage ? `
                                    <div style="margin-top:6px;font-size:0.75rem;color:#10b981;background:rgba(16,185,129,0.08);padding:4px 8px;border-radius:4px;border-left:2px solid #10b981;">
                                        <strong>Your Reply:</strong> ${Helpers.truncate(m.replyMessage, 60)}
                                    </div>
                                ` : ''}
                            </td>
                            <td style="font-size:0.8rem;color:var(--text-muted);white-space:nowrap;">
                                ${dateStr}
                            </td>
                            <td>${statusBadge}</td>
                            <td>
                                <div style="display:flex;gap:6px;align-items:center;">
                                    <button class="btn btn-sm btn-primary" style="padding:6px 12px;font-size:0.8rem;"
                                            onclick="InquiriesModule.openReplyModal('${m._id}')">
                                        ✉️ Reply
                                    </button>
                                    <button class="btn btn-sm" style="padding:6px 8px;font-size:0.8rem;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);"
                                            onclick="InquiriesModule.deleteMessage('${m._id}', '${m.name}')" title="Delete">
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }

            return `
                <div class="content-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:16px;">
                    <div>
                        <h2 style="font-size:1.6rem;font-weight:700;margin-bottom:4px;">📬 Student Inquiries & Support Desk</h2>
                        <p style="color:var(--text-muted);font-size:0.9rem;">View contact form inquiries submitted from the website and reply directly via email.</p>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div class="dashboard-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;margin-bottom:24px;">
                    <div class="stat-card" style="padding:18px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
                        <div class="stat-title" style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;font-weight:600;">Total Inquiries</div>
                        <div style="font-size:1.9rem;font-weight:700;color:var(--text-main);margin-top:4px;">${total}</div>
                    </div>
                    <div class="stat-card" style="padding:18px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
                        <div class="stat-title" style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;font-weight:600;">Unread / Pending</div>
                        <div style="font-size:1.9rem;font-weight:700;color:#ef4444;margin-top:4px;">${unread}</div>
                    </div>
                    <div class="stat-card" style="padding:18px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
                        <div class="stat-title" style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;font-weight:600;">Replied & Resolved</div>
                        <div style="font-size:1.9rem;font-weight:700;color:#10b981;margin-top:4px;">${replied}</div>
                    </div>
                </div>

                <!-- Messages Table -->
                <div class="card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden;">
                    <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="font-size:1.1rem;font-weight:600;">Incoming Inquiries Inbox</h3>
                        <span style="font-size:0.8rem;color:var(--text-muted);">Syncs live with /contact page</span>
                    </div>
                    <div style="overflow-x:auto;">
                        <table class="table" style="width:100%;border-collapse:collapse;text-align:left;">
                            <thead>
                                <tr style="border-bottom:1px solid var(--border);color:var(--text-muted);font-size:0.8rem;text-transform:uppercase;">
                                    <th style="padding:14px 18px;">From</th>
                                    <th style="padding:14px 18px;">Topic / Subject</th>
                                    <th style="padding:14px 18px;">Message Content</th>
                                    <th style="padding:14px 18px;">Received</th>
                                    <th style="padding:14px 18px;">Status</th>
                                    <th style="padding:14px 18px;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Reply Modal -->
                <div id="inquiryReplyModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(4px);">
                    <div style="background:#1e293b;border:1px solid rgba(255,255,255,0.15);width:100%;max-width:560px;border-radius:16px;padding:26px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.6);margin:20px;max-height:90vh;overflow-y:auto;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                            <h3 style="font-size:1.25rem;font-weight:700;">Reply to Inquiry</h3>
                            <button onclick="InquiriesModule.closeReplyModal()" style="background:none;border:none;color:var(--text-muted);font-size:1.5rem;cursor:pointer;">&times;</button>
                        </div>
                        <div id="inquiryDetails" style="background:rgba(15,23,42,0.6);padding:14px;border-radius:8px;border:1px solid var(--border);margin-bottom:16px;font-size:0.88rem;"></div>
                        <form id="inquiryReplyForm" onsubmit="InquiriesModule.submitReply(event)">
                            <input type="hidden" id="replyMsgId" />
                            <div style="margin-bottom:14px;">
                                <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;">Your Reply Message *</label>
                                <textarea id="replyText" rows="6" class="form-control" required placeholder="Type your response to the student..."
                                          style="width:100%;padding:10px 14px;border-radius:8px;background:rgba(15,23,42,0.6);border:1px solid var(--border);color:#fff;font-family:inherit;font-size:0.9rem;resize:vertical;"></textarea>
                            </div>
                            <div id="replyModalError" style="display:none;color:#ef4444;font-size:0.85rem;margin-bottom:12px;padding:8px 12px;background:rgba(239,68,68,0.1);border-radius:6px;"></div>
                            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                                <a id="directMailtoBtn" href="#" target="_blank" class="btn" style="background:rgba(255,255,255,0.08);color:#94a3b8;font-size:0.82rem;text-decoration:none;padding:8px 14px;border-radius:6px;">
                                    ↗️ Open in Email App (Mailto)
                                </a>
                                <div style="display:flex;gap:8px;">
                                    <button type="button" class="btn" onclick="InquiriesModule.closeReplyModal()" style="padding:9px 16px;background:rgba(255,255,255,0.08);color:#fff;">Cancel</button>
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
            return `<div class="card" style="padding:24px;color:#ef4444;">Error loading inquiries: ${error.message}</div>`;
        }
    },

    openReplyModal(id) {
        const msg = this.messages.find(m => m._id === id);
        if (!msg) return;

        document.getElementById('replyMsgId').value = id;
        document.getElementById('inquiryDetails').innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <strong>${Helpers.safeString(msg.name)}</strong>
                <span style="color:var(--text-muted);">${new Date(msg.createdAt).toLocaleDateString()}</span>
            </div>
            <div style="color:var(--primary);font-size:0.82rem;margin-bottom:6px;">📧 ${msg.email} | Topic: ${msg.subject}</div>
            <div style="color:#cbd5e1;margin-top:6px;background:rgba(0,0,0,0.2);padding:8px;border-radius:6px;font-style:italic;">"${msg.message}"</div>
        `;

        document.getElementById('replyText').value = `Hi ${msg.name},\n\nThank you for contacting WIDETECHNOS Academy regarding "${msg.subject}".\n\n\n\nBest regards,\nWIDETECHNOS Academy Support Desk`;
        
        // Mailto prefill
        const mailto = `mailto:${msg.email}?subject=${encodeURIComponent('Re: ' + msg.subject + ' - WIDETECHNOS Support')}&body=${encodeURIComponent('Hi ' + msg.name + ',\n\n')}`;
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

    async deleteMessage(id, name) {
        if (!confirm(`Are you sure you want to delete inquiry from "${name}"?`)) return;
        try {
            await API.deleteInquiry(id);
            App.navigateTo('inquiries');
        } catch (error) {
            alert('Failed to delete inquiry: ' + error.message);
        }
    }
};
