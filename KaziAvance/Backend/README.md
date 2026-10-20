# KaziAdvance Backend

Modern Node.js + TypeScript backend for the KaziAdvance employee module with Prisma DB, IAM JWT SSO, document uploads, and payroll sync.

## Quick Start

1. Install dependencies:
   - `npm install`
2. Copy env:
   - `copy .env.example .env`
3. Set `JWT_ACCESS_SECRET` to the **same value as IAM**.
4. Ensure PostgreSQL is running (`Authentication/docker compose up -d`) and `DATABASE_URL` points at `kazi_avance_db` (see `.env.example`).
5. Prepare database:
   - `npm run prisma:generate`
   - `npm run prisma:push`
   - `npm run prisma:seed`
6. Run dev server:
   - `npm run dev`
7. API base:
   - `http://localhost:4400`

## IAM SSO (required in production)

KaziAdvance does **not** authenticate users locally by default.

Flow:

1. User logs in on IAM (`http://localhost:3000`).
2. Super admin assigns module slug `kaziavance` to the organization/user.
3. IAM opens:
   - `http://localhost:4401/dashboard?token=<IAM access token>`
4. Frontend stores token and sends `Authorization: Bearer <token>` to this backend.
5. Backend verifies JWT with shared `JWT_ACCESS_SECRET` and checks `modules` includes `kaziavance`.
6. Backend resolves/creates employee profile from JWT `sub` + `email`.

## Auth Model

- Protected routes require `Authorization: Bearer <IAM token>`.
- `MODULE_SLUG` must be `kaziavance` and present in JWT `modules`.
- `GET /api/auth/session` validates token and returns IAM + employee profile.
- Local login (`POST /api/auth/login`) is disabled unless `ENABLE_LOCAL_LOGIN=true`.

## Endpoints

- Public
  - `GET /health`
  - `POST /api/auth/login` (dev only when enabled)
- Service (IAM provisioning — `x-service-key`)
  - `POST /api/tenant/create`
- Protected
  - `GET /api/auth/session`
  - `GET /api/auth/me`
  - `GET /api/employee/dashboard`
  - `GET /api/employee/salary-history`
  - `GET /api/employee/advance-history`
  - `GET /api/employee/workflow`
  - `POST /api/advance/calculator`
  - `POST /api/advance/requests`
  - `POST /api/documents/upload` (multipart/form-data, field name: `file`)
  - `GET /api/documents`

Uploaded files are served from:

- `GET /uploads/<filename>`

## Payroll Integration

- Set `PAYROLL_API_URL` to connect external payroll service.
- Endpoint expected: `/api/payroll/employees/:employeeCode/latest`
- If payroll is reachable, latest net/gross salary is synced into local database.
- If unavailable, module uses locally stored payroll records.

## IAM Module Registration (Super Admin — not seed)

Register KaziAdvance manually in IAM **Module Catalog** (same as HR, Payroll, Teacher Portal).

1. Sign in as **Super Admin** (or Root Admin).
2. Open **Module Catalog**:
   - `http://localhost:3000/super-admin/module-catalog`
3. Click **Add module** and enter:

| Field | Value |
|-------|-------|
| Name | `KaziAdvance` |
| Short name | `Kazi` |
| Slug | `kaziavance` |
| Category | `Finance` |
| Version | `1.0.0` |
| Description | Employee salary advance and financial self-service |
| Frontend URL | `http://localhost:4401` |
| Backend URL | `http://localhost:4400` |
| Health check URL | `/health` |
| Enabled | Yes |

4. Go to **Provisioning** and license `kaziavance` for the target organization.
5. Organization admin assigns the module to users (Users & Access).
6. Users sign out and sign in again so JWT `modules` includes `kaziavance`.
7. Users open the module from IAM — it launches `/dashboard?token=...`.

**Important:** `MODULE_SLUG` in KaziAdvance backend must stay `kaziavance` (must match catalog slug exactly).
