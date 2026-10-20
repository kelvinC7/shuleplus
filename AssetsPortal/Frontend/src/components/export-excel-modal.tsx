'use client';

import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { AssetsModal } from './assets-modal';
import { formatNumber } from '@/utils/format';
import type { RegisterFilters } from './register-filters-panel';

export type ExportExcelOptions = {
  scope: 'filtered' | 'all';
  includeQrColumn: boolean;
};

type ExportExcelModalProps = {
  open: boolean;
  filters: RegisterFilters;
  filteredTotal: number;
  allTotal: number;
  exporting: boolean;
  onClose: () => void;
  onExport: (options: ExportExcelOptions) => void | Promise<void>;
};

export function ExportExcelModal({
  open,
  filters,
  filteredTotal,
  allTotal,
  exporting,
  onClose,
  onExport,
}: ExportExcelModalProps) {
  const [scope, setScope] = useState<'filtered' | 'all'>('filtered');
  const [includeQrColumn, setIncludeQrColumn] = useState(true);

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (filters.year) parts.push(`Year ${filters.year}`);
    if (filters.category) parts.push(filters.category);
    if (filters.health) {
      parts.push(filters.health === 'NotUsedOld' ? 'Not used (old)' : filters.health);
    }
    if (filters.q.trim()) parts.push(`Search “${filters.q.trim()}”`);
    return parts.length ? parts.join(' · ') : 'No filters applied';
  }, [filters]);

  const rowEstimate = scope === 'filtered' ? filteredTotal : allTotal;

  return (
    <AssetsModal
      open={open}
      title="Export to Excel"
      subtitle="Download the asset register as .xlsx"
      icon={<FileSpreadsheet size={18} className="text-primary" />}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={exporting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={exporting || rowEstimate === 0}
            onClick={() => void onExport({ scope, includeQrColumn })}
          >
            {exporting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Exporting…
              </>
            ) : (
              <>
                <Download size={16} /> Download Excel
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-slate-50/80 px-4 py-3 text-sm">
          <p className="font-medium text-navy">Current filters</p>
          <p className="mt-1 text-muted">{filterSummary}</p>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Export scope
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                {
                  id: 'filtered' as const,
                  title: 'Filtered view',
                  desc: `${formatNumber(filteredTotal)} rows matching current filters`,
                },
                {
                  id: 'all' as const,
                  title: 'Full register',
                  desc: `${formatNumber(allTotal)} rows across all years`,
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setScope(opt.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  scope === opt.id
                    ? 'border-navy bg-navy text-white shadow-md'
                    : 'border-border bg-white hover:border-primary/40'
                }`}
              >
                <p className="text-sm font-semibold">{opt.title}</p>
                <p className={`mt-1 text-xs ${scope === opt.id ? 'text-white/80' : 'text-muted'}`}>
                  {opt.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border px-4 py-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={includeQrColumn}
            onChange={(e) => setIncludeQrColumn(e.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium text-navy">Include QR scan codes</span>
            <span className="text-xs text-muted">
              Adds a column with scannable asset codes for label printing.
            </span>
          </span>
        </label>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
          Ready to export up to <strong>{formatNumber(Math.min(rowEstimate, 2000))}</strong> rows
          {rowEstimate > 2000 ? ' (capped at 2,000 for performance)' : ''}.
        </div>
      </div>
    </AssetsModal>
  );
}
