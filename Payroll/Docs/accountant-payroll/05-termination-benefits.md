# Termination Benefits

**Route:** `/accountant/payroll/termination-benefits`  
**Component:** `pages/Payroll/TerminationBenefits.jsx`  
**API:** `terminationBenefitsService.js`  
**Calc:** `terminationBenefitsCalc.js`, `terminatedMonthPayroll.js`

---

## Purpose

Manage employee **termination lifecycle** — severance calculation, settlement approval, payment, and integration with monthly payroll for final-month salary.

---

## Frontend design

### Route & component

| Item | Value |
|---|---|
| Route | `/accountant/payroll/termination-benefits` |
| Component | `pages/Payroll/TerminationBenefits.jsx` |
| Service | `terminationBenefitsService.js` |
| Calc | `terminationBenefitsCalc.js`, `terminatedMonthPayroll.js` |
| Components | `TerminationPayrollWizard`, `TerminationDetailDrawer`, `TerminationFiltersBar` |

### Layout structure

```
AccountantOchreHero + KPI cards (pending, paid, total severance)
TerminationFiltersBar (department, status, date, search)
Terminations table + pagination
Modals: Create/Edit termination, Severance rate settings
TerminationDetailDrawer — full record
TerminationPayrollWizard — final-month payroll snapshot
```

### React state & hooks

- `useTerminationTable()` — filters, pagination, sort
- Loads active template in modals for net salary context
- `calcTerminationSettlement()` — client severance preview
- `buildTerminatedPayrollSnapshot()` — pro-rata row for Payroll Run integration

### Key UI interactions

| Action | Service function |
|---|---|
| Create/edit | `createTermination()` / `updateTermination()` |
| Submit | `submitTermination()` |
| Mark paid | `markTerminationPaid()` |
| Severance rates | `getSeveranceRates()` / `saveSeveranceRates()` |
| Analytics | `getTerminationAnalytics()` |
| Staff search | `searchTerminationStaff()` |

---

## Backend logic

### API endpoints

**Handler file:** `BabyeyiSystem/backend/BabyeyiRoutes/terminationBenefitsRoutes.js`

| Method | Path | Purpose |
|---|---|---|
| GET | `/accountant/termination-benefits` | List terminations |
| GET | `/accountant/termination-benefits/:id` | Single record |
| POST | `/accountant/termination-benefits` | Create |
| PATCH | `/accountant/termination-benefits/:id` | Update |
| POST | `/accountant/termination-benefits/calculate` | Server severance calc |
| GET | `/accountant/termination-benefits/for-payroll` | Month terminations for Payroll Run |
| GET | `/accountant/termination-benefits/analytics` | KPIs |
| GET/PUT | `/accountant/termination-benefits/severance-rates` | Tier config |
| GET | `/accountant/termination-benefits/staff/search` | Staff picker |

### Database

Termination records stored in accountant termination tables (staff, dates, severance amounts, status workflow).

### Business rules

- Severance calculated from net salary × years × tier multiplier (`DEFAULT_SEVERANCE_RATES`).
- **Final month salary** handled in Payroll Run via `buildTerminatedPayrollSnapshot()` — not mixed into severance lump sum.
- Outstanding deductions reduce settlement.
- Status enums must match frontend `TERMINATION_STATUSES`.

### Integration with Payroll Run

`listTerminationsForPayrollMonth(academicYear, month)` returns staff terminating that month → included in run preview with pro-rata basic.

---

## Features (summary)

### Termination record

| Field | Description |
|-------|-------------|
| Staff search | `searchTerminationStaff()` |
| Termination date | Required |
| Use days worked | Pro-rata final month |
| Outstanding deductions | Reduces settlement |
| Reason & notes | Text |
| Status workflow | See below |

### Status workflow

From `TERMINATION_STATUSES`:

```
Draft → Submitted → Approved → Paid
         (reject paths)
```

Actions:

- `createTermination()` / `updateTermination()`
- `submitTermination()` — send for approval
- `markTerminationPaid()` — after payment

### Severance calculation

`calcTerminationSettlement()` uses:

- Net salary (from payroll profile)
- Years worked → multiplier tiers (`DEFAULT_SEVERANCE_RATES`)
- Outstanding deductions
- **Severance only** — final month salary handled separately in Payroll Run

Display in `SummaryCard`:

- Years worked, multiplier, severance benefit, gross settlement, total payable

### Severance rate configuration

- `getSeveranceRates()` / `saveSeveranceRates()`
- Admin modal to edit tier multipliers

### Analytics

- `getTerminationAnalytics()` — dashboard KPIs

### Payroll month integration

- `listTerminationsForPayrollMonth()` — used by Payroll Run
- `buildTerminatedPayrollSnapshot()` — pro-rata register row for terminating employee

### Filters & table

- Shared hook `useTerminationTable()`
- Department, status, date range, search
- `TablePagination`

---

## Developer notes

- Manager mirror route: `/manager/finance/termination-benefits`

---

## Related
