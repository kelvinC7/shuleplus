# 04 — Fee Registry Table

## Features

| Feature | Description |
|---------|-------------|
| **Student Info** | Avatar initial, full name, student ID (mono) |
| **Paid indicator** | Green/orange dot on avatar (settled vs outstanding) |
| **Class Registry** | Class name (+ stream placeholder) |
| **Revenue (Expected)** | Total due + “Paid: …” line |
| **Status chip** | Fully Settled **or** Bal: remaining amount |
| **Row click** | Opens student detail drawer |
| **Loading state** | “Syncing Distributed Ledger…” |
| **Error banner** | API failure message above table |
| **Footer meta** | Record count · term · year |
| **Pagination chrome** | Prev / Page 01 / Next — **visual only** (no paging API) |

### Columns

| Column | Desktop | Mobile |
|--------|---------|--------|
| Student Info | ✓ | ✓ |
| Class Registry | ✓ | hidden |
| Revenue (Expected) | ✓ | hidden |
| Status | ✓ | hidden |
| Actions | ✓ | ✓ |

---

## Frontend design

| Item | Detail |
|------|--------|
| **Mapping** | API row → `{ id, dbId, name, grade, totalBill, paid, balance, status }` |
| **Status labels** | Fully Paid / Partial / Not Paid / No Fee Card |
| **Interaction** | Entire row clickable → `setSelectedStudent(s)` |

---

## Backend logic

Each row is produced by `buildAccountantPaymentReport` (see [BUSINESS_RULES](../BUSINESS_RULES.md)).
