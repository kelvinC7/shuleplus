# Shule+ Manager — System Architecture v1.0

A multi-tenant SaaS platform for schools, NGOs, hospitals, businesses, churches, and government institutions. Organisations subscribe to the modules they need. All suites share a single authentication, permissions, and notification system.

**Stack at a glance:** React + TypeScript · Node.js/Express · MySQL · Multi-tenant SaaS

---

## 1. Overview

| Metric | Count |
|---|---|
| Business Suites | 6 |
| Modules | 33 |
| Shared Core Services | 14 |
| Roles | 27 |

> **Single Sign-On across all suites**
> Users log in once and access all subscribed modules based on their role, department, and data scope. JWT + refresh tokens are validated at the API Gateway before any business service is reached.

### Organisations Supported
Schools · Businesses · NGOs · Churches · Hospitals · Factories · Government

### Multi-Tenancy Model

**Subscription flow:**
```
Organisation
    ↓
Subscribed Modules
    ↓
Roles & Permissions
    ↓
Users
```

**Key design decisions:**
- **Module gating** — Unsubscribed module routes are hidden in the UI and blocked at the API middleware layer.
- **Centralised notifications** — No service sends SMS/email directly; all delegate to the Notification Service.
- **Auto data scoping** — Every DB query is automatically filtered by `organization_id` + `data_scope`.
- **Full audit trail** — Every create/edit/delete is logged with user, module, record, and timestamp.

### Ecosystem Map

**Core Platform (shared by all suites):**
Auth Service · Authorization · Organization · Notifications · File Store · Audit Logs · Reporting Engine · Analytics · Search · Settings · Workflow · Communication · Document Service · API Gateway

**Business Services:**
| Service | Modules |
|---|---|
| Education Service | 9 |
| Finance Service | 6 |
| HR Service | 4 |
| Operations Service | 5 |
| Communication Service | 5 |
| Smart Technology Service | 4 |
| RFID Service · AI Service · Marketplace | — |

---

## 2. Suites & Modules (33 modules across 6 suites)

### 🎓 Education Suite
*Teaching, learning, students, and parents.*

| Module | Roles | Key Features | Shared Services |
|---|---|---|---|
| Academic Management | Director, Registrar, Deputy Director, HOD, Teacher | Student Registration, Student Profiles, Promotion, Classes & Streams, Subjects, Examination Management, Marks Entry, Report Cards, Academic Analytics, Graduation Management | Auth, Notification, File, Audit Log, Reporting, Workflow |
| Teacher Portal | Teacher, HOD, Deputy Director | My Classes, Timetable, Marks Entry, Attendance, Lesson Plans, Assignments, Academic Reports | Auth, File, Notification |
| Parent Portal | Parent | Student Progress, Attendance Tracking, Fee Status, Academic Reports, Notifications, School Communication | Auth, Notification, Communication |
| Student Discipline Management | Director, Deputy Director, Teacher, HOD | Discipline Cases, Rewards, Warnings, Suspensions, Parent Notifications, Discipline Reports | Auth, Notification, Audit Log, Reporting |
| Smart Timetable | Director, Deputy Director, HOD | Teacher Timetable, Student Timetable, Classroom Allocation, Automatic Scheduling | Auth, Settings |
| School Calendar | Director, Deputy Director, All Staff | Academic Calendar, School Events, Examinations, Holidays, Meetings | Auth, Notification, Communication |
| Library Management | Librarian, Teacher, Student | Books, Borrowing, Returns, Fines, E-Library | Auth, File, Audit Log |
| School Transport | Transport Manager, RFID Officer | Vehicles, Routes, Drivers, RFID Boarding, Transport Reports | Auth, RFID Service, Notification, Reporting |
| School Canteen | Canteen Manager, RFID Officer | Meals, Meal Tracking, RFID Validation, Meal Reports, Nutrition Records | Auth, RFID Service, Reporting |

### 💰 Finance Suite
*All financial operations.*

| Module | Roles | Key Features | Shared Services |
|---|---|---|---|
| Finance Management | Finance Manager, Accountant | Income, Expenses, Receipts, Invoices, Payments, Cash Flow, Financial Reports | Auth, Notification, Audit Log, Reporting, Workflow |
| Student Fee Collection | Accountant, Finance Manager | Fee Structures, Student Billing, Payments, Receipts, Outstanding Balances, Fee Analytics | Auth, Notification, Audit Log, Reporting |
| Budget Management | Finance Manager, Director, Org Admin | Annual/Department Budgets, Budget Requests, Approvals, Revisions, Tracking, Variance Reports | Auth, Workflow, Audit Log, Reporting |
| Payroll Management | Payroll Officer, Finance Manager, HR Manager | Salary Processing, Deductions, Taxes/PAYE, RSSB/RAMA/CBHI, Payslips, Payroll Reports | Auth, Notification, Audit Log, Reporting, Workflow |
| ShuleAvance — Salary Advances | Payroll Officer, Finance Manager | Salary Advances, Loan Requests, Approval Workflow, Repayment Tracking | Auth, Workflow, Notification, Audit Log |
| Procurement Management | Procurement Manager, Finance Manager, Store Keeper | Purchase Requests, Requisition Orders, Purchase Orders, Supplier Management, Procurement Reports | Auth, Workflow, Audit Log, Reporting, Notification |

