#!/usr/bin/env node
/**
 * Generates the Ed25519 keypair used to sign licence API responses.
 *
 *   node scripts/generate-license-keypair.mjs
 *
 * - LICENSE_SIGNING_PRIVATE_KEY → put ONLY in the server's .env / hosting secrets. Never commit it,
 *   never put it in a desktop app.
 * - Public key → paste into your desktop app (see docs/LICENSING.md). It is safe to publish.
 * Nothing is written to disk; copy the values from the terminal.
 */
import crypto from 'crypto';

const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
const privB64 = privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64');
const spki = publicKey.export({ format: 'der', type: 'spki' });
const pubRaw = spki.subarray(spki.length - 32).toString('base64');
const pubPem = publicKey.export({ format: 'pem', type: 'spki' });
const secret = crypto.randomBytes(32).toString('base64url');

if (process.argv.includes('--env')) {
  // Machine-readable (used by local tests): prints env lines only.
  console.log(`LICENSE_SIGNING_PRIVATE_KEY=${privB64}`);
  console.log(`LICENSE_SIGNING_PUBLIC_KEY=${pubRaw}`);
  console.log(`LICENSE_KEY_SECRET=${secret}`);
  process.exit(0);
}

console.log(`
=== Server secrets (add to backend .env on the server — KEEP PRIVATE) ===
LICENSE_SIGNING_PRIVATE_KEY=${privB64}
LICENSE_KEY_SECRET=${secret}

=== Public key (paste into your desktop app; safe to share) ===
LICENSE_SIGNING_PUBLIC_KEY=${pubRaw}

PEM form of the same public key:
${pubPem}
Keep a secure backup of the private key. If you lose it, every app must be updated with a new
public key. If it leaks, generate a new pair and ship an app update.
Changing LICENSE_KEY_SECRET later makes existing keys unreadable in the dashboard (they still work).
`);
