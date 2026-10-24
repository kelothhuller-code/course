# Site speed: what changed and what to do on the server

widetech.in runs on a server in France and most visitors are in India (~150–200 ms each way, so
every round trip costs ~0.35–0.4 s). The PR "site-speed" cuts the number of round trips and bytes:

| Area | Change |
| --- | --- |
| Backend | `compression` (gzip) for API responses; `Cache-Control: public, max-age=60` on public catalogue GETs (never for signed-in/user data, which is `private, no-store`); thumbnails cached 7 days |
| Backend | `GET /api/home` returns everything the homepage needs in **one** request (was 6–7), cached in memory for 60 s and cleared on admin edits |
| Backend | Uploaded course/catalogue images are resized to max 1600 px and saved as WebP (`sharp`) |
| Frontend | Homepage request starts before React renders; lazy video modal; image width/height/lazy loading; `fetchpriority=high` on the main image |
| Frontend | Phones (≤768 px) and "reduce motion": no backdrop blur, lighter shadows, no looping animations. Desktop look unchanged |
| Frontend | `index.html` shows a light skeleton instantly instead of a blank page |
| nginx | gzip for all text/fonts, 1-year immutable cache for `/assets`, `index.html` never cached, `/api` and `/uploads` can no longer be hijacked by the static-file rule |

Old API endpoints (`/api/courses/showcase`, `/api/software`, …) still work unchanged.

---

## Server steps after merging (in this order)

Paths below assume the repo lives at `/var/www/course` (as in `nginx-production.conf`).
Adjust if yours is different.

### 1. Pull and install (sharp is a new dependency, so `npm ci` is required)

```bash
cd /var/www/course
git pull
cd backend && npm ci          # installs compression + sharp (prebuilt binary, no compiler needed)
node -e "require('sharp'); console.log('sharp OK')"
cd ../frontend && npm ci && npm run build
```

If `sharp OK` doesn't print, the site still works (uploads are just stored unoptimised), but fix
it with `npm rebuild sharp`.

### 2. Restart the backend

```bash
pm2 ls                       # find the backend's name
pm2 restart <backend-name>   # e.g. pm2 restart server
pm2 logs <backend-name> --lines 20
```

Check: `curl -s https://widetech.in/api/home | head -c 200` returns JSON with `"success":true`.

### 3. Update nginx (merge, don't overwrite)

Your live site file (usually `/etc/nginx/sites-available/widetech.in` or `default`) has SSL lines
that Certbot manages. **Keep those** and copy only these parts from `nginx-production.conf` into
the `server { listen 443 ... }` block:

1. Back up: `sudo cp /etc/nginx/sites-available/widetech.in ~/widetech.nginx.bak`
2. Replace the gzip lines with the `# Compression` block (`gzip on;` … `gzip_types …;`).
3. Change `location /api/ {` → `location ^~ /api/ {` and `location /uploads/ {` → `location ^~ /uploads/ {`.
   Remove any `expires`/`add_header Cache-Control` lines inside `/uploads/` (the backend sends them now).
4. Replace the old "static assets" `location ~* \.(?:css|js|…)$` block with the four blocks from
   the file: `location ^~ /assets/`, `location ^~ /fonts/`, the `location ~* \.(?:css|js|…)$`
   (1 day) block and `location = /index.html`.
5. Make sure the 443 `listen` lines have `http2` (or, on nginx ≥ 1.25.1, add `http2 on;`).
   Leave `ssl_certificate*` and `include /etc/letsencrypt/...` lines exactly as they are.
6. Test and reload:

```bash
sudo nginx -t                  # must say "syntax is ok" and "test is successful"
sudo systemctl reload nginx    # only if the test passed
```

If `nginx -t` fails, restore the backup (`sudo cp ~/widetech.nginx.bak /etc/nginx/sites-available/widetech.in`).

Optional Brotli (~15 % smaller than gzip): `sudo apt install libnginx-mod-http-brotli-filter libnginx-mod-http-brotli-static`,
uncomment the `brotli` lines, then `nginx -t` and reload again.

