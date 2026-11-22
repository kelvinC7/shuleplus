'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export interface TransportTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

interface TransportDataTableProps<T> {
  columns: TransportTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  renderActions?: (row: T) => ReactNode;
}

function pageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

export function TransportDataTable<T>({
  columns,
  data,
  rowKey,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  loading,
  emptyMessage = 'No records yet',
  emptyAction,
  renderActions,
}: TransportDataTableProps<T>) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const colSpan = columns.length + (renderActions ? 1 : 0);

  return (
    <div className="hr-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-gradient-to-r from-slate-50 to-white">
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-navy/70 ${col.className ?? ''}`}>
                  {col.header}
                </th>
              ))}
              {renderActions ? (
                <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wide text-navy/70">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-16 text-center text-muted">
                  Loading fleet…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-16 text-center">
                  <p className="text-muted">{emptyMessage}</p>
                  {emptyAction ? <div className="mt-4">{emptyAction}</div> : null}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-border/60 transition hover:bg-primary/[0.03] last:border-0"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3.5 align-middle ${col.className ?? ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                  {renderActions ? (
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex flex-wrap items-center justify-end gap-1">{renderActions(row)}</div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <p>
              Showing <span className="font-semibold text-navy">{from}</span>–
              <span className="font-semibold text-navy">{to}</span> of{' '}
              <span className="font-semibold text-navy">{total.toLocaleString()}</span>
            </p>
            {onPageSizeChange ? (
              <label className="inline-flex items-center gap-2">
                <span>Rows</span>
                <select
                  className="rounded-lg border border-border bg-white px-2 py-1 text-navy"
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                >
                  {[10, 15, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-lg border border-border p-1.5 transition hover:bg-slate-50 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            {pageNumbers(page, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`e-${i}`} className="px-1">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-[2rem] rounded-lg px-2 py-1.5 font-semibold transition ${
                    p === page ? 'bg-navy text-primary' : 'border border-transparent text-navy hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="rounded-lg border border-border p-1.5 transition hover:bg-slate-50 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
