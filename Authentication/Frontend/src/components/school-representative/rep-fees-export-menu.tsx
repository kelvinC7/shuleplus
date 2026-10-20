'use client';

import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';
import { jsPDF } from 'jspdf';

type ExportRow = Record<string, string | number | null | undefined>;

type Props = {
  title: string;
  filterSummary: string;
  summaryRows: ExportRow[];
  tableHeaders: string[];
  tableRows: ExportRow[];
  fileBaseName: string;
};

export function RepFeesExportMenu({
  title,
  filterSummary,
  summaryRows,
  tableHeaders,
  tableRows,
  fileBaseName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [includeCharts, setIncludeCharts] = useState(true);

  function downloadCsv(filename: string, rows: ExportRow[]) {
    const escape = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = tableHeaders.length ? tableHeaders : Object.keys(rows[0] ?? {});
    const lines = [
      headers.map(escape).join(','),
      ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportExcel() {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const summarySheet = XLSX.utils.json_to_sheet([
        { Report: title, Filters: filterSummary, Generated: new Date().toISOString() },
        ...summaryRows,
      ]);
      const dataSheet = XLSX.utils.json_to_sheet(tableRows);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
      XLSX.utils.book_append_sheet(wb, dataSheet, 'Data');
      XLSX.writeFile(wb, `${fileBaseName}.xlsx`);
    } catch {
      downloadCsv(`${fileBaseName}.csv`, [
        { Report: title, Filters: filterSummary, Generated: new Date().toISOString() },
        ...summaryRows,
        {},
        ...tableRows,
      ]);
    }
    setOpen(false);
  }

  function exportPdf() {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('ShulePlus · School Representative', 14, 16);
    doc.setFontSize(11);
    doc.text(title, 14, 24);
    doc.setFontSize(9);
    doc.text(`Generated ${new Date().toLocaleString()} · ${filterSummary}`, 14, 30);
    let y = 38;
    for (const row of summaryRows.slice(0, 6)) {
      const line = Object.entries(row)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');
      doc.text(line.slice(0, 120), 14, y);
      y += 6;
    }
    if (includeCharts) {
      doc.text('Visual summary included in portal view.', 14, y + 4);
      y += 10;
    }
    doc.text(tableHeaders.join(' | ').slice(0, 140), 14, y + 4);
    y += 8;
    for (const row of tableRows.slice(0, 18)) {
      const line = tableHeaders.map((h) => String(row[h] ?? '')).join(' | ');
      doc.text(line.slice(0, 140), 14, y);
      y += 5;
      if (y > 190) break;
    }
    doc.save(`${fileBaseName}.pdf`);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-navy/90"
      >
        <Download className="h-4 w-4" />
        Export
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-border bg-white p-4 shadow-xl">
          <p className="text-sm font-semibold text-navy">Export configuration</p>
          <p className="mt-1 text-xs text-muted">{filterSummary}</p>
          <label className="mt-3 flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={includeCharts} onChange={(e) => setIncludeCharts(e.target.checked)} />
            Include visual summary note in PDF
          </label>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              onClick={() => void exportExcel()}
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Excel workbook (.xlsx)
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <FileText className="h-4 w-4 text-rose-600" />
              PDF report (.pdf)
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
