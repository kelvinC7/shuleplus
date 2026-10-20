# Student Fee Payments — Documentation Standards

Every chapter in `docs/manager-fee-payments/` should include:

## 1. Frontend design

| Subsection | Include |
|------------|---------|
| **Route & component** | Path, `FeePayments.jsx`, child components |
| **Layout** | Hero, stats grid, filters, table, drawer |
| **Visual design** | Amber hero `#c87800`, navy text, gold accents, white cards |
| **State** | `useState` keys, AcademicContext seeds |
| **User actions** | Buttons, selects, row click |
| **Client libs** | `api`, `xlsx`, AcademicContext |

## 2. Backend logic

| Subsection | Include |
|------------|---------|
| **API endpoints** | Method + path |
| **Auth** | `FINANCE_REPORT_READ_ROLES` |
| **Tables** | `students`, `accountant_babyeyi_fees`, `school_fee_collections`, `babyeyi_payment_intents` |
| **Business rules** | Status derivation, filters |
| **Shared engine** | `buildAccountantPaymentReport()` |

## Document index

| Doc | Topic |
|-----|-------|
| [features/01](./features/01-getting-started.md) | Access |
| [features/02](./features/02-hero-and-stats.md) | Stats |
| [features/03](./features/03-filters-and-search.md) | Filters |
| [features/04](./features/04-fee-registry-table.md) | Table |
| [features/05](./features/05-exports.md) | Export |
| [features/06](./features/06-student-detail-drawer.md) | Drawer |
| [features/07](./features/07-row-actions-and-placeholders.md) | Actions |
| [features/08](./features/08-frontend-backend-flow.md) | Flow |
