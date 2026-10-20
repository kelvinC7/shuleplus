# Payroll Reports

**Route:** `/accountant/payroll/reports`  
**Component:** `pages/Payroll/PayrollReports.jsx`

---

## Purpose

Analytics and regulatory exports for **Tax Payroll** and **Bank Payroll** registers — charts, KPIs, PDF/Excel download.

---

## Frontend design

### Route & component

| Item | Value |
|---|---|
| Route | `/accountant/payroll/reports` |
| Component | `pages/Payroll/PayrollReports.jsx` |
| Service | `payrollRunService.js` |
| UI | `PayrollReportRegisterTable`, Recharts (Line, Bar, Pie) |
| Utils | `payrollReportTables.js`, `payrollReportExport.js`, `payrollPreview.js` |

### Layout structure

```
Filter bar: Academic year | Month | Run selector | Refresh
KPI cards: Gross, Net, PAYE, RSSB, headcount, …
Tabs: Tax Payroll | Bank Payroll
├── Recharts analytics (trends, department breakdown)
├── Dynamic columns (resolveTaxReportColumns / resolveBankReportColumns)
└── Export PDF | Export Excel
```

### React state & data flow

1. `getPayrollRuns({ month, year, academicYear })` — populate run dropdown.
2. `getPayrollRun(selectedRunId)` — load persisted lines.
3. `registerRowsFromRunDetail(runDetail, template)` — map API → register rows.
4. `enrichRegisterRowForReports(rows, template)` — tax vs bank column split.
5. If no run: optional `buildPayrollPreviewRows()` live preview mode.
6. `computeReportAnalytics(rows)` — chart datasets.

### Key UI interactions

| Tab | Columns source | Export |
|---|---|---|
| Tax Payroll | `resolveTaxReportColumns()` | `downloadTaxPayrollReportPdf/Excel` |
| Bank Payroll | `resolveBankReportColumns()` | `downloadBankPayrollReportPdf/Excel` |

Chart colors: navy `#000435`, amber `#F59E0B`.

---

## Backend logic

### API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/accountant/payroll/runs` | List runs for filters |
| GET | `/accountant/payroll/runs/:id` | Run lines with stored register JSON |
| GET | `/accountant/payroll/templates/active` | Column resolution + channel labels |

Reports are **read-only** — no separate reports API; data comes from persisted run lines.

### Database tables

| Table | Data used |
|---|---|
| `accountant_payroll_runs` | Period, status, totals metadata |
| `accountant_payroll_run_lines` | Per-employee `basic_salary_rwf`, deductions, `register_json` |
| `accountant_payroll_templates` | Channel rules for tax vs bank columns |

### Business rules

- Tax tab shows tax-channel deductions and statutory columns.
- Bank tab shows bank-channel adjustments and `finalPayable`.
- `isPayrollRunPaid()` filters which runs appear in paid-only views.
- Terminations overlay: `listTerminationsForPayrollMonth()` adjusts analytics headcount.

### Calculation

- Persisted runs: amounts from DB lines (computed at trigger time).
- Preview mode: client `calcRwandaPayroll()` same as Payroll Run.

---

## Features (summary)

### Data loading

1. `getPayrollRuns()` for period
2. `getPayrollRun(selectedRunId)` for line detail
3. `registerRowsFromRunDetail()` — map API lines to register rows
4. `enrichRegisterRowForReports()` — tax/bank column split
5. Optional preview mode via `buildPayrollPreviewRows()` when no run selected

### Tax Payroll tab

Columns typically include:

- Gross, taxable allowances, PAYE, RSSB employee, RAMA, CBHI, maternity
- Template deductions (tax channel)
- Tax net salary

**Exports:**

- `downloadTaxPayrollReportPdf()`
- `downloadTaxPayrollReportExcel()`

### Bank Payroll tab

Columns typically include:

- Bank name, account, net salary, bank-channel deductions
- Final payable amount

**Exports:**

- `downloadBankPayrollReportPdf()`
- `downloadBankPayrollReportExcel()`

### Analytics

`computeReportAnalytics(rows)` — aggregates for charts:

- Department breakdown
- PAYE vs net trend (multi-month when runs available)
- Statutory totals

### Terminations overlay

- Loads terminations for month via `listTerminationsForPayrollMonth()`
- Reflects terminated staff in analytics

---

## Developer notes

- Column resolution shared with Salary Payment for consistency.

---

## Related

- [00-payroll-engine](./00-payroll-engine.md) — channel logic
- [13-services-and-utils](./13-services-and-utils.md) — export functions
