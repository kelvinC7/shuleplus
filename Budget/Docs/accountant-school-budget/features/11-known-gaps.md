# Chapter 11 — Known Gaps

Documented product / engineering gaps as of the docs snapshot. Fix separately; do not treat as intended behavior.

---

## 1. Budget line general UPDATE missing

| Layer | Detail |
|-------|--------|
| Frontend | `budgetLineApi.updateBudgetLine` → `PATCH /accountant/budget-lines/:id` |
| Backend | Only `PATCH …/budget-lines/:id/freeze` exists |
| Impact | Edit line from UI fails with 404 / route miss |

**Fix direction:** Implement PATCH handler: validate school, re-check allocation headroom when `planned_amount_rwf` changes, audit log.

---

## 2. Orphan page ids (no nav entry)

Mapped in `schoolBugdet.jsx` but **not** in `SCHOOL_BUDGET_NAV`:

- `expense-tracking`
- `financial-reports`
- `asset-register`
- `liabilities`
- `equity`
- `receivables`

**Impact:** Dead code paths unless linked programmatically.  
**Fix:** Wire into nav, or remove from page map.

---

## 3. Filename typo

`schoolBugdet.jsx` should be `schoolBudget.jsx`. Renaming requires updating imports (`PortalRoutes.jsx`, etc.).

---

## 4. Balance sheet is illustrative

`deriveBudgetFinancials.js` is **not** a statutory balance sheet. Avoid presenting it as audited financial statements.

---

## 5. Approvals page is view-only

Accountant Approvals UI cannot approve. Correct by design — but easy to confuse with Manager Review.

---

## 6. Encoding glitches in Approvals UI

Some strings in `ApprovalsPage` show mojibake (e.g. `Â·`, `â€"`) — cosmetic UTF-8 issue in source.

---

## QA checklist for gaps

- [ ] Attempt edit existing expense line → confirm failure mode  
- [ ] Grep page map vs `SCHOOL_BUDGET_NAV` for drift  
- [ ] Confirm manager review + freeze still work after any line PATCH work  
