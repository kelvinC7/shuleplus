'use client';

import { ChevronLeft, ChevronRight, ChevronsUpDown, Eye, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

export interface DeviceTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  hideOnMobile?: boolean;
  render: (row: T) => ReactNode;
}

interface DeviceDataTableProps<T> {
  columns: DeviceTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  selected?: Set<string>;
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
  allSelected?: boolean;
  page?: number;
  totalPages?: number;
  total?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  canDelete?: (row: T) => boolean;
  canEdit?: (row: T) => boolean;
  minWidth?: number;
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

export function DeviceDataTable<T>({
  columns,
  data,
  rowKey,
  selected,
  onSelectRow,
  onSelectAll,
  allSelected,
  page = 1,
  totalPages = 1,
  total,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  loading,
  emptyMessage = 'No records found',
  emptyAction,
  onView,
  onEdit,
  onDelete,
  canDelete,
  canEdit,
  minWidth = 720,
}: DeviceDataTableProps<T>) {
  const showSelection = Boolean(onSelectRow);
  const showActions = Boolean(onView || onEdit || onDelete);
  const count = total ?? data.length;
  const from = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);

  return (
    <div className="hr-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-border bg-slate-50/80">
              {showSelection && (
                <th className="w-10 px-3 py-3 sm:px-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onSelectAll}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-3 text-xs font-medium uppercase tracking-[0.04em] text-muted sm:px-4 ${col.hideOnMobile ? 'hidden md:table-cell' : ''} ${col.className ?? ''}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable ? <ChevronsUpDown size={14} className="text-muted/70" /> : null}
                  </span>
                </th>
              ))}
              {showActions && (
                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-[0.04em] text-muted sm:px-4">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (showSelection ? 1 : 0) + (showActions ? 1 : 0)}
                  className="px-4 py-12 text-center text-muted"
                >
                  Loading…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showSelection ? 1 : 0) + (showActions ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
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
                    className="border-b border-border/70 transition hover:bg-slate-50/60 last:border-0"
                  >
                    {showSelection && (
                      <td className="px-3 py-3.5 sm:px-4">
                        <input
                          type="checkbox"
                          checked={selected?.has(id)}
                          onChange={() => onSelectRow?.(id)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-3.5 sm:px-4 ${col.hideOnMobile ? 'hidden md:table-cell' : ''} ${col.className ?? ''}`}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                    {showActions && (
                      <td className="px-3 py-3.5 sm:px-4">
                        <div className="flex items-center justify-end gap-0.5">
                          {onView ? (
                            <button
                              type="button"
                              onClick={() => onView(row)}
                              title="View"
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-sky-50 hover:text-sky-700"
                              aria-label="View"
                            >
                              <Eye size={16} />
                            </button>
                          ) : null}
                          {onEdit ? (
                            <button
                              type="button"
                              onClick={() => onEdit(row)}
                              disabled={canEdit ? !canEdit(row) : false}
                              title="Edit"
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-35"
                              aria-label="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                          ) : null}
                          {onDelete ? (
                            <button
                              type="button"
                              onClick={() => onDelete(row)}
                              disabled={canDelete ? !canDelete(row) : false}
                              title="Delete"
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-35"
                              aria-label="Delete"
                            >
                              <Trash2 size={16} />
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

      {count > 0 && onPageChange ? (
        <div className="flex flex-col gap-3 border-t border-border px-3 py-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p>
            Showing <span className="font-medium text-navy">{from}</span> to{' '}
            <span className="font-medium text-navy">{to}</span> of{' '}
            <span className="font-medium text-navy">{count.toLocaleString()}</span> results
          </p>
          <div className="flex flex-wrap items-center gap-2">
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
                  className={`min-w-[32px] rounded-lg px-2 py-1.5 font-medium transition ${
                    p === page ? 'bg-primary text-navy shadow-sm' : 'text-muted hover:bg-slate-50 hover:text-navy'
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
            {onPageSizeChange ? (
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-medium text-navy"
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
