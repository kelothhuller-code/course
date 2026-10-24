#!/usr/bin/env node
/**
 * Minimal demo app: shows the lock screen until there is a valid trial or licence.
 *   WT_API=http://localhost:5001/api/license/v1 WT_APP_ID=sample-billing-desk WT_PUBLIC_KEY=... node demo.js
 *   node demo.js --key WT-XXXXX-XXXXX-XXXXX-XXXXX     (enter a key non-interactively)
 */
'use strict';
const readline = require('readline');
const { LicenseClient } = require('./widetech-license');

const lic = new LicenseClient({
  apiBase: process.env.WT_API || 'https://widetech.in/api/license/v1',
  appId: process.env.WT_APP_ID || 'your-app-id',
  publicKey: process.env.WT_PUBLIC_KEY || 'PASTE_YOUR_PUBLIC_KEY_HERE_BASE64_32_BYTES_AAAA=',
  appVersion: '1.0.0',
  storageDir: process.env.WT_STORAGE_DIR,
  deviceId: process.env.WT_DEVICE_ID,
  offlineGraceHours: Number(process.env.WT_GRACE_HOURS || 0),
});

const line = '─'.repeat(52);
const runApp = (st) => {
  console.log(`\n${line}\n  ✅ Sample Billing Desk is unlocked`);
  console.log(`  Status: ${st.status}${st.plan ? ` (${st.plan})` : ''}${st.daysLeft !== null && st.daysLeft !== undefined ? ` · ${st.daysLeft} day(s) left` : ' · lifetime'}`);
  console.log(`${line}\n  …your real app starts here…\n`);
};
const lockScreen = (st) => {
  console.log(`\n${line}\n  🔒 Sample Billing Desk is locked\n${line}`);
  console.log(`  ${st.message}`);
  if (st.buyUrl) console.log(`  Buy a licence: ${st.buyUrl}`);
  console.log('  Enter your licence key below (or press Enter to quit).\n');
};

(async () => {
  const argKey = process.argv.indexOf('--key') > -1 ? process.argv[process.argv.indexOf('--key') + 1] : null;
  if (argKey) {
    const st = await lic.activate(argKey);
    if (st.allowed) return runApp(st);
    lockScreen(st);
    return process.exit(2);
  }
  let st = await lic.check();
  if (st.allowed) return runApp(st);
  lockScreen(st);
  if (!process.stdin.isTTY) return process.exit(2);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = () => rl.question('  Licence key: ', async (k) => {
    if (!k.trim()) { rl.close(); return process.exit(2); }
    st = await lic.activate(k);
    if (st.allowed) { rl.close(); return runApp(st); }
    console.log(`  ✖ ${st.message}\n`);
    return ask();
  });
  return ask();
})();
