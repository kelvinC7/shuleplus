# 03 — Payments & NESA (Step 2)

Step 2 defines tuition and fee payment line items and runs the **NESA Tuition Smart Checker** when applicable.

---

## Features

| Feature | Description |
|---------|-------------|
| **Payment line items** | Dynamic rows: name, amount (RWF), pay channel |
| **Pay channel selector** | "Other requirements" vs "Paid to School Account" |
| **Grand total** | Live sum of all payment amounts |
| **NESA Smart Checker** | Compares total against national fee limit |
| **Limit progress bar** | Visual indicator of fee vs limit |
| **Over-limit detection** | Highlights excess amount in red |
| **Request Increase Approval** | Toggle + modal for above-limit fees |
| **Increase request form** | Title, description, parent approval doc, school budget doc |
| **Private school bypass** | No NESA checker for private schools or private cohort |

---

## Frontend design

| Item | Detail |
|------|--------|
| **Component** | `Babyeyi.jsx` → `renderStep()` case 2 |
| **Validation** | `validateStep2()` — called on Next and Submit |

### Payment row shape

```js
{ name: "", amount: "", pay_channel: "babyeyi" | "school" }
```

### NESA Smart Checker UI

Displayed when `nesaApplies === true`:

| Panel | Content |
|-------|---------|
| Header | "Tuition Smart Checker" with shield icon |
| Metrics | Your Total / NESA Limit / Over or Under By |
| Progress bar | Percentage of limit used |
| Status badge | "Within Limit" or "+RWF X over limit" |

### Increase request modal

Triggered when fee exceeds limit and toggle is ON. Required fields:
- Request title (`requestTitle`)
- Description (`requestDescription`)
- Parent approval document (`parentApprovalDoc`)
- School budget document (`schoolBudgetDoc`)

### Key state

| Field | Description |
|-------|-------------|
| `payments` | Array of payment rows |
| `requestIncrease` | Boolean toggle |
| `requestTitle`, `requestDescription` | Increase justification |
| `parentApprovalDoc`, `schoolBudgetDoc` | File uploads |
| `nesaLimit` | Fetched limit (RWF) |
| `nesaLimitSource` | `"api"`, `"default"`, or `"none"` |

---

## Backend logic

| Endpoint | Purpose |
|----------|---------|
| `GET /babyeyi/nesa-limit` | Primary limit lookup |
| `GET /api/fee-limits` | Fallback limit source |

### FormData fields

```
payments          → JSON [{ name, amount, pay_channel }]
request_increase  → "true" | "false"
increase_reason   → request title
increase_desc     → description
parent_rep_doc    → File (if increase)
budget_doc        → File (if increase)
request_reasons   → JSON array
request_other_reason → string
```

### Validation rules

| Rule | Error |
|------|-------|
| No payment rows with name + amount | "At least one payment item required" |
| Over limit, increase OFF | Block submit + show modal |
| Over limit, increase ON, missing title | "Request title is required" |
| Over limit, increase ON, missing docs | Parent/budget doc required |

### Approval impact

When fee exceeds NESA limit with increase request:
- Document enters `pending` status
- PDF and WhatsApp locked until DEO + NESA approve
- See [BUSINESS_RULES.md](../BUSINESS_RULES.md)
