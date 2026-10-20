# 05 — Statutory Rates Tab (Salary Template)

## Tab location

Salary Template → **Statutory Rates** (third tab)

This tab combines **Rwanda statutory configuration display**, **live formula preview**, and **full-school payroll register preview** with export.

---

## Walkthrough: Section 1 — PAYE brackets

```
┌─────────────────────────────────────────────────────────┐
│ PAYE — Income Tax                    [Edit PAYE Rates]  │
│ Progressive tax on Gross Salary (RRA brackets)          │
├─────────────────────────────────────────────────────────┤
│ Min Income    │ Max Income     │ Tax Rate               │
│ 0             │ 60,000         │ 0%                     │
│ 60,001        │ 100,000        │ 10%                    │
│ 100,001       │ 200,000        │ 20%                    │
│ 200,001       │ ∞              │ 30%                    │
└─────────────────────────────────────────────────────────┘
```

### Step-by-step

1. Review default Rwanda brackets (stored in `paye_rates_json` when template saved).
2. Click **Edit PAYE Rates** to toggle edit UI (brackets display; saved with template on Activate/Save Draft).
3. PAYE uses `calcProgressivePAYEBreakdown()` — **not** flat 30% on full gross.

---

## Walkthrough: Section 2 — Contribution cards

Five cards in a responsive grid:

| Card | Employee | Employer | Base |
|---|---|---|---|
| RSSB Pension (CSR) | 6% | 6% | Gross |
| Maternity Leave Fund | 0.3% | 0.3% | Base |
| RAMA (Medical) | 7.5% | 7.5% | Basic |
| Occupational Hazard | — | 2% | Base |
| CBHI / Mutuelle | 0.5% | — | Net |

Each card shows live amounts for the preview basic entered below.

Values come from `statutory` state → saved as `statutory_json` on template.

---

## Walkthrough: Section 3 — Live Formula Preview

**Dark navy panel (screenshot-style):**

```
┌─────────────────────────────────────────────────────────┐
│ Live Formula Preview          Basic Salary: [300000]    │
│ Uses N active allowance(s) from template + statutory    │
├─────────────────────────────────────────────────────────┤
│ Gross Salary        │ PAYE              │ CSR 6%         │
│ RAMA 7.5%           │ Maternity 0.3%    │ CBHI 0.5%      │
│ Final Net Salary    │ Cost to School                     │
└─────────────────────────────────────────────────────────┘
```

### Step-by-step

1. Enter **Basic Salary** in the preview input.
2. Values recalculate instantly via `calcRwandaPayroll()`.
3. Includes active template deductions + active employee deductions (monthly totals).
4. If auto Others/H/A/T/A enabled, gross includes register split from `allowanceRules`.

### Frontend calc call

```javascript
calcRwandaPayroll({
  basicSalary: pb,
  allowances: engineAllowances,
  templateDeductions: deductionsForEngine(deductions),
  employeeDeductions: activeEmpDeductions.map(d => ({ monthlyInstallment: d.monthly })),
  statutory,
  payeRates,
  allowanceRules,
});
```

---

## Walkthrough: Section 4 — PAYE Bracket Breakdown

Table showing each bracket's taxable slice and tax amount for the preview gross.

Use this to verify progressive PAYE against RRA expectations.

---

## Walkthrough: Section 5 — Live Payroll Register

```
┌─────────────────────────────────────────────────────────┐
│ LIVE PAYROLL REGISTER · JULY 2026                       │
│                              [Export CSV] [Export Excel] │
├─────────────────────────────────────────────────────────┤
│ Name │ RSSB │ Basic │ Others │ H/A │ T/A │ Gross │ PAYE │ … │ Net │
│ …    │ …    │ …     │ …      │ …   │ …   │ …     │ …    │   │ …   │
│ TOTAL│      │       │        │     │     │       │      │   │     │
└─────────────────────────────────────────────────────────┘
```

### Step-by-step

1. On tab open, frontend loads all staff: `searchPayrollStaff("", 500)`.
2. For each staff with `payroll.basicSalary > 0`:
   - Run `calcRwandaPayroll()` with their basic + shared template settings.
   - Attach per-staff employee deductions from `empDedByStaff` map.
   - Build row via `buildPayrollRegisterRow()`.
3. If no staff have basic, shows one **Sample (preview basic)** row.
4. Footer totals from `sumPayrollRegisterRows()`.

### Step-by-step: Export

1. Ensure register has rows.
2. Click **Export CSV** or **Export Excel**.
3. Files generated client-side by `downloadPayrollRegisterCsv()` / `downloadPayrollRegisterExcel()` in `payrollRegister.js`.

---

## Frontend design (live register)

```javascript
useEffect(() => {
  searchPayrollStaff("", 500).then(setLiveStaff);
}, []);
```

No separate API for register — **100% client-side calc** from staff profiles + template.

---

## Backend logic (server preview)

```
POST /accountant/payroll/templates/preview
Body: { basicSalary, allowances, deductions, statutory, payeRates, allowanceRules }
Response: calcRwandaPayroll result object
```

Used for server validation; Statutory tab does not call this by default.

---

## What gets saved

Statutory rates and PAYE brackets persist when you click **Save Draft** or **Activate** on the page header (not auto-saved per field on this tab).

---

## Next

- [06 — Employee Deductions Tab](./06-employee-deductions-tab.md)
- [07 — Staff Salary Setup](./07-staff-salary-setup.md) — populate basic salaries for live register
