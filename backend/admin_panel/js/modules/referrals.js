// Referrals Module
window.ReferralsModule = {
    async render() {
        try {
            const [logs, users] = await Promise.all([
                API.getReferrals(),
                API.getUsers()
            ]);

            // Calculate totals
            const userList = Array.isArray(users) ? users : (users?.users || []);
            const totalCommission = (Array.isArray(logs) ? logs : []).reduce((a, l) => a + (l.commissionAmount || 0), 0);
            const totalOutstanding = userList.reduce((a, u) => a + (u.walletBalance || 0), 0);
            const totalSettled = totalCommission - totalOutstanding;

            // Build logs table
            let logsHtml = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No referral commissions recorded yet.</td></tr>';
            if (logs.length > 0) {
                logsHtml = logs.map(log => `
                    <tr>
                        <td>
                            <div style="font-weight:500;color:var(--primary);cursor:pointer;" 
                                 onclick="StudentsModule.renderDetails('${log.referrerId?._id}')">
                                ${Helpers.safeString(log.referrerId?.name, 'Unknown')}
                            </div>
                            <small style="color:var(--text-muted);">${Helpers.safeString(log.referrerId?.email)}</small>
                        </td>
                        <td>${Helpers.safeString(log.refereeId?.name, 'Unknown')}</td>
                        <td>${Helpers.safeString(log.courseId?.title, 'Unknown Course')}</td>
                        <td style="color:var(--success);font-weight:600;">₹${log.commissionAmount}</td>
                        <td style="color:var(--text-muted);">${Helpers.formatDate(log.createdAt)}</td>
                    </tr>
                `).join('');
            }

            // Build affiliate wallets
            const totalEarnedMap = {};
            logs.forEach(l => {
                const rid = l.referrerId?._id;
                if (rid) totalEarnedMap[rid] = (totalEarnedMap[rid] || 0) + l.commissionAmount;
            });

            const affiliatesWithBalance = users
                .filter(u => u.walletBalance > 0 || totalEarnedMap[u._id] > 0)
                .sort((a, b) => b.walletBalance - a.walletBalance);

            let affiliatesHtml = '<p style="color:var(--text-muted);">No active affiliates.</p>';
            if (affiliatesWithBalance.length > 0) {
                affiliatesHtml = affiliatesWithBalance.map(a => `
                    <div class="stat-card" style="padding:20px;">
                        <h4 style="margin-bottom:4px;color:var(--primary);cursor:pointer;" 
                            onclick="StudentsModule.renderDetails('${a._id}')">${a.name}</h4>
                        <div class="stat-title">${a.email}</div>
                        <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                            <div>
                                <div style="font-size:0.75rem;color:var(--text-muted);">TOTAL EARNED</div>
                                <div style="font-weight:700;color: var(--warning);">₹${totalEarnedMap[a._id] || 0}</div>
                            </div>
                            <div>
                                <div style="font-size:0.75rem;color:var(--text-muted);">OUTSTANDING</div>
                                <div style="font-weight:700;color:${a.walletBalance > 0 ? 'var(--danger)' : 'var(--success)'};">
                                    ₹${a.walletBalance}
                                </div>
                            </div>
                        </div>
                        ${a.walletBalance > 0 ? `
                        <div style="margin-top:12px;display:flex;gap:6px;">
                            <input type="number" id="ref-settle-${a._id}" class="form-control" 
                                   placeholder="Amount to settle" style="padding:6px 10px;font-size:0.85rem;" max="${a.walletBalance}">
                            <button class="btn btn-primary" style="padding:6px 12px;font-size:0.8rem;white-space:nowrap;" 
                                    onclick="ReferralsModule.settle('${a._id}')">Settle</button>
                        </div>
                        <div id="ref-settle-msg-${a._id}" style="font-size:0.75rem;margin-top:4px;"></div>` 
                        : '<div style="font-size:0.8rem;color:var(--success);margin-top:8px;">✓ Fully settled</div>'}
                    </div>
                `).join('');
            }

            return `
                <div class="flex justify-between items-center" style="margin-bottom:24px;">
                    <h2>Referrals & Affiliates</h2>
                </div>

                <div class="grid-cards" style="margin-bottom:24px;">
                    ${Renderers.statCard('Total Referral Transactions', logs.length)}
                    ${Renderers.statCard('Total Commission Issued', `₹${totalCommission}`, 'var(--warning)')}
                    ${Renderers.statCard('Total Settled', `₹${totalSettled}`, 'var(--success)')}
                    ${Renderers.statCard('Outstanding to Pay', `₹${totalOutstanding}`, 'var(--danger)')}
                </div>

                <h3 style="margin-bottom:16px;">Affiliate Wallets</h3>
                <div class="grid-cards" style="margin-bottom:32px;">${affiliatesHtml}</div>

                <div class="panel">
                    <div class="panel-header"><h3>All Commission Logs</h3></div>
                    <div class="table-wrapper">
                        <table class="table">
                            <thead><tr><th>Referrer</th><th>New Student</th><th>Course</th><th>Commission</th><th>Date</th></tr></thead>
                            <tbody>${logsHtml}</tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (error) {
            return Renderers.errorMessage(error.message);
        }
    },

    async settle(userId) {
        const input = document.getElementById(`ref-settle-${userId}`);
        const msgEl = document.getElementById(`ref-settle-msg-${userId}`);
        const amount = parseFloat(input?.value);

        if (!amount || amount <= 0) {
            if (msgEl) {
                msgEl.style.color = 'var(--danger)';
                msgEl.textContent = 'Enter a valid amount.';
            }
            return;
        }

        try {
            const data = await API.settleAffiliate(userId, amount);
            if (msgEl) {
                msgEl.style.color = 'var(--success)';
                msgEl.textContent = `✓ ${data.message}`;
            }
            setTimeout(() => this.render(), 1200);
        } catch (err) {
            if (msgEl) {
                msgEl.style.color = 'var(--danger)';
                msgEl.textContent = `Error: ${err.message}`;
            }
        }
    }
};