// AI Services & Bot Automation Management Module
window.ServicesModule = {
    servicesList: [],
    editingId: null,
    deliverableItems: ['Custom LLM Prompt & Workflow Architecture', 'Official Meta WhatsApp Business Cloud API Integration', 'CRM Webhook & Google Sheets Real-Time Sync', '30 Days Dedicated Maintenance & SLA Support'],

    async render() {
        try {
            const res = await API.get('/api/admin/services');
            const services = res.services || [];
            this.servicesList = services;

            return `
                <div class="content-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                    <div>
                        <h2 style="color:#ffffff; font-size:1.5rem; font-weight:700;">⚡ AI Bot Automation & Custom Software Services</h2>
                        <p style="color:#94a3b8; font-size:0.9rem; margin-top:4px;">Manage custom service packages (WhatsApp bots, web/mobile app engineering, AI automation) and track client deliverables.</p>
                    </div>
                    <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
                        <button class="btn btn-secondary" onclick="ServicesModule.showClientsModal()" style="display:flex; align-items:center; gap:6px;">
                            📋 View Clients & Send Commitments
                        </button>
                        <button class="btn btn-primary" onclick="ServicesModule.showCreateModal()">
                            + Add Service Package
                        </button>
                    </div>
                </div>

                <div class="card" style="padding:1.25rem; background:rgba(30, 41, 59, 0.7); border:1px solid rgba(255, 255, 255, 0.1); border-radius:16px;">
                    <div class="table-responsive">
                        <table class="data-table" style="width:100%; border-collapse:collapse; text-align:left;">
                            <thead>
                                <tr style="border-bottom:1px solid rgba(255, 255, 255, 0.15); color:#94a3b8; font-size:0.85rem;">
                                    <th style="padding:0.75rem;">Service Offering</th>
                                    <th style="padding:0.75rem;">Category</th>
                                    <th style="padding:0.75rem;">Delivery & Performance</th>
                                    <th style="padding:0.75rem;">Key Deliverables / Benefits</th>
                                    <th style="padding:0.75rem;">Starting Price</th>
                                    <th style="padding:0.75rem;">Highlighting Badge</th>
                                    <th style="padding:0.75rem; text-align:right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${services.length === 0 ? `
                                    <tr>
                                        <td colspan="7" style="text-align:center; padding:2.5rem; color:#94a3b8;">
                                            No custom services added yet. Click <strong>"+ Add Service Package"</strong> to publish one.
                                        </td>
                                    </tr>
                                ` : services.map(item => `
                                    <tr style="border-bottom:1px solid rgba(255, 255, 255, 0.08);">
                                        <td style="padding:0.75rem; display:flex; align-items:center; gap:0.75rem;">
                                            <img src="${item.thumbnail || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=200&q=80'}" 
                                                 alt="${item.title}" 
                                                 style="width:50px; height:38px; border-radius:6px; object-fit:cover; border:1px solid rgba(255,255,255,0.15);" />
                                            <div>
                                                <!-- High Contrast Bright White Name for Clear Visibility on Dark Theme -->
                                                <strong style="color:#ffffff !important; font-size:0.95rem; font-weight:700; display:block; text-shadow:0 1px 2px rgba(0,0,0,0.5);">
                                                    ${item.title}
                                                </strong>
                                                ${item.isFeatured ? '<span style="font-size:0.7rem; background:#6366f1; color:#fff; padding:1px 6px; border-radius:4px; margin-top:3px; display:inline-block;">★ Featured</span>' : ''}
                                            </div>
                                        </td>
                                        <td style="padding:0.75rem; font-size:0.85rem;">
                                            <span style="background:rgba(99, 102, 241, 0.2); color:#c7d2fe; padding:3px 8px; border-radius:6px; font-weight:600; font-size:0.8rem; border:1px solid rgba(99, 102, 241, 0.3);">
                                                ${item.category}
                                            </span>
                                        </td>
                                        <td style="padding:0.75rem; font-size:0.84rem; color:#38bdf8; font-weight:600;">
                                            ⏱️ ${item.performance || 'Custom SLA'}
                                        </td>
                                        <td style="padding:0.75rem; font-size:0.82rem; color:#e2e8f0; max-width:260px;">
                                            ${(item.deliverables && item.deliverables.length > 0) ? `
                                                <ul style="margin:0; padding-left:14px;">
                                                    ${item.deliverables.slice(0, 3).map(d => `<li style="margin-bottom:2px; color:#cbd5e1;">${d}</li>`).join('')}
                                                    ${item.deliverables.length > 3 ? `<li style="color:#818cf8; font-weight:600;">+${item.deliverables.length - 3} more</li>` : ''}
                                                </ul>
                                            ` : (item.usefulness || 'Standard delivery')}
                                        </td>
                                        <td style="padding:0.75rem; font-size:0.92rem;">
                                            ${item.startingPrice ? `
                                                <strong style="color:#ffffff !important; font-weight:700;">From ₹${item.discountedPrice || item.startingPrice}</strong>
                                            ` : '<span style="color:#34d399; font-weight:700;">Custom Quote</span>'}
                                        </td>
                                        <td style="padding:0.75rem;">
                                            ${item.highlightBadge ? `
                                                <span style="font-size:0.75rem; font-weight:700; background:rgba(245, 158, 11, 0.2); color:#fbbf24; padding:3px 8px; border-radius:6px; border:1px solid rgba(245, 158, 11, 0.4);">
                                                    ⭐ ${item.highlightBadge}
                                                </span>
                                            ` : '<span style="color:#64748b; font-size:0.75rem;">None</span>'}
                                        </td>
                                        <td style="padding:0.75rem; text-align:right; white-space:nowrap;">
                                            <button class="btn btn-sm btn-secondary" onclick="ServicesModule.editService('${item._id}')" style="padding:4px 10px; font-size:0.8rem; margin-right:6px;">
                                                ✏️ Edit
                                            </button>
                                            <button class="btn btn-sm btn-outline-danger" onclick="ServicesModule.deleteService('${item._id}')" style="padding:4px 8px; font-size:0.8rem;">
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Create/Edit Service Modal Overlay -->
                <div id="service-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.8); backdrop-filter:blur(6px); z-index:9999; justify-content:center; align-items:center; padding:1rem;">
                    <div class="modal-card" style="background:#ffffff; color:#0f172a; border-radius:16px; width:100%; max-width:680px; max-height:90vh; overflow-y:auto; padding:2rem; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid #e2e8f0; padding-bottom:1rem;">
                            <h3 id="svc-modal-title" style="margin:0; font-size:1.25rem; color:#0f172a; font-weight:800;">Add Service Package</h3>
                            <button onclick="ServicesModule.closeModal()" style="border:none; background:#f1f5f9; border-radius:8px; width:34px; height:34px; font-size:1.2rem; cursor:pointer; color:#64748b;">✕</button>
                        </div>
                        
                        <form id="service-form" onsubmit="ServicesModule.handleCreate(event)" style="display:flex; flex-direction:column; gap:1rem;">
                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Service Title *</label>
                                <input type="text" id="svc-title" required placeholder="e.g. Custom AI Bot & Workflow Automation" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;" />
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Category</label>
                                    <select id="svc-category" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;">
                                        <option value="AI Bot Automation">AI Bot Automation</option>
                                        <option value="Custom Software">Custom Software</option>
                                        <option value="Mobile App Development">Mobile App Development</option>
                                        <option value="Enterprise Workflow">Enterprise Workflow</option>
                                        <option value="Consulting & AI Integration">Consulting & AI Integration</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Highlighting Badge</label>
                                    <input type="text" id="svc-badge" placeholder="e.g. MOST POPULAR, HIGH ROI, BESPOKE" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;" />
                                </div>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Delivery Timeline & Performance</label>
                                <input type="text" id="svc-performance" placeholder="e.g. Turnaround: 7-14 Days • 24/7 SLA • Direct Engineer Access" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;" />
                            </div>

                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Usefulness & Business Value</label>
                                <input type="text" id="svc-usefulness" placeholder="e.g. Complete bespoke automation integrated directly into company operations" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;" />
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Starting Price (₹, 0 for Custom Quote)</label>
                                    <input type="number" id="svc-price" placeholder="14999" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;" />
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Discounted Price (₹)</label>
                                    <input type="number" id="svc-discount" placeholder="9999" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;" />
                                </div>
                            </div>

                            <!-- Dynamic Deliverables & Benefits List (like in Course creation) -->
                            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:1rem;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                                    <label style="font-size:0.88rem; font-weight:700; color:#0f172a; margin:0;">
                                        ✨ Key Deliverables, Features & Benefits (Bullet-by-Bullet)
                                    </label>
                                    <button type="button" class="btn btn-sm btn-secondary" onclick="ServicesModule.addDeliverableRow()" style="padding:3px 10px; font-size:0.8rem;">
                                        + Add Bullet
                                    </button>
                                </div>
                                <div id="svc-deliverables-container" style="display:flex; flex-direction:column; gap:0.5rem;">
                                    <!-- Rendered dynamically -->
                                </div>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">
                                    Thumbnail Image (Upload File or Enter URL)
                                </label>
                                <div style="display:flex; gap:0.5rem; align-items:center;">
                                    <input type="file" id="svc-thumbnail-file" accept="image/*" style="display:none;" onchange="ServicesModule.handleThumbnailUpload(this.files[0])" />
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('svc-thumbnail-file').click()" style="padding:0.6rem 0.9rem; font-size:0.85rem; white-space:nowrap; display:flex; align-items:center; gap:6px;">
                                        📁 Upload Image File
                                    </button>
                                    <input type="text" id="svc-thumbnail" placeholder="or paste Image URL / uploads path..." style="flex:1; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;" onchange="ServicesModule.previewThumbnail(this.value)" />
                                </div>
                                <div id="svc-thumbnail-status" style="margin-top:6px; font-size:0.8rem; color:#64748b;"></div>
                                <div id="svc-thumbnail-preview-container" style="margin-top:6px; display:none;">
                                    <img id="svc-thumbnail-preview" src="" alt="Thumbnail Preview" style="width:100px; height:68px; object-fit:cover; border-radius:8px; border:1px solid #cbd5e1;" />
                                </div>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Service Description</label>
                                <textarea id="svc-description" rows="2" placeholder="Full overview of the engineering service..." style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;"></textarea>
                            </div>

                            <label style="display:inline-flex; align-items:center; gap:6px; font-size:0.85rem; font-weight:600; color:#334155; cursor:pointer;">
                                <input type="checkbox" id="svc-featured" checked /> Feature on Landing Page
                            </label>

                            <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1rem; border-top:1px solid #e2e8f0; padding-top:1rem;">
                                <button type="button" class="btn btn-secondary" onclick="ServicesModule.closeModal()">Cancel</button>
                                <button type="submit" class="btn btn-primary" id="svc-submit-btn">Save & Publish Service</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Clients & Enquiries View Modal -->
                <div id="service-clients-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.8); backdrop-filter:blur(6px); z-index:9999; justify-content:center; align-items:center; padding:1rem;">
                    <div class="modal-card" style="background:#fff; border-radius:16px; width:100%; max-width:900px; max-height:90vh; overflow-y:auto; padding:2rem; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid #e2e8f0; padding-bottom:1rem;">
                            <div>
                                <h3 style="margin:0; font-size:1.25rem; color:#0f172a; font-weight:800;">📋 Service Clients & Enquiries</h3>
                                <p style="margin:4px 0 0; color:#64748b; font-size:0.85rem;">View clients who enquired or purchased custom services and dispatch commitments & project agreements.</p>
                            </div>
                            <button onclick="ServicesModule.closeClientsModal()" style="border:none; background:#f1f5f9; border-radius:8px; width:34px; height:34px; font-size:1.2rem; cursor:pointer; color:#64748b;">✕</button>
                        </div>

                        <div id="service-clients-content">
                            <div style="text-align:center; padding:2rem; color:#64748b;">Loading client requests...</div>
                        </div>
                    </div>
                </div>

                <!-- Email Deliverables & Commitments Modal -->
                <div id="service-email-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.8); backdrop-filter:blur(6px); z-index:10000; justify-content:center; align-items:center; padding:1rem;">
                    <div class="modal-card" style="background:#fff; border-radius:16px; width:100%; max-width:620px; max-height:90vh; overflow-y:auto; padding:2rem; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; border-bottom:1px solid #e2e8f0; padding-bottom:0.75rem;">
                            <h3 style="margin:0; font-size:1.2rem; color:#0f172a; font-weight:800;">✉️ Dispatch Commitments & Documents</h3>
                            <button onclick="ServicesModule.closeEmailModal()" style="border:none; background:#f1f5f9; border-radius:8px; width:34px; height:34px; font-size:1.2rem; cursor:pointer; color:#64748b;">✕</button>
                        </div>

                        <form id="service-email-form" onsubmit="ServicesModule.handleSendEmail(event)" style="display:flex; flex-direction:column; gap:1rem;">
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; color:#334155; margin-bottom:4px;">Recipient Name</label>
                                    <input type="text" id="svc-mail-name" required style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.88rem; color:#0f172a; background:#fff;" />
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; color:#334155; margin-bottom:4px;">Recipient Email</label>
                                    <input type="email" id="svc-mail-email" required style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.88rem; color:#0f172a; background:#fff;" />
                                </div>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.82rem; font-weight:600; color:#334155; margin-bottom:4px;">Subject</label>
                                <input type="text" id="svc-mail-subject" required style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.88rem; color:#0f172a; background:#fff;" />
                            </div>

                            <div>
                                <label style="display:block; font-size:0.82rem; font-weight:600; color:#334155; margin-bottom:4px;">Official Commitments & Scope (One per line)</label>
                                <textarea id="svc-mail-commitments" rows="4" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.88rem; color:#0f172a; background:#fff;" placeholder="Project Scope: Meta WhatsApp API Setup&#10;Delivery Timeline: 10 Days&#10;SLA Guarantee: 30 Days Maintenance&#10;Direct WhatsApp Engineer Support"></textarea>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.82rem; font-weight:600; color:#334155; margin-bottom:4px;">Agreement / Document Links (One URL per line)</label>
                                <textarea id="svc-mail-docs" rows="2" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.88rem; color:#0f172a; background:#fff;" placeholder="https://drive.google.com/your-service-agreement&#10;https://widetech.in/docs/sla"></textarea>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.82rem; font-weight:600; color:#334155; margin-bottom:4px;">Personalized Message / Notes</label>
                                <textarea id="svc-mail-message" rows="3" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.88rem; color:#0f172a; background:#fff;" placeholder="Thank you for partnering with WideTech. Our engineering team is starting implementation..."></textarea>
                            </div>

                            <div style="display:flex; justify-content:flex-end; gap:0.75rem; border-top:1px solid #e2e8f0; padding-top:1rem;">
                                <button type="button" class="btn btn-secondary" onclick="ServicesModule.closeEmailModal()">Cancel</button>
                                <button type="submit" class="btn btn-primary" id="svc-email-submit-btn">🚀 Send Official Email</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Services render error:', err);
            return `<div class="error" style="padding:2rem; text-align:center; color:#ef4444;">Failed to load services: ${err.message}</div>`;
        }
    },

    renderDeliverableInputs() {
        const container = document.getElementById('svc-deliverables-container');
        if (!container) return;
        container.innerHTML = this.deliverableItems.map((item, idx) => `
            <div style="display:flex; gap:0.5rem; align-items:center;">
                <span style="color:#6366f1; font-weight:bold; font-size:0.9rem;">${idx + 1}.</span>
                <input type="text" class="svc-deliverable-item" value="${item.replace(/"/g, '&quot;')}" placeholder="Deliverable or Benefit" style="flex:1; padding:0.5rem 0.75rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.88rem; color:#0f172a; background:#fff;" />
                <button type="button" onclick="ServicesModule.removeDeliverableRow(${idx})" style="background:#fee2e2; color:#ef4444; border:none; border-radius:6px; width:32px; height:32px; cursor:pointer; font-weight:bold;">✕</button>
            </div>
        `).join('');
    },

    addDeliverableRow() {
        this.syncDeliverablesFromDOM();
        this.deliverableItems.push('');
        this.renderDeliverableInputs();
    },

    removeDeliverableRow(idx) {
        this.syncDeliverablesFromDOM();
        this.deliverableItems.splice(idx, 1);
        if (this.deliverableItems.length === 0) this.deliverableItems.push('');
        this.renderDeliverableInputs();
    },

    syncDeliverablesFromDOM() {
        const inputs = document.querySelectorAll('.svc-deliverable-item');
        if (inputs.length > 0) {
            this.deliverableItems = Array.from(inputs).map(inp => inp.value.trim());
        }
    },

    async handleThumbnailUpload(file) {
        if (!file) return;
        const statusEl = document.getElementById('svc-thumbnail-status');
        const previewEl = document.getElementById('svc-thumbnail-preview');
        const previewContainer = document.getElementById('svc-thumbnail-preview-container');
        const inputEl = document.getElementById('svc-thumbnail');

        try {
            if (statusEl) statusEl.innerHTML = '⏳ Uploading thumbnail image to server...';
            const formData = new FormData();
            formData.append('thumbnail', file);

            const token = localStorage.getItem('adminToken') || (window.API && window.API.token);
            const res = await fetch('/api/upload/thumbnail', {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Image upload failed');
            }

            const data = await res.json();
            const url = data.url || data.downloadUrl;
            if (inputEl) inputEl.value = url;
            if (previewEl) previewEl.src = url;
            if (previewContainer) previewContainer.style.display = 'block';
            if (statusEl) statusEl.innerHTML = `✅ Uploaded successfully: <strong>${data.fileName || file.name}</strong>`;
        } catch (err) {
            console.error('Thumbnail upload error:', err);
            if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444;">❌ Upload failed: ${err.message}</span>`;
            alert('Thumbnail upload failed: ' + err.message);
        }
    },

    previewThumbnail(url) {
        const previewEl = document.getElementById('svc-thumbnail-preview');
        const previewContainer = document.getElementById('svc-thumbnail-preview-container');
        if (url && previewEl && previewContainer) {
            previewEl.src = url;
            previewContainer.style.display = 'block';
        } else if (previewContainer) {
            previewContainer.style.display = 'none';
        }
    },

    showCreateModal() {
        this.editingId = null;
        const modal = document.getElementById('service-modal');
        if (modal) {
            document.getElementById('service-form').reset();
            document.getElementById('svc-modal-title').textContent = 'Add Service Package';
            document.getElementById('svc-submit-btn').textContent = 'Save & Publish Service';
            const statusEl = document.getElementById('svc-thumbnail-status');
            if (statusEl) statusEl.innerHTML = '';
            const previewContainer = document.getElementById('svc-thumbnail-preview-container');
            if (previewContainer) previewContainer.style.display = 'none';
            this.deliverableItems = ['Custom LLM Prompt & Workflow Architecture', 'Official Meta WhatsApp Business Cloud API Integration', 'CRM Webhook & Google Sheets Real-Time Sync', '30 Days Dedicated Maintenance & SLA Support'];
            this.renderDeliverableInputs();
            modal.style.display = 'flex';
        }
    },

    editService(id) {
        const item = this.servicesList.find(s => s._id === id);
        if (!item) {
            alert('Service not found in list');
            return;
        }

        this.editingId = id;
        const modal = document.getElementById('service-modal');
        if (modal) {
            document.getElementById('svc-modal-title').textContent = `Edit Service: ${item.title}`;
            document.getElementById('svc-submit-btn').textContent = 'Update Service Package';

            document.getElementById('svc-title').value = item.title || '';
            document.getElementById('svc-category').value = item.category || 'AI Bot Automation';
            document.getElementById('svc-badge').value = item.highlightBadge || '';
            document.getElementById('svc-performance').value = item.performance || '';
            document.getElementById('svc-usefulness').value = item.usefulness || '';
            document.getElementById('svc-price').value = item.startingPrice !== undefined ? item.startingPrice : '';
            document.getElementById('svc-discount').value = item.discountedPrice || '';
            document.getElementById('svc-thumbnail').value = item.thumbnail || '';
            document.getElementById('svc-description').value = item.description || '';
            document.getElementById('svc-featured').checked = Boolean(item.isFeatured);

            const statusEl = document.getElementById('svc-thumbnail-status');
            if (statusEl) statusEl.innerHTML = '';
            this.previewThumbnail(item.thumbnail);

            this.deliverableItems = (item.deliverables && item.deliverables.length > 0) 
                ? [...item.deliverables] 
                : [''];
            this.renderDeliverableInputs();

            modal.style.display = 'flex';
        }
    },

    closeModal() {
        this.editingId = null;
        const modal = document.getElementById('service-modal');
        if (modal) modal.style.display = 'none';
    },

    async handleCreate(e) {
        e.preventDefault();
        try {
            this.syncDeliverablesFromDOM();
            const deliverables = this.deliverableItems.filter(Boolean);

            const payload = {
                title: document.getElementById('svc-title').value,
                category: document.getElementById('svc-category').value,
                highlightBadge: document.getElementById('svc-badge').value,
                performance: document.getElementById('svc-performance').value,
                usefulness: document.getElementById('svc-usefulness').value,
                startingPrice: document.getElementById('svc-price').value || 0,
                discountedPrice: document.getElementById('svc-discount').value || undefined,
                deliverables: deliverables,
                thumbnail: document.getElementById('svc-thumbnail').value || undefined,
                description: document.getElementById('svc-description').value,
                isFeatured: document.getElementById('svc-featured').checked
            };

            if (this.editingId) {
                await API.put(`/api/admin/services/${this.editingId}`, payload);
                alert('Service package updated successfully!');
            } else {
                await API.post('/api/admin/services', payload);
                alert('Service package published successfully!');
            }

            this.closeModal();
            App.navigateTo('services');
        } catch (err) {
            alert('Error saving service: ' + err.message);
        }
    },

    async deleteService(id) {
        if (!confirm('Are you sure you want to delete this service package?')) return;
        try {
            await API.delete(`/api/admin/services/${id}`);
            alert('Service package removed.');
            App.navigateTo('services');
        } catch (err) {
            alert('Error deleting service: ' + err.message);
        }
    },

    async showClientsModal() {
        const modal = document.getElementById('service-clients-modal');
        if (modal) modal.style.display = 'flex';
        const content = document.getElementById('service-clients-content');
        if (!content) return;

        try {
            content.innerHTML = '<div style="text-align:center; padding:2rem; color:#64748b;">Loading client enquiries...</div>';
            const res = await API.get('/api/admin/services/clients');
            const clients = res.clients || [];

            if (clients.length === 0) {
                content.innerHTML = `
                    <div style="text-align:center; padding:3rem; color:#64748b; background:#f8fafc; border-radius:12px;">
                        <h4>No client service enquiries yet</h4>
                        <p style="margin:4px 0 0; font-size:0.85rem;">Client service requests from the website will appear here with full contact details.</p>
                    </div>
                `;
                return;
            }

            content.innerHTML = `
                <div class="table-responsive">
                    <table class="data-table" style="width:100%; border-collapse:collapse; text-align:left;">
                        <thead>
                            <tr style="border-bottom:1px solid #e2e8f0; color:#64748b; font-size:0.82rem;">
                                <th style="padding:0.6rem;">Client</th>
                                <th style="padding:0.6rem;">Phone / Contact</th>
                                <th style="padding:0.6rem;">Service Requested</th>
                                <th style="padding:0.6rem;">Requirements</th>
                                <th style="padding:0.6rem;">Date</th>
                                <th style="padding:0.6rem; text-align:right;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${clients.map(c => `
                                <tr style="border-bottom:1px solid #f1f5f9; font-size:0.85rem;">
                                    <td style="padding:0.6rem;">
                                        <strong>${c.clientName}</strong>
                                        <div style="font-size:0.75rem; color:#64748b;">${c.clientEmail}</div>
                                    </td>
                                    <td style="padding:0.6rem; color:#0284c7; font-weight:600;">
                                        ${c.clientPhone || 'N/A'}
                                    </td>
                                    <td style="padding:0.6rem;">
                                        <span style="background:#e0e7ff; color:#3730a3; padding:2px 8px; border-radius:4px; font-weight:600; font-size:0.78rem;">
                                            ${c.serviceTitle}
                                        </span>
                                    </td>
                                    <td style="padding:0.6rem; max-width:200px; color:#475569; font-size:0.8rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${(c.requirements || '').replace(/"/g, '&quot;')}">
                                        ${c.requirements || 'N/A'}
                                    </td>
                                    <td style="padding:0.6rem; color:#64748b; font-size:0.8rem; white-space:nowrap;">
                                        ${new Date(c.enquiredAt).toLocaleDateString()}
                                    </td>
                                    <td style="padding:0.6rem; text-align:right;">
                                        <button class="btn btn-sm btn-primary" onclick="ServicesModule.openEmailModal('${c.clientName.replace(/'/g, "\\'")}', '${c.clientEmail}', '${(c.serviceTitle || '').replace(/'/g, "\\'")}')" style="padding:4px 10px; font-size:0.78rem;">
                                            ✉️ Mail Commitments
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (err) {
            content.innerHTML = `<div style="color:#ef4444; padding:2rem; text-align:center;">Failed to load clients: ${err.message}</div>`;
        }
    },

    closeClientsModal() {
        const modal = document.getElementById('service-clients-modal');
        if (modal) modal.style.display = 'none';
    },

    openEmailModal(name, email, serviceTitle) {
        const modal = document.getElementById('service-email-modal');
        if (!modal) return;
        document.getElementById('svc-mail-name').value = name || '';
        document.getElementById('svc-mail-email').value = email || '';
        document.getElementById('svc-mail-subject').value = `WideTech Commitments & Deliverables: ${serviceTitle || 'Custom Technology Service'}`;
        document.getElementById('svc-mail-commitments').value = `1. Full Solution Architecture & Implementation: ${serviceTitle || 'Bespoke Automation'}\n2. Delivery Timeline: 7 - 14 Business Days\n3. SLA: 99.9% Uptime with 30-Day Dedicated Post-Deployment Support\n4. Direct Senior Engineer Access via WhatsApp & Email`;
        document.getElementById('svc-mail-docs').value = `https://widetech.in/services\nhttps://widetech.in/support`;
        document.getElementById('svc-mail-message').value = `Dear ${name},\n\nThank you for choosing WideTech. We have initiated the engineering roadmap for your project. Please review our official commitments and documentation links above.`;
        modal.style.display = 'flex';
    },

    closeEmailModal() {
        const modal = document.getElementById('service-email-modal');
        if (modal) modal.style.display = 'none';
    },

    async handleSendEmail(e) {
        e.preventDefault();
        const btn = document.getElementById('svc-email-submit-btn');
        if (btn) btn.disabled = true;

        try {
            const payload = {
                recipientName: document.getElementById('svc-mail-name').value,
                recipientEmail: document.getElementById('svc-mail-email').value,
                subject: document.getElementById('svc-mail-subject').value,
                commitments: document.getElementById('svc-mail-commitments').value.split('\n').filter(Boolean),
                documentLinks: document.getElementById('svc-mail-docs').value.split('\n').filter(Boolean),
                message: document.getElementById('svc-mail-message').value,
                itemType: 'service'
            };

            await API.post('/api/admin/deliverables/send-email', payload);
            alert('Deliverables and commitments email dispatched successfully!');
            this.closeEmailModal();
        } catch (err) {
            alert('Error sending email: ' + err.message);
        } finally {
            if (btn) btn.disabled = false;
        }
    }
};
