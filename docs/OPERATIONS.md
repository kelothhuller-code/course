# Operations notes (server owner)

Steps to take on the live server after deploying the premium user dashboard (PR "premium-user-dashboard").

## 1. Install dependencies and build

```bash
cd backend && npm ci
cd ../frontend && npm ci && npm run build   # adds the "qrcode" package used on certificates
```

## 2. Check the `transactions.txnid` index (read-only, one time)

The Transaction model declared the `txnid` index twice (once as `unique: true` on the field and once
as a plain index). Mongoose warned about the duplicate on every start. The code now declares it only
once (unique). Nothing changes in the database automatically, so check what you have:

```bash
cd backend
MONGODB_URI="<your production URI>" node scripts/check-indexes.mjs
```

* `OK: txnid is unique` → nothing to do (expected for most installs).
* Not unique → take a backup, fix any duplicate txnids it lists, then in `mongosh`:

  ```js
  db.transactions.dropIndex("txnid_1")
  db.transactions.createIndex({ txnid: 1 }, { unique: true })
  ```

## 3. Environment variables

All are optional. Never commit real values.

| Where | Variable | Default | What it does |
| --- | --- | --- | --- |
| backend | `ALLOW_MOCK_PAYMENTS` | unset (off) | Enables fake test payments. **Leave unset in production.** It is ignored whenever `NODE_ENV=production`. |
| backend | `LICENSE_SELF_DEACTIVATE_PER_30D` | `3` | How many computers a buyer can remove from a licence themselves per 30 days (`0` = admin only). |
| backend | `SMTP_FROM_NAME` | `WideTech` | Sender name on emails. |
| frontend (build time) | `VITE_FOUNDER_SIGNATURE_URL` | unset | Optional signature image on certificates (e.g. `/signature.png` in `frontend/public`). |

Make sure the backend runs with `NODE_ENV=production` on the live server.

## 4. Certificates

* New certificates get unguessable IDs like `WTC-XXXX-XXXX-XXXX-XXXX` and a QR code that opens
  `https://<your site>/verify/<id>`. Certificates issued before this release keep their old IDs and still verify.
* Nginx must send `/verify/*` to the React app (the usual `try_files $uri /index.html;` already does).
