/**
 * Build per-category Excel files for one-by-one import.
 * Usage: node scripts/build-kps-import-sheets.mjs
 *
 * Outputs:
 *   Docs/import-by-category/KPS-Furniture.xlsx  (KPS data, one category per file)
 *   Docs/import-by-category/assets-import-furniture.xlsx  (empty template + sample row)
 *   Docs/import-by-category/KPS-Import-All-Categories.xlsx  (optional combined workbook)
 */
import * as XLSX from 'xlsx';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
/** KPS per-category files include rows from this year only (matches import filter). */
const IMPORT_MIN_REGISTER_YEAR = 2021;
const sourcePath = join(root, 'Docs', 'ASSET REGISTER  OF KPS FROM 2018 TO 2025.xlsx');
const outDir = join(root, 'Docs', 'import-by-category');
const combinedPath = join(root, 'Docs', 'KPS-Import-By-Category.xlsx');

/** KPS type values that belong in the Computer import file → Computer category. */
const COMPUTER_TYPE_RE =
  /^computer(\s*&\s*(accessories|assecoires?))?$/i;

const CATEGORY_SHEETS = [
  { out: 'Furniture', fileSlug: 'furniture', sources: ['FURNITURE'], type: 'FURNITURE' },
  { out: 'Equipment', fileSlug: 'equipment', sources: ['EQUIPMENT'], type: 'EQUIPMENT' },
  {
    out: 'Computer',
    fileSlug: 'computer',
    sources: ['COMPUTER'],
    type: 'COMPUTER',
    rowFilter: (row) => COMPUTER_TYPE_RE.test(String(row.type || '').trim()),
  },
  { out: 'Vehicle', fileSlug: 'vehicle', sources: ['VEHICLE'], type: 'MOTOR VEHICLE' },
  { out: 'Buildings', fileSlug: 'buildings', sources: ['BUILDING'], type: 'BUILDING' },
  { out: 'Land', fileSlug: 'land', sources: ['LAND'], type: 'LAND' },
];

const IMPORT_HEADERS = [
  'location',
  'label',
  'type',
  'supplier',
  'upi',
  'sku',
  'material',
  'purchase_year',
  'purchase_month',
  'purchase_day',
  'purchase_unit_price',
  'name',
  'building_status',
  'item_subtype',
];

const SAMPLE_ROWS = {
  furniture: ['Main Campus', 'TB001', 'FURNITURE', '', '', '', '', '2024', '6', '1', '850000', 'Teacher Table', '', ''],
  equipment: ['Main Campus', 'EQ001', 'EQUIPMENT', '', '', '', '', '2024', '3', '15', '1200000', 'Generator', '', ''],
  computer: ['ICT Lab', 'LT001', 'COMPUTER', '', '', '', '', '2024', '1', '10', '650000', 'HP Laptop', '', ''],
  vehicle: ['Fleet', 'VH001', 'MOTOR VEHICLE', '', '', '', '', '2024', '5', '1', '25000000', 'School Pickup', '', ''],
  buildings: ['Main Campus', 'BLD001', 'BUILDING', '', '', '', '', '2024', '12', '31', '150000000', 'NEW DINNING HALL', 'Working Progress', ''],
  land: ['Kigali', 'LAND001', 'LAND', '', '1/02/09/01/3766', '', '', '2024', '1', '1', '20500000', 'Plot Block A', '', ''],
};

