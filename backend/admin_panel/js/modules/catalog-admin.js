/**
 * Shared admin UI for catalog items (software products and services):
 * list with order / visibility / featured controls + a create/edit form.
 * Every value from the database is escaped before it is put into HTML.
 */
window.CatalogAdmin = {
    esc(v) { return Helpers.escapeHtml(v); },

    PRICING_LABELS: {
        one_time: 'One-time price',
        subscription_monthly: 'Subscription (per month)',
        subscription_yearly: 'Subscription (per year)',
        starting_from: 'Starting from',
        fixed: 'Fixed price',
        quote: 'Contact for quote',
    },
    CTA_LABELS: { buy: 'Buy now', demo: 'Request demo', enquire: 'Enquire', book_call: 'Book a call', quote: 'Get a quote' },

    priceSummary(item, priceField) {
        const p = Number(item[priceField]) || 0;
        const d = Number(item.discountedPrice) || 0;
        const fmt = (n) => '₹' + n.toLocaleString('en-IN');
        switch (item.pricingType) {
            case 'quote': return 'Quote';
            case 'subscription_monthly': return `${fmt(d && d < p ? d : p)}/mo`;
            case 'subscription_yearly': return `${fmt(d && d < p ? d : p)}/yr`;
            case 'starting_from': return `From ${fmt(d && d < p ? d : p)}`;
            default: return p ? fmt(d && d < p ? d : p) : '—';
        }
    },

    field(f, value) {
        const id = `cat-f-${f.name}`;
        const v = value === undefined || value === null ? '' : value;
        const label = `<label for="${id}" class="cat-label">${this.esc(f.label)}${f.required ? ' *' : ''}</label>`;
        const help = f.help ? `<small class="cat-help">${this.esc(f.help)}</small>` : '';
        switch (f.type) {
            case 'textarea':
            case 'list':
            case 'steps':
            case 'images':
                return `<div class="cat-field ${f.wide ? 'cat-wide' : ''}">${label}
                    <textarea id="${id}" name="${f.name}" rows="${f.rows || 4}" placeholder="${this.esc(f.placeholder || '')}">${this.esc(v)}</textarea>
                    ${f.type === 'images' ? `<div class="cat-upload"><input type="file" accept="image/*" id="${id}-file" onchange="CatalogAdmin.uploadImage(this, '${id}', true)"><span id="${id}-status" class="cat-help"></span></div>` : ''}
                    ${help}</div>`;
            case 'select':
                return `<div class="cat-field">${label}<select id="${id}" name="${f.name}">
                    ${f.options.map(([val, lab]) => `<option value="${this.esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${this.esc(lab)}</option>`).join('')}
                    </select>${help}</div>`;
            case 'checkbox':
                return `<div class="cat-field cat-check"><label><input type="checkbox" id="${id}" name="${f.name}" ${v ? 'checked' : ''}> ${this.esc(f.label)}</label>${help}</div>`;
            case 'image':
                return `<div class="cat-field">${label}
                    <input type="text" id="${id}" name="${f.name}" value="${this.esc(v)}" placeholder="https://… or upload">
                    <div class="cat-upload"><input type="file" accept="image/*" id="${id}-file" onchange="CatalogAdmin.uploadImage(this, '${id}', false)"><span id="${id}-status" class="cat-help"></span></div>
                    ${help}</div>`;
            default:
                return `<div class="cat-field ${f.wide ? 'cat-wide' : ''}">${label}
                    <input type="${f.type === 'number' ? 'number' : 'text'}" id="${id}" name="${f.name}" value="${this.esc(v)}"
                        ${f.type === 'number' ? `min="${f.min ?? 0}" max="${f.max ?? ''}" step="${f.step || 1}"` : ''}
                        ${f.maxlength ? `maxlength="${f.maxlength}"` : ''} ${f.name === 'category' ? 'list="cat-category-options" autocomplete="off"' : ''} placeholder="${this.esc(f.placeholder || '')}" ${f.required ? 'required' : ''}>
                    ${help}</div>`;
        }
    },

    valueFor(f, item) {
        const v = item ? item[f.name] : undefined;
        if (f.type === 'list' || f.type === 'images') return (v || []).join('\n');
        if (f.type === 'steps') return (v || []).map((s) => s.description ? `${s.title} | ${s.description}` : s.title).join('\n');
        if (v === undefined) return f.default ?? '';
        return v;
    },

    readForm(cfg) {
        const out = {};
        for (const f of cfg.fields) {
            const el = document.getElementById(`cat-f-${f.name}`);
            if (!el) continue;
            if (f.type === 'checkbox') out[f.name] = el.checked;
            else if (f.type === 'list' || f.type === 'images') out[f.name] = el.value.split('\n').map((s) => s.trim()).filter(Boolean);
            else if (f.type === 'steps') {
                out[f.name] = el.value.split('\n').map((line) => {
                    const [title, ...rest] = line.split('|');
                    return { title: (title || '').trim(), description: rest.join('|').trim() };
                }).filter((s) => s.title);
            } else out[f.name] = el.value.trim();
        }
        return out;
    },

    async uploadImage(input, targetId, append) {
        const file = input.files[0];
        if (!file) return;
        const status = document.getElementById(`${targetId}-status`);
        if (status) status.textContent = 'Uploading…';
        try {
            const fd = new FormData();
            fd.append('thumbnail', file);
            const token = localStorage.getItem('adminToken');
            const res = await fetch('/api/upload/thumbnail', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || `Upload failed (${res.status})`);
            const url = data.url || data.downloadUrl;
            const target = document.getElementById(targetId);
            if (append) target.value = (target.value.trim() ? target.value.trim() + '\n' : '') + url;
            else target.value = url;
            if (status) status.textContent = '✓ Uploaded';
        } catch (err) {
            if (status) status.textContent = '✗ ' + err.message;
        }
    },

    /** Table + modal markup for one catalog kind. */
    renderList(cfg, items, categories) {
        const rows = items.length === 0
            ? `<tr><td colspan="8" class="cat-empty">Nothing here yet. Click <strong>${this.esc(cfg.addLabel)}</strong> to add your first one.</td></tr>`
            : items.map((item, idx) => `
                <tr>
                    <td class="cat-order">
                        <button class="cat-icon-btn" title="Move up" aria-label="Move up" ${idx === 0 ? 'disabled' : ''} onclick="CatalogAdmin.move('${cfg.kind}', ${idx}, -1)">▲</button>
                        <span>${idx + 1}</span>
                        <button class="cat-icon-btn" title="Move down" aria-label="Move down" ${idx === items.length - 1 ? 'disabled' : ''} onclick="CatalogAdmin.move('${cfg.kind}', ${idx}, 1)">▼</button>
                    </td>
                    <td><div class="cat-name">
                        ${item.thumbnail ? `<img src="${this.esc(Helpers.getMediaUrl(item.thumbnail))}" alt="" loading="lazy">` : '<span class="cat-noimg"></span>'}
                        <div><strong>${this.esc(item.title)}</strong><small>/${cfg.publicPath}/${this.esc(item.slug || item._id)}</small></div>
                    </div></td>
                    <td>${item.category ? this.esc(item.category) : '<span class="cat-muted">—</span>'}</td>
                    <td>${this.esc(this.priceSummary(item, cfg.priceField))}</td>
                    <td>${this.esc(this.CTA_LABELS[item.ctaType] || item.ctaType || '—')}</td>
                    <td>
                        <select class="cat-inline" aria-label="Visibility" onchange="CatalogAdmin.quickUpdate('${cfg.kind}', '${item._id}', { status: this.value })">
                            <option value="active" ${item.status === 'active' ? 'selected' : ''}>Visible</option>
                            <option value="draft" ${item.status === 'draft' ? 'selected' : ''}>Hidden (draft)</option>
                            <option value="archived" ${item.status === 'archived' ? 'selected' : ''}>Archived</option>
                        </select>
                    </td>
                    <td><label class="cat-switch"><input type="checkbox" ${item.isFeatured ? 'checked' : ''} onchange="CatalogAdmin.quickUpdate('${cfg.kind}', '${item._id}', { isFeatured: this.checked })"> Featured</label></td>
                    <td class="cat-actions">
                        ${item.status === 'active' ? `<a class="btn btn-sm btn-secondary" target="_blank" rel="noopener" href="/${cfg.publicPath}/${encodeURIComponent(item.slug || item._id)}">View</a>` : ''}
                        <button class="btn btn-sm btn-secondary" onclick="CatalogAdmin.openForm('${cfg.kind}', '${item._id}')">Edit</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="CatalogAdmin.remove('${cfg.kind}', '${item._id}')">Delete</button>
                    </td>
                </tr>`).join('');

        return `
            <div class="cat-header">
                <div>
                    <h2>${this.esc(cfg.heading)}</h2>
                    <p>${this.esc(cfg.subheading)}</p>
                </div>
                <div class="cat-header-actions">
                    ${cfg.extraButtons || ''}
                    <button class="btn btn-secondary" onclick="App.navigateTo('categories')">Manage categories</button>
                    <button class="btn btn-primary" id="cat-add-btn" onclick="CatalogAdmin.openForm('${cfg.kind}')">${this.esc(cfg.addLabel)}</button>
                </div>
            </div>
            <div class="card cat-card">
                <div class="table-responsive">
                    <table class="data-table cat-table">
                        <thead><tr><th>Order</th><th>Name</th><th>Category</th><th>Price</th><th>Button</th><th>Visibility</th><th>Landing</th><th></th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <p class="cat-help" style="margin-top:.75rem;">Order: ▲/▼ sets the order on the public pages. “Featured” items are shown on the home page (if none are featured, the first three are shown). Hidden items never appear publicly.</p>
            </div>
            <div id="cat-modal" class="cat-modal" role="dialog" aria-modal="true" aria-labelledby="cat-modal-title" style="display:none;">
                <div class="cat-modal-card">
                    <div class="cat-modal-head">
                        <h3 id="cat-modal-title"></h3>
                        <button type="button" class="cat-icon-btn" aria-label="Close" onclick="CatalogAdmin.closeForm()">✕</button>
                    </div>
                    <form id="cat-form" novalidate></form>
                </div>
            </div>
            <datalist id="cat-category-options">${(categories || []).map((c) => `<option value="${this.esc(c)}"></option>`).join('')}</datalist>`;
    },

    configs: {},
    items: {},

    register(cfg) { this.configs[cfg.kind] = cfg; },

    async load(kind) {
        const cfg = this.configs[kind];
        const [res, cats] = await Promise.all([
            API.get(cfg.endpoint),
            API.get(`/api/admin/catalog/categories?kind=${cfg.categoryKind}`).catch(() => ({ categories: [], unmanaged: {} })),
        ]);
        const items = res[cfg.listKey] || [];
        this.items[kind] = items;
        const names = [...(cats.categories || []).map((c) => c.name), ...((cats.unmanaged || {})[cfg.categoryKind] || [])];
        return { items, categories: names };
    },

    openForm(kind, id = null) {
        const cfg = this.configs[kind];
        const item = id ? (this.items[kind] || []).find((x) => x._id === id) : null;
        const form = document.getElementById('cat-form');
        document.getElementById('cat-modal-title').textContent = item ? `Edit: ${item.title}` : cfg.addLabel;
        form.innerHTML = `
            <div class="cat-grid">
                ${cfg.fields.map((f) => this.field(f, this.valueFor(f, item))).join('')}
            </div>
            ${cfg.formExtra ? cfg.formExtra(item) : ''}
            <div id="cat-form-error" class="cat-error" role="alert"></div>
            <div class="cat-modal-foot">
                <button type="button" class="btn btn-secondary" onclick="CatalogAdmin.closeForm()">Cancel</button>
                <button type="submit" class="btn btn-primary" id="cat-save-btn">${item ? 'Save changes' : 'Create'}</button>
            </div>`;
        form.onsubmit = (e) => { e.preventDefault(); this.save(kind, id); };
        if (cfg.afterOpen) cfg.afterOpen(item);
        document.getElementById('cat-modal').style.display = 'flex';
        document.getElementById('cat-f-title')?.focus();
    },

    closeForm() {
        const m = document.getElementById('cat-modal');
        if (m) m.style.display = 'none';
    },

    async save(kind, id) {
        const cfg = this.configs[kind];
        const payload = { ...this.readForm(cfg), ...(cfg.extraPayload ? cfg.extraPayload() : {}) };
        const errEl = document.getElementById('cat-form-error');
        const btn = document.getElementById('cat-save-btn');
        errEl.textContent = '';
        btn.disabled = true;
        try {
            if (id) await API.put(`${cfg.endpoint}/${id}`, payload);
            else await API.post(cfg.endpoint, payload);
            this.closeForm();
            App.navigateTo(cfg.view);
        } catch (err) {
            errEl.textContent = err.message || 'Could not save.';
        } finally {
            btn.disabled = false;
        }
    },

    async quickUpdate(kind, id, patch) {
        const cfg = this.configs[kind];
        try {
            await API.put(`${cfg.endpoint}/${id}`, patch);
            const it = (this.items[kind] || []).find((x) => x._id === id);
            if (it) Object.assign(it, patch);
        } catch (err) {
            alert('Could not update: ' + err.message);
            App.navigateTo(cfg.view);
        }
    },

    async move(kind, idx, dir) {
        const cfg = this.configs[kind];
        const list = [...(this.items[kind] || [])];
        const j = idx + dir;
        if (j < 0 || j >= list.length) return;
        [list[idx], list[j]] = [list[j], list[idx]];
        try {
            // Re-number everything so the order is explicit (1, 2, 3 …)
            await Promise.all(list.map((it, i) => (it.order === i + 1 ? null : API.put(`${cfg.endpoint}/${it._id}`, { order: i + 1 }))));
        } catch (err) {
            alert('Could not reorder: ' + err.message);
        }
        App.navigateTo(cfg.view);
    },

    async remove(kind, id) {
        const cfg = this.configs[kind];
        if (!confirm('Delete this permanently? (Tip: set Visibility to “Hidden” to keep it but remove it from the site.)')) return;
        try {
            await API.delete(`${cfg.endpoint}/${id}`);
            App.navigateTo(cfg.view);
        } catch (err) {
            alert('Could not delete: ' + err.message);
        }
    },
};

CatalogAdmin.register({
    kind: 'software',
    view: 'software',
    endpoint: '/api/admin/software',
    listKey: 'softwares',
    categoryKind: 'software',
    publicPath: 'software',
    priceField: 'price',
    heading: 'Software products',
    subheading: 'Add, edit, reorder and hide the software you sell. Changes appear on /software and the home page immediately.',
    addLabel: '+ Add software',
    // Paid download package (kept private; only buyers/admin can download it)
    formExtra: (item) => `
        ${SoftwareVersions.section(item)}
        <fieldset class="cat-fieldset"><legend>Single download package (older method, optional, private)</legend>
            <small class="cat-help" style="margin:0 0 6px">Used only while no versions are uploaded above. Buyers download it from their dashboard.</small>
            <input type="file" id="sw-package-file" onchange="SoftwareModule.handleFileUpload(event)">
            <div id="sw-upload-status" class="cat-help">${item && item.fileName ? `Current package: <strong>${CatalogAdmin.esc(item.fileName)}</strong> (${CatalogAdmin.esc(item.fileSize || 'on server')})` : ''}</div>
            <input type="hidden" id="sw-download-url" value="${CatalogAdmin.esc(item?.downloadUrl || '')}">
            <input type="hidden" id="sw-file-name" value="${CatalogAdmin.esc(item?.fileName || '')}">
            <input type="hidden" id="sw-file-size" value="${CatalogAdmin.esc(item?.fileSize || '')}">
        </fieldset>
        ${LicAdmin.softwareExtra(item)}`,
    extraPayload: () => ({
        downloadUrl: document.getElementById('sw-download-url')?.value || '',
        fileName: document.getElementById('sw-file-name')?.value || '',
        fileSize: document.getElementById('sw-file-size')?.value || '',
        ...LicAdmin.softwareRead(),
        ...SoftwareVersions.read(),
    }),
    afterOpen: (item) => SoftwareVersions.mount(item),
    fields: [
        { name: 'title', label: 'Name', required: true, maxlength: 120 },
        { name: 'slug', label: 'URL slug', placeholder: 'auto from name', help: 'Page address: /software/<slug>. Leave empty to generate.' },
        { name: 'tagline', label: 'Tagline', wide: true, maxlength: 160, placeholder: 'One line: what it does and for whom' },
        { name: 'description', label: 'Description (Markdown)', type: 'textarea', wide: true, rows: 8, help: 'Supports ## headings, **bold**, - bullet lists, [links](https://…) and blank lines between paragraphs.' },
        { name: 'features', label: 'Features (one per line)', type: 'list', wide: true, rows: 5 },
        { name: 'thumbnail', label: 'Cover image', type: 'image' },
        { name: 'images', label: 'Screenshots (one URL per line)', type: 'images', rows: 3 },
        { name: 'pricingType', label: 'Pricing type', type: 'select', default: 'one_time', options: [['one_time', 'One-time price'], ['subscription_monthly', 'Subscription — per month'], ['subscription_yearly', 'Subscription — per year'], ['starting_from', 'Starting from'], ['quote', 'Contact for quote']] },
        { name: 'price', label: 'Price (₹)', type: 'number', min: 0, step: 1, help: 'Shown as the headline price. Not needed when you sell licence plans (set them below). Ignored for “Contact for quote”.' },
        { name: 'discountedPrice', label: 'Offer price (optional)', type: 'number', min: 0, step: 1, help: 'Only if you really sell it lower than the price above.' },
        { name: 'ctaType', label: 'Main button', type: 'select', default: 'enquire', options: [['buy', 'Buy now'], ['demo', 'Request demo'], ['enquire', 'Enquire']], help: 'Used when online licensing (below) is off: “Buy now” then opens the enquiry form with this product preselected. With licensing on, the page shows your plans with Buy buttons and a free-trial button.' },
        { name: 'demoUrl', label: 'Demo link (optional)', placeholder: 'https://…' },
        { name: 'documentationUrl', label: 'Docs link (optional)', placeholder: 'https://…' },
        { name: 'category', label: 'Category', placeholder: 'Pick or type', help: 'Manage the list under Categories.' },
        { name: 'highlightBadge', label: 'Badge (optional)', maxlength: 30, placeholder: 'e.g. New' },
        { name: 'version', label: 'Version (optional)', maxlength: 30 },
        { name: 'order', label: 'Order', type: 'number', min: 0, max: 999, help: 'Lower numbers show first (or use ▲/▼ in the list).' },
        { name: 'status', label: 'Visibility', type: 'select', default: 'active', options: [['active', 'Visible on the site'], ['draft', 'Hidden (draft)'], ['archived', 'Archived']] },
        { name: 'isFeatured', label: 'Feature on the home page', type: 'checkbox' },
    ],
});

CatalogAdmin.register({
    kind: 'service',
    view: 'services',
    endpoint: '/api/admin/services',
    listKey: 'services',
    categoryKind: 'service',
    publicPath: 'services',
    priceField: 'startingPrice',
    heading: 'Services',
    subheading: 'Business administration, automation, custom software — add, edit, reorder and hide your services. Changes appear on /services and the home page immediately.',
    addLabel: '+ Add service',
    formExtra: (item) => LicAdmin.serviceExtra(item),
    extraPayload: () => LicAdmin.serviceRead(),
    fields: [
        { name: 'title', label: 'Name', required: true, maxlength: 120 },
        { name: 'slug', label: 'URL slug', placeholder: 'auto from name', help: 'Page address: /services/<slug>. Leave empty to generate.' },
        { name: 'summary', label: 'Summary', wide: true, maxlength: 240, placeholder: 'One or two sentences shown on cards' },
        { name: 'description', label: 'Description (Markdown)', type: 'textarea', wide: true, rows: 8, help: 'Supports ## headings, **bold**, - bullet lists, [links](https://…) and blank lines between paragraphs.' },
        { name: 'deliverables', label: 'Deliverables (one per line)', type: 'list', wide: true, rows: 5 },
        { name: 'processSteps', label: 'Process steps (one per line: Title | short description)', type: 'steps', wide: true, rows: 5, placeholder: 'Discovery call | We understand your workflow\nProposal | Scope, timeline and price\nBuild | …' },
        { name: 'pricingType', label: 'Pricing type', type: 'select', default: 'quote', options: [['fixed', 'Fixed price'], ['starting_from', 'Starting from'], ['quote', 'Quote on request']] },
        { name: 'startingPrice', label: 'Price (₹)', type: 'number', min: 0, step: 1, help: 'The “Buy now” price for a fixed-price service without packages. Ignored for quote-only services.' },
        { name: 'ctaType', label: 'Main button', type: 'select', default: 'enquire', options: [['book_call', 'Book a call'], ['quote', 'Get a quote'], ['enquire', 'Enquire']] },
        { name: 'icon', label: 'Icon', type: 'select', default: 'briefcase', options: [['briefcase', 'Briefcase (administration)'], ['automation', 'Automation'], ['code', 'Code (custom software)'], ['chart', 'Chart (growth)'], ['support', 'Support'], ['cloud', 'Cloud'], ['document', 'Document'], ['spark', 'Spark']] },
        { name: 'thumbnail', label: 'Image (optional)', type: 'image' },
        { name: 'category', label: 'Category', placeholder: 'Pick or type' },
        { name: 'highlightBadge', label: 'Badge (optional)', maxlength: 30 },
        { name: 'order', label: 'Order', type: 'number', min: 0, max: 999 },
        { name: 'status', label: 'Visibility', type: 'select', default: 'active', options: [['active', 'Visible on the site'], ['draft', 'Hidden (draft)'], ['archived', 'Archived']] },
        { name: 'isFeatured', label: 'Feature on the home page', type: 'checkbox' },
    ],
});
