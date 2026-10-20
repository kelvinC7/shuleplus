# Chapter 07 — Approvals

## Purpose

Track approval progress on the accountant side, and perform approve / reject / revision / cancel on the **manager** side.

---

## A — Accountant: Approvals page

**Page id:** `approvals`  
**Component:** `ApprovalsPage` (`schoolBudgetSubPages.jsx`)

### Frontend

Read-only timeline for the active budget:

1. Created  
2. Submitted  
3. Manager review  
4. Active (approved)

Shows status badge and manager review notes. **Does not** call review API — actions happen in Manager portal.

### User actions

| Action | Where |
|--------|-------|
| Submit budget | Create Budget page |
| View status / notes | Approvals page |
| Approve / reject | Manager only |

---

## B — Manager: School Budget Management

**URL:** `/manager/finance/budgets`  
**Component:** `manager/pages/budget/SchoolBudgetManagement.jsx`  
**Client:** `managerBudgetApi.js`

### Actions → API

| Decision | Body | New status |
|----------|------|------------|
| Approve | `{ decision: "approve", notes? }` | `approved` |
| Reject | `{ decision: "reject", notes }` required | `rejected` |
| Request revision | `{ decision: "revision", notes? }` | `draft` |
| Cancel | `{ decision: "cancel", notes }` required | `closed` |

**Endpoint:** `PATCH /accountant/school-budgets/:id/review`  
**Roles:** `SCHOOL_MANAGER`, `SCHOOL_ADMIN`, `SUPER_ADMIN`, `FULL_SYSTEM_CONTROLLER`

### Freeze line

`PATCH /accountant/budget-lines/:id/freeze` with `{ freeze: true|false }`.

---

## Backend side effects

- Push notification to accountant portal on review.  
- Audit log with decision.  
- Sets `manager_reviewed_*` fields on budget row.

---

## Key files

| File | Role |
|------|------|
| `ApprovalsPage` | Accountant timeline |
| `SchoolBudgetManagement.jsx` | Manager UI |
| `managerBudgetApi.js` | Review / freeze / overview |
| `portalOperations.js` | Review + freeze handlers |
