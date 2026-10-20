# HR Module

Human Resources microservice for the ShulePlus platform.

**Documentation:** [`Docs/hr-center/`](./Docs/hr-center/) — feature specs for each HR Center page.

**Integration guide:** [`../docs/MODULE_INTEGRATION_GUIDE.md`](../docs/MODULE_INTEGRATION_GUIDE.md)

## Structure

```
HR/
├── Backend/     hr-module-service (Express + Prisma, port 3005)
├── Frontend/    hr-module-app (Next.js, port 3006)
└── Docs/        HR Center page specifications
```

## HR Center Pages

| Page | Route | Description |
|------|-------|-------------|
| HR Dashboard | `/dashboard` | KPIs, charts, module grid navigation |
| Employee Directory | `/directory` | Search, filter, manage staff |
| Employee Registration | `/registration` | 7-step wizard |
| Employment Contracts | `/contracts` | Contract lifecycle tracking |
| Employment Categories | `/categories` | Staff classification |
| Leave Management | `/leave` | Leave requests & approvals |
| Departments | `/departments` | Org units & budgets |
| Organization Structure | `/organization` | Interactive org chart |
| Staff Documents | `/documents` | Compliance & repository |
| Qualifications | `/qualifications` | Academic credentials |
| Employee Profile | `/directory/:id` | 360° employee view |

## Backend setup

```powershell
cd HR/Backend
copy .env.example .env
# or: npm run setup:env
npm install
```

Create the database:

```powershell
docker exec shuleplus-iam-db psql -U postgres -c "CREATE DATABASE hr_module_db;"
```

Then migrate and start:

```bash
npx prisma migrate dev --name init
npm run dev
```

Use the same `JWT_ACCESS_SECRET` and `SERVICE_API_KEY` as IAM (see `platform.env.example`).

## Frontend setup

```bash
cd HR/Frontend
copy .env.example .env.local
npm install
npm run dev
```

Register in IAM module catalog:

- **Slug:** `hr`
- **Frontend URL:** `http://localhost:3006`
- **Backend URL:** `http://localhost:3005`

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/tenant/create` | Provision tenant (IAM) |
| GET | `/api/dashboard` | HR dashboard KPIs |
| GET | `/api/directory` | Employee directory |
| GET/POST/PUT/DELETE | `/api/employees/*` | Employee CRUD |
| GET | `/api/contracts` | Employment contracts |
| GET | `/api/organization` | Org structure |
| GET/POST | `/api/departments/*` | Departments |
| GET/POST | `/api/categories/*` | Employment categories |
| GET/POST/PATCH | `/api/leave/*` | Leave management |
| GET/POST | `/api/documents/*` | Staff documents |
| GET/PATCH | `/api/qualifications/*` | Qualifications |
