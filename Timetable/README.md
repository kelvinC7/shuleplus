# Timetable Module

Modern DOS Timetable microservice for the ShulePlus platform — assignments, smart generator, drag-and-drop editing, conflict center, and exports.

**Feature documentation:** [`Docs/timetable/`](Docs/timetable/)

## Structure

```
Timetable/
├── Backend/     timetable-service (Express + Prisma, port 3010)
├── Frontend/    timetable-app (Next.js, port 3011)
└── Docs/        Complete feature guides & API reference
```

## Features

| Area | Routes / Tabs |
|------|----------------|
| Dashboard | `/dashboard` — KPIs, workflow, alerts |
| Teacher Assignments | `/teacher-assignments` — source of truth (`periods_per_week`) |
| Timetable Setup | `/timetable` — 7 tabs: Teachers, Courses, Time Settings, Generator, Timetable (DnD), Per Class, Conflict Center |
| Exports | `/exports` — class, teacher & master CSV |

## IAM integration

The module is registered in IAM platform seed (`Authentication/Backend/prisma/seed.ts`):

- **Slug:** `timetable`
- **Category:** Education (depends on `academic`)
- **Frontend:** `http://localhost:3011`
- **Backend:** `http://localhost:3010`

### Register in catalog (automatic)

```bash
cd Authentication/Backend
npm run prisma:seed
```

Super Admin → **Module Catalog** will show Timetable. Assign via **Module Assignment**, then provision via **Module Provisioning**.

### Demo school quick assign

After `seed:inventory` (creates demo-school):

```bash
cd Authentication/Backend
npm run seed:timetable
```

This assigns Timetable to demo-school, links users, and calls `POST /api/tenant/create`.

## Backend setup

```powershell
cd Timetable/Backend
copy .env.example .env
npm install
```

Create the database:

```powershell
docker exec shuleplus-iam-db psql -U postgres -c "CREATE DATABASE timetable_db;"
```

Migrate and start:

```bash
npx prisma migrate dev --name init
npm run prisma:generate
npm run dev
```

If the schema was updated (e.g. `position` on teacher profiles) but the API errors with **column does not exist**, apply pending migrations:

```bash
npx prisma migrate deploy
# or: npx tsx scripts/fix-timetable-migrations.ts
npm run prisma:generate
```

Use the same `JWT_ACCESS_SECRET` and `SERVICE_API_KEY` as the IAM backend.

## Frontend setup

```powershell
cd Timetable/Frontend
copy .env.example .env.local
npm install
npm run dev
```

Register in IAM module catalog:

- **Slug:** `timetable`
- **Frontend URL:** `http://localhost:3011`
- **Backend URL:** `http://localhost:3010`

## Recommended workflow

1. Create teacher assignments
2. Configure teachers, courses & time settings
3. Generate → review coverage → Apply
4. Fine-tune with drag & drop
5. Scan Conflict Center → auto-fix where safe
6. Export class/teacher timetables

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/tenant/create` | Provision tenant (IAM) |
| GET | `/api/dashboard` | Dashboard summary |
| GET/POST/PUT/DELETE | `/api/timetable` | Timetable CRUD |
| GET/PUT | `/api/timetable-system/schedule` | Day template |
| GET/PUT | `/api/timetable-system/teacher-profiles` | Teacher limits |
| GET/PUT | `/api/timetable-system/course-config/:subject` | Subject rules |
| POST | `/api/timetable-system/generate` | Generate preview |
| POST | `/api/timetable-system/apply` | Persist timetable |
| GET | `/api/timetable-system/conflict-center` | Scan conflicts |
| POST | `/api/timetable-system/auto-fix` | Auto-resolve |

See [`Docs/timetable/API_REFERENCE.md`](Docs/timetable/API_REFERENCE.md) for the full list.
