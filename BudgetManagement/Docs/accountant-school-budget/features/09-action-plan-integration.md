# Chapter 09 — Action Plan Integration

## Purpose

Link Action Plan activities to school budget lines so activity expenses debit the same usage ledger.

**Location:** Action Plan module → **Budget Tracking** (not inside School Budget nested nav)  
**Component:** `pages/actionPlan/BudgetIntegration.jsx`  
**Nav:** `actionPlanNav.js`

---

## Frontend design

- Lists activities with allocated / used / status (Healthy / Warning / Critical / Unused).  
- Progress bars for burn rate.  
- **Record expense** modal → `recordActivityExpense` (`actionPlanApi.js`).  
- Relies on `ActionPlanDataContext` for plan + linked budget info.

### User actions

| Action | Effect |
|--------|--------|
| View line health | Status from used vs allocated |
| Record expense | Posts activity expense; backend may insert `school_budget_line_usage` when linked |
| Open School Budget | Cross-module navigation for full line management |

---

## Backend logic

Action Plan expense routes in `portalOperations.js` (action-plan section):

1. Validate activity + amount.  
2. If activity is linked to a `budget_line_id`, debit that line (same rules: not frozen, within remaining).  
3. Insert usage / update `used_amount_rwf`.  
4. Update activity spent totals.

---

## Business rules

- Prefer an **approved** budget before heavy activity spending.  
- Activity spend counts toward the same line remaining as Usage Tracking.  
- Thresholds (~80% / ~95%) align with budget usage severity.

---

## Key files

| File | Role |
|------|------|
| `BudgetIntegration.jsx` | UI |
| `actionPlanApi.js` | `recordActivityExpense` |
| `ActionPlanDataContext.jsx` | Shared plan data |
| `portalOperations.js` | Action plan + usage coupling |
