import * as XLSX from 'xlsx';
import type { AssetImportPreviewRow } from '@/services/assets-api';

function rowsForExport(rows: AssetImportPreviewRow[]) {
  return rows.map((r) => ({
    Row: r.row,
    Status: r.status,
    Reason: r.reason,
    Name: r.assetName,
    Type: r.typeRaw,
    Category: r.category,
    Year: r.registerYear || '',
    SKU: r.sku,
    'Purchase price': r.purchasePrice,
    Location: r.location,
    Label: r.locationLabel,
    Supplier: r.supplier,
    'Building status': r.buildingStatus,
    Opening: r.opening,
    'Total balance': r.totalBalance,
    'Acc. depreciation': r.accumulatedStart,
    'Dep. rate %': r.depRate,
    'Annual dep.': r.annualDep,
    NBV: r.netBookValue,
  }));
}

export function downloadImportPreviewRows(
  rows: AssetImportPreviewRow[],
  kind: 'duplicates' | 'missing',
  registerYear: number
) {
  const filtered =
    kind === 'duplicates'
      ? rows.filter((r) => r.status === 'duplicate')
      : rows.filter((r) => r.status === 'invalid');

  if (!filtered.length) return false;

  const sheet = XLSX.utils.json_to_sheet(rowsForExport(filtered));
  const wb = XLSX.utils.book_new();
  const sheetName = kind === 'duplicates' ? 'Duplicates' : 'Missing';
  XLSX.utils.book_append_sheet(wb, sheet, sheetName);

  const suffix = kind === 'duplicates' ? 'duplicates' : 'missing-rows';
  XLSX.writeFile(wb, `assets-import-${suffix}-FY${registerYear}.xlsx`);
  return true;
}
