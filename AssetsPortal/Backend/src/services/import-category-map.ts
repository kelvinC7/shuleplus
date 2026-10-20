/** Excel type / sheet name → system asset category mapping (KPS-compatible). */

/** KPS register starts here — rows before this year are excluded on import. */
export const IMPORT_MIN_REGISTER_YEAR = 2021;

/** Rows from downloadable import templates — not real assets. */
export const IMPORT_TEMPLATE_SAMPLE_ROWS: Array<{
  name: string;
  sku: string;
  type: string;
}> = [
  { name: "Teacher Table", sku: "TB001", type: "FURNITURE" },
  { name: "Generator", sku: "EQ001", type: "EQUIPMENT" },
  { name: "HP Laptop", sku: "LT001", type: "COMPUTER" },
  { name: "School Pickup", sku: "VH001", type: "MOTOR VEHICLE" },
];

export function isImportTemplateSampleRow(input: {
  assetName?: string;
  sku?: string;
  typeRaw?: string;
}): boolean {
  const name = (input.assetName ?? "").trim().toLowerCase();
  const sku = (input.sku ?? "").trim().toUpperCase();
  if (!name && !sku) return false;

  return IMPORT_TEMPLATE_SAMPLE_ROWS.some((sample) => {
    const sampleName = sample.name.toLowerCase();
    const sampleSku = sample.sku.toUpperCase();
    if (sku && sku === sampleSku) return true;
    if (name === sampleName && (!sku || sku === sampleSku)) return true;
    return false;
  });
}

export function isBeforeImportMinYear(year: number): boolean {
  const y = Number(year);
  return Number.isFinite(y) && y > 0 && y < IMPORT_MIN_REGISTER_YEAR;
}

export const TYPE_TO_CATEGORY: Record<string, string[]> = {
  buildings: ["Buildings"],
  building: ["Buildings"],
  land: ["Land"],
  furniture: ["Furniture"],
  vehicle: ["Vehicles"],
  vehicles: ["Vehicles"],
  "motor vehicle": ["Vehicles"],
  "motor vehicles": ["Vehicles"],
  computer: ["Computer"],
  computers: ["Computer"],
  "computer & accessories": ["Computer"],
  "computer &accessories": ["Computer"],
  "computer &assecoires": ["Computer"],
  "computer & assecoires": ["Computer"],
  "computer and accessories": ["Computer"],
  ict: ["Computer", "IT Equipment", "Electronics"],
  it: ["Computer", "IT Equipment", "Electronics"],
  electronics: ["Electronics", "Computer", "IT Equipment"],
  equipment: ["Machinery / Lab", "Office Equipment"],
  lab: ["Machinery / Lab", "Laboratory Equipment"],
  laboratory: ["Machinery / Lab", "Laboratory Equipment"],
  office: ["Office Equipment"],
  machinery: ["Machinery / Lab"],
};

/** Categories that share one KPS depreciation chain across years. */
export const CATEGORY_CHAIN_GROUPS: string[][] = [
  ["Computer", "IT Equipment", "Electronics", "ICT Equipment", "ICT"],
  ["Machinery / Lab", "Office Equipment", "Equipment", "Laboratory Equipment"],
  ["Vehicles", "Motor Vehicle", "Motor Vehicles"],
  ["Buildings", "Building"],
];

export function getCategoryChainAliases(categoryName: string): string[] {
  const norm = categoryName.trim().toLowerCase();
  for (const group of CATEGORY_CHAIN_GROUPS) {
    if (group.some((g) => g.toLowerCase() === norm)) {
      return [...group];
    }
  }
  return [categoryName.trim()];
}

export function getCategoryChainKey(categoryName: string): string {
  return getCategoryChainAliases(categoryName)
    .map((c) => c.toLowerCase())
    .sort()
    .join("|");
}

const SHEET_TYPE_HINTS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /^furniture$/i, type: "FURNITURE" },
  { pattern: /furniture/i, type: "FURNITURE" },
  { pattern: /^equipment$/i, type: "EQUIPMENT" },
  { pattern: /^machinery/i, type: "EQUIPMENT" },
  { pattern: /^computer|ict|it equipment$/i, type: "COMPUTER" },
  { pattern: /computer|ict/i, type: "COMPUTER" },
  { pattern: /^vehicle|motor vehicle|vehicles$/i, type: "MOTOR VEHICLE" },
  { pattern: /vehicle|motor/i, type: "MOTOR VEHICLE" },
  { pattern: /^building|buildings$/i, type: "BUILDING" },
  { pattern: /building/i, type: "BUILDING" },
  { pattern: /^land$/i, type: "LAND" },
  { pattern: /land/i, type: "LAND" },
];

