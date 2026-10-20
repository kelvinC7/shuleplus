'use client';

import { ChevronLeft, ChevronRight, Eye, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

export interface LibTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

interface LibDataTableProps<T> {
  columns: LibTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  page?: number;
  totalPages?: number;
  total?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onRowClick?: (row: T) => void;
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

export function LibDataTable<T>({
  columns,
  data,
  rowKey,
  page = 1,
  totalPages = 1,
  total,
  pageSize = 20,
  onPageChange,
  loading,
  emptyMessage = 'No records found',
  emptyAction,
  onView,
  onEdit,
  onDelete,
  onRowClick,
}: LibDataTableProps<T>) {
  const showActions = Boolean(onView || onEdit || onDelete);
  const recordTotal = total ?? data.length;
  const from = recordTotal === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, recordTotal);

  return (
    <div className="hr-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-slate-50/80">
              {columns.map((col) => (
                <th key={col.key} className={`px-5 py-3.5 font-semibold text-navy ${col.className ?? ''}`}>
                  {col.header}
                </th>
              ))}
              {showActions && (
                <th className="px-5 py-3.5 text-right font-semibold text-navy">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (showActions ? 1 : 0)} className="px-5 py-12 text-center text-muted">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (showActions ? 1 : 0)} className="px-5 py-12 text-center">
                  <p className="text-muted">{emptyMessage}</p>
                  {emptyAction ? <div className="mt-4">{emptyAction}</div> : null}
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const id = rowKey(row);
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={`border-b border-border/40 transition-colors last:border-0 ${
                      onRowClick ? 'cursor-pointer hover:bg-primary/[0.03]' : 'hover:bg-slate-50/50'
                    }`}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={`px-5 py-3.5 ${col.className ?? ''}`}>
                        {col.render(row)}
                      </td>
                    ))}
                    {showActions && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {onView ? (
                            <button
                              type="button"
                              onClick={() => onView(row)}
                              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-slate-100 hover:text-navy"
                              title="View"
                            >
                              <Eye size={15} />
                            </button>
                          ) : null}
                          {onEdit ? (
                            <button
                              type="button"
                              onClick={() => onEdit(row)}
                              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-slate-100 hover:text-navy"
                              title="Edit"
                            >
                              <Pencil size={15} />
                            </button>
                          ) : null}
                          {onDelete ? (
                            <button
                              type="button"
                              onClick={() => onDelete(row)}
                              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-danger"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {onPageChange && recordTotal > 0 && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 px-5 py-3.5 text-xs text-muted">
          <p>
            Showing <span className="font-medium text-navy">{from}</span>–
            <span className="font-medium text-navy">{to}</span> of{' '}
            <span className="font-medium text-navy">{recordTotal.toLocaleString()}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-lg border border-border p-1.5 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            {pageNumbers(page, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-[32px] rounded-lg px-2 py-1.5 font-semibold transition ${
                    p === page ? 'bg-navy text-primary' : 'text-muted hover:bg-slate-100'
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
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
