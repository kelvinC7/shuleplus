# Accountant Payroll — Salary Template & Staff Salary Setup

## Complete Feature Guide

**Version:** 1.0  
**Module:** Accountant Portal → Payroll  
**Audience:** Accountants, HR finance staff, developers  
**Export:** Copy this file into Microsoft Word or Google Docs for printing/training.

> **Structure:** Each section labels **Frontend design** (UI, React, client calc) and **Backend logic** (API, DB, server rules). See [DOC_STANDARDS](./DOC_STANDARDS.md).

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Access and Navigation](#2-access-and-navigation)
3. [End-to-End Workflow](#3-end-to-end-workflow)
4. [Salary Template — Page Overview](#4-salary-template--page-overview)
5. [Tab 1 — Allowances](#5-tab-1--allowances)
6. [Tab 2 — Deductions](#6-tab-2--deductions)
7. [Tab 3 — Statutory Rates](#7-tab-3--statutory-rates)
8. [Tab 4 — Employee Deductions](#8-tab-4--employee-deductions)
9. [Staff Salary Setup — Page Overview](#9-staff-salary-setup--page-overview)
10. [Normal Payroll Mode](#10-normal-payroll-mode)
11. [Net-to-Gross Payroll Mode](#11-net-to-gross-payroll-mode)
12. [Frontend design (module-wide)](#12-frontend-design-module-wide)
13. [Backend logic (module-wide)](#13-backend-logic-module-wide)
14. [Database Tables](#14-database-tables)
15. [API Reference (Template & Setup)](#15-api-reference-template--setup)
16. [Validation Checklist](#16-validation-checklist)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Introduction

The Accountant Payroll module has two configuration pages that must be completed **before** running monthly payroll:

| Page | Route | Purpose |
|---|---|---|
| **Payroll Salary Template** | `/accountant/payroll/salary-template` | School-wide rules: statutory rates, PAYE brackets, template allowances/deductions, employee loan register |
| **Staff Salary Setup** | `/accountant/payroll/staff-salary-setup` | Per-employee salary package: basic, Others/H/A/T/A, supplemental allowances, advances |

Both pages use the Rwanda payroll engine (`rwandaPayrollEngine.js`) for live preview. The **active template** is required before **Payroll Run** can process staff.

---

## 2. Access and Navigation

### Who can access

- Accountant role (read/write)
- School Manager / Admin roles with accountant payroll permissions

### How to open

1. Log in to BabyeyiPro.
2. Open **Accountant Portal**.
3. In the sidebar under **Payroll**, choose:
   - **Payroll Salary Template**, or
   - **Staff Salary Setup**

### UI you should see

**Salary Template hero (top of page):**

```
┌─────────────────────────────────────────────────────────────────┐
│ Finance · Payroll                                               │
│ Salary Template                                                 │
│ Configure allowances, statutory rates and deductions once…        │
│                                                                 │
│ [Live from server]  [↻ Refresh]  [Save Draft]  [Activate]       │
└─────────────────────────────────────────────────────────────────┘
```

**Staff Salary Setup layout:**

```
┌──────────────────┬──────────────────────────────────────────────┐
│ Staff search     │ [Normal Payroll | NetToGross]  [Save] [Submit]│
│ ─────────────    │ Gross / Net / Deductions summary cards        │
│ □ John Doe       │ [Earnings] [Deductions] [Advance] [Summary]   │
│ □ Jane Smith     │ … editor panel …                              │
└──────────────────┴──────────────────────────────────────────────┘
```

---

## 3. End-to-End Workflow

```
Employee Directory / Import
        ↓
Payroll Salary Template  ← configure once, then Activate
        ↓
Staff Salary Setup       ← set basic + allowances per employee
        ↓
Payroll Run              ← monthly processing
        ↓
Salary Payment → Disbursement → Payslips / Bank Payroll
```

**Rule:** Template must be **Active** before Payroll Run proceeds.

---

## 4. Salary Template — Page Overview

**Component:** `SalaryTemplate.jsx`  
**Service:** `payrollTemplateService.js`

### Step-by-step: First visit

| Step | Action | What happens |
|---|---|---|
| 1 | Open Salary Template | Page calls `GET /accountant/payroll/templates/active` |
| 2 | Wait for loader | Template + employee deductions load in parallel |
| 3 | Check status badge | **Draft**, **Active**, or **Inactive** |
| 4 | Review stats row | Active Allowances · Template Deductions · Employee Deductions · Template Status |
| 5 | Configure tabs | Allowances → Deductions → Statutory → Employee Deductions |
| 6 | Click **Save Draft** | Persists without activating |
| 7 | Click **Activate** | Sets `is_active = 1`; deactivates any other school template |

### Header buttons

| Button | Frontend action | Backend `action` |
|---|---|---|
| Refresh | `loadTemplate()` | GET active + GET employee-deductions |
| Save Draft | `persistTemplate("save_draft")` | POST templates (`save_draft` or `update`) |
| Activate | `persistTemplate("activate")` | POST templates (`activate`) |
| Deactivate | `persistTemplate("deactivate")` | POST templates (`deactivate`) |

### Auto-save on Allowances/Deductions tabs

When you add, edit, pause, or delete an allowance or template deduction, the tab calls `onSaveDraft` immediately — you do not need to click Save Draft for those changes (existing template ID required for update).

---

## 5. Tab 1 — Allowances

### Walkthrough

**Screen layout:**

```
[Allowances] [Deductions] [Statutory Rates] [Employee Deductions]

☑ Auto-calculate Others, Housing & Transport from basic salary

┌─────────────────────────────────────────────────────────────────┐
│ Category │ Amount Type │ Value │ Tax │ Channel │ Freq │ Status │
│ Transport│ Fixed       │ 50000 │ …   │ Bank    │ …    │ Active │
└─────────────────────────────────────────────────────────────────┘
                                        [+ Add Allowance]
```

### Step-by-step: Add an allowance

1. Click **Add Allowance**.
2. In the modal, select **Category** (Transport, Housing, Communication, etc.).
3. Choose **Amount Type**:
   - Fixed Amount (RWF)
   - Percentage of Basic Salary
   - Percentage of Gross Salary
4. Enter **Value** (amount or percentage).
5. Set **Tax Treatment**: Taxable or Non-Taxable.
6. Set **Payroll Channel**:
   - **Tax** — affects tax register net
   - **Bank** — affects bank net only
   - **Tax & Bank** — both registers
7. Set **Frequency** and **Applies To**.
8. Click **Save** — row appears; draft auto-saved to server.

### Auto-calculate Others / H/A / T/A

When the checkbox is enabled, the school uses `rules.allowanceAuto` from the template:

| Setting | Default |
|---|---|
| Enabled | true |
| Total % of gross for register split | 30% |
| Others / H/A / T/A each | 10% of gross |

Function: `shouldUseSchoolAutoAllowances()` + `calcSchoolAllowancesFromBasic()` in `rwandaPayrollEngine.js`.

When auto mode is on, the Statutory tab live register uses auto-split instead of manual template allowance rows.

### Frontend → Backend (allowances)

```
User edits allowance
  → mapAllowanceToApi()
  → savePayrollTemplate({ allowances: [...], rules: { allowanceAuto } })
  → POST /accountant/payroll/templates
  → UPDATE accountant_payroll_templates.allowances_json
```

---

## 6. Tab 2 — Deductions

### Walkthrough

Template deductions apply to **all employees** (or selected scope when configured). Examples: SACCO, Union, Staff Welfare.

**Screen layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Category │ Type │ Value │ Channel │ Frequency │ Priority │ …   │
│ SACCO    │ Fixed│ 10000 │ Tax     │ Monthly   │ Medium   │ …   │
└─────────────────────────────────────────────────────────────────┘
                                        [+ Add Deduction]
```

### Step-by-step: Add a deduction

1. Click **Add Deduction**.
2. Select category (Loan, SACCO, Union, Salary Advance, Penalty, etc.).
3. Fixed or Percentage of Basic.
4. Choose payroll channel (Tax / Bank / Tax & Bank).
5. Frequency: Monthly or One-Time.
6. Priority: High / Medium / Low.
7. Save — auto-persisted via `onSaveDraft`.

### Channel behaviour

| Channel | Tax register | Bank net |
|---|---|---|
| Tax | Deducted from taxable/net | — |
| Bank | — | Reduces bank payable only |
| Both | Yes | Included in both |

Defined in `shared/payroll/payrollTemplateChannels.js`.

---

## 7. Tab 3 — Statutory Rates

### Walkthrough

This tab is read-heavy with live calculation. You configure Rwanda statutory contributions and preview payroll outcomes.

**Sections on screen:**

1. **PAYE — Income Tax** — progressive bracket table (0%, 10%, 20%, 30%)
2. **Contribution cards** — RSSB, Maternity, RAMA, Occupational Hazard, CBHI
3. **Live Formula Preview** — enter sample basic salary; see gross, PAYE, CSR, RAMA, net, employer cost
4. **PAYE Bracket Breakdown** — marginal tax per band
5. **Live Payroll Register** — all staff with `payroll_basic_salary > 0`
6. **Export CSV / Excel** — full register download

### Step-by-step: Preview one employee amount

1. Open **Statutory Rates** tab.
2. In **Live Formula Preview**, enter Basic Salary (e.g. `300000`).
3. Review calculated:
   - Gross Salary
   - PAYE (progressive)
   - CSR 6% employee
   - RAMA 7.5%
   - Maternity 0.3%
   - CBHI 0.5% on net
   - Final Net Salary
   - Total Cost to School
4. Scroll to **PAYE Bracket Breakdown** to verify marginal calculation.

### Step-by-step: Export live register

1. Ensure staff have basic salaries saved in Staff Salary Setup.
2. On Statutory tab, wait for **Live Payroll Register** to load (calls `searchPayrollStaff("", 500)`).
3. Click **Export CSV** or **Export Excel**.
4. File includes register columns from `buildPayrollRegisterRow()`.

### Default statutory rates

| Contribution | Employee | Employer | Base |
|---|---|---|---|
| RSSB Pension (CSR) | 6% | 6% | Gross |
| Maternity | 0.3% | 0.3% | Base (Gross − Transport) |
| RAMA | 7.5% | 7.5% | Basic |
| Occupational Hazard | — | 2% | Base |
| CBHI / Mutuelle | 0.5% | — | Net |

### Frontend calculation pipeline (Statutory tab)

```
searchPayrollStaff("", 500)
  → for each staff with basic > 0:
      calcRwandaPayroll({ basicSalary, templateDeductions, employeeDeductions, statutory, payeRates, allowanceRules })
      → buildPayrollRegisterRow(staffMeta, calc)
  → PayrollRegisterTable + sumPayrollRegisterRows
```

Optional server preview: `POST /accountant/payroll/templates/preview` (same engine on backend).

---

## 8. Tab 4 — Employee Deductions

Per-employee loans, SACCO balances, and salary advances — not school-wide template rows.

### Walkthrough

```
Search staff: [________________]  (min 2 characters)

Selected: John Doe — Loan RWF 200,000 — 10 months

┌─────────────────────────────────────────────────────────────────┐
│ Staff │ Type │ Total │ Monthly │ Remaining │ Status │ Actions    │
└─────────────────────────────────────────────────────────────────┘
```

### Step-by-step: Add employee deduction

1. Type staff name in search (min 2 chars).
2. Select staff from results.
3. Click **Add Employee Deduction**.
4. Fill: Type, Total Amount, Monthly Installment, Repayment Months, Start period.
5. Save — `POST /accountant/payroll/employee-deductions`.
6. Row shows Active; included in live register preview.

### Actions per row

| Action | API |
|---|---|
| Suspend | PATCH status = Suspended |
| Resume | PATCH status = Active |
| Delete | DELETE (soft-delete, status Completed) |
| View schedule | Client-side repayment schedule modal |

### Frontend → Backend

```
getEmployeePayrollDeductions()        → all school deductions (on load)
searchPayrollStaff(q)                 → staff picker
createEmployeePayrollDeduction(payload) → INSERT accountant_payroll_employee_deductions
updateEmployeePayrollDeduction(id)    → PATCH
deleteEmployeePayrollDeduction(id)    → soft DELETE
```

---

## 9. Staff Salary Setup — Page Overview

**Component:** `StaffSalarySetup.jsx`  
**Route:** `/accountant/payroll/staff-salary-setup`

### Step-by-step: Open and select staff

| Step | Action | Frontend | Backend |
|---|---|---|---|
| 1 | Page loads | `loadStaff()` | GET staff/search + GET templates/active |
| 2 | Staff list populates | Maps `payroll` fields to form state | Reads `staff.payroll_*` columns |
| 3 | Click a staff row | `setSelected(staff)` | — |
| 4 | Deductions load | `loadStaffDeductions(id)` | GET employee-deductions + GET advance-check |
| 5 | Edit fields | Updates `salaries[staffId]` in React state | — |
| 6 | Save | `saveStaffPayrollProfile()` | PATCH staff/:userId |

### Payroll mode toggle

| Mode | First tab | Use case |
|---|---|---|
| **Normal Payroll** | Earnings | You know gross components / basic |
| **NetToGross Salary Payroll** | Net-to-Gross | You know desired take-home net |

---

## 10. Normal Payroll Mode

### Tab: Earnings

**Step-by-step:**

1. Select staff from left panel.
2. Open **Earnings** tab.
3. Enter **Basic Salary** (RWF).
4. If template auto-rules apply and no manual split exists, **Others**, **H/A**, **T/A** appear automatically (label: "Auto from basic").
5. Click **Add Allowance** for Meal, Communication, Responsibility, or custom rows.
6. Edit or remove rows with pencil/trash icons.
7. Click **Save salary package**.

**Register columns saved to database:**

| UI field | DB column / JSON |
|---|---|
| Basic | `staff.payroll_basic_salary` |
| T/A | `staff.payroll_transport_allowance` |
| H/A | `staff.payroll_housing_allowance` |
| Meal | `staff.payroll_meal_allowance` |
| Others, Communication, Responsibility, custom | `staff.payroll_other_allowances` (JSON array) |

Builder: `buildStaffAllowancePayload()` → `mergeRegisterAllowanceAmounts()` for auto vs manual.

### Tab: Deductions

1. **Statutory Deductions** — auto-calculated (read-only): PAYE, CSR, RAMA, Maternity, CBHI.
2. **Additional Deductions** — click **Add Deduction** for custom monthly items.
3. Custom deductions persist via `createEmployeePayrollDeduction()`.

### Tab: Advance

1. Click **Request Advance**.
2. Enter amount and repayment months (1–12).
3. Save — creates employee deduction with type `Salary Advance`.
4. **Shule Avance** advances (from DOS module) appear automatically with badge; read-only from `advance-check` API.

### Tab: Summary

- **Payslip Preview** — earnings minus deductions = net
- **Salary History** — previous/current basic, increment
- **Employer Cost Breakdown** — CSR, RAMA, maternity, hazard

---

## 11. Net-to-Gross Payroll Mode

Use when the school agrees a **fixed net take-home** and needs the system to solve for basic + register split.

### Step-by-step

1. Toggle **NetToGross Salary Payroll**.
2. Open **Net-to-Gross** tab.
3. Enter **Desired Net Salary**.
4. System calls `calcNetToGrossFromDesiredNet()` using active template statutory + PAYE brackets.
5. Review breakdown table: solved basic, Others/H/A/T/A split, gross, all deductions, final net.
6. Click **Save calculated package to profile**.
7. `salaryFromNetToGrossResult()` writes basic + register columns to staff profile.

**Note:** Net-to-Gross clears supplemental allowances (communication, responsibility, meal, custom) in the solved package — verify Summary before saving.

---

## 12. Frontend design (module-wide)

### Salary Template — component flow

```
SalaryTemplate (root)
├── loadTemplate()
│     ├── getActivePayrollTemplate()
│     └── getEmployeePayrollDeductions()
├── persistTemplate(action)
│     └── savePayrollTemplate({ action, allowances, deductions, payeRates, statutory, rules })
├── AllowancesTab        → onSaveDraft → persistTemplate("update")
├── DeductionsTab        → onSaveDraft → persistTemplate("update")
├── StatutoryTab         → client calc only (+ export)
└── EmployeeDeductionsTab → CRUD via employee-deductions API
```

### Staff Salary Setup — component flow

```
StaffSalarySetup
├── loadStaff()
│     ├── searchPayrollStaff("", 500)
│     └── getActivePayrollTemplate()  → allowanceRules, statutory, payeRates
├── loadStaffDeductions(staffId)
│     ├── getEmployeePayrollDeductions({ staffUserId })
│     └── getStaffAdvanceCheck(staffId)
├── Live calc (useMemo)
│     ├── Normal: inline gross/PAYE/statutory
│     └── NetToGross: calcNetToGrossFromDesiredNet()
└── handleSave()
      └── saveStaffPayrollProfile(userId, buildStaffAllowancePayload())
```

### Key utility files

| File | Role |
|---|---|
| `rwandaPayrollEngine.js` | PAYE, statutory, net, net-to-gross |
| `payrollRegister.js` | Register rows, CSV/Excel export |
| `payrollStaffAllowances.js` | Merge auto vs manual Others/H/A/T/A |
| `payrollEmployeeDeductions.js` | Filter deductions for engine |
| `payrollTemplateChannels.js` | Tax vs bank channel labels |

### State persistence summary

| Data | Stored where |
|---|---|
| Template allowances, deductions, statutory, PAYE, auto-rules | `accountant_payroll_templates` JSON columns |
| Staff basic + allowances | `staff.payroll_*` columns |
| Per-employee loans/advances | `accountant_payroll_employee_deductions` |
| Shule Avance | `shule_avance_requests` (read via advance-check) |

---

## 13. Backend logic (module-wide)

**File:** `BabyeyiSystem/backend/BabyeyiRoutes/portalOperations.js`  
**Auth:** `requireRole(ACCOUNTANT_READ_ROLES)` or `ACCOUNTANT_WRITE_ROLES`  
**Scope:** All queries filter by `req.ctx.schoolId`

### Template save transaction

```
POST /accountant/payroll/templates
  action = deactivate | update | save_draft | activate | (create new version)
  BEGIN TRANSACTION
    IF activate: SET all school templates is_active = 0
    UPDATE or INSERT accountant_payroll_templates
    IF new version: INSERT accountant_payroll_template_versions (snapshot)
  COMMIT
  appendAuditLog()
```

### Staff profile save

```
PATCH /accountant/payroll/staff/:userId
  Parse payroll_basic_salary, payroll_transport_allowance, etc.
  UPDATE staff SET payroll_* columns WHERE school_id + user_id
  Optional: UPSERT accountant_payroll_staff_overrides (rate role)
  appendAuditLog()
```

### Staff search query

Joins `users` + `staff` + optional `accountant_payroll_staff_overrides` + `accountant_payroll_rates`.  
Excludes terminated staff. Returns `payroll` object with all allowance fields.

### Payroll calculation on server

`POST /accountant/payroll/templates/preview` imports the same `calcRwandaPayroll` logic used on the frontend (shared behaviour) for server-side validation or future API consumers.

---

## 14. Database Tables

| Table | Purpose |
|---|---|
| `accountant_payroll_templates` | Active/draft template versions per school |
| `accountant_payroll_template_versions` | JSON snapshots on new version create |
| `accountant_payroll_employee_deductions` | Per-staff loans, advances, custom deductions |
| `staff` | `payroll_basic_salary`, `payroll_transport_allowance`, `payroll_housing_allowance`, `payroll_meal_allowance`, `payroll_other_allowances` |
| `accountant_payroll_staff_overrides` | Optional rate role override per user |
| `accountant_payroll_rates` | Default rates by role code |
| `shule_avance_requests` | Approved advances (read for advance-check) |

---

## 15. API Reference (Template & Setup)

| Method | Path | Purpose |
|---|---|---|
| GET | `/accountant/payroll/templates/active` | Load latest/active template |
| GET | `/accountant/payroll/templates/history` | Version history |
| POST | `/accountant/payroll/templates` | Save draft / update / activate / deactivate |
| POST | `/accountant/payroll/templates/preview` | Server-side calc preview |
| GET | `/accountant/payroll/employee-deductions` | List deductions (`?staffUserId=`) |
| POST | `/accountant/payroll/employee-deductions` | Create deduction |
| PATCH | `/accountant/payroll/employee-deductions/:id` | Update status/amounts |
| DELETE | `/accountant/payroll/employee-deductions/:id` | Soft delete |
| GET | `/accountant/payroll/staff/search` | Staff list for setup + live register |
| PATCH | `/accountant/payroll/staff/:userId` | Save salary profile |
| GET | `/accountant/payroll/advance-check/:staffUserId` | Shule Avance outstanding |

---

## 16. Validation Checklist

Before running payroll:

- [ ] Salary Template status is **Active**
- [ ] Statutory rates match school/RRA requirements
- [ ] Auto Others/H/A/T/A checkbox reflects school policy
- [ ] Every paid employee has `payroll_basic_salary > 0` in Staff Salary Setup
- [ ] Live Payroll Register on Statutory tab shows expected net for sample staff
- [ ] Employee deductions (loans/advances) have correct monthly installment
- [ ] Export CSV from Statutory tab reconciles with manual spreadsheet (optional)
- [ ] Net-to-Gross staff: Summary tab net matches agreed take-home

---

## 17. Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| Payroll Run blocked — no active template | Template not activated | Salary Template → Activate |
| Staff missing from live register | Basic salary = 0 | Staff Salary Setup → set basic → Save |
| Others/H/A/T/A all zero | Auto rules off and no manual values | Enable auto checkbox or enter allowances |
| Advance still deducting after term | Remaining balance not updated | Check employee deduction status; verify payroll runs marked paid |
| Shule Avance not showing | No approved request | DOS Shule Avance module |
| Save failed | Network or permission | Check accountant write role; retry Save Draft |
| Net-to-Gross differs from expected | Custom deductions/advances included | Review Deductions + Advance tabs |

---

## Related documentation

- [FEATURES_INDEX.md](./FEATURES_INDEX.md) — chapter index
- [00-payroll-engine.md](./00-payroll-engine.md) — calculation formulas
- [03-payroll-run.md](./03-payroll-run.md) — next step after setup
- [13-services-and-utils.md](./13-services-and-utils.md) — full services list

---

*End of FEATURES_COMPLETE.md*
