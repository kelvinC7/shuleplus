# 10 — Validation & QA

Checklist before first Payroll Run and after any template or salary change.

---

## A. Salary Template checks

| # | Check | How to verify | Pass? |
|---|---|---|---|
| 1 | Template exists | Salary Template loads without "Could not load" error | ☐ |
| 2 | Status is **Active** | Stats row shows "Active"; Activate button replaced by Deactivate | ☐ |
| 3 | PAYE brackets | Statutory tab → default 0/10/20/30% bands visible | ☐ |
| 4 | Statutory rates | CSR 6+6%, RAMA 7.5+7.5%, CBHI 0.5%, Maternity 0.3+0.3% | ☐ |
| 5 | Auto Others/H/A/T/A | Checkbox matches school policy | ☐ |
| 6 | Template deductions | SACCO/welfare rows have correct channel (Tax vs Bank) | ☐ |
| 7 | Employee deductions | Loans show correct monthly installment | ☐ |

---

## B. Staff Salary Setup checks

| # | Check | How to verify | Pass? |
|---|---|---|---|
| 1 | All paid staff listed | Search returns expected headcount | ☐ |
| 2 | Basic salary > 0 | Each employee has basic in Earnings or saved net-to-gross | ☐ |
| 3 | Register columns | Others, H/A, T/A match contract or auto rules | ☐ |
| 4 | Save succeeds | Toast "Salary package saved" after Save | ☐ |
| 5 | Reload persists | Reload page → values unchanged | ☐ |
| 6 | Advances | Active advances show correct months remaining | ☐ |
| 7 | Net-to-Gross staff | Summary net = agreed take-home | ☐ |

---

## C. Live register reconciliation

### Step-by-step

1. Open Salary Template → **Statutory Rates**.
2. Wait for **Live Payroll Register** to load.
3. Pick 3 staff at random.
4. Compare Basic, Others, H/A, T/A, Gross, PAYE, Net against manual spreadsheet or payslip.
5. Click **Export Excel** — open in Excel/Word workflow.
6. Confirm footer totals sum correctly.

| Column | Source |
|---|---|
| Basic | `staff.payroll_basic_salary` |
| Others/H/A/T/A | Engine + `allowanceRules` or stored columns |
| PAYE | `calcProgressivePAYEBreakdown` |
| Net | `calcRwandaPayroll().finalNet` |

---

## D. API smoke tests (developers)

```bash
# Replace BASE and TOKEN with your environment

# Active template
curl -H "Authorization: Bearer TOKEN" BASE/accountant/payroll/templates/active

# Staff search
curl -H "Authorization: Bearer TOKEN" "BASE/accountant/payroll/staff/search?limit=5"

# Employee deductions
curl -H "Authorization: Bearer TOKEN" BASE/accountant/payroll/employee-deductions

# Preview calc
curl -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"basicSalary":300000,"statutory":{}}' \
  BASE/accountant/payroll/templates/preview
```

Expected: `{ success: true, data: { grossSalary, paye, finalNet, ... } }`

---

## E. Payroll Run gate

`PayrollRun.jsx` checks `templateActive` from `getActivePayrollTemplate()`:

- If `isActive !== true` or `status !== 'Active'` → run blocked.
- Fix: Salary Template → **Activate**.

---

## F. Common failures

| Symptom | Root cause | Fix |
|---|---|---|
| Staff missing from register | `payroll_basic_salary = 0` | Staff Salary Setup → set basic → Save |
| Net too low vs expected | Extra employee deductions | Review Deductions + Advance tabs |
| Others/H/A/T/A all zero | Auto off, no manual values | Enable auto or add allowances |
| Template won't activate | Save error / no network | Save Draft first; check write role |
| Shule Avance duplicate | Both payroll advance + Shule | Remove payroll-created advance if Shule handles it |

---

## G. Sign-off template

```
School: _______________________
Month:  _______________________
Prepared by: __________________
Date: ________________________

☐ Salary Template Active
☐ All staff salaries saved
☐ Live register exported and reviewed
☐ Approved for Payroll Run

Signature: ____________________
```

---

## Related

- [03 — Payroll Run](../03-payroll-run.md)
- [FEATURES_COMPLETE.md](../FEATURES_COMPLETE.md)
