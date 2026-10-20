# Chapter 02 — Dashboard

## Purpose

Overview of the selected (or resolved active) budget: income vs allocation vs spend, charts, and alerts.

**Page id:** `budget-dashboard`  
**Component:** `BudgetDashboardPage.jsx`  
**API:** `GET /accountant/school-budgets/dashboard?budget_id=`

---

## Frontend design

### Layout

1. **Budget selector** — `BudgetSelectorPanel` (pick budget / refresh).  
2. **KPI cards** — expected income, allocated, spent, available / unallocated.  
3. **Charts** (Recharts) — income mix / planned vs used / department / monthly.  
4. **Alerts strip** — overspend risk, pending approval, low remaining.  
5. **Recent budgets** — quick status list.

### State

From `SchoolBudgetDataContext`:

- `budgetId`, `activeBudget`, `budgetLines`, `incomeSources`
- `totalExpectedIncome`, `totalAllocated`, `totalUsed`, `remainingUnallocated`, `availableBalance`, `usagePct`
- `alerts`, `monthlyData`, `departmentSpending`, `reload`

### User actions

| Action | Effect |
|--------|--------|
| Select budget | Reloads dashboard for that id |
| Refresh | Re-fetches dashboard + lines |
| Export / download (if shown) | Uses budget view/export helpers |

---

## Backend logic

`GET /accountant/school-budgets/dashboard`:

1. Resolve school from session.  
2. Resolve budget: explicit `budget_id` or latest **approved**, else **pending_approval**.  
3. Aggregate income sources, lines, usage.  
4. Return KPIs + series for charts.

---

## Business rules

- Empty state when no budgets exist — prompt to Create Budget.  
- Percentages: allocation % of expected; usage % of planned/allocated.  
- Alert severity mirrors usage thresholds (see [BUSINESS_RULES](../BUSINESS_RULES.md)).

---

## Key files

| File | Role |
|------|------|
| `BudgetDashboardPage.jsx` | UI |
| `BudgetSelectorPanel.jsx` | Budget picker |
| `SchoolBudgetDataContext.jsx` | Data load |
| `schoolBudgetApi.js` | `fetchSchoolBudgetDashboard` |
