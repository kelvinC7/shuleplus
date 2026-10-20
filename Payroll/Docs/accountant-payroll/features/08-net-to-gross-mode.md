# 08 — Net-to-Gross Mode (Staff Salary Setup)

## When to use

Use **NetToGross Salary Payroll** when:

- The employment contract states a fixed **net take-home** amount.
- You need the system to **solve for basic salary** and Others/H/A/T/A split.
- You do not want to manually trial-and-error basic amounts.

---

## Walkthrough: Switch mode

1. On Staff Salary Setup, click **NetToGross Salary Payroll** in the header toggle.
2. Tab bar changes:

| Normal mode tabs | Net-to-Gross mode tabs |
|---|---|
| Earnings | **Net-to-Gross** |
| Deductions | Deductions |
| Advance | Advance |
| Summary | Summary |

3. Select staff from left panel.

---

## Walkthrough: Calculate

**Net-to-Gross tab (screenshot-style):**

```
┌─────────────────────────────────────────────────────────┐
│ Net-to-Gross Calculator — Method 2                      │
│                                                         │
│ Desired Net Salary (RWF):  [ 250000 ]                   │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Solved Basic Salary        │ RWF  …                   │ │
│ │ Others / H/A / T/A split   │ …                        │ │
│ │ Gross Salary               │ RWF  …                   │ │
│ │ PAYE                       │ − RWF  …                 │ │
│ │ CSR, RAMA, Maternity, CBHI │ − RWF  …                 │ │
│ │ Final Net                  │ RWF 250,000  ✓           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [Save calculated package to profile]                    │
└─────────────────────────────────────────────────────────┘
```

### Step-by-step

1. Enter **Desired Net Salary**.
2. `calcNetToGrossFromDesiredNet()` runs in `useMemo`:
   - Uses active template `statutory` and `payeRates`.
   - Includes active custom deductions and advance monthly from Deductions/Advance tabs.
3. Result auto-writes to local state via `salaryFromNetToGrossResult()`:
   - Sets `basic`, `others`, `housing`, `transport`.
   - Clears communication, responsibility, meal, custom allowances.
4. Review breakdown table.
5. Click **Save calculated package to profile**.
6. `saveStaffPayrollProfile()` persists to `staff.payroll_*` columns.

---

## Frontend design

```javascript
calcNetToGrossFromDesiredNet({
  desiredNet: sal.desiredNet,
  employeeDeductions: buildEmployeeDeductionsForCalc(sal),
  statutory: templateStatutory,
  payeRates: templatePayeRates,
});
```

Returns: `basicSalary`, `registerAllowanceSplit`, `grossSalary`, `paye`, statutory lines, `finalNet`, `totalCostToSchool`.

---

## Important behaviour

| Topic | Behaviour |
|---|---|
| Supplemental allowances | Cleared in solved package (meal, communication, custom) |
| Template auto-rules | Net-to-gross engine uses internal split logic |
| Deductions tab | Custom deductions still reduce net target |
| Advance tab | Active advance monthly included in solve |
| Summary tab | Shows **Net-to-Gross** badge when `desiredNet > 0` |

---

## Walkthrough: Verify before save

1. Open **Summary** tab.
2. Confirm **Net Salary** matches desired net.
3. Confirm **Target Net Salary** row appears in Salary History.
4. Check **Employer Cost Breakdown** for budget approval.
5. Save.

---

## Backend logic

Same endpoint as normal mode:

```
PATCH /accountant/payroll/staff/:userId
{
  payroll_basic_salary: <solved>,
  payroll_transport_allowance: <solved>,
  payroll_housing_allowance: <solved>,
  payroll_meal_allowance: 0,
  payroll_other_allowances: [{ name: "Others", amount: <solved> }, ...]
}
```

No separate "net-to-gross" flag stored — only the resulting salary columns.

---

## Switch back to Normal mode

1. Click **Normal Payroll**.
2. Tab returns to **Earnings**.
3. Previously saved basic and allowances remain on staff profile.

---

## Next

- [09 — Frontend & Backend Flow](./09-frontend-backend-flow.md)
- [10 — Validation & QA](./10-validation-and-qa.md)
