# Student Fee Payments — Developer Guide

## Canonical file

`babyeyipro/Frontend/web/src/manager/pages/FeePayments.jsx`

- Default export: page shell  
- `StudentModal`: right-side detail drawer  

Route: `PortalRoutes.jsx` → `path="finance/payments"`.

## Adding a new filter

1. Add state + control in the Controls bar.  
2. Pass param into `api.get('/manager/finance/payments/report', { params })`.  
3. Extend `buildAccountantPaymentReport` if the filter must run server-side.  
4. Prefer server filters for class/status/term/year; keep search client-side unless lists grow large.

## Wiring a real “Record Payment” action

Today the drawer / row menu buttons are **UI placeholders**. To implement:

1. Open a payment form (amount, method, term, year).  
2. `POST` to the accountant collections API that writes `school_fee_collections`.  
3. Refetch the report with current filters.  
4. Keep AcademicContext term/year aligned with the collection.

## Extending the drawer

`StudentModal` currently shows:

- Real: name, id, paid, balance, totalBill, status, grade  
- Placeholder / static: guardian name, sample audit trail dates, hardcoded “Term 1, 2025”

Replace placeholders with fields already returned by the report (`guardian_name`, `parent_phone`) or a follow-up `GET` for collections history.

## Pitfalls

| Pitfall | Fix |
|---------|-----|
| Empty table | Ensure Babyeyi fee cards exist in `accountant_babyeyi_fees` for year/term |
| Wrong paid totals | Check both collections and online intents |
| Term not selected | Wait for AcademicContext before fetch |
| Bulk Payment / Notify Arrears do nothing | Not wired yet — see placeholders chapter |

## Testing checklist

- [ ] Load page as SCHOOL_MANAGER with Pro school  
- [ ] Switch term / year → table refreshes  
- [ ] Filter class + status  
- [ ] Search by name and student ID  
- [ ] Export CSV and Excel open with expected columns  
- [ ] Click row → drawer opens with paid/balance  
- [ ] Student with no fee card shows “No Fee Card”  