function writeWorkbook(wb, filePath) {
  writeFileSync(filePath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

function normalizeRow(row, sheetType) {
  const cell = (...keys) => {
    for (const k of keys) {
      const found = Object.keys(row).find(
        (h) => h.toLowerCase().replace(/[\s_]+/g, '') === k.toLowerCase().replace(/[\s_]+/g, '')
      );
      if (found != null && row[found] != null && String(row[found]).trim() !== '') {
        return String(row[found]).trim();
      }
    }
    return '';
  };

  let type = cell('type') || sheetType;
  if (COMPUTER_TYPE_RE.test(type)) {
    type = /&/i.test(type) ? 'COMPUTER & ACCESSORIES' : 'COMPUTER';
  }
  let name = cell('name', 'assetname', 'asset_name');
  if (!name && sheetType === 'LAND') {
    const parts = [cell('province'), cell('district'), cell('sector'), cell('upi')].filter(Boolean);
    name = parts.length ? `Land — ${parts.join(' / ')}` : 'Land parcel';
  }

  let buildingStatus = cell('buildingstatus', 'building_status');
  if (!buildingStatus && sheetType === 'BUILDING' && /dinning hall|dining hall/i.test(name)) {
    buildingStatus = 'Working Progress';
  }

  return {
    location: cell('location', 'province') || 'KIMIRONKO',
    label: cell('label') || '',
    type,
    supplier: cell('supplier') || '',
    upi: cell('upi') || '',
    sku: cell('sku') || '',
    material: cell('material') || '',
    purchase_year: cell('purchase_year', 'purchaseyear') || '',
    purchase_month: cell('purchase_month', 'purchasemonth') || '',
    purchase_day: cell('purchase_day', 'purchaseday') || '',
    purchase_unit_price: cell('purchase_unit_price', 'purchaseunitprice') || '',
    name,
    building_status: buildingStatus,
    item_subtype: cell('category') || '',
  };
}

function isOpeningBalance(row) {
  const n = String(row.name || '').toLowerCase();
  const sub = String(row.item_subtype || '').toLowerCase();
  return n.includes('opening balance') || n === 'balance' || sub === 'balance';
}

function isEmptyNormalizedRow(row) {
  return !String(row.name || '').trim() && !String(row.type || '').trim() && !(Number(row.purchase_unit_price) > 0);
}

function isBeforeMinYear(row) {
  const y = Number(row.purchase_year);
  return Number.isFinite(y) && y > 0 && y < IMPORT_MIN_REGISTER_YEAR;
}

function buildCategoryWorkbook(sheetName, rows) {
  const wb = XLSX.utils.book_new();
  const aoa = [IMPORT_HEADERS, ...rows.map((r) => IMPORT_HEADERS.map((h) => r[h] ?? ''))];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), sheetName);
  return wb;
}

function buildTemplateWorkbook(sheetName, fileSlug) {
  const sample = SAMPLE_ROWS[fileSlug] ?? SAMPLE_ROWS.furniture;
  return buildCategoryWorkbook(sheetName, [
    Object.fromEntries(IMPORT_HEADERS.map((h, i) => [h, sample[i] ?? ''])),
  ]);
}

mkdirSync(outDir, { recursive: true });

let sourceWb = null;
try {
  sourceWb = XLSX.read(readFileSync(sourcePath), { type: 'buffer', cellDates: true });
} catch {
  console.warn(`Source not found: ${sourcePath}`);
  console.warn('Generating empty templates only.');
}

const combinedWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(
  combinedWb,
  XLSX.utils.aoa_to_sheet([
    ['Import one category at a time'],
    [''],
    ['Upload any single file via Assets Portal → Register → Import Excel.'],
    ['Files in this folder:'],
    ['  KPS-{Category}.xlsx — KPS register data for that category'],
    ['  assets-import-{category}.xlsx — empty template to add new rows'],
    [''],
    [`Rows from ${IMPORT_MIN_REGISTER_YEAR} onward only (2018–2020 excluded).`],
    ['Use Not first time mode for historical years. Set Year Setup openings first.'],
  ]),
  'README'
);

for (const { out, fileSlug, sources, type, rowFilter } of CATEGORY_SHEETS) {
  let dataRows = [];
  const seen = new Set();

  let excluded = 0;
  if (sourceWb) {
    for (const source of sources) {
      if (!sourceWb.Sheets[source]) continue;
      const raw = XLSX.utils.sheet_to_json(sourceWb.Sheets[source], { defval: '' });
      for (const r of raw) {
        const row = normalizeRow(r, type);
        if (rowFilter && !rowFilter(row)) continue;
        const dedupeKey = [
          row.purchase_year,
          row.name,
          row.purchase_unit_price,
          row.type,
          row.sku,
        ].join('::');
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        if (isOpeningBalance(row) || isEmptyNormalizedRow(row)) continue;
        if (isBeforeMinYear(row)) {
          excluded += 1;
          continue;
        }
        dataRows.push(row);
      }
    }
  }

  const kpsFile = join(outDir, `KPS-${out}.xlsx`);
  writeWorkbook(buildCategoryWorkbook(out, dataRows), kpsFile);
  console.log(
    `KPS-${out}.xlsx → ${dataRows.length} rows${excluded ? ` (${excluded} before ${IMPORT_MIN_REGISTER_YEAR} skipped)` : ''}`
  );

  const templateFile = join(outDir, `assets-import-${fileSlug}.xlsx`);
  writeWorkbook(buildTemplateWorkbook(out, fileSlug), templateFile);
  console.log(`assets-import-${fileSlug}.xlsx → template`);

  if (dataRows.length) {
    const aoa = [IMPORT_HEADERS, ...dataRows.map((r) => IMPORT_HEADERS.map((h) => r[h] ?? ''))];
    XLSX.utils.book_append_sheet(combinedWb, XLSX.utils.aoa_to_sheet(aoa), out);
  }
}

writeWorkbook(combinedWb, combinedPath);
console.log(`\nCombined: ${combinedPath}`);
console.log(`Per-category files: ${outDir}`);
