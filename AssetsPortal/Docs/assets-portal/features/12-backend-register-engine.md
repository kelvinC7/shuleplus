# 12 — Backend Register Engine

Developer-facing summary of how assets are written to the ledger.

For full depth see [BACKEND_LOGIC.md](../BACKEND_LOGIC.md).

---

## Frontend design

| Item | Detail |
|------|--------|
| **Create UI** | `AddAsset2.jsx` → `assetTestApi.create` |
| **Bulk** | Same form `quantity` 1–100 |
| **Import** | `AssetTestImportModal` → `POST /test/import` |
| **Recalc** | Register toolbar → `POST /test/recalc-chain` |

---

## Backend logic

### Single create

`POST /api/school/assets/test` → `registerAssetWithLedger`

1. Resolve opening + TD  
2. `applyDepreciationMath`  
3. INSERT `school_assets`  
4. Update `school_asset_year_category_balances`  
5. `recalcRegisterChainInCategory` (unless deferred)

### Bulk create

`quantity > 1` → `registerAssetsBulkWithLedger`

- N rows, rolling opening from prior TB  
- TD must remain year-start (import does this correctly)  
- Final chain + FY totals recalc  

### Recalc

`POST /test/recalc-chain` `{ register_year, category? }`

Rewrites openings and dep fields for all rows in scope.

---

## Tables touched

`school_assets`, `school_asset_year_category_balances`, `school_asset_financial_years` (totals), `school_asset_categories` (rates).
