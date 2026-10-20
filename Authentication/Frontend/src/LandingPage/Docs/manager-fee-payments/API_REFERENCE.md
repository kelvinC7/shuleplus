# Student Fee Payments — API Reference

**Base:** `{VITE_API_URL}/api`  
**Auth:** Session cookie; roles `ACCOUNTANT`, `SCHOOL_ADMIN`, `SCHOOL_MANAGER`

---

## GET `/manager/finance/payments/report`

Primary endpoint for the Manager Student Fee Payment page.

### Query parameters

| Param | Required | Description |
|-------|----------|-------------|
| `academic_year` | Yes* | e.g. `2025-2026` (*resolved from school settings if omitted) |
| `term` | Yes* | e.g. `Term 1` |
| `class_name` | No | Exact class filter |
| `status` | No | `full_pay` \| `not_paid` \| `remain_pay` \| `no_fee_card` |

Aliases: `year` → academic year; `class` → class_name.

### Success response

```json
{
  "success": true,
  "data": {
    "filters": {
      "academic_year": "2025-2026",
      "term": "Term 1",
      "class_name": null
    },
    "status_filter": null,
    "class_names": ["P1", "P2", "S1 A"],
    "summary": {
      "total_students": 120,
      "full_pay": 40,
      "not_paid": 30,
      "remain_pay": 45,
      "no_fee_card": 5
    },
    "rows": [
      {
        "student_id": 12,
        "student_uid": "STU-001",
        "student_code": "C001",
        "first_name": "Jean",
        "last_name": "Uwimana",
        "class_name": "P5",
        "guardian_name": "…",
        "parent_phone": "…",
        "total_due": 85000,
        "total_paid": 40000,
        "remaining": 45000,
        "status": "remain_pay"
      }
    ]
  }
}
```

### Errors

| Code | When |
|------|------|
| 400 | School missing from session |
| 403 | Role not allowed |
| 500 | Report build failure |

---

## Related accountant endpoints (same engine)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/accountant/reports/payments/export.xlsx` | Accountant-only Excel |
| GET | `/accountant/reports/payments/export.pdf` | Accountant-only PDF |

Manager page currently exports **client-side** CSV/XLSX from the loaded rows (does not call these export routes).

---

## Shared engine

`buildAccountantPaymentReport(schoolId, academicYear, term, classFilter, statusFilter, options)`

Defined in `accountantFees.js`.
