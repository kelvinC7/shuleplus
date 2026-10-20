# Assets Portal

Modern ShulePlus Assets Portal — KPS-style register, year setup, depreciation, operations, reports, and QR scan.

Matches the **HR module** UI shell (sidebar, page header, toasts, tables) and implements the logic documented in [`Docs/assets-portal`](./Docs/assets-portal).

## Ports

| Layer | URL |
|-------|-----|
| Backend API | http://localhost:3020/api |
| Frontend | http://localhost:3021 |

## Quick start

```bash
# Backend
cd AssetsPortal/Backend
cp .env.example .env   # DB: assets_portal_module_db
npm install
npx prisma generate
npx prisma db push
npm run dev            # http://localhost:3020/api/health

# Frontend (new terminal)
cd AssetsPortal/Frontend
npm install
npm run dev            # http://localhost:3021
```

## IAM module seed

```bash
cd Authentication/Backend
npm run seed:assets-portal
```

Module slug: `assets-portal`  
Open from Organization Admin, or visit `http://localhost:3021/dashboard?token=…`

## Core workflow

1. **Categories** — seeded rates (Land 0%, Buildings 5%, …)
2. **Year Setup** — create financial year + category openings
3. **Asset Register** — add / import assets; recalculate chain
4. **Operations** — assignments, returns, transfers, maintenance, replacements
5. **Reports / Analytics / QR Scan**

## API highlights

- `GET/POST /api/register` — ledger source of truth
- `GET /api/register/opening` — opening context for Add Asset
- `POST /api/register/recalc-chain` — persist category-year chain
- `GET /api/reports/:type` — overview, all-assets, depreciation, …
- `GET /api/public/assets/scan` — public QR lookup
- Alias: `/api/school/assets/*` (docs-compatible)

## Docs

See [`Docs/assets-portal/README.md`](./Docs/assets-portal/README.md) for full feature manuals, business rules, and calculation engine.
