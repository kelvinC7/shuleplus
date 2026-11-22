'use client';

import * as XLSX from 'xlsx';
import type { LandReport, LandReportColumn } from '@/types';

export function formatReportValue(
  value: string | number | null | undefined,
  type: string | undefined
): string {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'money') {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      maximumFractionDigits: 0,
    }).format(n);
  }
  if (type === 'number') {
    const n = Number(value);
    return Number.isFinite(n) ? new Intl.NumberFormat('en-RW').format(n) : String(value);
  }
  if (type === 'date') {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return String(value);
}

export function exportRowsToExcel(
  fileName: string,
  columns: Array<Pick<LandReportColumn, 'key' | 'label' | 'type'>>,
  rows: Array<Record<string, string | number | null>>
) {
  const sheetRows = rows.map((row) => {
    const output: Record<string, string | number> = {};
    for (const column of columns) {
      const raw = row[column.key];
      if (column.type === 'money' || column.type === 'number') {
        output[column.label] = Number(raw) || 0;
      } else {
        output[column.label] = raw === null || raw === undefined ? '' : String(raw);
      }
    }
    return output;
  });

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(sheetRows);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Land');
  XLSX.writeFile(workbook, fileName);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function printLandReport(report: LandReport) {
  const logo = `${window.location.origin}/logo.png`;
  const generated = new Date(report.generatedAt).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const summaryHtml = report.summary
    .map(
      (item) => `
        <div class="summary-card">
          <span class="summary-label">${escapeHtml(item.label)}</span>
          <span class="summary-value">${escapeHtml(
            formatReportValue(item.value, item.type)
          )}</span>
        </div>`
    )
    .join('');

  const headerHtml = report.columns
    .map((column) => `<th>${escapeHtml(column.label)}</th>`)
    .join('');

  const bodyHtml = report.rows
    .map(
      (row) =>
        `<tr>${report.columns
          .map(
            (column) =>
              `<td class="${column.type === 'money' || column.type === 'number' ? 'num' : ''}">${escapeHtml(
                formatReportValue(row[column.key], column.type)
              )}</td>`
          )
          .join('')}</tr>`
    )
    .join('');

  const filterLabels: string[] = [];
  const filters = report.filters ?? {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      filterLabels.push(`${key}: ${String(value)}`);
    }
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 28px; font-size: 11px; }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 3px solid #fcb038; padding-bottom: 16px; }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand img { height: 52px; width: auto; }
    .org-name { font-size: 18px; font-weight: 700; color: #000435; }
    .org-meta { color: #64748b; font-size: 11px; margin-top: 2px; }
    .doc-title { text-align: right; }
    .doc-title h1 { margin: 0; font-size: 20px; color: #000435; }
    .doc-title p { margin: 3px 0 0; color: #64748b; font-size: 10px; }
    .meta { display: flex; flex-wrap: wrap; gap: 18px; margin: 14px 0; color: #475569; font-size: 10px; }
    .meta strong { color: #000435; }
    .summary { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0 20px; }
    .summary-card { flex: 1 1 140px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; background: #f8fafc; }
    .summary-label { display: block; text-transform: uppercase; letter-spacing: 0.06em; font-size: 8px; color: #64748b; font-weight: 700; }
    .summary-value { display: block; margin-top: 4px; font-size: 14px; font-weight: 700; color: #000435; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    thead th { background: #000435; color: #fff; text-align: left; padding: 7px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; }
    tbody td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 10px; color: #94a3b8; font-size: 9px; display: flex; justify-content: space-between; }
    @page { size: A4 landscape; margin: 12mm; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <img src="${logo}" alt="Logo" />
      <div>
        <div class="org-name">${escapeHtml(report.organization.name)}</div>
        <div class="org-meta">${report.organization.code ? `Code: ${escapeHtml(report.organization.code)}` : 'Assets Portal'}</div>
      </div>
    </div>
    <div class="doc-title">
      <h1>${escapeHtml(report.title)}</h1>
      <p>${escapeHtml(report.subtitle)}</p>
    </div>
  </div>

  <div class="meta">
    <span>Financial Year: <strong>${report.financialYear.year} (${escapeHtml(
      report.financialYear.status
    )})</strong></span>
    <span>Generated: <strong>${escapeHtml(generated)}</strong></span>
    ${filterLabels.length ? `<span>Filters: <strong>${escapeHtml(filterLabels.join(' • '))}</strong></span>` : ''}
  </div>

  <div class="summary">${summaryHtml}</div>

  <table>
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${bodyHtml || `<tr><td colspan="${report.columns.length}" style="text-align:center;color:#94a3b8;padding:24px">No records match the selected filters.</td></tr>`}</tbody>
  </table>

  <div class="footer">
    <span>ShulePlus Assets Portal — Land Asset Management</span>
    <span>${escapeHtml(report.title)} • ${report.financialYear.year}</span>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}
