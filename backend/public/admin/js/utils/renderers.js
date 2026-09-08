// Render helper functions
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
        return `
            <div class="progress-container">
                <div class="progress-bar ${completed ? 'completed' : ''}" style="width:${progress}%"></div>
            </div>
            <small style="color:var(--text-muted)">${progress}% ${completed ? '✓ Completed' : ''}</small>
        `;
    },

// In renderers.js - Update courseCard
courseCard(course) {
    const chapters = (course.content || []).reduce((n, lang) => n + (lang.chapters?.length || 0), 0);
    const languages = (course.languages || []).join(', ') || 'N/A';
    
    return `
        <div class="stat-card" style="display:flex;flex-direction:row;justify-content:space-between;align-items:center;padding:16px">
            <div style="flex:1;min-width:0">
                <h4 style="margin-bottom:4px">${Helpers.safeString(course.title, 'Untitled')} ${this.statusBadge(course.isFree ? 'FREE' : 'PAID', course.isFree ? 'free' : 'paid')}</h4>
                <div class="stat-title">${Helpers.safeString(course.category, 'Uncategorized')} &bull; ₹${course.price || 0} &bull; ${Helpers.safeString(course.type, 'Course')}</div>
                <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">${chapters} chapters across ${languages}</div>
            </div>
            <div style="display:flex;gap:8px;flex-shrink:0;margin-left:16px">
                <button class="btn btn-secondary" onclick="App.navigateTo('course-content', { courseId: '${course._id}' })">▶ View Content</button>
                <button class="btn btn-secondary" onclick="App.navigateTo('course-details', { courseId: '${course._id}' })">&#128202; Stats</button>
                <button class="btn btn-secondary" onclick="App.navigateTo('course-form', { courseId: '${course._id}' })">&#9998; Edit</button>
            </div>
        </div>
    `;
},
    // In renderers.js - Update studentRow
studentRow(user) {
    return `
        <tr style="cursor:pointer;" onclick="App.navigateTo('student-details', '${user._id}')">
            <td style="font-weight:500;">
                <span style="color:var(--primary)">${Helpers.safeString(user.name)}</span>
            </td>
            <td style="color:var(--text-muted);">${user.email}</td>
            <td><span class="badge" style="background: ${user.role === 'admin' ? 'var(--primary)' : '#64748b'}">${(user.role || 'user').toUpperCase()}</span></td>
            <td>
                <div style="display:flex;flex-direction:column;">
                    <span style="font-weight:600;">${user.enrolledCourses?.length || 0} Courses</span>
                    ${user.enrolledCourses?.length > 0 ? `<small style="color:var(--text-muted);">${user.enrolledCourses.map(c => c.courseId?.title).filter(Boolean).join(', ')}</small>` : ''}
                </div>
            </td>
            <td style="color:var(--text-muted);">${Helpers.formatDate(user.createdAt)}</td>
        </tr>`;
},

    statCard(title, value, color = '') {
        return `
            <div class="stat-card">
                <div class="stat-title">${title}</div>
                <div class="stat-value" style="${color ? `color:${color}` : ''}">${value}</div>
            </div>
        `;
    }
};