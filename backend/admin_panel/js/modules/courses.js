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
                const data = await API.get(`/api/admin/courses/${courseId}/content`).catch(() => API.get(`/api/courses/${courseId}`));
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
                        
                        <div class="form-group full-width">
                            <label class="form-label" style="font-weight:700;">🖼️ Course Thumbnail Image</label>
                            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                                <input type="file" id="course-thumb-file" accept="image/*" style="display:none;" 
                                       onchange="CoursesModule.handleThumbnailUpload(this.files[0])">
                                <button type="button" class="btn btn-secondary" style="padding:9px 16px; display:inline-flex; align-items:center; gap:6px; font-size:0.88rem;"
                                        onclick="document.getElementById('course-thumb-file').click()">
                                    📁 Upload Thumbnail File
                                </button>
                                <input type="text" id="course-thumbnail" class="form-control" style="flex:1; min-width:240px;" 
                                       value="${course?.thumbnail || ''}" placeholder="or paste Image URL / server path..."
                                       oninput="CoursesModule.previewThumbnail(this.value)">
                            </div>

                            <!-- Live Upload Progress Bar -->
                            <div id="course-thumb-progress-box" style="display:none; margin-top:8px;">
                                <div style="display:flex; justify-content:space-between; font-size:0.78rem; margin-bottom:4px;">
                                    <span id="course-thumb-status-text" style="color:var(--text-muted);">Uploading image to server...</span>
                                    <span id="course-thumb-percent-text" style="font-weight:700; color:var(--primary);">0%</span>
                                </div>
                                <div style="width:100%; height:7px; background:var(--bg-hover, #e2e8f0); border-radius:10px; overflow:hidden;">
                                    <div id="course-thumb-progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #3b82f6, #10b981); transition:width 0.15s ease;"></div>
                                </div>
                            </div>

                            <!-- Image Preview -->
                            <div id="course-thumb-preview-wrap" style="margin-top:10px; ${course?.thumbnail ? '' : 'display:none;'}">
                                <img id="course-thumb-preview" src="${course?.thumbnail || ''}" alt="Course Thumbnail" 
                                     style="max-width:220px; height:120px; object-fit:cover; border-radius:8px; border:1px solid var(--border);"
                                     onerror="this.parentElement.style.display='none'">
                            </div>
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

                    <!-- Resource Bundles (Zip, PDF, Sheets, Project Files) -->
                    <div class="form-group full-width" style="margin-top:24px; background:var(--bg-dark); padding:16px; border-radius:8px; border:1px solid var(--border);">
                        <div class="flex justify-between items-center" style="margin-bottom:8px;">
                            <div>
                                <label class="form-label" style="margin-bottom:2px; font-weight:600; color:var(--text-main); font-size:1rem;">📦 Course Resource Bundles (.ZIP, Sheets, PDFs)</label>
                                <p class="text-muted" style="font-size:0.82rem; margin:0;">Attach course-wide downloadable packs, project starter archives, spreadsheets, or cheatsheets.</p>
                            </div>
                            <button type="button" class="btn btn-secondary" style="padding:6px 14px; font-size:0.82rem;" 
                                    onclick="CoursesModule.addBundle()">+ Add Bundle</button>
                        </div>
                        <div id="bundles-list" style="display:flex; flex-direction:column; gap:10px; margin-top:12px;">
                            ${(course?.resourceBundles && course.resourceBundles.length > 0)
                                ? course.resourceBundles.map(b => this.renderBundleRow(b)).join('')
                                : '<p id="no-bundles-msg" class="text-muted" style="margin:8px 0; font-size:0.85rem;">No resource bundles attached yet. Click "+ Add Bundle" to add files.</p>'}
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

    renderBundleRow(bundle = {}) {
        const title = bundle.title || '';
        const desc = bundle.description || '';
        const fileType = bundle.fileType || 'zip';
        const fileUrl = bundle.fileUrl || '';
        const fileSize = bundle.fileSize || '';
        const isFree = !!bundle.isFreePreview;
        const uid = 'bundle_' + Math.floor(Math.random() * 1000000);

        return `
            <div class="bundle-row" style="background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:8px; padding:12px;">
                <div style="display:grid; grid-template-columns: 2fr 1fr 1fr auto; gap:8px; margin-bottom:8px; align-items:center;">
                    <input type="text" class="form-control bundle-title" placeholder="Bundle Title (e.g. Project Code .ZIP, Cheat Sheet .PDF)" value="${title}" required>
                    <select class="form-control bundle-type">
                        <option value="zip" ${fileType === 'zip' ? 'selected' : ''}>📦 ZIP Package</option>
                        <option value="pdf" ${fileType === 'pdf' ? 'selected' : ''}>📄 PDF Document</option>
                        <option value="sheet" ${fileType === 'sheet' ? 'selected' : ''}>📊 Spreadsheet / Excel</option>
                        <option value="code" ${fileType === 'code' ? 'selected' : ''}>💻 Code Files</option>
                        <option value="notes" ${fileType === 'notes' ? 'selected' : ''}>📑 Notes / Slides</option>
                        <option value="other" ${fileType === 'other' ? 'selected' : ''}>📁 Other Asset</option>
                    </select>
                    <input type="text" class="form-control bundle-size" placeholder="Size (e.g. 25 MB)" value="${fileSize}">
                    <button type="button" class="btn btn-danger" style="padding:6px 12px;" onclick="this.closest('.bundle-row').remove()">✕</button>
                </div>
                <div style="display:grid; grid-template-columns: 1fr auto; gap:8px; align-items:center; margin-bottom:8px;">
                    <input type="text" id="${uid}_url" class="form-control bundle-url" placeholder="File URL / server link" value="${fileUrl}" required>
                    <label class="btn btn-secondary" style="margin:0; padding:8px 14px; cursor:pointer; font-size:0.82rem; white-space:nowrap;">
                        ⬆ Upload File
                        <input type="file" style="display:none;" onchange="CoursesModule.handleBundleUpload(this, '${uid}_url')">
                    </label>
                </div>
                <div style="display:grid; grid-template-columns: 1fr auto; gap:8px; align-items:center;">
                    <input type="text" class="form-control bundle-desc" placeholder="Brief description (e.g. Full source code and exercise starter files)" value="${desc}">
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; color:var(--text-main); margin:0; cursor:pointer; white-space:nowrap;">
                        <input type="checkbox" class="bundle-free-preview" ${isFree ? 'checked' : ''}> Free Preview?
                    </label>
                </div>
            </div>
        `;
    },

    addBundle() {
        const list = document.getElementById('bundles-list');
        const emptyMsg = document.getElementById('no-bundles-msg');
        if (emptyMsg) emptyMsg.remove();
        if (list) {
            const temp = document.createElement('div');
            temp.innerHTML = this.renderBundleRow();
            list.appendChild(temp.firstElementChild);
        }
    },

    async handleBundleUpload(inputEl, targetInputId) {
        const file = inputEl.files?.[0];
        if (!file) return;

        const targetInput = document.getElementById(targetInputId);
        if (!targetInput) return;
        const originalText = targetInput.value;
        targetInput.value = 'Uploading ' + file.name + '...';

        try {
            const formData = new FormData();
            formData.append('material', file);

            const res = await this.uploadWithProgress('/api/upload/material', formData, (percent) => {
                targetInput.value = `Uploading... ${percent}%`;
            });

            if (res.downloadUrl || res.url) {
                targetInput.value = res.downloadUrl || res.url;
                const row = targetInput.closest('.bundle-row');
                const sizeInput = row?.querySelector('.bundle-size');
                if (sizeInput && !sizeInput.value) {
                    const mb = (file.size / (1024 * 1024)).toFixed(1);
                    sizeInput.value = mb > 0.1 ? `${mb} MB` : `${Math.round(file.size / 1024)} KB`;
                }
            } else {
                targetInput.value = originalText;
                alert('Upload did not return a valid URL');
            }
        } catch (err) {
            console.error('Bundle upload error:', err);
            targetInput.value = originalText;
            alert('Upload failed: ' + err.message);
        }
    },

    togglePricing(value) {
        const isFree = value === 'true';
        const priceEl = document.getElementById('course-price');
        const discountEl = document.getElementById('course-discount');
        if (priceEl) priceEl.disabled = isFree;
        if (discountEl) discountEl.disabled = isFree;
    },

    uploadWithProgress(url, formData, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            const token = localStorage.getItem('adminToken') || (window.API && window.API.token);
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && onProgress) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    onProgress(percent, e.loaded, e.total);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch {
                        resolve({ success: true });
                    }
                } else {
                    try {
                        const err = JSON.parse(xhr.responseText);
                        reject(new Error(err.message || 'Upload failed'));
                    } catch {
                        reject(new Error(`Upload failed (${xhr.status})`));
                    }
                }
            };

            xhr.onerror = () => reject(new Error('Network error during file upload'));
            xhr.send(formData);
        });
    },

    previewThumbnail(url) {
        const previewEl = document.getElementById('course-thumb-preview');
        const wrapEl = document.getElementById('course-thumb-preview-wrap');
        if (url && previewEl && wrapEl) {
            previewEl.src = url;
            wrapEl.style.display = 'block';
        } else if (wrapEl) {
            wrapEl.style.display = 'none';
        }
    },

    async handleThumbnailUpload(file) {
        if (!file) return;

        const progressBox = document.getElementById('course-thumb-progress-box');
        const progressBar = document.getElementById('course-thumb-progress-bar');
        const percentText = document.getElementById('course-thumb-percent-text');
        const statusText = document.getElementById('course-thumb-status-text');
        const inputEl = document.getElementById('course-thumbnail');

        if (progressBox) progressBox.style.display = 'block';
        if (progressBar) progressBar.style.width = '0%';
        if (percentText) percentText.textContent = '0%';
        if (statusText) statusText.textContent = `Uploading ${file.name}...`;

        try {
            const formData = new FormData();
            formData.append('thumbnail', file);

            const data = await this.uploadWithProgress(
                '/api/upload/thumbnail',
                formData,
                (percent) => {
                    if (progressBar) progressBar.style.width = `${percent}%`;
                    if (percentText) percentText.textContent = `${percent}%`;
                }
            );

            const fileUrl = data.url || data.fullUrl;
            if (inputEl) inputEl.value = fileUrl;
            this.previewThumbnail(fileUrl);

            if (statusText) {
                statusText.innerHTML = `✅ Uploaded successfully: <strong>${data.fileName || file.name}</strong>`;
            }
            if (percentText) percentText.textContent = '100%';
            if (progressBar) progressBar.style.background = '#10b981';
        } catch (err) {
            console.error('Thumbnail upload error:', err);
            if (statusText) {
                statusText.innerHTML = `<span style="color:#ef4444;">❌ Upload failed: ${err.message}</span>`;
            }
            alert('Thumbnail upload failed: ' + err.message);
        }
    },

    async handleChapterFileUpload(inputEl) {
        const file = inputEl.files && inputEl.files[0];
        if (!file) return;

        const formGroup = inputEl.closest('.form-group');
        const targetInput = formGroup ? formGroup.querySelector('.chapter-drive') : null;
        const progressBox = formGroup ? formGroup.querySelector('.chapter-upload-progress') : null;
        const progressBar = formGroup ? formGroup.querySelector('.chapter-progress-fill') : null;
        const percentText = formGroup ? formGroup.querySelector('.chapter-progress-pct') : null;
        const statusText = formGroup ? formGroup.querySelector('.chapter-progress-label') : null;

        if (progressBox) progressBox.style.display = 'block';
        if (progressBar) progressBar.style.width = '0%';
        if (percentText) percentText.textContent = '0%';
        if (statusText) statusText.textContent = `Uploading ${file.name}...`;

        try {
            const formData = new FormData();
            formData.append('material', file);

            const data = await this.uploadWithProgress(
                '/api/upload/material',
                formData,
                (percent) => {
                    if (progressBar) progressBar.style.width = `${percent}%`;
                    if (percentText) percentText.textContent = `${percent}%`;
                }
            );

            const fileUrl = data.url || data.fullUrl;
            if (targetInput) targetInput.value = fileUrl;

            // Live badge for uploaded file
            let attachedBadge = formGroup ? formGroup.querySelector('.chapter-attached-badge') : null;
            if (!attachedBadge && formGroup) {
                attachedBadge = document.createElement('div');
                attachedBadge.className = 'chapter-attached-badge';
                attachedBadge.style = 'font-size:0.78rem; color:var(--text-main); margin-top:5px; background:rgba(99,102,241,0.12); padding:4px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:6px;';
                formGroup.appendChild(attachedBadge);
            }
            if (attachedBadge) {
                attachedBadge.innerHTML = `<span>📎 Attached:</span> <a href="${fileUrl}" target="_blank" style="color:var(--primary); font-weight:600; text-decoration:underline;">${data.fileName || file.name}</a>`;
            }

            if (statusText) {
                statusText.innerHTML = `✅ Saved to server: <strong>${data.fileName || file.name}</strong> (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
            }
            if (percentText) percentText.textContent = '100%';
            if (progressBar) progressBar.style.background = '#10b981';
        } catch (err) {
            console.error('Chapter file upload error:', err);
            if (statusText) {
                statusText.innerHTML = `<span style="color:#ef4444;">❌ Upload failed: ${err.message}</span>`;
            }
            alert('File upload failed: ' + err.message);
        }
    },

    async handleMaterialFileUpload(inputEl) {
        const file = inputEl.files && inputEl.files[0];
        if (!file) return;

        const row = inputEl.closest('.material-row');
        const titleInput = row ? row.querySelector('.material-title') : null;
        const linkInput = row ? row.querySelector('.material-link') : null;
        const typeSelect = row ? row.querySelector('.material-type') : null;
        const progressBox = row ? row.querySelector('.material-upload-progress') : null;
        const progressBar = row ? row.querySelector('.material-progress-fill') : null;
        const percentText = row ? row.querySelector('.material-progress-pct') : null;
        const statusText = row ? row.querySelector('.material-progress-label') : null;

        // Auto-detect type
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (typeSelect) {
            if (ext === '.pdf') typeSelect.value = 'pdf';
            else if (['.xlsx', '.xls', '.csv', '.ods', '.tsv'].includes(ext)) typeSelect.value = 'sheet';
            else if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.bmp'].includes(ext)) typeSelect.value = 'image';
            else if (['.ppt', '.pptx'].includes(ext)) typeSelect.value = 'slides';
            else if (['.txt', '.doc', '.docx'].includes(ext)) typeSelect.value = 'notes';
            else if (['.mp4', '.mov', '.webm', '.mkv'].includes(ext)) typeSelect.value = 'video';
            else typeSelect.value = 'other';
        }

        // Auto-fill title if empty
        if (titleInput && !titleInput.value.trim()) {
            titleInput.value = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        }

        if (progressBox) progressBox.style.display = 'block';
        if (progressBar) progressBar.style.width = '0%';
        if (percentText) percentText.textContent = '0%';
        if (statusText) statusText.textContent = `Uploading ${file.name}...`;

        try {
            const formData = new FormData();
            formData.append('material', file);

            const data = await this.uploadWithProgress(
                '/api/upload/material',
                formData,
                (percent) => {
                    if (progressBar) progressBar.style.width = `${percent}%`;
                    if (percentText) percentText.textContent = `${percent}%`;
                }
            );

            const fileUrl = data.url || data.fullUrl;
            if (linkInput) linkInput.value = fileUrl;

            // Live badge for uploaded material
            let attachedBadge = row ? row.querySelector('.material-attached-badge') : null;
            if (!attachedBadge && row) {
                attachedBadge = document.createElement('div');
                attachedBadge.className = 'material-attached-badge';
                attachedBadge.style = 'font-size:0.74rem; color:var(--text-muted); width:100%; margin-top:4px; padding-left:4px;';
                row.appendChild(attachedBadge);
            }
            if (attachedBadge) {
                attachedBadge.innerHTML = `<span>Attached file:</span> <a href="${fileUrl}" target="_blank" style="color:var(--primary); font-weight:500; text-decoration:underline;">${data.fileName || file.name}</a>`;
            }

            if (statusText) {
                statusText.innerHTML = `✅ Saved to server: <strong>${data.fileName || file.name}</strong> (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
            }
            if (percentText) percentText.textContent = '100%';
            if (progressBar) progressBar.style.background = '#10b981';
        } catch (err) {
            console.error('Material upload error:', err);
            if (statusText) {
                statusText.innerHTML = `<span style="color:#ef4444;">❌ Upload failed: ${err.message}</span>`;
            }
            alert('File upload failed: ' + err.message);
        }
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

        const resourceBundles = Array.from(document.querySelectorAll('.bundle-row')).map(row => ({
            title: row.querySelector('.bundle-title')?.value.trim() || '',
            description: row.querySelector('.bundle-desc')?.value.trim() || '',
            fileType: row.querySelector('.bundle-type')?.value || 'zip',
            fileUrl: row.querySelector('.bundle-url')?.value.trim() || '',
            fileSize: row.querySelector('.bundle-size')?.value.trim() || '',
            isFreePreview: row.querySelector('.bundle-free-preview')?.checked || false
        })).filter(b => b.title && b.fileUrl);

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
            continuationCourses,
            resourceBundles
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
            const data = await API.get(`/api/admin/courses/${courseId}/content`).catch(() => API.get(`/api/courses/${courseId}`));
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
                    <label class="form-label" style="font-weight:600;">📄 Chapter Document / Sheet / Notes / Drive Link</label>
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <input type="file" class="chapter-file-picker" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,.xlsx,.xls,.csv,.ods,image/*" style="display:none;" 
                               onchange="CoursesModule.handleChapterFileUpload(this)">
                        <button type="button" class="btn btn-secondary" style="padding:8px 14px; font-size:0.84rem; display:inline-flex; align-items:center; gap:6px; white-space:nowrap;"
                                onclick="this.previousElementSibling.click()">
                            📁 Upload File / PDF / Sheet
                        </button>
                        <input type="text" class="form-control chapter-drive" value="${ch.driveLink || ''}" placeholder="or paste Drive / Material URL" style="flex:1; min-width:220px;">
                    </div>
                    ${ch.driveLink ? `
                    <div style="font-size:0.78rem; color:var(--text-main); margin-top:5px; background:rgba(99,102,241,0.12); padding:4px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:6px;">
                        <span>📎 Attached:</span>
                        <a href="${ch.driveLink}" target="_blank" style="color:var(--primary); font-weight:600; text-decoration:underline;">
                            ${decodeURIComponent(ch.driveLink.split('/').pop().split('?')[0])}
                        </a>
                    </div>` : ''}
                    <!-- Upload Progression -->
                    <div class="chapter-upload-progress" style="display:none; margin-top:6px;">
                        <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:3px;">
                            <span class="chapter-progress-label" style="color:var(--text-muted);">Uploading document...</span>
                            <span class="chapter-progress-pct" style="font-weight:700; color:var(--primary);">0%</span>
                        </div>
                        <div style="width:100%; height:6px; background:var(--bg-hover, #e2e8f0); border-radius:10px; overflow:hidden;">
                            <div class="chapter-progress-fill" style="width:0%; height:100%; background:linear-gradient(90deg, #3b82f6, #10b981); transition:width 0.15s ease;"></div>
                        </div>
                    </div>
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
            <div class="flex gap-2 items-center material-row" style="background:var(--bg-primary);padding:10px;border-radius:8px; flex-wrap:wrap; border:1px solid var(--border);">
                <select class="form-control material-type" style="width:130px; font-size:0.85rem;">
                    <option value="pdf" ${material.type === 'pdf' ? 'selected' : ''}>📄 PDF</option>
                    <option value="sheet" ${material.type === 'sheet' ? 'selected' : ''}>📈 Sheet (Excel/CSV)</option>
                    <option value="image" ${material.type === 'image' ? 'selected' : ''}>🖼️ Image</option>
                    <option value="notes" ${material.type === 'notes' ? 'selected' : ''}>📝 Notes / Doc</option>
                    <option value="slides" ${material.type === 'slides' ? 'selected' : ''}>📊 Slides</option>
                    <option value="video" ${material.type === 'video' ? 'selected' : ''}>🎬 Video</option>
                    <option value="other" ${material.type === 'other' ? 'selected' : ''}>📎 Other</option>
                </select>
                <input type="text" class="form-control material-title" placeholder="Document Title" value="${material.title || ''}" style="flex:1; min-width:140px;">
                
                <input type="file" class="material-file-picker" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,.xlsx,.xls,.csv,.ods,image/*" style="display:none;" 
                       onchange="CoursesModule.handleMaterialFileUpload(this)">
                <button type="button" class="btn btn-secondary" style="padding:7px 12px; font-size:0.82rem; white-space:nowrap; display:inline-flex; align-items:center; gap:5px;"
                        onclick="this.previousElementSibling.click()">
                    📁 Upload File
                </button>
                <input type="text" class="form-control material-link" placeholder="Material URL / Server path" value="${material.link || ''}" style="flex:2; min-width:200px;">
                <button type="button" class="btn btn-danger" style="padding:8px 12px;" onclick="this.closest('.material-row').remove()">✕</button>
                ${material.link ? `
                <div style="font-size:0.74rem; color:var(--text-muted); width:100%; margin-top:4px; padding-left:4px;">
                    <span>Attached file:</span>
                    <a href="${material.link}" target="_blank" style="color:var(--primary); font-weight:500; text-decoration:underline;">
                        ${decodeURIComponent(material.link.split('/').pop().split('?')[0])}
                    </a>
                </div>` : ''}

                <!-- Real-time Progress Bar for Material -->
                <div class="material-upload-progress" style="display:none; width:100%; margin-top:6px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:3px;">
                        <span class="material-progress-label" style="color:var(--text-muted);">Uploading file to server...</span>
                        <span class="material-progress-pct" style="font-weight:700; color:var(--primary);">0%</span>
                    </div>
                    <div style="width:100%; height:6px; background:var(--bg-hover, #e2e8f0); border-radius:10px; overflow:hidden;">
                        <div class="material-progress-fill" style="width:0%; height:100%; background:linear-gradient(90deg, #3b82f6, #10b981); transition:width 0.15s ease;"></div>
                    </div>
                </div>
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
                    <label class="form-label" style="font-weight:600;">📄 Chapter Document / Notes / Drive Link</label>
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <input type="file" class="chapter-file-picker" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,image/*" style="display:none;" 
                               onchange="CoursesModule.handleChapterFileUpload(this)">
                        <button type="button" class="btn btn-secondary" style="padding:8px 14px; font-size:0.84rem; display:inline-flex; align-items:center; gap:6px; white-space:nowrap;"
                                onclick="this.previousElementSibling.click()">
                            📁 Upload File / PDF
                        </button>
                        <input type="text" class="form-control chapter-drive" placeholder="or paste Drive / Material URL" style="flex:1; min-width:220px;">
                    </div>
                    <!-- Upload Progression -->
                    <div class="chapter-upload-progress" style="display:none; margin-top:6px;">
                        <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:3px;">
                            <span class="chapter-progress-label" style="color:var(--text-muted);">Uploading document...</span>
                            <span class="chapter-progress-pct" style="font-weight:700; color:var(--primary);">0%</span>
                        </div>
                        <div style="width:100%; height:6px; background:var(--bg-hover, #e2e8f0); border-radius:10px; overflow:hidden;">
                            <div class="chapter-progress-fill" style="width:0%; height:100%; background:linear-gradient(90deg, #3b82f6, #10b981); transition:width 0.15s ease;"></div>
                        </div>
                    </div>
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
                // Reload course with full content
                const data = await API.get(`/api/admin/courses/${courseId}/content`).catch(() => API.get(`/api/courses/${courseId}`));
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