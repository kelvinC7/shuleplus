# Chapter 01 — Getting Started

## What is School Budget?

The **School Budget** module lets accountants plan expected income, submit budgets for manager approval, allocate expense lines, and track real spending against those lines.

**URL:** `/accountant/school-budget`  
**Sidebar:** Finance Management → **School Budget**  
**Shell:** `accountant_portal/frontend/src/pages/schoolBugdet.jsx` *(filename typo: Bugdet)*

---

## Step 1 — Log in

1. Open the Babyeyi web app and sign in as an **Accountant** (or school admin with accountant access).
2. Open **Accountant Portal**.
3. Go to **Finance Management → School Budget**, or open `/accountant/school-budget` directly.

---

## Step 2 — Understand the layout

```
┌─────────────────┬──────────────────────────────────────┐
│ Nested sidebar  │  Header (page title, period, alerts) │
│                 ├──────────────────────────────────────┤
│ Dashboard       │                                      │
│ Create Budget   │         ACTIVE PAGE CONTENT          │
│ Expenses        │                                      │
│ Usage Tracking  │                                      │
│ …               │                                      │
└─────────────────┴──────────────────────────────────────┘
```

Sub-pages are **state-switched** via `activePage` inside `schoolBugdet.jsx` — they are **not** separate React Router paths.

Nav source: `utils/schoolBudgetNav.js` → `SCHOOL_BUDGET_NAV`.

---

## Step 3 — Know your role

| Role | Create / edit draft | Submit | Allocate / usage | Approve / reject | Freeze line |
|------|---------------------|--------|------------------|------------------|-------------|
| Accountant | ✅ | ✅ | ✅ | — | — |
| School Manager / Admin | View | — | View | ✅ | ✅ |

Manager UI: `/manager/finance/budgets` → `SchoolBudgetManagement.jsx`.

---

## Step 4 — First-time checklist

| Step | Action | Guide |
|------|--------|-------|
| 1 | Create a draft budget with income sources | [03 Create Budget](./03-create-budget.md) |
| 2 | Submit for manager approval | [07 Approvals](./07-approvals.md) |
| 3 | After approval, add expense lines | [04 Expenses](./04-expenses-budget-lines.md) |
| 4 | Register usage as money is spent | [05 Usage Tracking](./05-usage-tracking.md) |
| 5 | Monitor Dashboard / Vs Actual | [02](./02-dashboard.md) · [06](./06-department-and-vs-actual.md) |

---

## Step 5 — Key concepts

| Term | Meaning |
|------|---------|
| **Budget header** | Year, term, type, status, expected income, allocated total |
| **Income source** | Expected money in (tuition, grants, …) with optional deductions |
| **Budget line** | Expense allocation (planned amount for a category/department) |
| **Usage** | Actual spend posted against a line |
| **Active budget** | Selected budget in context; else latest approved (or pending) |

---

## Key files

| File | Role |
|------|------|
| `schoolBugdet.jsx` | Module shell + page map |
| `SchoolBudgetSidebar.jsx` | Nested nav |
| `SchoolBudgetDataContext.jsx` | Shared budget/lines/alerts state |
| `schoolBudgetApi.js` / `budgetLineApi.js` | REST clients |
