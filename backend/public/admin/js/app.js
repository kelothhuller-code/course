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
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                if (!AuthModule.isAuthenticated()) return;

                const view = e.currentTarget.getAttribute('data-view');
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
        this.showLoading();

        if (view !== 'login' && !AuthModule.isAuthenticated()) {
            view = 'login';
        }

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
            <div class="panel" style="max-width:400px;margin:0 auto;margin-top:50px;">
                <h3 style="text-align:center;margin-bottom:24px;">Super Admin Login</h3>
                <form id="login-form">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="text" id="login-email" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" id="login-password" class="form-control" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width:100%;">Login</button>
                    <div id="login-error" class="text-danger" style="margin-top:12px;text-align:center;"></div>
                </form>
            </div>
        `;
    },

    setupLoginForm() {
        const form = document.getElementById('login-form');
        if (!form) return;

        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorEl = document.getElementById('login-error');

            const result = await AuthModule.login(email, password);
            if (!result.success) {
                errorEl.textContent = result.message || 'Login failed';
            } else {
                errorEl.textContent = '';
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