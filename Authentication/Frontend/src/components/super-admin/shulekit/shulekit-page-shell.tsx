'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export const skInputClass =
  'w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-primary';

export const skSearchInputClass =
  'w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-3 text-sm text-navy outline-none focus:border-primary';

export const skSelectClass =
  'rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-primary';

export const skBtnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-navy shadow-sm disabled:opacity-50';

export const skBtnNavy =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-navy px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50';

export const skBtnOutline =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-medium text-navy disabled:opacity-50';

export function ShuleKitPageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-navy sm:text-2xl">{title}</h1>
          {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function ShuleKitFilterCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-white p-3 shadow-sm sm:p-4 ${className}`}>
      {children}
    </section>
  );
}

export function ShuleKitStatCard({
  icon,
  label,
  value,
  tone = 'navy',
}: {
  icon?: ReactNode;
  label: string;
  value: string | number;
  tone?: 'navy' | 'sky' | 'amber' | 'emerald' | 'rose';
}) {
  const tones = {
    navy: 'bg-navy/10 text-navy',
    sky: 'bg-sky-100 text-sky-800',
    amber: 'bg-amber-100 text-amber-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    rose: 'bg-rose-100 text-rose-800',
  };
  return (
    <div className="rounded-2xl border border-border bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        {icon ? (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="truncate text-xl font-semibold text-navy">{value}</p>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Prefer ShuleKitStatCard */
export function ShuleKitStat({ label, value }: { label: string; value: string | number }) {
  return <ShuleKitStatCard label={label} value={value} />;
}

export function ShuleKitStatusPill({ status }: { status: string }) {
  const s = String(status || '').toUpperCase();
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-800',
    AVAILABLE: 'bg-emerald-50 text-emerald-800',
    PAID: 'bg-emerald-50 text-emerald-800',
    APPROVED: 'bg-emerald-50 text-emerald-800',
    DELIVERED: 'bg-emerald-50 text-emerald-800',
    CONFIRMED: 'bg-sky-50 text-sky-800',
    PROCESSING: 'bg-sky-50 text-sky-800',
    PACKED: 'bg-sky-50 text-sky-800',
    ASSIGNED: 'bg-sky-50 text-sky-800',
    IN_TRANSIT: 'bg-amber-50 text-amber-800',
    OUT_FOR_DELIVERY: 'bg-amber-50 text-amber-800',
    PENDING: 'bg-amber-50 text-amber-800',
    SHIPPED: 'bg-indigo-50 text-indigo-800',
    INACTIVE: 'bg-rose-50 text-rose-700',
    CANCELLED: 'bg-rose-50 text-rose-700',
    REFUNDED: 'bg-rose-50 text-rose-700',
    FAILED: 'bg-rose-50 text-rose-700',
    ARCHIVED: 'bg-slate-100 text-slate-700',
  };
  const cls = map[s] ?? 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {status || '—'}
    </span>
  );
}

export function ShuleKitIconBtn({
  children,
  onClick,
  label,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
        danger
          ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
          : 'border-border text-navy hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

export function ShuleKitPagination({
  page,
  totalPages,
  from,
  to,
  total,
  noun = 'records',
  onPageChange,
}: {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  noun?: string;
  onPageChange: (page: number) => void;
}) {
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1);
  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted">
        Showing {from} to {to} of {total} {noun}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-navy disabled:opacity-40"
        >
          Previous
        </button>
        {pages.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPageChange(n)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold ${
              n === page ? 'bg-navy text-white' : 'border border-border text-navy'
            }`}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-navy disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function ShuleKitDataPanel({
  loading,
  loadingLabel = 'Loading…',
  children,
}: {
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> {loadingLabel}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

export function ShuleKitTable({
  headers,
  children,
  empty,
  emptyLabel = 'No records',
}: {
  headers: string[];
  children: ReactNode;
  empty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
          <tr>
            {headers.map((h) => (
              <th key={h || 'actions'} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-12 text-center text-muted">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
