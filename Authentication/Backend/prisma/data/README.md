# Rwanda administrative locations

Babyeyi stores Rwanda locations in PostgreSQL (`provinces`, `districts`, `sectors`, `cells`, `villages`).

## Full dataset (included)

File: `rwanda-locations.json` (~14,837 villages)

Source: [jnkindi/rwanda-locations-json](https://github.com/jnkindi/rwanda-locations-json) (open dataset)

Coverage after import:

| Level | Count |
|-------|------:|
| Provinces | 5 |
| Districts | 30 |
| Sectors | ~416 |
| Cells | ~2,148 |
| Villages | ~14,837 |

District codes `01`–`30` are mapped to Babyeyi organization codes (e.g. `010001`).

## Import commands

From the project root:

```bash
cd Backend
npm run prisma:import-locations   # full re-import
npm run prisma:seed               # root admin + auto-import if JSON exists
```

**What each command does:**

| Command | Description |
|---------|-------------|
| `npm run prisma:import-locations` | Full re-import from `rwanda-locations.json` (clears sectors, cells, villages and reloads all ~14,842 villages) |
| `npm run prisma:seed` | Seeds root admin; if `rwanda-locations.json` exists, runs full location import automatically |

**Note:** Import clears organization location FKs (`provinceId`, `districtId`, etc.) on existing orgs before replacing hierarchy data. Run on fresh DB or when safe.

## Re-download JSON

```bash
curl -L -o prisma/data/rwanda-locations.json ^
  https://raw.githubusercontent.com/jnkindi/rwanda-locations-json/master/locations.json
```

## Location API (Super Admin)

```
GET /super-admin/locations/provinces
GET /super-admin/locations/provinces/:provinceId/districts
GET /super-admin/locations/districts/:districtId/sectors
GET /super-admin/locations/sectors/:sectorId/cells
GET /super-admin/locations/cells/:cellId/villages
GET /super-admin/locations/districts/:districtId/preview-code
```
