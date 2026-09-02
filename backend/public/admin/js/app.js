// Admin Application State and Router
const App = {
    viewContainer: document.getElementById('view-container'),
    breadcrumb: document.getElementById('breadcrumb'),
    
    state: {
        token: localStorage.getItem('adminToken') || null,
        currentCourseId: null, // Store current course ID for replies
    },

    // Initialize
    init() {
        this.setupNavigation();
        if (!this.state.token) {
            this.navigateTo('login');
        } else {
            this.navigateTo('dashboard');
        }
    },

    // Setup navigation clicks
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.state.token) return;
                
                const view = e.currentTarget.getAttribute('data-view');
                
                // Update active state
                navItems.forEach(n => n.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                this.navigateTo(view);
            });
        });
    },

    // Helper for API calls with token
    async fetchAPI(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        
        if (this.state.token) {
            headers['Authorization'] = `Bearer ${this.state.token}`;
        }
        
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            this.logout();
            throw new Error('Unauthorized');
        }
        return response;
    },

    logout() {
        this.state.token = null;
        localStorage.removeItem('adminToken');
        this.navigateTo('login');
    },

    // Router
    async navigateTo(view) {
        this.viewContainer.innerHTML = '<div class="loading">Loading...</div>';
        
        if (view !== 'login' && !this.state.token) {
            view = 'login';
        }

        switch(view) {
            case 'login':
                this.breadcrumb.textContent = 'Login';
                this.renderLogin();
                break;
            case 'dashboard':
                this.breadcrumb.textContent = 'Dashboard';
                await this.renderDashboard();
                break;
            case 'courseDetails':
                this.breadcrumb.textContent = 'Course Details';
                break;
            case 'courses':
                this.breadcrumb.textContent = 'Manage Courses';
                await this.renderCourses();
                break;
            case 'students':
                this.breadcrumb.textContent = 'Students Overview';
                await this.renderStudents();
                break;
            case 'referrals':
                this.breadcrumb.textContent = 'Referrals & Affiliates';
                await this.renderReferrals();
                break;
            default:
                this.viewContainer.innerHTML = '<h2>View not found</h2>';
        }
    },

    // Views
    renderLogin() {
        this.viewContainer.innerHTML = `
            <div class="panel" style="max-width: 400px; margin: 0 auto; margin-top: 50px;">
                <h3 style="text-align: center; margin-bottom: 24px;">Super Admin Login</h3>
                <form id="login-form">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="text" id="login-email" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" id="login-password" class="form-control" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Login</button>
                    <div id="login-error" class="text-danger" style="margin-top: 12px; text-align: center;"></div>
                </form>
            </div>
        `;

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                
                if (res.ok && data.token) {
                    this.state.token = data.token;
                    localStorage.setItem('adminToken', data.token);
                    this.navigateTo('dashboard');
                } else {
                    document.getElementById('login-error').textContent = data.message || 'Login failed';
                }
            } catch (err) {
                document.getElementById('login-error').textContent = 'Server error during login';
            }
        });
    },

    async renderDashboard() {
        try {
            const res = await this.fetchAPI('/api/admin/dashboard');
            const data = await res.json();
            
            this.viewContainer.innerHTML = `
                <div class="grid-cards">
                    <div class="stat-card">
                        <div class="stat-title">Total Enrolled Users</div>
                        <div class="stat-value">${data.totalEnrollments || 0}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">Total Payments (INR)</div>
                        <div class="stat-value">₹${data.totalPayments || 0}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">Total Courses</div>
                        <div class="stat-value">${data.totalCourses || 0}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">Free / Paid Courses</div>
                        <div class="stat-value">${data.freeCourses || 0} / ${data.paidCourses || 0}</div>
                    </div>
                </div>
                
                <div class="panel">
                    <div class="panel-header flex justify-between items-center">
                        <h3>Quick Actions</h3>
                        <button class="btn btn-secondary" onclick="App.logout()">Logout</button>
                    </div>
                    <div class="flex gap-4">
                        <button class="btn btn-primary" onclick="App.renderCourseForm()">+ Add New Course</button>
                    </div>
                </div>
            `;
        } catch (error) {
            if(error.message !== 'Unauthorized') {
                this.viewContainer.innerHTML = `<div class="panel text-danger">Error loading dashboard: ${error.message}</div>`;
            }
        }
    },

    async renderCourses() {
        try {
            const res = await this.fetchAPI('/api/courses');
            const courses = await res.json();
            
            let coursesHtml = courses.map(c => `
                <div class="stat-card" style="display:flex;flex-direction:row;justify-content:space-between;align-items:center;padding:16px">
                    <div style="flex:1;min-width:0">
                        <h4 style="margin-bottom:4px">${c.title} <span class="badge" style="background:${c.isFree ? 'var(--success)' : 'var(--primary)'}">${c.isFree ? 'FREE' : 'PAID'}</span></h4>
                        <div class="stat-title">${c.category} &bull; ₹${c.price} &bull; ${c.type}</div>
                        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">${(c.content || []).reduce((n, lang) => n + (lang.chapters?.length || 0), 0)} chapters across ${(c.languages || []).join(', ') || 'N/A'}</div>
                    </div>
                    <div style="display:flex;gap:8px;flex-shrink:0;margin-left:16px">
                        <button class="btn btn-secondary" onclick="App.renderCourseContent('${c._id}')">▶ View Content</button>
                        <button class="btn btn-secondary" onclick="App.renderCourseDetails('${c._id}')">&#128202; Stats</button>
                        <button class="btn btn-secondary" onclick="App.renderCourseForm('${c._id}')">&#9998; Edit</button>
                    </div>
                </div>
            `).join('');

            if(courses.length === 0) coursesHtml = '<p style="color:var(--text-muted)">No courses found.</p>';

            this.viewContainer.innerHTML = `
                <div class="flex justify-between items-center" style="margin-bottom:24px">
                    <h2>All Courses &amp; Content</h2>
                    <button class="btn btn-primary" onclick="App.renderCourseForm()">+ Create Course</button>
                </div>
                <div style="display:flex;flex-direction:column;gap:16px">${coursesHtml}</div>
            `;
        } catch (error) {
            this.viewContainer.innerHTML = `<div class="panel" style="color:var(--danger)">Error loading courses: ${error.message}</div>`;
        }
    },

    async renderCourseContent(courseId) {
        this.breadcrumb.textContent = 'Course Content Player';
        this.viewContainer.innerHTML = '<div class="loading">Loading course content...</div>';
        try {
            const res = await this.fetchAPI(`/api/admin/courses/${courseId}/content`);
            const course = await res.json();

            const getEmbedUrl = (url) => {
                if (!url) return null;
                if (url.includes('youtube.com/watch?v=')) return `https://www.youtube.com/embed/${url.split('v=')[1]?.split('&')[0]}`;
                if (url.includes('youtu.be/')) return `https://www.youtube.com/embed/${url.split('youtu.be/')[1]?.split('?')[0]}`;
                if (url.includes('drive.google.com')) return url.replace('/view', '/preview');
                return url;
            };

            // Default: first chapter of first language
            const firstLang = course.content?.[0];
            const firstChapter = firstLang?.chapters?.[0];
            const defaultVideoUrl = firstChapter?.videoUrl || firstChapter?.driveLink || firstChapter?.materials?.[0]?.link;

            const langTabsHtml = (course.content || []).map((lang, li) =>
                `<button class="btn ${li === 0 ? 'btn-primary' : 'btn-secondary'}" id="lang-tab-${li}" onclick="App.switchLanguage(${li})" style="padding:6px 14px;font-size:0.85rem">${lang.language}</button>`
            ).join('');

            // Build chapter lists (hidden for all except first)
            const chapterListsHtml = (course.content || []).map((lang, li) => `
                <div id="lang-content-${li}" style="display:${li === 0 ? 'block' : 'none'}">
                    ${(lang.chapters || []).length === 0 
                        ? '<p style="color:var(--text-muted);padding:12px">No chapters yet.</p>'
                        : lang.chapters.map((ch, ci) => {
                            const vidUrl = ch.videoUrl || ch.driveLink || ch.materials?.[0]?.link;
                            return `
                            <div class="chapter-item" id="chapter-${li}-${ci}"
                                style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:8px;cursor:pointer;transition:background 0.2s"
                                onclick="App.playChapter(${li}, ${ci}, ${JSON.stringify(vidUrl || '').replace(/"/g, '&quot;')})"
                                onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                                <div style="width:32px;height:32px;border-radius:50%;background:var(--primary);opacity:0.7;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.75rem;font-weight:700">${ci + 1}</div>
                                <div style="flex:1;min-width:0">
                                    <div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ch.title}</div>
                                    ${ch.duration ? `<small style="color:var(--text-muted)">${ch.duration}</small>` : ''}
                                </div>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--primary)" style="flex-shrink:0"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            </div>`;
                        }).join('')}
                </div>`
            ).join('');

            this.state.courseContent = course;
            this.state.currentLang = 0;

            this.viewContainer.innerHTML = `
                <div class="flex justify-between items-center" style="margin-bottom:20px">
                    <div>
                        <h2>${course.title}</h2>
                        <div style="color:var(--text-muted);font-size:0.9rem;margin-top:2px">${course.category} &bull; ${course.type} &bull; ₹${course.price}</div>
                    </div>
                    <button class="btn btn-secondary" onclick="App.navigateTo('courses')">← Back</button>
                </div>

                <div style="display:grid;grid-template-columns:1fr 340px;gap:24px;align-items:start">
                    <!-- Video Player -->
                    <div>
                        <div id="course-player" style="background:#000;border-radius:16px;overflow:hidden;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center">
                            ${defaultVideoUrl 
                                ? `<iframe id="player-iframe" src="${getEmbedUrl(defaultVideoUrl)}" style="width:100%;height:100%;border:none" allowfullscreen></iframe>`
                                : `<div style="color:var(--text-muted);text-align:center"><svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/></svg><br>Select a chapter to play</div>`
                            }
                        </div>
                        <div id="playing-title" style="margin-top:12px;font-weight:600;font-size:1.1rem">${firstChapter?.title || 'Select a chapter'}</div>
                        ${firstChapter?.description ? `<div style="color:var(--text-muted);font-size:0.9rem;margin-top:4px">${firstChapter.description}</div>` : ''}

                        ${(course.outcomes && course.outcomes.length > 0) ? `
                        <div class="panel" style="margin-top:20px">
                            <div class="panel-header"><h3>Course Benefits</h3></div>
                            <ul style="list-style:none;display:flex;flex-direction:column;gap:10px">
                                ${course.outcomes.map(o => `
                                    <li style="display:flex;align-items:center;gap:10px">
                                        <span style="width:20px;height:20px;background:var(--primary);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">
                                            <svg viewBox="0 0 24 24" width="12" height="12" fill="white"><polyline points="20 6 9 17 4 12" stroke="white" stroke-width="2" fill="none"/></svg>
                                        </span>
                                        ${o}
                                    </li>`).join('')}
                            </ul>
                        </div>` : ''}
                    </div>

                    <!-- Chapter List Sidebar -->
                    <div class="panel" style="padding:16px;max-height:600px;overflow-y:auto">
                        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">${langTabsHtml || '<span style="color:var(--text-muted)">No languages</span>'}</div>
                        <div id="chapters-container">${chapterListsHtml || '<p style="color:var(--text-muted)">No content available.</p>'}</div>
                    </div>
                </div>
            `;
        } catch (err) {
            this.viewContainer.innerHTML = `<div class="panel" style="color:var(--danger)">Error loading course: ${err.message}</div>`;
        }
    },

    switchLanguage(langIndex) {
        // Hide all language contents
        const course = this.state.courseContent;
        if (!course) return;
        course.content.forEach((_, i) => {
            const el = document.getElementById(`lang-content-${i}`);
            const btn = document.getElementById(`lang-tab-${i}`);
            if (el) el.style.display = 'none';
            if (btn) { btn.className = 'btn btn-secondary'; btn.style.padding = '6px 14px'; btn.style.fontSize = '0.85rem'; }
        });
        const target = document.getElementById(`lang-content-${langIndex}`);
        const activeBtn = document.getElementById(`lang-tab-${langIndex}`);
        if (target) target.style.display = 'block';
        if (activeBtn) activeBtn.className = 'btn btn-primary';
        this.state.currentLang = langIndex;
    },

    playChapter(langIndex, chIndex, videoUrl) {
        const player = document.getElementById('course-player');
        const titleEl = document.getElementById('playing-title');
        const course = this.state.courseContent;
        const chapter = course?.content?.[langIndex]?.chapters?.[chIndex];

        if (titleEl && chapter) titleEl.textContent = chapter.title;

        const getEmbedUrl = (url) => {
            if (!url) return null;
            if (url.includes('youtube.com/watch?v=')) return `https://www.youtube.com/embed/${url.split('v=')[1]?.split('&')[0]}`;
            if (url.includes('youtu.be/')) return `https://www.youtube.com/embed/${url.split('youtu.be/')[1]?.split('?')[0]}`;
            if (url.includes('drive.google.com')) return url.replace('/view', '/preview');
            return url;
        };

        if (player) {
            if (videoUrl) {
                const embed = getEmbedUrl(videoUrl);
                player.innerHTML = `<iframe src="${embed}" style="width:100%;height:100%;border:none" allowfullscreen allow="autoplay"></iframe>`;
            } else {
                player.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:40px">No video for this chapter.</div>`;
            }
        }

        // Highlight active chapter
        document.querySelectorAll('.chapter-item').forEach(el => el.style.background = 'transparent');
        const activeItem = document.getElementById(`chapter-${langIndex}-${chIndex}`);
        if (activeItem) activeItem.style.background = 'rgba(59,130,246,0.15)';
    },

    async renderStudents() {
        this.viewContainer.innerHTML = '<div class="loading">Loading Students...</div>';
        try {
            const res = await this.fetchAPI('/api/admin/users');
            const users = await res.json();
            
            // Store users globally for search filtering
            this.state.users = users;

            this.viewContainer.innerHTML = `
                <div class="flex justify-between items-center" style="margin-bottom: 24px;">
                    <h2>Registered Students</h2>
                    <input type="text" id="student-search" class="form-control" style="max-width: 300px;" placeholder="Search by name or email..." onkeyup="App.filterStudents(this.value)">
                </div>

                <div class="panel">
                    <div class="table-wrapper">
                        <table class="table" id="students-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Courses Enrolled</th>
                                    <th>Join Date</th>
                                </tr>
                            </thead>
                            <tbody id="students-tbody">
                                <!-- Populated by JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            this.renderStudentsTable(users);
        } catch (error) {
            this.viewContainer.innerHTML = `<div class="panel text-danger">Error loading students: ${error.message}</div>`;
        }
    },

    renderStudentsTable(users) {
        const tbody = document.getElementById('students-tbody');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No students found.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr style="cursor:pointer;" onclick="App.renderStudentDetails('${user._id}')">
                <td style="font-weight: 500;">
                    <span style="color:var(--primary)">${user.name}</span>
                </td>
                <td style="color: var(--text-muted);">${user.email}</td>
                <td><span class="badge" style="background: ${user.role === 'admin' ? 'var(--primary)' : '#64748b'}">${user.role.toUpperCase()}</span></td>
                <td>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 600;">${user.enrolledCourses ? user.enrolledCourses.length : 0} Courses</span>
                        ${user.enrolledCourses && user.enrolledCourses.length > 0 
                            ? `<small style="color: var(--text-muted);">${user.enrolledCourses.map(c => c.courseId?.title).filter(Boolean).join(', ')}</small>` 
                            : ''}
                    </div>
                </td>
                <td style="color: var(--text-muted);">${new Date(user.createdAt).toLocaleDateString()}</td>
            </tr>
        `).join('');
    },

    filterStudents(query) {
        if (!this.state.users) return;
        const lowerQuery = query.toLowerCase();
        
        const filtered = this.state.users.filter(user => 
            user.name.toLowerCase().includes(lowerQuery) || 
            user.email.toLowerCase().includes(lowerQuery)
        );
        
        this.renderStudentsTable(filtered);
    },

    async renderStudentDetails(userId) {
        this.breadcrumb.textContent = 'Student Profile';
        this.viewContainer.innerHTML = '<div class="loading">Loading student data...</div>';
        try {
            const res = await this.fetchAPI(`/api/admin/users/${userId}`);
            const data = await res.json();
            const { user, transactions, totalPaid, referralLogs, totalEarned } = data;

            // Build enrolled courses table
            const coursesHtml = (user.enrolledCourses && user.enrolledCourses.length > 0)
                ? user.enrolledCourses.map(e => `
                    <tr>
                        <td style="font-weight:500;">${e.courseId?.title || 'Unknown'}</td>
                        <td>${e.courseId?.category || '-'}</td>
                        <td>₹${e.courseId?.price || 0}</td>
                        <td>
                            <div class="progress-container">
                                <div class="progress-bar ${e.completed ? 'completed' : ''}" style="width:${e.progress}%"></div>
                            </div>
                            <small style="color:var(--text-muted)">${e.progress}% ${e.completed ? '✓ Completed' : ''}</small>
                        </td>
                    </tr>`).join('')
                : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No courses enrolled.</td></tr>';

            // Build transactions table
            const txnsHtml = transactions.length > 0
                ? transactions.map(t => `
                    <tr>
                        <td style="font-size:0.85rem;color:var(--text-muted)">${t.txnid}</td>
                        <td>${t.itemType === 'course' ? 'Course' : 'Event'}</td>
                        <td style="color:var(--success);font-weight:600">₹${t.amount}</td>
                        <td style="color:var(--text-muted)">${new Date(t.createdAt).toLocaleDateString()}</td>
                    </tr>`).join('')
                : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No transactions found.</td></tr>';

            // Build referral history
            const referralHtml = referralLogs.length > 0
                ? referralLogs.map(r => `
                    <tr>
                        <td>${r.refereeId?.name || '-'}</td>
                        <td style="color:var(--text-muted)">${r.refereeId?.email || '-'}</td>
                        <td>${r.courseId?.title || '-'}</td>
                        <td style="color:var(--success);font-weight:600">₹${r.commissionAmount}</td>
                        <td style="color:var(--text-muted)">${new Date(r.createdAt).toLocaleDateString()}</td>
                    </tr>`).join('')
                : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No referral commissions earned.</td></tr>';

            const walletBalance = user.walletBalance || 0;
            const outstanding = walletBalance;

            this.viewContainer.innerHTML = `
                <div class="flex justify-between items-center" style="margin-bottom:24px">
                    <div>
                        <h2>${user.name}</h2>
                        <div style="color:var(--text-muted);margin-top:4px">${user.email} &nbsp;•&nbsp; Joined ${new Date(user.createdAt).toLocaleDateString()}</div>
                    </div>
                    <button class="btn btn-secondary" onclick="App.navigateTo('students')">← Back</button>
                </div>

                <div class="grid-cards" style="margin-bottom:24px">
                    <div class="stat-card">
                        <div class="stat-title">Total Money Paid</div>
                        <div class="stat-value" style="color:var(--success)">₹${totalPaid}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">Courses Enrolled</div>
                        <div class="stat-value">${user.enrolledCourses?.length || 0}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">Total Commission Earned</div>
                        <div class="stat-value" style="color:#f59e0b">₹${totalEarned}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">Outstanding Wallet Balance</div>
                        <div class="stat-value" style="color:${outstanding > 0 ? 'var(--danger)' : 'var(--text-muted)'}">
                            ₹${outstanding}
                        </div>
                        ${outstanding > 0 ? `
                        <div style="margin-top:12px;display:flex;gap:8px;align-items:center">
                            <input type="number" id="settle-amount-${user._id}" class="form-control" placeholder="Amount to settle" style="flex:1;padding:8px 12px" max="${outstanding}">
                            <button class="btn btn-primary" style="white-space:nowrap" onclick="App.settleAffiliate('${user._id}', '${user.name}')">Settle ₹</button>
                        </div>
                        <div id="settle-msg-${user._id}" style="font-size:0.8rem;margin-top:6px"></div>` : '<div style="color:var(--text-muted);font-size:0.85rem">All settled</div>'}
                    </div>
                </div>

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
            this.viewContainer.innerHTML = `<div class="panel" style="color:var(--danger)">Error loading student: ${err.message}</div>`;
        }
    },

    async settleAffiliate(userId, userName) {
        const input = document.getElementById(`settle-amount-${userId}`);
        const msgEl = document.getElementById(`settle-msg-${userId}`);
        const amount = parseFloat(input?.value);
        if (!amount || amount <= 0) {
            if (msgEl) msgEl.textContent = 'Please enter a valid amount.';
            return;
        }
        try {
            const res = await this.fetchAPI(`/api/admin/affiliates/${userId}/settle`, {
                method: 'POST',
                body: JSON.stringify({ amount })
            });
            const data = await res.json();
            if (res.ok) {
                if (msgEl) {
                    msgEl.style.color = 'var(--success)';
                    msgEl.textContent = `✓ ${data.message}. New balance: ₹${data.newBalance}`;
                }
                // Refresh after short delay
                setTimeout(() => this.renderStudentDetails(userId), 1500);
            } else {
                if (msgEl) { msgEl.style.color = 'var(--danger)'; msgEl.textContent = data.message; }
            }
        } catch (err) {
            if (msgEl) { msgEl.style.color = 'var(--danger)'; msgEl.textContent = 'Error: ' + err.message; }
        }
    },

    async renderReferrals() {
        this.viewContainer.innerHTML = '<div class="loading">Loading Referrals...</div>';
        try {
            const res = await this.fetchAPI('/api/admin/referrals');
            const logs = await res.json();
            
            let logsHtml = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No referral commissions recorded yet.</td></tr>';
            if (logs.length > 0) {
                logsHtml = logs.map(log => `
                    <tr>
                        <td>
                            <div style="font-weight:500;color:var(--primary);cursor:pointer" onclick="App.renderStudentDetails('${log.referrerId?._id}')">${log.referrerId?.name || 'Unknown'}</div>
                            <small style="color:var(--text-muted)">${log.referrerId?.email || ''}</small>
                        </td>
                        <td>${log.refereeId?.name || 'Unknown'}</td>
                        <td>${log.courseId?.title || 'Unknown Course'}</td>
                        <td style="color:var(--success);font-weight:600">₹${log.commissionAmount}</td>
                        <td style="color:var(--text-muted)">${new Date(log.createdAt).toLocaleDateString()}</td>
                    </tr>`).join('');
            }

            const usersRes = await this.fetchAPI('/api/admin/users');
            const allUsers = await usersRes.json();
            const totalEarnedMap = {};
            logs.forEach(l => { const rid = l.referrerId?._id; if (rid) totalEarnedMap[rid] = (totalEarnedMap[rid] || 0) + l.commissionAmount; });
            const affiliatesWithBalance = allUsers.filter(u => u.walletBalance > 0 || totalEarnedMap[u._id] > 0)
                .sort((a, b) => b.walletBalance - a.walletBalance);

            let affiliatesHtml = '<p style="color:var(--text-muted)">No active affiliates.</p>';
            if (affiliatesWithBalance.length > 0) {
                affiliatesHtml = affiliatesWithBalance.map(a => `
                    <div class="stat-card" style="padding:20px">
                        <h4 style="margin-bottom:4px;color:var(--primary);cursor:pointer" onclick="App.renderStudentDetails('${a._id}')">${a.name}</h4>
                        <div class="stat-title">${a.email}</div>
                        <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
                            <div><div style="font-size:0.75rem;color:var(--text-muted)">TOTAL EARNED</div><div style="font-weight:700;color:#f59e0b">₹${totalEarnedMap[a._id] || 0}</div></div>
                            <div><div style="font-size:0.75rem;color:var(--text-muted)">OUTSTANDING</div><div style="font-weight:700;color:${a.walletBalance > 0 ? 'var(--danger)' : 'var(--success)'}">₹${a.walletBalance}</div></div>
                        </div>
                        ${a.walletBalance > 0 ? `
                        <div style="margin-top:12px;display:flex;gap:6px">
                            <input type="number" id="ref-settle-${a._id}" class="form-control" placeholder="Amount to settle" style="padding:6px 10px;font-size:0.85rem" max="${a.walletBalance}">
                            <button class="btn btn-primary" style="padding:6px 12px;font-size:0.8rem;white-space:nowrap" onclick="App.settleAffiliateFromReferrals('${a._id}')">Settle</button>
                        </div>
                        <div id="ref-settle-msg-${a._id}" style="font-size:0.75rem;margin-top:4px"></div>`
                        : '<div style="font-size:0.8rem;color:var(--success);margin-top:8px">✓ Fully settled</div>'}
                    </div>`).join('');
            }

            const totalCommission = logs.reduce((a, l) => a + l.commissionAmount, 0);
            const totalOutstanding = allUsers.reduce((a, u) => a + (u.walletBalance || 0), 0);
            const totalSettled = totalCommission - totalOutstanding;

            this.viewContainer.innerHTML = `
                <div class="flex justify-between items-center" style="margin-bottom:24px"><h2>Referrals & Affiliates</h2></div>
                <div class="grid-cards" style="margin-bottom:24px">
                    <div class="stat-card"><div class="stat-title">Total Referral Transactions</div><div class="stat-value">${logs.length}</div></div>
                    <div class="stat-card"><div class="stat-title">Total Commission Issued</div><div class="stat-value" style="color:#f59e0b">₹${totalCommission}</div></div>
                    <div class="stat-card"><div class="stat-title">Total Settled</div><div class="stat-value" style="color:var(--success)">₹${totalSettled}</div></div>
                    <div class="stat-card"><div class="stat-title">Outstanding to Pay</div><div class="stat-value" style="color:var(--danger)">₹${totalOutstanding}</div></div>
                </div>
                <h3 style="margin-bottom:16px">Affiliate Wallets</h3>
                <div class="grid-cards" style="margin-bottom:32px">${affiliatesHtml}</div>
                <div class="panel">
                    <div class="panel-header"><h3>All Commission Logs</h3></div>
                    <div class="table-wrapper">
                        <table class="table">
                            <thead><tr><th>Referrer</th><th>New Student</th><th>Course</th><th>Commission</th><th>Date</th></tr></thead>
                            <tbody>${logsHtml}</tbody>
                        </table>
                    </div>
                </div>`;
        } catch (error) {
            this.viewContainer.innerHTML = `<div class="panel" style="color:var(--danger)">Error loading referrals: ${error.message}</div>`;
        }
    },

    async settleAffiliateFromReferrals(userId) {
        const input = document.getElementById(`ref-settle-${userId}`);
        const msgEl = document.getElementById(`ref-settle-msg-${userId}`);
        const amount = parseFloat(input?.value);
        if (!amount || amount <= 0) { if (msgEl) msgEl.textContent = 'Enter a valid amount.'; return; }
        try {
            const res = await this.fetchAPI(`/api/admin/affiliates/${userId}/settle`, { method: 'POST', body: JSON.stringify({ amount }) });
            const data = await res.json();
            if (res.ok) {
                if (msgEl) { msgEl.style.color = 'var(--success)'; msgEl.textContent = `✓ ${data.message}`; }
                setTimeout(() => this.renderReferrals(), 1200);
            } else {
                if (msgEl) { msgEl.style.color = 'var(--danger)'; msgEl.textContent = data.message; }
            }
        } catch (err) {
            if (msgEl) { msgEl.style.color = 'var(--danger)'; msgEl.textContent = 'Error: ' + err.message; }
        }
    },

    renderCourseForm(courseId = null) {
        this.breadcrumb.textContent = courseId ? 'Edit Course' : 'Create New Course';
        
        // This is a dynamic form that includes the live preview functionality
        this.viewContainer.innerHTML = `
            <div class="panel">
                <div class="panel-header flex justify-between items-center">
                    <h3>${courseId ? 'Edit Course Details' : 'Course Information'}</h3>
                    <button class="btn btn-secondary" onclick="App.navigateTo('courses')">Back</button>
                </div>
                
                <form id="course-form" onsubmit="event.preventDefault(); alert('Save functionality to be integrated with API');">
                    <div class="course-form-grid">
                        <div class="form-group full-width">
                            <label class="form-label">Course Title</label>
                            <input type="text" class="form-control" placeholder="e.g. Complete Web Development" required>
                        </div>
                        
                        <div class="form-group full-width">
                            <label class="form-label">Description</label>
                            <textarea class="form-control" rows="3" placeholder="Detailed description..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Type</label>
                            <select class="form-control">
                                <option value="Course">Course</option>
                                <option value="Tutorial">Tutorial</option>
                                <option value="Workshop">Workshop</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Category</label>
                            <input type="text" class="form-control" placeholder="e.g. AI, Web, Design">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Price (INR)</label>
                            <input type="number" class="form-control" placeholder="0">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Discounted Price (INR)</label>
                            <input type="number" class="form-control" placeholder="0">
                        </div>
                        
                        <div class="form-group full-width">
                            <label class="form-label">Affiliate Commission (INR)</label>
                            <input type="number" class="form-control" placeholder="0" title="Commission given to the referrer when someone buys this course.">
                            <small class="text-muted">Amount to credit to the referring user's wallet when this course is purchased.</small>
                        </div>
                        
                        <div class="form-group full-width" id="outcomes-container">
                            <div class="flex justify-between items-center" style="margin-bottom: 8px;">
                                <label class="form-label" style="margin-bottom: 0;">Course Benefits (Outcomes)</label>
                                <button type="button" class="btn btn-secondary" style="padding: 4px 12px; font-size: 0.8rem;" onclick="App.addOutcomeInput()">+ Add Benefit</button>
                            </div>
                            <div id="outcomes-list" style="display: flex; flex-direction: column; gap: 8px;">
                                <div class="flex gap-4 items-center">
                                    <input type="text" class="form-control outcome-input" placeholder="e.g. Master React from scratch">
                                    <button type="button" class="btn btn-secondary text-danger" onclick="this.parentElement.remove()" style="padding: 10px;">X</button>
                                </div>
                            </div>
                        </div>

                        <div class="form-group full-width" style="margin-top: 24px; border-top: 1px solid var(--border); padding-top: 24px;">
                            <h4 style="margin-bottom: 16px;">Add Course Material (Video / Document)</h4>
                            <label class="form-label">Paste Media/Drive Link here to preview</label>
                            <input type="text" id="media-link-input" class="form-control" placeholder="https://youtube.com/... or https://drive.google.com/...">
                            
                            <!-- The Live Preview Pane -->
                            <div class="preview-pane" id="preview-pane">
                                <div class="preview-placeholder">
                                    <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1" fill="none" style="opacity:0.5; margin-bottom:8px;"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg><br>
                                    Media Preview Area<br>
                                    <small>Paste a valid link above to view it instantly on this screen.</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 32px; display: flex; justify-content: flex-end; gap: 12px;">
                        <button type="button" class="btn btn-secondary" onclick="App.navigateTo('courses')">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Course</button>
                    </div>
                </form>
            </div>
        `;

        // Setup the live media preview event listener
        const linkInput = document.getElementById('media-link-input');
        const previewPane = document.getElementById('preview-pane');

        linkInput.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            if(!url) {
                previewPane.innerHTML = '<div class="preview-placeholder">Paste a valid link above to preview.</div>';
                return;
            }

            // Basic parsing to render YouTube or standard iframe
            if(url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
                let videoId = '';
                if(url.includes('youtube.com/watch?v=')) {
                    videoId = url.split('v=')[1].split('&')[0];
                } else if(url.includes('youtu.be/')) {
                    videoId = url.split('youtu.be/')[1].split('?')[0];
                }
                
                previewPane.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>`;
            } else if (url.endsWith('.mp4')) {
                previewPane.innerHTML = `<video src="${url}" controls autoplay></video>`;
            } else {
                // For Google Drive PDF or general links, attempt to use an iframe
                // Note: Some sites block iframing (X-Frame-Options), but Drive previews generally work.
                let embedUrl = url;
                if(url.includes('drive.google.com/file/d/')) {
                    embedUrl = url.replace('/view', '/preview');
                }
                previewPane.innerHTML = `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
            }
        });
    },
    
    addOutcomeInput() {
        const list = document.getElementById('outcomes-list');
        const div = document.createElement('div');
        div.className = 'flex gap-4 items-center';
        div.innerHTML = `
            <input type="text" class="form-control outcome-input" placeholder="e.g. Master React from scratch">
            <button type="button" class="btn btn-secondary text-danger" onclick="this.parentElement.remove()" style="padding: 10px;">X</button>
        `;
        list.appendChild(div);
    },

    async renderCourseDetails(courseId) {
        this.state.currentCourseId = courseId;
        this.breadcrumb.textContent = 'Course Overview & Moderation';
        this.viewContainer.innerHTML = '<div class="loading">Loading Course Data...</div>';
        try {
            const res = await this.fetchAPI(`/api/admin/courses/${courseId}/stats`);
            const data = await res.json();
            
            // Store comments data for filtering
            this.state.courseComments = data.comments || [];
            
            // Format Students Table
            let studentsHtml = '';
            if (data.students && data.students.length > 0) {
                studentsHtml = data.students.map(s => `
                    <tr>
                        <td>${s.name}</td>
                        <td>${s.email}</td>
                        <td>
                            <div class="progress-container">
                                <div class="progress-bar ${s.completed ? 'completed' : ''}" style="width: ${s.progress}%"></div>
                            </div>
                            <small style="color: var(--text-muted);">${s.progress}% ${s.completed ? '(Completed)' : ''}</small>
                        </td>
                    </tr>
                `).join('');
            } else {
                studentsHtml = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No students enrolled yet.</td></tr>';
            }

            this.viewContainer.innerHTML = `
                <div class="flex justify-between items-center" style="margin-bottom: 24px;">
                    <h2>Course Intelligence</h2>
                    <button class="btn btn-secondary" onclick="App.navigateTo('courses')">Back to Courses</button>
                </div>
                
                <div class="grid-cards" style="margin-bottom: 24px;">
                    <div class="stat-card">
                        <div class="stat-title">Total Revenue Generated</div>
                        <div class="stat-value text-success">₹${data.revenue || 0}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">Enrolled Students</div>
                        <div class="stat-value">${data.students ? data.students.length : 0}</div>
                    </div>
                </div>

                <!-- Tab Navigation -->
                <div class="tab-navigation" style="display:flex;gap:0;margin-bottom:24px;border-bottom:2px solid var(--border);">
                    <button class="tab-btn active" data-tab="students" onclick="App.switchCourseTab('students')" 
                            style="padding:12px 24px;background:transparent;border:none;border-bottom:3px solid var(--primary);font-weight:600;cursor:pointer;color:var(--primary);">
                        📊 Student Progress
                    </button>
                    <button class="tab-btn" data-tab="discussion" onclick="App.switchCourseTab('discussion')" 
                            style="padding:12px 24px;background:transparent;border:none;border-bottom:3px solid transparent;font-weight:600;cursor:pointer;color:var(--text-muted);">
                        💬 Discussion & Moderation
                    </button>
                </div>

                <!-- Tab Content: Students -->
                <div id="tab-students" class="tab-content" style="display:block;">
                    <div class="panel">
                        <div class="panel-header">
                            <h3>Student Progress Tracking</h3>
                        </div>
                        <div class="table-wrapper">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Student Name</th>
                                        <th>Email</th>
                                        <th>Course Progress</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${studentsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Tab Content: Discussion -->
                <div id="tab-discussion" class="tab-content" style="display:none;">
                    <div class="panel">
                        <div class="panel-header">
                            <h3>Discussion & Moderation</h3>
                            <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
                                <!-- Filter Buttons -->
                                <button class="btn btn-primary" style="padding:4px 12px;font-size:0.8rem;" onclick="App.filterComments('all')">All</button>
                                <button class="btn btn-secondary" style="padding:4px 12px;font-size:0.8rem;" onclick="App.filterComments('unreplied')">Unreplied</button>
                                <button class="btn btn-secondary" style="padding:4px 12px;font-size:0.8rem;" onclick="App.filterComments('open')">Open</button>
                                <button class="btn btn-secondary" style="padding:4px 12px;font-size:0.8rem;" onclick="App.filterComments('closed')">Closed</button>
                                <button class="btn btn-secondary" style="padding:4px 12px;font-size:0.8rem;" onclick="App.filterComments('latest')">Latest First</button>
                            </div>
                        </div>
                        <div id="course-comments-container">
                            ${this.buildCommentsHtml(this.state.courseComments)}
                        </div>
                    </div>
                </div>
            `;
        } catch(err) {
            this.viewContainer.innerHTML = `<div class="panel text-danger">Error loading course details: ${err.message}</div>`;
        }
    },

    // Build comments HTML with status indicators
    buildCommentsHtml(comments) {
        if (!comments || comments.length === 0) {
            return '<p class="text-muted" style="padding:16px;text-align:center;">No comments in this course yet.</p>';
        }

        // Filter to only top-level comments (no parent)
        const topLevelComments = comments.filter(c => !c.parentCommentId);
        
        if (topLevelComments.length === 0) {
            return '<p class="text-muted" style="padding:16px;text-align:center;">No top-level comments found.</p>';
        }

        return topLevelComments.map(c => {
            const hasReplies = c.replies && c.replies.length > 0;
            const isOpen = c.status !== 'closed'; // Default: open
            
            return `
                <div class="comment" style="border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:12px;background:${isOpen ? 'var(--bg)' : 'var(--bg-muted)'};">
                    <div class="comment-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span class="comment-author" style="font-weight:600;color:var(--primary);">${c.userId ? c.userId.name : 'Unknown User'}</span>
                            <span class="comment-date" style="color:var(--text-muted);font-size:0.8rem;">${new Date(c.createdAt).toLocaleDateString()} ${new Date(c.createdAt).toLocaleTimeString()}</span>
                            <span class="comment-status" style="font-size:0.7rem;padding:2px 10px;border-radius:12px;background:${isOpen ? 'var(--success)' : 'var(--danger)'};color:white;">
                                ${isOpen ? 'OPEN' : 'CLOSED'}
                            </span>
                            ${hasReplies ? `<span style="font-size:0.7rem;color:var(--text-muted);">${c.replies.length} replies</span>` : ''}
                        </div>
                        <div style="display:flex;gap:6px;">
                            <button class="btn ${isOpen ? 'btn-secondary' : 'btn-primary'}" 
                                    style="padding:2px 10px;font-size:0.7rem;" 
                                    onclick="App.toggleCommentStatus('${c._id}')">
                                ${isOpen ? 'Close' : 'Re-open'}
                            </button>
                        </div>
                    </div>
                    <div class="comment-body" style="margin-bottom:12px;">${c.text}</div>
                    <div class="comment-actions" style="display:flex;gap:8px;align-items:center;">
                        <button class="btn btn-secondary" style="padding:4px 12px;font-size:0.8rem;" onclick="App.toggleReplyBox('${c._id}')">
                            💬 Reply
                        </button>
                    </div>
                    
                    <!-- Reply Box -->
                    <div id="reply-box-${c._id}" style="display: none; margin-top: 12px;">
                        <textarea class="form-control" id="reply-text-${c._id}" rows="2" placeholder="Write a reply..."></textarea>
                        <button class="btn btn-primary" style="margin-top: 8px; padding: 4px 12px;" onclick="App.submitReply('${c._id}')">Send Reply</button>
                    </div>

                    <!-- Replies -->
                    ${hasReplies ? `
                    <div class="reply-list" style="margin-top:12px;padding-left:24px;border-left:3px solid var(--border);">
                        ${c.replies.map(r => `
                            <div class="reply" style="padding:8px 0;border-bottom:1px solid var(--border-light);">
                                <div class="comment-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                    <span class="comment-author" style="font-weight:500;color:var(--success);">${r.userId ? r.userId.name : 'Admin'}</span>
                                    <span class="comment-date" style="color:var(--text-muted);font-size:0.7rem;">${new Date(r.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div class="comment-body" style="margin-bottom:0;">${r.text}</div>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    },

    // Switch between tabs
    switchCourseTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.color = 'var(--text-muted)';
            btn.style.borderBottomColor = 'transparent';
        });
        
        const activeBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.style.color = 'var(--primary)';
            activeBtn.style.borderBottomColor = 'var(--primary)';
        }
        
        // Show/hide tab content
        document.getElementById('tab-students').style.display = tab === 'students' ? 'block' : 'none';
        document.getElementById('tab-discussion').style.display = tab === 'discussion' ? 'block' : 'none';
    },

    // Filter comments
    filterComments(filter) {
        // Update filter button styles
        document.querySelectorAll('#tab-discussion .panel-header .btn').forEach(btn => {
            btn.className = 'btn btn-secondary';
            btn.style.padding = '4px 12px';
            btn.style.fontSize = '0.8rem';
        });
        
        // Find and highlight active filter button
        const buttons = document.querySelectorAll('#tab-discussion .panel-header .btn');
        const filterMap = {
            'all': 0,
            'unreplied': 1,
            'open': 2,
            'closed': 3,
            'latest': 4
        };
        const index = filterMap[filter];
        if (index !== undefined && buttons[index]) {
            buttons[index].className = 'btn btn-primary';
            buttons[index].style.padding = '4px 12px';
            buttons[index].style.fontSize = '0.8rem';
        }

        let filteredComments = [...this.state.courseComments];
        
        // Filter top-level comments
        let topLevel = filteredComments.filter(c => !c.parentCommentId);
        
        switch(filter) {
            case 'unreplied':
                topLevel = topLevel.filter(c => !c.replies || c.replies.length === 0);
                break;
            case 'open':
                topLevel = topLevel.filter(c => c.status !== 'closed');
                break;
            case 'closed':
                topLevel = topLevel.filter(c => c.status === 'closed');
                break;
            case 'latest':
                topLevel.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'all':
            default:
                // No additional filtering
                break;
        }
        
        // Rebuild the comments container with filtered comments
        const container = document.getElementById('course-comments-container');
        if (container) {
            container.innerHTML = this.buildCommentsHtml(topLevel);
        }
    },

    // Toggle comment status (open/closed)
    async toggleCommentStatus(commentId) {
        try {
            // Find the comment in our stored data
            const comment = this.state.courseComments.find(c => c._id === commentId);
            if (!comment) return;
            
            const newStatus = comment.status === 'closed' ? 'open' : 'closed';
            
            const res = await this.fetchAPI(`/api/admin/comments/${commentId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });
            
            if (res.ok) {
                // Update local state
                comment.status = newStatus;
                // Re-render the discussion tab
                this.filterComments('all');
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to update comment status');
            }
        } catch (error) {
            alert('Error updating comment status: ' + error.message);
        }
    },

    toggleReplyBox(commentId) {
        const box = document.getElementById(`reply-box-${commentId}`);
        if (box) {
            box.style.display = box.style.display === 'none' ? 'block' : 'none';
        }
    },

    async submitReply(commentId) {
        const textInput = document.getElementById(`reply-text-${commentId}`);
        const text = textInput.value.trim();
        
        if (!text) return alert('Reply cannot be empty');

        try {
            const res = await this.fetchAPI(`/api/admin/comments/${commentId}/reply`, {
                method: 'POST',
                body: JSON.stringify({ text })
            });

            if (res.ok) {
                const data = await res.json();
                // Update local state with new reply
                const comment = this.state.courseComments.find(c => c._id === commentId);
                if (comment) {
                    if (!comment.replies) comment.replies = [];
                    comment.replies.push({
                        _id: data.replyId || Date.now().toString(),
                        text: text,
                        userId: { name: 'Admin' },
                        createdAt: new Date().toISOString()
                    });
                }
                // Refresh the discussion view with current filter
                this.filterComments('all');
                
                // Clear the reply text
                textInput.value = '';
                // Hide reply box
                document.getElementById(`reply-box-${commentId}`).style.display = 'none';
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to post reply');
            }
        } catch (error) {
            alert('Error posting reply: ' + error.message);
        }
    }
};

// Start App when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});