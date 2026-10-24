// Dashboard Module with Interactive Analytics & Charts
window.DashboardModule = {
    async render() {
        try {
            const data = await API.getDashboard();
            const coursesData = await API.getCourses();
            const courses = Helpers.extractCourses(coursesData);

            const totalCourses = courses.length;
            const freeCourses = courses.filter(c => c.isFree).length;
            const paidCourses = totalCourses - freeCourses;

            const dailyTrend = data.dailyTrend || [];
            const topCourses = data.topCourses || [];
            const maxRev = Math.max(...dailyTrend.map(d => d.revenue), 1000);

            // Donut chart arc calculation for Course Composition
            const totalC = Math.max(totalCourses, 1);
            const paidPct = (paidCourses / totalC) * 100;
            const freePct = (freeCourses / totalC) * 100;
            const circumference = 2 * Math.PI * 36; // r=36 => 226.19
            const paidStroke = (paidPct / 100) * circumference;
            const freeStroke = (freePct / 100) * circumference;

            return `
                <!-- 1. Top KPI Stat Cards -->
                <div class="grid-cards" style="margin-bottom: 1.5rem;">
                    ${Renderers.statCard('Total Gross Revenue', `₹${(data.totalPayments || 0).toLocaleString('en-IN')}`, 'Gross collected before refunds')}
                    ${Renderers.statCard('Net Revenue (After Refunds)', `₹${(data.netRevenue || data.totalPayments || 0).toLocaleString('en-IN')}`, `${data.totalRefundsCount || 0} Credit Notes issued`)}
                    ${Renderers.statCard('Total Student Enrollments', data.totalEnrollments || 0, `${data.totalUsers || 0} registered accounts`)}
                    ${Renderers.statCard('Active Courses', `${totalCourses} Courses`, `${paidCourses} Paid • ${freeCourses} Free`)}
                </div>

                <!-- 2. Charts & Analytics Grid -->
                <div style="display: grid; grid-template-columns: 2fr 1.2fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                    
                    <!-- Chart 1: 7-Day Revenue Velocity (SVG Bar Chart) -->
                    <div class="panel" style="margin: 0; padding: 1.5rem;">
                        <div class="flex justify-between items-center" style="margin-bottom: 1rem;">
                            <div>
                                <h3 style="margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
                                    <span>📈</span> 7-Day Revenue & Enrollment Velocity
                                </h3>
                                <p style="margin: 0.2rem 0 0; font-size: 0.8rem; color: var(--text-muted);">Daily transactions and gross payment turnover</p>
                            </div>
                            <span class="badge" style="background: var(--info-soft); color: var(--info); border: 1px solid rgba(59, 130, 246, 0.3);">
                                Past 7 Days
                            </span>
                        </div>

                        <!-- SVG Bars -->
                        <div style="height: 190px; display: flex; align-items: flex-end; gap: 1rem; padding: 1rem 0.5rem 0.5rem; border-bottom: 1px solid var(--border);">
                            ${dailyTrend.map((d, idx) => {
                                const heightPct = Math.max(12, Math.min(100, (d.revenue / maxRev) * 100));
                                const isLatest = idx === dailyTrend.length - 1;
                                return `
                                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; gap: 0.4rem;">
                                        <span style="font-size: 0.72rem; color: ${isLatest ? 'var(--info)' : 'var(--text-muted)'}; font-weight: 600;">
                                            ₹${d.revenue > 0 ? (d.revenue >= 1000 ? (d.revenue / 1000).toFixed(1) + 'k' : d.revenue) : '0'}
                                        </span>
                                        <div 
                                            title="${d.day} (${d.date}): ₹${d.revenue} (${d.orders} orders, ${d.signups} signups)"
                                            style="
                                                width: 100%; 
                                                max-width: 38px; 
                                                height: ${heightPct}%; 
                                                background: ${isLatest ? 'linear-gradient(180deg, #38bdf8 0%, #2563eb 100%)' : 'linear-gradient(180deg, #6366f1 0%, #4338ca 100%)'}; 
                                                border-radius: 6px 6px 2px 2px;
                                                box-shadow: ${isLatest ? '0 0 12px rgba(56, 189, 248, 0.4)' : 'none'};
                                                cursor: pointer;
                                                transition: height 0.3s ease;
                                            "
                                        ></div>
                                        <span style="font-size: 0.75rem; color: ${isLatest ? 'var(--text-main)' : 'var(--text-muted)'}; font-weight: ${isLatest ? '700' : '500'};">
                                            ${d.day}
                                        </span>
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        <div class="flex justify-between items-center" style="margin-top: 1rem; font-size: 0.8rem; color: var(--text-muted);">
                            <span>📦 <strong>${dailyTrend.reduce((acc, d) => acc + d.orders, 0)}</strong> orders processed this week</span>
                            <span style="color: var(--success);">👥 +${dailyTrend.reduce((acc, d) => acc + d.signups, 0)} new student signups</span>
                        </div>
                    </div>

                    <!-- Chart 2: Course Catalog Composition (Donut Chart) -->
                    <div class="panel" style="margin: 0; padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <h3 style="margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
                                <span>🍩</span> Course Catalog Mix
                            </h3>
                            <p style="margin: 0.2rem 0 0; font-size: 0.8rem; color: var(--text-muted);">Distribution of Free vs Premium courses</p>
                        </div>

                        <div style="display: flex; align-items: center; justify-content: space-around; gap: 1rem; margin: 1.25rem 0;">
                            <div style="position: relative; width: 110px; height: 110px;">
                                <svg width="110" height="110" viewBox="0 0 90 90" style="transform: rotate(-90deg);">
                                    <circle cx="45" cy="45" r="36" fill="transparent" stroke="var(--chart-grid)" stroke-width="12"></circle>
                                    <circle cx="45" cy="45" r="36" fill="transparent" stroke="#3b82f6" stroke-width="12" stroke-dasharray="${paidStroke} ${circumference}" stroke-dashoffset="0"></circle>
                                    <circle cx="45" cy="45" r="36" fill="transparent" stroke="#10b981" stroke-width="12" stroke-dasharray="${freeStroke} ${circumference}" stroke-dashoffset="-${paidStroke}"></circle>
                                </svg>
                                <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                    <span style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${totalCourses}</span>
                                    <span style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase;">Total</span>
                                </div>
                            </div>

                            <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="width: 10px; height: 10px; border-radius: 3px; background: #3b82f6;"></span>
                                    <span style="color: var(--text-secondary);">Paid Courses:</span>
                                    <strong style="color: var(--text-main);">${paidCourses} (${paidPct.toFixed(0)}%)</strong>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="width: 10px; height: 10px; border-radius: 3px; background: #10b981;"></span>
                                    <span style="color: var(--text-secondary);">Free Courses:</span>
                                    <strong style="color: var(--text-main);">${freeCourses} (${freePct.toFixed(0)}%)</strong>
                                </div>
                            </div>
                        </div>

                        <button class="btn btn-secondary btn-sm" onclick="App.navigateTo('courses')" style="width: 100%; justify-content: center;">
                            Manage Course Offerings →
                        </button>
                    </div>

                </div>

                <!-- 3. Top Performing Courses Leaderboard -->
                <div class="panel" style="margin-bottom: 1.5rem;">
                    <div class="panel-header flex justify-between items-center">
                        <div>
                            <h3 style="margin: 0;">🏆 Top Performing Courses Leaderboard</h3>
                            <p style="margin: 0.2rem 0 0; font-size: 0.8rem; color: var(--text-muted);">Ranked by student enrollment volume and popularity</p>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="CoursesModule.renderForm()">+ Add New Course</button>
                    </div>

                    <div class="table-container" style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem; text-align: left;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border); color: var(--text-muted);">
                                    <th style="padding: 0.75rem;">Rank</th>
                                    <th style="padding: 0.75rem;">Course Title</th>
                                    <th style="padding: 0.75rem;">Category</th>
                                    <th style="padding: 0.75rem;">Pricing</th>
                                    <th style="padding: 0.75rem; text-align: right;">Total Students Enrolled</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${topCourses.map((c, i) => `
                                    <tr style="border-bottom: 1px solid var(--border);">
                                        <td style="padding: 0.75rem; font-weight: bold; color: ${i === 0 ? 'var(--warning)' : (i === 1 ? 'var(--text-muted)' : '#9a5b1e')};">
                                            #${i + 1}
                                        </td>
                                        <td style="padding: 0.75rem; font-weight: 600; color: var(--text-main);">
                                            ${c.title}
                                        </td>
                                        <td style="padding: 0.75rem; color: var(--text-muted);">
                                            ${c.category || 'General'}
                                        </td>
                                        <td style="padding: 0.75rem;">
                                            <span class="badge" style="background: ${c.isFree ? 'var(--success-soft)' : 'var(--info-soft)'}; color: ${c.isFree ? 'var(--success)' : 'var(--info)'};">
                                                ${c.isFree ? 'FREE' : `₹${c.price}`}
                                            </span>
                                        </td>
                                        <td style="padding: 0.75rem; text-align: right; font-weight: 700; color: var(--info);">
                                            👥 ${c.enrollments}
                                        </td>
                                    </tr>
                                `).join('')}
                                ${topCourses.length === 0 ? `
                                    <tr>
                                        <td colspan="5" style="padding: 2rem; text-align: center; color: var(--text-muted);">
                                            No course enrollments registered yet.
                                        </td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 4. Quick Administrative Actions -->
                <div class="panel">
                    <div class="panel-header flex justify-between items-center">
                        <h3 style="margin: 0;">⚡ Administrative Quick Operations</h3>
                        <button class="btn btn-secondary btn-sm" onclick="AuthModule.logout()">Sign Out</button>
                    </div>
                    <div class="flex gap-4" style="flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="CoursesModule.renderForm()">+ Create Course</button>
                        <button class="btn btn-secondary" onclick="App.navigateTo('gst-report')">🇮🇳 GST Invoices & Filings</button>
                        <button class="btn btn-secondary" onclick="App.navigateTo('students')">👥 Student Records</button>
                        <button class="btn btn-secondary" onclick="App.navigateTo('referrals')">💼 Affiliates & Commission</button>
                    </div>
                </div>
            `;
        } catch (error) {
            if (error.message !== 'Unauthorized') {
                console.error('Dashboard error:', error);
                return Renderers.errorMessage(error.message);
            }
            return '';
        }
    }
};