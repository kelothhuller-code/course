/**
 * Licensing + paid services admin:
 *  - LicAdmin: form parts used by the Software / Services / Course forms (plans, packages, GST)
 *  - LicensesModule: licences, devices, trials, manual keys, CSV
 *  - ServiceOrdersModule: paid service orders, status updates, CSV
 * Every value from the database is escaped before it is put into HTML.
 */
window.LicAdmin = {
    esc(v) { return Helpers.escapeHtml(v === undefined || v === null ? '' : String(v)); },
    money(n) { return n === undefined || n === null || n === '' ? '—' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 }); },
    date(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; },
    dateTime(d) { return d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; },
    GST_RATES: [0, 0.25, 3, 5, 12, 18, 28, 40],
    BILLING: [['monthly', 'Monthly'], ['yearly', 'Yearly'], ['lifetime', 'Lifetime (pay once)'], ['custom_days', 'Custom number of days']],

    // ---- GST fields ---------------------------------------------------------------------
    /** inherit=true for plans/packages: empty = use the product's setting. */
    gstFields(prefix, obj = {}, { inherit = false } = {}) {
        const rate = obj.gstRate === undefined || obj.gstRate === null ? '' : String(obj.gstRate);
        const incl = obj.gstInclusive === false ? 'exclusive' : (obj.gstInclusive === true ? 'inclusive' : (inherit ? '' : 'inclusive'));
        return `
            <div class="cat-field"><label class="cat-label" for="${prefix}-rate">GST rate</label>
                <select id="${prefix}-rate" data-gst="rate">
                    <option value="">${inherit ? 'Same as product' : 'Store default (Admin → GST)'}</option>
                    ${this.GST_RATES.map((r) => `<option value="${r}" ${rate === String(r) ? 'selected' : ''}>${r}%</option>`).join('')}
                </select></div>
            <div class="cat-field"><label class="cat-label" for="${prefix}-incl">Price entered is</label>
                <select id="${prefix}-incl" data-gst="incl">
                    ${inherit ? `<option value="" ${incl === '' ? 'selected' : ''}>Same as product</option>` : ''}
                    <option value="inclusive" ${incl === 'inclusive' ? 'selected' : ''}>GST-inclusive (buyer pays the price shown)</option>
                    <option value="exclusive" ${incl === 'exclusive' ? 'selected' : ''}>GST-exclusive (GST added at checkout)</option>
                </select></div>
            <div class="cat-field"><label class="cat-label" for="${prefix}-hsn">HSN/SAC code</label>
                <input type="text" id="${prefix}-hsn" data-gst="hsn" maxlength="8" inputmode="numeric" placeholder="${inherit ? 'Same as product' : 'e.g. ask your CA'}" value="${this.esc(obj.hsnSacCode || '')}">
                <small class="cat-help">Printed on the GST invoice. Leave empty until your CA confirms the code.</small></div>`;
    },
    /** Reads the GST fields inside `root` (each GST block has its own container). */
    readGst(root) {
        const q = (k) => (root || document).querySelector(`[data-gst="${k}"]`);
        const rate = q('rate');
        const incl = q('incl');
        const hsn = q('hsn');
        return {
            gstRate: rate ? rate.value : '',
            gstInclusive: incl ? (incl.value === '' ? 'inherit' : incl.value) : 'inclusive',
            hsnSacCode: hsn ? hsn.value.trim() : '',
        };
    },

    // ---- Software: licensing, trial and plans --------------------------------------------
    planRow(p = {}, i = 0) {
        const id = `plan-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 6)}`;
        return `
        <div class="lic-row" data-row="plan" data-id="${this.esc(p._id || '')}">
            <div class="lic-row-head"><strong>Plan</strong>
                <label class="cat-switch"><input type="checkbox" data-k="isActive" ${p.isActive === false ? '' : 'checked'}> On sale</label>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="LicAdmin.removeRow(this)">Remove</button></div>
            <div class="cat-grid">
                <div class="cat-field"><label class="cat-label">Plan name *</label><input type="text" data-k="name" maxlength="60" placeholder="e.g. Yearly" value="${this.esc(p.name || '')}"></div>
                <div class="cat-field"><label class="cat-label">Price (₹) *</label><input type="number" data-k="price" min="1" step="1" value="${this.esc(p.price ?? '')}"></div>
                <div class="cat-field"><label class="cat-label">Billing</label>
                    <select data-k="billing" onchange="this.closest('.lic-row').querySelector('[data-k=customDays]').closest('.cat-field').style.display = this.value === 'custom_days' ? '' : 'none'">
                        ${this.BILLING.map(([v, l]) => `<option value="${v}" ${(p.billing || 'yearly') === v ? 'selected' : ''}>${l}</option>`).join('')}
                    </select><small class="cat-help">Renewals add the same period again.</small></div>
                <div class="cat-field" style="${p.billing === 'custom_days' ? '' : 'display:none'}"><label class="cat-label">Number of days</label><input type="number" data-k="customDays" min="1" max="3650" value="${this.esc(p.customDays ?? 30)}"></div>
                <div class="cat-field"><label class="cat-label">Devices per key</label><input type="number" data-k="maxDevices" min="1" max="1000" value="${this.esc(p.maxDevices ?? 1)}"><small class="cat-help">How many computers one key can be active on.</small></div>
                <div class="cat-field cat-wide"><label class="cat-label">What's included (one per line)</label><textarea rows="3" data-k="features">${this.esc((p.features || []).join('\n'))}</textarea></div>
                <details class="cat-wide lic-gst"><summary>GST for this plan (optional)</summary><div class="cat-grid">${this.gstFields(id, p, { inherit: true })}</div></details>
            </div>
        </div>`;
    },
    packageRow(p = {}, i = 0) {
        const id = `pkg-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 6)}`;
        return `
        <div class="lic-row" data-row="package" data-id="${this.esc(p._id || '')}">
            <div class="lic-row-head"><strong>Package</strong>
                <label class="cat-switch"><input type="checkbox" data-k="isActive" ${p.isActive === false ? '' : 'checked'}> On sale</label>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="LicAdmin.removeRow(this)">Remove</button></div>
            <div class="cat-grid">
                <div class="cat-field"><label class="cat-label">Package name *</label><input type="text" data-k="name" maxlength="60" placeholder="Basic / Standard / Premium" value="${this.esc(p.name || '')}"></div>
                <div class="cat-field"><label class="cat-label">Delivery time</label><input type="text" data-k="deliveryTime" maxlength="60" placeholder="e.g. 5 working days" value="${this.esc(p.deliveryTime || '')}"></div>
                <div class="cat-field"><label class="cat-label">Price (₹) *</label><input type="number" data-k="price" min="1" step="1" value="${this.esc(p.price ?? '')}"></div>
                <div class="cat-field"><label class="cat-label">Offer price (optional)</label><input type="number" data-k="discountedPrice" min="0" step="1" value="${this.esc(p.discountedPrice || '')}"></div>
                <div class="cat-field cat-wide"><label class="cat-label">Deliverables (one per line)</label><textarea rows="3" data-k="deliverables">${this.esc((p.deliverables || []).join('\n'))}</textarea></div>
                <details class="cat-wide lic-gst"><summary>GST for this package (optional)</summary><div class="cat-grid">${this.gstFields(id, p, { inherit: true })}</div></details>
            </div>
        </div>`;
    },
    addRow(kind) {
        const list = document.getElementById(kind === 'plan' ? 'lic-plans' : 'lic-packages');
        const n = list.querySelectorAll('.lic-row').length;
        if (n >= (kind === 'plan' ? 12 : 8)) return alert('That is the maximum number.');
        const defaults = kind === 'package' ? [{ name: 'Basic' }, { name: 'Standard' }, { name: 'Premium' }][n] || {} : {};
        list.insertAdjacentHTML('beforeend', kind === 'plan' ? this.planRow(defaults, n) : this.packageRow(defaults, n));
    },
    removeRow(btn) {
        if (confirm('Remove this row? (Existing buyers keep what they bought.)')) btn.closest('.lic-row').remove();
    },
    readRows(listId) {
        return [...document.querySelectorAll(`#${listId} .lic-row`)].map((row) => {
            const out = {};
            if (row.dataset.id) out._id = row.dataset.id;
            row.querySelectorAll('[data-k]').forEach((el) => {
                const k = el.dataset.k;
                if (el.type === 'checkbox') out[k] = el.checked;
                else if (k === 'features' || k === 'deliverables') out[k] = el.value.split('\n').map((s) => s.trim()).filter(Boolean);
                else out[k] = el.value.trim();
            });
            Object.assign(out, this.readGst(row.querySelector('.lic-gst')));
            return out;
        });
    },

    softwareExtra(item) {
        const s = item || {};
        const trialDays = s.trialDays ?? 7;
        return `
        <fieldset class="cat-fieldset"><legend>Online licensing, free trial and plans</legend>
            <div class="cat-grid">
                <div class="cat-field cat-check cat-wide"><label><input type="checkbox" id="lic-enabled" ${s.licensingEnabled ? 'checked' : ''}> Sell licence keys for this software (activated online by the app)</label>
                    <small class="cat-help">When on, the public page shows your plans with “Buy”, and buyers get a key by email and in their dashboard.</small></div>
                <div class="cat-field"><label class="cat-label" for="lic-appid">App ID</label>
                    <input type="text" id="lic-appid" maxlength="80" placeholder="auto: same as URL slug" value="${this.esc(s.appId || '')}">
                    <small class="cat-help">Put this in your app's code. Don't change it after you release the app.</small></div>
                <div class="cat-field"></div>
                <div class="cat-field cat-check"><label><input type="checkbox" id="lic-trial" ${s.trialEnabled === false ? '' : 'checked'}> Offer a free trial</label>
                    <small class="cat-help">One trial per computer. Reinstalling does not reset it.</small></div>
                <div class="cat-field"><label class="cat-label" for="lic-trial-days">Trial length (days)</label>
                    <input type="number" id="lic-trial-days" min="1" max="90" value="${this.esc(trialDays)}"></div>
                <div class="cat-field cat-wide"><label class="cat-label" for="lic-trial-url">Trial download link</label>
                    <input type="text" id="lic-trial-url" placeholder="https://… (installer link)" value="${this.esc(s.trialDownloadUrl || '')}">
                    <label class="cat-switch" style="margin-top:6px;"><input type="checkbox" id="lic-trial-pkg" ${s.trialUsesPackage ? 'checked' : ''}> …or let anyone download the package uploaded below (the app itself stays locked without a trial or key)</label></div>
                <div class="cat-field cat-wide"><label class="cat-label" for="lic-trial-help">Trial instructions (optional)</label>
                    <textarea id="lic-trial-help" rows="2" maxlength="2000" placeholder="Download, install and open the app. Your trial starts automatically.">${this.esc(s.trialInstructions || '')}</textarea></div>
            </div>
            <h4 class="lic-sub">Plans</h4>
            <p class="cat-help">Example: Monthly ₹499 (1 device), Yearly ₹3,999 (2 devices), Lifetime ₹9,999 (3 devices). Prices are what you charge; GST is handled by the setting below.</p>
            <div id="lic-plans">${(s.plans || []).map((p, i) => this.planRow(p, i)).join('')}</div>
            <button type="button" class="btn btn-sm btn-secondary" onclick="LicAdmin.addRow('plan')">+ Add plan</button>
        </fieldset>
        <fieldset class="cat-fieldset" id="sw-gst"><legend>GST (software)</legend>
            <div class="cat-grid">${this.gstFields('sw-gst', s)}</div>
        </fieldset>`;
    },
    softwareRead() {
        return {
            licensingEnabled: document.getElementById('lic-enabled')?.checked || false,
            appId: document.getElementById('lic-appid')?.value.trim().toLowerCase() || undefined,
            trialEnabled: document.getElementById('lic-trial')?.checked || false,
            trialDays: document.getElementById('lic-trial-days')?.value || 7,
            trialDownloadUrl: document.getElementById('lic-trial-url')?.value.trim() || '',
            trialUsesPackage: document.getElementById('lic-trial-pkg')?.checked || false,
            trialInstructions: document.getElementById('lic-trial-help')?.value.trim() || '',
            plans: this.readRows('lic-plans'),
            ...this.readGst(document.getElementById('sw-gst')),
        };
    },

    serviceExtra(item) {
        const s = item || {};
        const mode = s.purchaseMode || 'quote';
        return `
        <fieldset class="cat-fieldset"><legend>How customers buy this service</legend>
            <div class="lic-modes">
                ${[['fixed', 'Fixed price — “Buy now”', 'One price (the Price field above, or one package). Paid online; you then contact the buyer.'],
                   ['quote', 'Quote only — “Get a quote”', 'Only the enquiry form. Nothing is sold online.'],
                   ['both', 'Packages + quote', 'Basic / Standard / Premium packages with “Buy”, plus “Need something custom? Get a quote”.']]
                    .map(([v, l, h]) => `<label class="lic-mode"><input type="radio" name="lic-mode" value="${v}" ${mode === v ? 'checked' : ''} onchange="LicAdmin.toggleMode()"><span><strong>${l}</strong><small>${h}</small></span></label>`).join('')}
            </div>
            <div id="lic-pkg-wrap" style="${mode === 'quote' ? 'display:none' : ''}">
                <h4 class="lic-sub">Packages</h4>
                <p class="cat-help">For “Fixed price” you can leave this empty and use the Price field above.</p>
                <div id="lic-packages">${(s.packages || []).map((p, i) => this.packageRow(p, i)).join('')}</div>
                <button type="button" class="btn btn-sm btn-secondary" onclick="LicAdmin.addRow('package')">+ Add package</button>
            </div>
        </fieldset>
        <fieldset class="cat-fieldset" id="svc-gst"><legend>GST (service)</legend>
            <div class="cat-grid">${this.gstFields('svc-gst', s)}</div>
        </fieldset>`;
    },
    toggleMode() {
        const m = document.querySelector('input[name="lic-mode"]:checked')?.value;
        const wrap = document.getElementById('lic-pkg-wrap');
        if (wrap) wrap.style.display = m === 'quote' ? 'none' : '';
    },
    serviceRead() {
        return {
            purchaseMode: document.querySelector('input[name="lic-mode"]:checked')?.value || 'quote',
            packages: this.readRows('lic-packages'),
            ...this.readGst(document.getElementById('svc-gst')),
        };
    },

    /** Course form: GST rate / inclusive / SAC (defaults keep today's behaviour). */
    courseGstHtml(course) {
        return `<div class="form-group" id="course-gst" style="grid-column:1/-1;">
            <label class="form-label">GST for this course</label>
            <div class="lic-course-gst">${this.gstFields('course-gst', course || {})}</div></div>`;
    },
    courseGstRead() {
        const el = document.getElementById('course-gst');
        return el ? this.readGst(el) : {};
    },

    async downloadCsv(url, name) {
        try {
            const res = await API.request(url);
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = name;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        } catch (e) {
            alert('Export failed: ' + e.message);
        }
    },

    gstCells(g) {
        if (!g) return '<span class="cat-muted">—</span>';
        const split = g.igst ? `IGST ${this.money(g.igst)}` : `CGST ${this.money(g.cgst)} + SGST ${this.money(g.sgst)}`;
        return `<div class="lic-gst-cell"><strong>${this.money(g.amount)}</strong>
            <small>Taxable ${this.money(g.baseAmount)} · ${this.esc(g.rate)}% ${g.isInclusive === false ? 'excl.' : 'incl.'}</small>
            <small>${split}</small>
            ${g.buyerGstin ? `<small>GSTIN ${this.esc(g.buyerGstin)}</small>` : ''}
            <small>${g.invoiceNo ? 'Invoice ' + this.esc(g.invoiceNo) : ''}${g.hsnSacCode ? ' · SAC ' + this.esc(g.hsnSacCode) : ' · <span title="Set the HSN/SAC code after confirming with your CA">SAC: TODO</span>'}</small></div>`;
    },
};

