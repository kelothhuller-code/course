// Services admin — list/form are built by CatalogAdmin (catalog-admin.js);
// the clients / deliverables tools below are unchanged.
window.ServicesModule = {
    async render() {
        try {
            const { items, categories } = await CatalogAdmin.load('service');
            return CatalogAdmin.renderList(
                { ...CatalogAdmin.configs.service, extraButtons: '<button class="btn btn-secondary" onclick="ServicesModule.showClientsModal()">View clients & enquiries</button>' },
                items, categories) + `
                <!-- Clients & Enquiries View Modal -->
                <div id="service-clients-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background: var(--overlay); backdrop-filter:blur(6px); z-index:9999; justify-content:center; align-items:center; padding:1rem;">
                    <div class="modal-card" style="background: var(--bg-card); border-radius:16px; width:100%; max-width:900px; max-height:90vh; overflow-y:auto; padding:2rem; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid var(--border); padding-bottom:1rem;">
                            <div>
                                <h3 style="margin:0; font-size:1.25rem; color: var(--text-main); font-weight:800;">📋 Service Clients & Enquiries</h3>
                                <p style="margin:4px 0 0; color: var(--text-muted); font-size:0.85rem;">View clients who enquired or purchased custom services and dispatch commitments & project agreements.</p>
                            </div>
                            <button onclick="ServicesModule.closeClientsModal()" style="border:none; background: var(--bg-subtle); border-radius:8px; width:34px; height:34px; font-size:1.2rem; cursor:pointer; color: var(--text-muted);">✕</button>
                        </div>

                        <div id="service-clients-content">
                            <div style="text-align:center; padding:2rem; color: var(--text-muted);">Loading client requests...</div>
                        </div>
                    </div>
                </div>

                <!-- Email Deliverables & Commitments Modal -->
                <div id="service-email-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background: var(--overlay); backdrop-filter:blur(6px); z-index:10000; justify-content:center; align-items:center; padding:1rem;">
                    <div class="modal-card" style="background: var(--bg-card); border-radius:16px; width:100%; max-width:620px; max-height:90vh; overflow-y:auto; padding:2rem; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; border-bottom:1px solid var(--border); padding-bottom:0.75rem;">
                            <h3 style="margin:0; font-size:1.2rem; color: var(--text-main); font-weight:800;">✉️ Dispatch Commitments & Documents</h3>
                            <button onclick="ServicesModule.closeEmailModal()" style="border:none; background: var(--bg-subtle); border-radius:8px; width:34px; height:34px; font-size:1.2rem; cursor:pointer; color: var(--text-muted);">✕</button>
                        </div>

                        <form id="service-email-form" onsubmit="ServicesModule.handleSendEmail(event)" style="display:flex; flex-direction:column; gap:1rem;">
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; color: var(--text-secondary); margin-bottom:4px;">Recipient Name</label>
                                    <input type="text" id="svc-mail-name" required style="width:100%; padding:0.55rem; border:1px solid var(--border-strong); border-radius:8px; font-size:0.88rem; color: var(--text-main); background: var(--bg-card);" />
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; color: var(--text-secondary); margin-bottom:4px;">Recipient Email</label>
                                    <input type="email" id="svc-mail-email" required style="width:100%; padding:0.55rem; border:1px solid var(--border-strong); border-radius:8px; font-size:0.88rem; color: var(--text-main); background: var(--bg-card);" />
                                </div>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.82rem; font-weight:600; color: var(--text-secondary); margin-bottom:4px;">Subject</label>
                                <input type="text" id="svc-mail-subject" required style="width:100%; padding:0.55rem; border:1px solid var(--border-strong); border-radius:8px; font-size:0.88rem; color: var(--text-main); background: var(--bg-card);" />
                            </div>

                            <div>
                                <label style="display:block; font-size:0.82rem; font-weight:600; color: var(--text-secondary); margin-bottom:4px;">Official Commitments & Scope (One per line)</label>
                                <textarea id="svc-mail-commitments" rows="4" style="width:100%; padding:0.55rem; border:1px solid var(--border-strong); border-radius:8px; font-size:0.88rem; color: var(--text-main); background: var(--bg-card);" placeholder="Project Scope: Meta WhatsApp API Setup&#10;Delivery Timeline: 10 Days&#10;SLA Guarantee: 30 Days Maintenance&#10;Direct WhatsApp Engineer Support"></textarea>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.82rem; font-weight:600; color: var(--text-secondary); margin-bottom:4px;">Agreement / Document Links (One URL per line)</label>
                                <textarea id="svc-mail-docs" rows="2" style="width:100%; padding:0.55rem; border:1px solid var(--border-strong); border-radius:8px; font-size:0.88rem; color: var(--text-main); background: var(--bg-card);" placeholder="https://drive.google.com/your-service-agreement&#10;https://widetech.in/docs/sla"></textarea>
                            </div>

                            <div>
                                <label style="display:block; font-size:0.82rem; font-weight:600; color: var(--text-secondary); margin-bottom:4px;">Personalized Message / Notes</label>
                                <textarea id="svc-mail-message" rows="3" style="width:100%; padding:0.55rem; border:1px solid var(--border-strong); border-radius:8px; font-size:0.88rem; color: var(--text-main); background: var(--bg-card);" placeholder="Thank you for partnering with WideTech. Our engineering team is starting implementation..."></textarea>
                            </div>

                            <div style="display:flex; justify-content:flex-end; gap:0.75rem; border-top:1px solid var(--border); padding-top:1rem;">
                                <button type="button" class="btn btn-secondary" onclick="ServicesModule.closeEmailModal()">Cancel</button>
                                <button type="submit" class="btn btn-primary" id="svc-email-submit-btn">🚀 Send Official Email</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Services render error:', err);
            return `<div class="error" style="padding:2rem; text-align:center; color: var(--danger);">Failed to load services: ${Helpers.escapeHtml(err.message)}</div>`;
        }
    },

    showCreateModal() { CatalogAdmin.openForm('service'); },
    editService(id) { CatalogAdmin.openForm('service', id); },
    deleteService(id) { CatalogAdmin.remove('service', id); },

    async showClientsModal() {
        const modal = document.getElementById('service-clients-modal');
        if (modal) modal.style.display = 'flex';
        const content = document.getElementById('service-clients-content');
        if (!content) return;

        try {
            content.innerHTML = '<div style="text-align:center; padding:2rem; color: var(--text-muted);">Loading client enquiries...</div>';
            const res = await API.get('/api/admin/services/clients');
            const clients = res.clients || [];

            if (clients.length === 0) {
                content.innerHTML = `
                    <div style="text-align:center; padding:3rem; color: var(--text-muted); background: var(--bg-secondary); border-radius:12px;">
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
                            <tr style="border-bottom:1px solid var(--border); color: var(--text-muted); font-size:0.82rem;">
                                <th style="padding:0.6rem;">Client</th>
                                <th style="padding:0.6rem;">Phone / Contact</th>
                                <th style="padding:0.6rem;">Service Requested</th>
                                <th style="padding:0.6rem;">Requirements</th>
                                <th style="padding:0.6rem;">Date</th>
                                <th style="padding:0.6rem; text-align:right;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(this.clientsList = clients).map((c, ci) => `
                                <tr style="border-bottom:1px solid var(--border); font-size:0.85rem;">
                                    <td style="padding:0.6rem;">
                                        <strong>${Helpers.escapeHtml(c.clientName)}</strong>
                                        <div style="font-size:0.75rem; color: var(--text-muted);">${Helpers.escapeHtml(c.clientEmail)}</div>
                                    </td>
                                    <td style="padding:0.6rem; color: var(--info); font-weight:600;">
                                        ${Helpers.escapeHtml(c.clientPhone || 'N/A')}
                                    </td>
                                    <td style="padding:0.6rem;">
                                        <span style="background:#e0e7ff; color: var(--primary-text); padding:2px 8px; border-radius:4px; font-weight:600; font-size:0.78rem;">
                                            ${Helpers.escapeHtml(c.serviceTitle)}
                                        </span>
                                    </td>
                                    <td style="padding:0.6rem; max-width:200px; color: var(--text-secondary); font-size:0.8rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${(c.requirements || '').replace(/"/g, '&quot;')}">
                                        ${Helpers.escapeHtml(c.requirements || 'N/A')}
                                    </td>
                                    <td style="padding:0.6rem; color: var(--text-muted); font-size:0.8rem; white-space:nowrap;">
                                        ${new Date(c.enquiredAt).toLocaleDateString()}
                                    </td>
                                    <td style="padding:0.6rem; text-align:right;">
                                        <button class="btn btn-sm btn-primary" onclick="ServicesModule.openEmailModalFor(${ci})" style="padding:4px 10px; font-size:0.78rem;">
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
            content.innerHTML = `<div style="color: var(--danger); padding:2rem; text-align:center;">Failed to load clients: ${Helpers.escapeHtml(err.message)}</div>`;
        }
    },

    closeClientsModal() {
        const modal = document.getElementById('service-clients-modal');
        if (modal) modal.style.display = 'none';
    },

    openEmailModalFor(i) {
        const c = (this.clientsList || [])[i];
        if (c) this.openEmailModal(c.clientName, c.clientEmail, c.serviceTitle);
    },

    openEmailModal(name, email, serviceTitle) {
        const modal = document.getElementById('service-email-modal');
        if (!modal) return;
        document.getElementById('svc-mail-name').value = name || '';
        document.getElementById('svc-mail-email').value = email || '';
        document.getElementById('svc-mail-subject').value = `WideTech Commitments & Deliverables: ${serviceTitle || 'Custom Technology Service'}`;
        document.getElementById('svc-mail-commitments').value = `1. Service: ${serviceTitle || 'WideTech service'}
2. [Timeline — edit before sending]
3. [What is included — edit before sending]`;
        document.getElementById('svc-mail-docs').value = `https://widetech.in/services`;
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
