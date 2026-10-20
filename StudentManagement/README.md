# Student Management Module

Student master data, enrollments, classes, exams, and marks — same platform pattern as Academic.

**Integration guide:** [`docs/MODULE_INTEGRATION_GUIDE.md`](../docs/MODULE_INTEGRATION_GUIDE.md)

## Structure

```
StudentManagement/
├── Backend/         student-management-module-service (Express + Prisma, port 3052)
└── Frontend_react/  Vite + MUI (port 3053)
```

## Flow

1. **Super Admin** registers `student-management` in Module Catalog
2. **Super Admin** assigns the module to an organization
3. **IAM** calls `POST http://localhost:3052/api/tenant/create` to provision the tenant
4. **Organization Admin** opens the module from `/organization-admin`
5. Frontend opens with JWT → backend verifies license + tenant

## Backend setup

```powershell
cd StudentManagement/Backend
copy .env.example .env
npm install
```

Create the database (IAM Docker Postgres example):

```powershell
docker exec shuleplus-iam-db psql -U postgres -c "CREATE DATABASE student_management_db;"
```

Then migrate and start:

```bash
npx prisma migrate dev --name init
npm run dev
```

Use the same `JWT_ACCESS_SECRET` and `SERVICE_API_KEY` as the IAM backend (`platform.env.example`).

## Frontend setup

```bash
cd StudentManagement/Frontend_react
npm install
npm run dev
```

Register in IAM module catalog:

- Frontend URL: `http://localhost:3053` (production: `https://studentmanagement.shuleplus.rw`)
- Backend URL: `http://localhost:3052` (production: `https://studentmanagement-api.shuleplus.rw`)
- Module slug: `student-management`

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/tenant/create` | Service key | Provision tenant (IAM) |
| GET | `/api/dashboard` | JWT + license | Dashboard summary |

JWT must include `modules: ["student-management"]` or the service returns **403 Module Not Licensed**.
