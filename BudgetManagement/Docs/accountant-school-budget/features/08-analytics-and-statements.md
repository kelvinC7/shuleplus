# Chapter 08 — Analytics & Statements

## Purpose

Higher-level views: analytics charts, an illustrative balance sheet, and audit-style activity for the selected budget.

**Page ids:** `analytics` · `balance-sheet` · `audit-logs`  
**Components:** `AnalyticsPage` · `BalanceSheetPage` · `AuditLogsPage` in `schoolBudgetSubPages.jsx`

---

## Analytics

- Summaries derived from context totals and line aggregates.  
- Charts (department / usage trends) when data exists.  
- Same budget selector dependency as Dashboard.

---

## Balance Sheet

- Uses `deriveBudgetFinancials.js` to map budget totals into a simplified **Assets = Liabilities + Equity** illustration.  
- **Not** a full general ledger or statutory statement.  
- Useful for presentation / teaching views tied to budget figures.

---

## Audit Logs

- Displays recent budget-related events available to the UI (context / derived list).  
- Server-side detailed audit is written via `appendAuditLog` on create/update/review/freeze/usage.  
- For full portal audit, also see admin portal audit logs where enabled.

---

## Orphan page ids (not in nav)

`schoolBugdet.jsx` still maps these ids, but they are **not** listed in `SCHOOL_BUDGET_NAV`:

| Id | Component |
|----|-----------|
| `expense-tracking` | `ExpenseTrackingPage` |
| `financial-reports` | `FinancialReportsPage` |
| `asset-register` | `AssetRegisterPage` |
| `liabilities` | `LiabilitiesPage` |
| `equity` | `EquityPage` |
| `receivables` | `ReceivablesPage` |

See [11-known-gaps](./11-known-gaps.md).

---

## Key files

| File | Role |
|------|------|
| `schoolBudgetSubPages.jsx` | Pages |
| `deriveBudgetFinancials.js` | Balance sheet derivation |
| `budgetReportFormat.js` / `budgetViewExport.js` | Formatting / export |
