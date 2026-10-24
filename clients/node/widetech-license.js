/**
 * WideTech licence client for Node.js / Electron (main process). No dependencies (Node 18+).
 *
 *   const { LicenseClient } = require('./widetech-license');
 *   const lic = new LicenseClient({
 *     apiBase: 'https://widetech.in/api/license/v1',
 *     appId: 'your-app-id',                 // from admin → Software → App ID
 *     publicKey: 'BASE64_PUBLIC_KEY',        // from scripts/generate-license-keypair.mjs (safe to embed)
 *     appVersion: '1.0.0',
 *   });
 *   const state = await lic.check();         // call on every launch
 *   if (!state.allowed) showLockScreen(state.message);
 *
 * Every server answer is signed (Ed25519). Answers that fail the signature, nonce, device or app
 * checks are rejected, so a fake "licence server" or an edited response cannot unlock the app.
 * See docs/LICENSING.md.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex'); // DER header for a raw Ed25519 key
const ALLOWED = new Set(['active', 'trial']);

class LicenseError extends Error {}

/** Stable per-machine id (survives reinstalling the app). Hashed with the app id before use. */
function rawMachineId() {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], { encoding: 'utf8', windowsHide: true });
      const m = out.match(/MachineGuid\s+REG_SZ\s+([\w-]+)/i);
      if (m) return `win:${m[1]}`;
    } else if (process.platform === 'darwin') {
      const out = execFileSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], { encoding: 'utf8' });
      const m = out.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      if (m) return `mac:${m[1]}`;
    } else {
      for (const f of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
        if (fs.existsSync(f)) {
          const v = fs.readFileSync(f, 'utf8').trim();
          if (v) return `linux:${v}`;
        }
      }
    }
  } catch (_) { /* fall through */ }
  return null;
}

class LicenseClient {
  /**
   * @param {object} o
   * @param {string} o.apiBase              e.g. https://widetech.in/api/license/v1
   * @param {string} o.appId                product App ID
   * @param {string} o.publicKey            base64 raw 32-byte Ed25519 public key
   * @param {string} [o.appVersion]
   * @param {string} [o.storageDir]         where the key + last signed answer are saved
   * @param {number} [o.offlineGraceHours]  0 = always online (default). e.g. 24–72 to allow short outages
   * @param {number} [o.clockSkewSeconds]   tolerance for clock checks (default 300)
   * @param {string} [o.deviceId]           override (tests); normally derived from the machine id
   * @param {string} [o.deviceName]
   * @param {number} [o.timeoutMs]
   */
  constructor(o) {
    if (!o || !o.apiBase || !o.appId || !o.publicKey) throw new LicenseError('apiBase, appId and publicKey are required');
    this.apiBase = o.apiBase.replace(/\/+$/, '');
    this.appId = o.appId;
    this.appVersion = o.appVersion || '';
    this.offlineGraceMs = Math.max(0, Number(o.offlineGraceHours) || 0) * 3600e3;
    this.skewMs = (Number(o.clockSkewSeconds) || 300) * 1000;
    this.timeoutMs = o.timeoutMs || 15000;
    this.deviceName = o.deviceName || os.hostname();
    this.storageFile = path.join(o.storageDir || path.join(os.homedir(), '.widetech', this.appId), 'license.json');
    const raw = Buffer.from(o.publicKey, 'base64');
    if (raw.length !== 32) throw new LicenseError('publicKey must be a base64 32-byte Ed25519 key');
    this.publicKey = crypto.createPublicKey({ key: Buffer.concat([SPKI_PREFIX, raw]), format: 'der', type: 'spki' });
    this._deviceId = o.deviceId || null;
  }

  // ---- storage ---------------------------------------------------------------------------
  _load() {
    try { return JSON.parse(fs.readFileSync(this.storageFile, 'utf8')); } catch (_) { return {}; }
  }
  _save(state) {
    fs.mkdirSync(path.dirname(this.storageFile), { recursive: true });
    fs.writeFileSync(this.storageFile, JSON.stringify(state, null, 2), { mode: 0o600 });
  }

  deviceId() {
    if (this._deviceId) return this._deviceId;
    let raw = rawMachineId();
    if (!raw) {
      // Fallback: random id saved next to the licence file (weaker: deleting the file gives a new id).
      const s = this._load();
      if (!s.fallbackDeviceId) { s.fallbackDeviceId = crypto.randomUUID(); this._save(s); }
      raw = `fallback:${s.fallbackDeviceId}`;
    }
    this._deviceId = crypto.createHash('sha256').update(`widetech:${this.appId}:${raw}`).digest('hex');
    return this._deviceId;
  }

  savedKey() { return this._load().licenseKey || null; }

  // ---- signed responses ------------------------------------------------------------------
  /** Verifies a {payload, signature} answer. Returns the parsed payload or throws. */
  verify(envelope, expectedNonce) {
    if (!envelope || typeof envelope.payload !== 'string' || typeof envelope.signature !== 'string') throw new LicenseError('Unsigned response');
    const ok = crypto.verify(null, Buffer.from(envelope.payload, 'utf8'), this.publicKey, Buffer.from(envelope.signature, 'base64'));
    if (!ok) throw new LicenseError('Invalid signature (response was tampered with or came from the wrong server)');
    const p = JSON.parse(envelope.payload);
    if (expectedNonce !== undefined && p.nonce !== expectedNonce) throw new LicenseError('Nonce mismatch (replayed response)');
    if (p.deviceId !== this.deviceId()) throw new LicenseError('Response is for a different device');
    if (p.appId !== this.appId) throw new LicenseError('Response is for a different app');
    return p;
  }

