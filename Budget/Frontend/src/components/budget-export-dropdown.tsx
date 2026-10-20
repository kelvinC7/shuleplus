'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportToPdf, exportToExcel, type ExportColumn } from '@/lib/export-utils';

interface BudgetExportDropdownProps {
  title: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
  fileName?: string;
  userName?: string;
  orientation?: 'portrait' | 'landscape';
}

export function BudgetExportDropdown({
  title,
  columns,
  data,
  fileName,
  userName,
  orientation,
}: BudgetExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function handlePdf() {
    if (!data.length) return;
    setExporting('pdf');
    try {
      await exportToPdf({
        title,
        columns,
        data,
        fileName,
        userName,
        orientation: orientation ?? (columns.length > 6 ? 'landscape' : 'portrait'),
      });
    } finally {
      setExporting(null);
      setOpen(false);
    }
  }

  function handleExcel() {
    if (!data.length) return;
    setExporting('excel');
    try {
      exportToExcel({ title, columns, data, fileName, userName });
    } finally {
      setExporting(null);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={!!exporting}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:border-primary/40 hover:bg-slate-50 disabled:opacity-50"
      >
        {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
        Export
        <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-border bg-white py-1 shadow-xl">
          <button
            type="button"
            disabled={!data.length || !!exporting}
            onClick={() => void handlePdf()}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-navy hover:bg-slate-50 disabled:opacity-50"
          >
            <FileDown size={16} className="text-red-500" /> Export PDF
          </button>
          <button
            type="button"
            disabled={!data.length || !!exporting}
            onClick={handleExcel}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-navy hover:bg-slate-50 disabled:opacity-50"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" /> Export Excel
          </button>
          {!data.length ? (
            <p className="border-t border-border px-4 py-2 text-[11px] text-muted">No data to export</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
