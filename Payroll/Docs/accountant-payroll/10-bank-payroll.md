# Bank Payroll (Bank Transfers)

**Route:** `/accountant/payroll/bank-payroll`  
**Component:** `pages/Payroll/BankPayroll.jsx`

---

## Purpose

Generate **bank transfer files** grouped by bank — for uploading to BK, BPR, Equity, I&M, Ecobank, etc.

---

## Frontend design

### Route & component

| Item | Value |
|---|---|
| Route | `/accountant/payroll/bank-payroll` |
| Component | `pages/Payroll/BankPayroll.jsx` |
| Service | `payrollDisbursementService.js` |
| Modal | `BankEmployeesModal` |

### Layout structure

```
Period selectors (academic year, month, run)
KPI row: total employees | total RWF | bank count
Bank cards grid (BK, BPR, Equity, I&M, Ecobank — BANK_META colors)
Click card → BankEmployeesModal (employee list + export)
```

### React state & flow

1. Load paid (or approved) payroll run for period.
2. `mapLineToPaymentRow()` → payment rows.
3. `groupPaymentsByBank(rows)` → one card per bank.
4. `bankShortName(bankName)` for badge labels.
5. Modal: search within bank, **Generate & Download**.

### Key UI interactions

| Action | Function |
|---|---|
| Bank grouping | `groupPaymentsByBank()` |
| Excel export | `downloadBankPayrollReportExcel()` |
| Bank upload file | `downloadBankPaymentFile(bank, rows)` |
| School name | `getSchoolName()` from localStorage user |

---

## Backend logic

### API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/accountant/payroll/runs` | Paid runs for period |
| GET | `/accountant/payroll/runs/:id` | Lines with bank account, final payable |

Bank file generation is **client-side** — no separate bank-file API.

### Database fields (from run lines / staff HR)

| Field | Use |
|---|---|
| Bank name | Card grouping |
| Account number | Modal column, bank file |
| `finalPayable` / net | Transfer amount |
| Payment date | From run metadata |

### Business rules

- Align run selection with Payslips — same **paid** run.
- `employeePaymentStatus(line)` derives row status in modal.
- `formatPayrollPaymentDate(runDetail)` for payment date column.

---

## Features (summary)

### Bank grouping

```javascript
groupPaymentsByBank(paymentRows)
bankShortName(bankName)  // BK, BPR, Equity, I&M, Ecobank
```

`BANK_META` — colors and labels per bank for UI.

### Bank card

- Bank code badge
- Employee count
- Total payable RWF
- Click → open modal

### Bank employees modal

| Column | Content |
|--------|---------|
| Employee | Name, ID, dept |
| Account Number | Bank account |
| Amount Paid | finalPayable |
| Status | Paid / Processing |
| Payment Date | From run metadata |

- Search within bank
- **Generate & Download** → `downloadBankPayrollReportExcel()` or bank file export

### Exports

From `payrollDisbursementService.js`:

- `downloadBankPaymentFile(bank, rows)` — bank upload format
- `downloadBankPaymentExcel(bank, rows, meta)`

### School context

- `getSchoolName()` from localStorage user object

---

## Developer notes

- `BANK_META` — per-bank UI colors in component.

---

## Related

- [08-payroll-disbursement](./08-payroll-disbursement.md)
- [04-payroll-reports](./04-payroll-reports.md) — Bank tab
