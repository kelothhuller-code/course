// Admin → Categories: create, rename, reorder, show/hide categories for
// courses, software and services. Renaming updates every item using it.
window.CategoriesModule = {
    kind: 'course',
    data: [],

    async render() {
        const esc = Helpers.escapeHtml;
        const res = await API.get(`/api/admin/catalog/categories?kind=${this.kind}`);
        this.data = res.categories || [];
        const unmanaged = (res.unmanaged || {})[this.kind] || [];
        const tabs = [['course', 'Courses'], ['software', 'Software'], ['service', 'Services']];
        return `
            <div class="cat-header">
                <div>
                    <h2>Categories</h2>
                    <p>These drive the filters on the public pages. Lower position = shown first. Hidden categories are not offered as filters.</p>
                </div>
            </div>
            <div class="cat-tabs" role="tablist">
                ${tabs.map(([k, l]) => `<button role="tab" aria-selected="${this.kind === k}" class="cat-tab ${this.kind === k ? 'active' : ''}" onclick="CategoriesModule.switchKind('${k}')">${l}</button>`).join('')}
            </div>
            <div class="card cat-card">
                <form class="cat-inline-form" onsubmit="CategoriesModule.create(event)">
                    <label for="new-cat-name" class="cat-label">New ${esc(this.kind)} category</label>
                    <input id="new-cat-name" maxlength="60" required placeholder="e.g. ${this.kind === 'course' ? 'Export' : this.kind === 'software' ? 'Business tools' : 'Automation'}">
                    <button class="btn btn-primary" type="submit">Add category</button>
                    <span id="cat-msg" class="cat-error" role="alert"></span>
                </form>
                ${unmanaged.length ? `<p class="cat-help">Used by items but not managed yet: ${unmanaged.map((n) => `<button type="button" class="cat-chip" onclick="CategoriesModule.adopt(this.dataset.name)" data-name="${esc(n)}">+ ${esc(n)}</button>`).join(' ')}</p>` : ''}
                <table class="data-table cat-table">
                    <thead><tr><th>Position</th><th>Name</th><th>Items</th><th>Shown</th><th></th></tr></thead>
                    <tbody>
                    ${this.data.length === 0 ? '<tr><td colspan="5" class="cat-empty">No categories yet. Add one above.</td></tr>' : this.data.map((c, i) => `
                        <tr>
                            <td class="cat-order">
                                <button class="cat-icon-btn" aria-label="Move up" ${i === 0 ? 'disabled' : ''} onclick="CategoriesModule.move(${i}, -1)">▲</button>
                                <span>${i + 1}</span>
                                <button class="cat-icon-btn" aria-label="Move down" ${i === this.data.length - 1 ? 'disabled' : ''} onclick="CategoriesModule.move(${i}, 1)">▼</button>
                            </td>
                            <td><input class="cat-rename" aria-label="Category name" value="${esc(c.name)}" maxlength="60" data-id="${c._id}" onchange="CategoriesModule.rename(this)"></td>
                            <td>${Number(c.itemCount) || 0}</td>
                            <td><label class="cat-switch"><input type="checkbox" ${c.isVisible ? 'checked' : ''} onchange="CategoriesModule.update('${c._id}', { isVisible: this.checked })"> Visible</label></td>
                            <td class="cat-actions"><button class="btn btn-sm btn-outline-danger" onclick="CategoriesModule.remove('${c._id}')">Delete</button></td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
    },

    switchKind(k) { this.kind = k; App.navigateTo('categories'); },

    async create(e) {
        e.preventDefault();
        const name = document.getElementById('new-cat-name').value.trim();
        try {
            await API.post('/api/admin/catalog/categories', { kind: this.kind, name });
            App.navigateTo('categories');
        } catch (err) {
            document.getElementById('cat-msg').textContent = err.message;
        }
    },

    async adopt(name) {
        try { await API.post('/api/admin/catalog/categories', { kind: this.kind, name }); } catch (err) { alert(err.message); }
        App.navigateTo('categories');
    },

    async rename(input) {
        const name = input.value.trim();
        if (!name) return;
        try {
            const r = await API.put(`/api/admin/catalog/categories/${input.dataset.id}`, { name });
            if (r.renamedItems) alert(`Renamed. ${r.renamedItems} item(s) were moved to “${name}”.`);
            App.navigateTo('categories');
        } catch (err) {
            alert(err.message);
            App.navigateTo('categories');
        }
    },

    async update(id, patch) {
        try { await API.put(`/api/admin/catalog/categories/${id}`, patch); } catch (err) { alert(err.message); App.navigateTo('categories'); }
    },

    async move(i, dir) {
        const list = [...this.data];
        const j = i + dir;
        if (j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        try { await API.post('/api/admin/catalog/categories/reorder', { ids: list.map((c) => c._id) }); } catch (err) { alert(err.message); }
        App.navigateTo('categories');
    },

    async remove(id) {
        if (!confirm('Delete this category?')) return;
        try { await API.delete(`/api/admin/catalog/categories/${id}`); } catch (err) { alert(err.message); }
        App.navigateTo('categories');
    },
};
