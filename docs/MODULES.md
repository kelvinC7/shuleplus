# ShulePlus — Module Catalog

Reference for every product module in this repository: what it does, how it fits the platform, and what is included (apps, ports, IAM slug).

For local ports, see [PORTS.md](./PORTS.md). For building a new module, see [MODULE_INTEGRATION_GUIDE.md](./MODULE_INTEGRATION_GUIDE.md) and [SampleModule](../SampleModule/README.md).

---

## How modules work on the platform

1. **Authentication (IAM)** — Users sign in at `Authentication/Frontend` (:3000). The IAM API (:3001) issues JWTs that include `organizationId`, roles, and licensed `modules` slugs.
2. **Module catalog** — Super Admin registers each module (slug, frontend URL, backend URL) in **Module Catalog** and assigns it to organizations.
3. **Tenant provisioning** — When a school gets a module, IAM calls `POST /api/tenant/create` on that module’s backend (with a service key) to create an isolated tenant database/schema.
4. **Launch** — Organization Admin or the user opens the module from the dashboard; the frontend loads with `?token=...` (or equivalent SSO handoff). The module backend verifies the JWT and that the slug appears in `modules`.
5. **Shared secrets** — All backends use the same `JWT_ACCESS_SECRET` and typically `SERVICE_API_KEY` / `MODULE_PROVISIONING_KEY` as IAM (see `platform.env.example`).

Most modules follow:

```
ModuleName/
├── Backend/          Express + Prisma (+ PostgreSQL)
├── Frontend/         Next.js, Vite + React, or similar
└── Docs/             Feature specs (where present)
```

**Cross-cutting packages**

| Path | Role |
|------|------|
| [`packages/ui`](../packages/ui/README.md) | Shared UI components and theme for microservice frontends |
| [`Authentication/Notification-Service`](../Authentication/Notification-Service/README.md) | Central email, SMS, push, in-app, OTP (:3002) |
| [`Firmware/`](../Firmware/) | ESP32 RFID gate/card reader firmware (talks to Attendance API, not IAM UI) |

---

## Platform & access

### Authentication (IAM)

| | |
|---|---|
| **Folder** | `Authentication/` |
| **Slug** | *(platform — not a licensed module)* |
| **Ports** | FE **3000**, API **3001** |
| **Docs** | [Authentication/README.md](../Authentication/README.md), [ARCHITECTURE.md](../Authentication/ARCHITECTURE.md) |

**Purpose.** Identity, organizations, roles, module catalog, assignment, provisioning, super-admin and org-admin consoles, landing/marketing UI.

**Included.**

- **Frontend** — Login, super-admin, organization-admin, root-admin, school-representative UI, developer docs, curriculum super-admin UI (`/super-admin/curriculum`), RFID network (`/super-admin/rfid-network`).
- **Backend** — REST API + Swagger (`/api/docs`), Prisma/PostgreSQL, JWT issuance, module lifecycle, representative APIs (`/iam/representative`).
- **Notification-Service** — Outbound notifications for all modules.

**How it works.** Every other module trusts IAM JWTs; module backends do not implement their own login—they validate license + tenant scope.

---

### School Representative Portal

| | |
|---|---|
| **Folder** | `SchoolRepresentative/` *(UI lives in Authentication Frontend)* |
| **Role** | `school_representative` |
| **Docs** | [SchoolRepresentative/README.md](../SchoolRepresentative/README.md) |

**Purpose.** Multi-school oversight for representatives assigned to several organizations.

**Included.** Dashboard under `/school-representative`, Super Admin **Representatives** management, profiles/assignments/follow-ups in IAM schema. Metrics combine real IAM data with placeholders until Academic, Fees, Payroll, and Attendance clients are fully wired.

---

### Sample Module

| | |
|---|---|
| **Folder** | `SampleModule/` |
| **Slug** | `sample-module` |
| **Ports** | BE **3090**, FE **3091** |
| **Docs** | [SampleModule/README.md](../SampleModule/README.md) |

