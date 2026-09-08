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
        this.breadcrumb.textContent = text;
    },

    showLoading() {
        this.viewContainer.innerHTML = '<div class="loading">Loading...</div>';
    },

// In app.js - Updated navigateTo method
// In app.js - Complete updated navigateTo method
async navigateTo(view, params = null) {
    this.showLoading();

    if (view !== 'login' && !AuthModule.isAuthenticated()) {
        view = 'login';
    }

    // Declare variables at the top of the function
    let content = '';
    let courseId = null;
    let userId = null;

    try {
        // Parse params - do this before the switch
        if (params) {
            if (typeof params === 'string') {
                if (view === 'course-content' || view === 'course-details' || view === 'course-form') {
                    courseId = params;
                } else if (view === 'student-details') {
                    userId = params;
                }
            } else if (typeof params === 'object' && params !== null) {
                courseId = params.courseId || null;
                userId = params.userId || null;
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

            case 'courses':
                this.setBreadcrumb('Manage Courses');
                content = await CoursesModule.render();
                break;

            case 'course-form':
                this.setBreadcrumb(courseId ? 'Edit Course' : 'Create New Course');
                content = CoursesModule.renderForm(courseId);
                break;

            case 'course-content':
                this.setBreadcrumb('Course Content Player');
                content = await CoursesModule.renderContent(courseId);
                break;

            case 'course-details':
                this.setBreadcrumb('Course Overview & Moderation');
                content = await CoursesModule.renderDetails(courseId);
                break;

            case 'students':
                this.setBreadcrumb('Students Overview');
                content = await StudentsModule.render();
                break;

            case 'student-details':
                this.setBreadcrumb('Student Profile');
                content = await StudentsModule.renderDetails(userId);
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

        if (view === 'course-form') {
            this.setupMediaPreview();
            // Re-attach form submit handler - use the courseId from the outer scope
            const form = document.getElementById('course-form');
            if (form) {
                // Remove any existing event listeners by cloning
                const newForm = form.cloneNode(true);
                form.parentNode.replaceChild(newForm, form);
                
                // Add the submit handler
                newForm.onsubmit = function(e) {
                    e.preventDefault();
                    // Get the courseId from the closure
                    CoursesModule.handleSubmit(e, courseId);
                };
            }
        }

    } catch (error) {
        console.error('Navigation error:', error);
        this.viewContainer.innerHTML = Renderers.errorMessage(error.message);
    }
},

// Setup media preview
setupMediaPreview() {
    const linkInput = document.getElementById('media-link-input');
    const previewPane = document.getElementById('preview-pane');

    if (linkInput && previewPane) {
        // Remove old listener to avoid duplicates
        const newInput = linkInput.cloneNode(true);
        linkInput.parentNode.replaceChild(newInput, linkInput);
        
        newInput.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            if (!url) {
                previewPane.innerHTML = '<div class="preview-placeholder">Paste a valid link above to preview.</div>';
                return;
            }

            if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
                let videoId = '';
                if (url.includes('youtube.com/watch?v=')) {
                    videoId = url.split('v=')[1].split('&')[0];
                } else if (url.includes('youtu.be/')) {
                    videoId = url.split('youtu.be/')[1].split('?')[0];
                }
                previewPane.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>`;
            } else if (url.endsWith('.mp4')) {
                previewPane.innerHTML = `<video src="${url}" controls autoplay></video>`;
            } else {
                let embedUrl = url;
                if (url.includes('drive.google.com/file/d/')) {
                    embedUrl = url.replace('/view', '/preview');
                }
                previewPane.innerHTML = `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
            }
        });
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

        form.addEventListener('submit', async (e) => {
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

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Make App globally accessible
window.App = App;