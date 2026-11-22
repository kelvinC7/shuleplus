# ShulePlus — School Representative / Director Console

Standalone executive module for school representatives and group directors.
It combines a **Next.js desktop-first console** with an **Express + Prisma
decision-layer API** that persists approvals, broadcasts, action-plan tasks,
incidents and the audit trail.

The older IAM-embedded representative UI (`Authentication/Frontend/src/app/school-representative/`)
remains in place; this folder is the full Director's Console described in
`docs/StMatthews-Directors-Console.html` and the desktop prototype.

## Ports

| Layer | Port | URL |
| --- | --- | --- |
| Frontend | **3081** | http://localhost:3081 |
| Backend | **3080** | http://localhost:3080/api/director |
| Backend health | **3080** | http://localhost:3080/health |

See [`PORTS.md`](./PORTS.md) and the root [`docs/PORTS.md`](../docs/PORTS.md).

## Structure

| Path | Purpose |
| --- | --- |
| `Backend/src/` | Express 5 API (`/api/director`), JWT verification, demo fallback |
| `Backend/prisma/` | SQLite schema + seed for persisted workflows |
| `Backend/src/services/` | IAM aggregation, console workflows, audit writer |
| `Frontend/src/app/director/` | All 24 console pages |
| `Frontend/src/components/` | App shell, drawers, tables, KPIs, status badges |
| `Frontend/src/contexts/` | Auth gate, branch/year/term scope, refresh key |
| `docs/` | Mobile prototype and design reference |

## Setup

```powershell
# Backend
cd SchoolRepresentative/Backend
npm.cmd install
npx.cmd prisma generate
npx.cmd prisma db push
npm.cmd run db:seed
npm.cmd run dev                 # :3080

# Frontend (new terminal)
cd SchoolRepresentative/Frontend
npm.cmd install
npm.cmd run dev                 # :3081
```

Open `http://localhost:3081/director/overview`. With no token and
`ALLOW_DEMO=true` the console runs on the seeded demo dataset and labels it in
the UI. With a valid IAM token it aggregates live school records.

### Entry URL from the platform

Following `docs/MODULE_INTEGRATION_GUIDE.md` §3.5, IAM opens the module at:

```
http://localhost:3081/dashboard?token=<IAM_ACCESS_TOKEN>
```

`/dashboard` stores the token and forwards to `/director/overview`. The site
root (`/`) forwards any query string to `/dashboard`, so both entry points
work. The token is captured once into `localStorage`
(`DirectorConsole_module_token`). The selected branch/year/term is stored under
`DirectorConsole_scope`, and the sidebar state under
`DirectorConsole_sidebarCollapsed`.

### Reset the demo dataset

The seed is idempotent; to start from a pristine prototype state (6 pending
approvals, 5 unread notifications, 3 incidents, 5 tasks, empty audit trail):

```powershell
cd SchoolRepresentative/Backend
Remove-Item prisma/director-console.db
npx.cmd prisma db push
npm.cmd run db:seed
```

## Modes

| Mode | When | Behaviour |
| --- | --- | --- |
| `live` | Valid `Authorization: Bearer <JWT>` | School data from IAM `/iam/representative/*`; decisions persisted in SQLite |
| `demo` | No token and `ALLOW_DEMO=true` | Seeded dataset mirroring the prototype; every response has `meta.mode: "demo"` |
| `unauthorized` | No token and `ALLOW_DEMO=false` | API returns `401`; UI shows the access screen |

## Pages

Executive: Overview, Daily Briefing, Performance Insights.

School management: Schools & Branches, Students, Academics, Timetable,
Teaching Now, Discipline.

Finance: Fees, Budget, HR & Payroll.

Operations: Attendance, Smart Transport, Live Campus / Cameras, Approvals,
Action Plan.

Communication & services: Parent MIS, ShuleChat, Circulars & Broadcasts,
School Services (ShuleKit, ShuleMart, Uniforms, Dining, ShuleTrip).

Governance: Reports & Exports, Audit Trail, Settings.

## Persisted workflows

SQLite via Prisma owns the decision layer:

- **Approvals** — inbox, decision (approve / reject / request changes) with
  mandatory rejection reason and `APPROVAL_DECIDED` audit events.
- **Broadcasts** — audience, channels, recipient counts, SMS cost, schedule.
- **Action plan** — create/update tasks with progress and audit events.
- **Incidents** — record and progress security/safety/camera incidents.
- **Notifications** — read/unread state.
- **Audit trail** — append-only, filterable by module, actor and action.

School-side data (students, staff, academics, attendance, fees, budget, HR,
transport, cameras) is aggregated from IAM and is read-only in this module.

## Environment

Backend (`Backend/.env`):

```
PORT=3080
API_PREFIX=/api/director
JWT_ACCESS_SECRET=...        # must match IAM
DATABASE_URL="file:./director-console.db"
IAM_API_URL=http://localhost:3001/api/v1
ALLOW_DEMO=true
CORS_ORIGIN=http://localhost:3081
```

Frontend (`Frontend/.env.local`):

```
NEXT_PUBLIC_API_URL=http://localhost:3080/api/director
```

Sensible development defaults exist, so the API boots without a `.env`.

## Legacy IAM-embedded portal

| Layer | Path |
| --- | --- |
| Representative UI | `Authentication/Frontend/src/app/school-representative/` |
| Shared components | `Authentication/Frontend/src/components/school-representative/` |
| IAM APIs | `Authentication/Backend/src/routes/school-representative.routes.ts` (`/iam/representative`) |
| SuperAdmin management | `/super-admin/representatives` |

Its data model (`SchoolRepresentativeProfile`, `SchoolRepresentativeAssignment`,
`RepresentativeFollowUp`, `RepresentativeAlert`) is unchanged. The Director
Console reuses the same IAM identity and assignment data through the shared JWT.
