/**
 * POS PIN reset (support): paste the customer's WTR1- request code, check the decoded details,
 * generate the signed WTP1- reset code, copy it to the customer. Every code generated is audited.
 * API: POST /api/license/v1/admin/pin-reset, GET /api/license/v1/admin/pin-reset/history
 * Every value from the server or the pasted code is escaped before it is put into HTML.
 */
window.PinResetModule = {
    API_BASE: '/api/license/v1/admin/pin-reset',
    esc(v) { return Helpers.escapeHtml(v === undefined || v === null ? '' : String(v)); },
    dt(d) { return d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; },
    shortId(id) { const s = String(id || ''); return s.length > 20 ? `${s.slice(0, 8)}…${s.slice(-8)}` : s; },

    async render() {
        return `
            <div class="cat-header"><div><h2>POS PIN reset</h2>
                <p>When a shop owner forgets the POS admin PIN, the POS shows a request code starting with <code>WTR1-</code>. Paste it here, check the details, then send the customer the reset code. Codes work once, only on that computer, for 7 days. Every code you generate is logged.</p></div></div>
            <div class="card cat-card pin-card">
                <label class="cat-label" for="pin-request">Request code from the POS</label>
                <textarea id="pin-request" class="pin-input" rows="3" spellcheck="false" autocomplete="off" placeholder="WTR1-…" oninput="PinResetModule.preview()"></textarea>
                <div id="pin-preview" class="pin-preview" aria-live="polite"></div>
                <div class="pin-actions"><button type="button" id="pin-generate" class="btn btn-primary" onclick="PinResetModule.generate()" disabled>Generate reset code</button></div>
                <div id="pin-result" role="status"></div>
            </div>
            <div class="card cat-card pin-card">
                <h3 class="pin-h3">Recent reset codes</h3>
                <div id="pin-history">${await this.renderHistory()}</div>
            </div>`;
    },

    /** Client-side decode for the preview only; the server validates everything again. */
    decode(raw) {
        const code = String(raw || '').replace(/\s+/g, '');
        if (!code) return null;
        if (!code.startsWith('WTR1-')) return { error: 'The code should start with WTR1-.' };
        const b64 = code.slice(5);
        if (!/^[A-Za-z0-9_-]+$/.test(b64)) return { error: 'The code contains characters that are not allowed. Check it was copied completely.' };
        try {
            const std = b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4);
            const bin = atob(std);
            const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
            const o = JSON.parse(json);
            if (!o || typeof o.a !== 'string' || typeof o.d !== 'string' || typeof o.n !== 'string' || !Number.isInteger(o.t)) {
                return { error: 'The code is missing app, device, nonce or time.' };
            }
            if (!/^[0-9a-fA-F]{64}$/.test(o.d)) return { error: 'The device id in the code is not valid.' };
            return { code, appId: o.a, deviceId: o.d, nonce: o.n, t: o.t };
        } catch {
            return { error: 'The code could not be read. Check it was copied completely.' };
        }
    },

    preview() {
        const el = document.getElementById('pin-preview');
        const btn = document.getElementById('pin-generate');
        document.getElementById('pin-result').innerHTML = '';
        const d = this.decode(document.getElementById('pin-request').value);
        btn.disabled = !d || Boolean(d.error);
        if (!d) { el.innerHTML = ''; return; }
        if (d.error) { el.innerHTML = `<div class="cat-error">${this.esc(d.error)}</div>`; return; }
        const ageDays = (Date.now() / 1000 - d.t) / 86400;
        const old = ageDays > 7 ? '<span class="lic-badge lic-b-amber">older than 7 days</span>' : '';
        el.innerHTML = `
            <dl class="pin-dl">
                <div><dt>App</dt><dd><code>${this.esc(d.appId)}</code></dd></div>
                <div><dt>Device</dt><dd><code title="${this.esc(d.deviceId)}">${this.esc(this.shortId(d.deviceId))}</code></dd></div>
                <div><dt>Requested</dt><dd>${this.esc(this.dt(d.t * 1000))} ${old}</dd></div>
            </dl>`;
    },

    async generate() {
        const btn = document.getElementById('pin-generate');
        const out = document.getElementById('pin-result');
        const d = this.decode(document.getElementById('pin-request').value);
        if (!d || d.error) return;
        btn.disabled = true;
        btn.textContent = 'Generating…';
        try {
            const r = await API.post(this.API_BASE, { requestCode: d.code });
            const lic = r.licence;
            const who = r.customer ? `${this.esc(r.customer.name || '—')} <span class="cat-muted">${this.esc(r.customer.email || '')}</span>` : '';
            out.innerHTML = `
                <div class="pin-result">
                    <label class="cat-label" for="pin-code">Reset code — send this to the customer</label>
                    <div class="pin-code-row">
                        <input id="pin-code" class="pin-code" type="text" readonly value="${this.esc(r.resetCode)}" onclick="this.select()">
                        <button type="button" class="btn btn-secondary" onclick="PinResetModule.copy(this)">Copy</button>
                    </div>
                    ${r.activationFound ? `
                    <dl class="pin-dl">
                        <div><dt>Customer</dt><dd>${who}</dd></div>
                        <div><dt>Licence</dt><dd><code class="lic-key">${this.esc(lic?.key || `…${lic?.keyLast || ''}`)}</code> ${lic?.plan ? `<span class="cat-muted">${this.esc(lic.plan)}</span>` : ''} ${lic?.status ? `<span class="lic-badge ${lic.status === 'active' ? 'lic-b-green' : 'lic-b-amber'}">${this.esc(lic.status)}</span>` : ''}</dd></div>
                    </dl>` : `
                    <div class="pin-warn"><strong>No activation found for this device.</strong> The code was still generated, but this computer has never activated a licence for ${this.esc(r.software || r.appId)}. Confirm who the customer is before sending it.</div>`}
                </div>`;
            this.refreshHistory();
        } catch (e) {
            out.innerHTML = `<div class="cat-error">${this.esc(e.message)}</div>`;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Generate reset code';
        }
    },

    async copy(btn) {
        const input = document.getElementById('pin-code');
        try { await navigator.clipboard.writeText(input.value); } catch { input.select(); document.execCommand('copy'); }
        btn.textContent = 'Copied';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    },

    async renderHistory() {
        let data;
        try { data = await API.get(`${this.API_BASE}/history`); } catch (e) { return `<div class="cat-error">${this.esc(e.message)}</div>`; }
        const rows = (data.history || []).map((h) => `
            <tr>
                <td>${this.esc(this.dt(h.createdAt))}</td>
                <td>${this.esc(h.adminEmail)}</td>
                <td><code>${this.esc(h.appId)}</code></td>
                <td><code title="${this.esc(h.deviceId)}">${this.esc(this.shortId(h.deviceId))}</code></td>
                <td>${h.activationFound ? `<span class="lic-badge lic-b-green">…${this.esc(h.licenseKeyLast)}</span>` : '<span class="lic-badge lic-b-amber">none</span>'}</td>
                <td class="cat-muted">${this.esc(h.ip)}</td>
            </tr>`).join('') || '<tr><td colspan="6" class="cat-empty">No reset codes generated yet.</td></tr>';
        return `<div class="table-responsive"><table class="data-table cat-table">
            <thead><tr><th>When</th><th>By</th><th>App</th><th>Device</th><th>Licence</th><th>IP</th></tr></thead>
            <tbody>${rows}</tbody></table></div>`;
    },
    async refreshHistory() {
        const el = document.getElementById('pin-history');
        if (el) el.innerHTML = await this.renderHistory();
    },
};
