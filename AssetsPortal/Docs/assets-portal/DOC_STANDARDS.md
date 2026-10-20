# Assets Portal — Documentation Standards

Every feature chapter in `docs/assets-portal/` should include:

## 1. Frontend design

| Subsection | Include |
|------------|---------|
| Route & component | Path, main page/modal |
| Layout | Tables, wizards, drawers |
| State | Key React state / context |
| User actions | Buttons and outcomes |
| Client utils | Math, Excel, QR helpers |

## 2. Backend logic

| Subsection | Include |
|------------|---------|
| API endpoints | Method + path |
| Auth / roles | Read vs write |
| Tables | MySQL tables touched |
| Business rules | Status, formulas, locks |
| Side effects | Chain recalc, balance updates |

## Document index

| Doc | Topic |
|-----|-------|
| features/01–11 | Product features (from portal Docs) |
| features/12 | Backend register engine (user-facing summary) |
| features/13 | Known bugs & fixes |
| BACKEND_LOGIC | Deep server guide |
| CALCULATION_ENGINE | Function map |
| BUSINESS_RULES | Formulas |
| API_REFERENCE | REST catalog |
