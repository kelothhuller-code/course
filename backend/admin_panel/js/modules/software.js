// Software Products Management Module
const SoftwareModule = {
    async render() {
        try {
            const res = await API.get('/admin/software');
            const softwares = res.softwares || [];

            return `
                <div class="content-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                    <div>
                        <h2>💻 Software Products & AI Tools</h2>
                        <p style="color:#64748b; font-size:0.9rem; margin-top:4px;">Manage ready-to-sell software, AI bots, and developer kits with performance metrics and highlighting badges.</p>
                    </div>
                    <button class="btn btn-primary" onclick="SoftwareModule.showCreateModal()">
                        + Add Software Product
                    </button>
                </div>

                <div class="card" style="padding:1.25rem;">
                    <div class="table-responsive">
                        <table class="data-table" style="width:100%; border-collapse:collapse; text-align:left;">
                            <thead>
                                <tr style="border-bottom:1px solid #e2e8f0; color:#64748b; font-size:0.85rem;">
                                    <th style="padding:0.75rem;">Product</th>
                                    <th style="padding:0.75rem;">Category</th>
                                    <th style="padding:0.75rem;">Performance Specs</th>
                                    <th style="padding:0.75rem;">Usefulness / Value</th>
                                    <th style="padding:0.75rem;">Price</th>
                                    <th style="padding:0.75rem;">Highlight Badge</th>
                                    <th style="padding:0.75rem; text-align:right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${softwares.length === 0 ? `
                                    <tr>
                                        <td colspan="7" style="text-align:center; padding:2rem; color:#64748b;">
                                            No software products listed yet. Click "+ Add Software Product" to create one.
                                        </td>
                                    </tr>
                                ` : softwares.map(item => `
                                    <tr style="border-bottom:1px solid #f1f5f9;">
                                        <td style="padding:0.75rem; display:flex; align-items:center; gap:0.75rem;">
                                            <img src="${item.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80'}" 
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
                                            ⚡ ${item.performance || 'Standard'}
                                        </td>
                                        <td style="padding:0.75rem; font-size:0.82rem; color:#475569; max-width:240px;">
                                            ${item.usefulness || item.description?.substring(0, 60) + '...'}
                                        </td>
                                        <td style="padding:0.75rem; font-size:0.9rem;">
                                            <strong style="color:#0f172a;">₹${item.discountedPrice || item.price}</strong>
                                            ${item.discountedPrice && item.discountedPrice < item.price ? `
                                                <div style="font-size:0.75rem; color:#94a3b8; text-decoration:line-through;">₹${item.price}</div>
                                            ` : ''}
                                        </td>
                                        <td style="padding:0.75rem;">
                                            ${item.highlightBadge ? `
                                                <span style="font-size:0.75rem; font-weight:700; background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:4px; border:1px solid #fde68a;">
                                                    🔥 ${item.highlightBadge}
                                                </span>
                                            ` : '<span style="color:#cbd5e1; font-size:0.75rem;">None</span>'}
                                        </td>
                                        <td style="padding:0.75rem; text-align:right;">
                                            <button class="btn btn-sm btn-outline-danger" onclick="SoftwareModule.deleteSoftware('${item._id}')" style="padding:4px 8px; font-size:0.8rem;">
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Create Software Modal Overlay -->
                <div id="software-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); z-index:9999; justify-content:center; align-items:center;">
                    <div class="modal-card" style="background:#fff; border-radius:16px; width:100%; max-width:620px; max-height:90vh; overflow-y:auto; padding:2rem; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid #e2e8f0; padding-bottom:1rem;">
                            <h3 style="margin:0; font-size:1.25rem; color:#0f172a;">Add Software Product for Sale</h3>
                            <button onclick="SoftwareModule.closeModal()" style="border:none; background:transparent; font-size:1.5rem; cursor:pointer; color:#64748b;">✕</button>
                        </div>
                        
                        <form id="software-form" onsubmit="SoftwareModule.handleCreate(event)" style="display:flex; flex-direction:column; gap:1rem;">
                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Software Title *</label>
                                <input type="text" id="sw-title" required placeholder="e.g. WideTech AI WhatsApp Support Bot" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;" />
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Category</label>
                                    <select id="sw-category" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;">
                                        <option value="AI Bot & Automation">AI Bot & Automation</option>
                                        <option value="Custom Software">Custom Software</option>
                                        <option value="Business Tool">Business Tool</option>
                                        <option value="Developer Kit">Developer Kit</option>
                                        <option value="SaaS Template">SaaS Template</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Highlight Badge (Hot/Bestseller)</label>
                                    <input type="text" id="sw-badge" placeholder="e.g. BESTSELLER, HOT DEAL, NEW" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;" />
                                </div>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Performance Specs / Metrics</label>
                                <input type="text" id="sw-performance" placeholder="e.g. Sub-150ms Response • 99.9% Uptime • Zero Tech Debt" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;" />
                            </div>

                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Usefulness / Practical Value</label>
                                <input type="text" id="sw-usefulness" placeholder="e.g. Cuts support tickets by 80%, auto-qualifies high-ticket leads" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;" />
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Original Price (₹) *</label>
                                    <input type="number" id="sw-price" required placeholder="9999" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;" />
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Discounted Price (₹)</label>
                                    <input type="number" id="sw-discount" placeholder="4999" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;" />
                                </div>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Thumbnail Image URL</label>
                                <input type="url" id="sw-thumbnail" placeholder="https://..." style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;" />
                            </div>

                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Description</label>
                                <textarea id="sw-description" rows="3" placeholder="Brief explanation of software capabilities..." style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;"></textarea>
                            </div>

                            <div style="display:flex; gap:1.5rem; align-items:center;">
                                <label style="display:inline-flex; align-items:center; gap:6px; font-size:0.85rem; font-weight:600; color:#334155; cursor:pointer;">
                                    <input type="checkbox" id="sw-coupon" checked /> Coupon Eligible
                                </label>
                                <label style="display:inline-flex; align-items:center; gap:6px; font-size:0.85rem; font-weight:600; color:#334155; cursor:pointer;">
                                    <input type="checkbox" id="sw-featured" checked /> Featured on Landing Page
                                </label>
                            </div>

                            <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1rem; border-top:1px solid #e2e8f0; padding-top:1rem;">
                                <button type="button" class="btn btn-secondary" onclick="SoftwareModule.closeModal()">Cancel</button>
                                <button type="submit" class="btn btn-primary">Save & Publish Software</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Software render error:', err);
            return `<div class="error">Failed to load software products: ${err.message}</div>`;
        }
    },

    showCreateModal() {
        const modal = document.getElementById('software-modal');
        if (modal) modal.style.display = 'flex';
    },

    closeModal() {
        const modal = document.getElementById('software-modal');
        if (modal) modal.style.display = 'none';
    },

    async handleCreate(e) {
        e.preventDefault();
        try {
            const payload = {
                title: document.getElementById('sw-title').value,
                category: document.getElementById('sw-category').value,
                highlightBadge: document.getElementById('sw-badge').value,
                performance: document.getElementById('sw-performance').value,
                usefulness: document.getElementById('sw-usefulness').value,
                price: document.getElementById('sw-price').value,
                discountedPrice: document.getElementById('sw-discount').value || undefined,
                thumbnail: document.getElementById('sw-thumbnail').value || undefined,
                description: document.getElementById('sw-description').value,
                couponEligible: document.getElementById('sw-coupon').checked,
                isFeatured: document.getElementById('sw-featured').checked
            };

            await API.post('/admin/software', payload);
            alert('Software product published successfully!');
            this.closeModal();
            App.navigateTo('software');
        } catch (err) {
            alert('Error creating software: ' + err.message);
        }
    },

    async deleteSoftware(id) {
        if (!confirm('Are you sure you want to delete this software product?')) return;
        try {
            await API.delete(`/admin/software/${id}`);
            alert('Software product removed.');
            App.navigateTo('software');
        } catch (err) {
            alert('Error deleting software: ' + err.message);
        }
    }
};
