# Student Fee Payments — Business Rules

## Expected total (due)

For each student, **total due** comes from matching rows in `accountant_babyeyi_fees` for:

- Same school  
- Student’s `class_name` (and multi-class `classes_json` when applicable)  
- Selected **academic year** and **term**

If no matching fee card → status `no_fee_card`, `total_due = null`.

## Paid amount

Paid is the sum of:

1. **`school_fee_collections`** for that student where term + academic year match filters  
2. Optionally **`babyeyi_payment_intents`** with `invoice_status = PAID` (online Babyeyi invoices), split across selected students in the intent payload when applicable  

Manager report includes online invoices by default (`includeOnlineInvoicePayments !== false`).

## Remaining balance

```
remaining = max(0, total_due - total_paid)
```

When `total_due` is null → remaining is null.

## Status derivation

| Condition | Status |
|-----------|--------|
| No fee card for class/term/year | `no_fee_card` |
| `total_due ≈ 0` | `full` (treated as settled) |
| `total_paid ≈ 0` | `not_paid` |
| `total_paid >= total_due` | `full_pay` |
| Else | `remain_pay` |

Epsilon tolerance: `0.005` RWF.

## Filter rules

| Filter | Applied where |
|--------|----------------|
| Academic year / term | Server (`resolveAcademicContext`) |
| Class name | Server (student filter) |
| Status | Server (`normalizeReportStatusFilter`) |
| Search (name / student ID) | **Client only** after fetch |

## Collection rate (UI)

```
collectionRate = round(totalPaid / totalDue * 1000) / 10  %
```

Computed from **currently displayed** (filtered + searched) rows.

## Roles

`FINANCE_REPORT_READ_ROLES` = `ACCOUNTANT` | `SCHOOL_ADMIN` | `SCHOOL_MANAGER`
