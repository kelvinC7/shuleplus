# 04 — Deductions Tab (Salary Template)

## Tab location

Salary Template → **Deductions** (second tab)

Template deductions are **recurring school-wide rules** applied to every payroll run (unlike Employee Deductions tab which is per person).

---

## Walkthrough: Screen layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ CATEGORY │ TYPE │ VALUE │ CHANNEL │ FREQUENCY │ PRIORITY │ APPLIES │ STATUS │
│ SACCO    │ Fixed│ 10000 │ Tax     │ Monthly   │ Medium   │ All     │ Active │
│ Welfare  │ Fixed│  5000 │ Bank    │ Monthly   │ Low      │ All     │ Active │
└────────────────────────────────────────────────────────────────────────┘

[+ Add Deduction]

Info box: Bank-only deductions do not change tax net. Tax and Both affect tax payroll.
```

---

## Step-by-step: Add template deduction

1. Click **+ Add Deduction**.
2. Fill modal:

| Field | Options |
|---|---|
| Category | SACCO, Loan, Union, Salary Advance, Penalty, Court Order, Insurance, Staff Welfare, Other |
| Amount Type | Fixed (RWF) or Percentage of Basic |
| Value | Number |
| Payroll Channel | Tax / Bank / Tax & Bank |
| Frequency | Monthly / One-Time |
| Priority | High / Medium / Low |
| Applies To | All Employees / Selected Employees |

3. Click **Save**.
4. Row added; draft auto-saved via `onSaveDraft({ deductions: next })`.

---

## Channel behaviour (important)

| Channel | Tax register net | Bank payable |
|---|---|---|
| **Tax** | Reduced | Unchanged |
| **Bank** | Unchanged | Reduced |
| **Tax & Bank** | Reduced | Reduced |

Example: Staff Welfare fund on **Bank** channel — employee still pays full tax on gross, but bank transfer is lower.

Engine applies channels inside `calcRwandaPayroll()` via `payrollTemplateChannels.js`.

---

## Step-by-step: Pause a deduction

1. Click **Pause** on a row.
2. Status → **Inactive**.
3. Excluded from `deductionsForEngine()` filter (Active only).
4. Draft saved automatically.

---

## Frontend design

```
DeductionsTab
  → mapDeductionToApi(d)
  → savePayrollTemplate({ deductions: [...] })
  → POST /accountant/payroll/templates (action: update)
```

`deductionsForEngine()` converts active template deductions to monthly amounts for `calcRwandaPayroll()`.

---

## Backend logic

```
deductions_json = JSON.stringify(payload.deductions)
UPDATE accountant_payroll_templates SET deductions_json = ? ...
```

Stored fields per deduction: `category`, `amountType`, `value`, `recurring`, `payrollChannel`, `appliesTo`, `priority`, `status`.

---

## Difference: Template vs Employee deductions

| | Template Deductions (this tab) | Employee Deductions (tab 4) |
|---|---|---|
| Scope | All staff (or group) | One staff member |
| Examples | SACCO flat fee, union | Personal loan, advance |
| Table | `allowances_json` sibling `deductions_json` | `accountant_payroll_employee_deductions` |
| API | POST `/templates` | POST `/employee-deductions` |

---

## Next

- [05 — Statutory Rates Tab](./05-statutory-rates-tab.md)
- [06 — Employee Deductions Tab](./06-employee-deductions-tab.md)
