# Payroll Module

Rwanda-compliant payroll microservice for the ShulePlus platform.

**Documentation:** [`Docs/accountant-payroll/`](./Docs/accountant-payroll/) — feature specs for each Payroll Center page.

**Integration guide:** [`../docs/MODULE_INTEGRATION_GUIDE.md`](../docs/MODULE_INTEGRATION_GUIDE.md)

## Structure

```
Payroll/
├── Backend/     payroll-module-service (Express + Prisma, port 3007)
├── Frontend/    payroll-module-app (Next.js, port 3008)
└── Docs/        Accountant Payroll page specifications
```

## Payroll Center Pages

| Page | Route | Description |
|------|-------|-------------|
| Payroll Dashboard | `/dashboard` | KPIs, alerts, module grid |
| Employee Directory | `/employees` | Payroll staff roster |
| Employee Import | `/employees/import` | Links to HR bulk import |
| Salary Template | `/salary-template` | PAYE, RSSB, allowances |
| Staff Salary Setup | `/staff-salary-setup` | Per-employee packages |
| Payroll Run | `/run` | Generate monthly register (default landing) |
| Payroll Reports | `/reports` | Tax & regulatory exports |
| Termination Benefits | `/termination-benefits` | Severance workflow |
| Salary Payment | `/salary-payment` | Review & mark paid |
| Payroll Disbursement | `/disbursement` | Payment processing |
| Pay Slips | `/payslips` | Preview & print |
| Bank Payroll | `/bank-payroll` | Bank transfer files |
| My Payroll | `/my-payroll` | Staff self-service |

## Backend setup

```powershell
cd Payroll/Backend
copy .env.example .env
npm install
```

Create the database:

```powershell
docker exec shuleplus-iam-db psql -U postgres -c "CREATE DATABASE payroll_module_db;"
```

Then push schema and start:

```powershell
npx prisma db push
npm run dev
```

Use the same `JWT_ACCESS_SECRET` and `SERVICE_API_KEY` as IAM.

## Frontend setup

```powershell
cd Payroll/Frontend
copy .env.example .env.local
npm install
npm run dev
```

Register in IAM module catalog (seed):

- **Slug:** `payroll`
- **Frontend URL:** `http://localhost:3008`
- **Backend URL:** `http://localhost:3007`
- **Depends on:** HR module

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/tenant/create` | Provision tenant (IAM) |
| GET | `/api/dashboard` | Payroll dashboard KPIs |
| GET/PUT | `/api/templates/active` | Salary template |
| GET | `/api/staff` | Staff roster |
| POST | `/api/runs/preview` | Preview payroll register |
| POST | `/api/runs/trigger` | Create payroll run |
| PATCH | `/api/runs/:id/mark-paid` | Mark run paid |
| GET | `/api/my-payroll` | Staff payslip history |
