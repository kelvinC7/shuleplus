'use client';

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface NesaTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

interface NesaDataTableProps<T> {
  columns: NesaTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  toolbar?: ReactNode;
  title?: string;
  subtitle?: string;
}

export function NesaDataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No records found.',
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  toolbar,
  title,
  subtitle,
}: NesaDataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
      {(title || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/8 px-5 py-4">
          <div>
            {title ? <h2 className="text-sm font-bold text-navy">{title}</h2> : null}
            {subtitle ? <p className="mt-0.5 text-xs text-navy/45">{subtitle}</p> : null}
          </div>
          {toolbar}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-navy/8 bg-gradient-to-r from-navy/[0.03] to-transparent">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.06em] text-navy/40 ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16 text-center text-sm text-navy/40">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16 text-center text-sm text-navy/40">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={rowKey(row)}
                  className={`border-b border-navy/[0.06] transition hover:bg-primary/[0.06] ${
                    i % 2 === 1 ? 'bg-navy/[0.015]' : 'bg-white'
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-3.5 text-[13px] text-navy ${col.className ?? ''}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy/8 bg-navy/[0.015] px-5 py-3">
        <p className="text-xs text-navy/45">
          Showing <span className="font-semibold text-navy">{from}</span>–
          <span className="font-semibold text-navy">{to}</span> of{' '}
          <span className="font-semibold text-navy">{total}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex items-center gap-1 rounded-xl border border-navy/10 bg-white px-3 py-1.5 text-xs font-semibold text-navy disabled:opacity-35"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span className="rounded-lg bg-navy px-2.5 py-1 text-[11px] font-bold text-primary">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex items-center gap-1 rounded-xl border border-navy/10 bg-white px-3 py-1.5 text-xs font-semibold text-navy disabled:opacity-35"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function StatusPill({
  status,
  tone,
}: {
  status: string;
  tone?: 'success' | 'danger' | 'warn' | 'muted';
}) {
  const map =
    tone ??
    (() => {
      const s = status.toUpperCase();
      if (['ACTIVE', 'PUBLISHED', 'APPROVED'].includes(s)) return 'success' as const;
      if (['REJECTED', 'SUSPENDED', 'DISABLED', 'ARCHIVED'].includes(s)) return 'danger' as const;
      if (['PENDING', 'DRAFT'].includes(s)) return 'warn' as const;
      return 'muted' as const;
    })();

  const cls =
    map === 'success'
      ? 'bg-success/10 text-success'
      : map === 'danger'
        ? 'bg-danger/10 text-danger'
        : map === 'warn'
          ? 'bg-primary/20 text-navy'
          : 'bg-navy/5 text-navy/65';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>
      {status}
    </span>
  );
}
