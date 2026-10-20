# 03 — Allowances Tab (Salary Template)

## Tab location

Salary Template → **Allowances** (first tab)

---

## Walkthrough: Screen layout

```
☑ Auto-calculate Others, Housing & Transport from basic salary
   When enabled, register columns use school % rules from template.

┌────────────────────────────────────────────────────────────────────────┐
│ CATEGORY  │ AMT TYPE │ VALUE │ TAX      │ CHANNEL │ FREQ │ APPLIES │ STATUS │
│ Transport │ Fixed    │ 50000 │ Taxable  │ Bank    │ Mo   │ All     │ Active │
│ Housing   │ % Basic  │ 10    │ Taxable  │ Tax     │ Mo   │ All     │ Active │
└────────────────────────────────────────────────────────────────────────┘

[+ Add Allowance]                                    [Import Allowances]
```

---

## Step-by-step: Enable auto Others / H/A / T/A

1. Tick **Auto-calculate Others, Housing & Transport from basic salary**.
2. System saves `rules.allowanceAuto` to template immediately.
3. On Staff Salary Setup, staff without manual split get Others, H/A, T/A from basic.
4. On Statutory tab live register, template manual allowance rows are skipped when auto is on.

### Default auto rules

| Field | Default |
|---|---|
| `enabled` | `true` |
| `totalPercent` | 30% of gross |
| `othersPercent` | 10% |
| `housingPercent` | 10% |
| `transportPercent` | 10% |

Engine: `calcSchoolAllowancesFromBasic()` in `rwandaPayrollEngine.js`.

---

## Step-by-step: Add allowance

1. Click **+ Add Allowance**.
2. Modal opens.

**Modal fields (screenshot-style):**

```
┌─────────────────────────────────────┐
│ Add Allowance                       │
│─────────────────────────────────────│
│ Category:     [Transport      ▼]    │
│ Amount Type:  [Fixed Amount   ▼]    │
│ Value:        [ 50000          ]    │
│ Tax Treatment:[Taxable        ▼]    │
│ Payroll Channel:[Tax & Bank   ▼]    │
│ Frequency:    [Monthly        ▼]    │
│ Applies To:   [All Employees  ▼]    │
│                                     │
│ Preview: RWF 50,000 / month         │
│                                     │
│              [Cancel]  [Save]       │
└─────────────────────────────────────┘
```

3. Click **Save**.
4. Row appears in table with status **Active**.
5. Draft auto-saved: `onSaveDraft({ allowances: next })`.

---

## Amount types

| UI label | API `amountType` | Calculation |
|---|---|---|
| Fixed Amount | `Fixed Amount` | Exact RWF per month |
| Percentage of Basic | `Percentage of Basic Salary` | `% × basic` |
| Percentage of Gross | `Percentage of Gross Salary` | `% × gross` |

Mapper: `mapAllowanceToApi()` / `mapAllowanceFromApi()` in `SalaryTemplate.jsx`.

---

## Payroll channels

| Channel | Meaning |
|---|---|
| Tax | Included in tax payroll register |
| Bank | Adjusts bank net only |
| Tax & Bank | Both registers |

Labels from `payrollChannelLabel()` in `shared/payroll/payrollTemplateChannels.js`.

---

## Row actions

| Button | Effect |
|---|---|
| Edit (pencil) | Opens modal with existing values |
| Pause | Sets status Inactive (excluded from engine) |
| Delete | Removes row; saves draft |

---

## Frontend design

```
AllowancesTab
  add/edit/toggle/delete
    → setAllowances(next)
    → onSaveDraft({ allowances: next })
      → persistTemplate("update", { allowances })
        → mapAllowanceToApi() for each row
        → POST /accountant/payroll/templates
```

---

## Backend logic

```
POST /accountant/payroll/templates
  allowances_json = JSON.stringify(payload.allowances)
  rules_json = JSON.stringify({ allowanceAuto: ... })
  UPDATE accountant_payroll_templates SET allowances_json, rules_json ...
```

---

## Categories available

Transport, Housing, Communication, Responsibility, Risk, Meal, Entertainment, Overtime, Bonus, Acting, Hardship, Medical, Travel, Other.

---

## Next

- [04 — Deductions Tab](./04-deductions-tab.md)
- [07 — Staff Salary Setup](./07-staff-salary-setup.md) — how auto allowances appear per staff
