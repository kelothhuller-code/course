/**
 * POS admin-PIN reset codes (support flow). See docs/LICENSING.md → "POS admin PIN reset".
 *
 *   Request code (shown by the POS): "WTR1-" + base64url(JSON {"a":appId,"d":deviceId,"n":nonce,"t":unixSeconds})
 *   Reset code (typed into the POS):  "WTP1-" + base64url(Ed25519 signature over
 *                                       "wt-pin-reset-v1|<appId>|<deviceId>|<nonce>")
 *
 * base64url = RFC 4648 §5 alphabet, no "=" padding. The signature uses the SAME licence signing
 * key as the licence API (utils/licensing.js), so the POS verifies it with the public key it
 * already embeds. Single use / 7-day expiry / device binding are enforced on the POS.
 */
import { signBytes } from './licensing.js';

export const REQUEST_PREFIX = 'WTR1-';
export const RESET_PREFIX = 'WTP1-';
export const MESSAGE_PREFIX = 'wt-pin-reset-v1';
export const MAX_AGE_SECONDS = 7 * 24 * 3600 + 3600; // 7 days (+1 h clock slack)
export const MAX_FUTURE_SECONDS = 10 * 60;             // POS clock may be a little ahead

const B64URL_RE = /^[A-Za-z0-9_-]+$/;
const APP_ID_RE = /^[a-z0-9][a-z0-9._-]{0,79}$/i; // same rule as the licence API
const DEVICE_RE = /^[0-9a-fA-F]{64}$/;

export class PinResetError extends Error {
  constructor(message, status = 400, code = 'bad_request') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Strict base64url (no padding) → Buffer, or null. Rejects non-canonical encodings. */
export const fromBase64Url = (s) => {
  if (typeof s !== 'string' || !s || !B64URL_RE.test(s) || s.length % 4 === 1) return null;
  const buf = Buffer.from(s, 'base64url');
  return buf.toString('base64url') === s ? buf : null;
};
export const toBase64Url = (buf) => Buffer.from(buf).toString('base64url');

export const pinResetMessage = (appId, deviceId, nonce) => `${MESSAGE_PREFIX}|${appId}|${deviceId}|${nonce}`;

/**
 * Parses and validates a request code. Throws PinResetError (HTTP 400) when malformed.
 * Returns { appId, deviceId, nonce, t } with the values exactly as the POS sent them.
 */
export const parseRequestCode = (input, { now = Date.now(), checkTime = true } = {}) => {
  if (typeof input !== 'string') throw new PinResetError('requestCode is required.');
  const code = input.replace(/\s+/g, ''); // tolerate line breaks / spaces from copy-paste
  if (!code) throw new PinResetError('requestCode is required.');
  if (code.length > 2048) throw new PinResetError('Request code is too long.');
  if (!code.startsWith(REQUEST_PREFIX)) throw new PinResetError(`Request code must start with "${REQUEST_PREFIX}".`, 400, 'bad_prefix');
  const raw = fromBase64Url(code.slice(REQUEST_PREFIX.length));
  if (!raw) throw new PinResetError('Request code is not valid base64url (check it was copied completely).', 400, 'bad_encoding');
  let obj;
  try { obj = JSON.parse(raw.toString('utf8')); } catch { throw new PinResetError('Request code does not contain valid JSON.', 400, 'bad_json'); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new PinResetError('Request code does not contain a JSON object.', 400, 'bad_json');
  const { a, d, n, t } = obj;
  if (typeof a !== 'string' || !APP_ID_RE.test(a)) throw new PinResetError('Request code has a missing or invalid app id ("a").', 400, 'bad_shape');
  if (typeof d !== 'string' || !DEVICE_RE.test(d)) throw new PinResetError('Request code has an invalid device id ("d" must be 64 hex characters).', 400, 'bad_shape');
  const nb = fromBase64Url(n);
  if (!nb || nb.length !== 16) throw new PinResetError('Request code has an invalid nonce ("n" must be 16 bytes, base64url).', 400, 'bad_shape');
  if (!Number.isInteger(t) || t <= 0) throw new PinResetError('Request code has an invalid time ("t" must be an integer, unix seconds).', 400, 'bad_shape');
  if (checkTime) {
    const nowS = Math.floor(now / 1000);
    if (nowS - t > MAX_AGE_SECONDS) {
      throw new PinResetError('This request code is more than 7 days old. Ask the customer to open the PIN reset screen again and send the new code.', 400, 'expired');
    }
    if (t - nowS > MAX_FUTURE_SECONDS) {
      throw new PinResetError("This request code's time is in the future. The POS computer's clock is probably wrong; ask the customer to fix the date/time and generate a new code.", 400, 'future');
    }
  }
  return { appId: a, deviceId: d, nonce: n, t };
};

/** Signs the reset message with the licence private key. Never exposes the key. */
export const makeResetCode = (appId, deviceId, nonce) =>
  RESET_PREFIX + toBase64Url(signBytes(Buffer.from(pinResetMessage(appId, deviceId, nonce), 'utf8')));

/** Builds a request code (used by tests and the sample script; the real one comes from the POS). */
export const makeRequestCode = ({ appId, deviceId, nonce, t }) =>
  REQUEST_PREFIX + toBase64Url(Buffer.from(JSON.stringify({ a: appId, d: deviceId, n: nonce, t }), 'utf8'));