const SKIP_SHEET = /^(summary|readme|instructions?|guide|notes|index)$/i;
const COMBINED_SHEET = /^all\b/i;

export function shouldSkipImportSheet(sheetName: string): boolean {
  const name = sheetName.trim();
  if (!name) return true;
  if (SKIP_SHEET.test(name)) return true;
  if (/^summary\b/i.test(name)) return true;
  if (COMBINED_SHEET.test(name)) return true;
  return false;
}

export function sheetNameToTypeHint(sheetName: string): string {
  const normalized = sheetName.trim();
  for (const { pattern, type } of SHEET_TYPE_HINTS) {
    if (pattern.test(normalized)) return type;
  }
  return "";
}

/** Normalize KPS type strings for alias lookup (spacing + ASSECOIRES typo). */
export function normalizeImportTypeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*&\s*/g, " & ")
    .replace(/assecoires?/gi, "accessories");
}

export function mapTypeToCategory(raw: string, categoryNames: string[]): string | null {
  const t = raw.trim();
  if (!t) return null;

  const exact = categoryNames.find((c) => c.toLowerCase() === t.toLowerCase());
  if (exact) return exact;

  const key = normalizeImportTypeKey(t);
  const aliases = TYPE_TO_CATEGORY[key];
  if (aliases) {
    for (const a of aliases) {
      const hit = categoryNames.find((c) => c.toLowerCase() === a.toLowerCase());
      if (hit) return hit;
    }
  }

  return null;
}

export function resolveImportCategory(
  typeRaw: string,
  sheetHint: string,
  categoryNames: string[]
): { category: string | null; resolvedType: string } {
  const fromType = mapTypeToCategory(typeRaw, categoryNames);
  if (fromType) return { category: fromType, resolvedType: typeRaw.trim() };

  const hint = sheetHint.trim();
  if (hint) {
    const fromHint = mapTypeToCategory(hint, categoryNames);
    if (fromHint) return { category: fromHint, resolvedType: hint };
  }

  return { category: null, resolvedType: typeRaw.trim() || hint };
}

function importDepCell(row: Record<string, unknown>, ...keys: string[]) {
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

/**
 * KPS Excel per-row rate: depreciation_rate (50, 25, 5) or decimal depr (0.5, 0.25, 0.05).
 * Formula unchanged: AD = (TB − TD) × rate%.
 */
export function parseImportDepRate(
  row: Record<string, unknown>,
  categoryDefaultRate: number
): number {
  const rateRaw = importDepCell(
    row,
    "depreciation_rate",
    "depreciationrate",
    "dep_rate",
    "deprate"
  );
  if (rateRaw) {
    const n = Number(rateRaw.replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) {
      return n <= 1 ? Math.round(n * 100) : n;
    }
  }

  const decimalRaw = importDepCell(
    row,
    "decimal_depr",
    "decimaldepr",
    "decimal depr",
    "decimal_depr"
  );
  if (decimalRaw) {
    const d = Number(decimalRaw.replace(/,/g, ""));
    if (Number.isFinite(d) && d > 0) {
      return d <= 1 ? Math.round(d * 100) : d;
    }
  }

  const fallback = Number(categoryDefaultRate) || 0;
  return fallback <= 1 && fallback > 0 ? Math.round(fallback * 100) : fallback;
}

export function isOpeningBalanceRow(name: string, subCategory?: string): boolean {
  const n = name.trim().toLowerCase();
  const sub = (subCategory ?? "").trim().toLowerCase();
  return n.includes("opening balance") || n === "balance" || sub === "balance";
}

/** Skip blank Excel tail rows (common when exporting from spreadsheets). */
export function isEmptyImportRow(row: Record<string, unknown>): boolean {
  const cell = (...keys: string[]) => {
    for (const k of keys) {
      const found = Object.keys(row).find(
        (h) => h.toLowerCase().replace(/[\s_]+/g, "") === k.toLowerCase().replace(/[\s_]+/g, "")
      );
      if (found != null && row[found] != null && String(row[found]).trim() !== "") {
        return String(row[found]).trim();
      }
    }
    return "";
  };

  const name = cell("name", "assetname", "asset_name", "asset name", "material", "province");
  const type = cell("type", "assettype", "asset type");
  const price = Number(
    cell(
      "purchaseunitprice",
      "purchase_unit_price",
      "purchaseprice",
      "purchase_price",
      "unitprice",
      "unit_price",
      "price"
    ).replace(/,/g, "")
  );

  if (!name && !type && !(price > 0)) return true;

  const meaningful = Object.entries(row).filter(
    ([k, v]) => !["_sheet", "__sheet"].includes(k) && String(v ?? "").trim() !== ""
  );
  return meaningful.length === 0;
}
