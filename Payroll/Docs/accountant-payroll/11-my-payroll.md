# My Payroll (Staff Self-Service)

**Route:** `/accountant/my-payroll`  
**Component:** `pages/StaffPayroll.jsx` → `shared/pages/StaffPayroll.jsx`  
**API:** `GET /staff/payroll/my`

---

## Purpose

Allows **logged-in staff** (including accountant users) to view their own payslips and payroll history — not an admin page.

---

## Frontend design

### Route & component

| Item | Value |
|---|---|
| Route | `/accountant/my-payroll` |
| Wrapper | `pages/StaffPayroll.jsx` |
| Shared UI | `shared/pages/StaffPayroll.jsx` |
| API client | `accountant_portal/frontend/src/services/api.js` |

### Layout structure

Thin wrapper — all UI in shared component:

```jsx
<SharedStaffPayroll apiClient={api} endpoint="/staff/payroll/my" />
```

- Mobile-friendly payslip list
- Period grouping
- Download / view own payslips
- No admin controls

### Navigation

- Sidebar: **My Payroll** under Payroll group
- Mobile `BottomNav`: **My Payroll** tab

---

## Backend logic

### API endpoint

| Method | Path | Purpose |
|---|---|---|
| GET | `/staff/payroll/my` | Session-scoped payslip history for logged-in user |

**Handler:** `portalOperations.js` — staff payroll read route.

### Business rules

- **No `userId` in URL** — identity from JWT/session (`req.ctx.userId`).
- Staff only sees own records — server filters by authenticated user.
- Same payslip rendering patterns as admin Payslips page.
- Also available in Manager portal: `/manager/my-payroll`.

### Database

Reads from paid payroll run lines linked to `staff_user_id` of current user.

---

## Implementation (summary)

```jsx
<SharedStaffPayroll apiClient={api} endpoint="/staff/payroll/my" />
```

Shared component handles:

- Payslip list by period
- Download / view own payslips
- Mobile-friendly layout

---

## Related

- [09-payslips](./09-payslips.md)
- [14-recommended-features](./14-recommended-features.md)