// =========================================================================================
window.LicensesModule = {
    state: { tab: 'licenses', search: '', status: '', software: '', page: 1 },
    softwares: [],

    badge(status) {
        const c = { active: 'lic-b-green', trial: 'lic-b-blue', expired: 'lic-b-amber', revoked: 'lic-b-red' }[status] || '';
        return `<span class="lic-badge ${c}">${LicAdmin.esc(status)}</span>`;
    },

    async render() {
        try {
            const sw = await API.get('/api/admin/software');
            this.softwares = (sw.softwares || []).filter((s) => s.licensingEnabled || (s.plans || []).length);
        } catch { this.softwares = []; }
        const t = this.state.tab;
        const tabs = [['licenses', 'Licences'], ['trials', 'Trial usage'], ['issue', 'Issue a key']]
            .map(([v, l]) => `<button class="cat-tab ${t === v ? 'active' : ''}" onclick="LicensesModule.tab('${v}')">${l}</button>`).join('');
        let body = '';
        if (t === 'licenses') body = await this.renderLicenses();
        else if (t === 'trials') body = await this.renderTrials();
        else body = this.renderIssue();
        return `
            <div class="cat-header"><div><h2>Software licences</h2>
                <p>Every key sold or issued, the computers it is active on, and free-trial usage. Keys are stored encrypted; only the last 5 characters are shown unless you click “Show key”.</p></div></div>
            <div class="cat-tabs">${tabs}</div>
            ${body}
            <div id="cat-modal" class="cat-modal" role="dialog" aria-modal="true" aria-labelledby="lic-modal-title" style="display:none;">
                <div class="cat-modal-card cat-modal-wide"><div class="cat-modal-head"><h3 id="lic-modal-title">Licence</h3>
                    <button type="button" class="cat-icon-btn" aria-label="Close" onclick="CatalogAdmin.closeForm()">✕</button></div>
                    <div id="lic-modal-body"></div></div></div>`;
    },
    tab(t) { this.state.tab = t; this.state.page = 1; App.navigateTo('licenses'); },

    swOptions(selected, { all = true } = {}) {
        return (all ? '<option value="">All software</option>' : '<option value="">Choose software…</option>') +
            this.softwares.map((s) => `<option value="${LicAdmin.esc(s._id)}" ${selected === s._id ? 'selected' : ''}>${LicAdmin.esc(s.title)}</option>`).join('');
    },

    query() {
        const p = new URLSearchParams();
        const s = this.state;
        if (s.search) p.set('search', s.search);
        if (s.status) p.set('status', s.status);
        if (s.software) p.set('software', s.software);
        return p;
    },

    async renderLicenses() {
        const p = this.query();
        p.set('page', this.state.page);
        let data;
        try { data = await API.get(`/api/admin/licensing/licenses?${p}`); } catch (e) { return `<div class="cat-error">${LicAdmin.esc(e.message)}</div>`; }
        const rows = (data.licenses || []).map((l) => `
            <tr>
                <td><code class="lic-key">${LicAdmin.esc(l.keyMasked)}</code><small class="cat-muted">${l.source === 'manual' ? 'issued manually' : 'purchased'}</small></td>
                <td><strong>${LicAdmin.esc(l.softwareTitle)}</strong><small class="cat-muted">${LicAdmin.esc(l.planName)}</small></td>
                <td>${LicAdmin.esc(l.buyerName || '')}<small class="cat-muted">${LicAdmin.esc(l.email)}</small></td>
                <td>${this.badge(l.status)}</td>
                <td>${l.expiresAt ? LicAdmin.date(l.expiresAt) : 'Lifetime'}</td>
                <td>${LicAdmin.esc(l.devicesUsed)} / ${LicAdmin.esc(l.maxDevices)}</td>
                <td class="cat-actions"><button class="btn btn-sm btn-secondary" onclick="LicensesModule.open('${LicAdmin.esc(l._id)}')">Manage</button></td>
            </tr>`).join('') || '<tr><td colspan="7" class="cat-empty">No licences match. Keys appear here after a purchase or when you issue one.</td></tr>';
        const s = this.state;
        return `
            <form class="cat-inline-form" onsubmit="event.preventDefault(); LicensesModule.filter(this)">
                <input type="search" name="search" placeholder="Search key (full or last 5), email or name" value="${LicAdmin.esc(s.search)}" aria-label="Search licences">
                <select name="status" class="cat-inline" aria-label="Status">
                    ${[['', 'Any status'], ['active', 'Active'], ['expired', 'Expired'], ['revoked', 'Revoked']].map(([v, l]) => `<option value="${v}" ${s.status === v ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
                <select name="software" class="cat-inline" aria-label="Software">${this.swOptions(s.software)}</select>
                <button class="btn btn-primary" type="submit">Search</button>
                <button class="btn btn-secondary" type="button" onclick="LicAdmin.downloadCsv('/api/admin/licensing/licenses.csv?${LicAdmin.esc(this.query().toString())}', 'licences.csv')">Export CSV (with GST)</button>
            </form>
            <div class="card cat-card"><div class="table-responsive"><table class="data-table cat-table lic-table">
                <thead><tr><th>Key</th><th>Software / plan</th><th>Buyer</th><th>Status</th><th>Expires</th><th>Devices</th><th></th></tr></thead>
                <tbody>${rows}</tbody></table></div>
                <div class="lic-pager"><span class="cat-muted">${LicAdmin.esc(data.total)} licence(s)</span>
                    ${data.page > 1 ? `<button class="btn btn-sm btn-secondary" onclick="LicensesModule.page(-1)">← Prev</button>` : ''}
                    ${data.page < data.pages ? `<button class="btn btn-sm btn-secondary" onclick="LicensesModule.page(1)">Next →</button>` : ''}</div>
            </div>`;
    },
    filter(form) {
        const f = new FormData(form);
        Object.assign(this.state, { search: String(f.get('search') || '').trim(), status: f.get('status') || '', software: f.get('software') || '', page: 1 });
        App.navigateTo('licenses');
    },
    page(d) { this.state.page = Math.max(1, this.state.page + d); App.navigateTo('licenses'); },

    async open(id) {
        const modal = document.getElementById('cat-modal');
        const body = document.getElementById('lic-modal-body');
        modal.style.display = 'flex';
        body.innerHTML = '<p>Loading…</p>';
        try {
            const { license: l, payments } = await API.get(`/api/admin/licensing/licenses/${encodeURIComponent(id)}`);
            document.getElementById('lic-modal-title').textContent = `${l.softwareTitle} · ${l.planName}`;
            const devs = (l.devices || []).map((d) => `<tr><td>${LicAdmin.esc(d.deviceName || 'Unnamed')}<small class="cat-muted">${LicAdmin.esc(d.deviceHash)}</small></td>
                <td>${LicAdmin.esc(d.appVersion || '—')}</td><td>${LicAdmin.dateTime(d.activatedAt)}</td><td>${LicAdmin.dateTime(d.lastSeenAt)}</td>
                <td><button class="btn btn-sm btn-outline-danger" onclick="LicensesModule.act('${LicAdmin.esc(l._id)}', { action: 'remove_device', deviceHash: '${LicAdmin.esc(d.deviceHash)}' }, 'Remove this computer? The app on it will lock until the key is entered again.')">Remove</button></td></tr>`).join('')
                || '<tr><td colspan="5" class="cat-muted">Not activated on any computer yet.</td></tr>';
            const pays = (payments || []).map((g) => `<tr><td>${LicAdmin.dateTime(g.date)}<small class="cat-muted">${g.renewal ? 'Renewal' : 'Purchase'} · ${LicAdmin.esc(g.variantName)}</small></td>
                <td>${LicAdmin.esc(g.txnid)}<small class="cat-muted">${LicAdmin.esc(g.status)}</small></td><td>${LicAdmin.gstCells(g)}</td><td>${LicAdmin.esc(g.posState || '—')}</td></tr>`).join('')
                || '<tr><td colspan="4" class="cat-muted">No payments (issued manually).</td></tr>';
            const lid = LicAdmin.esc(l._id);
            body.innerHTML = `
                <div class="lic-detail">
                    <div><span class="cat-label">Key</span><code class="lic-key" id="lic-key-${lid}">${LicAdmin.esc(l.keyMasked)}</code>
                        <button class="btn btn-sm btn-secondary" onclick="LicensesModule.reveal('${lid}')">Show key</button></div>
                    <div><span class="cat-label">Status</span>${this.badge(l.status)} ${l.revokedReason ? `<small class="cat-muted">${LicAdmin.esc(l.revokedReason)}</small>` : ''}</div>
                    <div><span class="cat-label">Buyer</span>${LicAdmin.esc(l.buyerName || '')} &lt;${LicAdmin.esc(l.email)}&gt;</div>
                    <div><span class="cat-label">Expires</span>${l.expiresAt ? LicAdmin.dateTime(l.expiresAt) : 'Lifetime'}</div>
                    <div><span class="cat-label">Devices</span>${LicAdmin.esc(l.devicesUsed)} of ${LicAdmin.esc(l.maxDevices)}</div>
                    <div><span class="cat-label">Last checked</span>${LicAdmin.dateTime(l.lastValidatedAt)}</div>
                </div>
                <div class="lic-actions">
                    <form onsubmit="event.preventDefault(); LicensesModule.act('${lid}', { action: 'extend', days: this.days.value })">
                        <label class="cat-label">Extend by <input type="number" name="days" min="1" max="3650" value="30" style="width:90px"> days</label>
                        <button class="btn btn-sm btn-primary">Extend</button>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="LicensesModule.act('${lid}', { action: 'extend', lifetime: true }, 'Make this key never expire?')">Make lifetime</button>
                    </form>
                    <form onsubmit="event.preventDefault(); LicensesModule.act('${lid}', { action: 'update', maxDevices: this.max.value })">
                        <label class="cat-label">Max devices <input type="number" name="max" min="1" max="1000" value="${LicAdmin.esc(l.maxDevices)}" style="width:80px"></label>
                        <button class="btn btn-sm btn-secondary">Save</button>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="LicensesModule.act('${lid}', { action: 'reset_devices' }, 'Remove ALL computers from this key? Each will need the key entered again.')">Reset devices</button>
                    </form>
                    <div>${l.revoked
                        ? `<button class="btn btn-sm btn-primary" onclick="LicensesModule.act('${lid}', { action: 'unrevoke' }, 'Re-enable this key?')">Un-revoke</button>`
                        : `<button class="btn btn-sm btn-outline-danger" onclick="LicensesModule.revoke('${lid}')">Revoke key</button>`}</div>
                </div>
                <h4 class="lic-sub">Computers</h4>
                <table class="data-table lic-light"><thead><tr><th>Computer</th><th>App version</th><th>Activated</th><th>Last seen</th><th></th></tr></thead><tbody>${devs}</tbody></table>
                <h4 class="lic-sub">Payments &amp; GST</h4>
                <table class="data-table lic-light"><thead><tr><th>Date</th><th>Transaction</th><th>Amount &amp; GST</th><th>Place of supply</th></tr></thead><tbody>${pays}</tbody></table>
                <h4 class="lic-sub">Notes</h4>
                <form onsubmit="event.preventDefault(); LicensesModule.act('${lid}', { action: 'update', notes: this.notes.value })">
                    <textarea name="notes" rows="2" maxlength="1000">${LicAdmin.esc(l.notes || '')}</textarea>
                    <button class="btn btn-sm btn-secondary" style="margin-top:6px">Save notes</button></form>
                <div id="lic-msg" class="cat-error" role="alert"></div>`;
        } catch (e) {
            body.innerHTML = `<div class="cat-error">${LicAdmin.esc(e.message)}</div>`;
        }
    },
    async reveal(id) {
        try {
            const r = await API.get(`/api/admin/licensing/licenses/${encodeURIComponent(id)}/key`);
            const el = document.getElementById(`lic-key-${id}`);
            if (el) el.textContent = r.key;
        } catch (e) { alert(e.message); }
    },
    revoke(id) {
        const reason = prompt('Revoke this key? The app will lock on its next check.\n\nReason (kept for your records, e.g. "refunded"):');
        if (reason === null) return;
        this.act(id, { action: 'revoke', reason });
    },
    async act(id, body, confirmText) {
        if (confirmText && !confirm(confirmText)) return;
        try {
            await API.patch(`/api/admin/licensing/licenses/${encodeURIComponent(id)}`, body);
            await this.open(id);
        } catch (e) {
            const m = document.getElementById('lic-msg');
            if (m) m.textContent = e.message; else alert(e.message);
        }
    },

    async renderTrials() {
        const p = new URLSearchParams();
        if (this.state.software) p.set('software', this.state.software);
        let data;
        try { data = await API.get(`/api/admin/licensing/trials?${p}`); } catch (e) { return `<div class="cat-error">${LicAdmin.esc(e.message)}</div>`; }
        const rows = (data.trials || []).map((t) => `<tr>
            <td>${LicAdmin.esc(t.software)}</td>
            <td>${LicAdmin.esc(t.deviceName || 'Unnamed')}<small class="cat-muted">${LicAdmin.esc(t.device)}</small></td>
            <td>${LicAdmin.dateTime(t.startedAt)}</td><td>${LicAdmin.dateTime(t.expiresAt)}</td>
            <td>${t.active ? this.badge('trial') : this.badge('expired')}</td>
            <td>${LicAdmin.esc(t.checks || 0)}<small class="cat-muted">last ${LicAdmin.dateTime(t.lastSeenAt)}</small></td>
            <td class="cat-actions"><button class="btn btn-sm btn-secondary" title="Lets this computer start a new trial" onclick="LicensesModule.resetTrial('${LicAdmin.esc(t._id)}')">Allow new trial</button></td></tr>`).join('')
            || '<tr><td colspan="7" class="cat-empty">No trials started yet.</td></tr>';
        return `
            <form class="cat-inline-form" onsubmit="event.preventDefault(); LicensesModule.state.software = this.software.value; App.navigateTo('licenses')">
                <select name="software" class="cat-inline" aria-label="Software">${this.swOptions(this.state.software)}</select>
                <button class="btn btn-primary">Filter</button>
                <span class="cat-muted">${LicAdmin.esc(data.total)} trial(s) · ${LicAdmin.esc(data.active)} running now</span>
            </form>
            <div class="card cat-card"><div class="table-responsive"><table class="data-table cat-table">
                <thead><tr><th>Software</th><th>Computer</th><th>Started</th><th>Ends</th><th>Status</th><th>Checks</th><th></th></tr></thead>
                <tbody>${rows}</tbody></table></div>
                <p class="cat-help">Each computer gets one trial per product (by an anonymous device fingerprint). Reinstalling the app doesn't start a new trial.</p></div>`;
    },
    async resetTrial(id) {
        if (!confirm('Allow this computer to start a fresh trial?')) return;
        try { await API.delete(`/api/admin/licensing/trials/${encodeURIComponent(id)}`); App.navigateTo('licenses'); } catch (e) { alert(e.message); }
    },

    renderIssue() {
        return `
            <div class="card cat-card lic-issue">
                <p class="cat-help">Use this for offline payments, replacements or giveaways. The key is shown once here and is not emailed automatically — copy it and send it to the customer. No invoice is created.</p>
                <form id="lic-issue-form" onsubmit="event.preventDefault(); LicensesModule.issue(this)">
                    <div class="lic-issue-grid">
                        <label>Software<select name="softwareId" required onchange="LicensesModule.fillPlans(this.value)">${this.swOptions('', { all: false })}</select></label>
                        <label>Plan<select name="planId" id="lic-issue-plan"><option value="">— choose software first —</option></select></label>
                        <label>Customer email<input type="email" name="email" required maxlength="160"></label>
                        <label>Customer name<input type="text" name="name" maxlength="120"></label>
                        <label>Override length (days)<input type="number" name="days" min="1" max="3650" placeholder="use the plan"></label>
                        <label class="cat-switch"><input type="checkbox" name="lifetime"> Lifetime (never expires)</label>
                        <label>Devices<input type="number" name="maxDevices" min="1" max="1000" placeholder="use the plan"></label>
                        <label>Notes<input type="text" name="notes" maxlength="1000" placeholder="e.g. paid by bank transfer"></label>
                    </div>
                    <button class="btn btn-primary" type="submit">Issue key</button>
                </form>
                <div id="lic-issue-result" role="status"></div>
            </div>`;
    },
    fillPlans(swId) {
        const s = this.softwares.find((x) => x._id === swId);
        const sel = document.getElementById('lic-issue-plan');
        sel.innerHTML = '<option value="">No plan (set days or lifetime)</option>' + ((s && s.plans) || [])
            .map((p) => `<option value="${LicAdmin.esc(p._id)}">${LicAdmin.esc(p.name)} — ${LicAdmin.esc(p.billing)}, ${LicAdmin.esc(p.maxDevices)} device(s)</option>`).join('');
    },
    async issue(form) {
        const f = new FormData(form);
        const out = document.getElementById('lic-issue-result');
        const body = {
            softwareId: f.get('softwareId'), planId: f.get('planId') || undefined, email: f.get('email'), name: f.get('name'),
            days: f.get('days') || undefined, lifetime: f.get('lifetime') === 'on', maxDevices: f.get('maxDevices') || undefined, notes: f.get('notes'),
        };
        try {
            const r = await API.post('/api/admin/licensing/licenses', body);
            out.innerHTML = `<div class="lic-issued"><strong>Key issued — copy it now:</strong> <code class="lic-key">${LicAdmin.esc(r.key)}</code>
                <small>${LicAdmin.esc(r.license.softwareTitle)} · ${LicAdmin.esc(r.license.planName)} · ${r.license.expiresAt ? 'until ' + LicAdmin.date(r.license.expiresAt) : 'lifetime'} · ${LicAdmin.esc(r.license.maxDevices)} device(s)</small></div>`;
            form.reset();
        } catch (e) {
            out.innerHTML = `<div class="cat-error">${LicAdmin.esc(e.message)}</div>`;
        }
    },
};

// =========================================================================================
window.ServiceOrdersModule = {
    state: { status: '', search: '', page: 1 },
    LABELS: { paid: 'Paid — to schedule', in_progress: 'In progress', delivered: 'Delivered', closed: 'Closed' },

    async render() {
        const p = new URLSearchParams();
        const s = this.state;
        if (s.status) p.set('status', s.status);
        if (s.search) p.set('search', s.search);
        const csvQuery = p.toString();
        p.set('page', s.page);
        let data;
        try { data = await API.get(`/api/admin/licensing/service-orders?${p}`); } catch (e) { return `<div class="cat-error">${LicAdmin.esc(e.message)}</div>`; }
        const counts = data.counts || {};
        const chips = [['', 'All'], ...Object.entries(this.LABELS)].map(([v, l]) =>
            `<button class="cat-tab ${s.status === v ? 'active' : ''}" onclick="ServiceOrdersModule.setStatus('${v}')">${l}${v ? ` (${counts[v] || 0})` : ''}</button>`).join('');
        const rows = (data.orders || []).map((o) => `<tr>
            <td><strong>${LicAdmin.esc(o.orderNo)}</strong><small class="cat-muted">${LicAdmin.dateTime(o.createdAt)}</small></td>
            <td>${LicAdmin.esc(o.serviceTitle)}<small class="cat-muted">${LicAdmin.esc(o.packageName || '')}${o.deliveryTime ? ' · ' + LicAdmin.esc(o.deliveryTime) : ''}</small></td>
            <td>${LicAdmin.esc(o.buyerName || '')}<small class="cat-muted">${LicAdmin.esc(o.buyerEmail)}${o.buyerPhone ? ' · ' + LicAdmin.esc(o.buyerPhone) : ''}</small></td>
            <td>${LicAdmin.gstCells(o.gst || { amount: o.amount, invoiceNo: o.invoiceNo })}</td>
            <td><select class="cat-inline" aria-label="Order status" onchange="ServiceOrdersModule.update('${LicAdmin.esc(o._id)}', { status: this.value })">
                ${Object.entries(this.LABELS).map(([v, l]) => `<option value="${v}" ${o.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
            <td><textarea class="lic-notes" rows="2" maxlength="2000" aria-label="Internal notes" placeholder="Internal notes" onchange="ServiceOrdersModule.update('${LicAdmin.esc(o._id)}', { adminNotes: this.value })">${LicAdmin.esc(o.adminNotes || '')}</textarea></td>
        </tr>`).join('') || '<tr><td colspan="6" class="cat-empty">No paid service orders yet. They appear here when someone buys a fixed-price service or package.</td></tr>';
        return `
            <div class="cat-header"><div><h2>Service orders</h2>
                <p>Paid service orders. Contact the buyer to schedule, then move the order along: Paid → In progress → Delivered / Closed. Quote requests stay in Contact Inquiries.</p></div></div>
            <div class="cat-tabs">${chips}</div>
            <form class="cat-inline-form" onsubmit="event.preventDefault(); ServiceOrdersModule.state.search = this.search.value.trim(); ServiceOrdersModule.state.page = 1; App.navigateTo('service-orders')">
                <input type="search" name="search" placeholder="Order no, email, name or service" value="${LicAdmin.esc(s.search)}" aria-label="Search orders">
                <button class="btn btn-primary">Search</button>
                <button class="btn btn-secondary" type="button" onclick="LicAdmin.downloadCsv('/api/admin/licensing/service-orders.csv?${LicAdmin.esc(csvQuery)}', 'service-orders.csv')">Export CSV (with GST)</button>
            </form>
            <div class="card cat-card"><div class="table-responsive"><table class="data-table cat-table lic-table">
                <thead><tr><th>Order</th><th>Service</th><th>Buyer</th><th>Amount &amp; GST</th><th>Status</th><th>Notes</th></tr></thead>
                <tbody>${rows}</tbody></table></div>
                <div class="lic-pager"><span class="cat-muted">${LicAdmin.esc(data.total)} order(s)</span>
                    ${data.page > 1 ? `<button class="btn btn-sm btn-secondary" onclick="ServiceOrdersModule.page(-1)">← Prev</button>` : ''}
                    ${data.page < data.pages ? `<button class="btn btn-sm btn-secondary" onclick="ServiceOrdersModule.page(1)">Next →</button>` : ''}</div>
                <p class="cat-help" id="so-msg" role="status"></p></div>`;
    },
    setStatus(v) { this.state.status = v; this.state.page = 1; App.navigateTo('service-orders'); },
    page(d) { this.state.page = Math.max(1, this.state.page + d); App.navigateTo('service-orders'); },
    async update(id, body) {
        const m = document.getElementById('so-msg');
        try {
            await API.patch(`/api/admin/licensing/service-orders/${encodeURIComponent(id)}`, body);
            if (body.status) { App.navigateTo('service-orders'); return; } // refresh the counts
            if (m) m.textContent = '✓ Saved';
        } catch (e) {
            if (m) m.textContent = '✗ ' + e.message;
        }
    },
};
