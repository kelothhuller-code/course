/**
 * Admin → Software → Edit → "Versions & downloads".
 * Upload installers / archives as versions (XHR with a progress bar, no timeout), then edit
 * notes, mark latest, publish / unpublish or delete. Files are kept in private storage and are
 * only served by GET /api/software/:slugOrId/download. Uploading a new version never touches
 * older files; only "Delete" removes one.
 */
window.SoftwareVersions = {
    ACCEPT: '.zip,.exe,.msi,.msix,.dmg,.pkg,.apk,.appimage,.deb,.rar,.7z',
    PLATFORMS: [['windows', 'Windows'], ['macos', 'macOS'], ['linux', 'Linux'], ['android', 'Android'], ['any', 'Any']],
    softwareId: null,
    list: [],
    xhr: null,

    esc(v) { return Helpers.escapeHtml(v); },
    size(n) {
        const b = Number(n) || 0;
        if (b >= 1024 ** 3) return (b / 1024 ** 3).toFixed(2) + ' GB';
        if (b >= 1024 ** 2) return (b / 1024 ** 2).toFixed(1) + ' MB';
        return Math.max(1, Math.round(b / 1024)) + ' KB';
    },
    day(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; },
    today() { return new Date().toISOString().slice(0, 10); },
    guess(name) {
        const ext = (String(name).match(/\.[^.]+$/) || [''])[0].toLowerCase();
        if (['.exe', '.msi', '.msix'].includes(ext)) return 'windows';
        if (['.dmg', '.pkg'].includes(ext)) return 'macos';
        if (['.appimage', '.deb'].includes(ext)) return 'linux';
        if (ext === '.apk') return 'android';
        return 'any';
    },

    /** Markup for the form section. */
    section(item) {
        const s = item || {};
        const free = s.allowFreeDownload !== false;
        const opts = this.PLATFORMS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
        return `
        <fieldset class="cat-fieldset swv" id="sw-versions"><legend>Versions &amp; downloads</legend>
            <label class="swv-toggle"><input type="checkbox" id="swv-free" ${free ? 'checked' : ''}>
                <span><strong>Allow free trial download before purchase</strong>
                <small>Anyone can download published versions from the product page. Your app enforces the trial and licence key itself. Turn off to allow downloads only for buyers and licence owners. Saved with “Save changes”.</small></span></label>
            ${!s._id ? '<p class="swv-empty">Create the product first, then open it again to upload versions.</p>' : `
            <div class="swv-upload">
                <div class="swv-grid">
                    <div class="cat-field cat-wide"><label class="cat-label" for="swv-file">Installer or archive *</label>
                        <input type="file" id="swv-file" accept="${this.ACCEPT}" onchange="SoftwareVersions.onPick(this)">
                        <small class="cat-help">ZIP, EXE, MSI, MSIX, DMG, PKG, APK, AppImage, DEB, RAR or 7z. The size limit is set on the server (SOFTWARE_MAX_UPLOAD_MB, 2 GB by default).</small></div>
                    <div class="cat-field"><label class="cat-label" for="swv-version">Version *</label>
                        <input type="text" id="swv-version" maxlength="40" placeholder="e.g. 1.2.0"></div>
                    <div class="cat-field"><label class="cat-label" for="swv-platform">Platform</label>
                        <select id="swv-platform">${opts}</select></div>
                    <div class="cat-field"><label class="cat-label" for="swv-date">Release date</label>
                        <input type="date" id="swv-date" value="${this.today()}"></div>
                    <div class="cat-field"><label class="cat-label" for="swv-req">Minimum requirements (optional)</label>
                        <input type="text" id="swv-req" maxlength="500" placeholder="e.g. Windows 10 or later, 4 GB RAM"></div>
                    <div class="cat-field cat-wide"><label class="cat-label" for="swv-notes">What's new (release notes)</label>
                        <textarea id="swv-notes" rows="4" placeholder="- New: …&#10;- Fixed: …"></textarea>
                        <small class="cat-help">Markdown or plain text. Shown in “Version history” on the product page.</small></div>
                </div>
                <div class="swv-upload-foot">
                    <label class="cat-switch"><input type="checkbox" id="swv-published" checked> Publish now</label>
                    <label class="cat-switch"><input type="checkbox" id="swv-latest" checked> Mark as latest (default “Download now”)</label>
                    <span class="swv-spacer"></span>
                    <button type="button" class="btn btn-secondary" id="swv-cancel" style="display:none" onclick="SoftwareVersions.cancel()">Cancel</button>
                    <button type="button" class="btn btn-primary" id="swv-upload-btn" onclick="SoftwareVersions.upload()">Upload version</button>
                </div>
                <div class="swv-progress" id="swv-progress" hidden>
                    <div class="swv-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Upload progress"><span id="swv-bar-fill"></span></div>
                    <span id="swv-progress-text" class="swv-progress-text">0%</span>
                </div>
                <div id="swv-status" class="swv-status" role="status" aria-live="polite"></div>
            </div>
            <h4 class="swv-h">Uploaded versions</h4>
            <div id="swv-list" class="swv-list"><p class="swv-empty">Loading…</p></div>`}
        </fieldset>`;
    },

    /** Called after the form markup is on the page. */
    mount(item) {
        this.softwareId = item?._id || null;
        this.list = [];
        if (this.softwareId) this.refresh();
    },

    read() {
        const el = document.getElementById('swv-free');
        return el ? { allowFreeDownload: el.checked } : {};
    },

    onPick(input) {
        const f = input.files[0];
        if (!f) return;
        document.getElementById('swv-platform').value = this.guess(f.name);
        const ver = document.getElementById('swv-version');
        const m = f.name.match(/(\d+\.\d+(?:\.\d+){0,2})/);
        if (!ver.value && m) ver.value = m[1];
        this.status(`${this.esc(f.name)} · ${this.size(f.size)}`);
    },

    status(html, tone = '') {
        const el = document.getElementById('swv-status');
        if (el) { el.className = `swv-status ${tone ? 'swv-' + tone : ''}`; el.innerHTML = html; }
    },

    progress(pct) {
        const wrap = document.getElementById('swv-progress');
        if (!wrap) return;
        wrap.hidden = pct === null;
        if (pct === null) return;
        document.getElementById('swv-bar-fill').style.width = pct + '%';
        wrap.querySelector('[role=progressbar]').setAttribute('aria-valuenow', String(pct));
        document.getElementById('swv-progress-text').textContent = pct >= 100 ? 'Processing…' : pct + '%';
    },

    upload() {
        const file = document.getElementById('swv-file')?.files[0];
        const version = document.getElementById('swv-version').value.trim();
        if (!file) return this.status('Choose a file first.', 'bad');
        if (!version) return this.status('Enter the version number, e.g. 1.2.0.', 'bad');
        const ext = (file.name.match(/\.[^.]+$/) || [''])[0].toLowerCase();
        if (!this.ACCEPT.split(',').includes(ext)) return this.status(`${this.esc(ext || 'This file type')} is not allowed.`, 'bad');

        const fd = new FormData();
        // text fields first, so the server has them when the file arrives
        fd.append('version', version);
        fd.append('platform', document.getElementById('swv-platform').value);
        fd.append('releaseDate', document.getElementById('swv-date').value || this.today());
        fd.append('requirements', document.getElementById('swv-req').value.trim());
        fd.append('notes', document.getElementById('swv-notes').value);
        fd.append('published', String(document.getElementById('swv-published').checked));
        fd.append('isLatest', String(document.getElementById('swv-latest').checked));
        fd.append('file', file);

        const xhr = new XMLHttpRequest();
        this.xhr = xhr;
        xhr.open('POST', `/api/admin/software/${encodeURIComponent(this.softwareId)}/versions`);
        xhr.timeout = 0; // no client-side timeout: big installers on slow uplinks take a while
        xhr.withCredentials = true;
        const token = localStorage.getItem('adminToken');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        const started = Date.now();
        xhr.upload.onprogress = (e) => {
            if (!e.lengthComputable) return;
            const pct = Math.min(100, Math.round((e.loaded / e.total) * 100));
            this.progress(pct);
            const secs = (Date.now() - started) / 1000;
            const rate = secs > 1 ? e.loaded / secs : 0;
            this.status(`Uploading ${this.esc(file.name)}: ${this.size(e.loaded)} of ${this.size(e.total)}${rate ? ` · ${this.size(rate)}/s` : ''}`);
        };
        const done = () => {
            this.xhr = null;
            document.getElementById('swv-upload-btn').disabled = false;
            document.getElementById('swv-cancel').style.display = 'none';
        };
        xhr.onload = () => {
            done();
            let data = {};
            try { data = JSON.parse(xhr.responseText || '{}'); } catch { /* not JSON (e.g. nginx 413 page) */ }
            if (xhr.status >= 200 && xhr.status < 300) {
                this.progress(null);
                this.status(`✓ Version ${this.esc(data.version?.version || version)} uploaded (${this.size(file.size)}).`, 'ok');
                ['swv-file', 'swv-version', 'swv-req', 'swv-notes'].forEach((id) => { document.getElementById(id).value = ''; });
                this.refresh();
            } else {
                this.progress(null);
                const msg = data.message || (xhr.status === 413 ? 'The file is larger than the server allows (check SOFTWARE_MAX_UPLOAD_MB and nginx client_max_body_size).' : `Upload failed (HTTP ${xhr.status}).`);
                this.status('✗ ' + this.esc(msg), 'bad');
            }
        };
        xhr.onerror = () => { done(); this.progress(null); this.status('✗ Network error during upload. Check the connection and try again.', 'bad'); };
        xhr.onabort = () => { done(); this.progress(null); this.status('Upload cancelled.'); };
        document.getElementById('swv-upload-btn').disabled = true;
        document.getElementById('swv-cancel').style.display = '';
        this.progress(0);
        xhr.send(fd);
        return undefined;
    },

    cancel() { if (this.xhr) this.xhr.abort(); },

    async refresh() {
        const box = document.getElementById('swv-list');
        if (!box) return;
        try {
            const res = await API.get(`/api/admin/software/${encodeURIComponent(this.softwareId)}/versions`);
            this.list = res.versions || [];
            this.renderList();
        } catch (e) {
            box.innerHTML = `<p class="swv-empty swv-bad">Could not load versions: ${this.esc(e.message)}</p>`;
        }
    },

    renderList() {
        const box = document.getElementById('swv-list');
        if (!box) return;
        if (!this.list.length) {
            box.innerHTML = '<p class="swv-empty">No versions yet. Upload the first one above.</p>';
            return;
        }
        const label = Object.fromEntries(this.PLATFORMS);
        box.innerHTML = this.list.map((v) => `
            <div class="swv-row" id="swv-row-${v._id}">
                <div class="swv-main">
                    <div class="swv-title">
                        <strong>v${this.esc(v.version)}</strong>
                        <span class="lic-badge">${this.esc(label[v.platform] || v.platform)}</span>
                        ${v.isLatest ? '<span class="lic-badge lic-b-green">Latest</span>' : ''}
                        ${v.published ? '' : '<span class="lic-badge lic-b-amber">Unpublished</span>'}
                    </div>
                    <div class="swv-meta">${this.esc(v.fileName)} · ${this.size(v.size)} · released ${this.day(v.releaseDate)} · ${v.downloadCount} download${v.downloadCount === 1 ? '' : 's'}</div>
                    <div class="swv-meta swv-sha" title="SHA-256">SHA-256 ${this.esc(v.sha256)}</div>
                    ${v.requirements ? `<div class="swv-meta">Requires: ${this.esc(v.requirements)}</div>` : ''}
                    <div class="swv-edit" id="swv-edit-${v._id}" hidden>
                        <label class="cat-label" for="swv-notes-${v._id}">Release notes</label>
                        <textarea id="swv-notes-${v._id}" rows="4">${this.esc(v.notes)}</textarea>
                        <label class="cat-label" for="swv-req-${v._id}" style="margin-top:.5rem">Minimum requirements</label>
                        <input type="text" id="swv-req-${v._id}" maxlength="500" value="${this.esc(v.requirements)}">
                        <div class="swv-edit-foot">
                            <button type="button" class="btn btn-sm btn-secondary" onclick="SoftwareVersions.toggleEdit('${v._id}')">Cancel</button>
                            <button type="button" class="btn btn-sm btn-primary" onclick="SoftwareVersions.saveNotes('${v._id}')">Save notes</button>
                        </div>
                    </div>
                </div>
                <div class="swv-actions">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="SoftwareVersions.toggleEdit('${v._id}')">Edit notes</button>
                    ${v.isLatest || !v.published ? '' : `<button type="button" class="btn btn-sm btn-secondary" onclick="SoftwareVersions.patch('${v._id}', { isLatest: true })">Mark latest</button>`}
                    <button type="button" class="btn btn-sm btn-secondary" onclick="SoftwareVersions.patch('${v._id}', { published: ${!v.published} })">${v.published ? 'Unpublish' : 'Publish'}</button>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="SoftwareVersions.remove('${v._id}')">Delete</button>
                </div>
            </div>`).join('');
    },

    toggleEdit(id) {
        const el = document.getElementById(`swv-edit-${id}`);
        if (el) el.hidden = !el.hidden;
    },

    async patch(id, body) {
        try {
            await API.put(`/api/admin/software/${encodeURIComponent(this.softwareId)}/versions/${id}`, body);
            await this.refresh();
        } catch (e) {
            alert('Could not update the version: ' + e.message);
        }
    },

    saveNotes(id) {
        return this.patch(id, {
            notes: document.getElementById(`swv-notes-${id}`).value,
            requirements: document.getElementById(`swv-req-${id}`).value.trim(),
        });
    },

    async remove(id) {
        const v = this.list.find((x) => x._id === id);
        if (!v) return;
        if (!confirm(`Delete version ${v.version} (${v.fileName})?\n\nThe file is removed from the server and can no longer be downloaded. This cannot be undone.`)) return;
        try {
            await API.delete(`/api/admin/software/${encodeURIComponent(this.softwareId)}/versions/${id}`);
            await this.refresh();
        } catch (e) {
            alert('Could not delete the version: ' + e.message);
        }
    },
};