**Purpose.** Minimal reference microservice (health, tenant create, tenant-scoped CRUD) for new module teams.

---

## Education

### Academic

| | |
|---|---|
| **Folder** | `Academic/` |
| **Slug** | `academic` |
| **Ports** | BE **3003**, FE **3004** |
| **Stack** | Express + Prisma, Vite + MUI |

**Purpose.** Core school academics: students, classes, courses, assessments, exams, marks, report cards, and analytics. Marked **core** in IAM seed.

**Included (main areas).**

- **Students & classes** — CRUD, promotion, round roll call.
- **Courses & subjects** — Catalog, by-class assignments.
- **Assessments & marks** — Templates, mark entry, corrections, grading scales, competency (CBC), assignments.
- **Examinations** — Sessions wizard, timetable, seating, invigilators, live exam desk, published exams, reports.
- **Report cards** — Classic and v2 flows, graduation, academic dashboard, teacher-facing mark entry/analytics.
- **Analytics** — School-level academic insights.

**How it works.** Tenant-scoped API; often paired with **Student Management** (master data) and **Timetable** (scheduling). Teachers may also use **TichaPortal** for day-to-day workflows.

---

### Student Management

| | |
|---|---|
| **Folder** | `StudentManagement/` |
| **Slug** | `student-management` |
| **Ports** | BE **3052**, FE **3053** |

**Purpose.** Student **master data** and class operations (enrollment-focused), complementing Academic’s teaching/exam workflows.

**Included.**

- Dashboard, **Manage Students**, reports, incomplete profiles, **Student Promotion**.
- **Classes** — Manage classes, class teachers, class monitors.
- Settings.

**How it works.** Core module in seed; **Print Card** and other modules read class/level labels from here.

---

### Timetable

| | |
|---|---|
| **Folder** | `Timetable/` |
| **Slug** | `timetable` |
| **Ports** | BE **3010**, FE **3011** |
| **Docs** | [Timetable/README.md](../Timetable/README.md), [Docs/timetable/](../Timetable/Docs/timetable/) |

**Purpose.** DOS scheduling: teacher assignments, courses, slots, auto-generation, drag-and-drop edits, conflict resolution, exports.

**Included.**

- Dashboard (KPIs, workflow, alerts).
- Teacher assignments (`periods_per_week` source of truth).
- Setup tabs: Teachers, Courses, Time Settings, Generator, Timetable (DnD), Per Class, Conflict Center.
- Exports (class, teacher, master CSV).

**Depends on.** Academic (catalog seed); feeds **Attendance**, marks, and **TichaPortal** timetable views.

---

### Teacher Portal — TichaPortal (primary)

| | |
|---|---|
| **Folder** | `TichaPortal/` |
| **Slug** | *(BFF — launched as teacher product; links many modules)* |
| **Ports** | FE **5173**, BFF **4000** |
| **Docs** | [TichaPortal/README.md](../TichaPortal/README.md) |

**Purpose.** Modern **teacher command center**: React UI + Express BFF that proxies IAM, Timetable, Academic, Student Management, HR, Payroll, Attendance, Discipline, Babyeyi, KaziAvance, etc.

**Included (representative sidebar).**

- Dashboard, AI insights.
- **Academics** — Register marks, assessments, grade book, question bank.
- **Students** — Profiles, at-risk, performance, CBC competencies, rankings.
- **Intelligence** — AI assistant, predictions, learning gaps.
- **Attendance** — Take attendance, analytics.
- **Communication** — Parent messages, notifications, meetings.
- **Reports** — Academic, report comments, CBC, performance.
- **Insights** — Teacher insights, intervention plans.
- **Lesson plans** — Curriculum Intelligence integration (`/lesson-plans`).

**How it works.** Teachers authenticate via IAM; the BFF holds upstream URLs in `backend/.env` and forwards authenticated requests—preferred over legacy **TeacherPortal** (:3017/:3009).

---

### Teacher Portal (legacy Next.js)

