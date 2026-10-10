// AI Services & Bot Automation Management Module
const ServicesModule = {
    async render() {
        try {
            const res = await API.get('/admin/services');
            const services = res.services || [];

            return `
                <div class="content-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                    <div>
                        <h2>⚡ AI Bot Automation & Custom Software Services</h2>
                        <p style="color:#64748b; font-size:0.9rem; margin-top:4px;">Manage custom service packages (WhatsApp bots, web/mobile app engineering, AI automation) and receive client enquiries.</p>
                    </div>
                    <button class="btn btn-primary" onclick="ServicesModule.showCreateModal()">
                        + Add Service Package
                    </button>
                </div>

                <div class="card" style="padding:1.25rem;">
                    <div class="table-responsive">
                        <table class="data-table" style="width:100%; border-collapse:collapse; text-align:left;">
                            <thead>
                                <tr style="border-bottom:1px solid #e2e8f0; color:#64748b; font-size:0.85rem;">
                                    <th style="padding:0.75rem;">Service Offering</th>
                                    <th style="padding:0.75rem;">Category</th>
                                    <th style="padding:0.75rem;">Delivery & Performance</th>
                                    <th style="padding:0.75rem;">Practical Usefulness</th>
                                    <th style="padding:0.75rem;">Starting Price</th>
                                    <th style="padding:0.75rem;">Highlighting Badge</th>
                                    <th style="padding:0.75rem; text-align:right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${services.length === 0 ? `
                                    <tr>
                                        <td colspan="7" style="text-align:center; padding:2rem; color:#64748b;">
                                            No custom services added yet. Click "+ Add Service Package" to publish one.
                                        </td>
                                    </tr>
                                ` : services.map(item => `
                                    <tr style="border-bottom:1px solid #f1f5f9;">
                                        <td style="padding:0.75rem; display:flex; align-items:center; gap:0.75rem;">
                                            <img src="${item.thumbnail || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=200&q=80'}" 
                                                 alt="${item.title}" 
                                                 style="width:50px; height:38px; border-radius:6px; object-fit:cover; border:1px solid #e2e8f0;" />
                                            <div>
                                                <strong style="color:#0f172a; font-size:0.92rem;">${item.title}</strong>
                                                ${item.isFeatured ? '<span style="margin-left:6px; font-size:0.7rem; background:#6366f1; color:#fff; padding:1px 6px; border-radius:4px;">★ Featured</span>' : ''}
                                            </div>
                                        </td>
                                        <td style="padding:0.75rem; font-size:0.85rem; color:#475569;">
                                            <span style="background:#f1f5f9; padding:2px 8px; border-radius:4px; font-weight:600;">${item.category}</span>
                                        </td>
                                        <td style="padding:0.75rem; font-size:0.82rem; color:#0284c7; font-weight:500;">
                                            ⏱️ ${item.performance || 'Custom SLA'}
                                        </td>
                                        <td style="padding:0.75rem; font-size:0.82rem; color:#475569; max-width:240px;">
                                            ${item.usefulness || item.description?.substring(0, 60) + '...'}
                                        </td>
                                        <td style="padding:0.75rem; font-size:0.9rem;">
                                            ${item.startingPrice ? `
                                                <strong style="color:#0f172a;">From ₹${item.discountedPrice || item.startingPrice}</strong>
                                            ` : '<span style="color:#059669; font-weight:700;">Custom Quote</span>'}
                                        </td>
                                        <td style="padding:0.75rem;">
                                            ${item.highlightBadge ? `
                                                <span style="font-size:0.75rem; font-weight:700; background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:4px; border:1px solid #fde68a;">
                                                    ⭐ ${item.highlightBadge}
                                                </span>
                                            ` : '<span style="color:#cbd5e1; font-size:0.75rem;">None</span>'}
                                        </td>
                                        <td style="padding:0.75rem; text-align:right;">
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

                <!-- Create Service Modal Overlay -->
                <div id="service-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); z-index:9999; justify-content:center; align-items:center;">
                    <div class="modal-card" style="background:#fff; border-radius:16px; width:100%; max-width:620px; max-height:90vh; overflow-y:auto; padding:2rem; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid #e2e8f0; padding-bottom:1rem;">
                            <h3 style="margin:0; font-size:1.25rem; color:#0f172a;">Add Service Package</h3>
                            <button onclick="ServicesModule.closeModal()" style="border:none; background:transparent; font-size:1.5rem; cursor:pointer; color:#64748b;">✕</button>
                        </div>
                        
                        <form id="service-form" onsubmit="ServicesModule.handleCreate(event)" style="display:flex; flex-direction:column; gap:1rem;">
                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Service Title *</label>
                                <input type="text" id="svc-title" required placeholder="e.g. Custom AI Bot & Workflow Automation" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;" />
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Category</label>
                                    <select id="svc-category" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;">
                                        <option value="AI Bot Automation">AI Bot Automation</option>
                                        <option value="Custom Software">Custom Software</option>
                                        <option value="Mobile App Development">Mobile App Development</option>
                                        <option value="Enterprise Workflow">Enterprise Workflow</option>
                                        <option value="Consulting & AI Integration">Consulting & AI Integration</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Highlighting Badge</label>
                                    <input type="text" id="svc-badge" placeholder="e.g. MOST POPULAR, HIGH ROI, BESPOKE" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;" />
                                </div>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Delivery Timeline & Performance</label>
                                <input type="text" id="svc-performance" placeholder="e.g. Turnaround: 7-14 Days • 24/7 SLA • Direct Engineer Access" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;" />
                            </div>

                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Usefulness & Business Value</label>
                                <input type="text" id="svc-usefulness" placeholder="e.g. Complete bespoke automation integrated directly into company operations" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;" />
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Starting Price (₹, 0 for Custom Quote)</label>
                                    <input type="number" id="svc-price" placeholder="14999" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;" />
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Discounted Price (₹)</label>
                                    <input type="number" id="svc-discount" placeholder="9999" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;" />
                                </div>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Key Deliverables (one per line)</label>
                                <textarea id="svc-deliverables" rows="3" placeholder="Meta WhatsApp Cloud API setup&#10;CRM Integration&#10;30-day support" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;"></textarea>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Thumbnail URL</label>
                                <input type="url" id="svc-thumbnail" placeholder="https://..." style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;" />
                            </div>

                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Service Description</label>
                                <textarea id="svc-description" rows="2" placeholder="Full overview of the engineering service..." style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;"></textarea>
                            </div>

                            <label style="display:inline-flex; align-items:center; gap:6px; font-size:0.85rem; font-weight:600; color:#334155; cursor:pointer;">
                                <input type="checkbox" id="svc-featured" checked /> Feature on Landing Page
                            </label>

                            <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1rem; border-top:1px solid #e2e8f0; padding-top:1rem;">
                                <button type="button" class="btn btn-secondary" onclick="ServicesModule.closeModal()">Cancel</button>
                                <button type="submit" class="btn btn-primary">Save & Publish Service</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Services render error:', err);
            return `<div class="error">Failed to load services: ${err.message}</div>`;
        }
    },

    showCreateModal() {
        const modal = document.getElementById('service-modal');
        if (modal) modal.style.display = 'flex';
    },

    closeModal() {
        const modal = document.getElementById('service-modal');
        if (modal) modal.style.display = 'none';
    },

    async handleCreate(e) {
        e.preventDefault();
        try {
            const payload = {
                title: document.getElementById('svc-title').value,
                category: document.getElementById('svc-category').value,
                highlightBadge: document.getElementById('svc-badge').value,
                performance: document.getElementById('svc-performance').value,
                usefulness: document.getElementById('svc-usefulness').value,
                startingPrice: document.getElementById('svc-price').value || 0,
                discountedPrice: document.getElementById('svc-discount').value || undefined,
                deliverables: document.getElementById('svc-deliverables').value.split('\n').filter(Boolean),
                thumbnail: document.getElementById('svc-thumbnail').value || undefined,
                description: document.getElementById('svc-description').value,
                isFeatured: document.getElementById('svc-featured').checked
            };

            await API.post('/admin/services', payload);
            alert('Service package published successfully!');
            this.closeModal();
            App.navigateTo('services');
        } catch (err) {
            alert('Error creating service: ' + err.message);
        }
    },

    async deleteService(id) {
        if (!confirm('Are you sure you want to delete this service package?')) return;
        try {
            await API.delete(`/admin/services/${id}`);
            alert('Service package removed.');
            App.navigateTo('services');
        } catch (err) {
            alert('Error deleting service: ' + err.message);
        }
    }
};
