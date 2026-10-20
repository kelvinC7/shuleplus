# ShulePlus — Module Ports (local development)

Each module must use **unique** frontend and backend ports so they can run side by side.

> **Source of truth** for local URLs. Keep `Authentication/Backend/src/config/local-module-urls.ts` in sync with this file.

## Currently listening (this machine)

Checked: **2026-07-30**

| Port | Status | Likely service |
|------|--------|----------------|
| 3000 | Listening | Authentication Frontend |
| 3001 | Listening (health OK) | Authentication / IAM Backend |
| 3012 | Listening (health OK) | BabyeyiWizard Backend |
| 3013 | Listening | BabyeyiWizard Frontend |
| Others | Not listening | Start with each module’s `npm run dev` |

---

## Canonical port map

### Platform

| Module | Frontend | Backend | Folder |
|--------|----------|---------|--------|
| Authentication (landing + IAM UI) | **3000** | — | `Authentication/Frontend` |
| IAM API | — | **3001** | `Authentication/Backend` |
| Notification Service | — | **3002** | `Authentication/Notification-Service` |

### Education

| Module | Frontend | Backend | Folder |
|--------|----------|---------|--------|
| Academic | **3004** | **3003** | `Academic/` |
| Student Management | **3053** | **3052** | `StudentManagement/` |
| School Mini-Website | **3054** | **3055** | `MiniWebsite/` |
| Timetable | **3011** | **3010** | `Timetable/` |
| Teacher Portal (TichaPortal) | **5173** | **4000** | `TichaPortal/` |
| Teacher Portal (legacy Next.js) | **3017** | **3009** | `TeacherPortal/` |
| Babyeyi Wizard | **3013** | **3012** | `BabyeyiWizard/` |
| Attendance | **3025** | **3024** | `Attendance/` |
| Transport | **3065** | **3064** | `Transport/` |
| RFID Device (Attendance) | **3063** | **3062** | `Device/` |
| Student Discipline | **3033** | **3032** | `StudentDiscpline/` |
| Nesa Dashboard | **3016** | **3018** | `NesaDashboard/` |
| Parent MIS | **3049** | **3048** | `ParentMIS/` |
| Sector MIS (SEI Attendance) | **3071** | **3070** | `SectorMIS/` |
| DEO MIS (District Attendance) | **3073** | **3072** | `DEOMIS/` |

### Finance & HR

| Module | Frontend | Backend | Folder |
|--------|----------|---------|--------|
| School Fees Portal | **3015** | **3014** | `SchoolFeesPortal/` |
| Budget | **3023** | **3022** | `Budget/` |
| HR | **3006** | **3005** | `HR/` |
| Payroll | **3008** | **3026** | `Payroll/` |
| KaziAvance | **4401** | **4400** | `KaziAvance/` |

### Operations

| Module | Frontend | Backend | Folder |
|--------|----------|---------|--------|
| Assets Portal | **3021** | **3020** | `AssetsPortal/` |
| Procurement MIS | **3031** | **3030** | `ProcurementMIS/` |
| Action Plan MIS | **3035** | **3034** | `ActionPlanMIS/` |
| Cafeteria | **3042** | **3043** | `Cafeteria/` |
| Canteen | **3050** | **3051** | `Canteen/` |
| Inventory MIS | **3045** | **3044** | `InventoryMIS/` |
| School Uniform MIS | **3050** | **3051** | `SchoolUniformMIS/` |
| Task MIS | **3047** | **3046** | `TaskMIS/` |
| ShuleKit MIS | **3039** | **3038** | `ShuleKitMIS/` |

### Template only

| Module | Frontend | Backend | Folder |
|--------|----------|---------|--------|
| Sample Module | **3091** | **3090** | `SampleModule/` |
| Curriculum Intelligence | — | **3094** | `CurriculumIntelligence/Backend` (Superadmin UI in IAM :3000) |

---

## Conflicts that were fixed

These ports previously collided (same port claimed by more than one service):

| Old shared port | Was claimed by | Resolution |
|-----------------|----------------|------------|
| 3003 / 3004 | Academic, Inventory, TaskMIS, ParentMIS, Sample | Academic keeps 3003/3004; others moved |
| 3005 | Cafeteria FE + HR BE | Cafeteria FE → 3042 |
| 3007 | Cafeteria BE + Payroll BE | Cafeteria BE → 3043; Payroll BE → 3026 |
| 3009 | Teacher Portal BE + ParentMIS FE | ParentMIS FE → 3049 |
| 3012 | Babyeyi BE + Teacher Portal FE | Teacher Portal FE → 3017 |
| 3014 / 3015 | School Fees + Nesa | School Fees keeps 3014/3015; Nesa → 3018 / 3016 |
| KaziAvance | local-module-urls `3039/3040` vs app `4400/4401` | Use **4400 / 4401** |

---

## How to start a module

```bash
# Backend (example: Babyeyi)
cd BabyeyiWizard/Backend
npm run dev

# Frontend
cd BabyeyiWizard/Frontend
npm run dev
```

Open:

- Frontend: `http://localhost:<FE_PORT>`
- Backend health: `http://localhost:<BE_PORT>/api/health` or `/health`

## Quick port check (PowerShell)

```powershell
Get-NetTCPConnection -State Listen |
  Where-Object { $_.LocalPort -ge 3000 -and $_.LocalPort -le 4500 } |
  Select-Object LocalPort, OwningProcess |
  Sort-Object LocalPort
```

Or:

```bash
node scripts/check-module-ports.mjs
```

---

## Per-module docs

Each module folder also has a short `PORTS.md` pointing at this map.
