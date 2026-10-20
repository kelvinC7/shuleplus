# 13 — Known Bugs & Fixes (Developers)

Issues that make **non-Building categories** look broken or produce wrong totals. Use this when debugging uploads and Year Setup carry-forward.

---

## 1. Bulk quantity advances accumulated dep

**Where:** `schoolAssets.js` → `registerAssetsBulkWithLedger` (~3553–3565)

**Symptom:** Furniture/Equipment with qty > 1: annual dep and NBV wrong after upload.

**Cause:** `rollingAccumulated` set to each row’s **total_dep**. Within a year TD must stay at **year-start**.

**Fix approach:** Match Excel import — keep `fixedAccumulated` / year-start TD; only roll opening to prior TB.

---

## 2. Year closing understates multi-asset categories

**Where:** year balance update (~3296–3303)

**Symptom:** Category closing (and next year opening) too low when 2+ assets exist.

**Cause:**  
`closing = opening + purchases − accStart − Σ(all AD)`  
instead of **last row NBV**.

**Fix approach:** After chain, set closing from last register NBV; rebuild balances inside `recalcRegisterChainInCategory`.

---

## 3. Non-Buildings trust stale client math

**Where:** `applyDepreciationMath` (~2611–2651)

**Symptom:** Bad numbers stick for Furniture; Buildings “self-heal”.

**Cause:** Buildings always recompute; others accept provided annual/total/nbv.

**Fix approach:** Always recompute on write for all categories (ignore client dep fields).

---

## 4. Register UI chain only on current page

**Where:** `AssetAddTest.jsx` (page size 30 + `enrichRegisterChainFinancials` on page slice)

**Symptom:** Page 2+ of long Furniture lists shows wrong openings until Recalculate.

**Fix approach:** Enrich full category-year dataset, or display persisted DB after recalc.

---

## 5. Silent 5% rate fallback

**Where:** rate lookup when category name mismatches

**Symptom:** Furniture charged at 5% instead of 10%.

**Fix approach:** Case-insensitive exact match; fail loudly or use DB category id — no silent Buildings rate.

---

## 6. Misleading Year Setup help text

**Where:** `YearSetUp.jsx` help copy

**Symptom:** Docs in UI disagree with real AD formula.

**Fix approach:** Align text with `(TB − TD) × rate` and TDep = TD + AD.

---

## Why Buildings look fine

Usually **one row**, qty **1**, and **forced recompute**. Other categories hit bulk + multi-row closing + stale math.

---

## Frontend design

Document bugs in QA checklists for Add Asset (qty), Import, Recalculate, Year Setup preview.

## Backend logic

Prefer fixing (1) + (2) first — highest user impact for “others category not working”.
