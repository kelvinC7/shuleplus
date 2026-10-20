# Assets Portal — Calculation Engine

Map of every major financial function used by the register.

**Keep FE and BE in sync.** Changing one without the other causes table ≠ form ≠ PDF/report drift.

---

## Primary files

| Layer | File |
|-------|------|
| Frontend | `assets_portal/utils/assetRegisterMath.js` |
| Backend | `BabyeyiRoutes/schoolAssets.js` (mirrored functions) |
| Legacy wizard only | `assets_portal/utils/assetsCalculations.js` |

---

## Function map

### Core math

| Function | Role |
|----------|------|
| `computeAssetRegisterMath(input)` | Standard / Land / routes into Buildings |
| `computeBuildingRegisterMath(input)` | Finished + WIP Cases |
| `resolveRegisterDepreciableBase(...)` | Base for AD: `(TB−TD)` or Buildings special |
| `resolveBuildingAnnualDepreciableBase(...)` | WIP / Finished annual base |
| `resolveBuildingNetBookValue(...)` | WIP NBV rules |
| `isBuildingsCategory` / `isLandCategory` | Category gates (`assetsConstants.js`) |

### Chain helpers (FE display)

| Function | Role |
|----------|------|
| `enrichRegisterChainFinancials(rows)` | Walk full list; fix O/TD/AD for display |
| `enrichRegisterFinancials(row, ctx)` | Single-row enrich |
| `getEnrichedRegisterRow(...)` | Convenience getter |
| `rollCategoryStateAfterAsset(...)` | Advance chain state after one row |
| `resolveCategoryYearStartState(...)` | Year-start O + TD |
| `computeYearStartAnnualDep(...)` | Preview AD for Year Setup |

### Backend orchestration

| Function | Role |
|----------|------|
| `applyDepreciationMath(payload)` | Fill AD/TDep/NBV before INSERT/UPDATE |
| `resolveCategoryOpeningContext` | Opening API payload |
| `resolveYearStartOpening` | Prior year / Year Setup |
| `recalcRegisterChainInCategory` | Persist chain |
| `registerAssetWithLedger` | Single create |
| `registerAssetsBulkWithLedger` | Qty batch |
| `repairCorruptedCategoryYearStart` | Heal bad TD/opening |

---

## Standard formula (non-Buildings, non-Land)

```
TB  = O + PP
AD  = round((TB − TD) × R / 100)
TDep = TD + AD
NBV  = TB − TDep
```

TD is **fixed** for the whole category year.

---

## Buildings Finished

```
base = (PP − TD) if > 0 else (TB − TD)
AD   = round(base × R / 100)
TDep = TD + AD
NBV  = TB − TDep
```

---

## Buildings WIP (summary)

| Case | Annual base | NBV idea |
|------|-------------|----------|
| Year-carry | Prior year NBV | Prior NBV − AD |
| Case 1 (first WIP in year) | max(0, PP−TD) or (O−TD) | Special WIP NBV |
| Case 2 (later WIP same year) | max(0, PP − priorProgressPP − TD) | Subtract progress PPs |

**Case 2 PP does not cross years.**

---

## Land

```
R = 0
AD = TDep = 0
NBV = TB = O + PP
```

---

## VAT

18% stored as informational (`tax_amount`, `price_incl_tax`).  
**TB uses purchase price only** (ex-VAT for register chain).

---

## Seeded category rates

| Category | Rate |
|----------|------|
| IT Equipment | 25% |
| Electronics | 25% |
| Office Equipment | 20% |
| Vehicles | 20% |
| Machinery / Lab | 15% |
| Furniture | 10% |
| Buildings | 5% |
| Land | 0% |

If category name fails lookup, backend may fall back to **5%** — treat as a bug risk for Furniture/Vehicles.

---

## UI vs DB

| Situation | Source of truth |
|-----------|-----------------|
| Edit form live preview | FE `computeAssetRegisterMath` |
| Register table columns | Prefer `enrichRegisterChainFinancials` then DB |
| After Recalculate | DB persisted values |
| Reports | DB (after recalc) |

Pagination note: enriching **only the current page** breaks chain continuity for long categories — prefer full-category enrich or trust recalculated DB.
