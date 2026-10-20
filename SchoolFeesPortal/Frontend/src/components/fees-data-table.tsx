'use client';

import { ChevronLeft, ChevronRight, ChevronsUpDown, Eye, MoreVertical, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

export interface FeesTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => ReactNode;
}

interface FeesDataTableProps<T> {
  columns: FeesTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  selected?: Set<string>;
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
  allSelected?: boolean;
  isRowDisabled?: (row: T) => boolean;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onMore?: (row: T) => void;
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

export function FeesDataTable<T>({
  columns,
  data,
  rowKey,
  selected,
  onSelectRow,
  onSelectAll,
  allSelected,
  isRowDisabled,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  loading,
  emptyMessage = 'No records found',
  emptyAction,
  onView,
  onEdit,
  onMore,
  onRowClick,
}: FeesDataTableProps<T>) {
  const showSelection = Boolean(onSelectRow);
  const showActions = Boolean(onView || onEdit || onMore);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="hr-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/80">
              {showSelection && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onSelectAll}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 font-semibold text-navy ${col.className ?? ''}`}>
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable ? <ChevronsUpDown size={14} className="text-muted" /> : null}
                  </span>
                </th>
              ))}
              {showActions && (
                <th className="px-4 py-3 text-right font-semibold text-navy">Actions</th>
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
                const disabled = isRowDisabled?.(row);
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={`border-b border-border/70 transition last:border-0 ${
                      onRowClick ? 'cursor-pointer hover:bg-primary/[0.03]' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {showSelection && (
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selected?.has(id)}
                          onChange={() => onSelectRow?.(id)}
                          disabled={disabled}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 disabled:opacity-40"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3.5 ${col.className ?? ''}`}>
                        {col.render(row)}
                      </td>
                    ))}
                    {showActions && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {onView ? (
                            <button
                              type="button"
                              onClick={() => onView(row)}
                              className="rounded-lg p-2 text-muted transition hover:bg-slate-100 hover:text-navy"
                              aria-label="View"
                            >
                              <Eye size={16} />
                            </button>
                          ) : null}
                          {onEdit ? (
                            <button
                              type="button"
                              onClick={() => onEdit(row)}
                              className="rounded-lg p-2 text-muted transition hover:bg-slate-100 hover:text-navy"
                              aria-label="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                          ) : null}
                          {onMore ? (
                            <button
                              type="button"
                              onClick={() => onMore(row)}
                              className="rounded-lg p-2 text-muted transition hover:bg-slate-100 hover:text-navy"
                              aria-label="More"
                            >
                              <MoreVertical size={16} />
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

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted sm:px-5">
          <p>
            Showing <span className="font-medium text-navy">{from}</span> to{' '}
            <span className="font-medium text-navy">{to}</span> of{' '}
            <span className="font-medium text-navy">{total.toLocaleString()}</span> results
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
                <span key={`ellipsis-${i}`} className="px-1">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-[32px] rounded-lg px-2 py-1.5 font-medium transition ${
                    p === page
                      ? 'bg-primary text-navy shadow-sm'
                      : 'text-muted hover:bg-slate-50 hover:text-navy'
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
          {onPageSizeChange ? (
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-medium text-navy"
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          ) : null}
        </div>
      )}
    </div>
  );
}

const AVATAR_COLORS = [
  'bg-amber-100 text-amber-800',
  'bg-blue-100 text-blue-800',
  'bg-violet-100 text-violet-800',
  'bg-emerald-100 text-emerald-800',
  'bg-rose-100 text-rose-800',
  'bg-cyan-100 text-cyan-800',
];

export function AvatarInitials({ name, seed }: { name: string; seed?: string }) {
  const parts = name.split(' ').filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  const colorIndex = (seed ?? name).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${AVATAR_COLORS[colorIndex]}`}
    >
      {initials || '?'}
    </span>
  );
}

export function PillBadge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'blue' | 'violet' | 'amber';
}) {
  const tones = {
    default: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
