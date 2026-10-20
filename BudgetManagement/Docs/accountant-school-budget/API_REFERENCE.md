# School Budget — API Reference

**Base:** `{VITE_API_URL}/api`  
**Auth:** Session cookie

---

## School budgets

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/accountant/school-budgets/options` | Years, terms, types, statuses, income presets, next code |
| GET | `/accountant/school-budgets` | List (`?status=`) |
| GET | `/accountant/school-budgets/dashboard` | Dashboard KPIs (`?budget_id=`) |
| GET | `/accountant/school-budgets/manager-overview` | Manager overview |
| GET | `/accountant/school-budgets/:id` | One budget + income sources |
| POST | `/accountant/school-budgets` | Create (`submit: true` → pending) |
| PATCH | `/accountant/school-budgets/:id` | Update draft/rejected; optional submit |
| PATCH | `/accountant/school-budgets/:id/review` | Manager approve / reject / revision / cancel |

### Create / update body (key fields)

```json
{
  "title": "Term 1 2026 Budget",
  "academic_year": "2025-2026",
  "term": "Term 1",
  "budget_type": "Term Budget",
  "start_date": "2026-01-01",
  "end_date": "2026-04-30",
  "description": "…",
  "prepared_by_name": "Jane Accountant",
  "submit": false,
  "income_sources": [
    {
      "income_source_key": "Tuition Fees",
      "expected_amount_rwf": 12000000,
      "config_json": { "calculationType": "per_student", "quantity": 400, "unitAmount": 30000, "deductions": [] }
    }
  ]
}
```

### Review body

```json
{
  "decision": "approve",
  "notes": "Looks good"
}
```

`decision`: `approve` | `reject` | `revision` | `cancel`

---

## Budget lines

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/accountant/budget-lines/options` | Categories, departments, budgets |
| GET | `/accountant/budget-lines` | List (`?budget_id=`) |
| GET | `/accountant/budget-lines/summary` | Totals + lines |
| POST | `/accountant/budget-lines` | Create line; bumps `total_allocated_rwf` |
| PATCH | `/accountant/budget-lines/:id/freeze` | Manager freeze/unfreeze |

### Create line body

```json
{
  "budget_id": 12,
  "line_name": "Classroom supplies",
  "category": "Academic",
  "department": "Academics",
  "priority": "Medium",
  "planned_amount_rwf": 500000,
  "start_date": "2026-01-01",
  "end_date": "2026-04-30",
  "notes": "…"
}
```

**Gap:** Frontend calls `PATCH /accountant/budget-lines/:id` for general update — **no matching backend route** (only freeze exists).

---

## Usage

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/accountant/budget-line-usage` | Register spend |
| GET | `/accountant/budget-line-usage` | History (`?budget_id=` / `?budget_line_id=`) |

### Usage body

```json
{
  "budget_line_id": 44,
  "amount_rwf": 75000,
  "usage_date": "2026-02-10",
  "expense_category": "Supplies",
  "payment_method": "Bank Transfer",
  "payment_bank_name": "Bank of Kigali",
  "payment_phone": "",
  "description": "Ink & paper",
  "receipt_name": "RCP-001.pdf"
}
```

---

## Related

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/accountant/babyeyi-fees/budget-analysis` | Tuition projection for income auto-fill |

---

## Client services

| File | Wraps |
|------|-------|
| `schoolBudgetApi.js` | School budgets + dashboard |
| `budgetLineApi.js` | Lines + usage |
| `managerBudgetApi.js` | Review, freeze, overview |
