# School Budget — Business Rules

## Budget statuses

| Status | Meaning | Accountant can edit? |
|--------|---------|----------------------|
| `draft` | Being prepared | Yes |
| `pending_approval` | Submitted to manager | No (header) |
| `approved` | Active for allocation/usage | Lines/usage yes; header locked |
| `rejected` | Returned with notes | Yes (resubmit) |
| `closed` | Cancelled / closed | No |

## Approval decisions (Manager)

| Action | Result status | Notes |
|--------|---------------|-------|
| Approve | `approved` | Optional notes |
| Reject | `rejected` | Notes **required** |
| Request revision | `draft` | Notes recommended |
| Cancel | `closed` | Notes **required** |

## Budget code

Format: `BGT-{year}-{seq}` e.g. `BGT-2026-001` (unique per school).

## Budget types

Term Budget · Annual Budget · Department Budget · Project Budget · Emergency Budget · Supplementary Budget

## Terms

Term 1 · Term 2 · Term 3 · Full Academic Year (+ school `active_terms_json` if set)

## Income rules

1. Each income source has expected amount (fixed or per-student × qty).  
2. Deductions (orphans, waivers, etc.) reduce gross → **net expected**.  
3. `total_expected_income_rwf` = sum of net sources.  
4. Tuition Fees can auto-fill from Babyeyi fee-card analysis.

## Allocation rules

1. Expense lines have `planned_amount_rwf`.  
2. Sum of planned amounts → `total_allocated_rwf`.  
3. **Cannot allocate more than remaining expected income** (`expected − allocated`).  
4. Planned amount must be > 0.

## Usage rules

1. Usage posts to `school_budget_line_usage` and increases `used_amount_rwf`.  
2. Cannot spend more than **remaining** on the line (`planned − used`).  
3. Frozen lines (`is_frozen`) cannot receive new usage.  
4. Usage severity:
   - Active &lt; 80%  
   - Warning ≥ 80%  
   - Critical ≥ 90%  
   - Exhausted ≥ 100%  
5. Large expense notify threshold: env `BUDGET_LARGE_EXPENSE_RWF` (default **5,000,000** RWF).

## Active budget resolution

If no `budget_id` selected: prefer latest **approved**, else latest **pending_approval**.

## Balance sheet page

Illustrative A = L + E derived from budget totals via `deriveBudgetFinancials.js` — **not** a full general ledger.
