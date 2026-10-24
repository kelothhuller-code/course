# Node.js / Electron licence client

No dependencies (uses Node's built-in `crypto`, Node 18+). Use it in the Electron **main** process,
not the renderer.

```js
const { LicenseClient } = require('./widetech-license');

const lic = new LicenseClient({
  apiBase: 'https://widetech.in/api/license/v1',
  appId: 'billing-desk',              // Admin → Software → App ID
  publicKey: 'BASE64_PUBLIC_KEY',     // from `npm run license:keypair` (safe to embed)
  appVersion: '1.0.0',
  // offlineGraceHours: 48,           // optional; default 0 = strict online
});

let state = await lic.check();        // every launch
if (!state.allowed) {
  // show the lock window with state.message / state.buyUrl, then:
  state = await lic.activate(keyFromUser);
}
```

Other options:
- `storageDir`
- `clockSkewSeconds` (default 300)
- `deviceName`
- `timeoutMs`

`lic.deactivate()` frees this computer's slot.

Demo:

```bash
WT_API=http://localhost:5001/api/license/v1 WT_APP_ID=your-app-id WT_PUBLIC_KEY=... node demo.js
node demo.js --key WT-XXXXX-XXXXX-XXXXX-XXXXX
```
