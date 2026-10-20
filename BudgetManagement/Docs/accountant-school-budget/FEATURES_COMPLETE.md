# School Budget — Complete Manual

> **Portal:** `/accountant/school-budget`  
> **Manager approvals:** `/manager/finance/budgets`  
> **Shell:** `schoolBugdet.jsx` · **Backend:** `portalOperations.js`

All-in-one product + developer manual for the Accountant **School Budget** module.

---

## 1. Overview

School Budget lets accountants:

1. Create budgets with expected income (including Tuition from Babyeyi fee analysis)  
2. Submit for manager approval  
3. Allocate expense lines after approval  
4. Register usage and monitor burn rates  
5. Analyze department spend and budget vs actual  

**Roles:** Accountant (create/submit/allocate/usage) · Manager/Admin (approve/reject/freeze).

**Workflow:**

```
draft → pending_approval → approved → allocate lines → register usage
                ↘ rejected / revision → edit → resubmit
                ↘ closed (cancel)
```

---

## 2. Getting Started

**URL:** `/accountant/school-budget`  
**Sidebar:** Finance Management → School Budget  

Nested pages are **state-switched** (`activePage`), not separate routes. Nav: `schoolBudgetNav.js`.

| Page id | Label |
|---------|-------|
| `budget-dashboard` | Dashboard |
| `create-budget` | Create Budget |
| `budget-lines` | Expenses |
| `budget-usage-tracking` | Usage Tracking |
| `dept-budgets` | Department Budgets |
| `budget-vs-actual` | Budget vs Actual |
| `approvals` | Approvals |
| `analytics` | Analytics |
| `balance-sheet` | Balance Sheet |
| `audit-logs` | Audit Logs |

**First-time path:** Create Budget → Submit → Manager approve → Expenses → Usage → Dashboard.

---

## 3. Dashboard

**Component:** `BudgetDashboardPage.jsx`  
**API:** `GET /accountant/school-budgets/dashboard`

Shows KPIs (expected, allocated, spent, available), charts (Recharts), alerts, and recent budgets. Select budget via `BudgetSelectorPanel`. Data shared through `SchoolBudgetDataContext`.

If no `budget_id`, server prefers latest **approved**, else **pending_approval**.

---

## 4. Create Budget

**Component:** `createBudgetPage.jsx`

### Header fields

Title, academic year, term, budget type, dates, description, prepared-by.

### Income sources

`BudgetIncomeSourcesSection` + `budgetIncomeConfig.js`:

- Fixed or per-student amounts  
- Deductions → net expected  
- Tuition Fees via `TuitionFeesBudgetPanel` + `GET /accountant/babyeyi-fees/budget-analysis`

### Actions

| Action | Result |
|--------|--------|
| Save draft | `status = draft` |
| Submit | `status = pending_approval` + manager notify |

**APIs:** `POST/PATCH /accountant/school-budgets` · `GET …/options`  
**Code format:** `BGT-{year}-{seq}`

Edits allowed only when status is `draft` or `rejected`.

---

## 5. Expenses (Budget Lines)

**Component:** `BudgetLinesPage.jsx` · modal `BudgetLineModal.jsx`

Allocate planned amounts by category/department. Cannot allocate more than remaining expected income (`expected − allocated`).

**API:** `POST /accountant/budget-lines` increments parent `total_allocated_rwf`.

**Gap:** Frontend `PATCH /accountant/budget-lines/:id` has no general backend update (only freeze).

Manager freeze: `PATCH /accountant/budget-lines/:id/freeze`.

---

## 6. Usage Tracking

**Component:** `BudgetLineTracking.jsx` · `RegisterBudgetUsageModal.jsx`

Register spend: amount, date, category, payment method/bank/phone, description, receipt name.

**API:** `POST /accountant/budget-line-usage` — rejects frozen lines and over-remaining amounts; bumps `used_amount_rwf`.

Severity: Active &lt;80% · Warning ≥80% · Critical ≥90% · Exhausted ≥100%.  
Large expense notify default: 5,000,000 RWF (`BUDGET_LARGE_EXPENSE_RWF`).