  async _call(endpoint, body) {
    const nonce = crypto.randomBytes(24).toString('base64url');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let res;
    try {
      res = await fetch(`${this.apiBase}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ softwareSlug: this.appId, deviceId: this.deviceId(), deviceName: this.deviceName, appVersion: this.appVersion, nonce, ...body }),
        signal: ctrl.signal,
      });
    } finally { clearTimeout(t); }
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new LicenseError((json && json.message) || `Server error ${res.status}`);
      err.httpStatus = res.status;
      throw err;
    }
    const envelope = { payload: json.payload, signature: json.signature };
    return { payload: this.verify(envelope, nonce), envelope };
  }

  _remember(envelope, payload, extra = {}) {
    const s = this._load();
    const serverMs = Date.parse(payload.serverTime);
    s.lastResponse = envelope;
    s.maxServerTime = Math.max(s.maxServerTime || 0, serverMs);
    Object.assign(s, extra);
    this._save(s);
  }

  _state(p, source) {
    const now = Date.parse(p.serverTime);
    const exp = p.expiresAt ? Date.parse(p.expiresAt) : null;
    const allowed = ALLOWED.has(p.status) && (exp === null || exp > now);
    return {
      allowed,
      status: allowed ? p.status : (p.status === 'active' || p.status === 'trial' ? 'expired' : p.status),
      message: p.message,
      plan: p.plan,
      expiresAt: p.expiresAt,
      daysLeft: exp ? Math.max(0, Math.ceil((exp - now) / 86400e3)) : null,
      maxDevices: p.maxDevices,
      devicesUsed: p.devicesUsed,
      buyUrl: p.buyUrl,
      serverTime: p.serverTime,
      source,
    };
  }

  /** Offline fallback: only with offlineGraceHours > 0 and a recent, valid, signed answer. */
  _offline(reason) {
    const locked = (status, message) => ({ allowed: false, status, message, source: 'offline' });
    if (!this.offlineGraceMs) return locked('offline', 'An internet connection is required to check your licence.');
    const s = this._load();
    if (!s.lastResponse) return locked('offline', 'Connect to the internet once to check your licence.');
    let p;
    try { p = this.verify(s.lastResponse); } catch (e) { return locked('invalid', 'Saved licence data is not valid. Please connect to the internet.'); }
    const now = Date.now();
    const cachedAt = Date.parse(p.serverTime);
    if (now + this.skewMs < (s.maxServerTime || cachedAt)) return locked('clock_tampered', 'Your computer clock looks wrong. Fix the date and time, then connect to the internet.');
    if (now - cachedAt > this.offlineGraceMs) return locked('offline', 'Please connect to the internet to re-check your licence.');
    const st = this._state({ ...p, serverTime: new Date(Math.max(now, cachedAt)).toISOString() }, 'cache');
    if (st.allowed) st.message = `Offline mode (${reason}). Connect to the internet within ${Math.ceil((this.offlineGraceMs - (now - cachedAt)) / 3600e3)}h.`;
    return st;
  }

  _handleNetwork(e) {
    if (e instanceof LicenseError && !e.httpStatus) {
      // Signature / nonce / device problem: never fall back to the cache
      return { allowed: false, status: 'invalid', message: e.message, source: 'online' };
    }
    if (e && e.httpStatus === 429) return { allowed: false, status: 'rate_limited', message: e.message, source: 'online' };
    return this._offline(e && e.message ? e.message : 'network error');
  }

  /** Call on every launch. Uses the saved key if there is one, otherwise starts/continues the free trial. */
  async check() {
    const key = this.savedKey();
    try {
      const { payload, envelope } = key
        ? await this._call('validate', { licenseKey: key })
        : await this._call('trial', {});
      this._remember(envelope, payload);
      return this._state(payload, 'online');
    } catch (e) {
      return this._handleNetwork(e);
    }
  }

  /** Activates a key on this device and saves it when accepted. */
  async activate(licenseKey) {
    try {
      const { payload, envelope } = await this._call('activate', { licenseKey: String(licenseKey || '').trim() });
      const st = this._state(payload, 'online');
      if (st.allowed) this._remember(envelope, payload, { licenseKey: String(licenseKey).trim().toUpperCase() });
      return st;
    } catch (e) {
      if (e instanceof LicenseError && !e.httpStatus) return { allowed: false, status: 'invalid', message: e.message, source: 'online' };
      return { allowed: false, status: 'offline', message: 'Could not reach the licence server. Check your internet connection.', source: 'offline' };
    }
  }

  /** Frees this device's slot (e.g. before moving to a new computer) and forgets the key locally. */
  async deactivate() {
    const key = this.savedKey();
    if (!key) return { ok: true };
    const { payload } = await this._call('deactivate', { licenseKey: key });
    const s = this._load(); delete s.licenseKey; delete s.lastResponse; this._save(s);
    return { ok: true, message: payload.message };
  }
}

module.exports = { LicenseClient, LicenseError };
