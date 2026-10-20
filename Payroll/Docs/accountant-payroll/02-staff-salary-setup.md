# Staff Salary Setup

**Route:** `/accountant/payroll/staff-salary-setup`  
**Component:** `pages/Payroll/StaffSalarySetup.jsx`  
**API:** `payrollTemplateService.js`

> **Full step-by-step manual:** [FEATURES_INDEX](./FEATURES_INDEX.md) · [FEATURES_COMPLETE](./FEATURES_COMPLETE.md)  
> Chapters: [07 Staff Salary Setup](./features/07-staff-salary-setup.md) · [08 Net-to-Gross](./features/08-net-to-gross-mode.md) · [09 Frontend/Backend](./features/09-frontend-backend-flow.md)

---

## Purpose

Configure **individual employee salary packages** — basic, register allowances (Others/H/A/T/A), supplemental allowances, custom deductions, salary advances, and **net-to-gross** reverse calculation.

---

## Frontend design

### Route & component

| Item | Value |
|---|---|
| Route | `/accountant/payroll/staff-salary-setup` |
| Component | `pages/Payroll/StaffSalarySetup.jsx` |
| Service | `payrollTemplateService.js` |
| Utils | `payrollStaffAllowances.js`, `rwandaPayrollEngine.js` |

### Layout structure

```
┌─────────────────────┬────────────────────────────────────────────┐
│ Left: Staff search  │ Right: Editor panel                        │
│ - Search input      │ - Mode toggle: Normal | NetToGross           │
│ - Staff cards       │ - Summary: Gross | Net | Deductions        │
│   (dept, contract)  │ - Tabs: Earnings | Deductions | Advance | Summary │
│                     │ - Modals: Allowance, Deduction, Advance      │
└─────────────────────┴────────────────────────────────────────────┘
PortalToast — success/error feedback
```

### React state

| State | Purpose |
|---|---|
| `staffList`, `selected` | Staff picker |
| `salaries` | Map `{ [staffUserId]: { basic, others, housing, transport, ... } }` |
| `payrollMode` | `normal` \| `netToGross` |
| `tab` | `earnings` \| `netToGross` \| `deductions` \| `advance` \| `summary` |
| `allowanceRules`, `templateStatutory`, `templatePayeRates` | From active template |
| Modal forms | `allowanceForm`, `deductionForm`, `advanceForm` |

### Key UI interactions

| Action | Function | API |
|---|---|---|
| Load page | `loadStaff()` | GET staff/search + GET templates/active |
| Select staff | `setSelected` → `loadStaffDeductions` | GET employee-deductions + advance-check |
| Edit basic/allowances | `set(key, value)` on `salaries[id]` | Local state only until save |
| Save package | `handleSave()` → `buildStaffAllowancePayload()` | PATCH staff/:userId |
| Add allowance | `saveAllowance()` modal | PATCH staff (allowances) |
| Add deduction | `saveDeduction()` modal | POST employee-deductions |
| Request advance | `saveAdvance()` modal | POST employee-deductions (Salary Advance) |
| Net-to-Gross | `calcNetToGrossFromDesiredNet()` | Client calc → save via PATCH |

### Allowance name routing

`matchAllowanceField()` maps modal names to fields: `Others`, `H/A`, `T/A`, `Meal Allowance`, etc.  
`mergeRegisterAllowanceAmounts()` applies template auto-rules when manual split is zero.

---

## Backend logic

### API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/accountant/payroll/staff/search` | Staff list + `payroll_*` columns from `staff` table |
| PATCH | `/accountant/payroll/staff/:userId` | Save salary profile |
| GET | `/accountant/payroll/templates/active` | Statutory + allowance auto rules |
| GET | `/accountant/payroll/employee-deductions?staffUserId=` | Staff deductions |
| POST/PATCH/DELETE | `/accountant/payroll/employee-deductions` | Custom deductions & advances |
| GET | `/accountant/payroll/advance-check/:staffUserId` | Shule Avance approved requests |

### Database tables

| Table / column | Stored data |
|---|---|
| `staff.payroll_basic_salary` | Basic salary |
| `staff.payroll_transport_allowance` | T/A |
| `staff.payroll_housing_allowance` | H/A |
| `staff.payroll_meal_allowance` | Meal |
| `staff.payroll_other_allowances` | JSON: Others, Communication, Responsibility, custom |
| `accountant_payroll_employee_deductions` | Loans, SACCO, salary advances |
| `shule_avance_requests` | Read-only via advance-check |
| `accountant_payroll_staff_overrides` | Optional rate role override |

### PATCH staff payload logic

```javascript
// Backend normalizes:
payroll_basic_salary → toMoney()
payroll_other_allowances → normalizePayrollOtherAllowances() → JSON string
// Upserts staff row if missing; optional rate override INSERT
appendAuditLog(entityType: 'payroll_staff_override')
```

### Business rules

- Staff search excludes terminated employees (`employment_status`, `termination_date`).
- Advance repayment: `monthlyInstallment` deducted for `repaymentMonths` payroll runs.
- Shule Avance advances are read-only in UI (`source: "shule_avance"`).
- Net-to-Gross saves solved basic + register split — no separate mode flag in DB.

### Auth

- Read: staff search, template, deductions, advance-check
- Write: PATCH staff, POST/PATCH/DELETE employee-deductions

---

## Features (summary)

### Staff search

- `searchPayrollStaff(query)` — debounced search
- Shows department, position, contract status badges
- Loads existing profile: basic, allowances, deductions, advances

### Normal payroll mode

**Register columns (school standard):**

| Field | Register label |
|-------|----------------|
| `others` | Others |
| `housing` | H/A |
| `transport` | T/A |

**Supplemental allowances:**

- Meal, Communication, Responsibility
- Custom allowance rows (add/remove)

**Auto vs manual:**

- If staff has no stored split, `mergeRegisterAllowanceAmounts()` applies template auto-rules
- Manual edits saved to staff profile fields

### Net-to-gross mode

- Enter **desired net take-home**
- `calcNetToGrossFromDesiredNet()` solves for basic + split
- Shows computed basic before save

### Deductions

- Pull template + employee deductions from API
- Add custom one-off deductions in UI
- `getEmployeePayrollDeductions()` / `createEmployeePayrollDeduction()` / `deleteEmployeePayrollDeduction()`

### Salary advances

- `getStaffAdvanceCheck(staffUserId)` — outstanding advance balance
- Advance repayment rows with month count
- Deducted in payroll engine via employee deductions

### Save payload

`saveStaffPayrollProfile(userId, payload)` sends:

```javascript
{
  payroll_basic_salary,
  payroll_transport_allowance,
  payroll_housing_allowance,
  payroll_meal_allowance,
  payroll_other_allowances: [{ name, amount }, ...]
}
```

Built by `buildStaffAllowancePayload()`.

### Live preview

- Recalculates on every field change using active template statutory + `calcRwandaPayroll()`
- Shows PAYE breakdown, employer costs, final net

---

## Developer notes

- Full walkthrough: [features/07-staff-salary-setup](./features/07-staff-salary-setup.md), [features/08-net-to-gross-mode](./features/08-net-to-gross-mode.md)

---

## Related

- [01-salary-template](./01-salary-template.md)
- [03-payroll-run](./03-payroll-run.md)
- [07-employees-hr](./07-employees-hr.md)
