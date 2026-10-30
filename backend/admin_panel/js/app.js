// Main Application Controller
const App = {
    viewContainer: document.getElementById('view-container'),
    breadcrumb: document.getElementById('breadcrumb'),

    init() {
        this.setupNavigation();
        if (!AuthModule.isAuthenticated()) {
            this.navigateTo('login');
        } else {
            this.navigateTo('dashboard'); 
        }
    },

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item[data-view]');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                if (!AuthModule.isAuthenticated()) return;

                const view = e.currentTarget.getAttribute('data-view');
                if (!view) return;
                navItems.forEach(n => n.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.navigateTo(view);
            });
        });
    },

    setBreadcrumb(text) {
        if (this.breadcrumb) {
            this.breadcrumb.textContent = text;
        }
    },

    showLoading() {
        this.viewContainer.innerHTML = '<div class="loading">Loading...</div>';
    },

    async navigateTo(view, params = null) {
        if (view !== 'login' && !AuthModule.isAuthenticated()) {
            view = 'login';
        }

        const sidebar = document.querySelector('.sidebar');
        const topbar = document.querySelector('.topbar');
        const appContainer = document.querySelector('.app-container');

        if (view === 'login') {
            if (sidebar) sidebar.style.display = 'none';
            if (topbar) topbar.style.display = 'none';
            if (appContainer) appContainer.style.display = 'block';
        } else {
            if (sidebar) sidebar.style.display = 'flex';
            if (topbar) topbar.style.display = 'flex';
            if (appContainer) appContainer.style.display = 'flex';
        }

        this.showLoading();

        let content = '';
        let id = null;

        try {
            // Normalize params - extract ID from various formats
            if (params) {
                if (typeof params === 'string') {
                    id = params;
                } else if (typeof params === 'object' && params !== null) {
                    id = params.id || params.courseId || params.tutorialId || params.eventId || null;
                }
            }

            switch (view) {
                case 'login':
                    this.setBreadcrumb('Login');
                    content = this.renderLogin();
                    break;

                case 'dashboard':
                    this.setBreadcrumb('Dashboard');
                    content = await DashboardModule.render();
                    break;

                case 'analytics':
                    this.setBreadcrumb('📊 Traffic & Drop-off Funnel Analytics');
                    content = await AnalyticsModule.render();
                    break;

                // ==================== SOFTWARE & AI SERVICES ====================
                case 'software':
                    this.setBreadcrumb('Software');
                    content = await SoftwareModule.render();
                    break;

                case 'services':
                    this.setBreadcrumb('Services');
                    content = await ServicesModule.render();
                    break;

                case 'licenses':
                    this.setBreadcrumb('Licences');
                    content = await LicensesModule.render();
                    break;

                case 'pin-reset':
                    this.setBreadcrumb('POS PIN reset');
                    content = await PinResetModule.render();
                    break;

                case 'service-orders':
                    this.setBreadcrumb('Service orders');
                    content = await ServiceOrdersModule.render();
                    break;

                case 'categories':
                    this.setBreadcrumb('Categories');
                    content = await CategoriesModule.render();
                    break;

                case 'enquiry-form':
                    this.setBreadcrumb('Enquiry Form');
                    content = await EnquiryFormModule.render();
                    break;

                // ==================== CONTENT MANAGEMENT HUB ====================
                case 'content':
                case 'courses':
                    this.setBreadcrumb('Content Management');
                    content = await ContentManager.render();
                    break;

                // ==================== COURSE VIEWS ====================
                case 'course-form':
                    this.setBreadcrumb(id ? 'Edit Course' : 'Create Course');
                    content = await CoursesModule.renderForm(id);
                    break;

                case 'course-details':
                    this.setBreadcrumb('Course Details');
                    content = await CoursesModule.renderDetails(id);
                    break;

                case 'course-content':
                    this.setBreadcrumb('Course Content Editor');
                    content = await CoursesModule.renderContentEditor(id);
                    break;

                // ==================== TUTORIAL VIEWS ====================
                case 'tutorial-form':
                    this.setBreadcrumb(id ? 'Edit Tutorial' : 'Create Tutorial');
                    content = await TutorialsModule.renderForm(id);
                    break;

                case 'tutorial-details':
                    this.setBreadcrumb('Tutorial Details');
                    content = await TutorialsModule.renderDetails(id);
                    break;

                // ==================== EVENT VIEWS ====================
                case 'event-form':
                    this.setBreadcrumb(id ? 'Edit Event' : 'Create Event');
                    content = await EventsModule.renderForm(id);
                    break;

                case 'event-details':
                    this.setBreadcrumb('Event Details');
                    content = await EventsModule.renderDetails(id);
                    break;

                // ==================== OTHER VIEWS ====================
                case 'students':
                    this.setBreadcrumb('Students Overview');
                    content = await StudentsModule.render();
                    break;

                case 'student-details':
                    this.setBreadcrumb('Student Profile');
                    content = await StudentsModule.renderDetails(id);
                    break;

                case 'referrals':
                    this.setBreadcrumb('Referrals & Affiliates');
                    content = await ReferralsModule.render();
                    break;

                case 'coupons':
                    this.setBreadcrumb('🎟️ Coupons & Offers');
                    content = await CouponsModule.render();
                    break;

                case 'inquiries':
                    this.setBreadcrumb('📬 Student Inquiries & Support');
                    content = await InquiriesModule.render();
                    break;

                case 'subscribers':
                    this.setBreadcrumb('👥 Newsletter Leads & Welcome Email Engine');
                    content = await SubscribersModule.render();
                    break;

                // ==================== GST & SALES BUILDER VIEWS ====================
                case 'gst-report':
                case 'gst_report':
                    this.setBreadcrumb('🇮🇳 GST Tax Reports');
                    content = await GstReportModule.render();
                    break;

                case 'sales-builder':
                case 'sales_builder':
                    this.setBreadcrumb('⚡ Sales Page Builder');
                    content = await SalesBuilderModule.render();
                    break;

                default:
                    content = '<h2>View not found</h2>';
            }

            this.viewContainer.innerHTML = content;

            // Setup event listeners after rendering
            if (view === 'login') {
                this.setupLoginForm();
            }

            // Setup form handlers
            if (view === 'course-form') {
                CoursesModule.setupForm(id);
            }
            if (view === 'tutorial-form') {
                TutorialsModule.setupForm(id);
            }
            if (view === 'event-form') {
                EventsModule.setupForm(id);
            }

        } catch (error) {
            console.error('Navigation error:', error);
            this.viewContainer.innerHTML = Renderers.errorMessage(error.message);
        }
    },

    renderLogin() {
        return `
            <div class="login-page-wrapper" style="position:fixed;inset:0;background:radial-gradient(ellipse at 50% 25%, #1e1b4b 0%, #0f172a 100%);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9999;overflow-y:auto;">
                <div class="login-card" style="width:100%;max-width:440px;background: var(--bg-card);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid var(--border);border-radius:24px;padding:40px 32px;box-shadow:0 30px 70px -15px rgba(0,0,0,0.8);animation:fadeIn 0.3s ease;">
                    <div style="text-align:center;margin-bottom:28px;">
                        <div style="width:64px;height:64px;margin:0 auto 16px;border-radius:18px;background:linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%);display:flex;align-items:center;justify-content:center;font-size:30px;box-shadow:0 12px 30px -6px rgba(59,130,246,0.6);">
                            🛡️
                        </div>
                        <h2 style="font-size:1.6rem;font-weight:800;letter-spacing:-0.5px;margin-bottom:6px;color: var(--text-main);">
                            WIDETECHNOS
                        </h2>
                        <p style="color: var(--text-muted);font-size:0.85rem;margin-bottom:12px;">Super Admin Control Center</p>
                        <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;background: var(--info-soft);border:1px solid rgba(59,130,246,0.3);font-size:0.75rem;color: var(--info);font-weight:600;">
                            <span style="width:6px;height:6px;border-radius:50%;background:#3b82f6;display:inline-block;"></span>
                            Restricted Internal Gate
                        </div>
                    </div>

                    <form id="login-form">
                        <div class="form-group" style="margin-bottom:18px;">
                            <label style="font-size:0.82rem;font-weight:600;color: var(--text-secondary);margin-bottom:6px;display:block;">Master Email</label>
                            <div style="position:relative;">
                                <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color: var(--text-muted);font-size:1rem;">✉️</span>
                                <input type="email" id="login-email" class="form-control" required placeholder="admin@widetechnos.com" 
                                       style="width:100%;padding:12px 14px 12px 42px;border-radius:10px;background: var(--input-bg);border:1px solid var(--border-strong);color: var(--text-main);font-size:0.92rem;" />
                            </div>
                        </div>

                        <div class="form-group" style="margin-bottom:22px;">
                            <label style="font-size:0.82rem;font-weight:600;color: var(--text-secondary);margin-bottom:6px;display:block;">Master Password</label>
                            <div style="position:relative;">
                                <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color: var(--text-muted);font-size:1rem;">🔑</span>
                                <input type="password" id="login-password" class="form-control" required placeholder="••••••••••••"
                                       style="width:100%;padding:12px 42px 12px 42px;border-radius:10px;background: var(--input-bg);border:1px solid var(--border-strong);color: var(--text-main);font-size:0.92rem;" />
                                <button type="button" onclick="App.togglePassword()" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color: var(--text-muted);cursor:pointer;font-size:1rem;" title="Show/Hide Password">
                                    👁️
                                </button>
                            </div>
                        </div>

                        <button type="submit" id="login-submit-btn" class="btn btn-primary" 
                                style="width:100%;padding:12px;border-radius:10px;font-weight:700;font-size:0.95rem;letter-spacing:0.3px;display:flex;align-items:center;justify-content:center;gap:8px;background:var(--primary);box-shadow:var(--shadow-sm);border:none;color:#fff;cursor:pointer;">
                            <span>Authenticate & Enter</span> →
                        </button>

                        <div id="login-error" style="display:none;margin-top:16px;padding:12px 16px;border-radius:10px;background: var(--danger-soft);border:1px solid var(--danger);color: var(--danger);font-size:0.88rem;font-weight:600;text-align:center;box-shadow:0 8px 24px rgba(239,68,68,0.25);line-height:1.4;"></div>
                    </form>

                    <div style="margin-top:24px;padding-top:18px;border-top:1px solid var(--border);text-align:center;">
                        <a href="http://localhost:5173" target="_blank" rel="noopener noreferrer" style="font-size:0.82rem;color: var(--text-muted);text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
                            🎓 Open Student Academy Portal →
                        </a>
                    </div>
                </div>
            </div>
        `;
    },

    togglePassword() {
        const inp = document.getElementById('login-password');
        if (inp) {
            inp.type = inp.type === 'password' ? 'text' : 'password';
        }
    },

    setupLoginForm() {
        const form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const errorEl = document.getElementById('login-error');
            const submitBtn = document.getElementById('login-submit-btn');

            if (!email || !password) return;

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Verifying credentials...</span>';
            if (errorEl) errorEl.style.display = 'none';

            try {
                const result = await AuthModule.login(email, password);
                if (!result.success) {
                    const msg = result.message || 'Authentication failed. Please verify credentials.';
                    const el = document.getElementById('login-error');
                    if (el) {
                        el.innerHTML = `⚠️ <strong>Login Error:</strong> ${msg}`;
                        el.style.display = 'block';
                    }
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>Authenticate & Enter</span> →';
                } else {
                    App.navigateTo('dashboard');
                }
            } catch (err) {
                const msg = err.message || 'Server connection error';
                const el = document.getElementById('login-error');
                if (el) {
                    el.innerHTML = `⚠️ <strong>Connection Error:</strong> ${msg}`;
                    el.style.display = 'block';
                }
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Authenticate & Enter</span> →';
            }
        });
    },

    logout() {
        AuthModule.logout();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

window.App = App;