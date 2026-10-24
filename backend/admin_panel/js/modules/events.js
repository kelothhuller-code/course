// Events Module - Full CRUD + Analytics + Bulk Email
window.EventsModule = {
    state: {
        currentEvent: null,
        currentStats: null,
        currentStudents: []
    },

    // ==================== FORM ====================
    async renderForm(eventId = null) {
        let event = null;
        if (eventId) {
            try {
                const data = await API.get(`/api/events/${eventId}`);
                event = data.event || data;
            } catch (error) {
                return Renderers.errorMessage('Failed to load event: ' + error.message);
            }
        }

        const isEdit = !!event;

        let dateTimeValue = '';
        if (event?.dateTime) {
            const dt = new Date(event.dateTime);
            const pad = n => String(n).padStart(2, '0');
            dateTimeValue = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
        }

        return `
            <div class="panel">
                <div class="panel-header flex justify-between items-center">
                    <h3>${isEdit ? 'Edit Event' : 'Create Event'}</h3>
                    <button class="btn btn-secondary" onclick="App.navigateTo('content')">← Back</button>
                </div>
                
                <form id="event-form">
                    <div class="form-group full-width">
                        <label class="form-label">Event Title *</label>
                        <input type="text" id="event-title" class="form-control" 
                               value="${event?.title || ''}" required>
                    </div>
                    
                    <div class="form-group full-width">
                        <label class="form-label">Description *</label>
                        <textarea id="event-description" class="form-control" rows="3" required>${event?.description || ''}</textarea>
                    </div>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                        <div class="form-group">
                            <label class="form-label">Event Type *</label>
                            <select id="event-type" class="form-control" required>
                                <option value="webinar" ${event?.type === 'webinar' ? 'selected' : ''}>Webinar</option>
                                <option value="workshop" ${event?.type === 'workshop' ? 'selected' : ''}>Workshop</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Date & Time *</label>
                            <input type="datetime-local" id="event-datetime" class="form-control" 
                                   value="${dateTimeValue}" required>
                        </div>
                    </div>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                        <div class="form-group">
                            <label class="form-label">Meeting Type *</label>
                            <select id="event-meeting-type" class="form-control" required>
                                <option value="jitsi" ${event?.meetingType === 'jitsi' ? 'selected' : ''}>Jitsi Meet (100% Free Embedded Video Conf)</option>
                                <option value="embed_youtube" ${event?.meetingType === 'embed_youtube' ? 'selected' : ''}>YouTube / Twitch Live Embed + Chat</option>
                                <option value="external" ${event?.meetingType === 'external' ? 'selected' : ''}>External Direct Link (Zoom / Meet)</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Meeting Passcode / Key</label>
                            <input type="text" id="event-passcode" class="form-control" 
                                   value="${event?.meetingPasscode || ''}" placeholder="Optional passcode">
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label">Meeting / Stream Embed Link *</label>
                        <input type="url" id="event-link" class="form-control" 
                               value="${event?.meetingLink || ''}" required placeholder="https://meet.jit.si/myroom or https://youtube.com/embed/..." >
                    </div>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
                        <div class="form-group">
                            <label class="form-label">Duration</label>
                            <input type="text" id="event-duration" class="form-control" 
                                   value="${event?.duration || ''}" placeholder="e.g. 1.5 Hours">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Is Paid?</label>
                            <select id="event-paid" class="form-control">
                                <option value="false" ${!event?.isPaid ? 'selected' : ''}>Free</option>
                                <option value="true" ${event?.isPaid ? 'selected' : ''}>Paid</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Price (INR)</label>
                            <input type="number" id="event-price" class="form-control" 
                                   value="${event?.price || 0}" min="0">
                        </div>
                    </div>
                    
                    <div class="form-group full-width">
                        <label class="form-label" style="font-weight:700;">🖼️ Event Thumbnail Image</label>
                        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                            <input type="file" id="event-thumb-file" accept="image/*" style="display:none;" 
                                   onchange="EventsModule.handleThumbnailUpload(this.files[0])">
                            <button type="button" class="btn btn-secondary" style="padding:9px 16px; display:inline-flex; align-items:center; gap:6px; font-size:0.88rem;"
                                    onclick="document.getElementById('event-thumb-file').click()">
                                📁 Upload Thumbnail File
                            </button>
                            <input type="text" id="event-thumbnail" class="form-control" style="flex:1; min-width:240px;" 
                                   value="${event?.thumbnail || ''}" placeholder="or paste Image URL / server path..."
                                   oninput="EventsModule.previewThumbnail(this.value)">
                        </div>

                        <!-- Live Upload Progress Bar -->
                        <div id="event-thumb-progress-box" style="display:none; margin-top:8px;">
                            <div style="display:flex; justify-content:space-between; font-size:0.78rem; margin-bottom:4px;">
                                <span id="event-thumb-status-text" style="color:var(--text-muted);">Uploading image to server...</span>
                                <span id="event-thumb-percent-text" style="font-weight:700; color:var(--primary);">0%</span>
                            </div>
                            <div style="width:100%; height:7px; background:var(--bg-hover, #e2e8f0); border-radius:10px; overflow:hidden;">
                                <div id="event-thumb-progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #3b82f6, #10b981); transition:width 0.15s ease;"></div>
                            </div>
                        </div>

                        <!-- Image Preview -->
                        <div id="event-thumb-preview-wrap" style="margin-top:10px; ${event?.thumbnail ? '' : 'display:none;'}">
                            <img id="event-thumb-preview" src="${event?.thumbnail || ''}" alt="Event Thumbnail" 
                                 style="max-width:220px; height:120px; object-fit:cover; border-radius:8px; border:1px solid var(--border);"
                                 onerror="this.parentElement.style.display='none'">
                        </div>
                    </div>

                    <div style="margin-top:32px;display:flex;justify-content:flex-end;gap:12px;">
                        <button type="button" class="btn btn-secondary" onclick="App.navigateTo('content')">Cancel</button>
                        <button type="submit" class="btn btn-primary">${isEdit ? 'Update Event' : 'Create Event'}</button>
                    </div>
                </form>
            </div>
        `;
    },

    previewThumbnail(url) {
        const previewEl = document.getElementById('event-thumb-preview');
        const wrapEl = document.getElementById('event-thumb-preview-wrap');
        if (url && previewEl && wrapEl) {
            previewEl.src = url;
            wrapEl.style.display = 'block';
        } else if (wrapEl) {
            wrapEl.style.display = 'none';
        }
    },

    async handleThumbnailUpload(file) {
        if (!file) return;

        const progressBox = document.getElementById('event-thumb-progress-box');
        const progressBar = document.getElementById('event-thumb-progress-bar');
        const percentText = document.getElementById('event-thumb-percent-text');
        const statusText = document.getElementById('event-thumb-status-text');
        const inputEl = document.getElementById('event-thumbnail');

        if (progressBox) progressBox.style.display = 'block';
        if (progressBar) progressBar.style.width = '0%';
        if (percentText) percentText.textContent = '0%';
        if (statusText) statusText.textContent = `Uploading ${file.name}...`;

        try {
            const formData = new FormData();
            formData.append('thumbnail', file);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/upload/thumbnail', true);
            const token = localStorage.getItem('adminToken') || (window.API && window.API.token);
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    if (progressBar) progressBar.style.width = `${percent}%`;
                    if (percentText) percentText.textContent = `${percent}%`;
                }
            };

            const data = await new Promise((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({}); }
                    } else {
                        reject(new Error(`Upload failed (${xhr.status})`));
                    }
                };
                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.send(formData);
            });

            const fileUrl = data.url || data.fullUrl;
            if (inputEl) inputEl.value = fileUrl;
            this.previewThumbnail(fileUrl);

            if (statusText) statusText.innerHTML = `✅ Uploaded successfully: <strong>${data.fileName || file.name}</strong>`;
            if (percentText) percentText.textContent = '100%';
            if (progressBar) progressBar.style.background = 'var(--success)';
        } catch (err) {
            console.error('Event thumbnail upload error:', err);
            if (statusText) statusText.innerHTML = `<span style="color: var(--danger);">❌ Upload failed: ${err.message}</span>`;
            alert('Upload failed: ' + err.message);
        }
    },

    setupForm(eventId) {
        const form = document.getElementById('event-form');
        if (!form) return;

        form.onsubmit = async (e) => {
            e.preventDefault();

            const data = {
                title: document.getElementById('event-title').value.trim(),
                description: document.getElementById('event-description').value.trim(),
                type: document.getElementById('event-type').value,
                dateTime: document.getElementById('event-datetime').value,
                meetingType: document.getElementById('event-meeting-type').value,
                meetingPasscode: document.getElementById('event-passcode')?.value?.trim() || '',
                meetingLink: document.getElementById('event-link').value.trim(),
                duration: document.getElementById('event-duration').value.trim(),
                isPaid: document.getElementById('event-paid').value === 'true',
                price: parseFloat(document.getElementById('event-price').value) || 0,
                thumbnail: document.getElementById('event-thumbnail').value.trim()
            };

            if (!data.title || !data.description || !data.dateTime || !data.meetingLink) {
                return alert('Title, description, date/time, and meeting link are required');
            }

            try {
                let result;
                if (eventId) {
                    result = await API.put(`/api/events/${eventId}`, data);
                } else {
                    result = await API.post('/api/events', data);
                }

                if (result.success || result._id) {
                    alert(eventId ? 'Event updated!' : 'Event created!');
                    App.navigateTo('content');
                } else {
                    alert('Error: ' + (result.message || 'Unknown error'));
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        };
    },

    // ==================== DETAILS DASHBOARD ====================
    async renderDetails(eventId) {
        if (!eventId) return Renderers.errorMessage('No event ID provided');

        try {
            const data = await API.getEventAnalytics(eventId);
            const { event, stats, students } = data;

            // Cache for bulk email
            this.state.currentEvent = event;
            this.state.currentStats = stats;
            this.state.currentStudents = students;

            return `
                <div class="panel">
                    <div class="panel-header flex justify-between items-center">
                        <div>
                            <h3>📊 ${event.title}</h3>
                            <small class="text-muted">
                                ${event.type.toUpperCase()} • 
                                ${new Date(event.dateTime).toLocaleString()} • 
                                ${event.duration || 'N/A'}
                            </small>
                        </div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            <a href="${event.meetingLink}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">🔗 Join Link</a>
                            <button class="btn btn-secondary" onclick="EventsModule.exportRosterCSV('${eventId}')">
                                📥 Export Roster CSV
                            </button>
                            <button class="btn btn-primary" onclick="EventsModule.openBroadcastModal('${eventId}')">
                                ✉️ Send Email to Attendees
                            </button>
                            <button class="btn btn-secondary" onclick="App.navigateTo('event-form', '${eventId}')">✏️ Edit</button>
                            <button class="btn btn-secondary" onclick="App.navigateTo('content')">← Back</button>
                        </div>
                    </div>

                    <!-- ============ STAT CARDS ============ -->
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px;">
                        ${Renderers.statCard('👥 Registrations', stats.totalRegistrations, 'var(--primary)')}
                        ${Renderers.statCard('💰 Total Revenue', '₹' + stats.totalRevenue, 'var(--success)')}
                        ${Renderers.statCard('🎟️ Paid Attendees', stats.paidCount, 'var(--warning)')}
                        ${Renderers.statCard('🆓 Free Attendees', stats.freeCount)}
                        ${Renderers.statCard('💵 Avg Ticket', '₹' + stats.avgTicket)}
                        ${Renderers.statCard('📅 Event Status', stats.statusLabel)}
                    </div>

                    <!-- ============ TABS ============ -->
                    <div class="detail-tabs" style="display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:20px;">
                        ${this.renderDetailTab('registrations', '👥 Registrations (' + stats.totalRegistrations + ')', true)}
                        ${event.isPaid ? this.renderDetailTab('revenue', '💰 Revenue Breakdown') : ''}
                        ${this.renderDetailTab('info', 'ℹ️ Event Info')}
                    </div>

                    <!-- Tab Panels -->
                    <div id="detail-tab-registrations" class="detail-tab-panel">
                        ${this.renderRegistrationsTab(students, event)}
                    </div>
                    ${event.isPaid ? `
                        <div id="detail-tab-revenue" class="detail-tab-panel" style="display:none;">
                            ${this.renderRevenueTab(students, stats)}
                        </div>
                    ` : ''}
                    <div id="detail-tab-info" class="detail-tab-panel" style="display:none;">
                        ${this.renderInfoTab(event)}
                    </div>
                </div>

                <!-- Broadcast Modal Mount Point -->
                <div id="broadcast-modal-root"></div>
            `;
        } catch (error) {
            console.error('Event details error:', error);
            return Renderers.errorMessage('Failed to load details: ' + error.message);
        }
    },

    renderDetailTab(tabId, label, active = false) {
        return `
            <button class="detail-tab-btn" data-tab="${tabId}" 
                    onclick="EventsModule.switchDetailTab('${tabId}')"
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
    },

    // ==================== REGISTRATIONS TAB ====================
    renderRegistrationsTab(students, event) {
        if (!students || students.length === 0) {
            return Renderers.emptyState('No one has registered for this event yet.');
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
                <td style="color:var(--text-muted);font-size:0.85rem;">
                    ${s.enrolledAt ? new Date(s.enrolledAt).toLocaleString() : '—'}
                </td>
                <td style="font-weight:600;color:${s.amountPaid > 0 ? 'var(--success)' : 'var(--text-muted)'};">
                    ${s.amountPaid > 0 ? '₹' + s.amountPaid : 'Free'}
                    ${s.txnId ? `<div style="font-size:0.7rem;color:var(--text-muted);font-family:monospace;">${s.txnId.substring(0, 12)}...</div>` : ''}
                </td>
                <td>
                    ${s.status === 'Paid'
                ? '<span class="badge" style="background:var(--success);">✅ Paid</span>'
                : s.status === 'Pending'
                    ? '<span class="badge" style="background:var(--warning);">⏳ Pending</span>'
                    : '<span class="badge" style="background:var(--text-muted);">🆓 Free</span>'}
                </td>
                <td>
                    <a href="mailto:${s.email}" class="btn btn-secondary" style="padding:4px 10px;font-size:0.75rem;">
                        ✉️ Email
                    </a>
                </td>
            </tr>
        `).join('');

        return `
            <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:0.9rem;color:var(--text-muted);">
                    Showing ${students.length} attendee${students.length !== 1 ? 's' : ''}
                </div>
                <button class="btn btn-primary" style="padding:6px 14px;font-size:0.85rem;"
                        onclick="EventsModule.openBroadcastModal('${event._id}')">
                    ✉️ Email All
                </button>
            </div>
            <div style="overflow-x:auto;">
                <table class="data-table" style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="border-bottom:2px solid var(--border);text-align:left;">
                            <th style="padding:12px;">Attendee</th>
                            <th style="padding:12px;">Registered At</th>
                            <th style="padding:12px;">Amount Paid</th>
                            <th style="padding:12px;">Status</th>
                            <th style="padding:12px;">Action</th>
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
    renderRevenueTab(students, stats) {
        const paidStudents = students.filter(s => s.amountPaid > 0);

        return `
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px;">
                <div class="panel" style="background:var(--bg-secondary);">
                    <h4>💰 Total Revenue</h4>
                    <div style="font-size:2rem;font-weight:700;color:var(--success);">₹${stats.totalRevenue}</div>
                    <div style="color:var(--text-muted);margin-top:4px;">From ${paidStudents.length} paid registrations</div>
                </div>
                <div class="panel" style="background:var(--bg-secondary);">
                    <h4>🎟️ Avg Ticket</h4>
                    <div style="font-size:2rem;font-weight:700;">₹${stats.avgTicket}</div>
                    <div style="color:var(--text-muted);margin-top:4px;">Per paid attendee</div>
                </div>
                <div class="panel" style="background:var(--bg-secondary);">
                    <h4>🆓 Free Attendees</h4>
                    <div style="font-size:2rem;font-weight:700;color:var(--text-muted);">${stats.freeCount}</div>
                    <div style="color:var(--text-muted);margin-top:4px;">No revenue generated</div>
                </div>
            </div>

            <h4 style="margin-bottom:12px;">Paid Transactions (${paidStudents.length})</h4>
            ${paidStudents.length === 0
                ? Renderers.emptyState('No paid registrations yet.')
                : `<div style="overflow-x:auto;">
                    <table class="data-table" style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="border-bottom:2px solid var(--border);text-align:left;">
                                <th style="padding:12px;">Attendee</th>
                                <th style="padding:12px;">Transaction ID</th>
                                <th style="padding:12px;">Amount</th>
                                <th style="padding:12px;">Registered At</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${paidStudents.map(s => `
                                <tr style="border-bottom:1px solid var(--border);">
                                    <td style="padding:12px;">
                                        <a href="#" onclick="App.navigateTo('student-details','${s.userId}');return false;" 
                                           style="color:var(--primary);">${s.name}</a>
                                        <div style="font-size:0.75rem;color:var(--text-muted);">${s.email}</div>
                                    </td>
                                    <td style="padding:12px;font-family:monospace;font-size:0.85rem;">
                                        ${s.txnId || '—'}
                                    </td>
                                    <td style="padding:12px;font-weight:600;color:var(--success);">₹${s.amountPaid}</td>
                                    <td style="padding:12px;color:var(--text-muted);font-size:0.85rem;">
                                        ${s.enrolledAt ? new Date(s.enrolledAt).toLocaleString() : '—'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`}
        `;
    },

    // ==================== INFO TAB ====================
    renderInfoTab(event) {
        return `
            <div class="panel" style="background:var(--bg-secondary);">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div><strong>Type:</strong> ${event.type}</div>
                    <div><strong>Duration:</strong> ${event.duration || 'N/A'}</div>
                    <div><strong>Date & Time:</strong> ${new Date(event.dateTime).toLocaleString()}</div>
                    <div><strong>Price:</strong> ${event.isPaid ? '₹' + event.price : 'Free'}</div>
                    <div style="grid-column:1/-1;"><strong>Meeting Link:</strong> 
                        <a href="${event.meetingLink}" target="_blank" rel="noopener noreferrer" style="color:var(--primary);">${event.meetingLink}</a>
                    </div>
                </div>

                <h4 style="margin-top:24px;margin-bottom:8px;">Description</h4>
                <p style="color:var(--text-muted);line-height:1.6;">${event.description}</p>

                ${event.thumbnail ? `
                    <h4 style="margin-top:24px;margin-bottom:8px;">Thumbnail</h4>
                    <img src="${event.thumbnail}" style="max-width:300px;border-radius:8px;" alt="Event thumbnail">
                ` : ''}
            </div>
        `;
    },

    // ==================== BULK EMAIL MODAL ====================
    openBroadcastModal(eventId) {
        const event = this.state.currentEvent;
        const stats = this.state.currentStats;

        if (!event || !stats) {
            alert('Event data not loaded. Please reload.');
            return;
        }

        const modalRoot = document.getElementById('broadcast-modal-root');
        if (!modalRoot) return;

        modalRoot.innerHTML = `
            <div class="modal-backdrop" onclick="if(event.target===this) EventsModule.closeBroadcastModal()" 
                 style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
                <div class="panel" style="width:100%;max-width:640px;max-height:90vh;overflow-y:auto;background:var(--bg-primary);" 
                     onclick="event.stopPropagation()">
                    <div class="panel-header flex justify-between items-center">
                        <h3>✉️ Send Bulk Email</h3>
                        <button class="btn btn-secondary" style="padding:6px 12px;"
                                onclick="EventsModule.closeBroadcastModal()">✕</button>
                    </div>

                    <div style="padding:16px;background:var(--bg-secondary);border-radius:8px;margin-bottom:16px;">
                        <div style="font-size:0.9rem;">
                            <strong>Event:</strong> ${event.title}<br>
                            <strong>Date:</strong> ${new Date(event.dateTime).toLocaleString()}<br>
                            <strong>Total Attendees:</strong> ${stats.totalRegistrations}
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Recipients</label>
                        <select id="broadcast-filter" class="form-control" onchange="EventsModule.updateRecipientCount()">
                            <option value="all">All Attendees (${stats.totalRegistrations})</option>
                            ${event.isPaid ? `
                                <option value="paid">Paid Only (${stats.paidCount})</option>
                                <option value="free">Free Only (${stats.freeCount})</option>
                            ` : ''}
                        </select>
                        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;" id="recipient-count">
                            Will send to ${stats.totalRegistrations} recipient(s)
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Subject *</label>
                        <input type="text" id="broadcast-subject" class="form-control" 
                               placeholder="e.g. Reminder: ${event.title} starts soon!">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Message *</label>
                        <textarea id="broadcast-message" class="form-control" rows="8"
                                  placeholder="Hi {name},&#10;&#10;This is a reminder for ${event.title}...&#10;&#10;Join link: ${event.meetingLink}"></textarea>
                        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">
                            The event details and join link will be appended automatically.
                        </div>
                    </div>

                    <div id="broadcast-status" style="margin-top:12px;"></div>

                    <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:12px;">
                        <button class="btn btn-secondary" onclick="EventsModule.closeBroadcastModal()">Cancel</button>
                        <button class="btn btn-primary" id="broadcast-send-btn"
                                onclick="EventsModule.sendBroadcast('${eventId}')">
                            📨 Send Emails
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    updateRecipientCount() {
        const filter = document.getElementById('broadcast-filter').value;
        const stats = this.state.currentStats;
        const el = document.getElementById('recipient-count');
        if (!el || !stats) return;

        let count = stats.totalRegistrations;
        if (filter === 'paid') count = stats.paidCount;
        else if (filter === 'free') count = stats.freeCount;

        el.textContent = `Will send to ${count} recipient(s)`;
    },

    closeBroadcastModal() {
        const modalRoot = document.getElementById('broadcast-modal-root');
        if (modalRoot) modalRoot.innerHTML = '';
    },

    async sendBroadcast(eventId) {
        const subject = document.getElementById('broadcast-subject')?.value.trim();
        const message = document.getElementById('broadcast-message')?.value.trim();
        const recipientFilter = document.getElementById('broadcast-filter')?.value || 'all';
        const statusEl = document.getElementById('broadcast-status');
        const sendBtn = document.getElementById('broadcast-send-btn');

        if (!subject) return alert('Please enter a subject');
        if (!message) return alert('Please enter a message');

        if (!confirm(`Send this email to ${recipientFilter} attendees? This cannot be undone.`)) return;

        sendBtn.disabled = true;
        sendBtn.textContent = '📤 Sending...';
        statusEl.innerHTML = '<div class="loading">Sending emails...</div>';

        try {
            const result = await API.post(`/api/admin/events/${eventId}/broadcast`, {
                subject,
                message,
                recipientFilter
            });

            statusEl.innerHTML = `
                <div style="padding:12px;background:var(--success-bg,#d1fae5);color:var(--success,#065f46);border-radius:6px;">
                    ✅ ${result.message || 'Emails sent successfully!'}
                    <div style="font-size:0.85rem;margin-top:4px;">
                        Sent: ${result.sent || 0} • Failed: ${result.failed || 0}
                    </div>
                </div>
            `;

            setTimeout(() => {
                this.closeBroadcastModal();
            }, 2500);
        } catch (error) {
            statusEl.innerHTML = `
                <div style="padding:12px;background:#fee2e2;color:#991b1b;border-radius:6px;">
                    ❌ Error: ${error.message}
                </div>
            `;
            sendBtn.disabled = false;
            sendBtn.textContent = '📨 Send Emails';
        }
    },

    async exportRosterCSV(eventId) {
        try {
            const data = await API.get(`/api/events/${eventId}/attendees`);
            if (!data.attendees || data.attendees.length === 0) {
                alert('No attendees found for this event.');
                return;
            }

            const headers = ['Name', 'Email', 'Mobile', 'GSTIN', 'Registration Date'];
            const rows = data.attendees.map(a => [
                `"${a.name || ''}"`,
                `"${a.email || ''}"`,
                `"${a.mobile || ''}"`,
                `"${a.gstin || ''}"`,
                `"${new Date(a.createdAt).toLocaleDateString()}"`
            ]);

            const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `Event_Attendees_${eventId}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            alert('CSV Export failed: ' + err.message);
        }
    }
};