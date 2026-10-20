# 01 — Getting Started (Accountant Payroll Setup)

> Each chapter follows [DOC_STANDARDS](../DOC_STANDARDS.md): **Frontend design** + **Backend logic**.

## Purpose

Configure school payroll **before** the first Payroll Run. This chapter covers access, routes, and the order of operations for Salary Template and Staff Salary Setup.

---

---

## Frontend design (module entry)

| Portal area | Route | Component |
|---|---|---|
| Salary Template | `/accountant/payroll/salary-template` | `SalaryTemplate.jsx` |
| Staff Salary Setup | `/accountant/payroll/staff-salary-setup` | `StaffSalarySetup.jsx` |
| Payroll Run | `/accountant/payroll/run` | `PayrollRun.jsx` |

Shared shell: `AccountantOchreHero`, `Layout`, `Sidebar` (`PortalRoutes.jsx`).

---

## Backend logic (module entry)

| Concern | Location |
|---|---|
| REST API | `portalOperations.js` → `/accountant/payroll/*` |
| Terminations | `terminationBenefitsRoutes.js` |
| Tenancy | `req.ctx.schoolId` on every query |
| Auth | `ACCOUNTANT_READ_ROLES` / `ACCOUNTANT_WRITE_ROLES` |

Setup order: template (POST `/templates` activate) → staff profile (PATCH `/staff/:userId`) → run (POST `/runs/trigger`).

---

## Access

1. Log in with an **Accountant** (or authorized finance) account.
2. Open the **Accountant Portal**.
3. Confirm you see the **Payroll** group in the sidebar.

## Routes

| Page | Route | Component |
|---|---|---|
| Payroll Salary Template | `/accountant/payroll/salary-template` | `SalaryTemplate.jsx` |
| Staff Salary Setup | `/accountant/payroll/staff-salary-setup` | `StaffSalarySetup.jsx` |
| Payroll Run (next step) | `/accountant/payroll/run` | `PayrollRun.jsx` |

Standalone Vite dev app: port **5178** (`accountant_portal/frontend`).

---

## First-time setup checklist

```
□ Employees exist in Employee Directory (or imported)
□ Open Salary Template
□ Configure Allowances tab (optional template rows + auto Others/H/A/T/A)
□ Configure Deductions tab (SACCO, welfare, etc. if applicable)
□ Review Statutory Rates tab (PAYE + CSR + RAMA)
□ Add Employee Deductions if any school-wide loans on file
□ Save Draft → Activate template
□ Open Staff Salary Setup
□ Set basic salary (or Net-to-Gross) for each employee
□ Save salary package per staff
□ Verify Live Payroll Register on Statutory tab
□ Proceed to Payroll Run
```

---

## What you see on first open

### Salary Template

```
┌────────────────────────────────────────────────────────┐
│ [Hero] Salary Template                                 │
│ Status: Draft / Active / Inactive                      │
│ Stats: Allowances | Deductions | Emp Ded | Status      │
│ Tabs: Allowances | Deductions | Statutory | Emp Ded     │
└────────────────────────────────────────────────────────┘
```

### Staff Salary Setup

```
┌─────────────┬──────────────────────────────────────────┐
│ Search      │ Mode: Normal | NetToGross                  │
│ Staff list  │ Tabs: Earnings | Deductions | Advance | Summary │
└─────────────┴──────────────────────────────────────────┘
```

---

## Roles and permissions

| Action | Role required |
|---|---|
| View template and staff salaries | Accountant read roles |
| Save template, activate, edit staff pay | Accountant write roles |

Backend enforces `requireRole(ACCOUNTANT_READ_ROLES)` / `ACCOUNTANT_WRITE_ROLES` on all `/accountant/payroll/*` routes.

---

## Module map (developer)

```
accountant_portal/frontend/src/
├── pages/Payroll/SalaryTemplate.jsx      ← school template UI
├── pages/Payroll/StaffSalarySetup.jsx    ← per-staff UI
├── services/payrollTemplateService.js    ← API client
└── utils/rwandaPayrollEngine.js          ← shared math

BabyeyiSystem/backend/BabyeyiRoutes/
└── portalOperations.js                   ← REST routes + DB
```

---

## Next steps

- [02 — Salary Template Overview](./02-salary-template-overview.md)
- [07 — Staff Salary Setup](./07-staff-salary-setup.md)
- [09 — Frontend & Backend Flow](./09-frontend-backend-flow.md)