| | |
|---|---|
| **Folder** | `TeacherPortal/` |
| **Slug** | `teacher-portal` |
| **Ports** | BE **3009**, FE **3017** |
| **Docs** | [TeacherPortal/README.md](../TeacherPortal/README.md) |

**Purpose.** Older teacher microservice; salary advance and dashboard live; other routes scaffolded. **TichaPortal** is the strategic UI for new teacher features.

**Included.** Dashboard, **Salary Advance Management** (eligibility, cashout, requests); TichaAvance/Shule Avance documentation under `teacher-portal/` and `ticha-avance/`.

---

### Digital Attendance (RFID)

| | |
|---|---|
| **Folder** | `Attendance/` |
| **Slug** | `attendance` |
| **Ports** | BE **3024**, FE **3025** |
| **Docs** | [Attendance/README.md](../Attendance/README.md) |

**Purpose.** School entry/exit and presence using smart cards and RFID devices.

**Included.**

- Smart card lifecycle (register, block, lost, bulk, replacements, QR payload).
- Entry/exit desks, parent notifications.
- Device registry (online/offline, test, battery/signal).
- Settings (late rules, channels, school times), permissions workflow.
- Live monitor, movement, reports, security alerts, audit logs.
- Gate batch API for **Firmware** readers (`/api/gate_attendance/batch`, device config, heartbeat).

---

### RFID Device Module

| | |
|---|---|
| **Folder** | `Device/` |
| **Slug** | `device` |
| **Ports** | BE **3062**, FE **3063** |
| **Docs** | [Device/README.md](../Device/README.md) |

**Purpose.** Operations dashboard for RFID hardware on the network (complements Attendance business logic).

**Included.** Dashboard, device register/detail, live attendance, card events, unknown cards, remote **Commands**, configuration (Wi‑Fi, firmware), logs, alerts. Super Admin **RFID Network** in IAM.

---

### Firmware (gate & card readers)

| | |
|---|---|
| **Folder** | `Firmware/ShulePlus_Gate_Reader`, `Firmware/ShulePlus_Card_Reader` |

**Purpose.** Offline-first ESP32 + MFRC522 firmware: local queue, HTTPS sync to Attendance API, provisioning AP, heartbeats.

**Not an IAM module** — devices use API keys and attendance endpoints documented in the `.ino` headers.

---

### Smart Transport

| | |
|---|---|
| **Folder** | `Transport/` |
| **Slug** | `transport` |
| **Ports** | BE **3064**, FE **3065** |
| **Docs** | [Transport/README.md](../Transport/README.md) |

**Purpose.** Bus RFID boarding/exit, live trips, GPS, parent alerts, fleet, fees, fuel, maintenance.

---

### Student Discipline

| | |
|---|---|
| **Folder** | `StudentDiscpline/` |
| **Slug** | `student-discipline` |
| **Ports** | BE **3032**, FE **3033** |

**Purpose.** Discipline cases, permissions, gate management, positive behavior, reports.

**Included.** Dashboard; discipline cases/categories/create; permission requests; gate management; positive behavior; reports.

---

### Parent MIS

| | |
|---|---|
| **Folder** | `ParentMIS/` |
| **Slug** | `parent-mis` |
| **Ports** | BE **3048**, FE **3049** |

**Purpose.** Parent-facing portal for school life: academics, fees, communication, health, events.

**Included.** Dashboard; profile, marks, attendance, timetable, homework; fee management and transactions; communication, notifications, leave, discipline, health center, events, documents.

---

### NESA Dashboard

| | |
|---|---|
| **Folder** | `NesaDashboard/` |
| **Slug** | `nesa` |
| **Ports** | BE **3018**, FE **3016** |
| **Docs** | [NesaDashboard/Docs/README.md](../NesaDashboard/Docs/README.md) |

**Purpose.** National Education Standards Authority console: national KPIs, schools, circulars, fee policy, geography, academic years.

**Included.** Dashboard (map, AI insights); schools list/detail; circulars; **Fee Policy** (6-step wizard, versions, compliance); approvals; provinces/districts/sectors; academic years/terms/holidays/calendars.

