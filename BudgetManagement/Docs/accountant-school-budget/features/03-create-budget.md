# Chapter 03 — Create Budget

## Purpose

Build a school budget header with expected **income sources**, save as draft, or submit for manager approval.

**Page id:** `create-budget`  
**Component:** `createBudgetPage.jsx`  
**APIs:**  
- `GET /accountant/school-budgets/options`  
- `POST /accountant/school-budgets`  
- `PATCH /accountant/school-budgets/:id`  
- `GET /accountant/babyeyi-fees/budget-analysis` (tuition auto-fill)

---

## Frontend design

### Form sections

1. **Header** — title, academic year, term, budget type, start/end dates, description, prepared-by.  
2. **Income sources** — `BudgetIncomeSourcesSection` + cards (`BudgetIncomeSourceCard`).  
3. **Tuition panel** — `TuitionFeesBudgetPanel` (Babyeyi fee-card projection).  
4. **Actions** — Save draft · Submit for approval · View existing (`BudgetViewModal`).

### Income engine

`budgetIncomeConfig.js`:

- Presets (`INCOME_SOURCE_PRESETS`)
- Fixed vs per-student calculation
- Deductions → **net expected**
- Stored in `config_json` on each income row

### User actions

| Action | API | Result status |
|--------|-----|---------------|
| Save draft | POST/PATCH `submit: false` | `draft` |
| Submit | POST/PATCH `submit: true` | `pending_approval` |
| Edit rejected | PATCH (status must be draft/rejected) | then resubmit |

---

## Backend logic

### Create

1. Generate `budget_code` (`BGT-{year}-{seq}`) if needed.  
2. Sum net income → `total_expected_income_rwf`.  
3. Insert `school_budgets` + `school_budget_income_sources`.  
4. On submit → notify manager → `/manager/finance/budgets`.  
5. Audit log.

### Update

- Only when status ∈ `{draft, rejected}`.  
- Recompute expected total; keep `total_allocated_rwf ≤ expected`.

---

## Business rules

- At least one income source with positive net is expected for a useful budget.  
- Budget types: Term / Annual / Department / Project / Emergency / Supplementary.  
- Terms: Term 1–3 / Full Academic Year (+ school active terms).

---

## Key files

| File | Role |
|------|------|
| `createBudgetPage.jsx` | Page |
| `BudgetIncomeSourcesSection.jsx` | Income UI |
| `TuitionFeesBudgetPanel.jsx` | Fee analysis |
| `budgetIncomeConfig.js` | Calc / presets |
| `schoolBudgetApi.js` | CRUD client |
| `BudgetViewModal.jsx` | Read-only / export view |
