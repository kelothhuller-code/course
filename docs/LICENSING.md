# Software licensing, paid services and GST

This guide explains, in plain language, how selling software licences and paid services works on
widetech.in, how to set it up, and how to add the licence check to a desktop app.

- [1. What you get](#1-what-you-get)
- [2. One-time server setup (keys and env vars)](#2-one-time-server-setup-keys-and-env-vars)
- [3. Setting up a product in the admin panel](#3-setting-up-a-product-in-the-admin-panel)
- [4. Paid services](#4-paid-services)
- [5. GST](#5-gst)
- [6. How the licence check works](#6-how-the-licence-check-works)
- [7. Adding the check to your app (SDKs)](#7-adding-the-check-to-your-app-sdks)
- [8. Licence API reference](#8-licence-api-reference)
- [9. Day-to-day admin tasks](#9-day-to-day-admin-tasks)
- [10. Security notes](#10-security-notes)
- [11. Things to confirm with your CA](#11-things-to-confirm-with-your-ca)

---

## 1. What you get

**Software**
- A free trial (default 7 days), started automatically the first time someone opens your app.
  One trial per computer per product. Reinstalling the app does **not** give a new trial.
- Paid plans you define (for example Monthly, Yearly, Lifetime), bought on the website with the
  same checkout and Razorpay flow as courses. Guests can buy without an account; one is created.
- A licence key like `WT-7K2QF-M9XAB-3HC4D-PR8TV`. It is shown on the success page, emailed with
  the GST invoice and listed in the buyer's dashboard. Keys are stored encrypted plus hashed and are
  never written to logs.
- A key works on a set number of computers ("devices per key", default 1).
- Renewing a key adds time to it (the key stays the same).
- A public licence API (`/api/license/v1`) that your app calls. Every answer is digitally signed, so a
  fake server or an edited answer cannot unlock the app.

**Services**
- Each service is sold one of three ways: **Fixed price** (Buy now), **Quote** (enquiry form only), or
  **Both** (Basic / Standard / Premium packages plus "Need something custom? Get a quote").
- A paid service creates a **service order** (Paid → In progress → Delivered / Closed). The buyer gets
  an email saying you will contact them to schedule, and you get a notification email.

---

## 2. One-time server setup (keys and env vars)

Run this once, on your own computer or the server:

```bash
cd backend
npm run license:keypair      # same as: node scripts/generate-license-keypair.mjs
```

It prints three values. Nothing is saved to disk.

| Value | Where it goes | Secret? |
| --- | --- | --- |
| `LICENSE_SIGNING_PRIVATE_KEY` | Server `.env` / hosting secrets only | **Yes, keep it private** |
| `LICENSE_KEY_SECRET` | Server `.env` / hosting secrets only | **Yes, keep it private** |
| `LICENSE_SIGNING_PUBLIC_KEY` | Pasted into your desktop app (and optionally `.env`) | No, it is public |

Add to the server's `backend/.env` (see `backend/.env.example`):

```ini
LICENSE_SIGNING_PRIVATE_KEY=...      # from the script
LICENSE_KEY_SECRET=...               # from the script
# Optional
# LICENSE_SIGNING_PUBLIC_KEY=...     # only used by GET /api/license/v1/public-key
# LICENSE_RATE_LIMIT_PER_MIN=60      # licence API calls per IP per minute
# LICENSE_FAIL_LIMIT=20              # wrong keys per IP per 15 minutes
# INVOICE_SERIES=legacy              # legacy (default) or sequential, see section 5
# ENQUIRY_NOTIFY_EMAIL=you@example.com   # gets "new service order" emails (already used for enquiries)
```

Then restart the backend.

Important:
- **Never commit `.env`** and never put the private key or `LICENSE_KEY_SECRET` inside an app.
- **Back up both secrets** somewhere safe (a password manager). If you lose the private key, every
  app needs an update with a new public key. If you lose `LICENSE_KEY_SECRET`, existing keys still
  validate (they are checked by hash), but they can no longer be shown again in the dashboard or admin.
- In production the server refuses to sign anything without `LICENSE_SIGNING_PRIVATE_KEY`. In local
  development it uses a temporary key and prints a warning.
- Razorpay keys and settings are unchanged; licence sales use the existing Razorpay setup.

---

## 3. Setting up a product in the admin panel

Admin → **Software** → Edit (or Add software) → section **Online licensing, free trial and plans**.

1. Tick **Sell licence keys for this software**.
2. **App ID**: a short permanent name your app sends to the server, e.g. `billing-desk`. It is
   filled from the slug if left empty. Do not change it after you ship the app.
3. **Offer a free trial**: tick it and set **Trial length (days)** (default 7). Add a **Trial download link**
   (or tick "…or let anyone download the package uploaded below") so the website can offer
   **Start free 7-day trial**.
4. **Plans**: add one row per plan:
   - **Plan name**: e.g. Monthly
   - **Price (₹)**
   - **Billing**: Monthly, Yearly, Lifetime or Custom days
   - **Devices per key** (default 1)
   - **What's included**: one item per line
   - **On sale**: untick to hide a plan without deleting it
   - Optional per-plan GST settings
5. **GST (software)**: rate, inclusive/exclusive and HSN/SAC for this product (see section 5).
6. Save. The public page `/software/<slug>` now shows the trial button and the plan cards with **Buy**.

Changing a plan's price only affects new purchases. Existing keys keep their expiry and devices.

---

## 4. Paid services

Admin → **Services** → Edit → **How customers buy this service**:

| Mode | What the visitor sees | List card |
| --- | --- | --- |
| Fixed price | Price + **Buy now** (uses the Price field, or one package) | `₹X` |
| Quote | Only the **Get a quote** enquiry form | `Get a quote` |
| Both | Package cards with **Buy** + "Need something custom? **Get a quote**" | `From ₹X` |

Each package has a name, price, optional offer price, deliverables, delivery time and optional GST settings.

Quote requests go to **Contact Inquiries** with the service already selected, as before.

Paid orders appear in Admin → **Service orders**:
- Change the status (Paid → In progress → Delivered / Closed).
- Add internal notes.
- Export a CSV with the GST breakdown.

---

## 5. GST

- Every course, software plan and service package has a **GST rate** (default: the rate in GST
  settings, normally 18%) and an **inclusive / exclusive** flag (default: inclusive).
  - *Inclusive*: the price already contains GST. ₹4,999 → taxable ₹4,236.44 + GST ₹762.56.
  - *Exclusive*: GST is added on top. ₹3,999 → GST ₹719.82 → buyer pays ₹4,718.82.
- **Place of supply** comes from the buyer's state on checkout:
  - Same state as the seller (GST settings, normally Kerala): **CGST + SGST** (half each).
  - Other state: **IGST**.
- All amounts are calculated **on the server** and rounded to the paise. The website only shows a preview.
- Buyers can enter an optional **GSTIN**. It is format- and checksum-validated and printed on the invoice.
- Every software purchase, renewal and service order gets a **GST invoice**, numbered in the **same
  series as course invoices**:
  - `INVOICE_SERIES=legacy` (default): the existing `INV-xxxxxx-nnn` numbers, unchanged.
  - `INVOICE_SERIES=sequential`: gap-free numbers like `WT/26-27/00001`, restarting each financial
    year. The prefix comes from `INVOICE_PREFIX`. Switching is a decision for you and your CA; do it
    at the start of a financial year.
- **HSN/SAC** is per item and **blank by default** (TODO for you). The invoice shows "—" until you
  set it, and the admin shows "SAC: TODO". Courses keep the existing SAC from GST settings.
  Possible codes to discuss with your CA (**verify with your CA, do not rely on this list**):
  - Software licence / right to use software: 997331
  - Software downloaded online: 998434
  - IT consulting / support: 998313
  - IT design and development: 998314
  - Business / administrative support: 998599

---

## 6. How the licence check works

**On every launch** your app does this (the SDKs do it all in one call: `check()`):

```
             ┌──────────────── app starts ────────────────┐
             │                                            │
     saved licence key?                                   │
        │yes                        │no                   │
   POST /validate              POST /trial                │
        │                           │                     │
        └──── signed answer ────────┘                     │
                     │                                    │
       verify signature with the EMBEDDED public key,     │
       check nonce, deviceId, appId                        │
                     │                                    │
       status active / trial and not expired?             │
           │yes                        │no                │
       run the app              show lock screen:         │
                                "Enter licence key" / Buy │
                                → POST /activate          │
```

- **Strict online (default)**: the app must reach the server at every launch. No internet → locked.
  This is the safest option.
- **Offline grace (optional)**: set `offlineGraceHours` (e.g. 24–72). If the server cannot be reached,
  the app may run on its last **signed** answer for that many hours. Signature errors never fall back
  to the cache; only network errors do.
- **Device id**: built from the operating system's machine id:
  - Windows: MachineGuid
  - macOS: IOPlatformUUID
  - Linux: /etc/machine-id

  It is hashed with your App ID. It stays the same when the app is reinstalled, which is why
  reinstalling does not reset the trial.
- **Clock tampering**: every answer includes `serverTime`. The SDK remembers the newest server time
  it has seen. If the computer clock is set back, offline grace stops working and the app asks to go
  online. Expiry is always judged by the server's clock, not the computer's.
- **Replay protection**: each request sends a random `nonce`, and the signed answer must contain it.
  An old "active" answer cannot be replayed later.
- **No shared secrets in the app**: the app only holds the public key. Copying it out of the app
  does not let anyone sign answers.

Honest limit: no client-side check is uncrackable. Someone who patches your app's code can skip
the check. Signing stops fake servers and edited answers. Combine it with code obfuscation if needed.

---

## 7. Adding the check to your app (SDKs)

The SDKs are in `clients/`:

| Folder | For | Needs |
| --- | --- | --- |
| `clients/python` | Python desktop apps (Tkinter, PyQt, CLI) | `pip install cryptography` |
| `clients/node` | Node.js / Electron (main process) | Node 18+, no packages |
| `clients/csharp` | .NET / WinForms / WPF | BouncyCastle (via NuGet) |

Each has a demo lock screen (`demo_app.py`, `demo.js`, `DemoApp`).

You need three values:
- **API base**: `https://widetech.in/api/license/v1`
- **App ID**: from Admin → Software
- **Public key**: from `npm run license:keypair`

**Python**

```python
from widetech_license import LicenseClient
lic = LicenseClient(api_base="https://widetech.in/api/license/v1", app_id="billing-desk",
                    public_key="BASE64_PUBLIC_KEY", app_version="1.0.0")
state = lic.check()
if not state["allowed"]:
    # show your lock screen with state["message"]; when the user enters a key:
    state = lic.activate(user_entered_key)
```

**Node / Electron (main process)**

```js
const { LicenseClient } = require('./widetech-license');
const lic = new LicenseClient({ apiBase: 'https://widetech.in/api/license/v1', appId: 'billing-desk',
  publicKey: 'BASE64_PUBLIC_KEY', appVersion: app.getVersion() });
let state = await lic.check();
if (!state.allowed) { /* show lock window; then */ state = await lic.activate(keyFromUser); }
```

**C#**

```csharp
var lic = new LicenseClient(new LicenseOptions { ApiBase = "https://widetech.in/api/license/v1",
    AppId = "billing-desk", PublicKey = "BASE64_PUBLIC_KEY", AppVersion = "1.0.0" });
var state = await lic.CheckAsync();
if (!state.Allowed) { /* lock screen; then */ state = await lic.ActivateAsync(keyFromUser); }
```

The result tells you:
- `allowed`
- `status`: `active`, `trial`, `expired`, `revoked`, `invalid`, `device_limit`, `offline` or `clock_tampered`
- `message`: a friendly line for the lock screen
- `plan`, `expiresAt`, `daysLeft` and `buyUrl`

`deactivate()` frees this computer's slot, for example before moving to a new PC.

Try the demo against a local backend:

```bash
WT_API=http://localhost:5001/api/license/v1 WT_APP_ID=billing-desk WT_PUBLIC_KEY=... node clients/node/demo.js
python clients/python/demo_app.py --key WT-XXXXX-XXXXX-XXXXX-XXXXX
```

---

## 8. Licence API reference

`POST` JSON to `/api/license/v1/<endpoint>`:

| Endpoint | Body |
| --- | --- |
| `trial` | `softwareSlug` (App ID), `deviceId`, `deviceName?`, `appVersion?`, `nonce` |
| `activate` | the above + `licenseKey` |
| `validate` | the above + `licenseKey` |
| `deactivate` | `softwareSlug`, `licenseKey`, `deviceId`, `nonce` |

The answer is `{ "payload": "<JSON string>", "signature": "<base64>", "alg": "Ed25519" }`.

The payload contains:
- `status`: `active`, `trial`, `expired`, `revoked`, `invalid` or `device_limit`
- `message`, `plan`, `expiresAt` (null = lifetime) and `serverTime`
- `nonce`, `deviceId` and `appId`
- `maxDevices`, `devicesUsed` and `buyUrl`

Results like expired or device limit are HTTP 200 with a signed payload. Errors and limits:
- Bad input: HTTP 400.
- Too many requests: HTTP 429. The default limit is 60 per minute per IP.
- Wrong keys: blocked after 20 failures in 15 minutes per IP.

### POS admin PIN reset (support)

When a shop owner forgets the POS admin PIN, support generates a one-time reset code in
Admin → **POS PIN reset** (`/wide-hq-portal/`, or whatever `ADMIN_SECRET_PATH` is set to).
No PIN is ever sent to the server and nothing is stored on the POS side by the server.

**1. Request code** (shown by the POS):

```
WTR1-<base64url(JSON)>          base64url = RFC 4648 §5 alphabet, no "=" padding
JSON = {"a":"<appId>","d":"<deviceId>","n":"<nonce>","t":<unix seconds>}
```

- `a`: the product's App ID (Admin → Software → App ID), same value the app sends as `softwareSlug`.
- `d`: the 64-hex SHA-256 device id the app sends to `/activate`.
- `n`: 16 random bytes, base64url (22 characters).
- `t`: integer unix time (seconds) when the code was shown.

**2. Reset code** (typed into the POS):

```
WTP1-<base64url(64-byte Ed25519 signature)>
signed message (UTF-8, exact): wt-pin-reset-v1|<appId>|<deviceId>|<nonce>
```

It is signed with the **same** `LICENSE_SIGNING_PRIVATE_KEY` as licence responses, so the POS
verifies it with the public key it already embeds. `appId`, `deviceId` and `nonce` are used exactly
as they appear in the request code (no case changes).

**3. POS checks:** valid signature with the embedded key, nonce equals the one it showed, the code
is used once, it is less than 7 days old, and it is for this device. The server additionally rejects
request codes whose `t` is more than 7 days old or more than 10 minutes in the future (HTTP 400 with
a message telling support to ask for a new code / fix the POS clock).

**API** (admin login required, rate-limited to 20 codes per 15 minutes per admin, `PIN_RESET_LIMIT`):

| Endpoint | Body / result |
| --- | --- |
| `POST /api/license/v1/admin/pin-reset` | `{ "requestCode": "WTR1-…" }` → `{ resetCode, appId, deviceId, nonce, requestedAt, activationFound, licence?, customer? }` |
| `GET /api/license/v1/admin/pin-reset/history` | last 50 audit entries |

- Malformed code → 400, unknown App ID → 404, not admin → 401/403.
- If the device has an activation for that product, the licence (key, plan, status) and customer
  (name, email) are returned so support can confirm who is asking. If not, the code is still
  generated but `activationFound` is `false` and the page shows a warning.
- Every generated code is logged in the `pin_reset_audits` collection (admin id/email, appId,
  deviceId, nonce, licence id + last 5 characters, activationFound, IP, time). The full licence key
  and the private key are never logged or returned.

**C# verification on the POS** (BouncyCastle, same as `clients/csharp`; `PublicKey` is the same
base64 raw 32-byte Ed25519 key passed to `LicenseOptions.PublicKey`):

```csharp
using System;
using System.Text;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Crypto.Signers;

public static class PinReset
{
    static string B64UrlEncode(byte[] b) => Convert.ToBase64String(b).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    static byte[] B64UrlDecode(string s)
    {
        s = s.Replace('-', '+').Replace('_', '/');
        switch (s.Length % 4) { case 2: s += "=="; break; case 3: s += "="; break; case 1: throw new FormatException(); }
        return Convert.FromBase64String(s);
    }

    /// <summary>Builds the request code to show. Keep `nonce` and `t` (and mark the nonce unused) until a reset code is accepted.</summary>
    public static string MakeRequestCode(string appId, string deviceId, string nonce, long t) =>
        "WTR1-" + B64UrlEncode(Encoding.UTF8.GetBytes(
            System.Text.Json.JsonSerializer.Serialize(new { a = appId, d = deviceId, n = nonce, t })));

    public static string NewNonce()
    {
        var b = new byte[16];
        using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create()) rng.GetBytes(b);
        return B64UrlEncode(b);
    }

    /// <summary>True when `resetCode` was signed by WideTech for this app, device and nonce.</summary>
    public static bool Verify(string resetCode, string publicKeyBase64, string appId, string deviceId, string nonce)
    {
        resetCode = (resetCode ?? "").Trim();
        if (!resetCode.StartsWith("WTP1-", StringComparison.Ordinal)) return false;
        byte[] sig;
        try { sig = B64UrlDecode(resetCode.Substring(5)); } catch { return false; }
        if (sig.Length != 64) return false;
        var pub = new Ed25519PublicKeyParameters(Convert.FromBase64String(publicKeyBase64), 0);
        var msg = Encoding.UTF8.GetBytes($"wt-pin-reset-v1|{appId}|{deviceId}|{nonce}");
        var v = new Ed25519Signer();
        v.Init(false, pub);
        v.BlockUpdate(msg, 0, msg.Length);
        return v.VerifySignature(sig);
    }
}
// After Verify(...) is true: check the stored request time is < 7 days old, then delete the stored
// nonce (single use) and let the owner set a new admin PIN.
```

---

## 9. Day-to-day admin tasks

Admin → **Licences**:
- **Search** by full key, last 5 characters, email or name. Filter by status or product. **Export CSV**
  (includes the GST breakdown).
- **Manage** a key:
  - Show the key.
  - **Extend** by N days, or **Make lifetime**.
  - Change the max devices.
  - **Reset devices**, or remove one computer.
  - **Revoke** (with a reason) or **Un-revoke**.
  - See payments with GST.
  - Add notes.
- **Trial usage**: see which computers used a trial. Use "Allow new trial" for a goodwill exception.
- **Issue a key**: give a key manually (for example for a bank transfer or a replacement). The key is
  shown once and can be emailed to the customer.

Admin → **POS PIN reset**: paste the customer's `WTR1-` request code, check the app, device and
time, click **Generate reset code** and send the `WTP1-` code (see “POS admin PIN reset” in section 8).

Refunds: revoke the key in Licences, then process the refund as you do today. Revoked keys lock the
app at its next check (immediately in strict-online mode, or after the grace period).

---

## 10. Security notes

- Course checkout, signature verification, server-side price checks and test-mode protections are
  unchanged. Product orders use the same checks, and they are slightly stricter:
  - The payment signature must match the order's own Razorpay order id.
  - A key or login token is only returned for a signed payment.
- Prices always come from the database, never from the browser.
- The licence API validates and length-limits all input and is rate-limited.
- Licence keys are stored hashed (for lookup) and encrypted (to show them again). They are masked
  in lists and never logged.
- Admin licence and order routes require the admin login. All admin output is HTML-escaped.

---

## 11. Things to confirm with your CA

1. HSN/SAC codes for software licences, downloadable software and each service (section 5).
2. The GST rate for each product (18% is the default, not advice).
3. Whether software sold to buyers **outside India** is an export of services (zero-rated, LUT) and how
   to invoice it. Checkout currently assumes buyers in India.
4. Place of supply for B2B buyers: checkout uses the state the buyer selects. Ask whether it should
   follow the state code in their GSTIN instead.
5. Whether to switch to `INVOICE_SERIES=sequential` (gap-free per financial year) and from which date.
6. How to handle refunds of licences and services: credit notes, GST reversal and timing.
7. Whether renewals and multi-year or lifetime licences need different invoice wording or time-of-supply handling.
8. Whether service orders paid in advance need a receipt voucher before the invoice.
