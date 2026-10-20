# School Budget — Backend Logic

Deep dive for `portalOperations.js` school-budget handlers.

---

## 1. Create budget

`POST /accountant/school-budgets`

1. Resolve `school_id` from session.  
2. Generate `budget_code` if missing (`BGT-{year}-{seq}`).  
3. Validate income sources; compute `total_expected_income_rwf`.  
4. Insert `school_budgets` with status `draft` (or `pending_approval` if `submit: true`).  
5. Insert rows into `school_budget_income_sources` (`config_json` for calc/deductions).  
6. If submitted → notify manager (portal push) → `/manager/finance/budgets`.  
7. Audit log.

---

## 2. Update budget

`PATCH /accountant/school-budgets/:id`

- Allowed only when status ∈ `{draft, rejected}`.  
- Replace/update income sources; recompute expected total.  
- Ensure allocated ≤ expected.  
- Optional `submit: true` → `pending_approval` + `submitted_at`.

---

## 3. Manager review

`PATCH /accountant/school-budgets/:id/review`

| Decision | DB updates |
|----------|------------|
| approve | `status=approved`, reviewer fields, notes |
| reject | `status=rejected`, notes required |
| revision | `status=draft`, notes |
| cancel | `status=closed`, notes required |

Push notification back to accountant portal.

---

## 4. Create expense line

`POST /accountant/budget-lines`

1. Load parent budget; verify school.  
2. Check remaining unallocated income ≥ planned amount.  
3. Insert `school_budget_lines` with `used_amount_rwf = 0`.  
4. Increment parent `total_allocated_rwf`.  

---

## 5. Freeze line

`PATCH /accountant/budget-lines/:id/freeze`

Manager sets `is_frozen` true/false. Frozen lines reject new usage.

---

## 6. Register usage

`POST /accountant/budget-line-usage`

1. Load line; reject if frozen or remaining &lt; amount.  
2. Insert usage row (payment method, bank/phone, receipt).  
3. `used_amount_rwf += amount`.  
4. Optional large-expense / threshold notifications.  

Action Plan activity expenses can also debit a linked line and insert usage (see Action Plan routes).

---

## 7. Dashboard aggregation

`GET /accountant/school-budgets/dashboard`

Aggregates for selected (or resolved active) budget:

- Expected income, allocated, spent, available, unallocated  
- Charts: income mix, planned vs used, department spend, monthly  

---

## 8. Schema ensure

On boot / first call, `portalOperations.js` ensures tables + alters (`manager_reviewed_*`, payment bank/phone columns, `is_frozen`).

---

## Developer checklist

- [ ] Status transitions only via documented endpoints  
- [ ] Never allow allocate &gt; expected income  
- [ ] Never allow usage &gt; remaining or on frozen lines  
- [ ] Keep FE income net calc aligned with backend total  
- [ ] Document any new PATCH line update if implemented  