### 👥 Human Resources Suite
*People and workforce management.*

| Module | Roles | Key Features | Shared Services |
|---|---|---|---|
| HR Management | HR Manager, Org Admin, Director | Employee Profiles, Contracts, Recruitment, Staff Documents, Performance Reviews, Self-Service | Auth, File, Notification, Audit Log, Workflow |
| Leave Management | HR Manager, Leave Officer, All Staff | Leave Requests, Approvals, Leave Balance, Leave Reports | Auth, Workflow, Notification, Audit Log |
| Attendance Management | Attendance Officer, HR Manager, Org Admin | Staff Attendance, Shift Management, Overtime, Attendance Reports | Auth, RFID Service, Audit Log, Reporting |
| Teacher Management | Director, Deputy Director, HR Manager | Qualifications, Experience, Subject Allocation, Professional Development | Auth, File, Audit Log |

### ⚙️ Operations Suite
*Daily operations and organisational planning.*

| Module | Roles | Key Features | Shared Services |
|---|---|---|---|
| Action Plan Management | Director, Operations Manager, Org Admin | Strategic Plans, Annual Action Plans, Activities, KPIs, Targets, Progress Tracking, Performance Reports | Auth, Audit Log, Reporting, Analytics |
| Inventory Management | Store Keeper, Operations Manager | Stock In, Stock Out, Transfers, Warehouses, Inventory Reports | Auth, Audit Log, Reporting, Notification |
| Asset Management | Asset Manager, Operations Manager | Asset Registration, Tracking, Depreciation, Maintenance, Disposal | Auth, Audit Log, Reporting, File |
| Document Management | Org Admin, Director, All Staff | Policies, Contracts, Reports, File Storage, Digital Signatures, Version Control | Auth, File, Document Service, Audit Log |
| Task & Workflow Management | All Roles | Tasks, Assignments, Follow-ups, Approvals, Workflow Tracking | Auth, Workflow, Notification, Audit Log |

### 📢 Communication Suite
*Internal and external communication.*

| Module | Roles | Key Features | Shared Services |
|---|---|---|---|
| Internal Communication | All Staff | Staff Messaging, Department Chats, Announcements, Discussion Groups | Auth, Communication, Notification |
| Parent Communication | Communication Officer, Director, Teacher | SMS, Email, Push Notifications, Parent Messages | Auth, Notification, Communication |
| Circular Wizard | Director, Communication Officer, Org Admin | Circular Generator, Templates, Translation, Distribution Tracking | Auth, Document Service, Notification, File |
| Notification Center | Org Admin, Communication Officer | SMS Gateway, Email Gateway, Push Notifications, Automated Reminders | Auth, Notification |
| School Mini Website | Org Admin, Communication Officer | Website Builder, News, Events, Gallery, Contact Forms, Admissions | Auth, File, Document Service |

### 🤖 Smart Technology Suite
*Modern digital services and AI tools.*

| Module | Roles | Key Features | Shared Services |
|---|---|---|---|
| RFID & Smart Card Management | RFID Officer, Security, Transport Manager | Smart Cards, Attendance, Access Control, Gate Management, Visitor Tracking | Auth, Audit Log, Notification, Reporting |
| QR Code Management | RFID Officer, Admin | QR Attendance, QR Verification, Digital IDs | Auth, Audit Log |
| AI Assistant — Babyeyi Wizard | Director, Org Admin, Communication Officer | Circular Generator, AI Report Writing, Budget Assistant, Policy Generator, Translation Assistant, School Insights | Auth, Document Service, File, Audit Log |
| Analytics & Business Intelligence | Director, Finance Manager, Org Admin | Dashboards, KPIs, Charts, Predictive Analytics, Performance Monitoring | Auth, Analytics, Reporting, Search |

---

## 3. Core Services (Shared Infrastructure)

> **Architecture rule:** Finance never sends an SMS. HR never writes its own file upload handler. Education never builds a PDF report renderer. Each business service calls the appropriate shared service. Violations create hidden duplication and break the audit trail.

