// Courses Module - Full CRUD + Content Editor
window.CoursesModule = {
    state: {
        currentCourse: null,
        currentLangIndex: 0
    },

    // ==================== FORM RENDER ====================
    async renderForm(courseId = null) {
        let course = null;
        let allCoursesList = [];

        try {
            const allRes = await API.get('/api/courses');
            allCoursesList = allRes.courses || allRes || [];
        } catch (e) {
            console.error('Failed to fetch courses list for continuation:', e);
        }

        if (courseId) {
            try {
                const data = await API.get(`/api/courses/${courseId}`);
                course = data.course || data;
            } catch (error) {
                return Renderers.errorMessage('Failed to load course: ' + error.message);
            }
        }

        const isEdit = !!course;
        const selectedContinuationIds = (course?.continuationCourses || []).map(c => (typeof c === 'object' && c !== null) ? c._id : c);

        return `
            <div class="panel">
                <div class="panel-header flex justify-between items-center">
                    <h3>${isEdit ? 'Edit Course' : 'Create New Course'}</h3>
                    <button class="btn btn-secondary" onclick="App.navigateTo('content')">← Back</button>
                </div>
                
                <form id="course-form">
                    <div class="course-form-grid">
                        <!-- Basic Info -->
                        <div class="form-group full-width">
                            <label class="form-label">Course Title *</label>
                            <input type="text" id="course-title" class="form-control" 
                                   value="${course?.title || ''}" required>
                        </div>
                        
                        <div class="form-group full-width">
                            <label class="form-label">Description *</label>
                            <textarea id="course-description" class="form-control" rows="3" required>${course?.description || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Type</label>
                            <select id="course-type" class="form-control">
                                <option value="Course" ${course?.type === 'Course' ? 'selected' : ''}>Course</option>
                                <option value="Tutorial" ${course?.type === 'Tutorial' ? 'selected' : ''}>Tutorial</option>
                                <option value="Workshop" ${course?.type === 'Workshop' ? 'selected' : ''}>Workshop</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Category *</label>
                            <input type="text" id="course-category" class="form-control" 
                                   value="${course?.category || ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Package Type</label>
                            <select id="course-package" class="form-control">
                                <option value="Starter" ${course?.packageType === 'Starter' ? 'selected' : ''}>Starter</option>
                                <option value="Professional" ${course?.packageType === 'Professional' ? 'selected' : ''}>Professional</option>
                                <option value="Master" ${course?.packageType === 'Master' ? 'selected' : ''}>Master</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Thumbnail URL</label>
                            <input type="url" id="course-thumbnail" class="form-control" 
                                   value="${course?.thumbnail || ''}">
                        </div>
                        
                        <!-- Pricing -->
                        <div class="form-group">
                            <label class="form-label">Is Free?</label>
                            <select id="course-free" class="form-control" onchange="CoursesModule.togglePricing(this.value)">
                                <option value="false" ${!course?.isFree ? 'selected' : ''}>No (Paid)</option>
                                <option value="true" ${course?.isFree ? 'selected' : ''}>Yes (Free)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Price (INR)</label>
                            <input type="number" id="course-price" class="form-control" 
                                   value="${course?.price || 0}" min="0">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Discounted Price (INR)</label>
                            <input type="number" id="course-discount" class="form-control" 
                                   value="${course?.discountedPrice || 0}" min="0">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Affiliate Commission (INR)</label>
                            <input type="number" id="course-commission" class="form-control" 
                                   value="${course?.affiliateCommission || 0}" min="0">
                        </div>

                        <div class="form-group">
                            <label class="form-label">⭐ Highlight on Homepage?</label>
                            <select id="course-featured" class="form-control">
                                <option value="false" ${!course?.isFeatured ? 'selected' : ''}>No</option>
                                <option value="true" ${course?.isFeatured ? 'selected' : ''}>Yes (Showcase on Landing Page)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Mapped Follow-up / Continuation Courses Selector -->
                    <div class="form-group full-width" style="margin-top:24px; background:var(--bg-dark); padding:16px; border-radius:8px; border:1px solid var(--border);">
                        <label class="form-label" style="font-weight:600; color:var(--text-main); font-size:1rem;">🚀 Mapped Continuation / Follow-up Courses</label>
                        <p class="text-muted" style="font-size:0.85rem; margin-bottom:12px;">Select next-step programs (Free or Paid) to showcase under the Dedicated Sales Page & Course Viewer funnel.</p>
                        
                        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:10px; max-height:220px; overflow-y:auto; padding:8px; background:rgba(0,0,0,0.2); border-radius:6px; border:1px solid var(--border);">
                            ${allCoursesList.filter(c => !courseId || c._id !== courseId).map(c => {
                                const isChecked = selectedContinuationIds.includes(c._id);
                                return `
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.88rem; padding:6px 8px; border-radius:4px; background:${isChecked ? 'rgba(59,130,246,0.2)' : 'transparent'}; border:1px solid ${isChecked ? 'var(--primary)' : 'transparent'};">
                                        <input type="checkbox" class="continuation-checkbox" value="${c._id}" ${isChecked ? 'checked' : ''}>
                                        <span style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--text-main);">${c.title}</span>
                                        <span class="badge" style="font-size:0.7rem; background:${c.isFree ? 'var(--success)' : 'var(--primary)'};">${c.isFree ? 'FREE' : '₹' + (c.discountedPrice || c.price)}</span>
                                    </label>
                                `;
                            }).join('') || '<p class="text-muted" style="margin:0;">No other courses available yet.</p>'}
                        </div>
                    </div>

                    <!-- Outcomes (Dynamic List) -->
                    <div class="form-group full-width" style="margin-top:24px;">
                        <div class="flex justify-between items-center" style="margin-bottom:8px;">
                            <label class="form-label" style="margin-bottom:0;">Course Outcomes / Benefits</label>
                            <button type="button" class="btn btn-secondary" style="padding:4px 12px;font-size:0.8rem;" 
                                    onclick="CoursesModule.addOutcome()">+ Add Outcome</button>
                        </div>
                        <div id="outcomes-list" style="display:flex;flex-direction:column;gap:8px;">
                            ${(course?.outcomes || ['']).map(o => this.renderOutcomeRow(o)).join('')}
                        </div>
                    </div>

                    <!-- Languages (Dynamic List) -->
                    <div class="form-group full-width" style="margin-top:24px;">
                        <div class="flex justify-between items-center" style="margin-bottom:8px;">
                            <label class="form-label" style="margin-bottom:0;">Available Languages</label>
                            <button type="button" class="btn btn-secondary" style="padding:4px 12px;font-size:0.8rem;" 
                                    onclick="CoursesModule.addLanguage()">+ Add Language</button>
                        </div>
                        <div id="languages-list" style="display:flex;flex-direction:column;gap:8px;">
                            ${(course?.languages || ['']).map(l => this.renderLanguageRow(l)).join('')}
                        </div>
                    </div>

                    <div style="margin-top:32px;display:flex;justify-content:flex-end;gap:12px;">
                        <button type="button" class="btn btn-secondary" onclick="App.navigateTo('content')">Cancel</button>
                        <button type="submit" class="btn btn-primary">${isEdit ? 'Update Course' : 'Create Course'}</button>
                    </div>
                </form>
            </div>
        `;
    },

    renderOutcomeRow(value = '') {
        return `
            <div class="flex gap-4 items-center outcome-row">
                <input type="text" class="form-control outcome-input" value="${value}" 
                       placeholder="e.g. Master React from scratch">
                <button type="button" class="btn btn-danger" style="padding:10px 14px;" 
                        onclick="this.parentElement.remove()">✕</button>
            </div>
        `;
    },

    renderLanguageRow(value = '') {
        return `
            <div class="flex gap-4 items-center language-row">
                <input type="text" class="form-control language-input" value="${value}" 
                       placeholder="e.g. English, Hindi, Tamil">
                <button type="button" class="btn btn-danger" style="padding:10px 14px;" 
                        onclick="this.parentElement.remove()">✕</button>
            </div>
        `;
    },

    addOutcome() {
        const list = document.getElementById('outcomes-list');
        list.insertAdjacentHTML('beforeend', this.renderOutcomeRow());
    },

    addLanguage() {
        const list = document.getElementById('languages-list');
        list.insertAdjacentHTML('beforeend', this.renderLanguageRow());
    },

    togglePricing(value) {
        const isFree = value === 'true';
        const priceEl = document.getElementById('course-price');
        const discountEl = document.getElementById('course-discount');
        if (priceEl) priceEl.disabled = isFree;
        if (discountEl) discountEl.disabled = isFree;
    },

    setupForm(courseId) {
        const form = document.getElementById('course-form');
        if (!form) return;

        // Initialize pricing state
        const freeSelect = document.getElementById('course-free');
        if (freeSelect) this.togglePricing(freeSelect.value);

        form.onsubmit = (e) => this.handleSubmit(e, courseId);
    },

    async handleSubmit(event, courseId) {
        event.preventDefault();

        const outcomes = Array.from(document.querySelectorAll('.outcome-input'))
            .map(i => i.value.trim()).filter(Boolean);
        const languages = Array.from(document.querySelectorAll('.language-input'))
            .map(i => i.value.trim()).filter(Boolean);
        const continuationCourses = Array.from(document.querySelectorAll('.continuation-checkbox:checked'))
            .map(cb => cb.value);

        const courseData = {
            title: document.getElementById('course-title').value.trim(),
            description: document.getElementById('course-description').value.trim(),
            type: document.getElementById('course-type').value,
            category: document.getElementById('course-category').value.trim(),
            packageType: document.getElementById('course-package').value,
            thumbnail: document.getElementById('course-thumbnail').value.trim(),
            isFree: document.getElementById('course-free').value === 'true',
            price: parseFloat(document.getElementById('course-price').value) || 0,
            discountedPrice: parseFloat(document.getElementById('course-discount').value) || 0,
            affiliateCommission: parseFloat(document.getElementById('course-commission').value) || 0,
            isFeatured: document.getElementById('course-featured')?.value === 'true',
            outcomes,
            languages,
            continuationCourses
        };

        // Validation
        if (!courseData.title || !courseData.description || !courseData.category) {
            return alert('Title, description, and category are required');
        }

        try {
            let result;
            if (courseId) {
                result = await API.put(`/api/courses/${courseId}`, courseData);
            } else {
                result = await API.post('/api/courses', courseData);
            }

            if (result.success || result._id) {
                alert(courseId ? 'Course updated!' : 'Course created!');
                App.navigateTo('content');
            } else {
                alert('Error: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            alert('Error saving course: ' + error.message);
        }
    },

    // ==================== CONTENT EDITOR ====================
    async renderContentEditor(courseId) {
        if (!courseId) return Renderers.errorMessage('No course ID provided');

        let course;
        try {
            const data = await API.get(`/api/courses/${courseId}`);
            course = data.course || data;
        } catch (error) {
            return Renderers.errorMessage('Failed to load course: ' + error.message);
        }

        this.state.currentCourse = course;
        const content = course.content || [];

        return `
            <div class="panel">
                <div class="panel-header flex justify-between items-center">
                    <div>
                        <h3>Content Editor: ${course.title}</h3>
                        <small class="text-muted">Manage chapters and materials per language</small>
                    </div>
                    <button class="btn btn-secondary" onclick="App.navigateTo('content')">← Back</button>
                </div>

                <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap;">
                    ${course.languages?.map(lang => `
                        <button class="btn ${this.state.currentLangIndex === course.languages.indexOf(lang) ? 'btn-primary' : 'btn-secondary'}"
                                onclick="CoursesModule.switchLanguage('${lang}')">
                            ${lang}
                        </button>
                    `).join('') || '<p class="text-muted">No languages defined. Edit the course first to add languages.</p>'}
                </div>

                <div id="chapters-container">
                    ${this.renderChaptersForLanguage(content[this.state.currentLangIndex])}
                </div>

                <div style="margin-top:24px;display:flex;gap:12px;">
                    <button class="btn btn-primary" onclick="CoursesModule.addChapter()">+ Add Chapter</button>
                    <button class="btn btn-success" onclick="CoursesModule.saveContent('${courseId}')">💾 Save All Content</button>
                </div>
            </div>
        `;
    },

    renderChaptersForLanguage(langContent) {
        const chapters = langContent?.chapters || [];
        
        if (chapters.length === 0) {
            return '<p class="text-muted" style="padding:20px;text-align:center;">No chapters yet. Click "Add Chapter" to start.</p>';
        }

        return chapters.map((ch, idx) => `
            <div class="panel" style="margin-bottom:16px;padding:16px;background:var(--bg-secondary);" data-chapter-index="${idx}">
                <div class="flex justify-between items-center" style="margin-bottom:12px;">
                    <h4>Chapter ${idx + 1}</h4>
                    <button class="btn btn-danger" style="padding:6px 12px;" 
                            onclick="this.closest('.panel').remove()">✕ Remove</button>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Chapter Title *</label>
                    <input type="text" class="form-control chapter-title" value="${ch.title || ''}" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea class="form-control chapter-description" rows="2">${ch.description || ''}</textarea>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="form-group">
                        <label class="form-label">Video URL</label>
                        <input type="url" class="form-control chapter-video" value="${ch.videoUrl || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Duration</label>
                        <input type="text" class="form-control chapter-duration" value="${ch.duration || ''}" placeholder="e.g. 12:45">
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Drive Link</label>
                    <input type="url" class="form-control chapter-drive" value="${ch.driveLink || ''}">
                </div>

                <!-- Materials -->
                <div style="margin-top:12px;">
                    <div class="flex justify-between items-center" style="margin-bottom:8px;">
                        <label class="form-label" style="margin-bottom:0;">Materials</label>
                        <button type="button" class="btn btn-secondary" style="padding:4px 10px;font-size:0.75rem;" 
                                onclick="CoursesModule.addMaterial(this)">+ Add Material</button>
                    </div>
                    <div class="materials-list" style="display:flex;flex-direction:column;gap:8px;">
                        ${(ch.materials || []).map(m => this.renderMaterialRow(m)).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    },

    renderMaterialRow(material = {}) {
        return `
            <div class="flex gap-2 items-center material-row" style="background:var(--bg-primary);padding:8px;border-radius:6px;">
                <select class="form-control material-type" style="width:120px;">
                    <option value="video" ${material.type === 'video' ? 'selected' : ''}>Video</option>
                    <option value="pdf" ${material.type === 'pdf' ? 'selected' : ''}>PDF</option>
                    <option value="notes" ${material.type === 'notes' ? 'selected' : ''}>Notes</option>
                    <option value="slides" ${material.type === 'slides' ? 'selected' : ''}>Slides</option>
                    <option value="other" ${material.type === 'other' ? 'selected' : ''}>Other</option>
                </select>
                <input type="text" class="form-control material-title" placeholder="Title" value="${material.title || ''}" style="flex:1;">
                <input type="url" class="form-control material-link" placeholder="Drive link" value="${material.link || ''}" style="flex:2;">
                <button type="button" class="btn btn-danger" style="padding:8px;" 
                        onclick="this.parentElement.remove()">✕</button>
            </div>
        `;
    },

    addChapter() {
        const container = document.getElementById('chapters-container');
        const idx = container.querySelectorAll('.panel').length;
        
        const html = `
            <div class="panel" style="margin-bottom:16px;padding:16px;background:var(--bg-secondary);" data-chapter-index="${idx}">
                <div class="flex justify-between items-center" style="margin-bottom:12px;">
                    <h4>Chapter ${idx + 1}</h4>
                    <button class="btn btn-danger" style="padding:6px 12px;" 
                            onclick="this.closest('.panel').remove()">✕ Remove</button>
                </div>
                <div class="form-group">
                    <label class="form-label">Chapter Title *</label>
                    <input type="text" class="form-control chapter-title" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea class="form-control chapter-description" rows="2"></textarea>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="form-group">
                        <label class="form-label">Video URL</label>
                        <input type="url" class="form-control chapter-video">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Duration</label>
                        <input type="text" class="form-control chapter-duration" placeholder="e.g. 12:45">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Drive Link</label>
                    <input type="url" class="form-control chapter-drive">
                </div>
                <div style="margin-top:12px;">
                    <div class="flex justify-between items-center" style="margin-bottom:8px;">
                        <label class="form-label" style="margin-bottom:0;">Materials</label>
                        <button type="button" class="btn btn-secondary" style="padding:4px 10px;font-size:0.75rem;" 
                                onclick="CoursesModule.addMaterial(this)">+ Add Material</button>
                    </div>
                    <div class="materials-list" style="display:flex;flex-direction:column;gap:8px;"></div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', html);
    },

    addMaterial(btn) {
        const list = btn.closest('.panel').querySelector('.materials-list');
        list.insertAdjacentHTML('beforeend', this.renderMaterialRow());
    },

    switchLanguage(lang) {
        const course = this.state.currentCourse;
        const idx = course.languages.indexOf(lang);
        this.state.currentLangIndex = idx;
        App.navigateTo('course-content', course._id);
    },

    async saveContent(courseId) {
        const container = document.getElementById('chapters-container');
        const chapterPanels = container.querySelectorAll('.panel');
        
        const chapters = Array.from(chapterPanels).map(panel => {
            const materials = Array.from(panel.querySelectorAll('.material-row')).map(row => ({
                type: row.querySelector('.material-type').value,
                title: row.querySelector('.material-title').value.trim(),
                link: row.querySelector('.material-link').value.trim()
            })).filter(m => m.link);

            return {
                title: panel.querySelector('.chapter-title').value.trim(),
                description: panel.querySelector('.chapter-description').value.trim(),
                videoUrl: panel.querySelector('.chapter-video').value.trim(),
                duration: panel.querySelector('.chapter-duration').value.trim(),
                driveLink: panel.querySelector('.chapter-drive').value.trim(),
                materials
            };
        }).filter(ch => ch.title);

        const course = this.state.currentCourse;
        const updatedContent = [...(course.content || [])];
        
        // Update or add current language content
        const langName = course.languages[this.state.currentLangIndex];
        const existingIdx = updatedContent.findIndex(c => c.language === langName);
        
        if (existingIdx >= 0) {
            updatedContent[existingIdx].chapters = chapters;
        } else {
            updatedContent.push({ language: langName, chapters });
        }

        try {
            const result = await API.put(`/api/courses/${courseId}`, {
                ...course,
                content: updatedContent
            });

            if (result.success || result._id) {
                alert('Content saved successfully!');
                // Reload course
                const data = await API.get(`/api/courses/${courseId}`);
                this.state.currentCourse = data.course || data;
                App.navigateTo('course-content', courseId);
            } else {
                alert('Error: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            alert('Error saving content: ' + error.message);
        }
    },

    // ==================== COURSE DETAILS ====================
   // ==================== COURSE DETAILS DASHBOARD ====================
async renderDetails(courseId) {
    if (!courseId) return Renderers.errorMessage('No course ID provided');

    try {
        const data = await API.getCourseAnalytics(courseId);
        const { course, stats, students, referrals, languageStats } = data;

        return `
            <div class="panel">
                <div class="panel-header flex justify-between items-center">
                    <div>
                        <h3>📊 ${course.title}</h3>
                        <small class="text-muted">${course.category} • ${course.type} • ${course.packageType}</small>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-secondary" onclick="App.navigateTo('course-content', '${courseId}')">📝 Edit Content</button>
                        <button class="btn btn-secondary" onclick="App.navigateTo('course-form', '${courseId}')">✏️ Edit Info</button>
                        <button class="btn btn-secondary" onclick="App.navigateTo('content')">← Back</button>
                    </div>
                </div>

                <!-- ============ STAT CARDS ============ -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px;">
                    ${Renderers.statCard('👥 Enrollments', stats.totalEnrollments, 'var(--primary)')}
                    ${Renderers.statCard('✅ Completions', stats.completions, 'var(--success)')}
                    ${Renderers.statCard('📈 Avg Progress', stats.avgProgress + '%')}
                    ${Renderers.statCard('💰 Total Revenue', '₹' + stats.totalRevenue, 'var(--success)')}
                    ${Renderers.statCard('🤝 Affiliate Payouts', '₹' + stats.totalCommission, 'var(--warning)')}
                    ${Renderers.statCard('💬 Comments', stats.totalComments)}
                </div>

                <!-- ============ TABS ============ -->
                <div class="detail-tabs" style="display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:20px;">
                    ${this.renderDetailTab('students', '👥 Students (' + stats.totalEnrollments + ')', true)}
                    ${this.renderDetailTab('revenue', '💰 Revenue & Affiliates')}
                    ${this.renderDetailTab('content', '📚 Content Progress')}
                    ${this.renderDetailTab('comments', '💬 Discussions (' + stats.totalComments + ')')}
                    ${this.renderDetailTab('reviews', '⭐ Reviews & Ratings')}
                </div>

                <!-- Tab Panels -->
                <div id="detail-tab-students" class="detail-tab-panel">
                    ${this.renderStudentsTab(students)}
                </div>
                <div id="detail-tab-revenue" class="detail-tab-panel" style="display:none;">
                    ${this.renderRevenueTab(referrals, stats)}
                </div>
                <div id="detail-tab-content" class="detail-tab-panel" style="display:none;">
                    ${this.renderContentProgressTab(languageStats)}
                </div>
                <div id="detail-tab-comments" class="detail-tab-panel" style="display:none;">
                    <div id="comments-panel" data-course-id="${courseId}">
                        <div class="loading">Loading comments...</div>
                    </div>
                </div>
                <div id="detail-tab-reviews" class="detail-tab-panel" style="display:none;">
                    <div id="reviews-panel" data-course-id="${courseId}">
                        <div class="loading">Loading course reviews...</div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Course details error:', error);
        return Renderers.errorMessage('Failed to load details: ' + error.message);
    }
},

renderDetailTab(tabId, label, active = false) {
    return `
        <button class="detail-tab-btn" data-tab="${tabId}" 
                onclick="CoursesModule.switchDetailTab('${tabId}')"
                style="padding:12px 20px;background:transparent;border:none;
                       border-bottom:3px solid ${active ? 'var(--primary)' : 'transparent'};
                       font-weight:600;cursor:pointer;
                       color:${active ? 'var(--primary)' : 'var(--text-muted)'};">
            ${label}
        </button>
    `;
},

switchDetailTab(tab) {
    document.querySelectorAll('.detail-tab-btn').forEach(btn => {
        const isActive = btn.dataset.tab === tab;
        btn.style.borderBottomColor = isActive ? 'var(--primary)' : 'transparent';
        btn.style.color = isActive ? 'var(--primary)' : 'var(--text-muted)';
    });
    document.querySelectorAll('.detail-tab-panel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById('detail-tab-' + tab);
    if (panel) panel.style.display = 'block';

    // Lazy-load comments when tab is opened
    if (tab === 'comments') {
        const commentsPanel = document.getElementById('comments-panel');
        if (commentsPanel && commentsPanel.querySelector('.loading')) {
            CoursesModule.loadComments(commentsPanel.dataset.courseId);
        }
    }

    // Lazy-load reviews when tab is opened
    if (tab === 'reviews') {
        const reviewsPanel = document.getElementById('reviews-panel');
        if (reviewsPanel) {
            CoursesModule.loadAdminReviews(reviewsPanel.dataset.courseId, 'all');
        }
    }
},

// ==================== STUDENTS TAB ====================
renderStudentsTab(students) {
    if (!students || students.length === 0) {
        return Renderers.emptyState('No students enrolled yet.');
    }

    const rows = students.map(s => `
        <tr>
            <td>
                <a href="#" onclick="App.navigateTo('student-details', '${s.userId}');return false;"
                   style="color:var(--primary);font-weight:500;">
                    ${Helpers.safeString(s.name)}
                </a>
                <div style="font-size:0.8rem;color:var(--text-muted);">${s.email}</div>
            </td>
            <td>
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="flex:1;background:var(--bg-secondary);height:8px;border-radius:4px;overflow:hidden;min-width:80px;">
                        <div style="width:${s.progress}%;height:100%;background:${s.completed ? 'var(--success)' : 'var(--primary)'};"></div>
                    </div>
                    <span style="font-size:0.85rem;font-weight:600;">${s.progress}%</span>
                </div>
            </td>
            <td>
                ${s.completed
                    ? `<span class="badge" style="background:var(--success);">✓ Completed</span>`
                    : `<span class="badge" style="background:var(--text-muted);">In Progress</span>`}
            </td>
            <td style="font-weight:600;color:${s.amountPaid > 0 ? 'var(--success)' : 'var(--text-muted)'};">
                ${s.amountPaid > 0 ? '₹' + s.amountPaid : 'Free'}
                ${s.txnId ? `<div style="font-size:0.7rem;color:var(--text-muted);font-family:monospace;">${s.txnId.substring(0, 12)}...</div>` : ''}
            </td>
            <td>
                ${s.commissionEarned > 0
                    ? `<span style="color:var(--warning);font-weight:600;">₹${s.commissionEarned}</span>`
                    : '<span class="text-muted">—</span>'}
            </td>
            <td style="color:var(--text-muted);font-size:0.85rem;">
                ${s.completedAt ? Helpers.formatDate(s.completedAt) : '—'}
            </td>
        </tr>
    `).join('');

    return `
        <div style="overflow-x:auto;">
            <table class="data-table" style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="border-bottom:2px solid var(--border);text-align:left;">
                        <th style="padding:12px;">Student</th>
                        <th style="padding:12px;">Progress</th>
                        <th style="padding:12px;">Status</th>
                        <th style="padding:12px;">Amount Paid</th>
                        <th style="padding:12px;">Commission Generated</th>
                        <th style="padding:12px;">Completed On</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
},

// ==================== REVENUE TAB ====================
renderRevenueTab(referrals, stats) {
    return `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
            <div class="panel" style="background:var(--bg-secondary);">
                <h4>💰 Revenue Summary</h4>
                <div style="font-size:2rem;font-weight:700;color:var(--success);">₹${stats.totalRevenue}</div>
                <div style="color:var(--text-muted);margin-top:4px;">Total collected from this course</div>
            </div>
            <div class="panel" style="background:var(--bg-secondary);">
                <h4>🤝 Affiliate Payouts</h4>
                <div style="font-size:2rem;font-weight:700;color:var(--warning);">₹${stats.totalCommission}</div>
                <div style="color:var(--text-muted);margin-top:4px;">Commission paid to referrers</div>
            </div>
        </div>

        <h4 style="margin-bottom:12px;">Referral Transactions (${referrals.length})</h4>
        ${referrals.length === 0
            ? Renderers.emptyState('No affiliate sales yet for this course.')
            : `<div style="overflow-x:auto;">
                <table class="data-table" style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="border-bottom:2px solid var(--border);text-align:left;">
                            <th style="padding:12px;">Referrer</th>
                            <th style="padding:12px;">Buyer</th>
                            <th style="padding:12px;">Commission</th>
                            <th style="padding:12px;">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${referrals.map(r => `
                            <tr style="border-bottom:1px solid var(--border);">
                                <td style="padding:12px;">
                                    ${r.referrer
                                        ? `<a href="#" onclick="App.navigateTo('student-details','${r.referrer._id}');return false;" style="color:var(--primary);">${r.referrer.name}</a>
                                           <div style="font-size:0.75rem;color:var(--text-muted);">${r.referrer.email}</div>`
                                        : '<span class="text-muted">Deleted user</span>'}
                                </td>
                                <td style="padding:12px;">
                                    ${r.referee
                                        ? `<a href="#" onclick="App.navigateTo('student-details','${r.referee._id}');return false;" style="color:var(--primary);">${r.referee.name}</a>
                                           <div style="font-size:0.75rem;color:var(--text-muted);">${r.referee.email}</div>`
                                        : '<span class="text-muted">Deleted user</span>'}
                                </td>
                                <td style="padding:12px;font-weight:600;color:var(--warning);">₹${r.commissionAmount}</td>
                                <td style="padding:12px;color:var(--text-muted);">${Helpers.formatDate(r.createdAt)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`}
    `;
},

// ==================== CONTENT PROGRESS TAB ====================
renderContentProgressTab(languageStats) {
    if (!languageStats || languageStats.length === 0) {
        return Renderers.emptyState('No content chapters defined yet.');
    }

    return languageStats.map(lang => `
        <div class="panel" style="margin-bottom:16px;background:var(--bg-secondary);">
            <h4 style="margin-bottom:12px;">🌐 ${lang.language} — ${lang.totalChapters} chapters</h4>
            ${lang.chapters.map(ch => `
                <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);">
                    <div style="flex:1;font-weight:500;">${ch.title}</div>
                    <div style="flex:0 0 200px;background:var(--bg-primary);height:8px;border-radius:4px;overflow:hidden;">
                        <div style="width:${ch.completionRate}%;height:100%;background:var(--primary);"></div>
                    </div>
                    <div style="flex:0 0 120px;text-align:right;font-size:0.85rem;color:var(--text-muted);">
                        ${ch.completedCount} students (${ch.completionRate}%)
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');
},

// ==================== COMMENTS TAB ====================
async loadComments(courseId, filter = 'all', sortBy = 'newest') {
    const panel = document.getElementById('comments-panel');
    if (!panel) return;

    panel.innerHTML = '<div class="loading">Loading comments...</div>';

    try {
        const data = await API.getCourseComments(courseId, { filter, sortBy, page: 1, limit: 20 });
        panel.innerHTML = this.renderCommentsPanel(courseId, data, filter, sortBy);
    } catch (error) {
        panel.innerHTML = Renderers.errorMessage('Failed to load comments: ' + error.message);
    }
},

renderCommentsPanel(courseId, data, activeFilter, activeSort) {
    const { comments, counts } = data;

    const filterTabs = [
        { id: 'all', label: 'All', count: counts.all },
        { id: 'unreplied', label: '⏳ Unreplied', count: counts.unreplied },
        { id: 'questions', label: '❓ Questions', count: counts.questions },
        { id: 'unresolved', label: '🔴 Unresolved', count: counts.unresolved },
        { id: 'resolved', label: '✅ Resolved', count: counts.resolved },
        { id: 'liked', label: '❤️ Most Liked', count: counts.liked }
    ];

    const sortOptions = [
        { id: 'newest', label: '🕐 Newest First' },
        { id: 'oldest', label: '📜 Oldest First' },
        { id: 'mostLiked', label: '❤️ Most Liked' },
        { id: 'mostReplies', label: '💬 Most Replies' }
    ];

    return `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${filterTabs.map(f => `
                    <button class="btn ${activeFilter === f.id ? 'btn-primary' : 'btn-secondary'}"
                            style="padding:6px 14px;font-size:0.85rem;"
                            onclick="CoursesModule.loadComments('${courseId}', '${f.id}', '${activeSort}')">
                        ${f.label} <span style="opacity:0.7;">(${f.count})</span>
                    </button>
                `).join('')}
            </div>
            <select class="form-control" style="width:auto;" 
                    onchange="CoursesModule.loadComments('${courseId}', '${activeFilter}', this.value)">
                ${sortOptions.map(o => `
                    <option value="${o.id}" ${activeSort === o.id ? 'selected' : ''}>${o.label}</option>
                `).join('')}
            </select>
        </div>

        ${comments.length === 0
            ? Renderers.emptyState('No comments match this filter.')
            : comments.map(c => this.renderCommentCard(courseId, c)).join('')}
    `;
},

renderCommentCard(courseId, c) {
    const user = c.userId || {};
    const isAdmin = user.role === 'admin';

    return `
        <div class="panel" style="margin-bottom:12px;padding:16px;background:var(--bg-secondary);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                <div>
                    <strong>${Helpers.safeString(user.name, 'Unknown')}</strong>
                    ${isAdmin ? '<span class="badge" style="background:var(--primary);margin-left:6px;">ADMIN</span>' : ''}
                    ${c.isPinned ? '<span class="badge" style="background:var(--warning);margin-left:6px;">📌 PINNED</span>' : ''}
                    ${c.isQuestion ? '<span class="badge" style="background:#8b5cf6;margin-left:6px;">❓ QUESTION</span>' : ''}
                    ${c.isResolved ? '<span class="badge" style="background:var(--success);margin-left:6px;">✅ RESOLVED</span>' : ''}
                    <div style="font-size:0.75rem;color:var(--text-muted);">${user.email || ''} • ${Helpers.formatDate(c.createdAt)}</div>
                </div>
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-secondary" style="padding:4px 10px;font-size:0.75rem;"
                            onclick="CoursesModule.togglePin('${c._id}', '${courseId}')">
                        ${c.isPinned ? '📌 Unpin' : '📌 Pin'}
                    </button>
                    ${c.isQuestion ? `
                        <button class="btn btn-secondary" style="padding:4px 10px;font-size:0.75rem;"
                                onclick="CoursesModule.toggleResolve('${c._id}', '${courseId}')">
                            ${c.isResolved ? '↩️ Reopen' : '✅ Resolve'}
                        </button>
                    ` : ''}
                    <button class="btn btn-danger" style="padding:4px 10px;font-size:0.75rem;"
                            onclick="CoursesModule.deleteComment('${c._id}', '${courseId}')">🗑️</button>
                </div>
            </div>

            <div style="margin:8px 0;font-size:0.95rem;">${this.escapeHtml(c.text)}</div>

            <div style="display:flex;gap:12px;font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;">
                <span>❤️ ${c.likes?.length || 0} likes</span>
                <span>💬 ${c.replyCount || 0} replies</span>
            </div>

            ${c.replies && c.replies.length > 0 ? `
                <div style="border-left:3px solid var(--primary);padding-left:12px;margin-top:8px;">
                    ${c.replies.map(r => `
                        <div style="margin-bottom:8px;">
                            <strong style="font-size:0.85rem;">${Helpers.safeString(r.userId?.name, 'Unknown')}</strong>
                            ${r.userId?.role === 'admin' ? '<span class="badge" style="background:var(--primary);margin-left:4px;font-size:0.65rem;">ADMIN</span>' : ''}
                            <div style="font-size:0.85rem;color:var(--text-muted);">${this.escapeHtml(r.text)}</div>
                        </div>
                    `).join('')}
                    ${c.replyCount > 3 ? `<div style="font-size:0.8rem;color:var(--text-muted);">+ ${c.replyCount - 3} more replies</div>` : ''}
                </div>
            ` : ''}

            <!-- Reply as Admin -->
            <div style="margin-top:12px;">
                <div style="display:flex;gap:8px;">
                    <input type="text" class="form-control comment-reply-input-${c._id}" 
                           placeholder="Reply as admin..." style="flex:1;">
                    <button class="btn btn-primary" style="padding:8px 16px;"
                            onclick="CoursesModule.replyToComment('${courseId}', '${c._id}')">
                        Reply
                    </button>
                </div>
            </div>
        </div>
    `;
},

escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
},

// ==================== COMMENT ACTIONS ====================
async togglePin(commentId, courseId) {
    try {
        await API.pinComment(commentId);
        this.loadComments(courseId);
    } catch (e) { alert('Error: ' + e.message); }
},

async toggleResolve(commentId, courseId) {
    try {
        await API.resolveComment(commentId);
        this.loadComments(courseId);
    } catch (e) { alert('Error: ' + e.message); }
},

async deleteComment(commentId, courseId) {
    if (!confirm('Delete this comment and all its replies?')) return;
    try {
        await API.deleteCommentAdmin(commentId);
        this.loadComments(courseId);
    } catch (e) { alert('Error: ' + e.message); }
},

async replyToComment(courseId, commentId) {
    const input = document.querySelector(`.comment-reply-input-${commentId}`);
    const text = input?.value?.trim();
    if (!text) return alert('Please enter a reply');

    try {
        await API.replyAsAdmin(courseId, commentId, text);
        input.value = '';
        this.loadComments(courseId);
    } catch (e) { alert('Error: ' + e.message); }
},

    // ==================== REVIEWS & FEEDBACK TAB ====================
    async loadAdminReviews(courseId, filterRating = 'all') {
        const panel = document.getElementById('reviews-panel');
        if (!panel) return;

        try {
            const data = await API.get(`/api/reviews/course/${courseId}?rating=${filterRating}`);
            const { stats, reviews } = data;

            const renderStars = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

            let reviewsListHtml = '';
            if (!reviews || reviews.length === 0) {
                reviewsListHtml = Renderers.emptyState('No reviews found for this filter.');
            } else {
                reviewsListHtml = reviews.map(r => `
                    <div style="background:var(--bg-dark);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
                            <div>
                                <strong style="font-size:1rem;color:var(--text-main);">${Helpers.safeString(r.userId?.name, 'Student')}</strong>
                                <span style="font-size:0.8rem;color:var(--text-muted);margin-left:8px;">${r.userId?.email || ''}</span>
                                ${r.isVerifiedPurchase ? `<span class="badge" style="background:var(--success);margin-left:8px;">✓ Verified Student</span>` : ''}
                            </div>
                            <div style="color:#f59e0b;font-weight:700;font-size:1.1rem;">
                                ${renderStars(r.rating)} (${r.rating}/5)
                            </div>
                        </div>

                        ${r.headline ? `<h5 style="margin:4px 0;font-weight:700;color:var(--text-main);">${Helpers.safeString(r.headline)}</h5>` : ''}
                        <p style="color:var(--text-main);line-height:1.5;margin:8px 0;font-size:0.92rem;">${Helpers.safeString(r.comment)}</p>
                        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px;">Submitted: ${new Date(r.createdAt).toLocaleString()}</div>

                        <!-- Admin Reply Display -->
                        ${r.adminReply && r.adminReply.text ? `
                            <div style="background:rgba(59,130,246,0.1);border-left:4px solid var(--primary);padding:12px;border-radius:6px;margin-bottom:12px;">
                                <div style="font-size:0.8rem;font-weight:700;color:var(--primary);margin-bottom:4px;">
                                    💬 Admin Official Reply (${new Date(r.adminReply.repliedAt).toLocaleDateString()}):
                                </div>
                                <div style="font-size:0.9rem;color:var(--text-main);">${Helpers.safeString(r.adminReply.text)}</div>
                            </div>
                        ` : ''}

                        <!-- Action Controls -->
                        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:12px;">
                            <div style="flex:1;display:flex;gap:8px;">
                                <input type="text" class="form-control review-reply-input-${r._id}" 
                                       placeholder="${r.adminReply?.text ? 'Edit your admin reply...' : 'Type admin reply to student...'}" 
                                       value="${r.adminReply?.text || ''}"
                                       style="padding:6px 12px;font-size:0.85rem;">
                                <button class="btn btn-primary" style="font-size:0.85rem;padding:6px 14px;"
                                        onclick="CoursesModule.replyToReviewAdmin('${r._id}', '${courseId}')">
                                    ${r.adminReply?.text ? 'Update Reply' : 'Reply'}
                                </button>
                            </div>
                            <button class="btn btn-danger" style="font-size:0.85rem;padding:6px 12px;"
                                    onclick="CoursesModule.deleteReviewAdmin('${r._id}', '${courseId}')">
                                🗑️ Delete Review
                            </button>
                        </div>
                    </div>
                `).join('');
            }

            panel.innerHTML = `
                <!-- Filter & Header Controls -->
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;margin-bottom:20px;">
                    <div>
                        <h4 style="margin:0;font-size:1.1rem;">⭐ Course Ratings & Reviews Overview</h4>
                        <span style="font-size:0.85rem;color:var(--text-muted);">
                            Average Rating: <strong>${stats.avgRating || '4.9'} / 5 ★</strong> (${stats.totalReviews || 0} Total Reviews)
                        </span>
                    </div>

                    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                        <span style="font-size:0.85rem;color:var(--text-muted);font-weight:600;">Filter Rating:</span>
                        <select class="form-control" style="width:auto;padding:6px 12px;font-size:0.85rem;" 
                                onchange="CoursesModule.loadAdminReviews('${courseId}', this.value)">
                            <option value="all" ${filterRating === 'all' ? 'selected' : ''}>🌟 All Reviews (${stats.totalReviews || 0})</option>
                            <option value="low" ${filterRating === 'low' ? 'selected' : ''}>⚠️ Needs Attention (1-3 Stars)</option>
                            <option value="high" ${filterRating === 'high' ? 'selected' : ''}>⭐ High Ratings (4-5 Stars)</option>
                            <option value="5" ${filterRating === '5' ? 'selected' : ''}>5 Stars (${stats.distribution[5] || 0})</option>
                            <option value="4" ${filterRating === '4' ? 'selected' : ''}>4 Stars (${stats.distribution[4] || 0})</option>
                            <option value="3" ${filterRating === '3' ? 'selected' : ''}>3 Stars (${stats.distribution[3] || 0})</option>
                            <option value="2" ${filterRating === '2' ? 'selected' : ''}>2 Stars (${stats.distribution[2] || 0})</option>
                            <option value="1" ${filterRating === '1' ? 'selected' : ''}>1 Star (${stats.distribution[1] || 0})</option>
                        </select>
                    </div>
                </div>

                <!-- Reviews Cards List -->
                <div>${reviewsListHtml}</div>
            `;
        } catch (err) {
            console.error('Error loading admin reviews:', err);
            panel.innerHTML = Renderers.errorMessage('Failed to load reviews: ' + err.message);
        }
    },

    async replyToReviewAdmin(reviewId, courseId) {
        const input = document.querySelector(`.review-reply-input-${reviewId}`);
        const replyText = input?.value?.trim();
        if (!replyText) {
            alert('Please enter a reply before submitting.');
            return;
        }
        try {
            const res = await API.post(`/api/reviews/${reviewId}/reply`, { replyText });
            if (res.success) {
                alert('✅ Admin reply published!');
                this.loadAdminReviews(courseId);
            }
        } catch (err) {
            alert('Failed to save reply: ' + err.message);
        }
    },

    async deleteReviewAdmin(reviewId, courseId) {
        if (!confirm('Are you sure you want to delete this student review? This action cannot be undone.')) return;
        try {
            const res = await API.delete(`/api/reviews/${reviewId}`);
            if (res.success) {
                alert('🗑️ Review deleted successfully!');
                this.loadAdminReviews(courseId);
            }
        } catch (err) {
            alert('Failed to delete review: ' + err.message);
        }
    }
};