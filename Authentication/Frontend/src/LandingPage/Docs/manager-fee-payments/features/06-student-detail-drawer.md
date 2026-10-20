# 06 — Student Detail Drawer

Opened by clicking a registry row (`StudentModal`).

## Features (wired to row data)

| Feature | Description |
|---------|-------------|
| **Header** | Student initial, name, Ledger ID |
| **Financial status alert** | Fully Settled vs Outstanding Liability |
| **Total Paid** | From row `paid` |
| **Balance Due** | From row `balance` |
| **Expected Total** | From row `totalBill` |
| **Payment Status** | Status label from row |
| **Close** | Backdrop click or X |

## Features (UI present — incomplete / placeholder)

| Feature | Notes |
|---------|-------|
| Current Term line | Hardcoded sample text in UI |
| Guardian | Placeholder “Parent Name” (API has `guardian_name` unused) |
| Transaction Audit Trail | Sample Payment / Invoice / Reminder cards |
| **Record New Payment** | Button — not wired |
| **Statement** | Button — not wired |
| **Reminder** | Button — not wired |

---

## Frontend design

| Item | Detail |
|------|--------|
| **Component** | `StudentModal` via `createPortal(..., document.body)` |
| **Layout** | Right drawer `md:w-[420px]`, blur backdrop |
| **Visual** | Navy/gold tokens, rounded cards, uppercase micro-labels |

---

## Backend logic

Drawer does not call a separate API today. Enrichment should use report fields (`guardian_name`, `parent_phone`) or a collections history endpoint when recording payments is implemented.
