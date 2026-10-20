# School Budget — Architecture

## System overview

```mermaid
flowchart TB
  subgraph acct [Accountant Portal]
    SHELL[schoolBugdet.jsx]
    DASH[Dashboard]
    CREATE[Create Budget]
    LINES[Expenses]
    USAGE[Usage Tracking]
    APPR[Approvals view]
  end

  subgraph mgr [Manager Portal]
    MBM[SchoolBudgetManagement.jsx]
  end

  subgraph api [portalOperations.js]
    SB[/accountant/school-budgets*]
    BL[/accountant/budget-lines*]
    US[/accountant/budget-line-usage*]
  end

  subgraph db [MySQL]
    B[school_budgets]
    I[school_budget_income_sources]
    L[school_budget_lines]
    U[school_budget_line_usage]
  end

  SHELL --> DASH
  SHELL --> CREATE
  SHELL --> LINES
  SHELL --> USAGE
  SHELL --> APPR
  CREATE --> SB
  LINES --> BL
  USAGE --> US
  MBM --> SB
  MBM --> BL
  SB --> B
  SB --> I
  BL --> L
  US --> U
  US --> L
```

## Repository layout

```
accountant_portal/frontend/src/
├── pages/
│   ├── schoolBugdet.jsx              # ★ Module shell
│   ├── BudgetDashboardPage.jsx
│   ├── createBudgetPage.jsx
│   ├── BudgetLinesPage.jsx
│   ├── BudgetLineTracking.jsx
│   ├── schoolBudgetSubPages.jsx      # Dept, vs-actual, approvals, analytics…
│   └── actionPlan/BudgetIntegration.jsx
├── components/
│   ├── SchoolBudgetSidebar.jsx
│   ├── BudgetLineModal.jsx
│   ├── RegisterBudgetUsageModal.jsx
│   ├── BudgetIncomeSourcesSection.jsx
│   └── TuitionFeesBudgetPanel.jsx
├── services/
│   ├── schoolBudgetApi.js
│   └── budgetLineApi.js
├── context/SchoolBudgetDataContext.jsx
└── utils/
    ├── schoolBudgetNav.js
    ├── budgetIncomeConfig.js
    ├── budgetLineConstants.js
    └── deriveBudgetFinancials.js

manager/pages/budget/SchoolBudgetManagement.jsx
manager/services/managerBudgetApi.js

BabyeyiSystem/backend/BabyeyiRoutes/portalOperations.js
```

## Database tables

| Table | Purpose |
|-------|---------|
| `school_budgets` | Header: code, year, term, type, status, totals |
| `school_budget_income_sources` | Expected income lines + `config_json` |
| `school_budget_lines` | Expense allocations; planned vs used; freeze |
| `school_budget_line_usage` | Spend events against a line |

## Status lifecycle

```
draft → pending_approval → approved
                ↘ rejected → (edit) → draft
                ↘ closed (cancel)
```

## Auth

| Action | Roles |
|--------|-------|
| CRUD draft / lines / usage | Accountant (+ school admin typically) |
| Review approve/reject | SCHOOL_MANAGER, SCHOOL_ADMIN |
| Freeze line | Manager / Admin |
