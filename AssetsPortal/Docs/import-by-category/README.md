# Import by category — one Excel file per category (from 2021)

Upload these files **one at a time** via **Assets Portal → Register → Import Excel**.

All **KPS-*.xlsx** files contain rows from **2021 onward only** (2018–2020 excluded). Set **Year Setup** opening balances for each category at the start of 2021 before importing.

## KPS data files (ready to import)

| File | Category | Rows (2021+) |
|------|----------|----------------|
| `KPS-Furniture.xlsx` | Furniture | 1,902 |
| `KPS-Equipment.xlsx` | Machinery / Lab | 81 |
| `KPS-Computer.xlsx` | **Computer** (incl. COMPUTER & ACCESSORIES) | 91 |
| `KPS-Vehicle.xlsx` | Vehicles | 5 |
| `KPS-Buildings.xlsx` | Buildings | 5 |
| `KPS-Land.xlsx` | Land | 12 |

Combined workbook: `Docs/KPS-Import-By-Category.xlsx` (all categories in one file).

## Empty templates (add your own rows)

| File | Use for |
|------|---------|
| `assets-import-furniture.xlsx` | New furniture items |
| `assets-import-equipment.xlsx` | Equipment / lab / security |
| `assets-import-computer.xlsx` | Computers & accessories → **Computer** category |
| `assets-import-vehicle.xlsx` | Motor vehicles |
| `assets-import-buildings.xlsx` | Buildings (set `building_status` for WIP) |
| `assets-import-land.xlsx` | Land parcels |

## Import steps

1. **Year Setup** — enter opening balances per category for **2021** (from KPS master register).
2. **Import Excel** → choose **Not first time** for years 2021–2024.
3. Upload **one file** (e.g. `KPS-Computer.xlsx`), preview, import.
4. Repeat for each category.
5. Run **Recalculate register** when finished.

Category is detected from the **file name**, **sheet name**, or **`type`** column.

Regenerate files after updating the master KPS workbook:

```bash
cd AssetsPortal/Backend
node ../scripts/build-kps-import-sheets.mjs
```
