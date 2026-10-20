# 06 — Employee Deductions Tab (Salary Template)

## Tab location

Salary Template → **Employee Deductions** (fourth tab)

Manage **per-employee** loans, SACCO balances, and repayment plans. These differ from **Template Deductions** (tab 2) which apply school-wide.

---

## Walkthrough: Screen layout

```
Search: [type staff name...]     (minimum 2 characters)

┌─────────────────────────────────────────────────────────────────────────┐
│ STAFF      │ TYPE   │ TOTAL    │ MONTHLY  │ REMAINING │ STATUS  │ ACTIONS │
│ John Doe   │ Loan   │ 200,000  │ 20,000   │ 120,000   │ Active  │ …       │
│ Jane Smith │ SACCO  │  50,000  │  5,000   │  30,000   │ Active  │ …       │
└─────────────────────────────────────────────────────────────────────────┘

[+ Add Employee Deduction]
```

---

## Step-by-step: Search and add

1. Type at least **2 characters** of staff name.
2. Select staff from dropdown results (`searchPayrollStaff(q, 12)`).
3. Click **Add Employee Deduction**.
4. Modal fields:

| Field | Description |
|---|---|
| Deduction Type | Loan, SACCO, Salary Advance, Other, etc. |
| Total Amount | Full loan principal (RWF) |
| Monthly Installment | Amount per payroll month |
| Repayment Months | Duration (e.g. 10) |
| Start Month / Year | When deduction begins |
| Notes | Optional |

5. Click **Save**.
6. `POST /accountant/payroll/employee-deductions` creates row.
7. List refreshes; Statutory tab live register includes monthly installment.

---

## Step-by-step: View repayment schedule

1. Click **Schedule** (or eye icon) on a row.
2. Modal shows month-by-month: installment, remaining balance.
3. Schedule is calculated client-side from total, monthly, and months.

---

## Step-by-step: Suspend / Resume

| Action | When to use | API |
|---|---|---|
| **Suspend** | Pause deduction temporarily | PATCH `status: "Suspended"` |
| **Resume** | Re-enable | PATCH `status: "Active"` |
| **Delete** | Loan paid off or entered in error | DELETE (soft-delete) |

Suspended deductions are excluded from `calcRwandaPayroll()` employee deduction list.

---

## Frontend design

```
EmployeeDeductionsTab
  on mount: empDeductions from parent loadTemplate()
  search: searchPayrollStaff(q, 12)
  create: createEmployeePayrollDeduction({ staffUserId, staffName, deductionType, totalAmount, ... })
  update: updateEmployeePayrollDeduction(id, { status, ... })
  delete: deleteEmployeePayrollDeduction(id)
```

Mapper: `mapEmpDedFromApi()` converts API dates to display labels.

---

## Backend logic

### GET list

```sql
SELECT * FROM accountant_payroll_employee_deductions
WHERE school_id = ? AND deleted_at IS NULL
  [AND staff_user_id = ?]
ORDER BY updated_at DESC
LIMIT 200
```

### POST create

```sql
INSERT INTO accountant_payroll_employee_deductions
  (school_id, staff_user_id, staff_name, deduction_type, total_amount_rwf,
   monthly_installment_rwf, repayment_months, start_month, start_year,
   end_month, end_year, remaining_balance_rwf, status)
```

Backend auto-calculates:
- `monthlyInstallment` from total ÷ months if omitted
- `end_month` / `end_year` from start + repayment months

### DELETE

Soft delete: `deleted_at = NOW()`, `status = 'Completed'`.

---

## Integration with Staff Salary Setup

| Source | Tab | Notes |
|---|---|---|
| Salary Template → Employee Deductions | This tab | Accountant enters loans for any staff |
| Staff Salary Setup → Advance tab | Per staff | Creates `Salary Advance` type deduction |
| Shule Avance (DOS) | Staff Setup Advance | Read-only via `advance-check` API |

All active monthly installments flow into `calcRwandaPayroll({ employeeDeductions })`.

---

## Next

- [07 — Staff Salary Setup](./07-staff-salary-setup.md)
- [09 — Frontend & Backend Flow](./09-frontend-backend-flow.md)