**How it works.** Specialists get JWT with only `nesa` and land directly on `/nesa/dashboard` (not org-admin launcher).

---

### Sector MIS (SEI)

| | |
|---|---|
| **Folder** | `SectorMIS/` |
| **Slug** | `sector-mis` |
| **Ports** | BE **3070**, FE **3071** |
| **Docs** | [SectorMIS/README.md](../SectorMIS/README.md) |

**Purpose.** **Sector Education Inspector** attendance intelligence: sector-wide monitoring and follow-up.

**Included.** Command center, morning situation; schools; student/staff attendance; analytics, attention required, data quality, integrity; device health, sector map, follow-up cases, school visits; reports; settings.

---

### District MIS (DEO)

| | |
|---|---|
| **Folder** | `DEOMIS/` |
| **Slug** | `deo-mis` |
| **Ports** | BE **3072**, FE **3073** |
| **Docs** | [DEOMIS/README.md](../DEOMIS/README.md) |

**Purpose.** **District Education Officer** rollups: sectors, schools, performance breakdowns (students, staff, class, gender).

**Included.** Same command-center pattern as Sector MIS plus **Sectors** overview; DEO users need `deo_officer_profiles` with `districtId`.

---

### Babyeyi Wizard

| | |
|---|---|
| **Folder** | `BabyeyiWizard/` |
| **Slug** | `babyeyi` |
| **Ports** | BE **3012**, FE **3013** |
| **Docs** | [BabyeyiWizard/README.md](../BabyeyiWizard/README.md), [Docs/](../BabyeyiWizard/Docs/) |

**Purpose.** School **circular** (Babyeyi) creation, approval, analytics, and parent-facing verification.

**Included.** Dashboard; 9-step create wizard (NESA checker, AI sidebar); circular list/detail; approval center (Director → Accountant → District → NESA); analytics; school assets (logo/stamp/signature); templates; parent preview; public QR verify; notifications, versions, collaboration, settings.

---

### School Mini-Website

| | |
|---|---|
| **Folder** | `MiniWebsite/` |
| **Slug** | `mini-website` |
| **Ports** | BE **3055**, FE **3054** |

**Purpose.** Publish a simple public school site and manage admissions interest.

**Included.** Overview dashboard; **Website** editor (gallery, leaders, content); **Applicants** pipeline; **Settings**; public school directory; admission form builder.

---

### Library

| | |
|---|---|
| **Folder** | `Library/` |
| **Slug** | `library` |
| **Ports** | BE **3060**, FE **3061** |

**Purpose.** Smart school library: catalog, circulation, members, digital resources.

**Included.**

- **Catalog** — Resources, categories, subjects, shelves, add resource.
- **Circulation** — Borrow, returns, reservations, overdue, fines.
- **Members** — Students, teachers.
- **Operations** — Visits, book requests, digital library.
- **Inventory** — Stock, damaged, lost, transfers.
- **Reports & settings.**

---

### Curriculum Intelligence

| | |
|---|---|
| **Folder** | `CurriculumIntelligence/` |
| **Slug** | `curriculum-intelligence` |
| **Ports** | BE **3094** (Superadmin UI in IAM :3000) |
| **Docs** | [CurriculumIntelligence/README.md](../CurriculumIntelligence/README.md) |

**Purpose.** REB-aligned curriculum PDF ingestion, review tree, and AI lesson plan generation.

**Included.** Platform APIs for book upload/review/publish; teacher catalog and lesson-plan generation; Python PDF worker (`worker/extract_pdf.py`). Teachers consume via **TichaPortal** lesson plans; admins via IAM **Curriculum Intelligence**.

---

## Finance & HR

### School Fees Portal

| | |
|---|---|
| **Folder** | `SchoolFeesPortal/` |
| **Slug** | `school-fees` |
| **Ports** | BE **3014**, FE **3015** |
| **Docs** | [SchoolFeesPortal/README.md](../SchoolFeesPortal/README.md) |

