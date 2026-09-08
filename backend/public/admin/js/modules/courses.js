// Courses Module
window.CoursesModule = {
    state: {
        currentCourseId: null,
        courseContent: null,
        currentLang: 0
    },

  // In courses.js - Update the render method
async render() {
    try {
        const data = await API.getCourses();
        const courses = Helpers.extractCourses(data);

        if (courses.length === 0) {
            return `
                <div class="flex justify-between items-center" style="margin-bottom:24px">
                    <h2>All Courses &amp; Content</h2>
                    <button class="btn btn-primary" onclick="App.navigateTo('course-form')">+ Create Course</button>
                </div>
                ${Renderers.emptyState('No courses found. Create your first course!')}
            `;
        }

        const coursesHtml = courses.map(c => Renderers.courseCard(c)).join('');

        return `
            <div class="flex justify-between items-center" style="margin-bottom:24px">
                <h2>All Courses &amp; Content</h2>
                <button class="btn btn-primary" onclick="App.navigateTo('course-form')">+ Create Course</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:16px">${coursesHtml}</div>
        `;
    } catch (error) {
        console.error('Error loading courses:', error);
        return Renderers.errorMessage(error.message);
    }
},

    async renderContent(courseId) {
        App.setBreadcrumb('Course Content Player');
        App.showLoading();

        try {
            const course = await API.getCourseContent(courseId);
            this.state.courseContent = course;
            this.state.currentLang = 0;

            const firstLang = course.content?.[0];
            const firstChapter = firstLang?.chapters?.[0];
            const defaultVideoUrl = firstChapter?.videoUrl || firstChapter?.driveLink || firstChapter?.materials?.[0]?.link;

            const langTabsHtml = (course.content || []).map((lang, li) =>
                `<button class="btn ${li === 0 ? 'btn-primary' : 'btn-secondary'}" 
                        id="lang-tab-${li}" 
                        onclick="CoursesModule.switchLanguage(${li})" 
                        style="padding:6px 14px;font-size:0.85rem">${lang.language}</button>`
            ).join('');

            const chapterListsHtml = (course.content || []).map((lang, li) => `
                <div id="lang-content-${li}" style="display:${li === 0 ? 'block' : 'none'}">
                    ${(lang.chapters || []).length === 0 
                        ? '<p style="color:var(--text-muted);padding:12px">No chapters yet.</p>'
                        : lang.chapters.map((ch, ci) => {
                            const vidUrl = ch.videoUrl || ch.driveLink || ch.materials?.[0]?.link;
                            return `
                            <div class="chapter-item" id="chapter-${li}-${ci}"
                                style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:8px;cursor:pointer;transition:background 0.2s"
                                onclick="CoursesModule.playChapter(${li}, ${ci}, '${vidUrl || ''}')"
                                onmouseover="this.style.background='var(--bg-hover)'" 
                                onmouseout="this.style.background='transparent'">
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

            return `
                <div class="flex justify-between items-center" style="margin-bottom:20px">
                    <div>
                        <h2>${course.title}</h2>
                        <div style="color:var(--text-muted);font-size:0.9rem;margin-top:2px">${course.category} &bull; ${course.type} &bull; ₹${course.price}</div>
                    </div>
                    <button class="btn btn-secondary" onclick="App.navigateTo('courses')">← Back</button>
                </div>

                <div style="display:grid;grid-template-columns:1fr 340px;gap:24px;align-items:start">
                    <div>
                        <div id="course-player" style="background:#000;border-radius:16px;overflow:hidden;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center">
                            ${defaultVideoUrl 
                                ? `<iframe id="player-iframe" src="${Helpers.getEmbedUrl(defaultVideoUrl)}" style="width:100%;height:100%;border:none" allowfullscreen></iframe>`
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

                    <div class="panel" style="padding:16px;max-height:600px;overflow-y:auto">
                        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">${langTabsHtml || '<span style="color:var(--text-muted)">No languages</span>'}</div>
                        <div id="chapters-container">${chapterListsHtml || '<p style="color:var(--text-muted)">No content available.</p>'}</div>
                    </div>
                </div>
            `;
        } catch (err) {
            return Renderers.errorMessage(err.message);
        }
    },

    switchLanguage(langIndex) {
        const course = this.state.courseContent;
        if (!course) return;

        course.content.forEach((_, i) => {
            const el = document.getElementById(`lang-content-${i}`);
            const btn = document.getElementById(`lang-tab-${i}`);
            if (el) el.style.display = 'none';
            if (btn) {
                btn.className = 'btn btn-secondary';
                btn.style.padding = '6px 14px';
                btn.style.fontSize = '0.85rem';
            }
        });

        const target = document.getElementById(`lang-content-${langIndex}`);
        const activeBtn = document.getElementById(`lang-tab-${langIndex}`);
        if (target) target.style.display = 'block';
        if (activeBtn) {
            activeBtn.className = 'btn btn-primary';
        }
        this.state.currentLang = langIndex;
    },

    playChapter(langIndex, chIndex, videoUrl) {
        const player = document.getElementById('course-player');
        const titleEl = document.getElementById('playing-title');
        const course = this.state.courseContent;
        const chapter = course?.content?.[langIndex]?.chapters?.[chIndex];

        if (titleEl && chapter) titleEl.textContent = chapter.title;

        if (player) {
            if (videoUrl) {
                const embed = Helpers.getEmbedUrl(videoUrl);
                player.innerHTML = `<iframe src="${embed}" style="width:100%;height:100%;border:none" allowfullscreen allow="autoplay"></iframe>`;
            } else {
                player.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:40px">No video for this chapter.</div>`;
            }
        }

        document.querySelectorAll('.chapter-item').forEach(el => el.style.background = 'transparent');
        const activeItem = document.getElementById(`chapter-${langIndex}-${chIndex}`);
        if (activeItem) activeItem.style.background = 'rgba(59,130,246,0.15)';
    },

  // In courses.js - Update renderForm
renderForm(courseId = null) {
    const isEdit = !!courseId;
    const title = isEdit ? 'Edit Course Details' : 'Course Information';
    const buttonText = isEdit ? 'Update Course' : 'Create Course';
    
    return `
        <div class="panel">
            <div class="panel-header flex justify-between items-center">
                <h3>${title}</h3>
                <button class="btn btn-secondary" onclick="App.navigateTo('courses')">← Back to Courses</button>
            </div>
            
            <form id="course-form" onsubmit="CoursesModule.handleSubmit(event, '${courseId || ''}')">
                <div class="course-form-grid">
                    <div class="form-group full-width">
                        <label class="form-label">Course Title *</label>
                        <input type="text" id="course-title" class="form-control" placeholder="e.g. Complete Web Development" required>
                    </div>
                    
                    <div class="form-group full-width">
                        <label class="form-label">Description</label>
                        <textarea id="course-description" class="form-control" rows="3" placeholder="Detailed description..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Type</label>
                        <select id="course-type" class="form-control">
                            <option value="Course">Course</option>
                            <option value="Tutorial">Tutorial</option>
                            <option value="Workshop">Workshop</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <input type="text" id="course-category" class="form-control" placeholder="e.g. AI, Web, Design">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Price (INR)</label>
                        <input type="number" id="course-price" class="form-control" placeholder="0" value="0">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Discounted Price (INR)</label>
                        <input type="number" id="course-discount" class="form-control" placeholder="0" value="0">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Is Free?</label>
                        <select id="course-free" class="form-control">
                            <option value="false">No (Paid)</option>
                            <option value="true">Yes (Free)</option>
                        </select>
                    </div>
                    
                    <div class="form-group full-width">
                        <label class="form-label">Affiliate Commission (INR)</label>
                        <input type="number" id="course-commission" class="form-control" placeholder="0" value="0">
                        <small class="text-muted">Amount to credit to the referring user's wallet when this course is purchased.</small>
                    </div>
                    
                    <div class="form-group full-width" id="outcomes-container">
                        <div class="flex justify-between items-center" style="margin-bottom:8px;">
                            <label class="form-label" style="margin-bottom:0;">Course Benefits (Outcomes)</label>
                            <button type="button" class="btn btn-secondary" style="padding:4px 12px;font-size:0.8rem;" onclick="CoursesModule.addOutcomeInput()">+ Add Benefit</button>
                        </div>
                        <div id="outcomes-list" style="display:flex;flex-direction:column;gap:8px;">
                            <div class="flex gap-4 items-center">
                                <input type="text" class="form-control outcome-input" placeholder="e.g. Master React from scratch">
                                <button type="button" class="btn btn-secondary text-danger" onclick="this.parentElement.remove()" style="padding:10px;">X</button>
                            </div>
                        </div>
                    </div>

                    <div class="form-group full-width" style="margin-top:24px;border-top:1px solid var(--border);padding-top:24px;">
                        <h4 style="margin-bottom:16px;">Add Course Material (Video / Document)</h4>
                        <label class="form-label">Paste Media/Drive Link here to preview</label>
                        <input type="text" id="media-link-input" class="form-control" placeholder="https://youtube.com/... or https://drive.google.com/...">
                        
                        <div class="preview-pane" id="preview-pane">
                            <div class="preview-placeholder">
                                <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1" fill="none" style="opacity:0.5;margin-bottom:8px;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg><br>
                                Media Preview Area<br>
                                <small>Paste a valid link above to view it instantly on this screen.</small>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="margin-top:32px;display:flex;justify-content:flex-end;gap:12px;">
                    <button type="button" class="btn btn-secondary" onclick="App.navigateTo('courses')">Cancel</button>
                    <button type="submit" class="btn btn-primary">${buttonText}</button>
                </div>
            </form>
        </div>
    `;
},

// Add this method to handle form submission
async handleSubmit(event, courseId) {
    event.preventDefault();
    
    // Get form data
    const title = document.getElementById('course-title').value.trim();
    const description = document.getElementById('course-description').value.trim();
    const type = document.getElementById('course-type').value;
    const category = document.getElementById('course-category').value.trim();
    const price = parseFloat(document.getElementById('course-price').value) || 0;
    const discount = parseFloat(document.getElementById('course-discount').value) || 0;
    const isFree = document.getElementById('course-free').value === 'true';
    const commission = parseFloat(document.getElementById('course-commission').value) || 0;
    
    // Get outcomes
    const outcomeInputs = document.querySelectorAll('.outcome-input');
    const outcomes = Array.from(outcomeInputs).map(input => input.value.trim()).filter(Boolean);
    
    // Validate
    if (!title) {
        alert('Please enter a course title');
        return;
    }
    
    const courseData = {
        title,
        description,
        type,
        category,
        price: isFree ? 0 : price,
        discountedPrice: isFree ? 0 : discount,
        isFree,
        affiliateCommission: commission,
        outcomes
    };
    
    try {
        let result;
        if (courseId) {
            // Update existing course
            result = await API.put(`/api/admin/courses/${courseId}`, courseData);
        } else {
            // Create new course
            result = await API.post('/api/admin/courses', courseData);
        }
        
        alert(courseId ? 'Course updated successfully!' : 'Course created successfully!');
        App.navigateTo('courses');
    } catch (error) {
        alert('Error saving course: ' + error.message);
    }
},

    addOutcomeInput() {
        const list = document.getElementById('outcomes-list');
        const div = document.createElement('div');
        div.className = 'flex gap-4 items-center';
        div.innerHTML = `
            <input type="text" class="form-control outcome-input" placeholder="e.g. Master React from scratch">
            <button type="button" class="btn btn-secondary text-danger" onclick="this.parentElement.remove()" style="padding:10px;">X</button>
        `;
        list.appendChild(div);
    },

    async renderDetails(courseId) {
        this.state.currentCourseId = courseId;
        App.setBreadcrumb('Course Overview & Moderation');
        App.showLoading();

        try {
            const data = await API.getCourseStats(courseId);
            const students = data.students || [];
            const comments = data.comments || [];

            const studentsHtml = students.length > 0
                ? students.map(s => `
                    <tr>
                        <td>${Helpers.safeString(s.name)}</td>
                        <td>${s.email}</td>
                        <td>${Renderers.progressBar(s.progress, s.completed)}</td>
                    </tr>
                `).join('')
                : '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">No students enrolled yet.</td></tr>';

            return `
                <div class="flex justify-between items-center" style="margin-bottom:24px;">
                    <h2>Course Intelligence</h2>
                    <button class="btn btn-secondary" onclick="App.navigateTo('courses')">Back to Courses</button>
                </div>
                
                <div class="grid-cards" style="margin-bottom:24px;">
                    ${Renderers.statCard('Total Revenue Generated', `₹${data.revenue || 0}`, 'var(--success)')}
                    ${Renderers.statCard('Enrolled Students', students.length)}
                </div>

                <div class="tab-navigation" style="display:flex;gap:0;margin-bottom:24px;border-bottom:2px solid var(--border);">
                    <button class="tab-btn active" data-tab="students" onclick="CoursesModule.switchTab('students')" 
                            style="padding:12px 24px;background:transparent;border:none;border-bottom:3px solid var(--primary);font-weight:600;cursor:pointer;color:var(--primary);">
                        📊 Student Progress
                    </button>
                    <button class="tab-btn" data-tab="discussion" onclick="CoursesModule.switchTab('discussion')" 
                            style="padding:12px 24px;background:transparent;border:none;border-bottom:3px solid transparent;font-weight:600;cursor:pointer;color:var(--text-muted);">
                        💬 Discussion & Moderation
                    </button>
                </div>

                <div id="tab-students" class="tab-content" style="display:block;">
                    <div class="panel">
                        <div class="panel-header"><h3>Student Progress Tracking</h3></div>
                        <div class="table-wrapper">
                            <table class="table">
                                <thead><tr><th>Student Name</th><th>Email</th><th>Course Progress</th></tr></thead>
                                <tbody>${studentsHtml}</tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div id="tab-discussion" class="tab-content" style="display:none;">
                    <div class="panel">
                        <div class="panel-header">
                            <h3>Discussion & Moderation</h3>
                            <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
                                <button class="btn btn-primary" style="padding:4px 12px;font-size:0.8rem;" onclick="CommentsModule.filter('all')">All</button>
                                <button class="btn btn-secondary" style="padding:4px 12px;font-size:0.8rem;" onclick="CommentsModule.filter('unreplied')">Unreplied</button>
                                <button class="btn btn-secondary" style="padding:4px 12px;font-size:0.8rem;" onclick="CommentsModule.filter('open')">Open</button>
                                <button class="btn btn-secondary" style="padding:4px 12px;font-size:0.8rem;" onclick="CommentsModule.filter('closed')">Closed</button>
                                <button class="btn btn-secondary" style="padding:4px 12px;font-size:0.8rem;" onclick="CommentsModule.filter('latest')">Latest First</button>
                            </div>
                        </div>
                        <div id="course-comments-container">
                            ${CommentsModule.buildHtml(comments)}
                        </div>
                    </div>
                </div>
            `;
        } catch (err) {
            return Renderers.errorMessage(err.message);
        }
    },

    switchTab(tab) {
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

        document.getElementById('tab-students').style.display = tab === 'students' ? 'block' : 'none';
        document.getElementById('tab-discussion').style.display = tab === 'discussion' ? 'block' : 'none';
    }
};