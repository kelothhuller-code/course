# Software versions, downloads and "Buy now"

Upload installers (ZIP, EXE, MSI, …) for each software product in the admin panel. Visitors
download the latest version straight from the product page, and **Buy now** opens the
one-page checkout.

## Uploading a version (admin)

Admin panel (`/wide-hq-portal`) → **Software** → **Edit** → **Versions & downloads**.

1. Pick the file. Allowed types: `.zip .exe .msi .msix .dmg .pkg .apk .appimage .deb .rar .7z`.
   The platform is guessed from the extension, and the version from the file name.
2. Check the version (e.g. `2.4.1`), platform, release date, minimum requirements and the
   release notes ("What's new", Markdown).
3. Leave **Publish now** and **Mark as latest** ticked, then click **Upload version**. A progress bar
   shows the upload. The browser has no time limit, so a 126 MB installer on a slow line is fine.

The server stores the file under a new unique name, records its size and **SHA-256**, and shows it
in the list. From the list you can **Edit notes**, **Mark latest**, **Publish / Unpublish** and
**Delete** (with a confirmation).

* **Uploading a new version never removes or overwrites older files.** Every published version stays
  downloadable in the version history, under the same access rules, until you delete it.
* "Latest" is per platform. The newest published version marked latest is what **Download now**
  gives. Unpublishing a version also removes its "latest" mark.
* Unpublished versions are never shown or downloadable for the public. Admins can still download them.
* Deleting a product does not delete its version files (delete the versions first if you want the
  disk space back).

### Who can download

The **Allow free trial download before purchase** switch (per product, on by default):

| Switch | Visitors | Signed-in non-buyers | Buyers / licence owners | Admin |
|---|---|---|---|---|
| On (default) | ✅ | ✅ | ✅ | ✅ |
| Off | sign in first | ❌ (403) | ✅ | ✅ |

Turn it **off** for paid software that does not check a trial or licence key itself; otherwise
anyone can install the full version for free.

With the switch off, the dashboard ("My software") gets a short-lived signed link (10 minutes) from
`?format=json`, so the browser downloads natively and never holds the file in memory.

Products with no uploaded versions keep the older single "download package" behaviour (buyers only).

## Buy now

* Software with **licence plans**: **Buy now** opens `/checkout/software/<slug>`, preselected when
  there is one plan, with a plan picker when there are several.
* Software **without plans** but with a price (e.g. Wide Tech POS Billing, ₹29,999 → ₹18,999): **Buy now**
  opens the same checkout with one **Standard licence**: the product's price (the discounted price
  when it is lower), 1 device, lifetime. "Subscription monthly/yearly" pricing types issue
  monthly/yearly licences, which can be renewed from the dashboard. Add plans in admin for other
  terms (more devices, yearly, …). The server prices every order. The browser only says what is
  being bought.
* Only **quote-only** software (pricing type "quote", or no price) shows **Request a quote**, which
  goes to the enquiry form.

Buy now appears on the product page, the software list cards and the home-page software section.
Dashboard renewals already use the checkout.

## The download URL

`GET /api/software/<slug-or-id>/download?version=&platform=`

* No `version` gives the latest. `platform` is `windows|macos|linux|android|any`.
* Served as `Content-Disposition: attachment` with the original file name, `Content-Length`,
  `Accept-Ranges` (resumable), `X-Checksum-SHA256`, `Cache-Control: private, no-store`.
* Streamed from disk. Rate-limited to 60 per 15 minutes per IP.
* Each download (not resumed range requests) adds 1 to the version's download count and records a
  first-party `software_download` event (no Google Analytics / Pixel).

## Server settings

| Env var | Default | What |
|---|---|---|
| `SOFTWARE_MAX_UPLOAD_MB` | `2048` | Max installer size for software uploads (versions, `/api/upload/software`, `/api/upload/multiple?type=software`). Normal image/file uploads stay at 100 MB. |
| `SOFTWARE_DOWNLOADS_DIR` | `backend/private_downloads` | Where version files are stored (outside `/uploads`, never served statically). |
| `UPLOAD_REQUEST_TIMEOUT_MIN` | `60` | Node request timeout for slow uploads. |

`backend/private_downloads/` is gitignored. Back it up with the database.

### nginx

Body size stays at 100M for the site. The software upload paths get 2048M, no request buffering
and 600 s timeouts. Downloads are streamed unbuffered. See `nginx-production.conf`. Add these
blocks **above** `location ^~ /api/` in the 443 server block of
`/etc/nginx/sites-available/widetech.in`, then run `sudo nginx -t && sudo systemctl reload nginx`:

```nginx
location ^~ /api/admin/software/ {
    client_max_body_size 2048M;
    proxy_request_buffering off;
    proxy_pass http://127.0.0.1:5001/api/admin/software/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 60s;
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;
    send_timeout 600s;
    client_body_timeout 600s;
}

location ^~ /api/upload/ {
    client_max_body_size 2048M;
    proxy_request_buffering off;
    proxy_pass http://127.0.0.1:5001/api/upload/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 60s;
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;
    send_timeout 600s;
    client_body_timeout 600s;
}

location ^~ /api/software/ {
    proxy_pass http://127.0.0.1:5001/api/software/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;
    send_timeout 600s;
}
```

If the site is ever put behind **Cloudflare**, note that the free plan caps request bodies at 100 MB.
Uploads larger than that would then need to go to the origin directly, or be split into chunks.

## Deploy

```bash
cd /var/www/course && git pull origin master
cd backend && npm ci && mkdir -p private_downloads && pm2 restart backend --update-env
cd ../frontend && npm ci && npm run build
# then the nginx blocks above + sudo nginx -t && sudo systemctl reload nginx
```

The existing product keeps its slug `wide-tech-pos-billing` and App ID `wide-pos-billing`. Nothing is
migrated or renamed.
