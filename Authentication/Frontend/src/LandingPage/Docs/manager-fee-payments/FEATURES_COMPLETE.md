# Student Fee Payments — Complete Feature Manual

> **Module:** Manager Portal — Finance Center  
> **Route:** `/manager/finance/payments`  
> **Nav label:** Student Fee Payment  
> **Component:** `FeePayments.jsx`  
> **Last updated:** July 2026

---

## Table of contents

1. [Overview](#1-overview)
2. [Access & navigation](#2-access--navigation)
3. [All features catalog](#3-all-features-catalog)
4. [Hero & KPI stats](#4-hero--kpi-stats)
5. [Filters & search](#5-filters--search)
6. [Fee registry table](#6-fee-registry-table)
7. [Exports](#7-exports)
8. [Student detail drawer](#8-student-detail-drawer)
9. [Placeholders (not wired)](#9-placeholders-not-wired)
10. [Business rules](#10-business-rules)
11. [API](#11-api)
12. [File reference](#12-file-reference)

---

## 1. Overview

The **Student Fee Registry** is the Manager finance page for monitoring school fee collection per student for a chosen academic year and term.

It combines:

- **Expected fees** from Babyeyi fee cards (`accountant_babyeyi_fees`)  
- **Payments** from school collections + optional online Babyeyi invoices  
- **Status** Fully Paid / Partial / Not Paid / No Fee Card  

---

## 2. Access & navigation

| Path | How |
|------|-----|
| Sidebar | Finance center → Student Fee Payment |
| URL | `/manager/finance/payments` |
| Dashboard | Collect fees quick action |
| Roles | SCHOOL_ADMIN, SCHOOL_MANAGER, ACCOUNTANT |

---

## 3. All features catalog

| # | Feature | Working? |
|---|---------|----------|
| 1 | Amber hero “Student Fee Registry” | ✅ |
| 2 | KPI: Active Students | ✅ |
| 3 | KPI: Revenue Collected | ✅ |
| 4 | KPI: Outstanding Balance | ✅ |
| 5 | KPI: Collection Rate % | ✅ |
| 6 | Export CSV | ✅ |
| 7 | Export Excel (xlsx) | ✅ |
| 8 | Search by name / student ID | ✅ |
| 9 | Filter by class (chip bar) | ✅ |
| 10 | Filter by payment status | ✅ |
| 11 | Filter by term | ✅ |
| 12 | Filter by academic year | ✅ |
| 13 | AcademicContext default term/year | ✅ |
| 14 | Registry table (due, paid, balance, status) | ✅ |
| 15 | Settled / outstanding status chips | ✅ |
| 16 | Row click → detail drawer | ✅ |
| 17 | Loading & error states | ✅ |
| 18 | Footer record count · term · year | ✅ |
| 19 | Notify Arrears | ❌ UI only |
| 20 | Bulk Payment | ❌ UI only |
| 21 | Row Mail button | ❌ UI only |
| 22 | Menu: View Details / Record Payment / Statement | ❌ mostly UI only |
| 23 | Drawer: Record Payment / Statement / Reminder | ❌ UI only |
| 24 | Drawer sample audit trail | ❌ placeholder content |
| 25 | Pagination Prev/Next | ❌ visual only |

---

## 4. Hero & KPI stats

- Hero color: `#c87800` with gold accent line  
- Title: **Student Fee Registry**  
- Four KPIs recalculate from the **visible** (filtered + searched) student list  

| KPI | Formula |
|-----|---------|
| Active Students | `filteredStudents.length` |
| Revenue Collected | Σ `paid` |
| Outstanding Balance | Σ `balance` |
| Collection Rate | `paid / totalBill` × 100% |

---

## 5. Filters & search

| Control | Scope |
|---------|-------|
| Search | Client — name or ID |
| Class chips | Server — `class_name` |
| Status | Server — `full_pay` / `not_paid` / `remain_pay` |
| Term / Year | Server — academic window |

Term/year default from `AcademicContext` when the page loads.

---

## 6. Fee registry table

| Column | Content |
|--------|---------|
| Student Info | Name + student ID + paid/unpaid dot |
| Class Registry | Class name |
| Revenue (Expected) | Total due + Paid amount |
| Status | Fully Settled **or** Bal: remaining |
| Actions | Mail + ⋮ menu |

Clicking a row opens the right-hand **StudentModal** drawer.

---

## 7. Exports

Client-side downloads of the current filtered list:

- **CSV** — `exportLedgerCsv()`  
- **Excel** — `exportLedgerXlsx()` using `xlsx`  

Columns: Student ID, Name, Class, Expected, Paid, Remaining, Status, Term, Year.

---

## 8. Student detail drawer

**Shows from live row data:** name, ledger ID, total paid, balance due, expected total, status, class.

**Present but placeholder:** guardian, hardcoded term sample, fake transaction audit entries, Record Payment / Statement / Reminder buttons (not connected).

---

## 9. Placeholders (not wired)

Documented so developers do not assume production behavior:

- Notify Arrears  
- Bulk Payment  
- Mail / Reminder / Statement / Record Payment  
- Pagination controls  

See [features/07-row-actions-and-placeholders.md](./features/07-row-actions-and-placeholders.md).

---

## 10. Business rules

| Concept | Rule |
|---------|------|
| Due | Sum matching Babyeyi fee cards for class + year + term |
| Paid | Collections (+ paid online intents) for student in that window |
| Remaining | `max(0, due − paid)` |
| `no_fee_card` | No matching fee card |
| `not_paid` | Due > 0 and paid ≈ 0 |
| `remain_pay` | 0 < paid < due |
| `full_pay` | paid ≥ due |

Full detail: [BUSINESS_RULES.md](./BUSINESS_RULES.md).

---

## 11. API

```
GET /api/manager/finance/payments/report
  ?academic_year=2025-2026
  &term=Term%201
  &class_name=P5        (optional)
  &status=remain_pay    (optional)
```

Returns `rows`, `class_names`, `summary`, `filters`.  
Full shape: [API_REFERENCE.md](./API_REFERENCE.md).

---

## 12. File reference

| Layer | File |
|-------|------|
| Page UI | `manager/pages/FeePayments.jsx` |
| Route | `manager/PortalRoutes.jsx` → `finance/payments` |
| Nav | `manager/components/Sidebar.jsx` |
| Academic seeds | `manager/context/AcademicContext.jsx` |
| API client | `manager/services/api.js` |
| Report builder | `BabyeyiRoutes/accountantFees.js` → `buildAccountantPaymentReport` |
| Endpoint | `GET /manager/finance/payments/report` |

---

## Export to Word

```powershell
cd babyeyipro/docs/manager-fee-payments
pandoc FEATURES_COMPLETE.md -o Student-Fee-Payments-Manual.docx --toc --toc-depth=3
```

---

*Manager Portal — Student Fee Payment — Complete Feature Manual*