---

## 7. Department & Vs Actual

**Components:** `DeptBudgetsPage` · `BudgetVsActualPage` in `schoolBudgetSubPages.jsx`

Client-side aggregates from context lines — planned vs used by department and by line. Not GL actuals.

---

## 8. Approvals

### Accountant (`ApprovalsPage`)

Read-only timeline: Created → Submitted → Manager review → Active. Shows manager notes.

### Manager (`/manager/finance/budgets`)

`SchoolBudgetManagement.jsx` → `PATCH /accountant/school-budgets/:id/review`:

| Decision | Status |
|----------|--------|
| approve | `approved` |
| reject | `rejected` (notes required) |
| revision | `draft` |
| cancel | `closed` (notes required) |

Also freeze/unfreeze lines.

---

## 9. Analytics & Statements

| Page | Notes |
|------|-------|
| Analytics | Charts from context totals |
| Balance Sheet | Illustrative via `deriveBudgetFinancials.js` — **not** statutory |
| Audit Logs | UI list; server also writes `appendAuditLog` |

Orphan page ids (in shell, not in nav): expense-tracking, financial-reports, asset-register, liabilities, equity, receivables.

---

## 10. Action Plan Integration

**Path:** Action Plan → Budget Tracking · `BudgetIntegration.jsx`

Activity expenses via `recordActivityExpense` can debit a linked budget line and create usage — same remaining/freeze rules as Usage Tracking.

---

## 11. Architecture & data model

### Tables

| Table | Purpose |
|-------|---------|
| `school_budgets` | Header + totals + status |
| `school_budget_income_sources` | Income + `config_json` |
| `school_budget_lines` | Planned / used / freeze |
| `school_budget_line_usage` | Spend events |

### Key frontend files

`schoolBugdet.jsx`, `SchoolBudgetSidebar.jsx`, `SchoolBudgetDataContext.jsx`, `schoolBudgetApi.js`, `budgetLineApi.js`, `budgetIncomeConfig.js`, `schoolBudgetSubPages.jsx`

### Key backend

`BabyeyiSystem/backend/BabyeyiRoutes/portalOperations.js` — school-budgets, budget-lines, budget-line-usage sections.

---

## 12. API summary

| Method | Path |
|--------|------|
| GET | `/accountant/school-budgets/options` |
| GET | `/accountant/school-budgets` |
| GET | `/accountant/school-budgets/dashboard` |
| GET | `/accountant/school-budgets/manager-overview` |
| GET/POST/PATCH | `/accountant/school-budgets` · `/:id` |
| PATCH | `/accountant/school-budgets/:id/review` |
| GET/POST | `/accountant/budget-lines` · options · summary |
| PATCH | `/accountant/budget-lines/:id/freeze` |
| POST/GET | `/accountant/budget-line-usage` |
| GET | `/accountant/babyeyi-fees/budget-analysis` |

Full detail: [API_REFERENCE.md](./API_REFERENCE.md)

---

## 13. Business rules (short)

- Allocate ≤ expected income  
- Use ≤ line remaining; no usage on frozen lines  
- Reject/cancel require notes  
- Active budget resolution: approved first, else pending  

Full detail: [BUSINESS_RULES.md](./BUSINESS_RULES.md)

---

## 14. Known gaps

1. No general `PATCH` budget-line update on backend  
2. Orphan page ids not in nav  
3. Filename typo `schoolBugdet.jsx`  
4. Balance sheet is illustrative only  
5. Approvals accountant page is view-only (by design)  

See [features/11-known-gaps.md](./features/11-known-gaps.md).

---

## 15. Developer checklist

- [ ] Create draft with income + deductions  
- [ ] Submit → manager sees pending  
- [ ] Approve → allocate → usage  
- [ ] Reject → edit → resubmit  
- [ ] Freeze blocks usage  
- [ ] Dashboard KPIs match line math  
- [ ] Action Plan expense updates same line  

---

*Babyeyi Accountant Portal — School Budget Complete Manual*
