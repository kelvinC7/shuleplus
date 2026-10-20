# 02 — Hero & Stats

## Features

| Feature | Description |
|---------|-------------|
| **Hero banner** | Amber `#c87800` full-width header |
| **Eyebrow** | “Financial Repository” |
| **Title** | “Student Fee Registry” |
| **Subtitle** | Oversight & collection intelligence tagline |
| **Active Students** | Count of rows after filters + search |
| **Revenue Collected** | Sum of `paid` (RWF) |
| **Outstanding Balance** | Sum of `balance` / remaining |
| **Collection Rate** | `paid / totalDue` as percentage |
| **Export CSV / Excel** | Desktop action column (see Exports) |
| **Notify Arrears** | UI button — **not wired** yet |

---

## Frontend design

| Item | Detail |
|------|--------|
| **Component** | Top of `FeePayments` |
| **Stats grid** | 4 KPI cells + right-rail actions (`lg+`) |
| **Recalc** | Stats recompute from `filteredStudents` whenever filters/search change |

### Visual design

- Hero: gold/amber with decorative rings  
- KPIs: navy numbers, muted uppercase labels, gold icons  
- Hover: subtle gold tint on values  

---

## Backend logic

Stats are **client-derived** from the report rows (not a separate stats API). Server `summary` (full_pay counts, etc.) is available in the response but not currently rendered as dedicated KPI cards.
