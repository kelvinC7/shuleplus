# Student Fee Payments — Documentation Hub

> **Portal path:** `/manager/finance/payments`  
> **Sidebar:** Finance center → **Student Fee Payment**  
> **Code (frontend):** `babyeyipro/Frontend/web/src/manager/pages/FeePayments.jsx`  
> **Code (backend):** `BabyeyiSystem/backend/BabyeyiRoutes/accountantFees.js`  
> **API:** `GET /api/manager/finance/payments/report`

The **Student Fee Registry** page gives school managers a term/year view of every learner’s expected fees (from Babyeyi fee cards), amounts paid (collections + online invoices), remaining balance, and payment status — with filters, live stats, exports, and a student detail drawer.

---

## Quick start (developers)

```bash
# Backend
cd BabyeyiSystem/backend && npm run dev   # :5100

# Frontend
cd babyeyipro/Frontend/web && npm run dev
# Open: http://localhost:5174/manager/finance/payments
```

**Roles:** `SCHOOL_ADMIN`, `SCHOOL_MANAGER`, `ACCOUNTANT` (`FINANCE_REPORT_READ_ROLES`).

---

## Documentation index

| Document | Description |
|----------|-------------|
| [**FEATURES_INDEX.md**](./FEATURES_INDEX.md) | Chapter hub + learning path |
| [**FEATURES_COMPLETE.md**](./FEATURES_COMPLETE.md) | All features in one manual |
| [**features/**](./features/) | Step-by-step feature guides |
| [**00-architecture.md**](./00-architecture.md) | Data flow and file map |
| [**DEVELOPER_GUIDE.md**](./DEVELOPER_GUIDE.md) | Extending the page |
| [**API_REFERENCE.md**](./API_REFERENCE.md) | Endpoints and response shapes |
| [**BUSINESS_RULES.md**](./BUSINESS_RULES.md) | Status, due, paid, remaining |
| [**DOC_STANDARDS.md**](./DOC_STANDARDS.md) | How to extend these docs |

---

## Feature map (at a glance)

| Area | Features |
|------|----------|
| **Hero** | Amber financial repository banner + title |
| **Stats** | Active students, revenue collected, outstanding, collection rate |
| **Exports** | CSV + Excel ledger download |
| **Filters** | Search, class chips, status, term, academic year |
| **Table** | Student registry with due / paid / balance / status |
| **Row actions** | Mail, View details, Record payment, Statement (menu) |
| **Drawer** | Student ledger detail, paid vs balance, audit trail UI, actions |
| **Footer** | Record count, term/year, pagination chrome |

---

## Related modules

| Module | Relationship |
|--------|----------------|
| Babyeyi Wizard | Creates fee document → feeds `accountant_babyeyi_fees` totals |
| Accountant Fees | Same `buildAccountantPaymentReport` engine |
| School fee collections | `school_fee_collections` → paid amounts |
| Online invoices | `babyeyi_payment_intents` (PAID) optionally counted |

---

*Manager Portal — Student Fee Payment*
