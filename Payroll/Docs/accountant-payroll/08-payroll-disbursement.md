# Payroll Disbursement

**Route:** `/accountant/payroll/disbursement`  
**Component:** `pages/Payroll/PayrollDisbursement.jsx`  
**API:** `payrollDisbursementService.js`

---

## Purpose

Execute **payment processing** for approved payroll runs — apply disbursement deductions, verify approvals, mark employees paid, audit trail, export payment files.

---

## Frontend design

### Route & component

| Item | Value |
|---|---|
| Route | `/accountant/payroll/disbursement` |
| Component | `pages/Payroll/PayrollDisbursement.jsx` |
| Service | `payrollDisbursementService.js` |
| Utils | `payrollDisbursementService` mappers: `mapLineToPaymentRow`, `groupPaymentsByBank` |

### Layout structure

```
Period filters (academic year, month, payroll number)
Run list (Approved | Paid tabs)
Tabs: Disbursement | Deduction rules | Audit trail | History
Employee payment table (bank, dept filters — client-side)
Modals: Deduction rule editor, payment verification checklist
```

### React state & flow

1. `getApprovedPayrollRuns()` — runs ready to pay.
2. `getPayrollRun(id)` → `mapLineToPaymentRow()` → payment rows.
3. `groupPaymentsByBank(rows)` for bank summaries.
4. Locked UI when `isPayrollRunLocked(status)` (paid).

### Key UI interactions

| Action | API |
|---|---|
| Apply scheduled deductions | `applyScheduledDeductions(runId)` |
| Ad-hoc deductions | `applyDisbursementDeductions(runId, payload)` |
| Mark run paid | `markPayrollRunPaidWithDetails(runId, { paymentDate, reference, ... })` |
| CRUD rules | `/disbursement-deduction-rules` |
| Audit | `getPayrollRunAuditTrail(runId)` |
| Export | `downloadDisbursementExcel`, `downloadBankPaymentFile` |

---

## Backend logic

### API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/accountant/payroll/runs` | Approved/paid runs |
| GET | `/accountant/payroll/runs/:id` | Line detail |
| PATCH | `/accountant/payroll/runs/:id/status` | Mark paid with payment details |
| GET/POST/PATCH/DELETE | `/accountant/payroll/disbursement-deduction-rules` | Rule CRUD |
| POST | `/accountant/payroll/runs/:id/apply-scheduled-deductions` | Apply rules to run |
| POST | `/accountant/payroll/runs/:id/disbursement-deductions` | Ad-hoc deductions |
| GET | `/accountant/payroll/runs/:id/audit-trail` | Action history |
| DELETE | `/accountant/payroll/runs/:id` | If not locked |

### Business rules

- Verification checklist (approval, review, accounts) enforced in UI before mark paid.
- Disbursement deduction rules: `applyTo` (all/department), `amountType`, `monthScope`, `frequency`.
- Rule engine applies on backend — frontend POSTs rule payloads.
- Paid runs locked — no further deduction edits.

### Auth

- Read: approved runs, audit trail, rules
- Write: apply deductions, mark paid, rule CRUD

---

## Features (summary)

### Run selection

- `getApprovedPayrollRuns()` — runs ready to pay
- `getPaidPayrollRuns()` — history tab
- `getPayrollRun(id)` — line-level detail
- Locked when `isPayrollRunLocked(status)` (paid)

### Payment rows

```javascript
mapLineToPaymentRow(line, runDetail)
groupPaymentsByBank(rows)
```

Columns: employee, department, bank, account, net, final payable, payment status.

### Disbursement deduction rules

CRUD on `/disbursement-deduction-rules`:

| Field | Example |
|-------|---------|
| deductionType | Welfare |
| applyTo | all / department |
| amountType | fixed / percent |
| monthScope | single / recurring |
| frequency | always / once |

- `applyScheduledDeductions(runId)` — apply rules to run
- `applyDisbursementDeductions(runId, payload)` — ad-hoc with optional save-as-rule

### Mark paid (run or individual)

**Full run:**

```javascript
markPayrollRunPaidWithDetails(runId, {
  paymentDate, paymentReference, transactionNumber, paymentMethod
})
```

**Verification checklist modal:**

- Approval verified
- Review verified
- Accounts verified
- Ready to disburse

### Audit trail

- `getPayrollRunAuditTrail(runId)` — timestamped actions

### Exports

- `downloadDisbursementExcel(rows, meta)`
- `downloadBankPaymentFile(bankName, rows)` — text/CSV bank upload format
- `downloadBankPaymentExcel(...)`

### Delete run

- `deletePayrollRun()` — if not locked

---

## Developer notes

- `disbursementStatusLabel()` for row status display.

---

## Related

- [06-salary-payment](./06-salary-payment.md)
- [10-bank-payroll](./10-bank-payroll.md)
- [09-payslips](./09-payslips.md)
