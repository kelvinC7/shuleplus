# Teacher Portal Module

Teacher-facing microservice for ShulePlus — daily teaching operations, Salary Advance Management, and more.

**Documentation:** [`teacher-portal/`](./teacher-portal/) and [`ticha-avance/`](./ticha-avance/) — legacy Babyeyi feature specs.

**Integration guide:** [`../docs/MODULE_INTEGRATION_GUIDE.md`](../docs/MODULE_INTEGRATION_GUIDE.md)

## Structure

```
TeacherPortal/
├── Backend/     teacher-portal-service (Express + Prisma, port 3009)
├── Frontend/    teacher-portal-app (Next.js, port 3012)
│                Smart Timetable UX calls Timetable API :3010 (see Timetable/Docs/SMART_TIMETABLE.md)
├── teacher-portal/   Feature & route documentation
└── ticha-avance/     TichaAvance / Shule Avance documentation
```

## Phase 1 (implemented)

| Page | Route | Status |
|------|-------|--------|
| Teacher Dashboard | `/dashboard` | Live — KPIs + module grid |
| Salary Advance Management | `/salary-advance` | Live — eligibility, cashout, requests |

Other nav items are scaffolded (coming soon).

## Backend setup

```powershell
cd TeacherPortal/Backend
copy .env.example .env
npm install
```

Create the database:

```powershell
docker exec shuleplus-iam-db psql -U postgres -c "CREATE DATABASE teacher_portal_db;"
```

Then migrate and start:

```bash
npx prisma migrate dev --name init
npm run dev
```

Use the same `JWT_ACCESS_SECRET` and `SERVICE_API_KEY` as IAM (see `platform.env.example`).

## Frontend setup

```bash
cd TeacherPortal/Frontend
copy .env.example .env.local
npm install
npm run dev
```

Register in IAM module catalog:

- **Slug:** `teacher-portal`
- **Frontend URL:** `http://localhost:3017`
- **Backend URL:** `http://localhost:3009`

## Payroll & HR integration

1. **HR** — On employee registration, set **IAM user ID** and enable **Salary Advance Management**.
2. **Payroll** — Link the same IAM user ID on staff salary setup; saving salary or marking a run **paid** syncs **net salary** to Teacher Portal.
3. **Teacher Portal** — Eligibility uses the synced snapshot (no default fallback unless payroll is not linked).

Env on HR and Payroll backends:

```
TEACHER_PORTAL_URL=http://localhost:3009
```

Internal sync endpoint (service key): `POST /api/internal/staff-payroll-sync`

## Approval workflow

| Role | Queue | Actions |
|------|-------|---------|
| Accountant / finance | `pending_accountant` | Forward to manager, reject |
| Manager / org admin | `sent_to_manager` | Approve, reject |
| Org admin | — | Assign extra approvers via `/salary-advance/approvers` |

Frontend: `/salary-advance/approvals`

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/tenant/create` | Provision tenant (IAM) |
| GET | `/api/dashboard` | Teacher dashboard summary |
| GET | `/api/salary-advance/catalog` | Service + cashout categories |
| GET | `/api/salary-advance/applicant/eligibility` | Advance eligibility |
| GET | `/api/salary-advance/applicant/my-requests` | Own request history |
| POST | `/api/salary-advance/applicant/requests` | Create advance request |
| PUT | `/api/salary-advance/applicant/requests/:id` | Update pending request |
| GET | `/api/salary-advance/manager/pending-requests` | Manager queue |
| PATCH | `/api/salary-advance/manager/requests/:id/decision` | Approve/reject |
| POST | `/api/internal/staff-payroll-sync` | HR/Payroll net salary sync (service key) |
