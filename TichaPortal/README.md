# TichaPortal (Teacher Portal)

React + Vite frontend with an Express **BFF** (`backend/`) that talks to IAM, Timetable, Academic, Student Management, HR, Payroll, and other Shule+ modules.

| | Local | Production |
|---|-------|------------|
| Frontend | http://localhost:5173 | https://ticha.shuleplus.rw |
| BFF API | http://localhost:4000 | https://ticha-api.shuleplus.rw (PM2 `ticha-api`) |

## Quick start (local)

**Linux / macOS / server shell:**

```bash
bash scripts/run-ticha-portal.sh
```

**Windows (PowerShell):**

```powershell
.\scripts\run-ticha-portal.ps1
```

This writes `TichaPortal/backend/.env` with all linked module URLs (same keys as production), syncs `JWT_ACCESS_SECRET` from Authentication when present, and starts:

- BFF on **:4000**
- Vite on **:5173**

### Other commands

```bash
bash scripts/run-ticha-portal.sh backend   # BFF only
bash scripts/run-ticha-portal.sh check     # probe module links
node scripts/check-ticha-portal-links.mjs  # same check
node scripts/check-module-ports.mjs        # all platform ports
```

## Production (server)

After pushing to `main`, CI redeploys changed modules. Manual redeploy:

```bash
cd /root/apps/shuleplus/ShulePlus
git pull
bash scripts/redeploy-module.sh true TichaPortal
pm2 restart ticha-api --update-env
pm2 save
```

`redeploy-module.sh` patches `TichaPortal/backend/.env` with production loopback URLs:

- `IAM_API_URL=http://localhost:4001/api/v1`
- `TIMETABLE_API_URL=http://localhost:4014/api`
- `ACADEMIC_API_URL=http://localhost:4002/api`
- `STUDENT_MANAGEMENT_API_URL=http://localhost:4024/api`
- …and HR, Payroll, Attendance, KaziAvance, Discipline, Babyeyi

Frontend is built to `TichaPortal/dist` and served by Nginx at `ticha.shuleplus.rw`.

## Environment

| File | Purpose |
|------|---------|
| `backend/.env.example` | All BFF upstream URLs + JWT |
| `TichaPortal/.env.development` | Vite proxy → BFF (auto-written by run script) |

BFF health (shows configured upstreams):

```bash
curl http://localhost:4000/api/health
```

## Linked modules

The BFF reads URLs from `backend/.env` (see `backend/src/lib/env.js`). Teacher features call Timetable, Student Management, Academic, HR, Payroll, etc. through this layer — **not** the legacy TeacherPortal app on :3009.

## PWA

- `public/manifest.webmanifest` + `public/icons/*` — install metadata and icons.
- `public/sw.js` — app-shell caching + Web Push. API calls are never cached. Bump `VERSION` to force a cache refresh.
- `src/utils/pwa.js` — install detection (iOS / Android / desktop), snooze logic, SW registration.
- `src/components/PwaPrompts.jsx` — install dialog (with iOS Add-to-Home-Screen guide) and "new version" banner.
- Re-open the dialog from anywhere (e.g. a sidebar "Install app" item): `window.dispatchEvent(new Event('ticha:open-install-guide'))`.
- The service worker only registers in production builds: test with `npm run build && npm run preview`. Needs HTTPS (or localhost).
