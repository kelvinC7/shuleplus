# Payroll Salary Template

**Route:** `/accountant/payroll/salary-template`  
**Component:** `pages/Payroll/SalaryTemplate.jsx`  
**API:** `payrollTemplateService.js`

> **Full step-by-step manual:** [FEATURES_INDEX](./FEATURES_INDEX.md) · [FEATURES_COMPLETE](./FEATURES_COMPLETE.md)  
> Chapters: [02 Overview](./features/02-salary-template-overview.md) · [03 Allowances](./features/03-allowances-tab.md) · [04 Deductions](./features/04-deductions-tab.md) · [05 Statutory](./features/05-statutory-rates-tab.md) · [06 Employee Deductions](./features/06-employee-deductions-tab.md)

---

## Purpose

Configure the **school-wide active payroll template**: statutory rates, PAYE brackets, allowance auto-rules, template allowances/deductions, and live register preview.

---

## Frontend design

### Route & component

| Item | Value |
|---|---|
| Route | `/accountant/payroll/salary-template` |
| Component | `pages/Payroll/SalaryTemplate.jsx` (~1765 lines) |
| Service | `services/payrollTemplateService.js` |
| Shared UI | `AccountantOchreHero`, `PayrollRegisterTable` |

### Layout structure

```
AccountantOchreHero (navy gradient, amber accent)
├── Status badge: Live from server / Offline
├── Actions: Refresh | Save Draft | Activate | Deactivate
├── Stats row (4 cards): Active Allowances, Template Deductions, Employee Deductions, Status
└── Tab bar
    ├── AllowancesTab      → table + auto-calc checkbox + Add modal
    ├── DeductionsTab      → recurring template deductions table
    ├── StatutoryTab       → PAYE table, contribution cards, live preview, register export
    └── EmployeeDeductionsTab → staff search + per-employee CRUD
```

### React state (root component)

| State | Purpose |
|---|---|
| `tab` | Active tab key: `allowances` \| `deductions` \| `statutory` \| `employee` |
| `allowances`, `deductions` | Template rows (mapped from API) |
| `empDeductions` | All school employee deductions |
| `payeRates`, `statutory`, `allowanceAuto` | Engine config |
| `templateMeta` | `{ id, status, version, isActive }` |
| `loading`, `saving`, `refreshing` | UI feedback |
| `previewBasic` | Statutory tab sample basic salary |

### Key UI interactions

| Action | Handler | Effect |
|---|---|---|
| Page load | `loadTemplate()` | Fetches template + employee deductions |
| Save Draft | `persistTemplate("save_draft")` | POST template, status Draft |
| Activate | `persistTemplate("activate")` | POST template, `is_active = 1` |
| Allowance edit | `AllowancesTab` → `onSaveDraft` | Auto-save via `persistTemplate("update")` |
| Live register | `StatutoryTab` | Client `calcRwandaPayroll()` per staff |
| Export | `downloadPayrollRegisterCsv/Excel` | Client-side file generation |

### Mappers & utils

- `mapAllowanceFromApi` / `mapAllowanceToApi` — API ↔ UI allowance shape
- `mapDeductionFromApi` / `mapDeductionToApi` — deductions
- `mapEmpDedFromApi` — employee deduction dates/labels
- `calcRwandaPayroll`, `calcProgressivePAYEBreakdown` — `rwandaPayrollEngine.js`
- `buildPayrollRegisterRow`, `sumPayrollRegisterRows` — `payrollRegister.js`
- `payrollChannelLabel` — `shared/payroll/payrollTemplateChannels.js`

---

## Backend logic

### API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/accountant/payroll/templates/active` | Load latest/active template for school |
| GET | `/accountant/payroll/templates/history` | Version list |
| POST | `/accountant/payroll/templates` | Save draft / update / activate / deactivate |
| POST | `/accountant/payroll/templates/preview` | Server-side `calcRwandaPayroll` |
| GET | `/accountant/payroll/employee-deductions` | List per-staff deductions |
| POST/PATCH/DELETE | `/accountant/payroll/employee-deductions` | CRUD |
| GET | `/accountant/payroll/staff/search` | Staff list for employee deductions + live register |

**Handler file:** `BabyeyiSystem/backend/BabyeyiRoutes/portalOperations.js`

### Database tables

| Table | Columns used |
|---|---|
| `accountant_payroll_templates` | `allowances_json`, `deductions_json`, `paye_rates_json`, `statutory_json`, `rules_json`, `status`, `is_active`, `version_no` |
| `accountant_payroll_template_versions` | `snapshot_json` on new version INSERT |
| `accountant_payroll_employee_deductions` | Per-staff loans, advances, installments |

### Template save transaction (`POST /templates`)

```
action = deactivate | update | save_draft | activate | (create)
BEGIN TRANSACTION
  IF activate: SET is_active=0 for all school templates
  UPDATE or INSERT accountant_payroll_templates
  IF new version: INSERT accountant_payroll_template_versions
COMMIT
appendAuditLog(entityType: 'payroll_template')
```

### Business rules

- Only **one** `is_active = 1` template per `school_id`.
- Payroll Run blocks if no active template (`PayrollRun.jsx` checks `templateMeta.isActive`).
- Employee deductions with `status = Active` feed into register preview via `monthlyInstallment`.
- Auto allowance rules stored in `rules_json.allowanceAuto`.

### Auth

- Read: `ACCOUNTANT_READ_ROLES`
- Write (save, activate, CRUD deductions): `ACCOUNTANT_WRITE_ROLES`
- All queries scoped by `req.ctx.schoolId`

---

## Features (summary)

### Statutory rates

Editable percentages for RSSB, RAMA, CBHI, maternity, occupational hazard (employee + employer where applicable).

### PAYE brackets

- Default Rwanda progressive bands
- `calcProgressivePAYEBreakdown()` live preview
- `normalizePayeRates()` sanitizes saved template data

### School allowance auto-rules

| Setting | Default |
|---------|---------|
| Enabled | true |
| Total % of gross | 30% |
| Register column % (Others/H/A/T/A) | 10% each |

When enabled, preview uses `calcSchoolAllowancesFromBasic()`.

### Template allowances

| Field | Options |
|-------|---------|
| Category | Transport, Housing, Communication, … |
| Amount type | Fixed, % of Basic, % of Gross |
| Tax treatment | Taxable / Non-Taxable |
| **Payroll channel** | Tax / Bank / Tax & Bank |
| Frequency | Monthly |
| Applies to | All Employees |
| Status | Active / Inactive |

### Template deductions

Same structure with channel support (e.g. welfare fund on bank channel only).

### Per-employee deductions (CRUD)

- Search staff via `searchPayrollStaff()`
- Create/update/delete via `/employee-deductions` API
- Shown in preview via `filterPayrollEmployeeDeductions()`

### Preview & export

- Live `calcRwandaPayroll()` per preview employee
- **Export CSV / Excel** — `downloadPayrollRegisterCsv`, `downloadPayrollRegisterExcel`
- Sums footer via `sumPayrollRegisterRows()`

### Template persistence

- `getActivePayrollTemplate()` on load
- `savePayrollTemplate(payload)` on save
- `getPayrollTemplateHistory(limit)` — version history (API)

---

## Developer notes

- See [features/03-allowances-tab](./features/03-allowances-tab.md) through [features/06-employee-deductions-tab](./features/06-employee-deductions-tab.md) for tab-level frontend/backend detail.

---

## Related

- [00-payroll-engine](./00-payroll-engine.md)
- [02-staff-salary-setup](./02-staff-salary-setup.md)
- [03-payroll-run](./03-payroll-run.md)