**Purpose.** Fee structures, billing, payments, installments, scholarships, receipts (QR), notifications, finance dashboard, analytics, audit.

---

### School Budget

| | |
|---|---|
| **Folder** | `Budget/` |
| **Slug** | `school-budget` |
| **Ports** | BE **3022**, FE **3023** |
| **Docs** | [Budget/README.md](../Budget/README.md), [Docs/accountant-school-budget/](../Budget/Docs/accountant-school-budget/) |

**Purpose.** Plan income, allocate expenses, track utilization, manager approvals (accountant portal pattern).

**Note.** `BudgetManagement/` holds additional documentation copies for the same domain; runtime code lives under `Budget/`.

---

### HR

| | |
|---|---|
| **Folder** | `HR/` |
| **Slug** | `hr` |
| **Ports** | BE **3005**, FE **3006** |
| **Docs** | [HR/README.md](../HR/README.md), [Docs/hr-center/](../HR/Docs/hr-center/) |

**Purpose.** Workforce master data and HR operations for schools.

**Included.** Dashboard; employee directory & 7-step registration; contracts; categories; leave; departments; org chart; documents; qualifications; employee 360° profile.

---

### Payroll

| | |
|---|---|
| **Folder** | `Payroll/` |
| **Slug** | `payroll` |
| **Ports** | BE **3026**, FE **3008** |
| **Docs** | [Payroll/README.md](../Payroll/README.md), [Docs/accountant-payroll/](../Payroll/Docs/accountant-payroll/) |

**Purpose.** Rwanda-compliant payroll: PAYE, RSSB, runs, payslips, bank files, termination benefits.

**Included.** Dashboard; employee roster/import (HR link); salary templates; staff salary setup; monthly **Payroll Run**; reports; termination; salary payment & disbursement; payslips; bank payroll; **My Payroll** self-service.

**Depends on.** HR module for employee source data.

---

### KaziAvance

| | |
|---|---|
| **Folder** | `KaziAvance/` |
| **Slug** | `kaziavance` |
| **Ports** | BE **4400**, FE **4401** |
| **Docs** | [KaziAvance/Frontend/README.md](../KaziAvance/Frontend/README.md), [Backend/README.md](../KaziAvance/Backend/README.md) |

**Purpose.** Employee **salary advance** self-service (eligibility, requests, repayment, documents).

**Included.** IAM SSO-only UI; financial KPIs; eligibility scoring; advance calculator; multi-step request wizard; active advance tracker; history; approval timeline; notifications; document uploads. Syncs with Payroll when available.

---

## Operations & assets

### Assets Portal

| | |
|---|---|
| **Folder** | `AssetsPortal/` |
| **Slug** | `assets-portal` |
| **Ports** | BE **3020**, FE **3021** |
| **Docs** | [AssetsPortal/README.md](../AssetsPortal/README.md), [Docs/assets-portal/](../AssetsPortal/Docs/assets-portal/) |

**Purpose.** KPS-style fixed asset register, depreciation, operations, QR scan, reports.

**Included.** Categories & year setup; asset register (import/recalc chain); assignments, returns, transfers, maintenance; analytics; public QR lookup.

---

### Inventory MIS

| | |
|---|---|
| **Folder** | `InventoryMIS/` |
| **Slug** | `inventory-mis` *(IAM seed may show `inventory`)* |
| **Ports** | BE **3044**, FE **3045** |

**Purpose.** Stock and warehouse operations (consumables), distinct from fixed **Assets Portal**.

**Included.** Dashboard; products & categories; stock summary; stores & suppliers; receiving, issues, transfers, adjustments; department requests; physical counts; disposals; reports.

---

### Procurement MIS

| | |
|---|---|
| **Folder** | `ProcurementMIS/` |
| **Slug** | `procurement-mis` |
| **Ports** | BE **3030**, FE **3031** |

**Purpose.** Purchase-to-pay for schools: requests, POs, GRN, suppliers, budgets, analytics.