### 4. Optimise the images already uploaded (one time)

Back up first, then do a dry run (changes nothing), then apply:

```bash
cd /var/www/course/backend
mongodump --uri="$MONGODB_URI" --out ~/backup-before-webp-$(date +%F)   # or your usual backup
tar czf ~/thumbnails-$(date +%F).tgz public/uploads/thumbnails

node scripts/optimize-uploads.mjs            # DRY RUN: lists what would change
node scripts/optimize-uploads.mjs --apply    # writes .webp files + updates image links in the DB
```

* It reads `MONGODB_URI` from `backend/.env` (or the environment).
* Only images > 100 KB or wider than 1600 px are converted; each gets a `.webp` **next to** the
  original. The originals are **never deleted**.
* Links in courses, events, software, services and trial tutorials are updated to the `.webp`.
  Other collections are only read: originals still mentioned there are listed as "keep".
* Safe to run again (existing `.webp` files are reused). Options: `--min-kb=200`, `--max-width=1400`,
  `--quality=75`, `--no-db` (only write files).
* After checking the site, you may delete the originals it lists as unused (you have the backup).

### 5. Check it worked

```bash
# HTML, JS and API compressed? (expect "content-encoding: gzip" or "br")
curl -sI -H 'Accept-Encoding: gzip, br' https://widetech.in/ | grep -i -E 'content-encoding|cache-control'
JS=$(curl -s https://widetech.in/ | grep -oE '/assets/index-[^"]+\.js' | head -1)
curl -sI -H 'Accept-Encoding: gzip, br' "https://widetech.in$JS" | grep -i -E 'content-encoding|cache-control'   # immutable
curl -sI -H 'Accept-Encoding: gzip' https://widetech.in/api/home | grep -i -E 'content-encoding|cache-control'   # max-age=60
curl -s -o /dev/null -w '%{time_total}s\n' https://widetech.in/api/home
```

Then open the homepage on a phone; it should show a grey skeleton immediately instead of a blank page.

---

## Settings (optional, backend env)

| Variable | Default | What it does |
| --- | --- | --- |
| `HOME_CACHE_TTL_MS` | `60000` | How long `/api/home` is kept in memory. `0` turns the cache off. Admin edits clear it immediately. |
| `IMAGE_MAX_WIDTH` | `1600` | Max width for uploaded images. |
| `IMAGE_WEBP_QUALITY` | `80` | WebP quality for uploaded images. |

---

## Biggest remaining win: Cloudflare (free plan)

The server is far from India, so a CDN with Indian edge locations (Mumbai, Chennai, Delhi, …)
removes most of the distance for static files and TLS setup:

1. Add the site at cloudflare.com (Free), import DNS, then change the nameservers at your domain
   registrar. Keep the `A` record for `widetech.in`/`www` **Proxied** (orange cloud).
2. SSL/TLS → mode **Full (strict)** (your Let's Encrypt certificate stays on the server).
3. Speed → Optimization: turn on **Brotli**, **HTTP/3**, **Early Hints**. Leave Rocket Loader **off**
   (it breaks React apps).
4. Caching → Cache Rules:
   * `/assets/*` → Eligible for cache, Edge TTL "use origin" (1 year immutable).
   * `/uploads/thumbnails/*` and `/api/uploads/thumbnails/*` → Eligible for cache, Edge TTL 7 days.
   * Everything else under `/api/` → **Bypass cache** (payments, logins and user data must never be cached).
5. Payment gateway webhooks/callbacks keep working through Cloudflare; if a gateway allow-lists
   IPs, check its docs.
6. Real visitor IPs: in nginx add `real_ip_header CF-Connecting-IP;` plus Cloudflare's `set_real_ip_from`
   ranges (https://www.cloudflare.com/ips/), so rate limits keep working per visitor.

Alternative if you'd rather not use a CDN: move the VPS to an Indian region (e.g. Contabo/other
provider in Mumbai), which brings API response times down too.
