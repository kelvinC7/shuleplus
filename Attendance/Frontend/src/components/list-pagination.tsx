'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export function ListPagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 border-t border-border bg-slate-50/50 px-3 py-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <p>
        <span className="font-medium text-navy">{from}</span>–<span className="font-medium text-navy">{to}</span> of{' '}
        <span className="font-medium text-navy">{total.toLocaleString()}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-1.5 font-medium text-navy shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <span className="min-w-[4.5rem] rounded-lg bg-white px-2 py-1 text-center font-semibold text-navy shadow-sm">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-1.5 font-medium text-navy shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
        >
          Next <ChevronRight size={14} />
        </button>
        {onLimitChange ? (
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-medium text-navy"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  );
}
