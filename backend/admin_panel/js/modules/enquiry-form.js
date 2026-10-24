// Admin → Enquiry Form: edit the "What are you looking for?" options of the
// smart business enquiry form and their follow-up questions.
window.EnquiryFormModule = {
    data: [],
    TYPES: [['text', 'Short text'], ['textarea', 'Long text'], ['select', 'Single choice'], ['multiselect', 'Multiple choice'], ['number', 'Number'], ['range', 'Slider (range)'], ['catalog', 'Software / service picker']],

    async render() {
        const esc = Helpers.escapeHtml;
        const res = await API.get('/api/admin/catalog/enquiry-categories');
        this.data = res.categories || [];
        return `
            <div class="cat-header">
                <div>
                    <h2>Business enquiry form</h2>
                    <p>Step 1 shows these options (in this order). Step 2 asks the follow-up questions of the chosen option. Answers are saved on each enquiry (Inquiries tab) and included in the email notification and CSV export.</p>
                </div>
                <div class="cat-header-actions">
                    <a class="btn btn-secondary" href="/contact" target="_blank" rel="noopener">Preview form</a>
                    <button class="btn btn-secondary" onclick="EnquiryFormModule.restore()">Restore deleted defaults</button>
                    <button class="btn btn-primary" onclick="EnquiryFormModule.edit()">+ Add option</button>
                </div>
            </div>
            <div class="card cat-card">
                <table class="data-table cat-table">
                    <thead><tr><th>Order</th><th>Option</th><th>Questions</th><th>Active</th><th></th></tr></thead>
                    <tbody>
                    ${this.data.map((c) => `
                        <tr>
                            <td>${Number(c.order) || 0}</td>
                            <td><strong>${esc(c.label)}</strong><small class="cat-muted" style="display:block;">key: ${esc(c.key)} · ${esc(c.description || '')}</small></td>
                            <td>${(c.questions || []).length}</td>
                            <td>${c.isActive ? 'Yes' : '<span class="cat-muted">Hidden</span>'}</td>
                            <td class="cat-actions">
                                <button class="btn btn-sm btn-secondary" onclick="EnquiryFormModule.edit('${c._id}')">Edit questions</button>
                                <button class="btn btn-sm btn-outline-danger" onclick="EnquiryFormModule.remove('${c._id}')">Delete</button>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
                <p class="cat-help">Lead score: each answer option can carry 0–10 points. Total ≥ 6 → high priority, ≥ 3 → medium, otherwise low. Scores are never shown to visitors.</p>
            </div>
            <div id="ef-modal" class="cat-modal" role="dialog" aria-modal="true" style="display:none;">
                <div class="cat-modal-card cat-modal-wide">
                    <div class="cat-modal-head"><h3 id="ef-title"></h3><button class="cat-icon-btn" aria-label="Close" onclick="EnquiryFormModule.close()">✕</button></div>
                    <form id="ef-form" onsubmit="EnquiryFormModule.save(event)"></form>
                </div>
            </div>`;
    },

    questionRow(q, i) {
        const esc = Helpers.escapeHtml;
        const opts = (q.options || []).map((o) => (o.score ? `${o.label} = ${o.score}` : o.label)).join('\n');
        return `
            <fieldset class="ef-q" data-i="${i}">
                <legend>Question ${i + 1}</legend>
                <div class="cat-grid">
                    <div class="cat-field cat-wide"><label class="cat-label">Question</label><input class="ef-label" value="${esc(q.label || '')}" maxlength="160" required></div>
                    <div class="cat-field"><label class="cat-label">Type</label><select class="ef-type">${this.TYPES.map(([v, l]) => `<option value="${v}" ${q.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
                    <div class="cat-field"><label class="cat-label">Key (stable id)</label><input class="ef-key" value="${esc(q.key || '')}" maxlength="40" placeholder="auto"></div>
                    <div class="cat-field cat-wide"><label class="cat-label">Options — one per line, optional score: “Label = 2”</label><textarea class="ef-options" rows="3">${esc(opts)}</textarea></div>
                    <div class="cat-field"><label class="cat-label">Picker source (for picker type)</label><select class="ef-source">${[['both', 'Software + services'], ['software', 'Software'], ['service', 'Services']].map(([v, l]) => `<option value="${v}" ${q.catalogSource === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
                    <div class="cat-field"><label class="cat-label">Placeholder</label><input class="ef-placeholder" value="${esc(q.placeholder || '')}" maxlength="160"></div>
                    <div class="cat-field"><label class="cat-label">Min / Max / Step / Unit (number, slider)</label>
                        <div style="display:flex;gap:4px;"><input class="ef-min" type="number" value="${q.min ?? ''}" aria-label="Min"><input class="ef-max" type="number" value="${q.max ?? ''}" aria-label="Max"><input class="ef-step" type="number" value="${q.step ?? ''}" aria-label="Step"><input class="ef-unit" value="${esc(q.unit || '')}" aria-label="Unit" placeholder="unit"></div></div>
                    <div class="cat-field cat-check"><label><input type="checkbox" class="ef-required" ${q.required ? 'checked' : ''}> Required</label></div>
                </div>
                <div class="ef-q-actions">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="EnquiryFormModule.moveQ(${i}, -1)">▲ Up</button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="EnquiryFormModule.moveQ(${i}, 1)">▼ Down</button>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="EnquiryFormModule.removeQ(${i})">Remove</button>
                </div>
            </fieldset>`;
    },

    edit(id = null) {
        const esc = Helpers.escapeHtml;
        const c = id ? this.data.find((x) => x._id === id) : { label: '', key: '', description: '', icon: 'spark', order: (this.data.length + 1), isActive: true, questions: [] };
        this.current = { ...c, questions: JSON.parse(JSON.stringify(c.questions || [])) };
        document.getElementById('ef-title').textContent = id ? `Edit: ${c.label}` : 'New option';
        this.paint();
        document.getElementById('ef-modal').style.display = 'flex';
    },

    paint() {
        const esc = Helpers.escapeHtml;
        const c = this.current;
        document.getElementById('ef-form').innerHTML = `
            <div class="cat-grid">
                <div class="cat-field"><label class="cat-label">Option label *</label><input id="ef-c-label" value="${esc(c.label)}" maxlength="80" required></div>
                <div class="cat-field"><label class="cat-label">Key</label><input id="ef-c-key" value="${esc(c.key)}" maxlength="40" ${c._id ? 'disabled' : ''} placeholder="auto"><small class="cat-help">Stored on leads; cannot change after creation.</small></div>
                <div class="cat-field cat-wide"><label class="cat-label">Short description</label><input id="ef-c-desc" value="${esc(c.description || '')}" maxlength="200"></div>
                <div class="cat-field"><label class="cat-label">Icon</label><select id="ef-c-icon">${['coffee', 'globe', 'spark', 'chart', 'code', 'briefcase', 'chat', 'book'].map((i) => `<option ${c.icon === i ? 'selected' : ''}>${i}</option>`).join('')}</select></div>
                <div class="cat-field"><label class="cat-label">Order</label><input id="ef-c-order" type="number" min="0" max="999" value="${Number(c.order) || 0}"></div>
                <div class="cat-field cat-check"><label><input type="checkbox" id="ef-c-active" ${c.isActive ? 'checked' : ''}> Show on the form</label></div>
            </div>
            <div id="ef-questions">${c.questions.map((q, i) => this.questionRow(q, i)).join('')}</div>
            <button type="button" class="btn btn-secondary" onclick="EnquiryFormModule.addQ()">+ Add question</button>
            <div id="ef-error" class="cat-error" role="alert"></div>
            <div class="cat-modal-foot"><button type="button" class="btn btn-secondary" onclick="EnquiryFormModule.close()">Cancel</button><button class="btn btn-primary" type="submit">Save</button></div>`;
    },

    readQuestions() {
        return [...document.querySelectorAll('#ef-questions .ef-q')].map((el) => ({
            label: el.querySelector('.ef-label').value.trim(),
            type: el.querySelector('.ef-type').value,
            key: el.querySelector('.ef-key').value.trim(),
            options: el.querySelector('.ef-options').value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
                const m = l.match(/^(.*?)\s*=\s*(\d+)$/);
                return m ? { label: m[1].trim(), score: Number(m[2]) } : { label: l, score: 0 };
            }),
            catalogSource: el.querySelector('.ef-source').value,
            placeholder: el.querySelector('.ef-placeholder').value.trim(),
            min: el.querySelector('.ef-min').value, max: el.querySelector('.ef-max').value,
            step: el.querySelector('.ef-step').value, unit: el.querySelector('.ef-unit').value.trim(),
            required: el.querySelector('.ef-required').checked,
        }));
    },

    syncHeader() {
        const c = this.current;
        c.label = document.getElementById('ef-c-label').value;
        if (!c._id) c.key = document.getElementById('ef-c-key').value;
        c.description = document.getElementById('ef-c-desc').value;
        c.icon = document.getElementById('ef-c-icon').value;
        c.order = document.getElementById('ef-c-order').value;
        c.isActive = document.getElementById('ef-c-active').checked;
        c.questions = this.readQuestions();
    },

    addQ() { this.syncHeader(); this.current.questions.push({ label: '', type: 'text', required: false, options: [] }); this.paint(); },
    removeQ(i) { this.syncHeader(); this.current.questions.splice(i, 1); this.paint(); },
    moveQ(i, d) {
        this.syncHeader();
        const q = this.current.questions; const j = i + d;
        if (j < 0 || j >= q.length) return;
        [q[i], q[j]] = [q[j], q[i]]; this.paint();
    },

    close() { document.getElementById('ef-modal').style.display = 'none'; },

    async save(e) {
        e.preventDefault();
        this.syncHeader();
        const c = this.current;
        const payload = { label: c.label, key: c.key, description: c.description, icon: c.icon, order: c.order, isActive: c.isActive, questions: c.questions };
        try {
            if (c._id) await API.put(`/api/admin/catalog/enquiry-categories/${c._id}`, payload);
            else await API.post('/api/admin/catalog/enquiry-categories', payload);
            this.close();
            App.navigateTo('enquiry-form');
        } catch (err) {
            document.getElementById('ef-error').textContent = err.message;
        }
    },

    async remove(id) {
        if (!confirm('Delete this option and its questions? Existing enquiries keep their answers.')) return;
        try { await API.delete(`/api/admin/catalog/enquiry-categories/${id}`); } catch (err) { alert(err.message); }
        App.navigateTo('enquiry-form');
    },

    async restore() {
        try { const r = await API.post('/api/admin/catalog/enquiry-categories/restore-defaults', {}); alert(`${r.added} default option(s) restored.`); } catch (err) { alert(err.message); }
        App.navigateTo('enquiry-form');
    },
};