**Included (supervisor nav).** Overview; purchase requests; purchase orders, goods received, returns, contracts, budgets; suppliers & performance; procurement/department/requester analytics; notifications; settings. Reduced nav for basic requesters.

---

### Action Plan MIS

| | |
|---|---|
| **Folder** | `ActionPlanMIS/` |
| **Slug** | `action-plan` |
| **Ports** | BE **3034**, FE **3035** |

**Purpose.** Strategic action plans with objectives, evidence, KPIs, and budget linkage.

**Included.** Dashboard; action plans; objectives & activities; templates; evidence; KPIs & targets; calendar; activity budget & utilization; strategic pillars (settings).

---

### Task MIS

| | |
|---|---|
| **Folder** | `TaskMIS/` |
| **Slug** | `task-module` |
| **Ports** | BE **3046**, FE **3047** |

**Purpose.** Work management: tasks, kanban, workflows, time tracking.

**Included.** Dashboard; tasks & detail; kanban board; workflows & visual builder; calendar; time tracking; reports; notifications; settings.

---

### ShuleKit MIS

| | |
|---|---|
| **Folder** | `ShuleKitMIS/` |
| **Slug** | `shulekit-mis` |
| **Ports** | BE **3038**, FE **3039** |

**Purpose.** Platform-managed **material kits** — Super Admin catalog; schools/parents place Standard/Custom orders.

**Included.** Overview dashboard; **Kits** catalog management; **Orders** (requests, payments, status pipeline); public order/status pages.

---

### School Uniform MIS

| | |
|---|---|
| **Folder** | `SchoolUniformMIS/` |
| **Slug** | `school-uniform` |
| **Ports** | BE **3051**, FE **3050** |
| **Docs** | [SchoolUniformMIS/README.md](../SchoolUniformMIS/README.md) |

**Purpose.** Uniform ERP: products, packages, optional fabric/tailoring manufacturing, inventory, student assignment, sales.

**Included.** Dashboard; uniform items & packages; fabric stock (optional); tailoring workflows (optional); inventory; students; sales; suppliers; reports; settings toggles for fabric/tailoring modules.

---

### Cafeteria

| | |
|---|---|
| **Folder** | `Cafeteria/` |
| **Slug** | `cafeteria` |
| **Ports** | BE **3043**, FE **3042** |

**Purpose.** In-school meal program operations (kitchen-centric).

**Included.** Dashboard; menu planning, recipes, meal production, beneficiaries; kitchen stock requests, staff, duty roster, hygiene, cold storage; food waste; suppliers; nutrition & allergies; analytics; reports; notifications; settings.

---

### School Canteen

| | |
|---|---|
| **Folder** | `Canteen/` |
| **Slug** | `canteen` |
| **Ports** | BE **3051**, FE **3050** *(see [PORTS.md](./PORTS.md) — verify no local conflict with Uniform)* |

**Purpose.** Commercial canteen marketplace: operators, suppliers, drivers, POS, deliveries.

**Included (role-based).** Platform admin: canteens, suppliers, applications, orders, fleet; **Operator**: POS, menu, inventory, purchases, cashout, reports, supplier discovery; **Supplier** orders/products/drivers; **Driver** deliveries and location.

---

### Print Card MIS

| | |
|---|---|
| **Folder** | `PrintCardMIS/` |
| **Slug** | `print-card` |
| **Ports** | BE **3093**, FE **3092** |
| **Docs** | [PrintCardMIS/README.md](../PrintCardMIS/README.md) |

**Purpose.** Design preview and bulk export of student/staff **smart ID cards** (PNG/JPEG/PDF/ZIP).

**Included.** Same card renderer as Super Admin; org-scoped printing; education levels from Student Management; super-admin cross-school browse.

---

## Communication

### ShuleChat / Internal Chat

| | |
|---|---|
| **Folder** | `InternalChat/` |
| **IAM slug (seed)** | `shulechat` |
| **Backend slug (env)** | `chat` |
| **Docs** | [InternalChat/docs/PARENT_APP_INTEGRATION.md](../InternalChat/docs/PARENT_APP_INTEGRATION.md) |

