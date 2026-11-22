'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

/** Mobile card placement (defaults to labeled grid row). */
export type RecordsColumnMobileRole =
  | 'default'
  | 'header-trailing'
  | 'chip'
  | 'plain'
  | 'footer';

export interface RecordsColumn<T> {
  key: string;
  header: string;
  className?: string;
  mobileLabel?: string;
  /** Hide the uppercase field label on mobile (plain / chip rows). */
  mobileHideLabel?: boolean;
  mobileRole?: RecordsColumnMobileRole;
  hideOnMobile?: boolean;
  render: (row: T, index: number) => ReactNode;
}

interface TransportRecordsTableProps<T> {
  columns: RecordsColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  showIndex?: boolean;
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

export function TransportRecordsTable<T>({
  columns,
  rows,
  rowKey,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  loading,
  emptyMessage = 'No records',
  onRowClick,
  showIndex = true,
}: TransportRecordsTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const colSpan = columns.length + (showIndex ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-gradient-to-r from-[#000435] to-[#0a1454] text-[11px] font-semibold uppercase tracking-wide text-white">
              {showIndex ? <th className="w-12 px-3 py-3.5">#</th> : null}
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3.5 ${col.className ?? ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const globalIndex = (page - 1) * pageSize + idx + 1;
                return (
                  <tr
                    key={rowKey(row)}
                    className={`border-b border-slate-100 transition last:border-0 ${
                      onRowClick ? 'cursor-pointer hover:bg-[#FCB038]/8' : 'hover:bg-slate-50/80'
                    }`}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? 'button' : undefined}
                  >
                    {showIndex ? (
                      <td className="px-3 py-3 text-center text-xs font-bold tabular-nums text-muted">
                        {globalIndex}
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 align-middle ${col.className ?? ''}`}>
                        {col.render(row, globalIndex)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2.5 bg-slate-50/80 p-3 md:hidden">
        {loading ? (
          <p className="rounded-xl bg-white px-4 py-10 text-center text-sm text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="rounded-xl bg-white px-4 py-10 text-center text-sm text-muted">{emptyMessage}</p>
        ) : (
          rows.map((row, idx) => {
            const globalIndex = (page - 1) * pageSize + idx + 1;
            const primary = columns[0];
            const trailing = columns.find((c) => c.mobileRole === 'header-trailing' && !c.hideOnMobile);
            const bodyCols = columns.filter(
              (c) =>
                c !== primary &&
                c !== trailing &&
                !c.hideOnMobile &&
                c.mobileRole !== 'header-trailing' &&
                c.mobileRole !== 'footer'
            );
            const footerCols = columns.filter((c) => c.mobileRole === 'footer' && !c.hideOnMobile);
            const defaultCols = bodyCols.filter((c) => !c.mobileRole || c.mobileRole === 'default');
            const structuredCols = bodyCols.filter(
              (c) => c.mobileRole && c.mobileRole !== 'default'
            );

            const inner = (
              <article className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                <header className="flex items-start gap-3">
                  {showIndex ? (
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#000435]/[0.06] text-xs font-bold tabular-nums text-[#000435]"
                      aria-hidden
                    >
                      {globalIndex}
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">{primary?.render(row, globalIndex)}</div>
                  {trailing ? (
                    <div className="shrink-0 pt-0.5">{trailing.render(row, globalIndex)}</div>
                  ) : null}
                </header>

                {structuredCols.length > 0 ? (
                  <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3">
                    {structuredCols.map((col) => {
                      const role = col.mobileRole;
                      if (role === 'chip') {
                        return (
                          <div key={col.key} className="flex flex-wrap items-center gap-2">
                            {col.render(row, globalIndex)}
                          </div>
                        );
                      }
                      if (role === 'plain') {
                        return (
                          <div key={col.key} className="text-sm leading-snug text-[#000435]">
                            {col.render(row, globalIndex)}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                ) : null}

                {defaultCols.length > 0 ? (
                  <dl className="mt-3 space-y-2.5 border-t border-slate-100 pt-3">
                    {defaultCols.map((col) => (
                      <div key={col.key}>
                        {!col.mobileHideLabel ? (
                          <dt className="text-[11px] font-medium text-muted">
                            {col.mobileLabel ?? col.header}
                          </dt>
                        ) : null}
                        <dd className={col.mobileHideLabel ? '' : 'mt-0.5'}>{col.render(row, globalIndex)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {footerCols.length > 0 ? (
                  <footer className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-xs text-muted">
                    {footerCols.map((col) => (
                      <span key={col.key} className="tabular-nums">
                        {col.render(row, globalIndex)}
                      </span>
                    ))}
                  </footer>
                ) : null}
              </article>
            );

            return onRowClick ? (
              <button
                key={rowKey(row)}
                type="button"
                className="block w-full text-left active:opacity-95"
                onClick={() => onRowClick(row)}
              >
                {inner}
              </button>
            ) : (
              <div key={rowKey(row)}>{inner}</div>
            );
          })
        )}
      </div>

      {total > 0 ? (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <p>
              <span className="font-semibold text-[#000435]">{from}</span>
              {'–'}
              <span className="font-semibold text-[#000435]">{to}</span> of{' '}
              <span className="font-semibold text-[#000435]">{total.toLocaleString()}</span>
            </p>
            {onPageSizeChange ? (
              <label className="inline-flex items-center gap-1.5">
                <span>Per page</span>
                <select
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[#000435]"
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
          <div className="flex items-center justify-center gap-1 sm:justify-end">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-lg border border-slate-200 bg-white p-2 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            {pageNumbers(page, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`e-${i}`} className="px-1 text-muted">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-[2.25rem] rounded-lg px-2 py-1.5 text-xs font-bold transition ${
                    p === page
                      ? 'bg-[#000435] text-[#FCB038]'
                      : 'bg-white text-[#000435] ring-1 ring-slate-200 hover:bg-slate-100'
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
              className="rounded-lg border border-slate-200 bg-white p-2 disabled:opacity-40"
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
