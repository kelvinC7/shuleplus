'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, Search, ArrowUp, ArrowDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { EmptyState } from './empty-state';

/**
 * DataTable — one standard table for the whole ERP, restyled to the HR module's
 * glass-card table: slate-50 header, hover rows, numbered gold pagination.
 */

export interface Column<T> {
  /** Key into the row, or a unique id when using a custom `render`. */
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  className?: string;
  /** Value used for search/sort when different from row[key]. */
  accessor?: (row: T) => string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId?: (row: T, index: number) => string | number;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  zebra?: boolean;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

function defaultAccessor<T>(row: T, col: Column<T>): string | number {
  if (col.accessor) return col.accessor(row);
  const v = (row as Record<string, unknown>)[col.key as string];
  if (v == null) return '';
  return typeof v === 'number' ? v : String(v);
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

export function DataTable<T>({
  columns,
  data,
  getRowId,
  searchable = true,
  searchPlaceholder = 'Search...',
  pageSize = 8,
  zebra = false,
  onRowClick,
  emptyTitle = 'No results',
  emptyDescription = 'Try adjusting your search or filters.',
  className,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => String(defaultAccessor(row, col)).toLowerCase().includes(q))
    );
  }, [data, query, columns]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => String(c.key) === sort.key);
    if (!col) return filtered;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = defaultAccessor(a, col);
      const bv = defaultAccessor(b, col);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      return String(av).localeCompare(String(bv)) * factor;
    });
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  React.useEffect(() => {
    setPage(1);
  }, [query, sort]);

  function toggleSort(col: Column<T>) {
    if (!col.sortable) return;
    const key = String(col.key);
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  }

  const alignClass = (align?: Column<T>['align']) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  const from = sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, sorted.length);

  return (
    <div className={cn('space-y-4', className)}>
      {searchable ? (
        <div className="relative max-w-xs">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-border bg-[#f4f6fb] py-2.5 pr-4 pl-10 text-sm text-navy outline-none transition placeholder:text-muted/70 focus:border-primary/50 focus:bg-white focus:shadow-sm"
          />
        </div>
      ) : null}

      <div className="hr-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/80">
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className={cn('px-4 py-3 font-semibold text-navy', alignClass(col.align), col.className)}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        className={cn(
                          'inline-flex items-center gap-1 transition-colors hover:text-primary',
                          col.align === 'right' && 'flex-row-reverse'
                        )}
                      >
                        {col.header}
                        {sort?.key === String(col.key) ? (
                          sort.dir === 'asc' ? (
                            <ArrowUp className="size-3.5 text-primary" />
                          ) : (
                            <ArrowDown className="size-3.5 text-primary" />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3.5 text-muted" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12">
                    <EmptyState title={emptyTitle} description={emptyDescription} className="rounded-none border-0 shadow-none" />
                  </td>
                </tr>
              ) : (
                paged.map((row, i) => (
                  <tr
                    key={getRowId ? String(getRowId(row, i)) : i}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-b border-border/70 transition hover:bg-slate-50/60 last:border-0',
                      zebra && i % 2 === 1 && 'bg-slate-50/30',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={String(col.key)}
                        className={cn('px-4 py-3.5', alignClass(col.align), col.className)}
                      >
                        {col.render ? col.render(row) : String(defaultAccessor(row, col))}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {sorted.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted sm:px-5">
            <p>
              Showing <span className="font-medium text-navy">{from}</span> to{' '}
              <span className="font-medium text-navy">{to}</span> of{' '}
              <span className="font-medium text-navy">{sorted.length.toLocaleString()}</span> results
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-border p-1.5 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              {pageNumbers(currentPage, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={cn(
                      'min-w-[32px] rounded-lg px-2 py-1.5 font-medium transition',
                      p === currentPage
                        ? 'bg-primary text-navy shadow-sm'
                        : 'text-muted hover:bg-slate-50 hover:text-navy'
                    )}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-border p-1.5 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
