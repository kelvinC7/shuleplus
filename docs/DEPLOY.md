# Production deploy (GitHub → server)

Push to **`main`** triggers `.github/workflows/deploy.yml`, which runs on a **self-hosted runner** on the production server, `git pull`s, and rebuilds only changed modules.

> **Why not SSH from GitHub-hosted runners?** Port 22 on the server is not reachable from GitHub’s cloud runners (`dial tcp … i/o timeout`). Deploy uses a self-hosted runner instead so commands run locally on the box.

## Credentials (2 separate keys)

| Direction | Purpose | Where it lives |
|-----------|---------|----------------|
| Local PC → GitHub | Your push access | Personal SSH key in GitHub account settings |
| Server → GitHub | `git pull` on the box | **Read-only** deploy key on the repo |

Do not reuse one key for both.

---

## 1. Local → GitHub (push)

```bash
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/github_personal
```

Add `~/.ssh/github_personal.pub` at GitHub → **Settings → SSH and GPG keys**.

```bash
# PowerShell / Git Bash
git config core.sshCommand "ssh -i ~/.ssh/github_personal -o IdentitiesOnly=yes"
ssh -T git@github.com
git remote set-url origin git@github.com:theonesteIT/ShulePlusFullProject.git
git push origin main
```

---

## 2. Self-hosted runner + enable deploy

**On the production server** (as root):

```bash
mkdir -p /root/actions-runner && cd /root/actions-runner
# Download latest runner — pick linux x64 from:
# https://github.com/theonesteIT/ShulePlusFullProject/settings/actions/runners/new
curl -fsSL -o actions-runner.tar.gz -L https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz
tar xzf actions-runner.tar.gz
./config.sh --url https://github.com/theonesteIT/ShulePlusFullProject --token YOUR_ONE_TIME_TOKEN
./svc.sh install
./svc.sh start
```

Then in GitHub → **Settings → Secrets and variables → Actions → Variables**:

| Variable | Value |
|----------|--------|
| `DEPLOY_ENABLED` | `true` |

Until `DEPLOY_ENABLED=true` and a runner is online, pushes still run **detect-changes** but skip deploy (green workflow, no SSH timeout spam).

You can remove obsolete secrets `SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_USER`, `SSH_PORT` if they were set for the old SSH workflow.

---

## 3. Server → GitHub (`git pull`)

**On the server:**

```bash
ssh-keygen -t ed25519 -C "shuleplus-server-pull" -f ~/.ssh/github_readonly -N ""
cat ~/.ssh/github_readonly.pub
```

Add that **public** key at repo → **Settings → Deploy keys → Add deploy key** (leave write access **unchecked**).

```bash
# ~/.ssh/config on the server
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_readonly
  IdentitiesOnly yes

cd /root/apps/shuleplus/ShulePlus
git remote set-url origin git@github.com:theonesteIT/ShulePlusFullProject.git
git fetch origin main
git checkout main
git pull --ff-only origin main
chmod +x scripts/*.sh
```

---

## 4. First-time / full redeploy on server

```bash
cd /root/apps/shuleplus/ShulePlus
bash scripts/deploy-all-modules.sh
# optional nginx regen:
# bash scripts/generate-nginx-modules.sh
pm2 status
```

---

## Day-to-day

```bash
# local
git add .
git commit -m "your message"
git push origin main
```

Watch: GitHub → **Actions → Deploy Modules**.

Manual full redeploy: Actions → Deploy Modules → **Run workflow** → enable **force_all**.

---

## Staff ID format migration (after deploy)

New staff IDs use `{ROLE}{DD}{SSS}{NNN}` (e.g. `TR04001001`). After code is on the server, run once to apply Timetable DB columns and normalize existing IAM / HR / Timetable records:

```bash
cd /root/apps/shuleplus/ShulePlus
git pull --ff-only origin main
chmod +x scripts/migrate-all-staff-ids.sh scripts/fix-migration-blocks.sh

# If migrate deploy fails with P3009 (failed migration in DB), fix first:
bash scripts/fix-migration-blocks.sh

# Preview changes
bash scripts/migrate-all-staff-ids.sh --dry-run

# Apply
bash scripts/migrate-all-staff-ids.sh
```

