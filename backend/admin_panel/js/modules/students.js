// Students Module
window.StudentsModule = {
    state: {
        users: []
    },

    async render() {
        try {
            const res = await API.getUsers();
            const users = Array.isArray(res) ? res : (res?.users || []);
            this.state.users = users;

            return `
                <div class="flex justify-between items-center" style="margin-bottom:24px; flex-wrap:wrap; gap:12px;">
                    <div>
                        <h2>Registered Students</h2>
                        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:2px;">Manage students and send individual or broadcast emails</p>
                    </div>
                    <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                        <input type="text" id="student-search" class="form-control" style="max-width:220px;" 
                               placeholder="Search students..." onkeyup="StudentsModule.filter(this.value)">
                        <button class="btn btn-primary" onclick="StudentsModule.openEmailModal('', '', true)">
                            📢 Broadcast Email
                        </button>
                        <button class="btn btn-secondary" onclick="StudentsModule.openSmtpTestModal()">
                            ⚙️ Test SMTP
                        </button>
                    </div>
                </div>

                <div class="panel">
                    <div class="table-wrapper">
                        <table class="table" id="students-table">
                            <thead>
                                <tr><th>Name</th><th>Email</th><th>Role</th><th>Courses Enrolled</th><th>Join Date</th><th>Actions</th></tr>
                            </thead>
                            <tbody id="students-tbody">
                                ${this.buildTableRows(users)}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div id="email-modal-container"></div>
            `;
        } catch (error) {
            return Renderers.errorMessage(error.message);
        }
    },

    buildTableRows(users) {
        if (!users || users.length === 0) {
            return '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No students found.</td></tr>';
        }
        return users.map(user => Renderers.studentRow(user)).join('');
    },

    filter(query) {
        if (!this.state.users) return;
        const lowerQuery = query.toLowerCase();
        const filtered = this.state.users.filter(user =>
            user.name?.toLowerCase().includes(lowerQuery) ||
            user.email?.toLowerCase().includes(lowerQuery)
        );
        const tbody = document.getElementById('students-tbody');
        if (tbody) {
            tbody.innerHTML = this.buildTableRows(filtered);
        }
    },

  // In students.js - Update renderDetails
async renderDetails(userId) {
    if (!userId) {
        return Renderers.errorMessage('No user ID provided');
    }
    
    try {
        const data = await API.getUser(userId);
        const { user, transactions, totalPaid, referralLogs, totalEarned } = data;

        if (!user) {
            return Renderers.errorMessage('User not found');
        }

        const coursesHtml = user.enrolledCourses?.length > 0
            ? user.enrolledCourses.map(e => `
                <tr>
                    <td style="font-weight:500;">${Helpers.safeString(e.courseId?.title, 'Unknown')}</td>
                    <td>${Helpers.safeString(e.courseId?.category, '-')}</td>
                    <td>₹${e.courseId?.price || 0}</td>
                    <td>${Renderers.progressBar(e.progress, e.completed)}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No courses enrolled.</td></tr>';

        const txnsHtml = transactions?.length > 0
            ? transactions.map(t => `
                <tr>
                    <td style="font-size:0.85rem;color:var(--text-muted);">${t.txnid}</td>
                    <td>${t.itemType === 'course' ? 'Course' : 'Event'}</td>
                    <td style="color:var(--success);font-weight:600;">₹${t.amount}</td>
                    <td style="color:var(--text-muted);">${Helpers.formatDate(t.createdAt)}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No transactions found.</td></tr>';

        const referralHtml = referralLogs?.length > 0
            ? referralLogs.map(r => `
                <tr>
                    <td>${Helpers.safeString(r.refereeId?.name, '-')}</td>
                    <td style="color:var(--text-muted);">${Helpers.safeString(r.refereeId?.email, '-')}</td>
                    <td>${Helpers.safeString(r.courseId?.title, '-')}</td>
                    <td style="color:var(--success);font-weight:600;">₹${r.commissionAmount}</td>
                    <td style="color:var(--text-muted);">${Helpers.formatDate(r.createdAt)}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No referral commissions earned.</td></tr>';

        const walletBalance = user.walletBalance || 0;

        return `
            <div class="flex justify-between items-center" style="margin-bottom:24px; flex-wrap:wrap; gap:12px;">
                <div>
                    <h2>${user.name}</h2>
                    <div style="color:var(--text-muted);margin-top:4px;">${user.email} &nbsp;•&nbsp; Joined ${Helpers.formatDate(user.createdAt)}</div>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-primary" onclick="StudentsModule.openEmailModal('${(user.email || '').replace(/'/g, "\\'")}', '${(user.name || '').replace(/'/g, "\\'")}')">
                        ✉️ Send Email to Student
                    </button>
                    <button class="btn btn-secondary" onclick="App.navigateTo('students')">← Back to Students</button>
                </div>
            </div>

            <div class="grid-cards" style="margin-bottom:24px;">
                ${Renderers.statCard('Total Money Paid', `₹${totalPaid}`, 'var(--success)')}
                ${Renderers.statCard('Courses Enrolled', user.enrolledCourses?.length || 0)}
                ${Renderers.statCard('Total Commission Earned', `₹${totalEarned}`, 'var(--warning)')}
                ${Renderers.statCard('Outstanding Wallet Balance', `₹${walletBalance}`, walletBalance > 0 ? 'var(--danger)' : 'var(--text-muted)')}
            </div>

            ${walletBalance > 0 ? `
            <div style="margin-bottom:24px;padding:16px;background:var(--bg-muted);border-radius:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <span style="font-weight:600;">Settle Affiliate Commission:</span>
                <input type="number" id="settle-amount-${user._id}" class="form-control" 
                       placeholder="Amount to settle" style="flex:1;min-width:150px;padding:8px 12px;" max="${walletBalance}">
                <button class="btn btn-primary" onclick="StudentsModule.settleAffiliate('${user._id}')">Settle ₹</button>
                <div id="settle-msg-${user._id}" style="font-size:0.8rem;width:100%;"></div>
            </div>` : '<div style="color:var(--success);font-size:0.85rem;margin-bottom:24px;">✓ All commissions settled</div>'}

            <div class="panel">
                <div class="panel-header"><h3>Enrolled Courses & Progress</h3></div>
                <div class="table-wrapper">
                    <table class="table">
                        <thead><tr><th>Course</th><th>Category</th><th>Price</th><th>Progress</th></tr></thead>
                        <tbody>${coursesHtml}</tbody>
                    </table>
                </div>
            </div>

            <div class="panel">
                <div class="panel-header"><h3>Payment Transactions</h3></div>
                <div class="table-wrapper">
                    <table class="table">
                        <thead><tr><th>Txn ID</th><th>Type</th><th>Amount</th><th>Date</th></tr></thead>
                        <tbody>${txnsHtml}</tbody>
                    </table>
                </div>
            </div>

            ${totalEarned > 0 ? `
            <div class="panel">
                <div class="panel-header"><h3>Referral Commission History</h3></div>
                <div class="table-wrapper">
                    <table class="table">
                        <thead><tr><th>Referred User</th><th>Email</th><th>Course</th><th>Commission</th><th>Date</th></tr></thead>
                        <tbody>${referralHtml}</tbody>
                    </table>
                </div>
            </div>` : ''}
            <div id="email-modal-container"></div>
        `;
    } catch (err) {
        console.error('Error loading student details:', err);
        return Renderers.errorMessage(err.message);
    }
},

    async settleAffiliate(userId) {
        const input = document.getElementById(`settle-amount-${userId}`);
        const msgEl = document.getElementById(`settle-msg-${userId}`);
        const amount = parseFloat(input?.value);

        if (!amount || amount <= 0) {
            if (msgEl) {
                msgEl.style.color = 'var(--danger)';
                msgEl.textContent = 'Please enter a valid amount.';
            }
            return;
        }

        try {
            const data = await API.settleAffiliate(userId, amount);
            if (msgEl) {
                msgEl.style.color = 'var(--success)';
                msgEl.textContent = `✓ ${data.message}. New balance: ₹${data.newBalance}`;
            }
            setTimeout(() => this.renderDetails(userId), 1500);
        } catch (err) {
            if (msgEl) {
                msgEl.style.color = 'var(--danger)';
                msgEl.textContent = `Error: ${err.message}`;
            }
        }
    },

    openEmailModal(defaultEmail = '', defaultName = '', isBroadcast = false) {
        let container = document.getElementById('email-modal-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'email-modal-container';
            document.body.appendChild(container);
        }

        const studentCount = this.state.users?.length || 0;

        container.innerHTML = `
            <div class="admin-modal-backdrop" onclick="if(event.target === this) StudentsModule.closeModal()">
                <div class="admin-modal">
                    <div class="admin-modal-header">
                        <h3>${isBroadcast ? '📢 Broadcast Email to All Students' : `✉️ Email ${defaultName ? defaultName : 'Student'}`}</h3>
                        <button class="modal-close-btn" onclick="StudentsModule.closeModal()">&times;</button>
                    </div>
                    <div class="admin-modal-body">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:500;">
                                <input type="checkbox" id="modal-is-broadcast" ${isBroadcast ? 'checked' : ''} 
                                       onchange="StudentsModule.toggleBroadcastMode(this.checked)">
                                Broadcast to all registered students (${studentCount} student${studentCount !== 1 ? 's' : ''})
                            </label>
                        </div>

                        <div id="recipient-field-wrapper" style="${isBroadcast ? 'display:none;' : ''}">
                            <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:6px;">Recipient Email Address</label>
                            <input type="email" id="modal-email-recipient" class="form-control" 
                                   placeholder="student@example.com" value="${defaultEmail}">
                        </div>

                        <div>
                            <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:6px;">Subject</label>
                            <input type="text" id="modal-email-subject" class="form-control" 
                                   placeholder="e.g. Important Announcement: New Live AI Session">
                        </div>

                        <div>
                            <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:6px;">Email Message Body</label>
                            <textarea id="modal-email-body" class="form-control" rows="6" 
                                      placeholder="Type your message to the student(s) here..."></textarea>
                        </div>

                        <div id="email-modal-feedback" style="display:none; padding:10px 14px; border-radius:6px; font-size:0.85rem;"></div>
                    </div>
                    <div class="admin-modal-footer">
                        <button class="btn btn-secondary" onclick="StudentsModule.closeModal()">Cancel</button>
                        <button class="btn btn-primary" id="modal-send-btn" onclick="StudentsModule.submitEmail()">
                            Send Email
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    toggleBroadcastMode(isBroadcast) {
        const recipientWrapper = document.getElementById('recipient-field-wrapper');
        if (recipientWrapper) {
            recipientWrapper.style.display = isBroadcast ? 'none' : 'block';
        }
    },

    closeModal() {
        const container = document.getElementById('email-modal-container');
        if (container) {
            container.innerHTML = '';
        }
    },

    async submitEmail() {
        const isBroadcast = document.getElementById('modal-is-broadcast')?.checked || false;
        const recipientEmail = document.getElementById('modal-email-recipient')?.value?.trim();
        const subject = document.getElementById('modal-email-subject')?.value?.trim();
        const message = document.getElementById('modal-email-body')?.value?.trim();
        const feedbackEl = document.getElementById('email-modal-feedback');
        const sendBtn = document.getElementById('modal-send-btn');

        if (!subject || !message) {
            this.showFeedback('Subject and message body are required.', 'danger');
            return;
        }

        if (!isBroadcast && !recipientEmail) {
            this.showFeedback('Recipient email is required.', 'danger');
            return;
        }

        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.textContent = 'Sending...';
        }

        try {
            const res = await API.sendEmail({
                recipientEmail,
                subject,
                message,
                isBroadcast
            });

            if (res.success || res.message) {
                this.showFeedback(`✓ ${res.message || 'Email sent successfully!'}`, 'success');
                setTimeout(() => this.closeModal(), 1800);
            } else {
                this.showFeedback(res.message || 'Failed to send email.', 'danger');
                if (sendBtn) {
                    sendBtn.disabled = false;
                    sendBtn.textContent = 'Send Email';
                }
            }
        } catch (err) {
            this.showFeedback(`Error: ${err.message}`, 'danger');
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send Email';
            }
        }
    },

    openSmtpTestModal() {
        let container = document.getElementById('email-modal-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'email-modal-container';
            document.body.appendChild(container);
        }

        container.innerHTML = `
            <div class="admin-modal-backdrop" onclick="if(event.target === this) StudentsModule.closeModal()">
                <div class="admin-modal">
                    <div class="admin-modal-header">
                        <h3>⚙️ Test SMTP Mail Delivery</h3>
                        <button class="modal-close-btn" onclick="StudentsModule.closeModal()">&times;</button>
                    </div>
                    <div class="admin-modal-body">
                        <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:6px;">
                            Verify that your email credentials in <code>backend/.env</code> (Brevo, GoDaddy, or Gmail) are working properly by sending a live test email.
                        </p>
                        <div>
                            <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:6px;">Send Test Email To:</label>
                            <input type="email" id="smtp-test-email-input" class="form-control" 
                                   placeholder="your-personal-email@gmail.com">
                        </div>
                        <div id="smtp-test-feedback" style="display:none; padding:10px 14px; border-radius:6px; font-size:0.85rem; white-space:pre-wrap;"></div>
                    </div>
                    <div class="admin-modal-footer">
                        <button class="btn btn-secondary" onclick="StudentsModule.closeModal()">Close</button>
                        <button class="btn btn-primary" id="smtp-test-send-btn" onclick="StudentsModule.submitSmtpTest()">
                            Send Test Email
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    async submitSmtpTest() {
        const testEmail = document.getElementById('smtp-test-email-input')?.value?.trim();
        const feedbackEl = document.getElementById('smtp-test-feedback');
        const sendBtn = document.getElementById('smtp-test-send-btn');

        if (!testEmail) {
            this.showSmtpFeedback('Please enter an email address to receive the test email.', 'danger');
            return;
        }

        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.textContent = 'Verifying SMTP...';
        }

        try {
            const res = await API.testSmtp(testEmail);
            if (res.success) {
                this.showSmtpFeedback(`✓ ${res.message}`, 'success');
            } else {
                this.showSmtpFeedback(`❌ Error: ${res.message || 'SMTP Test failed'}\n${res.error || ''}`, 'danger');
            }
        } catch (err) {
            this.showSmtpFeedback(`❌ Connection Error: ${err.message}`, 'danger');
        } finally {
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send Test Email';
            }
        }
    },

    showFeedback(text, type = 'info') {
        const feedbackEl = document.getElementById('email-modal-feedback');
        if (!feedbackEl) return;
        feedbackEl.style.display = 'block';
        feedbackEl.style.background = type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)';
        feedbackEl.style.color = type === 'success' ? 'var(--success)' : 'var(--danger)';
        feedbackEl.style.border = type === 'success' ? '1px solid var(--success)' : '1px solid var(--danger)';
        feedbackEl.textContent = text;
    },

    showSmtpFeedback(text, type = 'info') {
        const feedbackEl = document.getElementById('smtp-test-feedback');
        if (!feedbackEl) return;
        feedbackEl.style.display = 'block';
        feedbackEl.style.background = type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)';
        feedbackEl.style.color = type === 'success' ? 'var(--success)' : 'var(--danger)';
        feedbackEl.style.border = type === 'success' ? '1px solid var(--success)' : '1px solid var(--danger)';
        feedbackEl.textContent = text;
    }
};