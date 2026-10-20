# 07 — Row Actions & Placeholders

## Features

| Control | Location | Status |
|---------|----------|--------|
| **Mail icon** | Row actions | UI only (no `onClick` send) |
| **More menu** | Row actions | Opens dropdown |
| **View Details** | Dropdown | UI only (row click already opens drawer) |
| **Record Payment** | Dropdown | UI only |
| **Statement** | Dropdown | UI only |
| **Bulk Payment** | Filter bar | UI only |
| **Notify Arrears** | Stats rail | UI only |
| **Pagination Prev/Next** | Table footer | UI only |

---

## Frontend design

Dropdown closes via full-screen click catcher. Positions above the row when near the bottom of the list (`isLastItems`).

---

## Backend logic

No payment-write endpoints are called from this page yet. Recording payments should target the school fee collections APIs used by the Accountant portal, then refetch `/manager/finance/payments/report`.

---

## Recommended next implementations

1. Wire **View Details** → `setSelectedStudent(s)` (same as row click).  
2. Wire **Record Payment** → modal + POST collection.  
3. Wire **Notify Arrears** → bulk email/SMS for `not_paid` / `remain_pay`.  
4. Wire **Statement** → print/PDF of student ledger.  
5. Real pagination if school size exceeds one page comfortably.  
