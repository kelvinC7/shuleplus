# Chapter 04 — Expenses / Budget Lines

## Purpose

Allocate expected income into **expense lines** (planned amounts by category and department).

**Page id:** `budget-lines`  
**Component:** `BudgetLinesPage.jsx`  
**APIs:**  
- `GET /accountant/budget-lines` · `/summary` · `/options`  
- `POST /accountant/budget-lines`  
- Manager: `PATCH /accountant/budget-lines/:id/freeze`

---

## Frontend design

### Layout

1. Budget selector + allocation summary (`BudgetAllocationSummary`).  
2. Table of lines: name, category, department, planned, used, remaining, freeze badge.  
3. **Add / edit** via `BudgetLineModal`.  
4. Export helpers (`budgetExpensesExport.js`).

### Fields (create)

| Field | Notes |
|-------|-------|
| `line_name` | Required |
| `category` | From options |
| `department` | From options |
| `priority` | e.g. High / Medium / Low |
| `planned_amount_rwf` | Must be > 0 and ≤ remaining unallocated |
| Dates / notes | Optional |

### User actions

| Action | Endpoint | Notes |
|--------|----------|-------|
| Add line | POST `/accountant/budget-lines` | Bumps parent `total_allocated_rwf` |
| Edit line | Frontend calls PATCH `/accountant/budget-lines/:id` | **No general backend route** — see gaps |
| Freeze | Manager only | `/freeze` |

---

## Backend logic

`POST /accountant/budget-lines`:

1. Verify parent budget belongs to school.  
2. Remaining unallocated = `expected − allocated` ≥ planned.  
3. Insert line with `used_amount_rwf = 0`.  
4. Increment budget `total_allocated_rwf`.

---

## Business rules

- Prefer allocating on **approved** budgets (operational spend).  
- Cannot allocate more than remaining expected income.  
- Frozen lines still show planned/used but block new usage.

---

## Known gap

`budgetLineApi.updateBudgetLine` → `PATCH /accountant/budget-lines/:id` has **no matching handler** in `portalOperations.js` (only `/freeze`). Documented in [11-known-gaps](./11-known-gaps.md).

---

## Key files

| File | Role |
|------|------|
| `BudgetLinesPage.jsx` | List UI |
| `BudgetLineModal.jsx` | Create/edit form |
| `budgetLineApi.js` | Client |
| `budgetLineConstants.js` | Categories / colors |
