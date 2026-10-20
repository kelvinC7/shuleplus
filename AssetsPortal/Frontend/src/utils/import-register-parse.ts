import * as XLSX from 'xlsx';

/** Matches backend — KPS import files and preview exclude earlier years. */
export const IMPORT_MIN_REGISTER_YEAR = 2021;

export const IMPORT_TEMPLATE_SAMPLE_ROWS = [
  { name: 'Teacher Table', sku: 'TB001', type: 'FURNITURE' },
  { name: 'Generator', sku: 'EQ001', type: 'EQUIPMENT' },
  { name: 'HP Laptop', sku: 'LT001', type: 'COMPUTER' },
  { name: 'School Pickup', sku: 'VH001', type: 'MOTOR VEHICLE' },
] as const;

function importCell(row: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const found = Object.keys(row).find(
      (h) => h.toLowerCase().replace(/[\s_]+/g, '') === k.toLowerCase().replace(/[\s_]+/g, '')
    );
    if (found != null && row[found] != null && String(row[found]).trim() !== '') {
      return String(row[found]).trim();
    }
  }
  return '';
}

export function isImportTemplateSampleRow(row: Record<string, unknown>): boolean {
  const name = importCell(row, 'name', 'assetname', 'asset_name', 'asset name', 'material').toLowerCase();
  const sku = importCell(row, 'sku', 'serial', 'serialnumber').toUpperCase();
  if (!name && !sku) return false;

  return IMPORT_TEMPLATE_SAMPLE_ROWS.some((sample) => {
    const sampleName = sample.name.toLowerCase();
    const sampleSku = sample.sku.toUpperCase();
    if (sku && sku === sampleSku) return true;
    if (name === sampleName && (!sku || sku === sampleSku)) return true;
    return false;
  });
}

function dropTemplateSampleRows(rows: Record<string, unknown>[]) {
  return rows.filter((row) => !isImportTemplateSampleRow(row));
}

const SKIP_SHEET = /^(summary|readme|instructions?|guide|notes|index)$/i;
const COMBINED_SHEET = /^all\b/i;

function isEmptyImportRow(row: Record<string, unknown>): boolean {
  const cell = (...keys: string[]) => {
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
  const name = cell('name', 'assetname', 'asset_name', 'material', 'province');
  const type = cell('type', 'assettype');
  const price = Number(cell('purchase_unit_price', 'purchaseunitprice', 'price').replace(/,/g, ''));
  if (!name && !type && !(price > 0)) return true;
  const meaningful = Object.entries(row).filter(
    ([k, v]) => !['_sheet', '__sheet'].includes(k) && String(v ?? '').trim() !== ''
  );
  return meaningful.length === 0;
}

export type ParsedImportSheet = {
  name: string;
  rowCount: number;
  skipped: boolean;
};

export type ParseImportWorkbookResult = {
  rows: Record<string, unknown>[];
  sheets: ParsedImportSheet[];
  excludedBeforeMinYear?: number;
};

function importRowYear(row: Record<string, unknown>): number {
  for (const k of ['purchase_year', 'purchaseyear', 'year', 'register_year', 'registeryear']) {
    const found = Object.keys(row).find(
      (h) => h.toLowerCase().replace(/[\s_]+/g, '') === k.toLowerCase().replace(/[\s_]+/g, '')
    );
    if (found != null && row[found] != null && String(row[found]).trim() !== '') {
      const y = Number(String(row[found]).replace(/,/g, '').trim());
      if (Number.isFinite(y) && y > 0) return y;
    }
  }
  return 0;
}

/** Drop rows before IMPORT_MIN_REGISTER_YEAR (2018–2020 for KPS). */
export function filterImportRowsFromMinYear(rows: Record<string, unknown>[]) {
  const kept: Record<string, unknown>[] = [];
  let excludedBeforeMinYear = 0;
  for (const row of rows) {
    const y = importRowYear(row);
    if (y > 0 && y < IMPORT_MIN_REGISTER_YEAR) {
      excludedBeforeMinYear += 1;
      continue;
    }
    kept.push(row);
  }
  return { rows: kept, excludedBeforeMinYear };
}

function shouldSkipSheet(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (SKIP_SHEET.test(trimmed)) return true;
  if (/^summary\b/i.test(trimmed)) return true;
  if (COMBINED_SHEET.test(trimmed)) return true;
  return false;
}

/** Read every category sheet in a workbook and tag each row with `_sheet`. */
export function parseImportWorkbook(wb: XLSX.WorkBook): ParseImportWorkbookResult {
  const rows: Record<string, unknown>[] = [];
  const sheets: ParsedImportSheet[] = [];

  for (const name of wb.SheetNames) {
    const skipped = shouldSkipSheet(name);
    const sheet = wb.Sheets[name];
    if (!sheet) {
      sheets.push({ name, rowCount: 0, skipped: true });
      continue;
    }

    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const dataRows = json.filter((row) => !isEmptyImportRow(row));
    if (skipped || !dataRows.length) {
      sheets.push({ name, rowCount: dataRows.length, skipped: skipped || !dataRows.length });
      continue;
    }

    for (const row of dataRows) {
      rows.push({ ...row, _sheet: name });
    }
    sheets.push({ name, rowCount: dataRows.length, skipped: false });
  }

  const filtered = filterImportRowsFromMinYear(rows);
  return {
    rows: dropTemplateSampleRows(filtered.rows),
    sheets,
    excludedBeforeMinYear: filtered.excludedBeforeMinYear,
  };
}

/** Parse upload — supports one category file or a multi-sheet workbook. */
export function parseImportCsvOrSingleSheet(
  wb: XLSX.WorkBook,
  fileName?: string
): ParseImportWorkbookResult {
  if (wb.SheetNames.length <= 1) {
    const rawName = wb.SheetNames[0] ?? 'Sheet1';
    const name = resolveSingleSheetName(rawName, fileName);
    const sheet = wb.Sheets[rawName];
    const json = sheet
      ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }).filter(
          (row) => !isEmptyImportRow(row)
        )
      : [];
    return {
      rows: json.map((row) => ({ ...row, _sheet: name })),
      sheets: [{ name, rowCount: json.length, skipped: !json.length }],
    };
  }
  return parseImportWorkbook(wb);
}

