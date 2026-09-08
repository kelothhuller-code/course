// Students Module
window.StudentsModule = {
    state: {
        users: []
    },

    async render() {
        try {
            const users = await API.getUsers();
            this.state.users = users;

            return `
                <div class="flex justify-between items-center" style="margin-bottom:24px;">
                    <h2>Registered Students</h2>
                    <input type="text" id="student-search" class="form-control" style="max-width:300px;" 
                           placeholder="Search by name or email..." onkeyup="StudentsModule.filter(this.value)">
                </div>

                <div class="panel">
                    <div class="table-wrapper">
                        <table class="table" id="students-table">
                            <thead>
                                <tr><th>Name</th><th>Email</th><th>Role</th><th>Courses Enrolled</th><th>Join Date</th></tr>
                            </thead>
                            <tbody id="students-tbody">
                                ${this.buildTableRows(users)}
                            </tbody>
                        </table>
                    </div>
                </div>
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
            <div class="flex justify-between items-center" style="margin-bottom:24px;">
                <div>
                    <h2>${user.name}</h2>
                    <div style="color:var(--text-muted);margin-top:4px;">${user.email} &nbsp;•&nbsp; Joined ${Helpers.formatDate(user.createdAt)}</div>
                </div>
                <button class="btn btn-secondary" onclick="App.navigateTo('students')">← Back to Students</button>
            </div>

            <div class="grid-cards" style="margin-bottom:24px;">
                ${Renderers.statCard('Total Money Paid', `₹${totalPaid}`, 'var(--success)')}
                ${Renderers.statCard('Courses Enrolled', user.enrolledCourses?.length || 0)}
                ${Renderers.statCard('Total Commission Earned', `₹${totalEarned}`, '#f59e0b')}
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
    }
};