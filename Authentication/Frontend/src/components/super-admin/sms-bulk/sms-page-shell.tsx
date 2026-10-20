'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export const smsInputClass =
  'w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-primary';

export const smsSelectClass =
  'rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-primary';

export const smsBtnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed';

export const smsBtnNavy =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-navy px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-light disabled:opacity-50 disabled:cursor-not-allowed';

export const smsBtnOutline =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-medium text-navy transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed';

export function SmsPageShell({
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

export function SmsCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

const STAT_TONES = {
  navy: 'bg-navy/10 text-navy',
  sky: 'bg-sky-100 text-sky-800',
  amber: 'bg-amber-100 text-amber-800',
  emerald: 'bg-emerald-100 text-emerald-800',
  rose: 'bg-rose-100 text-rose-800',
  violet: 'bg-violet-100 text-violet-800',
};

export function SmsStatCard({
  icon,
  label,
  value,
  hint,
  tone = 'navy',
}: {
  icon?: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  tone?: keyof typeof STAT_TONES;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        {icon ? (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${STAT_TONES[tone]}`}>
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="truncate text-xl font-semibold text-navy">{value}</p>
          {hint ? <p className="truncate text-[11px] text-muted/80">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}

const STATUS_MAP: Record<string, string> = {
  DELIVERED: 'bg-emerald-50 text-emerald-800',
  ACTIVE: 'bg-emerald-50 text-emerald-800',
  APPROVED: 'bg-emerald-50 text-emerald-800',
  COMPLETED: 'bg-emerald-50 text-emerald-800',
  SENT: 'bg-emerald-50 text-emerald-800',
  PAID: 'bg-emerald-50 text-emerald-800',
  CONNECTED: 'bg-emerald-50 text-emerald-800',
  OPERATIONAL: 'bg-emerald-50 text-emerald-800',
  PROCESSING: 'bg-sky-50 text-sky-800',
  SENDING: 'bg-sky-50 text-sky-800',
  SCHEDULED: 'bg-sky-50 text-sky-800',
  PENDING: 'bg-amber-50 text-amber-800',
  DRAFT: 'bg-slate-100 text-slate-700',
  INACTIVE: 'bg-slate-100 text-slate-700',
  ARCHIVED: 'bg-slate-100 text-slate-700',
  FAILED: 'bg-rose-50 text-rose-700',
  REJECTED: 'bg-rose-50 text-rose-700',
  CANCELLED: 'bg-rose-50 text-rose-700',
  PARTIAL: 'bg-amber-50 text-amber-800',
  UNPAID: 'bg-rose-50 text-rose-700',
  DEADLINE_SOON: 'bg-amber-50 text-amber-800',
  TRANSFERRED: 'bg-sky-50 text-sky-800',
  GRADUATED: 'bg-violet-50 text-violet-800',
};

export function SmsStatusPill({ status }: { status: string }) {
  const s = String(status || '').toUpperCase();
  const cls = STATUS_MAP[s] ?? 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {status || '—'}
    </span>
  );
}

export function SmsTable({
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

export function SmsDataPanel({
  loading,
  loadingLabel = 'Loading…',
  children,
}: {
  loading?: boolean;
  loadingLabel?: string;
  children?: ReactNode;
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

export function SmsPagination({
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
        <span className="px-2 text-xs font-medium text-muted">
          Page {page} of {totalPages}
        </span>
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

export function SmsSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-navy">
      <span className="h-4 w-1 rounded-full bg-primary" />
      {children}
    </h2>
  );
}
