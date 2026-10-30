/**
 * Licence keys, device hashing and Ed25519 response signing.
 *
 * Key format: WT-XXXXX-XXXXX-XXXXX-XXXXX (Crockford base32, no I/L/O/U).
 * 18 random characters = 90 bits of randomness, plus 2 checksum characters so typos are caught
 * before hitting the database. Keys are stored as SHA-256 hashes (lookup) and AES-256-GCM
 * ciphertext (so the buyer can see their key again); never in plain text and never logged.
 */
import crypto from 'crypto';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32
const isProd = () => process.env.NODE_ENV === 'production';

const checksum = (body) => {
  const h = crypto.createHash('sha256').update(`WT|${body}`).digest();
  return ALPHABET[h[0] & 31] + ALPHABET[h[1] & 31];
};

export const generateLicenseKey = () => {
  const bytes = crypto.randomBytes(18);
  let body = '';
  for (let i = 0; i < 18; i += 1) body += ALPHABET[bytes[i] & 31];
  const full = body + checksum(body);
  return `WT-${full.slice(0, 5)}-${full.slice(5, 10)}-${full.slice(10, 15)}-${full.slice(15, 20)}`;
};

/** Upper-cases, strips spaces, maps look-alike letters (O→0, I/L→1). Returns null when malformed. */
export const normalizeLicenseKey = (value) => {
  if (typeof value !== 'string' || value.length > 64) return null;
  let raw = value.toUpperCase().replace(/[\s-]/g, '');
  if (raw.startsWith('WT')) raw = raw.slice(2);
  raw = raw.replace(/O/g, '0').replace(/[IL]/g, '1');
  if (!/^[0-9A-HJKMNP-TV-Z]{20}$/.test(raw)) return null;
  if (checksum(raw.slice(0, 18)) !== raw.slice(18)) return null;
  return `WT-${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}-${raw.slice(15, 20)}`;
};

export const hashLicenseKey = (key) => crypto.createHash('sha256').update(`license:${key}`).digest('hex');

/** Device ids are hashed per product, so the same machine cannot be linked across products. */
export const hashDeviceId = (appId, deviceId) =>
  crypto.createHash('sha256').update(`device:${appId}:${String(deviceId).trim()}`).digest('hex');

// ---- Encryption of keys at rest ----------------------------------------------------------
const encKey = () => {
  const secret = process.env.LICENSE_KEY_SECRET || (isProd() ? '' : 'dev-only-license-key-secret');
  if (!secret || secret.length < 16) throw new Error('LICENSE_KEY_SECRET must be set (at least 32 random characters).');
  return crypto.createHash('sha256').update(secret).digest();
};

export const encryptKey = (key) => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  const enc = Buffer.concat([c.update(key, 'utf8'), c.final()]);
  return `v1:${iv.toString('base64')}:${c.getAuthTag().toString('base64')}:${enc.toString('base64')}`;
};

export const decryptKey = (blob) => {
  try {
    const [v, iv, tag, data] = String(blob).split(':');
    if (v !== 'v1') return '';
    const d = crypto.createDecipheriv('aes-256-gcm', encKey(), Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
  } catch {
    return '';
  }
};

/** Masked form for lists and logs: WT-XXXXX-…-7KQ2D */
export const maskKey = (keyOrLast) => `WT-•••••-•••••-•••••-${String(keyOrLast).slice(-5)}`;

// ---- Ed25519 signing --------------------------------------------------------------------
let cachedKey = null;
let devKeyWarned = false;

const loadPrivateKey = () => {
  if (cachedKey) return cachedKey;
  const raw = (process.env.LICENSE_SIGNING_PRIVATE_KEY || '').trim();
  if (raw) {
    const pem = raw.includes('BEGIN') ? raw.replace(/\\n/g, '\n') : null;
    cachedKey = pem
      ? crypto.createPrivateKey(pem)
      : crypto.createPrivateKey({ key: Buffer.from(raw, 'base64'), format: 'der', type: 'pkcs8' });
    if (cachedKey.asymmetricKeyType !== 'ed25519') throw new Error('LICENSE_SIGNING_PRIVATE_KEY must be an Ed25519 key.');
    return cachedKey;
  }
  if (isProd()) throw new Error('LICENSE_SIGNING_PRIVATE_KEY is not set. Run: node scripts/generate-license-keypair.mjs');
  // Development only: a throwaway key so the API works locally. Clients built against it will
  // reject production responses, which is what we want.
  cachedKey = crypto.generateKeyPairSync('ed25519').privateKey;
  if (!devKeyWarned) { console.warn('[license] Using a temporary dev signing key (set LICENSE_SIGNING_PRIVATE_KEY).'); devKeyWarned = true; }
  return cachedKey;
};

/** Raw 32-byte public key, base64 (what the client apps embed). */
export const publicKeyBase64 = () => {
  const der = crypto.createPublicKey(loadPrivateKey()).export({ format: 'der', type: 'spki' });
  return der.subarray(der.length - 32).toString('base64');
};

export const isLicensingConfigured = () => {
  try { loadPrivateKey(); return true; } catch { return false; }
};

/**
 * Signs a response. The client verifies `signature` over the exact bytes of `payload`
 * (a JSON string), then checks payload.nonce equals the nonce it sent and serverTime is recent.
 */
export const signResponse = (data) => {
  const payload = JSON.stringify(data);
  const signature = crypto.sign(null, Buffer.from(payload, 'utf8'), loadPrivateKey()).toString('base64');
  return { payload, signature, alg: 'Ed25519', kid: publicKeyBase64().slice(0, 8) };
};

/**
 * Signs raw bytes with the same licence private key (same loading rules: base64 PKCS#8 DER or PEM).
 * Returns the raw 64-byte Ed25519 signature. Used by the POS PIN-reset codes (utils/pinReset.js).
 */
export const signBytes = (bytes) => crypto.sign(null, Buffer.from(bytes), loadPrivateKey());

/** Expiry for a plan, starting from `from` (renewals start from the later of now / current expiry). */
export const planExpiry = (plan, from = new Date()) => {
  const d = new Date(from);
  switch (plan.billing) {
    case 'lifetime': return null;
    case 'monthly': d.setMonth(d.getMonth() + 1); return d;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); return d;
    case 'custom_days': d.setDate(d.getDate() + Math.max(1, Number(plan.customDays) || 30)); return d;
    default: d.setFullYear(d.getFullYear() + 1); return d;
  }
};

export const billingLabel = (plan) => ({
  monthly: 'per month', yearly: 'per year', lifetime: 'lifetime',
  custom_days: `for ${plan.customDays || 30} days`,
}[plan.billing] || '');
