// Used by backend/tests/e2e/licensing.e2e.mjs — prints the licence state as JSON.
//   node e2e_driver.js check | activate <key> | deactivate
const { LicenseClient } = require('./widetech-license');

const lic = new LicenseClient({
  apiBase: process.env.WT_API,
  appId: process.env.WT_APP_ID,
  publicKey: process.env.WT_PUBLIC_KEY,
  storageDir: process.env.WT_STORAGE_DIR,
  deviceId: process.env.WT_DEVICE_ID,
  appVersion: 'e2e',
});
const [cmd, arg] = process.argv.slice(2);
(async () => {
  const out = cmd === 'activate' ? await lic.activate(arg) : cmd === 'deactivate' ? await lic.deactivate() : await lic.check();
  process.stdout.write(JSON.stringify(out));
})().catch((e) => { process.stdout.write(JSON.stringify({ error: e.message })); process.exit(1); });
