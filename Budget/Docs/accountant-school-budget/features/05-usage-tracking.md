# Chapter 05 — Usage Tracking

## Purpose

Register actual spending against budget lines and review usage history / burn rates.

**Page id:** `budget-usage-tracking`  
**Component:** `BudgetLineTracking.jsx`  
**APIs:**  
- `POST /accountant/budget-line-usage`  
- `GET /accountant/budget-line-usage`

---

## Frontend design

### Layout

1. Select budget → list lines with planned / used / remaining / severity.  
2. **Register usage** — `RegisterBudgetUsageModal`.  
3. History table filtered by budget or line.

### Usage form fields

| Field | Required |
|-------|----------|
| Budget line | Yes |
| Amount (RWF) | Yes |
| Usage date | Yes |
| Expense category | Optional |
| Payment method | Bank / mobile / cash… |
| Bank name / phone | Depends on method |
| Description | Recommended |
| Receipt name | Optional metadata |

### Severity (UI)

| Level | Rule |
|-------|------|
| Active | &lt; 80% used |
| Warning | ≥ 80% |
| Critical | ≥ 90% |
| Exhausted | ≥ 100% |

---

## Backend logic

`POST /accountant/budget-line-usage`:

1. Load line; reject if `is_frozen` or amount &gt; remaining.  
2. Insert usage row.  
3. `used_amount_rwf += amount`.  
4. Optional large-expense notify (`BUDGET_LARGE_EXPENSE_RWF`, default 5,000,000).

Action Plan activity expenses can also create usage when a line is linked (see [09](./09-action-plan-integration.md)).

---

## Business rules

- Usage only reduces the **line** remaining, not expected income.  
- Overspend is blocked server-side.  
- Frozen lines: no new usage.

---

## Key files

| File | Role |
|------|------|
| `BudgetLineTracking.jsx` | Page |
| `RegisterBudgetUsageModal.jsx` | Modal |
| `budgetLineApi.js` | `registerBudgetLineUsage` / `fetchBudgetLineUsage` |
