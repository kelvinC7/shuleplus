import * as XLSX from "xlsx";
import {
  isEmptyImportRow,
  isImportTemplateSampleRow,
  isOpeningBalanceRow,
  resolveImportCategory,
  isBeforeImportMinYear,
} from "../src/services/import-category-map.ts";

const path = "H:/Projects/ShulePlus/ShulePlus/AssetsPortal/Docs/comp with all.xlsx";
const wb = XLSX.readFile(path);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

function importCell(row, ...keys) {
  for (const k of keys) {
    const found = Object.keys(row).find(
      (h) => h.toLowerCase().replace(/[\s_]+/g, "") === k.toLowerCase().replace(/[\s_]+/g, "")
    );
    if (found != null && row[found] != null && String(row[found]).trim() !== "") {
      return String(row[found]).trim();
    }
  }
  return "";
}

const categoryNames = ["Computer", "Furniture", "Land", "Buildings", "Vehicles"];
const batchYear = 2023;
let invalid = 0;
let ready = 0;

for (const r of rawRows) {
  if (isEmptyImportRow(r)) continue;
  const typeRaw = importCell(r, "type", "assettype", "asset type");
  const { category: mapped } = resolveImportCategory(typeRaw, "Computer", categoryNames);
  const purchaseYear = Number(importCell(r, "purchaseyear", "purchase_year", "year") || batchYear);
  const price = Number(importCell(r, "purchaseunitprice", "purchase_unit_price", "price") || 0);
  const name = importCell(r, "name", "assetname", "asset_name", "asset name");
  const material = importCell(r, "material");
  const assetName = name || material;
  const itemSubType = importCell(r, "category");
  const issues = [];
  if (isImportTemplateSampleRow({ assetName, sku: importCell(r, "sku"), typeRaw })) {
    issues.push("Template sample row");
  }
  if (isOpeningBalanceRow(assetName, itemSubType)) {
    issues.push("Opening balance row");
  }
  if (!assetName?.trim()) issues.push("Missing name");
  if (!mapped) issues.push(`Unknown type: ${typeRaw}`);
  if (!(price > 0)) issues.push("Missing price");
  if (!purchaseYear) issues.push("Missing year");
  if (isBeforeImportMinYear(purchaseYear)) issues.push("Before min year");

  if (issues.length) {
    invalid += 1;
    console.log(purchaseYear, assetName?.slice(0, 35), "->", issues.join("; "));
  } else {
    ready += 1;
  }
}

console.log("\nready", ready, "invalid", invalid);
