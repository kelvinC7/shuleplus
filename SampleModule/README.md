# Sample Module

Reference microservice for the ShulePlus / Babyeyi platform module pattern.

**Full integration guide (for HR and other module teams):** [`docs/MODULE_INTEGRATION_GUIDE.md`](../docs/MODULE_INTEGRATION_GUIDE.md)

## Structure

```
SampleModule/
├── Backend/     sample-module-service (Express + Prisma, port 3003)
└── Frontend/    sample-module-app (Next.js, port 3004)
```

## Flow

1. **Super Admin** creates `sample-module` in Module Catalog (`/super-admin/module-catalog`)
2. **Super Admin** assigns the module to an organization (`/super-admin/module-assignment`)
3. **IAM** calls `POST http://localhost:3003/api/tenant/create` to provision the tenant
4. **Organization Admin** logs in → dashboard at `/organization-admin` shows assigned modules only
5. Click **Sample Module** → opens frontend with JWT → backend verifies license + tenant

## Backend setup

**Windows** — `cp` does not work in CMD/PowerShell. Use one of:

```powershell
copy .env.example .env
# or
npm run setup:env
```

```bash
cd SampleModule/Backend
npm run setup:env
npm install
```

Create the database (if using the IAM Docker Postgres):

```powershell
docker exec shuleplus-iam-db psql -U postgres -c "CREATE DATABASE sample_module_db;"
```

Then migrate and start:

```bash
npx prisma migrate dev --name init
npm run dev
```

Use the same `JWT_ACCESS_SECRET` and `PLATFORM_SERVICE_KEY` / `SERVICE_API_KEY` as the IAM backend (see repo root `platform.env.example`).

## Frontend setup

```bash
cd SampleModule/Frontend
cp .env.example .env.local
npm install
npm run dev
```

Register in IAM module catalog:

- Frontend URL: `http://localhost:3004`
- Backend URL: `http://localhost:3003`

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/tenant/create` | Service key | Provision tenant (called by IAM) |
| GET | `/api/dashboard` | JWT + license | Dashboard summary |
| GET | `/api/records` | JWT + license | List records (tenant-scoped) |
| POST | `/api/records` | JWT + license | Create record |

JWT must include `modules: ["sample-module"]` or the service returns **403 Module Not Licensed**.
