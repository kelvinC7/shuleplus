# ShulePlus Module Integration Guide

**Version:** 1.0  
**Audience:** Platform team (Babyeyi / ShulePlus IAM) and external module teams (e.g. HR, Finance, Academic)  
**Reference implementation:** [`SampleModule/`](../SampleModule/)

This document explains how a **module developer team** builds a microservice that plugs into ShulePlus, how the **platform team** registers and assigns it, and how an **organization admin** accesses it — using **HR Module** as the worked example throughout.

---

## Table of contents

1. [Roles and responsibilities](#1-roles-and-responsibilities)
2. [Architecture overview](#2-architecture-overview)
3. [Shared contracts (required)](#3-shared-contracts-required)
4. [Phase 1 — Module team builds HR service](#4-phase-1--module-team-builds-hr-service)
5. [Phase 2 — Platform team registers the module](#5-phase-2--platform-team-registers-the-module)
6. [Phase 3 — Assign module and provision tenant](#6-phase-3--assign-module-and-provision-tenant)
7. [Phase 4 — Organization admin access](#7-phase-4--organization-admin-access)
8. [Environment variables reference](#8-environment-variables-reference)
9. [Testing checklist](#9-testing-checklist)
10. [Troubleshooting](#10-troubleshooting)
11. [Handoff template for module teams](#11-handoff-template-for-module-teams)

---

## 1. Roles and responsibilities

| Role | Who | Responsibility |
|------|-----|----------------|
| **Platform team** | ShulePlus / Babyeyi IAM | Login, organizations, module catalog, assignment, tenant provisioning calls |
| **Module team** | e.g. HR developers | HR backend + frontend, tenant DB, JWT verification, business features |
| **Super Admin** | Platform operator | Create module in catalog, assign to schools |
| **Organization Admin** | School admin | Login once on IAM; open assigned modules from dashboard |

**Important:** Users always authenticate through **IAM**. Module services never store passwords. They only store `organization_id` and `user_id` references.

---

## 2. Architecture overview

```mermaid
sequenceDiagram
    participant SA as Super Admin
    participant IAM as IAM (port 3001)
    participant HRB as HR Backend (port 3005)
    participant HRF as HR Frontend (port 3006)
    participant OA as Org Admin

    SA->>IAM: Register module in catalog
    SA->>IAM: Assign HR to organization
    IAM->>HRB: POST /api/tenant/create (service key)
    HRB-->>IAM: 201 Tenant created

    OA->>IAM: Login
    IAM-->>OA: JWT (includes modules: ["hr"])
    OA->>IAM: GET /iam/me/modules
    IAM-->>OA: [{ name: "HR", frontendUrl: "..." }]
    OA->>HRF: Open /dashboard?token=JWT
    HRF->>HRB: GET /api/dashboard (Bearer JWT)
    HRB-->>HRF: 200 Dashboard data
```

### Local port convention

| Service | Default port |
|---------|--------------|
| IAM Frontend | 3000 |
| IAM Backend | 3001 |
| Sample Module Backend | 3003 |
| Sample Module Frontend | 3004 |
| **HR Module Backend (example)** | **3005** |
| **HR Module Frontend (example)** | **3006** |

Each new module uses the next free port pair.

---

## 3. Shared contracts (required)

These are **non-negotiable** for every module. Copy [`platform.env.example`](../platform.env.example) values into each service.

### 3.1 Secrets (must match)

| Variable | IAM | Module backend |
|----------|-----|----------------|
| `JWT_ACCESS_SECRET` | Yes | Yes — same value |
| `MODULE_PROVISIONING_KEY` | Yes | — |
| `SERVICE_API_KEY` | — | Yes — **same value as** `MODULE_PROVISIONING_KEY` |

**Local development default:** `dev-service-key`

### 3.2 Module slug

- Defined once in **Module Catalog** (e.g. `hr`)
- Must match module backend env: `MODULE_SLUG=hr`
- Must appear in org admin JWT: `"modules": ["hr", ...]`

Use lowercase kebab-case: `hr`, `sample-module`, `payroll`.

### 3.3 JWT payload (issued by IAM)

After login, every module receives the same access token:

```json
{
  "sub": "user-uuid",
  "email": "admin@school.com",
  "organizationId": "org-uuid",
  "sessionId": "session-uuid",
  "roles": ["organization_admin"],
  "modules": ["hr", "academic"]
}
```

Module backend **must**:

1. Verify signature with `JWT_ACCESS_SECRET`
2. Reject if `modules` does not include this module’s slug → **403 Module Not Licensed**
3. Load tenant for `organizationId` → **403 Tenant not provisioned** if missing

### 3.4 Tenant provisioning endpoint (module backend)

IAM calls this when Super Admin assigns the module (or clicks **Create Tenant**).

```
POST {backendUrl}/api/tenant/create
```

**Headers:**

```
Content-Type: application/json
x-service-key: <MODULE_PROVISIONING_KEY>
x-source-service: IAM
```

**Body:**

```json
{
  "organizationId": "990100e1-5bba-4fb8-bcbf-a184c0b3cc66",
  "organizationName": "GS Rugando TSS",
  "organizationCode": "040001"
}
```

**Success response:** `201`

```json
{
  "success": true,
  "data": {
    "id": "tenant-uuid",
    "organizationId": "990100e1-5bba-4fb8-bcbf-a184c0b3cc66",
    "organizationName": "GS Rugando TSS",
    "status": "ACTIVE"
  }
}
```

**Idempotent:** If tenant already exists for that org, return `200`/`201` with existing record (do not error).

### 3.5 Frontend entry URL

Organization dashboard opens the module as:

```
{frontendUrl}/dashboard?token=<accessToken>
```

Module frontend **must** read `token` from the query string, store it, and send `Authorization: Bearer <token>` on API requests.

See [`SampleModule/Frontend`](../SampleModule/Frontend/) for reference.

### 3.6 Data isolation rule

Every business table **must** include `organization_id`. Never query without it.

```sql
-- Correct
SELECT * FROM employees WHERE organization_id = '990100e1-...';

-- Forbidden
SELECT * FROM employees;
```

---

## 4. Phase 1 — Module team builds HR service

**Owner:** HR developer team  
**Template:** Copy [`SampleModule/`](../SampleModule/) → `HrModule/` (or your repo name)

### 4.1 Repository layout (minimum)

```
HrModule/
├── Backend/
│   ├── prisma/schema.prisma      # tenants, employees, departments, ...
│   ├── src/
│   │   ├── routes/index.ts       # /health, /tenant/create, protected routes
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts    # JWT + license check
│   │   │   └── tenant.middleware.ts  # tenant must exist
│   │   └── services/tenant.service.ts
│   └── .env
└── Frontend/
    ├── src/app/(module)/dashboard/
    ├── src/contexts/auth-context.tsx
    └── .env.local
```

### 4.2 Backend `.env` example (HR)

```env
NODE_ENV=development
PORT=3005
API_PREFIX=/api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hr_module_db

# MUST match IAM Authentication/Backend/.env
JWT_ACCESS_SECRET=change-me-access-secret-min-32-chars
PLATFORM_SERVICE_KEY=dev-service-key
SERVICE_API_KEY=dev-service-key

MODULE_SLUG=hr
CORS_ORIGIN=http://localhost:3006
```

### 4.3 Required backend routes (HR example)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | Health check |
| POST | `/api/tenant/create` | Service key | Called by IAM only |
| GET | `/api/dashboard` | JWT + license + tenant | HR dashboard summary |
| GET | `/api/employees` | JWT + license + tenant | List staff (scoped by org) |
| POST | `/api/employees` | JWT + license + tenant | Create staff record |

Reference: [`SampleModule/Backend/src/routes/index.ts`](../SampleModule/Backend/src/routes/index.ts)

### 4.4 Frontend `.env.local` example (HR)

```env
NEXT_PUBLIC_API_URL=http://localhost:3005/api
NEXT_PUBLIC_IAM_URL=http://localhost:3000
NEXT_PUBLIC_MODULE_NAME=Human Resources
```

Run on port 3006:

```json
"dev": "next dev -p 3006"
```

### 4.5 What HR team delivers to platform team

Before registration, HR team sends a **Module Handoff** (see [Section 11](#11-handoff-template-for-module-teams)):

| Item | HR example |
|------|------------|
| Module name | Human Resource Management |
| Slug | `hr` |
| Version | 1.0.0 |
| Category | Human Resources |
| Backend URL (local) | `http://localhost:3005` |
| Frontend URL (local) | `http://localhost:3006` |
| Backend URL (prod) | `https://api.babyeyi.rw/hr` |
| Frontend URL (prod) | `https://hr.babyeyi.rw` |
| Health check | `GET /api/health` |
| Dependencies | None (or `payroll` depends on `hr`) |

---

## 5. Phase 2 — Platform team registers the module

**Owner:** Super Admin or Root Admin  
**UI:** `/super-admin/module-catalog` (or `/root-admin/module-catalog`)

### Step 2.1 — Start HR backend locally (for later provisioning)

```powershell
cd HrModule\Backend
copy .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev
```

Expected log:

```
[HR Module] API listening on http://localhost:3005/api
```

### Step 2.2 — Create module in catalog

**Navigation:** Super Admin → **Modules** → **Module Catalog** → **Create Module**

**Example form values (HR):**

| Field | Value |
|-------|-------|
| Module Name | Human Resource Management |
| Short Name | HR |
| Module Code | `hr` |
| Category | Human Resources |
| Version | 1.0.0 |
| Description | Staff records, departments, leave |
| Primary Color | `#FCB038` |
| Frontend URL | `http://localhost:3006` |
| Backend URL | `http://localhost:3005` |
| Health Check URL | `/api/health` |
| Status | Active |

**API equivalent:**

```http
POST /api/v1/super-admin/module-catalog
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{
  "name": "Human Resource Management",
  "shortName": "HR",
  "slug": "hr",
  "category": "Human Resources",
  "version": "1.0.0",
  "description": "Staff records, departments, leave",
  "color": "#FCB038",
  "frontendUrl": "http://localhost:3006",
  "backendUrl": "http://localhost:3005",
  "healthCheckUrl": "/api/health"
}
```

**Required fields for integration:** `name`, `slug`, `frontendUrl`, `backendUrl`  
**Optional:** category, version, description, dependencies, health URL

> **Note:** `backendUrl` must **not** include `/api`. IAM appends `/api/tenant/create` automatically.

---

## 6. Phase 3 — Assign module and provision tenant

**Owner:** Super Admin  
**UI:** `/super-admin/module-assignment`

### Step 3.1 — Select organization

Example: **GS Rugando TSS** (`organizationCode: 040001`)

### Step 3.2 — Assign modules

Check modules to enable:

- ☑ Academic  
- ☑ HR  
- ☐ Payroll (depends on HR — assign HR first if using payroll)

Click **Assign**.

**What IAM does automatically:**

1. Saves rows in `organization_modules`
2. For each module **with a backend URL**, calls:

   ```http
   POST http://localhost:3005/api/tenant/create
   x-service-key: dev-service-key
   x-source-service: IAM

   {
     "organizationId": "990100e1-5bba-4fb8-bcbf-a184c0b3cc66",
     "organizationName": "GS Rugando TSS",
     "organizationCode": "040001"
   }
   ```

3. On success, sets `tenantProvisioned: true` and syncs licensed modules for JWT

**API equivalent:**

```http
PUT /api/v1/super-admin/module-assignments/organizations/990100e1-5bba-4fb8-bcbf-a184c0b3cc66
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{
  "moduleIds": ["uuid-academic", "uuid-hr"]
}
```

### Step 3.3 — Verify provisioning (if needed)

**UI:** `/super-admin/module-provisioning`

If HR appears in **Pending Provisioning**, click **Create Tenant**.

| Pending reason | Fix |
|----------------|-----|
| HR backend not running | Start `HrModule/Backend` on port 3005 |
| 401 Invalid service key | Align `SERVICE_API_KEY` and `MODULE_PROVISIONING_KEY` |
| Connection refused | Wrong `backendUrl` in catalog |

Modules **without** a backend URL are marked provisioned automatically (license-only).

### Step 3.4 — Create organization admin (if not exists)

**UI:** Organization → **Settings** → **Organization Administrator**

Example:

| Field | Value |
|-------|-------|
| Email | `hr.admin@gsrugando.rw` |
| Password | *(leave blank to auto-generate)* |
| Require password change | ☑ |

Click **Save & Send Credentials**. Credentials are emailed (or logged to IAM console in dev).

---

## 7. Phase 4 — Organization admin access

**Owner:** Organization admin  
**UI:** `/organization-admin`

### Step 4.1 — Login

```
URL:     http://localhost:3000/login
Email:   hr.admin@gsrugando.rw
Password: <from email or console>
```

IAM returns JWT including licensed modules:

```json
{
  "modules": ["academic", "hr"]
}
```

> **After new modules are assigned**, org admin must **sign out and sign in again** so the JWT includes the new module slugs.

### Step 4.2 — Organization dashboard

```
GET /api/v1/iam/me/modules
Authorization: Bearer <token>
```

**Example response:**

```json
{
  "success": true,
  "data": [
    {
      "slug": "academic",
      "name": "Academic Module",
      "frontendUrl": "http://localhost:3007",
      "category": "Education"
    },
    {
      "slug": "hr",
      "name": "Human Resource Management",
      "frontendUrl": "http://localhost:3006",
      "category": "Human Resources"
    }
  ]
}
```

Only assigned **and provisioned** modules appear. HR will **not** show if tenant creation failed.

### Step 4.3 — Open HR module

Admin clicks **Human Resource Management**. IAM opens:

```
http://localhost:3006/dashboard?token=eyJhbGciOiJIUzI1NiIs...
```

HR frontend:

1. Reads `token` from URL → saves to localStorage  
2. Calls `GET http://localhost:3005/api/dashboard` with `Authorization: Bearer <token>`  
3. HR backend verifies JWT, checks `"hr"` in `modules`, loads tenant → returns dashboard  

### Step 4.4 — Error responses (HR backend)

| Status | Message | Meaning |
|--------|---------|---------|
| 401 | Authentication required | Missing or invalid JWT |
| 403 | Module Not Licensed | HR not in JWT `modules` — re-login after assignment |
| 403 | Tenant not provisioned | Assignment/provisioning incomplete |

---

## 8. Environment variables reference

### IAM (`Authentication/Backend/.env`)

```env
JWT_ACCESS_SECRET=change-me-access-secret-min-32-chars
MODULE_PROVISIONING_KEY=dev-service-key
PLATFORM_SERVICE_KEY=dev-service-key
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

### Any module backend

```env
JWT_ACCESS_SECRET=change-me-access-secret-min-32-chars   # same as IAM
SERVICE_API_KEY=dev-service-key                          # same as IAM MODULE_PROVISIONING_KEY
MODULE_SLUG=hr                                           # same as catalog slug
PORT=3005
CORS_ORIGIN=http://localhost:3006                        # module frontend origin
```

### Module frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:3005/api
NEXT_PUBLIC_IAM_URL=http://localhost:3000
```

---

## 9. Testing checklist

### Module team (before handoff)

- [ ] `GET /api/health` returns 200  
- [ ] `POST /api/tenant/create` with service key creates tenant  
- [ ] Second call with same org is idempotent (no duplicate error)  
- [ ] Protected route rejects request without JWT → 401  
- [ ] Protected route rejects JWT without module slug → 403  
- [ ] Protected route rejects JWT when tenant missing → 403  
- [ ] All queries filter by `organization_id`  
- [ ] Frontend opens via `/dashboard?token=` and loads dashboard  

### Platform team (after registration)

- [ ] Module visible in Super Admin catalog with correct URLs and slug  
- [ ] Assign to test org succeeds  
- [ ] Provisioning queue empty (tenant created)  
- [ ] Org admin sees module on `/organization-admin` after re-login  
- [ ] Clicking module opens frontend without “Missing access token”  

---

## 10. Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| Missing access token | Token lost on redirect | Open via `/dashboard?token=`; see Sample Module frontend |
| 401 service API key | Key mismatch | Sync `MODULE_PROVISIONING_KEY` and `SERVICE_API_KEY` |
| 502 provisioning failed | Backend down | Start module backend before Assign / Create Tenant |
| HR not on org dashboard | Not provisioned or not assigned | Check Module Provisioning queue |
| Module Not Licensed | Stale JWT | Org admin sign out and sign in again |
| CORS errors on IAM | Wrong port / backend restarted | IAM on 3001, frontend on 3000 |

---

## 11. Handoff template for module teams

Copy this into your PR or Confluence when HR (or any module) is ready for platform registration.

```markdown
## Module handoff — HR Module v1.0.0

**Team:** HR Development  
**Contact:** hr-dev@company.com  
**Reference:** SampleModule in ShulePlus repo

### Catalog registration
| Field | Value |
|-------|-------|
| name | Human Resource Management |
| slug | hr |
| version | 1.0.0 |
| category | Human Resources |
| frontendUrl (dev) | http://localhost:3006 |
| backendUrl (dev) | http://localhost:3005 |
| frontendUrl (prod) | https://hr.babyeyi.rw |
| backendUrl (prod) | https://api.babyeyi.rw/hr |

### Secrets (provided securely to platform ops)
- JWT_ACCESS_SECRET: *(matches IAM)*
- SERVICE_API_KEY: *(matches IAM MODULE_PROVISIONING_KEY)*

### Endpoints implemented
- [x] GET /api/health
- [x] POST /api/tenant/create
- [x] GET /api/dashboard
- [x] GET /api/employees
- [x] POST /api/employees

### Test organization used
- GS Rugando TSS (040001)

### Platform team actions
1. Register in Module Catalog
2. Assign to pilot organizations
3. Confirm provisioning queue clear
4. Confirm org admin can open module
```

---

## Quick links

| Resource | Path |
|----------|------|
| Sample Module (reference code) | [`SampleModule/`](../SampleModule/) |
| Shared secrets template | [`platform.env.example`](../platform.env.example) |
| IAM architecture | [`Authentication/ARCHITECTURE.md`](../Authentication/ARCHITECTURE.md) |
| Super Admin — Module Catalog | `http://localhost:3000/super-admin/module-catalog` |
| Super Admin — Module Assignment | `http://localhost:3000/super-admin/module-assignment` |
| Super Admin — Module Provisioning | `http://localhost:3000/super-admin/module-provisioning` |
| Organization Admin Dashboard | `http://localhost:3000/organization-admin` |

---

*Document maintained by the ShulePlus platform team. For changes to IAM contracts, update this guide and notify all module teams.*
