// Coupons & Offers Management Module
window.CouponsModule = {
    async render() {
        try {
            const [couponsData, coursesData] = await Promise.all([
                API.getCoupons().catch(e => { console.error('getCoupons error:', e); return []; }),
                API.getCourses().catch(e => { console.error('getCourses error:', e); return []; })
            ]);

            const coupons = Array.isArray(couponsData) 
                ? couponsData 
                : (couponsData?.coupons || couponsData?.data || []);
            const courses = (window.Helpers && typeof Helpers.extractCourses === 'function')
                ? Helpers.extractCourses(coursesData)
                : (Array.isArray(coursesData) ? coursesData : (coursesData?.courses || coursesData?.data || []));

            const totalCoupons = coupons.length;
            const activeCoupons = coupons.filter(c => c && c.isActive).length;
            const totalRedemptions = coupons.reduce((sum, c) => sum + (c?.usedCount || 0), 0);

            let tableRows = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:32px; color:var(--text-muted);">
                        No coupons found. Click <strong>"+ Create New Coupon"</strong> above to issue your first promo code.
                    </td>
                </tr>
            `;

            if (coupons.length > 0) {
                tableRows = coupons.map(c => {
                    const isExpired = c.expiryDate && new Date(c.expiryDate) < new Date();
                    const discountDisplay = c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`;
                    const scopeDisplay = (!c.applicableCourses || c.applicableCourses.length === 0) 
                        ? '<span class="badge" style="background: var(--info-soft);color: var(--info);border:1px solid rgba(59,130,246,0.3);">All Courses</span>'
                        : c.applicableCourses.map(course => `<span class="badge" style="background: var(--primary-soft);color: var(--primary-text);border:1px solid rgba(139,92,246,0.3);">${Helpers.safeString(course.title || course, 'Course')}</span>`).join(' ');

                    const usageDisplay = c.usageLimit 
                        ? `${c.usedCount || 0} / ${c.usageLimit}` 
                        : `${c.usedCount || 0} / ∞`;

                    const expiryDisplay = c.expiryDate 
                        ? `<span style="color:${isExpired ? 'var(--danger)' : 'inherit'};">${new Date(c.expiryDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}${isExpired ? ' (Expired)' : ''}</span>`
                        : '<span style="color:var(--text-muted);">Never</span>';

                    const statusBadge = (!c.isActive || isExpired)
                        ? `<span class="badge" style="background: var(--danger-soft);color: var(--danger);">Inactive</span>`
                        : `<span class="badge" style="background: var(--success-soft);color: var(--success);">Active</span>`;

                    return `
                        <tr>
                            <td>
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <strong style="letter-spacing:0.5px;font-family:monospace;font-size:1.05rem;color: var(--info);background: var(--info-soft);padding:4px 8px;border-radius:6px;border:1px dashed rgba(56,189,248,0.3);">
                                        ${c.code}
                                    </strong>
                                    <button class="btn btn-sm" style="padding:2px 8px;font-size:0.75rem;background: var(--bg-subtle);" 
                                            onclick="CouponsModule.copyCode('${c.code}', this)" title="Copy Code">📋</button>
                                </div>
                            </td>
                            <td>
                                <span style="font-weight:700;color: var(--success);font-size:0.95rem;">${discountDisplay}</span>
                                <div style="font-size:0.75rem;color:var(--text-muted);">${c.discountType.toUpperCase()}</div>
                            </td>
                            <td>${scopeDisplay}</td>
                            <td>
                                <div style="font-weight:600;">${usageDisplay}</div>
                                <div style="font-size:0.72rem;color:var(--text-muted);">Max ${c.maxUsesPerUser || 1} per user</div>
                            </td>
                            <td>${expiryDisplay}</td>
                            <td>${statusBadge}</td>
                            <td>
                                <div style="display:flex;gap:6px;align-items:center;">
                                    <button class="btn btn-sm" 
                                            style="padding:5px 10px;font-size:0.8rem;background:${c.isActive ? 'var(--danger-soft)' : 'var(--success-soft)'};color:${c.isActive ? 'var(--danger)' : 'var(--success)'};border:1px solid ${c.isActive ? 'var(--danger-soft)' : 'var(--success-soft)'};"
                                            onclick="CouponsModule.toggleStatus('${c._id}', ${!c.isActive})">
                                        ${c.isActive ? 'Disable' : 'Enable'}
                                    </button>
                                    <button class="btn btn-sm" 
                                            style="padding:5px 8px;font-size:0.8rem;background: var(--danger-soft);color: var(--danger);border:1px solid var(--danger);"
                                            onclick="CouponsModule.deleteCoupon('${c._id}', '${c.code}')" title="Delete">
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }

            const courseOptions = (Array.isArray(courses) ? courses : []).map(c => `
                <option value="${c?._id}">${Helpers.safeString(c?.title)} (₹${c?.price || 0})</option>
            `).join('');

            return `
                <div class="content-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:16px;">
                    <div>
                        <h2 style="font-size:1.6rem;font-weight:700;margin-bottom:4px;">🎟️ Coupons & Offers Engine</h2>
                        <p style="color:var(--text-muted);font-size:0.9rem;">Create, track, and manage promotional discount coupons for student course checkout.</p>
                    </div>
                    <button class="btn btn-primary" onclick="CouponsModule.openCreateModal()" style="display:flex;align-items:center;gap:6px;padding:10px 18px;font-weight:600;">
                        <span>+</span> Create New Coupon
                    </button>
                </div>

                <!-- Metric Cards -->
                <div class="dashboard-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;margin-bottom:24px;">
                    <div class="stat-card" style="padding:18px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
                        <div class="stat-title" style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;font-weight:600;">Total Coupons</div>
                        <div style="font-size:1.9rem;font-weight:700;color:var(--text-main);margin-top:4px;">${totalCoupons}</div>
                    </div>
                    <div class="stat-card" style="padding:18px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
                        <div class="stat-title" style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;font-weight:600;">Active Coupons</div>
                        <div style="font-size:1.9rem;font-weight:700;color: var(--success);margin-top:4px;">${activeCoupons}</div>
                    </div>
                    <div class="stat-card" style="padding:18px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
                        <div class="stat-title" style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;font-weight:600;">Total Redemptions</div>
                        <div style="font-size:1.9rem;font-weight:700;color: var(--info);margin-top:4px;">${totalRedemptions}</div>
                    </div>
                    <div class="stat-card" style="padding:18px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
                        <div class="stat-title" style="color:var(--text-muted);font-size:0.82rem;text-transform:uppercase;font-weight:600;">GST Compliance</div>
                        <div style="font-size:1.1rem;font-weight:600;color: var(--warning);margin-top:8px;">Sec 15(3) CGST</div>
                        <div style="font-size:0.75rem;color:var(--text-muted);">Net value taxed at 18%</div>
                    </div>
                </div>

                <!-- Coupons Table -->
                <div class="card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden;">
                    <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="font-size:1.1rem;font-weight:600;">Active & Historical Coupon Codes</h3>
                    </div>
                    <div style="overflow-x:auto;">
                        <table class="table" style="width:100%;border-collapse:collapse;text-align:left;">
                            <thead>
                                <tr style="border-bottom:1px solid var(--border);color:var(--text-muted);font-size:0.8rem;text-transform:uppercase;">
                                    <th style="padding:14px 18px;">Coupon Code</th>
                                    <th style="padding:14px 18px;">Discount</th>
                                    <th style="padding:14px 18px;">Scope</th>
                                    <th style="padding:14px 18px;">Usage / Limit</th>
                                    <th style="padding:14px 18px;">Expiry</th>
                                    <th style="padding:14px 18px;">Status</th>
                                    <th style="padding:14px 18px;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Create Coupon Modal -->
                <div id="couponModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(4px);">
                    <div style="background: var(--bg-card);border:1px solid var(--border);width:100%;max-width:520px;border-radius:16px;padding:28px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.6);margin:20px;max-height:90vh;overflow-y:auto;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                            <h3 style="font-size:1.3rem;font-weight:700;">Create Promotional Coupon</h3>
                            <button onclick="CouponsModule.closeCreateModal()" style="background:none;border:none;color:var(--text-muted);font-size:1.5rem;cursor:pointer;">&times;</button>
                        </div>
                        <form id="createCouponForm" onsubmit="CouponsModule.handleSubmit(event)">
                            <div style="margin-bottom:16px;">
                                <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;color:var(--text-main);">Coupon Code *</label>
                                <input type="text" id="cpCode" class="form-control" placeholder="e.g. FLAT500 or SUMMER20" required 
                                       style="width:100%;text-transform:uppercase;font-family:monospace;font-weight:700;font-size:1rem;letter-spacing:1px;padding:10px 14px;border-radius:8px;background: var(--input-bg);border:1px solid var(--border-strong);color: var(--text-main);" />
                            </div>

                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                                <div>
                                    <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;color:var(--text-main);">Discount Type *</label>
                                    <select id="cpType" class="form-control" required style="width:100%;padding:10px 14px;border-radius:8px;background: var(--input-bg);border:1px solid var(--border-strong);color: var(--text-main);" onchange="CouponsModule.onTypeChange()">
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="flat">Flat Amount (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label id="cpValueLabel" style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;color:var(--text-main);">Discount Value (%) *</label>
                                    <input type="number" id="cpValue" class="form-control" min="1" max="100" placeholder="20" required 
                                           style="width:100%;padding:10px 14px;border-radius:8px;background: var(--input-bg);border:1px solid var(--border-strong);color: var(--text-main);" />
                                </div>
                            </div>

                            <div style="margin-bottom:16px;">
                                <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;color:var(--text-main);">Applicable Course</label>
                                <select id="cpCourse" class="form-control" style="width:100%;padding:10px 14px;border-radius:8px;background: var(--input-bg);border:1px solid var(--border-strong);color: var(--text-main);">
                                    <option value="">All Courses (Storewide)</option>
                                    ${courseOptions}
                                </select>
                            </div>

                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                                <div>
                                    <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;color:var(--text-main);">Overall Usage Limit</label>
                                    <input type="number" id="cpUsageLimit" class="form-control" min="1" placeholder="Unlimited" 
                                           style="width:100%;padding:10px 14px;border-radius:8px;background: var(--input-bg);border:1px solid var(--border-strong);color: var(--text-main);" />
                                    <small style="color:var(--text-muted);font-size:0.75rem;">Leave empty for infinite</small>
                                </div>
                                <div>
                                    <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;color:var(--text-main);">Max Per Student</label>
                                    <input type="number" id="cpMaxPerUser" class="form-control" min="1" value="1" 
                                           style="width:100%;padding:10px 14px;border-radius:8px;background: var(--input-bg);border:1px solid var(--border-strong);color: var(--text-main);" />
                                    <small style="color:var(--text-muted);font-size:0.75rem;">Default 1 prevents reuse</small>
                                </div>
                            </div>

                            <div style="margin-bottom:20px;">
                                <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;color:var(--text-main);">Expiry Date (Optional)</label>
                                <input type="date" id="cpExpiry" class="form-control" 
                                       style="width:100%;padding:10px 14px;border-radius:8px;background: var(--input-bg);border:1px solid var(--border-strong);color: var(--text-main);" />
                            </div>

                            <div id="cpError" style="display:none;color: var(--danger);font-size:0.85rem;margin-bottom:14px;padding:8px 12px;background: var(--danger-soft);border-radius:6px;"></div>

                            <div style="display:flex;justify-content:flex-end;gap:10px;">
                                <button type="button" class="btn" onclick="CouponsModule.closeCreateModal()" style="padding:10px 18px;background: var(--bg-subtle);color: var(--text-main);">Cancel</button>
                                <button type="submit" id="cpSubmitBtn" class="btn btn-primary" style="padding:10px 20px;font-weight:600;">Create Coupon</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('CouponsModule render error:', error);
            return `<div class="card" style="padding:24px;color: var(--danger);">Error loading coupons: ${error.message}</div>`;
        }
    },

    openCreateModal() {
        const modal = document.getElementById('couponModal');
        if (modal) modal.style.display = 'flex';
        const err = document.getElementById('cpError');
        if (err) err.style.display = 'none';
    },

    closeCreateModal() {
        const modal = document.getElementById('couponModal');
        if (modal) modal.style.display = 'none';
    },

    onTypeChange() {
        const type = document.getElementById('cpType').value;
        const label = document.getElementById('cpValueLabel');
        const input = document.getElementById('cpValue');
        if (type === 'flat') {
            label.textContent = 'Discount Amount (₹) *';
            input.placeholder = '500';
            input.removeAttribute('max');
        } else {
            label.textContent = 'Discount Value (%) *';
            input.placeholder = '20';
            input.setAttribute('max', '100');
        }
    },

    copyCode(code, btn) {
        navigator.clipboard.writeText(code).then(() => {
            const original = btn.textContent;
            btn.textContent = '✓ Copied';
            btn.style.color = 'var(--success)';
            setTimeout(() => {
                btn.textContent = original;
                btn.style.color = '';
            }, 1500);
        });
    },

    async handleSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('cpSubmitBtn');
        const err = document.getElementById('cpError');
        err.style.display = 'none';

        const code = document.getElementById('cpCode').value.trim();
        const discountType = document.getElementById('cpType').value;
        const discountValue = Number(document.getElementById('cpValue').value);
        const courseId = document.getElementById('cpCourse').value;
        const usageLimit = document.getElementById('cpUsageLimit').value ? Number(document.getElementById('cpUsageLimit').value) : null;
        const maxUsesPerUser = document.getElementById('cpMaxPerUser').value ? Number(document.getElementById('cpMaxPerUser').value) : 1;
        const expiryDate = document.getElementById('cpExpiry').value ? document.getElementById('cpExpiry').value : null;

        if (!code || isNaN(discountValue) || discountValue <= 0) {
            err.textContent = 'Please enter a valid coupon code and discount value.';
            err.style.display = 'block';
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Creating...';

        try {
            const payload = {
                code,
                discountType,
                discountValue,
                applicableCourses: courseId ? [courseId] : [],
                usageLimit,
                maxUsesPerUser,
                expiryDate,
                isActive: true
            };

            const result = await API.createCoupon(payload);
            if (result.message && !result.success && !result.coupon) {
                throw new Error(result.message);
            }

            this.closeCreateModal();
            // Refresh view
            App.navigateTo('coupons');
        } catch (error) {
            err.textContent = error.message || 'Failed to create coupon';
            err.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Create Coupon';
        }
    },

    async toggleStatus(id, newStatus) {
        try {
            await API.updateCoupon(id, { isActive: newStatus });
            App.navigateTo('coupons');
        } catch (error) {
            alert('Failed to update status: ' + error.message);
        }
    },

    async deleteCoupon(id, code) {
        if (!confirm(`Are you sure you want to permanently delete coupon "${code}"?`)) return;
        try {
            await API.deleteCoupon(id);
            App.navigateTo('coupons');
        } catch (error) {
            alert('Failed to delete coupon: ' + error.message);
        }
    }
};
