# Salary Payment

**Route:** `/accountant/payroll/salary-payment`  
**Component:** `pages/SalaryPayment.jsx`  
**API:** `payrollRunService.js`

---

## Purpose

**Review saved payroll runs** for a period — full register, totals, mark as paid, delete draft/processing runs, export Excel.

---

## Frontend design

### Route & component

| Item | Value |
|---|---|
| Route | `/accountant/payroll/salary-payment` |
| Component | `pages/SalaryPayment.jsx` |
| Service | `payrollRunService.js` |
| UI | `AccountantOchreHero`, `PayrollReportRegisterTable` |
| Utils | `payrollReportTables.js`, `payrollRegister.js` |

### Layout structure

```
AccountantOchreHero
├── Filters: Academic year | Month
├── Run selector dropdown (runs for period)
├── Status badge: Draft | Processing | Paid
├── Search within register
├── PayrollReportRegisterTable (dynamic columns + totals)
└── Mark paid | Delete run | Export Excel
```

### React state & flow

| State | Purpose |
|---|---|
| `runs`, `selectedRunId` | Run list + selection |
| `runDetail` | Full run from `getPayrollRun(id)` |
| `registerRows` | `registerRowsFromRunDetail()` + `resolveRunReportColumns()` |
| `actionError`, `detailError`, `notice` | Separate error channels |

### Key UI interactions

| Action | API |
|---|---|
| Load period | `getPayrollRuns({ month, year, academicYear })` |
| Select run | `getPayrollRun(selectedRunId)` + `getActivePayrollTemplate()` |
| Mark paid | `markPayrollRunPaid(runId, payload)` |
| Delete | `deletePayrollRun(runId)` if `isPayrollRunDeletable()` |
| Export | `downloadRunPayrollRegisterExcel(rows, meta)` |

---

## Backend logic

### API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/accountant/payroll/runs` | List runs for period |
| GET | `/accountant/payroll/runs/:id` | Run + lines |
| PATCH | `/accountant/payroll/runs/:id/status` | Mark paid (`status: paid`) |
| DELETE | `/accountant/payroll/runs/:id` | Remove draft/processing run |

### Database tables

| Table | Role |
|---|---|
| `accountant_payroll_runs` | `status`, payment metadata |
| `accountant_payroll_run_lines` | Frozen register per employee |

### Business rules

- Mark paid locks run — unlocks Payslips, Bank Payroll, Disbursement.
- Delete blocked when `status = paid` (`isPayrollRunPaid()`).
- Register rows are **read from persisted lines** — not recalculated on this page.

### Workflow position

```
Payroll Run (trigger) → Salary Payment (review) → Disbursement → Paid
```

---

## Features (summary)

### Load runs

```javascript
getPayrollRuns({ month, year, academicYear, limit: 100 })
```

Auto-selects first run or keeps previous selection if still valid.

### Run detail

```javascript
getPayrollRun(selectedRunId)
getActivePayrollTemplate() // for column resolution
```

- `registerRowsFromRunDetail(runDetail, template)`
- `resolveRunReportColumns(rows, template)`
- `sumRunReportRows(rows)`

### Mark as paid / Delete / Export

(See Frontend design — Key UI interactions above.)

---

## Position in workflow

```
Payroll Run (trigger) → Salary Payment (review) → Disbursement (pay staff) → Paid
```

Accountant typically verifies register here before disbursement.

---

## Related

- [03-payroll-run](./03-payroll-run.md)
- [08-payroll-disbursement](./08-payroll-disbursement.md)