export const IMPORT_TEMPLATE_SHEETS: Array<{
  id: string;
  sheetName: string;
  fileSlug: string;
  type: string;
  sample: string[];
}> = [
  {
    id: 'furniture',
    sheetName: 'Furniture',
    fileSlug: 'furniture',
    type: 'FURNITURE',
    sample: [
      'Main Campus',
      'TB001',
      'FURNITURE',
      '',
      '',
      '',
      '',
      '',
      '2024',
      '6',
      '1',
      '850000',
      'Teacher Table',
      '',
    ],
  },
  {
    id: 'equipment',
    sheetName: 'Equipment',
    fileSlug: 'equipment',
    type: 'EQUIPMENT',
    sample: [
      'Main Campus',
      'EQ001',
      'EQUIPMENT',
      '',
      '',
      '',
      '',
      '',
      '2024',
      '3',
      '15',
      '1200000',
      'Generator',
      '',
    ],
  },
  {
    id: 'computer',
    sheetName: 'Computer',
    fileSlug: 'computer',
    type: 'COMPUTER',
    sample: [
      'ICT Lab',
      'LT001',
      'COMPUTER',
      '',
      '',
      '',
      '',
      '',
      '2024',
      '1',
      '10',
      '650000',
      'HP Laptop',
      '',
    ],
  },
  {
    id: 'vehicle',
    sheetName: 'Vehicle',
    fileSlug: 'vehicle',
    type: 'MOTOR VEHICLE',
    sample: [
      'Fleet',
      'VH001',
      'MOTOR VEHICLE',
      '',
      '',
      '',
      '',
      '',
      '2024',
      '5',
      '1',
      '25000000',
      'School Pickup',
      '',
    ],
  },
  {
    id: 'buildings',
    sheetName: 'Buildings',
    fileSlug: 'buildings',
    type: 'BUILDING',
    sample: [
      'Main Campus',
      'BLD001',
      'BUILDING',
      '',
      '',
      '',
      '',
      '',
      '2024',
      '12',
      '31',
      '150000000',
      'NEW DINNING HALL',
      'Working Progress',
    ],
  },
  {
    id: 'land',
    sheetName: 'Land',
    fileSlug: 'land',
    type: 'LAND',
    sample: [
      'Kigali',
      'LAND001',
      'LAND',
      '',
      '1/02/09/01/3766',
      '',
      '',
      '',
      '2024',
      '1',
      '1',
      '20500000',
      'Plot Block A',
      '',
    ],
  },
];

export const IMPORT_TEMPLATE_HEADERS = [
  'location',
  'label',
  'type',
  'supplier',
  'upi',
  'sku',
  'cba',
  'material',
  'purchase_year',
  'purchase_month',
  'purchase_day',
  'purchase_unit_price',
  'name',
  'building_status',
];

export function buildImportTemplateWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const { sheetName, sample } of IMPORT_TEMPLATE_SHEETS) {
    const ws = XLSX.utils.aoa_to_sheet([IMPORT_TEMPLATE_HEADERS, sample]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  return wb;
}

/** One category = one Excel file (single sheet) for upload one-by-one. */
export function buildCategoryTemplateWorkbook(categoryId: string): XLSX.WorkBook | null {
  const cat = IMPORT_TEMPLATE_SHEETS.find((c) => c.id === categoryId);
  if (!cat) return null;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([IMPORT_TEMPLATE_HEADERS, cat.sample]);
  XLSX.utils.book_append_sheet(wb, ws, cat.sheetName);
  return wb;
}

export function categoryTemplateFileName(categoryId: string): string {
  const cat = IMPORT_TEMPLATE_SHEETS.find((c) => c.id === categoryId);
  return cat ? `assets-import-${cat.fileSlug}.xlsx` : 'assets-import.xlsx';
}

const GENERIC_SHEET = /^(sheet\d*|assets?|data|import)$/i;

/** Guess category sheet name from uploaded file name, e.g. KPS-Furniture.xlsx → Furniture */
export function inferSheetNameFromFileName(fileName: string): string {
  const base = fileName.replace(/\.(xlsx|xls|csv)$/i, '').toLowerCase();
  for (const cat of IMPORT_TEMPLATE_SHEETS) {
    if (base.includes(cat.fileSlug) || base.includes(cat.sheetName.toLowerCase())) {
      return cat.sheetName;
    }
  }
  return '';
}

function resolveSingleSheetName(sheetName: string, fileName?: string): string {
  const trimmed = sheetName.trim();
  if (trimmed && !GENERIC_SHEET.test(trimmed)) return trimmed;
  const fromFile = fileName ? inferSheetNameFromFileName(fileName) : '';
  return fromFile || trimmed || 'Sheet1';
}

export function workbookHasCategorySheets(sheets: ParsedImportSheet[]): boolean {
  const active = sheets.filter((s) => !s.skipped && s.rowCount > 0);
  return active.length > 1;
}
