# Assets Portal — Backend Logic (Deep Dive)

Guide for developers working in `BabyeyiSystem/backend/BabyeyiRoutes/schoolAssets.js`.

This document explains **how the server creates, rolls, and recalculates** the KPS asset register — including bulk quantity and year category balances.

---

## 1. Entry points

| Function | Called by | Purpose |
|----------|-----------|---------|
| `registerAssetWithLedger` | POST `/test`, single create | One register row + year balance update |
| `registerAssetsBulkWithLedger` | POST `/test` with `quantity` > 1 | N rows with rolling opening |
| `recalcRegisterChainInCategory` | After create/import/recalc API | Rewrite openings/deps for category+year |
| `recalcFinancialYearTotals` | After chain/balance changes | Sum FY totals from category balances |
| `resolveCategoryOpeningContext` | GET `/test/opening` | Opening + TD + rates for Add form |
| `applyDepreciationMath` | Inside register path | Fill AD / TDep / NBV |
| `computeAssetRegisterMath` | Math core | Same rules as FE `assetRegisterMath.js` |

---

## 2. Create single asset (`registerAssetWithLedger`)

```mermaid
sequenceDiagram
  participant API as POST /test
  participant REG as registerAssetWithLedger
  participant MATH as applyDepreciationMath
  participant BAL as year_category_balances
  participant CHAIN as recalcRegisterChainInCategory

  API->>REG: body (name, category, year, PP, …)
  REG->>REG: Resolve opening (Year Setup / prior TB)
  REG->>MATH: Compute TB, AD, TDep, NBV
  REG->>REG: INSERT school_assets
  REG->>BAL: Add purchase + annual dep; update closing
  REG->>CHAIN: Recalc category year (unless deferred)
```

### Opening resolution

1. If **first entry** / Year Setup mode → use Active FY category balance.  
2. Else → last asset in prior year (TB → opening, TDep → accumulated start).  
3. Within same year after prior rows → opening = previous row TB; TD stays year-start.

### Required fields

Typically: `asset_name`, `category`, `location`, `purchase_price` / `unit_price`, `register_year`.

---

## 3. Bulk quantity (`registerAssetsBulkWithLedger`)

When `quantity` is 2–100:

1. Clamp qty to **1–100**.  
2. Create **N separate rows** (each qty forced to 1).  
3. Generate sequential SKUs / serials.  
4. For `i > 0`, pass rolling fields:
   - `rolling_opening` ← previous row TB  
   - `rolling_accumulated_dep` ← **must stay year-start TD** (see pitfalls)  
   - Buildings WIP may roll `rolling_last_progress_purchase`  
5. After batch: `recalcRegisterChainInCategory` + `recalcFinancialYearTotals`.

### Correct rolling rule (same as Excel import)

| Field | Within batch |
|-------|----------------|
| Opening | Roll to previous **TB** |
| Accumulated (TD) | **Fixed** at category year-start |
| Progress PP (WIP) | Roll only for Buildings WIP same year |

### Known bug (non-Buildings / qty > 1)

Bulk currently sets `rollingAccumulated` from each row’s **total_dep**. That advances TD mid-year and understates later annuals. Import uses a **fixed** accumulated — bulk should match import.

See [features/13-known-bugs-and-fixes.md](./features/13-known-bugs-and-fixes.md).

---

## 4. Year category balances

Table: `school_asset_year_category_balances`

| Column | Role |
|--------|------|
| `opening_balance` | Category year opening |
| `purchases` | Sum of PPs added |
| `accumulated_depreciation_start` | Year-start TD |
| `annual_depreciation` | Accumulated annual charges |
| `closing_balance` | Carry into next year |

### Update on each insert

```
newPurchases = purchases + PP
newAnnualDep = annual_depreciation + AD   // Land: 0
```

**Land closing:** `opening + purchases`  
**Other closing (intended):** should equal **last register NBV** for that category/year  

### Known bug (multi-asset categories)

Closing is currently:

```
opening + purchases − accStart − Σ(all rows’ AD)
```

That double-counts annual dep across the chain. Correct year-end ≈ last row **NBV** (`TB − TDep` with shared TD). Buildings with one asset often look fine; Furniture/Vehicles with many rows look wrong.

---

## 5. Chain recalculation

`recalcRegisterChainInCategory(schoolId, year, category)`:

1. Load all active assets for category + year ordered by `id`.  
2. Resolve year-start opening + TD (Year Setup or prior year last row).  
3. Walk rows: set opening, recompute math, UPDATE each row.  
4. Optionally repair corrupted year-start.  

**Does not always rebuild** year balance closing from last NBV — after bulk with bad interim balances, run careful balance rebuild or fix closing logic.

API: `POST /api/school/assets/test/recalc-chain` with `{ register_year, category? }`.

---

## 6. `applyDepreciationMath` behavior

| Category | Behavior |
|----------|----------|
| **Buildings** | Always recompute via `computeBuildingRegisterMath` |
| **Land** | Force AD/TDep = 0; NBV = TB |
| **Others** | If client sends annual/total/nbv > 0, **may trust them**; else recompute `(TB−TD)×rate` |

Implication: stale Furniture numbers can persist; Buildings self-heal. Prefer always recomputing on write for all categories.

---

## 7. Opening context API

`GET /school/assets/test/opening?year=&category=`

Returns for the Add form:

- Category year opening  
- Accumulated depreciation start  
- Depreciation rate  
- Last year total dep / NBV (WIP year-carry)  
- Whether Year Setup exists  

Frontend: `AddAsset2.jsx` → `assetTestApi.getOpening`.

---

## 8. Soft delete & identifiers

- Soft-delete sets inactive flag; unique codes are year-scoped.  
- `GET /test/identifiers` lists codes/SKUs for a year to prevent collisions.  
- SKU pattern helpers: `assetSkuUtils.js` (`SCH/LOC/LBL/#####`).

---

## 9. Operations backends (summary)

| Module | Tables / routes |
|--------|-----------------|
| Assignments | `school_asset_assignments` — assign, return, extend |
| Maintenance | `school_asset_maintenance` |
| Transfers | `school_asset_transfers` |
| Replacements | `school_asset_replacements` — approve/reject |
| Reports | `schoolAssetsReports.js` → `GET /reports/:type` |

Operations generally **do not** rewrite depreciation; they change status/location/assignment state.

---

## 10. Developer checklist when changing backend math

- [ ] Update `computeAssetRegisterMath` / building helpers in `schoolAssets.js`  
- [ ] Mirror changes in `assets_portal/utils/assetRegisterMath.js`  
- [ ] Update `BUSINESS_RULES.md` + `CALCULATION_ENGINE.md`  
- [ ] Test: Land, Finished Building, WIP Case 1/2, Furniture qty 1 and qty 5  
- [ ] After bulk/import: recalc-chain + verify year closing = last NBV  
- [ ] Regression: Year Setup carry-forward preview  

---

## Related docs

- [CALCULATION_ENGINE.md](./CALCULATION_ENGINE.md)  
- [BUSINESS_RULES.md](./BUSINESS_RULES.md)  
- [API_REFERENCE.md](./API_REFERENCE.md)  
- [features/13-known-bugs-and-fixes.md](./features/13-known-bugs-and-fixes.md)  
