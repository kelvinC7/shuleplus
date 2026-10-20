# 07 — Staff Salary Setup

## Page

**Route:** `/accountant/payroll/staff-salary-setup`  
**Component:** `StaffSalarySetup.jsx`

Configure **individual employee salary packages** after the school template is set up.

---

## Walkthrough: Page load

| Step | UI | Frontend | Backend |
|---|---|---|---|
| 1 | Loading spinner | `loadStaff()` | — |
| 2 | Staff list left | `searchPayrollStaff("", 500)` | GET `/staff/search` |
| 3 | Template rules loaded | `getActivePayrollTemplate()` | GET `/templates/active` |
| 4 | First staff selected | `setSelected(mapped[0])` | — |
| 5 | Deductions loaded | `loadStaffDeductions(id)` | GET employee-deductions + advance-check |

---

## Walkthrough: Staff list (left panel)

```
┌─────────────────────────┐
│ 🔍 Search staff...      │
├─────────────────────────┤
│ ● John Doe              │
│   Admin · Permanent     │
│   Gross RWF 450,000     │
├─────────────────────────┤
│ ○ Jane Smith            │
│   Primary · Permanent   │
│   Gross RWF 380,000     │
└─────────────────────────┘
```

1. Type in search to filter (debounced re-query).
2. Click a row to select.
3. Summary cards at top update: **Gross**, **Net**, **Deductions**.

---

## Walkthrough: Header actions

```
[Normal Payroll] [NetToGross Salary Payroll]     [↻ Reload] [Save salary package] [Submit]
```

| Button | Action |
|---|---|
| **Normal / NetToGross** | Switches mode and first tab |
| **Reload** | Re-runs `loadStaff()` |
| **Save salary package** | `PATCH /staff/:userId` with allowance payload |
| **Submit** | UI companion to save (same persistence path) |

Success toast: "Salary package saved" with gross and net.

---

## Tab: Earnings (Normal mode)

### Step-by-step

1. Ensure **Normal Payroll** mode is selected.
2. Open **Earnings** tab.
3. Enter **Basic Salary** (required).
4. Review **Allowances** table:

| Row label | Kind badge | Meaning |
|---|---|---|
| Others | Auto from basic | From template `allowanceAuto` rules |
| H/A | Payroll register | Stored `payroll_housing_allowance` |
| T/A | Payroll register | Stored `payroll_transport_allowance` |
| Meal Allowance | Standard | `payroll_meal_allowance` |
| Custom name | Custom | In `payroll_other_allowances` JSON |

5. Click **Add Allowance** to add/edit rows.
6. Modal: name (e.g. "Others", "H/A", "Meal Allowance") + monthly amount.
7. Name matching routes to correct field via `matchAllowanceField()`.
8. Click **Save salary package**.

### Auto vs manual register split

```javascript
mergeRegisterAllowanceAmounts(basic, { others, housing, transport }, allowanceRules)
```

- If all three are zero and auto enabled → computes from basic (`source: "auto"`).
- If any manual value set → uses stored values (`source: "manual"`).

---

## Tab: Deductions

### Step-by-step

1. Open **Deductions** tab.
2. Read **Statutory Deductions (Auto-calculated)** — PAYE, CSR, RAMA, Maternity, CBHI.
3. Under **Additional Deductions**, click **Add Deduction**.
4. Enter name + monthly amount.
5. Saves via `createEmployeePayrollDeduction()` (same table as Template Employee Deductions tab).

---

## Tab: Advance

### Step-by-step: Request payroll advance

1. Open **Advance** tab.
2. Click **Request Advance**.
3. Enter **Amount** and **Repayment months** (1–12).
4. Save → `POST /employee-deductions` with `deductionType: "Salary Advance"`.
5. Progress bar shows months paid vs total.

### Shule Avance (read-only)

- Loaded from `GET /advance-check/:staffUserId`.
- Badge: **Shule Avance**.
- Cannot delete from payroll UI (source: DOS module).

**Repayment rule (UI help text):** 2 months = split over **2 payroll runs only**, then stops.

---

## Tab: Summary

### Payslip Preview (left)

```
Basic Salary          + RWF 300,000
Others                + RWF  30,000
H/A                   + RWF  30,000
─────────────────────────────────
Gross Salary            RWF 360,000
PAYE                  − RWF  …
CSR (6%)              − RWF  …
…
─────────────────────────────────
Net Salary              RWF  …
```

### Salary History (right)

- Previous Basic, Current Basic, Increment, Last Increment Date

### Employer Cost Breakdown

- Gross + employer CSR, RAMA, maternity, occupational hazard = **Total Employer Cost**

---

## Save payload (frontend → backend)

```javascript
// buildStaffAllowancePayload(sal, allowanceRules)
{
  payroll_basic_salary: 300000,
  payroll_transport_allowance: 30000,
  payroll_housing_allowance: 30000,
  payroll_meal_allowance: 15000,
  payroll_other_allowances: [
    { name: "Others", amount: 30000 },
    { name: "Communication Allowance", amount: 10000 }
  ]
}
```

Backend normalizes `payroll_other_allowances` to JSON string on `staff` table.

---

## Frontend design (state model)

```javascript
salaries = {
  [staffUserId]: {
    basic, others, housing, transport, communication, responsibility, meal,
    customAllowances: [{ id, name, amount }],
    customDeductions: [{ id, apiId, name, amount, status }],
    advances: [{ id, totalAmount, repaymentMonths, monthlyInstallment, ... }],
    desiredNet,  // net-to-gross mode only
  }
}
```

## Backend logic (save path)

| Step | API | DB |
|---|---|---|
| Save package | PATCH `/accountant/payroll/staff/:userId` | `staff.payroll_*` columns |
| Add deduction | POST `/accountant/payroll/employee-deductions` | `accountant_payroll_employee_deductions` |
| Advance | POST employee-deductions (`Salary Advance`) | Same table |
| Shule Avance | GET `/advance-check/:id` | `shule_avance_requests` (read-only) |

---

## Next

- [08 — Net-to-Gross Mode](./08-net-to-gross-mode.md)
- [09 — Frontend & Backend Flow](./09-frontend-backend-flow.md)
