# Smart School Transport

Ports: **Backend 3064** (local) · **4034** (production PM2) · **Frontend 3065** / **6131** · slug `transport` · UI `https://transport.shuleplus.rw` · API `https://transport-api.shuleplus.rw`

Core UI: dashboard, fleet, routes, learners, route attendance, boarding history, and parent notifications.

```bash
cd Transport/Backend
cp .env.example .env
# Set JWT_ACCESS_SECRET to the same value as Authentication/Backend/.env
npm install
npx prisma generate
npm run dev                   # :3064 — creates transport_db and schema on first run

cd ../Frontend
cp .env.example .env.local
npm install
npm run dev                   # :3065
```

Open from Organization Admin, or `http://localhost:3065/dashboard?token=...`

### Install as app (PWA)

**Why you might not see the Chrome address-bar install icon:** Chrome only offers install when the manifest + service worker are valid, the page is served over HTTPS (localhost counts), and its **engagement rules** are met (often: visit twice with a short gap, or interact with the site). The omnibox icon is easy to miss — use **Install app** in the left sidebar instead.

On **HTTPS** (or localhost), use **Install app** in the sidebar (or the bottom banner when it appears). The installed app opens at `/dashboard` with name **ShulePlus Transport** and the yellow icon.

**Check installability:** DevTools → **Application** → **Manifest** (no errors) and **Service workers** ( `/sw.js` active). If the worker just registered, **refresh once**. For the most reliable test: `npm run build && npm run start` (production mode).

If you are not signed in, the app sends you to ShulePlus **login** and returns here with your session (`?module=transport` on IAM login). Requires `NEXT_PUBLIC_IAM_URL` and `NEXT_PUBLIC_MODULE_SLUG=transport` in Frontend `.env.local`.

App icons use **`public/yellow-icon.png`** (transparent PNG). After changing the file, run `Frontend/scripts/generate-pwa-icons.ps1` to refresh `public/icons/`.

To fully reset PWA state (service worker + caches) after removing the app from your device, open once: `http://localhost:3065/dashboard?reset-pwa=1`

After pulling schema changes: `npx prisma generate` and `npx prisma db push` in `Transport/Backend`.

**Route Attendance** (`/route-attendance`): manual, QR, and RFID for the four journey events. Uses `/attendance/*` APIs and the same parent notification pipeline as tap/boarding.

**Parent notifications** need `PARENT_MIS_API_URL` and `INTERNAL_CHAT_API_URL` on the backend (see `.env.example`). SMS delivery status is written when queued notifications finish sending; Parent MIS stores `smsStatus` / `pushStatus` on transport alerts.

**Parent portal queue** (`/parent-portal`): approve or reject route change requests and triage issue reports submitted from Parent MIS (`/transport`). Requires Parent MIS service API (`SERVICE_API_KEY` matching on both sides).

All fleet, routes, and learner data come from your organization — register buses, routes, and enrollments in the module UI.

## Parent MIS transport portal (parents)

Parents use **Parent MIS** at `/transport` (port **3049**): Leaflet route map, Kinyarwanda-first copy (`/transport/settings`), transport alerts with SMS/push badges (`/transport/notifications`), change requests, and persisted issue reports.

Parent MIS backend after schema changes:

```bash
cd ParentMIS/Backend
npx prisma generate
npx prisma db push
```

Set `TRANSPORT_API_URL` on Parent MIS backend and `PARENT_MIS_API_URL` on Transport backend with the same `SERVICE_API_KEY`.

## Route maps (open stack, no API keys)

The transport module uses a **provider-neutral** map stack suitable for long-term production:

| Layer | Technology | Config |
| --- | --- | --- |
| Map UI | **Leaflet** | Frontend |
| Basemap tiles | **OpenStreetMap** public tile servers (default: `osm`) | `NEXT_PUBLIC_MAP_TILE_PRESET` (`osm`, `hot`, `opentopo`) |
| Geocoding | **Nominatim** (or compatible) | `NOMINATIM_URL` on Backend |
| Road routing | **OSRM** | `OSRM_URL` on Backend |

The browser **never** calls Nominatim/OSRM directly. Authenticated requests go through Transport API (`/map/places/*`, `/map/route`) with basic rate limits and a proper `User-Agent` for Nominatim policy compliance.

For production at scale, run **your own** OSRM and Nominatim instances and set the URLs in `Transport/Backend/.env`. No Google Maps or other paid tile keys are required.

## Production deploy (server — same pattern as ParentMIS)

On `mopas-srv-01` (or your VPS), from the repo root:

```bash
cd /root/apps/shuleplus/ShulePlus
git fetch origin && git reset --hard origin/main

# Fixes P1010 (wrong postgres password in .env.example) + schema + redeploy
bash scripts/fix-transport-db.sh

# Parent portal bus map / alerts (needs TRANSPORT_API_URL → loopback :4034)
bash scripts/redeploy-module.sh ParentMIS
```

If `bash scripts/redeploy-module.sh Transport` prints **Usage** only, your checkout is missing Transport in `redeploy-module.sh` — `git pull` to latest `main` first.

The `shuleplus-iam-db` Docker message is harmless when Postgres runs on the host and `psql -U postgres -h localhost` works.

If the browser shows **`NET::ERR_CERT_COMMON_NAME_INVALID`** on `https://transport.shuleplus.rw`, PM2 is fine — nginx/TLS is not:

```bash
cd /root/apps/shuleplus/ShulePlus
git pull --ff-only origin main
sudo bash scripts/ensure-shuleplus-tls.sh    # add transport* to the shuleplus.rw cert SAN
sudo bash scripts/generate-nginx-modules.sh  # transport.conf → :6131 / :4034
```

Confirm DNS A records for `transport` and `transport-api` point at the server (same as `parents.shuleplus.rw`).

### Wrong app (Academic on `transport.shuleplus.rw/home`)

Transport uses **`/dashboard`**. If you see **Academic** and **`/home`**, nginx has no `transport.conf` (or it proxies to the wrong port). The hostname falls through to the **default** vhost, which serves Academic static files.

```bash
git fetch origin && git reset --hard origin/main
sudo bash scripts/generate-nginx-modules.sh | grep transport
ls -la /etc/nginx/sites-enabled/transport.conf
grep proxy_pass /etc/nginx/sites-available/transport.conf   # → localhost:6131 and :4034

curl -s http://127.0.0.1:6131/dashboard | head -5            # must NOT say "Academic Dashboard"
pm2 describe transport-web                                   # cwd should be .../Transport/Frontend
```

Open **`https://transport.shuleplus.rw/dashboard`**, not `/home`.

**Backend `.env` on server** (redeploy patches most keys): copy `Transport/Backend/.env.example`, set `JWT_ACCESS_SECRET` and `SERVICE_API_KEY` to match `Authentication/Backend/.env`, and set a production `DATABASE_URL` for `transport_db`.