This runs `prisma migrate deploy` where needed and `npm run migrate:staff-ids` in **Authentication**, **HR**, and **Timetable** backends.

**Common production blockers**

| Module | Failed migration (example) | Fix |
|--------|---------------------------|-----|
| IAM | `20260713202015_babyeyiwizard_migrate` (removed from repo) | `fix-migration-blocks.sh` → rolls back ghost record, deploys e.g. chief accountant |
| Timetable | `20260814120000_live_alert_settings` | Same script; re-applies alert columns and teacher `employee_number` / `position` |

Manual IAM only: `cd Authentication/Backend && npx tsx scripts/fix-iam-migrations.ts`  
Manual Timetable only: `cd Timetable/Backend && npx tsx scripts/fix-timetable-migrations.ts`

**Wrong school block in IDs** (e.g. Users & Access shows `TR 00 109 xxx` but org code is `23001`):

```bash
cd /root/apps/shuleplus/ShulePlus
git pull --ff-only origin main
chmod +x scripts/fix-wrong-staff-id-prefixes.sh
bash scripts/fix-wrong-staff-id-prefixes.sh --dry-run
bash scripts/fix-wrong-staff-id-prefixes.sh
```

Uses `--fix-wrong-prefix` on IAM, HR, and Timetable migrations and syncs `organization_code` into module tenants first.

---

## Notes

- Production code folder for budget is **`Budget/`** (not `BudgetManagement/`, which is docs-only).
- Academic frontend is Vite → Nginx serves `Academic/Frontend_react/dist` (no PM2 web process).
- Auth UI/API hosts are `app.shuleplus.rw` / `api.shuleplus.rw` (ports 6100 / 4001). Apex marketing site `shuleplus.rw` also proxies to auth-web / `/api` → auth-api.
- **Unstyled landing after Auth deploy?** Usually a **stale Next process on :6100** while PM2 shows `auth-web` errored, or apex nginx not proxying `/_next/`. **Always deploy Authentication with:** `bash scripts/redeploy-authentication.sh` (staging build → swap `.next` → kill :6100 → start auth-web → apex nginx → CSS verify). Quick repair only: `bash scripts/restart-auth-web.sh`.
- **Git pull blocked on server?** Generated `Authentication/Frontend/.env.production` is gitignored — use `git stash push -u -m server` or `git reset --hard origin/main` before pull (redeploy recreates `.env.production`).
- **ShuleKitMIS** (School Materials): UI `https://materials.shuleplus.rw` (Vite static), API `https://materials-api.shuleplus.rw` (PM2 `materials-api` on **4021**). Landing uses `NEXT_PUBLIC_SHULEKIT_URL` / `NEXT_PUBLIC_SHULEKIT_API_URL`.
- Deploy log on server: `/tmp/deploy-changed.log` (or `/tmp/deploy-all.log`).

---

## Fix student lookup + branding logos (production)

Student lookup needs Auth frontend built with production Academic URL, and Academic CORS must allow the landing origin. Branding logos are stored on Auth API at `/uploads/...` — apex Nginx must proxy that path to port 4001 (not to Next.js).

```bash
cd /root/apps/shuleplus/ShulePlus
git pull --ff-only origin main

# 1) Academic CORS + restart API
cd Academic/Backend
# ensure CORS includes landing (code also allows *.shuleplus.rw after this deploy)
grep CORS_ORIGIN .env || echo 'CORS_ORIGIN=https://shuleplus.rw,https://www.shuleplus.rw,https://app.shuleplus.rw,https://academic.shuleplus.rw' >> .env
sed -i 's|^CORS_ORIGIN=.*|CORS_ORIGIN=https://shuleplus.rw,https://www.shuleplus.rw,https://app.shuleplus.rw,https://academic.shuleplus.rw|' .env
npm run build
# copy prisma generated if needed
[ -d src/generated ] && mkdir -p dist/generated && cp -a src/generated/. dist/generated/
pm2 restart academic-api

# 2) Proxy /uploads on apex → Auth API (logo/signature/stamp)
cd /root/apps/shuleplus/ShulePlus
chmod +x scripts/patch-apex-uploads-nginx.sh
bash scripts/patch-apex-uploads-nginx.sh

# 3) Rebuild Auth landing with production API URLs
bash scripts/redeploy-module.sh true Authentication auth-api auth-web
pm2 save

# Verify
curl -sI "https://academic-api.shuleplus.rw/api/public/students/lookup?code=test" | head -5
curl -sI https://shuleplus.rw/uploads/ | head -5
```


