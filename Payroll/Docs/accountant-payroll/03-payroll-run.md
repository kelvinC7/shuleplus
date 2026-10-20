# Payroll Run

**Route:** `/accountant/payroll/run` (default `/payroll` landing)  
**Component:** `pages/Payroll/PayrollRun.jsx`  
**API:** `payrollRunService.triggerPayrollRun`, `getPayrollRuns`

---

## Purpose

Generate the **monthly payroll run** — select period, preview full register, apply run-only adjustments, include terminations, trigger backend run, export register.

---

## Frontend design

### Route & component

| Item | Value |
|---|---|
| Route | `/accountant/payroll/run` (default `/payroll` redirect) |
| Component | `pages/Payroll/PayrollRun.jsx` |
| Service | `payrollRunService.js` |
| Child components | `StaffToProcessModal`, `PayrollReportRegisterTable` |
| Utils | `payrollPreview.js`, `payrollReportTables.js`, `rwandaPayrollEngine.js` |

### Layout structure

```
AccountantOchreHero
├── Period: Academic year | Month | Term | Pay date
├── Validation banners (paid period, inactive template, missing basic)
├── Staff summary + StaffToProcessModal (include/exclude)
├── Run-level adjustments (clone of template allowances/deductions)
├── Per-employee adjustment drawer/modal
├── PayrollReportRegisterTable (live preview + footer totals)
└── Trigger Run | Export Excel
```

### React state (key)

| State | Purpose |
|---|---|
| `academicYear`, `month`, `term` | Period selection |
| `status` | `idle` → `running` → `done` |
| `templateConfig` | Active template from API |
| `staffRaw`, `empDeductions` | Staff + deductions for preview |
| `runAllowances`, `runDeductions` | Month-only overrides (not saved to template) |
| `employeeAdjustments` | Per-staff `{ extraAllowances, extraDeductions, basicSalaryOverride, allowanceSplit }` |
| `payrollData` | Preview rows from `buildPayrollPreviewRows()` |

### Key UI interactions

| Action | Client logic |
|---|---|
| Period change | Reload staff, check `getPayrollRuns()` for paid duplicate |
| Live preview | `buildPayrollPreviewRows()` → `calcRwandaPayroll()` per employee → `enrichRegisterRowForReports()` |
| Staff modal | Filter `staffUserIds` sent on trigger |
| Trigger run | `triggerPayrollRun(payload)` with period, staff IDs, run adjustments |
| Export | `downloadRunPayrollRegisterExcel()` |

---

## Backend logic

### API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/accountant/payroll/runs` | List runs for period |
| GET | `/accountant/payroll/runs/:id` | Run header + line items + `register_json` |
| POST | `/accountant/payroll/runs/trigger` | Create/update run and persist lines |
| PATCH | `/accountant/payroll/runs/:id/status` | Mark paid / status change |
| DELETE | `/accountant/payroll/runs/:id` | Delete if not paid |
| GET | `/accountant/payroll/templates/active` | Template for calc (also loaded in trigger) |
| GET | `/accountant/payroll/staff/search` | Staff profiles |
| GET | `/accountant/payroll/employee-deductions` | Active deductions per staff |

### Database tables

| Table | Role |
|---|---|
| `accountant_payroll_runs` | Run header: month, year, term, academic_year, status |
| `accountant_payroll_run_lines` | Per-employee amounts, `register_json` snapshot |
| `accountant_payroll_templates` | Statutory + template allowances/deductions |
| `staff` | `payroll_*` salary columns |
| `accountant_payroll_employee_deductions` | Loans/advances applied in run |

### Trigger transaction (`POST /runs/trigger`)

```
BEGIN TRANSACTION
  Reject if paid run exists for same school/month/year/academic year
  Load active template + staff rows + employee deductions
  Apply run-level allowanceOverrides / deductionOverrides from body
  For each included staffUserId:
    calcRwandaPayroll(basic, allowances, deductions, statutory, ...)
    INSERT/UPDATE accountant_payroll_run_lines
  INSERT or UPDATE accountant_payroll_runs (status: processing/draft)
COMMIT
```

### Business rules

- **409** if period already has a **paid** run.
- Requires active template (`is_active = 1`, `status = Active`) for full apply.
- Run-level adjustments override template for **this month only**.
- Terminations merged via `listTerminationsForPayrollMonth()` on frontend before trigger.
- Paid runs immutable — delete only when `isPayrollRunDeletable(status)`.

### Auth

- Read runs: `ACCOUNTANT_READ_ROLES`
- Trigger / delete / status: `ACCOUNTANT_WRITE_ROLES`

---

## Features (summary)

### Period selection

- Academic year from `/dos/academic-calendar-settings`
- Month dropdown (January–December)
- Term filter (optional, from registry)
- `resolvePayrollCalendarYear()` for API year param

### Pre-run validation

| Check | Behavior |
|-------|----------|
| Period already **paid** | Blocks new run, links to Salary Payment |
| **Inactive template** | Warning banner |
| **No active template** | Blocks run |
| **Missing basic salary** | Lists employees — link to Staff Salary Setup |
| Staff profile allowances / deductions | Info banner |

### Staff selection

- `StaffToProcessModal` — include/exclude employees for this run
- Default: active staff with payroll profile
- Terminations loaded via `listTerminationsForPayrollMonth()`

### Run-level adjustments (month only)

Clone of template allowances/deductions editable for **this run only**:

- Does not persist to Salary Template unless saved there separately
- Types: Fixed, % Basic, % Gross
- Recalculates preview instantly

### Per-employee overrides

`staffAdjustments` map keyed by user ID:

- `extraAllowances`, `extraDeductions`
- `basicSalaryOverride`
- `allowanceSplit` override

### Live preview register

```
buildPayrollPreviewRows()
  → calcRwandaPayroll() per employee
  → enrichRegisterRowForReports()
  → PayrollReportRegisterTable
```

Footer sums via `sumRunReportRows()`.

### Trigger run

`POST /accountant/payroll/runs/trigger` payload includes:

- `academicYear`, `month`, `year`, `term`
- `staffUserIds[]` (included staff)
- Run-level `allowances`, `deductions`
- Per-staff adjustments map

**UI states:** `idle` → `running` → `done`

After success: run appears in Salary Payment with status **Processing**.

### Export

- `downloadRunPayrollRegisterExcel()` — pre-run or post-run register

### Existing runs check

- `getPayrollRuns({ month, year, academicYear })`
- Detects if period already has paid run

---

## Developer notes

- Preview builder: `payrollPreview.js` — `buildPayrollPreviewRows`, `mergeAllowancesWithExtras`
- Clone helpers: `cloneAllowancesFromTemplate()`, `cloneDeductionsFromTemplate()`

---

## Related

- [06-salary-payment](./06-salary-payment.md)
- [00-payroll-engine](./00-payroll-engine.md)