**Purpose.** Secure messaging for teachers, parents, and staff — direct messages, groups, announcements (per IAM catalog description).

**Included.** Chat UI; admin tab for moderation/configuration; backend microservice pattern aligned with other modules.

---

## Quick reference — slug & ports

| Module | IAM slug | BE | FE |
|--------|----------|----|----|
| IAM API | — | 3001 | 3000 |
| Notifications | — | 3002 | — |
| Academic | `academic` | 3003 | 3004 |
| HR | `hr` | 3005 | 3006 |
| Payroll | `payroll` | 3026 | 3008 |
| Timetable | `timetable` | 3010 | 3011 |
| Babyeyi Wizard | `babyeyi` | 3012 | 3013 |
| School Fees | `school-fees` | 3014 | 3015 |
| NESA | `nesa` | 3018 | 3016 |
| Teacher Portal (legacy) | `teacher-portal` | 3009 | 3017 |
| Assets Portal | `assets-portal` | 3020 | 3021 |
| School Budget | `school-budget` | 3022 | 3023 |
| Attendance | `attendance` | 3024 | 3025 |
| Cafeteria | `cafeteria` | 3043 | 3042 |
| Student Discipline | `student-discipline` | 3032 | 3033 |
| Action Plan | `action-plan` | 3034 | 3035 |
| Procurement | `procurement-mis` | 3030 | 3031 |
| ShuleKit | `shulekit-mis` | 3038 | 3039 |
| Inventory | `inventory-mis` | 3044 | 3045 |
| Task MIS | `task-module` | 3046 | 3047 |
| Parent MIS | `parent-mis` | 3048 | 3049 |
| Canteen / Uniform | `canteen` / `school-uniform` | 3051 | 3050 |
| Mini-Website | `mini-website` | 3055 | 3054 |
| Student Management | `student-management` | 3052 | 3053 |
| Transport | `transport` | 3064 | 3065 |
| Library | `library` | 3060 | 3061 |
| Device (RFID) | `device` | 3062 | 3063 |
| Sector MIS | `sector-mis` | 3070 | 3071 |
| DEO MIS | `deo-mis` | 3072 | 3073 |
| Print Card | `print-card` | 3093 | 3092 |
| Sample Module | `sample-module` | 3090 | 3091 |
| Curriculum Intelligence | `curriculum-intelligence` | 3094 | *(IAM UI)* |
| KaziAvance | `kaziavance` | 4400 | 4401 |
| TichaPortal BFF | — | 4000 | 5173 |

Port conflicts (Canteen vs Uniform on 3050/3051) are documented in [PORTS.md](./PORTS.md)—run one at a time locally or adjust `.env` for development.

---

## Per-module README index

Each folder often has its own `README.md` and `PORTS.md`. Start here for deep dives:

| Folder | README |
|--------|--------|
| Authentication | [../Authentication/README.md](../Authentication/README.md) |
| Academic | [../Academic/README.md](../Academic/README.md) |
| Student Management | [../StudentManagement/README.md](../StudentManagement/README.md) |
| Timetable | [../Timetable/README.md](../Timetable/README.md) |
| TichaPortal | [../TichaPortal/README.md](../TichaPortal/README.md) |
| Attendance | [../Attendance/README.md](../Attendance/README.md) |
| Device | [../Device/README.md](../Device/README.md) |
| HR / Payroll / Fees / Budget | HR, Payroll, SchoolFeesPortal, Budget READMEs |
| Governance (NESA, Sector, DEO) | NesaDashboard Docs, SectorMIS, DEOMIS READMEs |
| Operations MIS | AssetsPortal, InventoryMIS, ProcurementMIS, ActionPlanMIS, TaskMIS, ShuleKit, Uniform, Cafeteria, Canteen, PrintCard |
| Babyeyi / Curriculum | BabyeyiWizard, CurriculumIntelligence READMEs |

When you add a module, update this catalog, [PORTS.md](./PORTS.md), and IAM seed or Module Catalog entries so descriptions stay aligned.