```bash
cd /root/apps/shuleplus/ShulePlus
git pull --ff-only origin main
chmod +x scripts/*.sh

# 1) Nginx for materials.shuleplus.rw + materials-api.shuleplus.rw
bash scripts/generate-nginx-modules.sh

# 2) Ensure ShuleKitMIS/Backend/.env exists with:
#    PORT=4021
#    DATABASE_URL=...
#    JWT_ACCESS_SECRET=<same as IAM>
#    PLATFORM_SERVICE_KEY=<same as IAM>
#    CORS_ORIGIN=https://materials.shuleplus.rw,https://shuleplus.rw,https://app.shuleplus.rw
#    ACADEMIC_API_URL=https://academic-api.shuleplus.rw/api
#    BABYEYI_API_URL=https://babyeyi-api.shuleplus.rw/api
#    IAM_API_URL=https://shuleplus.rw/api/v1

# 3) Build + start API + static UI
bash scripts/redeploy-module.sh true ShuleKitMIS materials-api materials-web

# 4) Rebuild Auth so landing Explore ShuleKit → materials domains
bash scripts/redeploy-module.sh true Authentication auth-api auth-web

# 5) Sync platform_modules URLs (schoolmaterial + shulekit-mis → materials)
cd /root/apps/shuleplus/ShulePlus
node scripts/apply-module-subdomains.mjs

pm2 save
curl -sI https://materials.shuleplus.rw | head -5
curl -sI https://materials-api.shuleplus.rw/health | head -5
```

---

## School Uniform MIS (`uniform.shuleplus.rw`)

| | Host | Port | PM2 |
|--|------|------|-----|
| App | `https://uniform.shuleplus.rw` | 6122 | `uniform-web` |
| API | `https://uniform-api.shuleplus.rw` | 4023 | `uniform-api` |

Slug: `school-uniform` · DB: `school_uniform_module_db`

```bash
# 0) DNS: A records for uniform.shuleplus.rw + uniform-api.shuleplus.rw → server IP

cd /root/apps/shuleplus/ShulePlus
git fetch origin main && git reset --hard origin/main
chmod +x scripts/*.sh

# 1) Create DB (adjust user/host to match Auth Postgres)
sudo -u postgres psql -c "CREATE DATABASE school_uniform_module_db;" || true
# or: docker exec shuleplus-iam-db psql -U postgres -c "CREATE DATABASE school_uniform_module_db;"

# 2) Backend .env (first time) — copy example then set DATABASE_URL to production Postgres
cd SchoolUniformMIS/Backend
cp -n .env.example .env
# Edit DATABASE_URL=postgresql://.../school_uniform_module_db
# JWT + SERVICE keys are synced from Authentication/Backend/.env by redeploy

# 3) Nginx + TLS SAN + build/start
cd /root/apps/shuleplus/ShulePlus
bash scripts/generate-nginx-modules.sh
bash scripts/ensure-shuleplus-tls.sh
bash scripts/redeploy-module.sh true SchoolUniformMIS uniform-api uniform-web

# 4) Catalog URLs + Auth loopback provision map
node scripts/apply-module-subdomains.mjs
pm2 restart auth-api --update-env
pm2 save

curl -sI https://uniform.shuleplus.rw | head -5
curl -s https://uniform-api.shuleplus.rw/api/health
```

---

## Tenant provision on the app server (hairpin)

IAM used to call `https://{module}-api.shuleplus.rw/...` from the same machine. That often **times out** (no hairpin to the public IP). Production Auth now provisions via `http://127.0.0.1:{port}` (see `PRODUCTION_LOOPBACK_BACKEND_URLS`). Frontend catalog URLs stay public for browsers.

After pull: `pm2 restart auth-api --update-env`, then Super Admin → **Re-provision** / **Repair all**.

