// Content Manager - Hub with tabs for Courses, Tutorials, Events
window.ContentManager = {
    state: {
        activeTab: 'courses'
    },

    async render() {
        try {
            const [coursesData, tutorialsData, eventsData] = await Promise.all([
                API.getCourses(),
                API.get('/api/trials'),
                API.get('/api/events')
            ]);

            const courses = coursesData.courses || coursesData || [];
            const tutorials = tutorialsData.tutorials || tutorialsData || [];
            const events = eventsData.events || eventsData || [];

            return `
                <div style="margin-bottom:24px">
                    <div class="flex justify-between items-center" style="margin-bottom:16px">
                        <h2>Content Management</h2>
                    </div>
                    
                    <!-- Tab Navigation -->
                    <div class="tab-navigation" style="display:flex;gap:0;border-bottom:2px solid var(--border);">
                        ${this.renderTab('courses', '📚 Courses', courses.length)}
                        ${this.renderTab('tutorials', '🎯 Trial Tutorials', tutorials.length)}
                        ${this.renderTab('events', '📅 Events', events.length)}
                    </div>
                </div>

                <!-- Tab Content -->
                <div id="tab-content-courses" style="display:${this.state.activeTab === 'courses' ? 'block' : 'none'}">
                    ${this.renderCourseList(courses)}
                </div>
                <div id="tab-content-tutorials" style="display:${this.state.activeTab === 'tutorials' ? 'block' : 'none'}">
                    ${this.renderTutorialList(tutorials)}
                </div>
                <div id="tab-content-events" style="display:${this.state.activeTab === 'events' ? 'block' : 'none'}">
                    ${this.renderEventList(events)}
                </div>
            `;
        } catch (error) {
            console.error('Error loading content:', error);
            return Renderers.errorMessage(error.message);
        }
    },

    renderTab(tabId, label, count) {
        const isActive = this.state.activeTab === tabId;
        return `
            <button class="tab-btn" 
                    data-tab="${tabId}" 
                    onclick="ContentManager.switchTab('${tabId}')"
                    style="padding:12px 24px;background:transparent;border:none;
                           border-bottom:3px solid ${isActive ? 'var(--primary)' : 'transparent'};
                           font-weight:600;cursor:pointer;
                           color:${isActive ? 'var(--primary)' : 'var(--text-muted)'};">
                ${label} (${count})
            </button>
        `;
    },

    switchTab(tab) {
        this.state.activeTab = tab;
        App.navigateTo('content');
    },

    // ==================== COURSE LIST ====================
    renderCourseList(courses) {
        if (!courses || courses.length === 0) {
            return `
                <div class="flex justify-between items-center" style="margin-bottom:24px">
                    <h3>All Courses</h3>
                    <button class="btn btn-primary" onclick="App.navigateTo('course-form')">+ Create Course</button>
                </div>
                ${Renderers.emptyState('No courses found. Create your first course!')}
            `;
        }

        const coursesHtml = courses.map(c => this.renderCourseCard(c)).join('');

        return `
            <div class="flex justify-between items-center" style="margin-bottom:24px">
                <h3>All Courses (${courses.length})</h3>
                <button class="btn btn-primary" onclick="App.navigateTo('course-form')">+ Create Course</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:16px">${coursesHtml}</div>
        `;
    },

    renderCourseCard(course) {
        const chapterCount = (course.content || []).reduce((n, lang) => n + (lang.chapters?.length || 0), 0);
        const languages = (course.languages || []).join(', ') || 'None';
        
        return `
            <div class="panel" style="display:flex;gap:16px;align-items:center;padding:16px;">
                ${course.thumbnail ? `<img src="${course.thumbnail}" style="width:120px;height:80px;object-fit:cover;border-radius:8px;" alt="${course.title}">` : 
                  `<div style="width:120px;height:80px;background:var(--bg-secondary);border-radius:8px;display:flex;align-items:center;justify-content:center;">📚</div>`}
                <div style="flex:1;min-width:0;">
                    <h4 style="margin-bottom:4px;">
                        ${Helpers.safeString(course.title, 'Untitled')}
                        <span class="badge" style="background:${course.isFree ? 'var(--success)' : 'var(--primary)'};margin-left:8px;">
                            ${course.isFree ? 'FREE' : '₹' + (course.price || 0)}
                        </span>
                    </h4>
                    <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:4px;">${Helpers.safeString(course.description, '').substring(0, 100)}...</p>
                    <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:0.8rem;color:var(--text-muted);">
                        <span>📁 ${course.category}</span>
                        <span>🎬 ${chapterCount} chapters</span>
                        <span>🌐 ${languages}</span>
                        <span>💰 Commission: ₹${course.affiliateCommission || 0}</span>
                    </div>
                </div>
                <div style="display:flex;gap:8px;flex-shrink:0;">
                    <button class="btn btn-secondary" onclick="App.navigateTo('course-content', '${course._id}')">📝 Content</button>
                    <button class="btn btn-secondary" onclick="App.navigateTo('course-details', '${course._id}')">📊 Details</button>
                    <button class="btn btn-secondary" onclick="App.navigateTo('course-form', '${course._id}')">✏️ Edit</button>
                    <button class="btn btn-danger" onclick="ContentManager.deleteCourse('${course._id}')">🗑️</button>
                </div>
            </div>
        `;
    },

    // ==================== TUTORIAL LIST ====================
    renderTutorialList(tutorials) {
        if (!tutorials || tutorials.length === 0) {
            return `
                <div class="flex justify-between items-center" style="margin-bottom:24px">
                    <h3>Trial Tutorials</h3>
                    <button class="btn btn-primary" onclick="App.navigateTo('tutorial-form')">+ Create Tutorial</button>
                </div>
                ${Renderers.emptyState('No trial tutorials found. Create your first tutorial!')}
            `;
        }

        const tutorialsHtml = tutorials.map(t => `
            <div class="panel" style="display:flex;gap:16px;align-items:center;padding:16px;">
                ${t.thumbnail ? `<img src="${t.thumbnail}" style="width:120px;height:80px;object-fit:cover;border-radius:8px;" alt="${t.title}">` : 
                  `<div style="width:120px;height:80px;background:var(--bg-secondary);border-radius:8px;display:flex;align-items:center;justify-content:center;">🎯</div>`}
                <div style="flex:1;">
                    <h4 style="margin-bottom:4px;">${Helpers.safeString(t.title)}</h4>
                    <p style="color:var(--text-muted);font-size:0.9rem;">${Helpers.safeString(t.description, '').substring(0, 100)}...</p>
                    <div style="display:flex;gap:12px;margin-top:8px;font-size:0.8rem;color:var(--text-muted);">
                        <span>📁 ${t.category || 'General'}</span>
                        <span>⏱️ ${t.duration || 'N/A'}</span>
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-secondary" onclick="App.navigateTo('tutorial-form', '${t._id}')">✏️ Edit</button>
                    <button class="btn btn-danger" onclick="ContentManager.deleteTutorial('${t._id}')">🗑️</button>
                </div>
            </div>
        `).join('');

        return `
            <div class="flex justify-between items-center" style="margin-bottom:24px">
                <h3>Trial Tutorials (${tutorials.length})</h3>
                <button class="btn btn-primary" onclick="App.navigateTo('tutorial-form')">+ Create Tutorial</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:16px">${tutorialsHtml}</div>
        `;
    },

    // ==================== EVENT LIST ====================
    renderEventList(events) {
        if (!events || events.length === 0) {
            return `
                <div class="flex justify-between items-center" style="margin-bottom:24px">
                    <h3>Events</h3>
                    <button class="btn btn-primary" onclick="App.navigateTo('event-form')">+ Create Event</button>
                </div>
                ${Renderers.emptyState('No events found. Create your first event!')}
            `;
        }

        const eventsHtml = events.map(e => `
            <div class="panel" style="display:flex;gap:16px;align-items:center;padding:16px;">
                ${e.thumbnail ? `<img src="${e.thumbnail}" style="width:120px;height:80px;object-fit:cover;border-radius:8px;" alt="${e.title}">` : 
                  `<div style="width:120px;height:80px;background:var(--bg-secondary);border-radius:8px;display:flex;align-items:center;justify-content:center;">📅</div>`}
                <div style="flex:1;">
                    <h4 style="margin-bottom:4px;">${Helpers.safeString(e.title)}</h4>
                    <p style="color:var(--text-muted);font-size:0.9rem;">${Helpers.safeString(e.description, '').substring(0, 100)}...</p>
                    <div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;font-size:0.8rem;">
                        <span style="color:var(--primary);">${e.type}</span>
                        <span style="color:var(--text-muted);">📅 ${new Date(e.dateTime).toLocaleString()}</span>
                        <span style="color:var(--text-muted);">⏱️ ${e.duration || 'N/A'}</span>
                        ${e.isPaid ? `<span style="color:var(--success);">₹${e.price}</span>` : '<span style="color:var(--success);">Free</span>'}
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-secondary" onclick="App.navigateTo('event-details', '${e._id}')">📊 Details</button>
                    <button class="btn btn-secondary" onclick="App.navigateTo('event-form', '${e._id}')">✏️ Edit</button>
                    <button class="btn btn-danger" onclick="ContentManager.deleteEvent('${e._id}')">🗑️</button>
                </div>
            </div>
        `).join('');

        return `
            <div class="flex justify-between items-center" style="margin-bottom:24px">
                <h3>Events (${events.length})</h3>
                <button class="btn btn-primary" onclick="App.navigateTo('event-form')">+ Create Event</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:16px">${eventsHtml}</div>
        `;
    },

    // ==================== DELETE METHODS ====================
    async deleteCourse(id) {
        if (!confirm('Delete this course? This cannot be undone.')) return;
        try {
            await API.delete(`/api/courses/${id}`);
            alert('Course deleted');
            App.navigateTo('content');
        } catch (error) {
            alert('Error: ' + error.message);
        }
    },

    async deleteTutorial(id) {
        if (!confirm('Delete this tutorial?')) return;
        try {
            await API.delete(`/api/trials/${id}`);
            alert('Tutorial deleted');
            App.navigateTo('content');
        } catch (error) {
            alert('Error: ' + error.message);
        }
    },

    async deleteEvent(id) {
        if (!confirm('Delete this event?')) return;
        try {
            await API.delete(`/api/events/${id}`);
            alert('Event deleted');
            App.navigateTo('content');
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
};