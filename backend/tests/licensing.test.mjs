// node --test tests/   (no database needed)
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  generateLicenseKey, normalizeLicenseKey, hashLicenseKey, hashDeviceId, encryptKey, decryptKey,
  maskKey, signResponse, publicKeyBase64, planExpiry,
} from '../utils/licensing.js';

test('key format WT-XXXXX-XXXXX-XXXXX-XXXXX with checksum', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i += 1) {
    const k = generateLicenseKey();
    assert.match(k, /^WT-[0-9A-HJKMNP-TV-Z]{5}(-[0-9A-HJKMNP-TV-Z]{5}){3}$/);
    assert.equal(normalizeLicenseKey(k), k);
    seen.add(k);
  }
  assert.equal(seen.size, 200);
});

test('normalize accepts lower case / spaces / O→0, I/L→1 and rejects typos', () => {
  const k = generateLicenseKey();
  assert.equal(normalizeLicenseKey(` ${k.toLowerCase()} `), k);
  assert.equal(normalizeLicenseKey(k.replace(/-/g, '')), k);
  // change one character → checksum fails
  const body = k.split('');
  const i = 5;
  body[i] = body[i] === 'A' ? 'B' : 'A';
  assert.equal(normalizeLicenseKey(body.join('')), null);
  assert.equal(normalizeLicenseKey('WT-AAAAA'), null);
  assert.equal(normalizeLicenseKey({ $ne: 1 }), null);
  assert.equal(normalizeLicenseKey(''), null);
});

test('keys are stored hashed and encrypted, never in plain text', () => {
  const k = generateLicenseKey();
  const h = hashLicenseKey(k);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.ok(!h.includes(k));
  const enc = encryptKey(k);
  assert.ok(!String(enc).includes(k.slice(3)));
  assert.equal(decryptKey(enc), k);
  assert.equal(maskKey(k).endsWith(k.slice(-5)), true);
  assert.ok(!maskKey(k).includes(k.slice(3, 8)));
  assert.notEqual(hashDeviceId('app-a', 'device-1234'), hashDeviceId('app-b', 'device-1234'));
});

test('responses are Ed25519-signed and verify with the public key only', () => {
  const env = signResponse({ status: 'active', nonce: 'n'.repeat(20) });
  assert.equal(env.alg, 'Ed25519');
  const pub = crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(publicKeyBase64(), 'base64')]), format: 'der', type: 'spki' });
  assert.equal(crypto.verify(null, Buffer.from(env.payload), pub, Buffer.from(env.signature, 'base64')), true);
  const tampered = env.payload.replace('active', 'revoked');
  assert.equal(crypto.verify(null, Buffer.from(tampered), pub, Buffer.from(env.signature, 'base64')), false);
});

test('plan expiry: monthly / yearly / custom / lifetime', () => {
  const from = new Date('2026-01-31T00:00:00Z');
  const m = planExpiry({ billing: 'monthly' }, from);
  const y = planExpiry({ billing: 'yearly' }, from);
  const c = planExpiry({ billing: 'custom_days', customDays: 10 }, from);
  assert.ok(m > from && (m - from) / 864e5 >= 28 && (m - from) / 864e5 <= 31);
  assert.ok((y - from) / 864e5 >= 365 && (y - from) / 864e5 <= 366);
  assert.equal(Math.round((c - from) / 864e5), 10);
  assert.equal(planExpiry({ billing: 'lifetime' }, from), null);
});