| Service | Description | Used By |
|---|---|---|
| **Auth Service** | JWT, SSO, refresh tokens, password reset, sessions, MFA (future). Every request starts here. | ALL services |
| **Authorization** | Roles, permissions, access policies, module gating. Middleware on every API route. | ALL services |
| **Organization Service** | Multi-tenancy. Manages organizations, branches, departments (tables: `organizations`, `branches`, `departments`). | Auth, all business services |
| **Notification Service** | SMS (Africa's Talking), Email, Push, WhatsApp (future). Business services never send directly. | Finance, HR, Education, Comm… |
| **File Service** | All file uploads: student photos, contracts, PDFs. Single endpoint for every service. | Education, HR, Ops, Comm… |
| **Audit Log Service** | Every create/update/delete logged. Fields: `user_id`, `action`, `module`, `record_id`, `created_at`. | ALL services |
| **Reporting Service** | Shared PDF/Excel/CSV engine. Finance, HR, Education all call this instead of building their own. | Finance, HR, Education, Ops |
| **Analytics Service** | KPIs, statistics, trends, forecasts. Feeds Recharts dashboards across all suites. | Director, Finance, Ops dashboards |
| **Search Service** | Global cross-service search — e.g. "Theo" returns Student Theo, Employee Theo, Parent Theo. | ALL services |
| **Settings Service** | System settings, branding, language, currency, academic year. Per-organisation. | ALL services |
| **Workflow Service** | Request → Review → Approve → Complete flows. Budget, Procurement, Leave, Payroll all use this. | Finance, HR, Operations |
| **Communication Service** | Internal chat, comments, discussion groups, announcements. Staff messaging across departments. | Education, HR, Communication |
| **Document Service** | Contracts, policies, circulars, meeting minutes. Digital signatures and version control. | HR, Ops, Communication, Smart |
| **API Gateway** | All requests pass through here. Auth validation, rate limiting, routing, logging. | ALL — entry point for the frontend |

---

## 4. Roles & Access Control (9 Levels · 27 Roles)

Every user carries: **Role + Permissions + Department + Data Scope**. The API middleware auto-filters records — no manual scoping in business logic.

### Data Scope Levels

| Scope | Coverage | Example |
|---|---|---|
| `SELF` | Own records only | Teacher sees own marks |
| `DEPARTMENT` | All records in own department | HOD |
| `BRANCH` | Assigned section | Head of Studies — O Level |
| `ORGANIZATION` | Entire school or org | Director, Finance Manager |
| `ALL` | All organisations | Super Admin only |

### Permission Token Format

```json
// Attached to req.user after JWT validation
{
  "role": "HEAD_OF_STUDIES",
  "department": "O_LEVEL",
  "dataScope": "DEPARTMENT",
  "organizationId": "org_abc123",
  "permissions": [
    "students.view", "attendance.view",
    "reports.generate", "timetable.manage"
  ],
  "subscribedModules": ["academics", "rfid", "finance"]
}
```

### All Roles

| Level | Role | Modules | Data Scope | Restrictions |
|---|---|---|---|---|
| Platform | Super Administrator | Everything — all organizations | ALL | N/A |
| Platform | Organisation Owner | Own org, subscriptions, module purchase | ORGANIZATION | Other organisations |
| Org Admin | Organisation Administrator | HR, Finance, Academics, Inventory, Communication | ORGANIZATION | Platform settings |
| Org Admin | Operations Manager | Action Plans, Procurement, Inventory, Assets | ORGANIZATION | Payroll, HR contracts |
| Finance | Finance Manager | Budget, Finance, Payroll, Reports | ORGANIZATION | — |
| Finance | Accountant | Student Fees, Invoices, Receipts, Expenses | ORGANIZATION | Delete budgets, change payroll settings |
| Finance | Payroll Officer | Payroll, Salary Advances, Payslips | ORGANIZATION | Budget management, student fees |
| HR | HR Manager | Employees, Contracts, Leave, Performance | ORGANIZATION | Finance, payroll |
| HR | Leave Officer | Leave Requests, Leave Approvals | DEPARTMENT | Payroll, HR management |
| HR | Attendance Officer | Staff Attendance, Reports | DEPARTMENT | Leave, contracts |
| School | School Director | Academics, Teachers, Students, Finance Overview | ORGANIZATION | Platform settings |
| School | Deputy Director Academics | Exams, Timetable, Academic Reports, Teachers | ORGANIZATION | Finance, HR |
| School | Head of Department (HOD) | Dept Reports, Teachers, Subjects | DEPARTMENT | Other departments |
| School | Teacher | Attendance, Marks Entry, Timetable, Assignments | SELF | Payroll, Budget, HR |
| School | Registrar | Student Registration, Transfers, Promotion | ORGANIZATION | Finance, HR |
| School | Librarian | Books, Borrowing, Returns | ORGANIZATION | Academics, Finance |
| School | Canteen Manager | Meals, Food Inventory, Meal Reports | ORGANIZATION | Academics, HR |
| School | Transport Manager | Buses, Routes, Drivers | ORGANIZATION | Academics, Finance |
| School | RFID Officer | Smart Cards, RFID Attendance, Access Control | ORGANIZATION | Academic data, Finance |
| Stakeholders | Parent | Child Attendance, Reports, Fee Status, Notifications | SELF | Other students' data |
| Stakeholders | Student | Timetable, Results, Assignments, Attendance | SELF | Other students, admin |
| Procurement | Procurement Manager | Purchase Requests, Requisitions, Purchase Orders | ORGANIZATION | Finance budget |
| Procurement | Store Keeper | Stock In, Stock Out, Inventory Reports | ORGANIZATION | Purchase orders |
| Procurement | Asset Manager | Assets, Maintenance, Asset Reports | ORGANIZATION | Procurement, Finance |
| Communication | Communication Officer | Announcements, SMS Campaigns, Circulars | ORGANIZATION | Academic, Finance data |
| Marketplace | Vendor | Manage Products, Orders, Inventory | SELF | Other vendors |
| Marketplace | Customer | Browse Products, Purchase | SELF | Vendor management |

---

## 5. Tech Stack

### Frontend
| Layer | Technologies |
|---|---|
| Core | React 18, TypeScript, Vite, React Router v6 |
| UI & Styling | Tailwind CSS, Shadcn/ui, Lucide React, CSS Variables |
| Data & Charts | React Query (TanStack), Recharts, Zustand, React Hook Form + Zod |
| Design System | Amber `#FCB038`, Navy `#000435`, Inter / Montserrat, shared `packages/ui` library |

### Backend
| Layer | Technologies |
|---|---|
| Runtime & Framework | Node.js LTS, Express.js, TypeScript, ts-node-dev |
| Database & ORM | MySQL 8, Prisma ORM, Redis (queue/cache), DB per tenant schema |
| Auth & Security | JWT (access + refresh), bcrypt, Helmet.js, CORS middleware |
| Background Jobs | BullMQ, Redis, scheduled payroll runs, notification queue |

### Integrations & Infrastructure
| Layer | Technologies |
|---|---|
| External Integrations | Africa's Talking SMS, Nodemailer (email), RFID hardware API, S3 / local file storage |
| Infrastructure & DevOps | Linux VPS (mopas-srv-01), PM2 process manager, Nginx reverse proxy, Certbot / Let's Encrypt |
| Reports & Exports | PDFKit / Puppeteer, ExcelJS (XLSX), CSV streams, shared Reporting Service |
| Deployment | GitHub → deploy script, PM2 cluster mode, Nginx multi-domain, Certbot SSL auto-renew |

---

## 6. Request Flow

### API Request Lifecycle

1. **Client sends request** — React frontend calls `POST /api/v1/students` with an `Authorization: Bearer <jwt>` header.
2. **API Gateway receives** — Rate limiting, request logging, and route resolution to the correct microservice (Education, Finance, HR…).
3. **Auth middleware validates JWT** — Verifies token signature and expiry; decodes user context (role, department, data scope, subscribed modules) and attaches it to `req.user`.
4. **Authorization middleware checks** — Does `req.user.permissions` include `students.create`? Is `academics` in `req.user.subscribedModules`? If not → `403`.
5. **Business service handles logic** — Education Service controller runs. All DB queries are auto-scoped by `organization_id` and the user's `data_scope`.
6. **Side-effects delegated** — Notification Service queues an SMS. File Service handles any uploads. Audit Log Service records the action with user + timestamp.
7. **Response returned** — JSON response sent to client; React Query cache is invalidated; UI re-renders with fresh data.

### Core Database Tables

```
organizations          -- id, name, type, plan, created_at
organization_modules    -- org_id, module_id, status, activated_at
users                    -- id, org_id, role_id, dept_id, data_scope, email
roles                    -- id, org_id, name, permissions[] (JSON)
departments              -- id, org_id, name, parent_dept_id
sessions                 -- id, user_id, token, refresh_token, expires_at
audit_logs               -- id, user_id, action, module, record_id, ip, ts
notifications            -- id, org_id, user_id, channel, status, sent_at
files                    -- id, org_id, name, path, type, uploaded_by
```

### Module Subscription Flow

1. **Super Admin activates** — Inserts a row in `organization_modules` for this org + module.
2. **Org Admin configures** — Creates roles and assigns only permissions from subscribed modules.
3. **Users see their scope** — Inactive module routes are hidden in the UI and return `403` at the API.
