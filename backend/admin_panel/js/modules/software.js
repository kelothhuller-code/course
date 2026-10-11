// Software Products Management Module
window.SoftwareModule = {
    softwaresList: [],
    editingId: null,
    featureItems: ['Sub-100ms Autonomous LLM Execution', 'Multilingual Malayalam & English Conversation', 'Full Source Code & Production Dockerfile', 'One-Click Cloud Deployment Script'],
    uploadedFileInfo: null,

    async render() {
        try {
            const res = await API.get('/api/admin/software');
            const softwares = res.softwares || [];
            this.softwaresList = softwares;

            return `
                <div class="content-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                    <div>
                        <h2 style="color:#ffffff; font-size:1.5rem; font-weight:700;">💻 Commercial Software & AI Tools</h2>
                        <p style="color:#94a3b8; font-size:0.9rem; margin-top:4px;">Manage ready-to-sell software, AI bots, and developer kits stored in dedicated server folders and track buyers & license keys.</p>
                    </div>
                    <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
                        <button class="btn btn-secondary" onclick="SoftwareModule.showBuyersModal()" style="display:flex; align-items:center; gap:6px;">
                            👥 View Buyers & Send Deliverables
                        </button>
                        <button class="btn btn-primary" onclick="SoftwareModule.showCreateModal()">
                            + Add Software Product
                        </button>
                    </div>
                </div>

                <div class="card" style="padding:1.25rem; background:rgba(30, 41, 59, 0.7); border:1px solid rgba(255, 255, 255, 0.1); border-radius:16px;">
                    <div class="table-responsive">
                        <table class="data-table" style="width:100%; border-collapse:collapse; text-align:left;">
                            <thead>
                                <tr style="border-bottom:1px solid rgba(255, 255, 255, 0.15); color:#94a3b8; font-size:0.85rem;">
                                    <th style="padding:0.75rem;">Product</th>
                                    <th style="padding:0.75rem;">Category</th>
                                    <th style="padding:0.75rem;">Performance Specs</th>
                                    <th style="padding:0.75rem;">Package / Server File</th>
                                    <th style="padding:0.75rem;">Price</th>
                                    <th style="padding:0.75rem;">Highlight Badge</th>
                                    <th style="padding:0.75rem; text-align:right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${softwares.length === 0 ? `
                                    <tr>
                                        <td colspan="7" style="text-align:center; padding:2.5rem; color:#94a3b8;">
                                            No software products listed yet. Click <strong>"+ Add Software Product"</strong> to upload and publish one.
                                        </td>
                                    </tr>
                                ` : softwares.map(item => `
                                    <tr style="border-bottom:1px solid rgba(255, 255, 255, 0.08);">
                                        <td style="padding:0.75rem; display:flex; align-items:center; gap:0.75rem;">
                                            <img src="${item.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80'}" 
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
                                            ⚡ ${item.performance || 'Standard'}
                                        </td>
                                        <td style="padding:0.75rem; font-size:0.82rem; color:#cbd5e1;">
                                            ${item.downloadUrl ? `
                                                <a href="${item.downloadUrl}" target="_blank" style="color:#a78bfa; font-weight:600; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                                                    📦 ${item.fileName || 'Download Package'}
                                                </a>
                                            ` : '<span style="color:#64748b;">No file uploaded</span>'}
                                        </td>
                                        <td style="padding:0.75rem; font-size:0.92rem;">
                                            <strong style="color:#ffffff !important; font-weight:700;">₹${item.discountedPrice || item.price}</strong>
                                            ${item.discountedPrice && item.discountedPrice < item.price ? `
                                                <div style="font-size:0.75rem; color:#64748b; text-decoration:line-through;">₹${item.price}</div>
                                            ` : ''}
                                        </td>
                                        <td style="padding:0.75rem;">
                                            ${item.highlightBadge ? `
                                                <span style="font-size:0.75rem; font-weight:700; background:rgba(245, 158, 11, 0.2); color:#fbbf24; padding:3px 8px; border-radius:6px; border:1px solid rgba(245, 158, 11, 0.4);">
                                                    🔥 ${item.highlightBadge}
                                                </span>
                                            ` : '<span style="color:#64748b; font-size:0.75rem;">None</span>'}
                                        </td>
                                        <td style="padding:0.75rem; text-align:right; white-space:nowrap;">
                                            <button class="btn btn-sm btn-secondary" onclick="SoftwareModule.editSoftware('${item._id}')" style="padding:4px 10px; font-size:0.8rem; margin-right:6px;">
                                                ✏️ Edit
                                            </button>
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

                <!-- Create/Edit Software Modal Overlay -->
                <div id="software-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.8); backdrop-filter:blur(6px); z-index:9999; justify-content:center; align-items:center; padding:1rem;">
                    <div class="modal-card" style="background:#ffffff; color:#0f172a; border-radius:16px; width:100%; max-width:680px; max-height:90vh; overflow-y:auto; padding:2rem; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid #e2e8f0; padding-bottom:1rem;">
                            <h3 id="sw-modal-title" style="margin:0; font-size:1.25rem; color:#0f172a; font-weight:800;">Add Software Product for Sale</h3>
                            <button onclick="SoftwareModule.closeModal()" style="border:none; background:#f1f5f9; border-radius:8px; width:34px; height:34px; font-size:1.2rem; cursor:pointer; color:#64748b;">✕</button>
                        </div>
                        
                        <form id="software-form" onsubmit="SoftwareModule.handleCreate(event)" style="display:flex; flex-direction:column; gap:1rem;">
                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Software Title *</label>
                                <input type="text" id="sw-title" required placeholder="e.g. WideTech AI WhatsApp Support Bot" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;" />
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Category</label>
                                    <select id="sw-category" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;">
                                        <option value="AI Bot & Automation">AI Bot & Automation</option>
                                        <option value="Custom Software">Custom Software</option>
                                        <option value="Business Tool">Business Tool</option>
                                        <option value="Developer Kit">Developer Kit</option>
                                        <option value="SaaS Template">SaaS Template</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Highlight Badge (Hot/Bestseller)</label>
                                    <input type="text" id="sw-badge" placeholder="e.g. BESTSELLER, HOT DEAL, NEW" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;" />
                                </div>
                            </div>

                            <!-- Dedicated Software Server Upload Section -->
                            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:1rem;">
                                <label style="display:block; font-size:0.88rem; font-weight:700; color:#166534; margin-bottom:4px;">
                                    📦 Software Package File (Stored in Server Separate Folder)
                                </label>
                                <p style="font-size:0.8rem; color:#15803d; margin:0 0 8px 0;">
                                    Upload distribution ZIP, TAR, 7Z, DMG or EXE to server storage (<code>/uploads/software/</code>).
                                </p>
                                <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
                                    <input type="file" id="sw-file-input" onchange="SoftwareModule.handleFileUpload(event)" style="font-size:0.85rem;" accept=".zip,.tar.gz,.tar,.rar,.7z,.exe,.dmg,.pkg,.deb,.sh,.py,.js,.json,.pdf" />
                                    <span id="sw-upload-status" style="font-size:0.82rem; font-weight:600; color:#047857;"></span>
                                </div>
                                <input type="hidden" id="sw-download-url" />
                                <input type="hidden" id="sw-file-name" />
                                <input type="hidden" id="sw-file-size" />
                            </div>

                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Performance Specs / Metrics</label>
                                <input type="text" id="sw-performance" placeholder="e.g. Sub-150ms Response • 99.9% Uptime • Zero Tech Debt" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;" />
                            </div>

                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Usefulness / Practical Value</label>
                                <input type="text" id="sw-usefulness" placeholder="e.g. Cuts support tickets by 80%, auto-qualifies high-ticket leads" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;" />
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Original Price (₹) *</label>
                                    <input type="number" id="sw-price" required placeholder="9999" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;" />
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Discounted Price (₹)</label>
                                    <input type="number" id="sw-discount" placeholder="4999" style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;" />
                                </div>
                            </div>

                            <!-- Dynamic Features & Benefits List (like in Course creation) -->
                            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:1rem;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                                    <label style="font-size:0.88rem; font-weight:700; color:#0f172a; margin:0;">
                                        ✨ Software Features & Key Benefits (Bullet-by-Bullet)
                                    </label>
                                    <button type="button" class="btn btn-sm btn-secondary" onclick="SoftwareModule.addFeatureRow()" style="padding:3px 10px; font-size:0.8rem;">
                                        + Add Bullet
                                    </button>
                                </div>
                                <div id="sw-features-container" style="display:flex; flex-direction:column; gap:0.5rem;">
                                    <!-- Rendered dynamically -->
                                </div>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">
                                    Thumbnail Image (Upload File or Enter URL)
                                </label>
                                <div style="display:flex; gap:0.5rem; align-items:center;">
                                    <input type="file" id="sw-thumbnail-file" accept="image/*" style="display:none;" onchange="SoftwareModule.handleThumbnailUpload(this.files[0])" />
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('sw-thumbnail-file').click()" style="padding:0.6rem 0.9rem; font-size:0.85rem; white-space:nowrap; display:flex; align-items:center; gap:6px;">
                                        📁 Upload Image File
                                    </button>
                                    <input type="text" id="sw-thumbnail" placeholder="or paste Image URL / uploads path..." style="flex:1; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;" onchange="SoftwareModule.previewThumbnail(this.value)" />
                                </div>
                                <div id="sw-thumbnail-progress-box" style="display:none; margin-top:8px;">
                                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:3px;">
                                        <span id="sw-thumbnail-progress-label" style="color:#64748b;">Uploading image...</span>
                                        <span id="sw-thumbnail-progress-pct" style="font-weight:700; color:#6366f1;">0%</span>
                                    </div>
                                    <div style="width:100%; height:6px; background:#e2e8f0; border-radius:10px; overflow:hidden;">
                                        <div id="sw-thumbnail-progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #6366f1, #10b981); transition:width 0.15s ease;"></div>
                                    </div>
                                </div>
                                <div id="sw-thumbnail-status" style="margin-top:6px; font-size:0.8rem; color:#64748b;"></div>
                                <div id="sw-thumbnail-preview-container" style="margin-top:6px; display:none;">
                                    <img id="sw-thumbnail-preview" src="" alt="Thumbnail Preview" style="width:100px; height:68px; object-fit:cover; border-radius:8px; border:1px solid #cbd5e1;" />
                                </div>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:#334155; margin-bottom:4px;">Description</label>
                                <textarea id="sw-description" rows="3" placeholder="Brief explanation of software capabilities..." style="width:100%; padding:0.6rem 0.8rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; color:#0f172a; background:#fff;"></textarea>
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
                                <button type="submit" class="btn btn-primary" id="sw-save-btn">Save & Publish Software</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Software Buyers & Licenses Modal -->
                <div id="software-buyers-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.8); backdrop-filter:blur(6px); z-index:9999; justify-content:center; align-items:center; padding:1rem;">
                    <div class="modal-card" style="background:#fff; border-radius:16px; width:100%; max-width:900px; max-height:90vh; overflow-y:auto; padding:2rem; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid #e2e8f0; padding-bottom:1rem;">
                            <div>
                                <h3 style="margin:0; font-size:1.25rem; color:#0f172a; font-weight:800;">👥 Software Purchasers & License Keys</h3>
                                <p style="margin:4px 0 0; color:#64748b; font-size:0.85rem;">View buyers who purchased commercial software, their license keys, and dispatch deliverables & documents.</p>
                            </div>
                            <button onclick="SoftwareModule.closeBuyersModal()" style="border:none; background:#f1f5f9; border-radius:8px; width:34px; height:34px; font-size:1.2rem; cursor:pointer; color:#64748b;">✕</button>
                        </div>

                        <div id="software-buyers-content">
                            <div style="text-align:center; padding:2rem; color:#64748b;">Loading buyers...</div>
                        </div>
                    </div>
                </div>

                <!-- Email Deliverables Modal -->
                <div id="software-email-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.8); backdrop-filter:blur(6px); z-index:10000; justify-content:center; align-items:center; padding:1rem;">
                    <div class="modal-card" style="background:#fff; border-radius:16px; width:100%; max-width:620px; max-height:90vh; overflow-y:auto; padding:2rem; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; border-bottom:1px solid #e2e8f0; padding-bottom:0.75rem;">
                            <h3 style="margin:0; font-size:1.2rem; color:#0f172a; font-weight:800;">✉️ Dispatch Software Deliverables & License</h3>
                            <button onclick="SoftwareModule.closeEmailModal()" style="border:none; background:#f1f5f9; border-radius:8px; width:34px; height:34px; font-size:1.2rem; cursor:pointer; color:#64748b;">✕</button>
                        </div>

                        <form id="software-email-form" onsubmit="SoftwareModule.handleSendEmail(event)" style="display:flex; flex-direction:column; gap:1rem;">
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; color:#334155; margin-bottom:4px;">Buyer Name</label>
                                    <input type="text" id="sw-mail-name" required style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.88rem; color:#0f172a; background:#fff;" />
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; color:#334155; margin-bottom:4px;">Buyer Email</label>
                                    <input type="email" id="sw-mail-email" required style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.88rem; color:#0f172a; background:#fff;" />
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; color:#334155; margin-bottom:4px;">Subject</label>
                                    <input type="text" id="sw-mail-subject" required style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.88rem; color:#0f172a; background:#fff;" />
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; color:#334155; margin-bottom:4px;">Official License Key</label>
                                    <input type="text" id="sw-mail-license" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.88rem; font-family:monospace; color:#0f172a; background:#fff;" />
                                </div>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.82rem; font-weight:600; color:#334155; margin-bottom:4px;">Download / Documentation Links (One URL per line)</label>
                                <textarea id="sw-mail-docs" rows="2" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.88rem; color:#0f172a; background:#fff;" placeholder="https://widetech.in/uploads/software/package.zip&#10;https://widetech.in/docs/setup-guide"></textarea>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.82rem; font-weight:600; color:#334155; margin-bottom:4px;">Commitments & Deliverables Checklist (One per line)</label>
                                <textarea id="svc-sw-commitments" rows="3" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.88rem; color:#0f172a; background:#fff;" placeholder="Full Production Source Code + Dockerfile&#10;Sub-150ms Response SLA&#10;1-Year License Validity & Security Patches&#10;Direct Developer Support via WhatsApp"></textarea>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.82rem; font-weight:600; color:#334155; margin-bottom:4px;">Personalized Message to Buyer</label>
                                <textarea id="sw-mail-message" rows="3" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.88rem; color:#0f172a; background:#fff;" placeholder="Thank you for purchasing from WideTech. Your software package is ready for deployment..."></textarea>
                            </div>

                            <div style="display:flex; justify-content:flex-end; gap:0.75rem; border-top:1px solid #e2e8f0; padding-top:1rem;">
                                <button type="button" class="btn btn-secondary" onclick="SoftwareModule.closeEmailModal()">Cancel</button>
                                <button type="submit" class="btn btn-primary" id="sw-email-submit-btn">🚀 Dispatch Deliverables Email</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Software render error:', err);
            return `<div class="error" style="padding:2rem; text-align:center; color:#ef4444;">Failed to load software products: ${err.message}</div>`;
        }
    },

    renderFeatureInputs() {
        const container = document.getElementById('sw-features-container');
        if (!container) return;
        container.innerHTML = this.featureItems.map((item, idx) => `
            <div style="display:flex; gap:0.5rem; align-items:center;">
                <span style="color:#6366f1; font-weight:bold; font-size:0.9rem;">${idx + 1}.</span>
                <input type="text" class="sw-feature-item" value="${item.replace(/"/g, '&quot;')}" placeholder="Feature or Benefit" style="flex:1; padding:0.5rem 0.75rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.88rem; color:#0f172a; background:#fff;" />
                <button type="button" onclick="SoftwareModule.removeFeatureRow(${idx})" style="background:#fee2e2; color:#ef4444; border:none; border-radius:6px; width:32px; height:32px; cursor:pointer; font-weight:bold;">✕</button>
            </div>
        `).join('');
    },

    addFeatureRow() {
        this.syncFeaturesFromDOM();
        this.featureItems.push('');
        this.renderFeatureInputs();
    },

    removeFeatureRow(idx) {
        this.syncFeaturesFromDOM();
        this.featureItems.splice(idx, 1);
        if (this.featureItems.length === 0) this.featureItems.push('');
        this.renderFeatureInputs();
    },

    syncFeaturesFromDOM() {
        const inputs = document.querySelectorAll('.sw-feature-item');
        if (inputs.length > 0) {
            this.featureItems = Array.from(inputs).map(inp => inp.value.trim());
        }
    },

    async handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const statusEl = document.getElementById('sw-upload-status');
        if (statusEl) statusEl.textContent = '⏳ Saving to server software folder...';

        try {
            const formData = new FormData();
            formData.append('softwareFile', file);

            const token = localStorage.getItem('adminToken');
            const res = await fetch('/api/upload/software', {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'File upload failed');
            }

            const data = await res.json();
            document.getElementById('sw-download-url').value = data.downloadUrl || data.url;
            document.getElementById('sw-file-name').value = data.fileName;
            document.getElementById('sw-file-size').value = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

            if (statusEl) {
                statusEl.innerHTML = `✅ Saved to server software folder: <strong>${data.fileName}</strong> (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
            }
        } catch (err) {
            console.error('Software upload error:', err);
            if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444;">❌ Upload failed: ${err.message}</span>`;
            alert('Software upload failed: ' + err.message);
        }
    },

    async handleThumbnailUpload(file) {
        if (!file) return;
        const statusEl = document.getElementById('sw-thumbnail-status');
        const previewEl = document.getElementById('sw-thumbnail-preview');
        const previewContainer = document.getElementById('sw-thumbnail-preview-container');
        const inputEl = document.getElementById('sw-thumbnail');
        const progressBox = document.getElementById('sw-thumbnail-progress-box');
        const progressBar = document.getElementById('sw-thumbnail-progress-bar');
        const percentText = document.getElementById('sw-thumbnail-progress-pct');
        const labelText = document.getElementById('sw-thumbnail-progress-label');

        if (progressBox) progressBox.style.display = 'block';
        if (progressBar) progressBar.style.width = '0%';
        if (percentText) percentText.textContent = '0%';
        if (labelText) labelText.textContent = `Uploading ${file.name}...`;

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

            const url = data.url || data.downloadUrl;
            if (inputEl) inputEl.value = url;
            if (previewEl) previewEl.src = url;
            if (previewContainer) previewContainer.style.display = 'block';
            if (percentText) percentText.textContent = '100%';
            if (progressBar) progressBar.style.background = '#10b981';
            if (statusEl) statusEl.innerHTML = `✅ Uploaded successfully: <strong>${data.fileName || file.name}</strong>`;
        } catch (err) {
            console.error('Thumbnail upload error:', err);
            if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444;">❌ Upload failed: ${err.message}</span>`;
            alert('Thumbnail upload failed: ' + err.message);
        }
    },

    previewThumbnail(url) {
        const previewEl = document.getElementById('sw-thumbnail-preview');
        const previewContainer = document.getElementById('sw-thumbnail-preview-container');
        if (url && previewEl && previewContainer) {
            previewEl.src = url;
            previewContainer.style.display = 'block';
        } else if (previewContainer) {
            previewContainer.style.display = 'none';
        }
    },

    showCreateModal() {
        this.editingId = null;
        const modal = document.getElementById('software-modal');
        if (modal) {
            document.getElementById('software-form').reset();
            document.getElementById('sw-modal-title').textContent = 'Add Software Product for Sale';
            document.getElementById('sw-save-btn').textContent = 'Save & Publish Software';
            document.getElementById('sw-upload-status').innerHTML = '';
            document.getElementById('sw-download-url').value = '';
            document.getElementById('sw-file-name').value = '';
            document.getElementById('sw-file-size').value = '';
            const statusEl = document.getElementById('sw-thumbnail-status');
            if (statusEl) statusEl.innerHTML = '';
            const previewContainer = document.getElementById('sw-thumbnail-preview-container');
            if (previewContainer) previewContainer.style.display = 'none';
            this.featureItems = ['Sub-100ms Autonomous LLM Execution', 'Multilingual Malayalam & English Conversation', 'Full Source Code & Production Dockerfile', 'One-Click Cloud Deployment Script'];
            this.renderFeatureInputs();
            modal.style.display = 'flex';
        }
    },

    editSoftware(id) {
        const item = this.softwaresList.find(s => s._id === id);
        if (!item) {
            alert('Software product not found in list');
            return;
        }

        this.editingId = id;
        const modal = document.getElementById('software-modal');
        if (modal) {
            document.getElementById('sw-modal-title').textContent = `Edit Software: ${item.title}`;
            document.getElementById('sw-save-btn').textContent = 'Update Software Product';

            document.getElementById('sw-title').value = item.title || '';
            document.getElementById('sw-category').value = item.category || 'AI Bot & Automation';
            document.getElementById('sw-badge').value = item.highlightBadge || '';
            document.getElementById('sw-performance').value = item.performance || '';
            document.getElementById('sw-usefulness').value = item.usefulness || '';
            document.getElementById('sw-price').value = item.price !== undefined ? item.price : '';
            document.getElementById('sw-discount').value = item.discountedPrice || '';
            document.getElementById('sw-thumbnail').value = item.thumbnail || '';
            document.getElementById('sw-description').value = item.description || '';
            document.getElementById('sw-coupon').checked = item.couponEligible !== false;
            document.getElementById('sw-featured').checked = Boolean(item.isFeatured);

            document.getElementById('sw-download-url').value = item.downloadUrl || '';
            document.getElementById('sw-file-name').value = item.fileName || '';
            document.getElementById('sw-file-size').value = item.fileSize || '';

            const statusEl = document.getElementById('sw-upload-status');
            if (item.fileName) {
                statusEl.innerHTML = `📦 Current package: <strong>${item.fileName}</strong> (${item.fileSize || 'On Server'})`;
            } else {
                statusEl.innerHTML = '';
            }

            const thumbStatusEl = document.getElementById('sw-thumbnail-status');
            if (thumbStatusEl) thumbStatusEl.innerHTML = '';
            this.previewThumbnail(item.thumbnail);

            this.featureItems = (item.features && item.features.length > 0) 
                ? [...item.features] 
                : [''];
            this.renderFeatureInputs();

            modal.style.display = 'flex';
        }
    },

    closeModal() {
        this.editingId = null;
        const modal = document.getElementById('software-modal');
        if (modal) modal.style.display = 'none';
    },

    async handleCreate(e) {
        e.preventDefault();
        try {
            this.syncFeaturesFromDOM();
            const features = this.featureItems.filter(Boolean);

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
                isFeatured: document.getElementById('sw-featured').checked,
                features: features,
                downloadUrl: document.getElementById('sw-download-url').value || '',
                fileName: document.getElementById('sw-file-name').value || '',
                fileSize: document.getElementById('sw-file-size').value || ''
            };

            if (this.editingId) {
                await API.put(`/api/admin/software/${this.editingId}`, payload);
                alert('Software product updated successfully!');
            } else {
                await API.post('/api/admin/software', payload);
                alert('Software product published successfully!');
            }

            this.closeModal();
            App.navigateTo('software');
        } catch (err) {
            alert('Error saving software: ' + err.message);
        }
    },

    async deleteSoftware(id) {
        if (!confirm('Are you sure you want to delete this software product?')) return;
        try {
            await API.delete(`/api/admin/software/${id}`);
            alert('Software product removed.');
            App.navigateTo('software');
        } catch (err) {
            alert('Error deleting software: ' + err.message);
        }
    },

    async showBuyersModal() {
        const modal = document.getElementById('software-buyers-modal');
        if (modal) modal.style.display = 'flex';
        const content = document.getElementById('software-buyers-content');
        if (!content) return;

        try {
            content.innerHTML = '<div style="text-align:center; padding:2rem; color:#64748b;">Loading software buyers...</div>';
            const res = await API.get('/api/admin/software/buyers');
            const buyers = res.buyers || [];

            if (buyers.length === 0) {
                content.innerHTML = `
                    <div style="text-align:center; padding:3rem; color:#64748b; background:#f8fafc; border-radius:12px;">
                        <h4>No software purchasers recorded yet</h4>
                        <p style="margin:4px 0 0; font-size:0.85rem;">When users unlock or purchase software, their details and license keys will appear here.</p>
                    </div>
                `;
                return;
            }

            content.innerHTML = `
                <div class="table-responsive">
                    <table class="data-table" style="width:100%; border-collapse:collapse; text-align:left;">
                        <thead>
                            <tr style="border-bottom:1px solid #e2e8f0; color:#64748b; font-size:0.82rem;">
                                <th style="padding:0.6rem;">Buyer Details</th>
                                <th style="padding:0.6rem;">Software Product</th>
                                <th style="padding:0.6rem;">Commercial License Key</th>
                                <th style="padding:0.6rem;">Purchased Date</th>
                                <th style="padding:0.6rem;">Status</th>
                                <th style="padding:0.6rem; text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${buyers.map(b => `
                                <tr style="border-bottom:1px solid #f1f5f9; font-size:0.85rem;">
                                    <td style="padding:0.6rem;">
                                        <strong>${b.buyerName}</strong>
                                        <div style="font-size:0.75rem; color:#64748b;">${b.buyerEmail}</div>
                                        <div style="font-size:0.75rem; color:#0284c7;">📞 ${b.buyerPhone || 'N/A'}</div>
                                    </td>
                                    <td style="padding:0.6rem;">
                                        <span style="font-weight:600; color:#0f172a;">${b.softwareTitle}</span>
                                        <div style="font-size:0.72rem; color:#64748b;">${b.softwareCategory}</div>
                                        ${b.requirements && b.requirements !== 'N/A' ? `<div style="font-size:0.72rem; color:#475569; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${b.requirements.replace(/"/g, '&quot;')}">💬 ${b.requirements}</div>` : ''}
                                    </td>
                                    <td style="padding:0.6rem;">
                                        <code style="background:#eef2ff; color:#4f46e5; padding:3px 8px; border-radius:4px; font-size:0.82rem; font-weight:700;">
                                            ${b.licenseKey}
                                        </code>
                                    </td>
                                    <td style="padding:0.6rem; color:#64748b; font-size:0.8rem; white-space:nowrap;">
                                        ${new Date(b.purchasedAt).toLocaleDateString()}
                                    </td>
                                    <td style="padding:0.6rem;">
                                        <span style="background:${b.status === 'enquired' ? '#fef3c7' : '#dcfce7'}; color:${b.status === 'enquired' ? '#b45309' : '#15803d'}; padding:2px 8px; border-radius:4px; font-weight:700; font-size:0.75rem;">
                                            ${b.status === 'enquired' ? 'ENQUIRY' : 'ACTIVE'}
                                        </span>
                                    </td>
                                    <td style="padding:0.6rem; text-align:right;">
                                        <button class="btn btn-sm btn-primary" onclick="SoftwareModule.openEmailModal('${b.buyerName.replace(/'/g, "\\'")}', '${b.buyerEmail}', '${(b.softwareTitle || '').replace(/'/g, "\\'")}', '${b.licenseKey}', '${(b.downloadUrl || '').replace(/'/g, "\\'")}')" style="padding:4px 10px; font-size:0.78rem;">
                                            ✉️ Email Deliverables
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (err) {
            content.innerHTML = `<div style="color:#ef4444; padding:2rem; text-align:center;">Failed to load buyers: ${err.message}</div>`;
        }
    },

    closeBuyersModal() {
        const modal = document.getElementById('software-buyers-modal');
        if (modal) modal.style.display = 'none';
    },

    openEmailModal(name, email, softwareTitle, licenseKey, downloadUrl) {
        const modal = document.getElementById('software-email-modal');
        if (!modal) return;
        document.getElementById('sw-mail-name').value = name || '';
        document.getElementById('sw-mail-email').value = email || '';
        document.getElementById('sw-mail-subject').value = `WideTech Deliverables & License: ${softwareTitle || 'Software Product'}`;
        document.getElementById('sw-mail-license').value = licenseKey || '';
        document.getElementById('sw-mail-docs').value = downloadUrl ? `${window.location.origin}${downloadUrl}` : `https://widetech.in/dashboard`;
        document.getElementById('svc-sw-commitments').value = `1. Full Commercial Access: ${softwareTitle || 'WideTech Software'}\n2. Official License Key Activated: ${licenseKey || 'Standard License'}\n3. Complete Source Code & Docker Setup Included\n4. 1-Year Version Patches & Technical Support`;
        document.getElementById('sw-mail-message').value = `Dear ${name},\n\nThank you for choosing WideTech. Your commercial license has been provisioned and your deliverables are ready for access. Please find your license key and download links above.`;
        modal.style.display = 'flex';
    },

    closeEmailModal() {
        const modal = document.getElementById('software-email-modal');
        if (modal) modal.style.display = 'none';
    },

    async handleSendEmail(e) {
        e.preventDefault();
        const btn = document.getElementById('sw-email-submit-btn');
        if (btn) btn.disabled = true;

        try {
            const payload = {
                recipientName: document.getElementById('sw-mail-name').value,
                recipientEmail: document.getElementById('sw-mail-email').value,
                subject: document.getElementById('sw-mail-subject').value,
                licenseKey: document.getElementById('sw-mail-license').value,
                documentLinks: document.getElementById('sw-mail-docs').value.split('\n').filter(Boolean),
                commitments: document.getElementById('svc-sw-commitments').value.split('\n').filter(Boolean),
                message: document.getElementById('sw-mail-message').value,
                itemType: 'software'
            };

            await API.post('/api/admin/deliverables/send-email', payload);
            alert('Software deliverables and official license key email dispatched successfully!');
            this.closeEmailModal();
        } catch (err) {
            alert('Error sending deliverables email: ' + err.message);
        } finally {
            if (btn) btn.disabled = false;
        }
    }
};
