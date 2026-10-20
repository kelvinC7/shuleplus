# 01 — Getting Started (Student Fee Payments)

## Access

1. Log in as **School Admin**, **School Manager**, or **Accountant**.  
2. Sidebar → **Finance center** → **Student Fee Payment**.  
3. Opens `/manager/finance/payments`.

Also linked from Manager Dashboard quick actions (**Collect fees**).

---

## Frontend design

| Item | Detail |
|------|--------|
| **Route** | `/manager/finance/payments` |
| **Component** | `manager/pages/FeePayments.jsx` |
| **Layout** | Amber hero → white dashboard card (stats, filters, table) |
| **Context** | `AcademicContext` seeds current term + academic year |

### First load

1. Wait until `academic.loading` is false.  
2. Set `selectedTerm` / `selectedYear` from context if empty.  
3. Fetch report when both term and year are set.

---

## Backend logic

| Item | Detail |
|------|--------|
| **Endpoint** | `GET /api/manager/finance/payments/report` |
| **Auth** | `FINANCE_REPORT_READ_ROLES` |
| **School scope** | `resolveSchoolId(req)` from session |

---

## Prerequisites for useful data

- Students registered for the school  
- Babyeyi fee cards published into `accountant_babyeyi_fees` for the selected year/term  
- Optional: fee collections / paid online invoices for accurate “Paid” columns  