---

## Fix Access Denied on ALL modules (production)

After tenant provision succeeds, org users may still see **Access Denied / Unable to access … Module** if:

1. Module API CORS only allows `localhost` (browser is on `https://{module}.shuleplus.rw`)
2. Frontend was built without `NEXT_PUBLIC_API_URL=https://{module}-api.shuleplus.rw/api` (+ IAM URLs)
3. Module `JWT_ACCESS_SECRET` ≠ Auth secret
4. Server cannot call its own public `*-api` hosts (hairpin) — break provision + some server-side calls
5. User opens the module URL without launching from Organization Dashboard (`?token=` missing)

One-shot on the server (stash dirty tree, sync `main`, rebuild every module, catalog URLs):

```bash
cd /root/apps/shuleplus/ShulePlus
git fetch origin main
# If scripts are missing, sync first with stash (do not use pull alone on a dirty tree):
git stash push -u -m "pre-sync" || true
git reset --hard origin/main
chmod +x scripts/*.sh
bash scripts/server-sync-and-fix-access.sh
# log: /tmp/fix-production-access.log
```

Or from GitHub Actions: **Deploy Modules → Run workflow → force_all = true**.
CI now stashes + `reset --hard origin/main` so a dirty server no longer blocks deploys.

Faster path if you only need env/CORS/JWT without full rebuild of everything: pull latest (CORS code allows `*.shuleplus.rw`), then:

```bash
# example: HR + Payroll + Academic
bash scripts/redeploy-module.sh true HR hr-api hr-web
bash scripts/redeploy-module.sh true Payroll payroll-api payroll-web
bash scripts/redeploy-module.sh true Academic academic-api academic-web
pm2 restart auth-api --update-env
pm2 save
```

Always open modules from **Organization Dashboard** (or post-login launcher), not by typing the subdomain alone.

## Library module (`feature/library`)

Production URLs (Super Admin catalog — not localhost):

| Role | URL |
|------|-----|
| UI | `https://library.shuleplus.rw` |
| API | `https://library-api.shuleplus.rw` |

Shared integrations (patched automatically by `redeploy-module.sh` when vars exist in `.env`):

| Variable | Local dev | Production (server loopback) |
|----------|-----------|------------------------------|
| `STUDENT_MANAGEMENT_URL` | `http://localhost:3052/api` | `http://localhost:4024/api` |
| `TEACHER_PORTAL_URL` | `http://localhost:3009/api` | `http://localhost:4003/api` |
| `JWT_ACCESS_SECRET` / `SERVICE_API_KEY` | dev keys | synced from Authentication |

Frontend production env (written by redeploy script):

- `NEXT_PUBLIC_STUDENT_MGMT_API_URL=https://studentmanagement-api.shuleplus.rw/api`

### Deploy Library on the server

After merging to `main` (or testing the branch directly):

```bash
cd /root/apps/shuleplus/ShulePlus
git fetch origin feature/library
git checkout feature/library   # or merge into main first
git pull

chmod +x scripts/*.sh

# Bootstrap backend .env from .env.example if missing, then build + PM2
bash scripts/redeploy-module.sh true Library library-api library-web

# Nginx vhosts for library + library-api (wildcard cert)
sudo bash scripts/generate-nginx-modules.sh
sudo bash scripts/ensure-shuleplus-tls.sh

# IAM catalog: replace localhost module URLs with shuleplus.rw subdomains
node scripts/apply-module-subdomains.mjs
pm2 restart auth-api --update-env
pm2 save
```

Re-provision tenants from **Super Admin → Organizations** so Library gets the hosted URLs (or run `node Authentication/Backend/scripts/provision-all-module-tenants.js` if you use bulk provisioning).

Local ports: backend **3060**, frontend **3061**. Server PM2 ports: backend **4025**, frontend **6124**.

If `library-api` fails with `P1010 User was denied access on the database`, the `library_module_db` database is missing or `DATABASE_URL` still points at dev defaults:

```bash
cd /root/apps/shuleplus/ShulePlus
bash scripts/fix-library-db.sh
pm2 save
curl -s http://127.0.0.1:4025/api/health
```
