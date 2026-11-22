import * as XLSX from 'xlsx';

export type ExcelRow = Record<string, unknown>;

export const IMPORT_FILE_ACCEPT =
  '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv';

/** Lower-case, accent-free, punctuation-free tokenisation used for matching. */
export function normalizeItemName(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Find a cell value in a row using one or more accepted header aliases. */
export function pickCell(row: ExcelRow, aliases: string[]): unknown {
  const wanted = aliases.map(normalizeHeader);
  for (const [key, value] of Object.entries(row)) {
    if (wanted.includes(normalizeHeader(key))) return value;
  }
  return '';
}

/** True when the workbook contains all required header aliases. */
export function hasRequiredColumns(rows: ExcelRow[], required: { label: string; aliases: string[] }[]) {
  if (rows.length === 0) return { ok: false, missing: required.map((column) => column.label) };
  const headers = new Set(Object.keys(rows[0]).map(normalizeHeader));
  const missing = required
    .filter((column) => !column.aliases.map(normalizeHeader).some((alias) => headers.has(alias)))
    .map((column) => column.label);
  return { ok: missing.length === 0, missing };
}

export function readWorkbookRows(file: File): Promise<ExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The file could not be read. Please try again.'));
    reader.onload = () => {
      try {
        const workbook = XLSX.read(new Uint8Array(reader.result as ArrayBuffer), {
          type: 'array',
          cellDates: false,
        });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          resolve([]);
          return;
        }
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: '', raw: true });
        resolve(
          rows.filter((row) =>
            Object.values(row).some((value) => String(value ?? '').trim() !== ''),
          ),
        );
      } catch {
        reject(new Error('This file is not a valid Excel workbook.'));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export function downloadExcelTemplate(
  filename: string,
  sheetName: string,
  headers: string[],
  sampleRows: (string | number)[][],
) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  worksheet['!cols'] = headers.map(() => ({ wch: 24 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

/** Parse a positive number, accepting commas and whitespace. */
export function parsePositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const normalized =
    typeof value === 'string' ? value.replace(/,/g, '').replace(/\s/g, '').trim() : value;
  const number = Number(normalized);
  if (!Number.isFinite(number) || number <= 0) return null;
  return number;
}
