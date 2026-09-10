window.Renderers = {
    loadingSpinner() {
        return '<div class="loading">Loading...</div>';
    },

    errorMessage(message) {
        return `<div class="panel" style="color:var(--danger)">Error: ${message}</div>`;
    },

    emptyState(message = 'No items found.') {
        return `<p style="color:var(--text-muted);padding:20px;text-align:center;">${message}</p>`;
    },

    statCard(title, value, color = '') {
        return `
            <div class="stat-card">
                <div class="stat-title">${title}</div>
                <div class="stat-value" style="${color ? `color:${color}` : ''}">${value}</div>
            </div>
        `;
    },

    statusBadge(status, type = 'default') {
        const colors = {
            open: 'var(--success)',
            closed: 'var(--danger)',
            paid: 'var(--primary)',
            free: 'var(--success)',
            default: 'var(--text-muted)'
        };
        const color = colors[type] || colors.default;
        return `<span class="badge" style="background:${color}">${status}</span>`;
    },

    progressBar(progress, completed = false) {
        const pct = Math.max(0, Math.min(100, progress || 0));
        return `
            <div class="progress-container">
                <div class="progress-bar ${completed ? 'completed' : ''}" style="width:${pct}%"></div>
            </div>
            <small style="color:var(--text-muted)">${pct}% ${completed ? '✓ Completed' : ''}</small>
        `;
    },

    studentRow(user) {
        if (!user) return '';
        
        const enrolledCount = user.enrolledCourses?.length || 0;
        const courseTitles = (user.enrolledCourses || [])
            .map(c => c.courseId?.title)
            .filter(Boolean)
            .join(', ');

        return `
            <tr style="cursor:pointer;" onclick="App.navigateTo('student-details', '${user._id}')">
                <td style="font-weight:500;">
                    <span style="color:var(--primary)">${Helpers.safeString(user.name, 'Unnamed')}</span>
                </td>
                <td style="color:var(--text-muted);">${Helpers.safeString(user.email, '-')}</td>
                <td>
                    <span class="badge" style="background: ${user.role === 'admin' ? 'var(--primary)' : '#64748b'}">
                        ${(user.role || 'user').toUpperCase()}
                    </span>
                </td>
                <td>
                    <div style="display:flex;flex-direction:column;">
                        <span style="font-weight:600;">${enrolledCount} Course${enrolledCount !== 1 ? 's' : ''}</span>
                        ${courseTitles ? `<small style="color:var(--text-muted);">${courseTitles}</small>` : ''}
                    </div>
                </td>
                <td style="color:var(--text-muted);">${Helpers.formatDate(user.createdAt)}</td>
            </tr>
        `;
    },

    courseCard(course) {
        if (!course) return '';
        
        const chapters = (course.content || []).reduce(
            (n, lang) => n + (lang.chapters?.length || 0), 0
        );
        const languages = (course.languages || []).join(', ') || 'N/A';
        
        return `
            <div class="stat-card" style="display:flex;flex-direction:row;justify-content:space-between;align-items:center;padding:16px">
                <div style="flex:1;min-width:0">
                    <h4 style="margin-bottom:4px">
                        ${Helpers.safeString(course.title, 'Untitled')} 
                        ${this.statusBadge(course.isFree ? 'FREE' : 'PAID', course.isFree ? 'free' : 'paid')}
                    </h4>
                    <div class="stat-title">
                        ${Helpers.safeString(course.category, 'Uncategorized')} • 
                        ₹${course.price || 0} • 
                        ${Helpers.safeString(course.type, 'Course')}
                    </div>
                    <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">
                        ${chapters} chapters across ${languages}
                    </div>
                </div>
                <div style="display:flex;gap:8px;flex-shrink:0;margin-left:16px">
                    <button class="btn btn-secondary" onclick="App.navigateTo('course-content', '${course._id}')">▶ Content</button>
                    <button class="btn btn-secondary" onclick="App.navigateTo('course-details', '${course._id}')">📊 Details</button>
                    <button class="btn btn-secondary" onclick="App.navigateTo('course-form', '${course._id}')">✏️ Edit</button>
                </div>
            </div>
        `;
    }
};

// Helpers
window.Helpers = window.Helpers || {
    safeString(str, fallback = '') {
        return str || fallback;
    },
    formatDate(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString();
    }
};