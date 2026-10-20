'use client';

import { Loader2, Package, Printer, X } from 'lucide-react';
import type { CardRecord, PersonKind } from '@/services/print-card-api';

type Props = {
  kind: PersonKind;
  count: number;
  records: CardRecord[];
  alreadyPrintedCount: number;
  exporting: boolean;
  onPrint: () => void;
  onExportZip: () => void;
  onClear: () => void;
  onRemove: (id: string) => void;
};

export function PrintSelectionBar({
  kind,
  count,
  records,
  alreadyPrintedCount,
  exporting,
  onPrint,
  onExportZip,
  onClear,
  onRemove,
}: Props) {
  if (count === 0) return null;

  const label = kind === 'STUDENT' ? 'students' : 'staff';
  const preview = records.slice(0, 4);
  const more = records.length - preview.length;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-gradient-to-r from-[#000435] via-[#0a1654] to-[#000435] px-4 py-3 shadow-[0_-8px_32px_rgba(0,4,53,0.35)] sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Ready to print</p>
            <p className="text-lg font-bold text-white">
              {count} {label}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={onExportZip}
              className="rounded-xl border border-white/20 bg-white/10 p-2.5 text-white disabled:opacity-50"
              aria-label="Download ZIP"
            >
              {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Package className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FCB038] px-4 py-2.5 text-sm font-bold text-[#000435]"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      <div className="hidden border-b border-primary/20 bg-gradient-to-br from-primary/10 via-white to-navy/[0.03] px-4 py-4 sm:block">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl bg-navy px-3 text-sm font-bold text-primary">
                {count}
              </span>
              <div>
                <p className="text-sm font-bold text-navy">Selected for printing</p>
                <p className="text-xs text-muted">
                  {count} {label}
                  {alreadyPrintedCount > 0 ? ` · ${alreadyPrintedCount} already printed (reprint if you continue)` : ''}
                </p>
              </div>
            </div>
            <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
              {preview.map((r) => (
                <span
                  key={r.id}
                  className="inline-flex max-w-[200px] items-center gap-1 truncate rounded-full border border-navy/10 bg-white px-2.5 py-1 text-xs font-medium text-navy shadow-sm"
                  title={r.fullName}
                >
                  <span className="truncate">{r.fullName}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(r.id)}
                    className="shrink-0 rounded p-0.5 text-muted hover:text-red-600"
                    aria-label={`Remove ${r.fullName}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {more > 0 && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-muted">
                  +{more} more
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClear}
              className="rounded-xl border border-border bg-white px-3 py-2.5 text-xs font-semibold text-muted hover:text-navy"
            >
              Clear all
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={onExportZip}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
              Download ZIP
            </button>
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FCB038] px-5 py-2.5 text-sm font-bold text-[#000435] shadow-md transition hover:brightness-105"
            >
              <Printer className="h-4 w-4" />
              Print {count} card{count === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
