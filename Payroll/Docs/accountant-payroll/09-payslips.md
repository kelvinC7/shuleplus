# Payslips Management

**Route:** `/accountant/payroll/payslips`  
**Component:** `pages/Payroll/PaySlips.jsx`  
**Components:** `ModernPayslipDocument.jsx`, `exportPayslipPdf.js`

---

## Purpose

View, preview, **download PDF**, and **print** payslips for **paid** payroll runs.

---

## Frontend design

### Route & component

| Item | Value |
|---|---|
| Route | `/accountant/payroll/payslips` |
| Component | `pages/Payroll/PaySlips.jsx` |
| Document | `ModernPayslipDocument.jsx` |
| Export | `exportPayslipPdf.js`, `payslipBuilder.js`, `payslipAssets.js` |
| Service | `payrollDisbursementService.js`, `payslipBrandingService.js` |

### Layout structure

```
Filters: Academic year | Month | Run | Department | Position | Status
Search employees
Payslip list grid/table
Right slide-over: Payslip Preview (full height)
Link to Settings → payslip branding
```

### React state & pipeline

1. `getPaidPayrollRuns({ month, year, academicYear })` — **paid runs only**.
2. `getPayrollRun(runDbId)` → `mapLineToPaymentRow()` → payslip list.
3. `getPayslipBranding()` on mount — logo, stamp, signature URLs.
4. Preview: `buildPayslipData(row, runMeta, branding)` → `ModernPayslipDocument`.
5. Client filters: department, position, status (on loaded list).

### Key UI interactions

| Action | Implementation |
|---|---|
| Download PDF | html2canvas + jsPDF via `exportPayslipPdf.js` |
| Print | `printPayslip()` |
| DOM clone fixes | `html2canvasExportFix.js` |

---

## Backend logic

### API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/accountant/payroll/runs` | Filter `status=paid` |
| GET | `/accountant/payroll/runs/:id` | Run lines for payslip data |
| GET/POST | `/accountant/payroll/payslip-branding` | School logo, stamp, signature |
| POST | `/babyeyi/upload-asset` | Branding image upload |

No separate payslip PDF API — PDF generated **entirely on client**.

### Database tables

| Table | Data |
|---|---|
| `accountant_payroll_runs` | Paid run metadata |
| `accountant_payroll_run_lines` | Earnings/deductions per employee |
| Payslip branding table | School branding JSON |

### Business rules

- Only **paid** runs appear (`getPaidPayrollRuns`).
- Payslip amounts match frozen run lines (not live recalc).
- Branding from Accountant Settings (`/accountant/settings`).

---

## Features (summary)

### Load paid runs only

```javascript
getPaidPayrollRuns({ month, year, academicYear })
getPayrollRun(runDbId)
mapLineToPaymentRow() → payslip list
```

### Payslip data pipeline

```
buildPayslipData(paymentRow, runMeta, schoolBranding)
  → ModernPayslipDocument
  → exportPayslipPdf / printPayslip
```

### Branding

- `getPayslipBranding()` on mount
- Configured in **Accountant Settings** (`payslipBrandingService`)
- Logo, stamp, signature URLs via `payslipAssets.js`

### Preview panel actions

| Action | Implementation |
|--------|----------------|
| Download PDF | html2canvas + jsPDF |
| Print | `printPayslip()` window |
| Close | Dismiss drawer |

### Bulk actions (UI)

- Icons for mail/archive — check implementation status before relying in production

### Filters

- Department, position, payment status
- Client-side filter on loaded payslips

---

## Payslip content (typical)

- School header + branding
- Employee ID, name, department, position
- Pay period, run number
- Earnings: basic, allowances breakdown
- Deductions: PAYE, RSSB, RAMA, loans, etc.
- Net pay, YTD placeholders (if configured)

---

## Developer notes

- Settings link: `/accountant/settings`

---

## Related

- [08-payroll-disbursement](./08-payroll-disbursement.md)
- [11-my-payroll](./11-my-payroll.md) — staff view
- [14-recommended-features](./14-recommended-features.md) — email payslips
