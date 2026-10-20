# Chapter 06 — Department Budgets & Budget vs Actual

## Purpose

Two analytical views over the same expense lines: by **department**, and **planned vs used** variance.

**Page ids:** `dept-budgets` · `budget-vs-actual`  
**Components:** `DeptBudgetsPage` · `BudgetVsActualPage` in `schoolBudgetSubPages.jsx`

---

## Frontend design

### Department Budgets

- Groups `budgetLines` by `department`.  
- Shows planned, used, remaining, usage % per department.  
- Uses shared context (`useSchoolBudgetData`) — no extra REST call beyond dashboard/lines load.

### Budget vs Actual

- Row-level variance: planned − used, % used.  
- Highlights overspend / near-limit lines.  
- Empty until a budget with lines is selected.

### User actions

| Action | Effect |
|--------|--------|
| Select budget | Context reload → both pages refresh |
| Drill to Expenses / Usage | Via sidebar (manual) |

---

## Backend logic

No dedicated endpoints. Data comes from:

- Dashboard / lines already loaded in `SchoolBudgetDataContext`
- Optionally `GET /accountant/budget-lines/summary`

---

## Business rules

- Variance is **cash planned vs usage posted**, not accounting GL actuals.  
- Department labels must match options used when creating lines.

---

## Key files

| File | Role |
|------|------|
| `schoolBudgetSubPages.jsx` | Both pages |
| `SchoolBudgetTabFrame.jsx` | Shared chrome |
| `SchoolBudgetDataContext.jsx` | Source data |
