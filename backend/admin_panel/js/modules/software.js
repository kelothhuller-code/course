// Software Products admin — list/form are built by CatalogAdmin (catalog-admin.js);
// buyers / deliverables tools below are unchanged.
window.SoftwareModule = {
    async render() {
        try {
            const { items, categories } = await CatalogAdmin.load('software');
            return CatalogAdmin.renderList(
                { ...CatalogAdmin.configs.software, extraButtons: '<button class="btn btn-secondary" onclick="SoftwareModule.showBuyersModal()">View buyers & send deliverables</button>' },
                items, categories) + `
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
                                <textarea id="svc-sw-commitments" rows="3" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.88rem; color:#0f172a; background:#fff;" placeholder="One deliverable per line"></textarea>
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
            return `<div class="error" style="padding:2rem; text-align:center; color:#ef4444;">Failed to load software products: ${Helpers.escapeHtml(err.message)}</div>`;
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
                statusEl.innerHTML = `✅ Saved to server software folder: <strong>${Helpers.escapeHtml(data.fileName)}</strong> (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
            }
        } catch (err) {
            console.error('Software upload error:', err);
            if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444;">❌ Upload failed: ${Helpers.escapeHtml(err.message)}</span>`;
            alert('Software upload failed: ' + err.message);
        }
    },

    showCreateModal() { CatalogAdmin.openForm('software'); },
    editSoftware(id) { CatalogAdmin.openForm('software', id); },
    deleteSoftware(id) { CatalogAdmin.remove('software', id); },

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
                            ${(this.buyersList = buyers).map((b, bi) => `
                                <tr style="border-bottom:1px solid #f1f5f9; font-size:0.85rem;">
                                    <td style="padding:0.6rem;">
                                        <strong>${Helpers.escapeHtml(b.buyerName)}</strong>
                                        <div style="font-size:0.75rem; color:#64748b;">${Helpers.escapeHtml(b.buyerEmail)}</div>
                                        <div style="font-size:0.75rem; color:#0284c7;">📞 ${Helpers.escapeHtml(b.buyerPhone || 'N/A')}</div>
                                    </td>
                                    <td style="padding:0.6rem;">
                                        <span style="font-weight:600; color:#0f172a;">${Helpers.escapeHtml(b.softwareTitle)}</span>
                                        <div style="font-size:0.72rem; color:#64748b;">${Helpers.escapeHtml(b.softwareCategory)}</div>
                                        ${b.requirements && b.requirements !== 'N/A' ? `<div style="font-size:0.72rem; color:#475569; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${Helpers.escapeHtml(b.requirements)}">💬 ${Helpers.escapeHtml(b.requirements)}</div>` : ''}
                                    </td>
                                    <td style="padding:0.6rem;">
                                        <code style="background:#eef2ff; color:#4f46e5; padding:3px 8px; border-radius:4px; font-size:0.82rem; font-weight:700;">
                                            ${Helpers.escapeHtml(b.licenseKey)}
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
                                        <button class="btn btn-sm btn-primary" onclick="SoftwareModule.openEmailModalFor(${bi})" style="padding:4px 10px; font-size:0.78rem;">
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
            content.innerHTML = `<div style="color:#ef4444; padding:2rem; text-align:center;">Failed to load buyers: ${Helpers.escapeHtml(err.message)}</div>`;
        }
    },

    closeBuyersModal() {
        const modal = document.getElementById('software-buyers-modal');
        if (modal) modal.style.display = 'none';
    },

    openEmailModalFor(i) {
        const b = (this.buyersList || [])[i];
        if (b) this.openEmailModal(b.buyerName, b.buyerEmail, b.softwareTitle, b.licenseKey, b.downloadUrl);
    },

    openEmailModal(name, email, softwareTitle, licenseKey, downloadUrl) {
        const modal = document.getElementById('software-email-modal');
        if (!modal) return;
        document.getElementById('sw-mail-name').value = name || '';
        document.getElementById('sw-mail-email').value = email || '';
        document.getElementById('sw-mail-subject').value = `WideTech Deliverables & License: ${softwareTitle || 'Software Product'}`;
        document.getElementById('sw-mail-license').value = licenseKey || '';
        document.getElementById('sw-mail-docs').value = downloadUrl ? `${window.location.origin}${downloadUrl}` : `https://widetech.in/dashboard`;
        document.getElementById('svc-sw-commitments').value = `1. Access: ${softwareTitle || 'WideTech software'}
2. License key: ${licenseKey || '—'}
3. [Add what is included — edit before sending]`;
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
