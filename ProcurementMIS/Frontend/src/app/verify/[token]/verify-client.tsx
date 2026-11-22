'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import {
  Ban,
  Building2,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  FileText,
  Link2,
  LoaderCircle,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  User,
} from 'lucide-react';
import { procurementApi } from '@/services/procurement-api';
import type {
  PublicVerificationResult,
  VerificationAuthenticity,
  VerificationItem,
} from '@/types';

type IconComponent = ComponentType<{ className?: string }>;

interface HeroConfig {
  gradient: string;
  ring: string;
  label: string;
  description: string;
  Icon: IconComponent;
}

const HERO: Record<VerificationAuthenticity, HeroConfig> = {
  VERIFIED: {
    gradient: 'from-emerald-600 via-emerald-600 to-emerald-700',
    ring: 'ring-emerald-500/30',
    label: 'Verified',
    description:
      'This document is authentic and its current status is confirmed in ShulePlus.',
    Icon: CircleCheck,
  },
  PENDING: {
    gradient: 'from-amber-500 via-amber-500 to-amber-600',
    ring: 'ring-amber-500/30',
    label: 'Pending',
    description:
      'This document is authentic, but its approval or processing is still in progress.',
    Icon: Clock,
  },
  REJECTED: {
    gradient: 'from-red-600 via-red-600 to-red-700',
    ring: 'ring-red-500/30',
    label: 'Rejected',
    description: 'This document is authentic, but it was rejected in ShulePlus.',
    Icon: CircleX,
  },
  CANCELLED: {
    gradient: 'from-slate-600 via-slate-600 to-slate-700',
    ring: 'ring-slate-500/30',
    label: 'Cancelled',
    description: 'This document is authentic, but it was cancelled in ShulePlus.',
    Icon: Ban,
  },
  INVALID: {
    gradient: 'from-red-700 via-red-700 to-red-800',
    ring: 'ring-red-500/30',
    label: 'Invalid',
    description:
      'We could not match this link to a procurement document. It may be invalid, mistyped, or no longer available.',
    Icon: CircleAlert,
  },
};

interface ColumnDef {
  key: keyof VerificationItem;
  label: string;
  align?: 'left' | 'right' | 'center';
  money?: boolean;
}

const ITEM_COLUMNS: ColumnDef[] = [
  { key: 'unit', label: 'Unit' },
  { key: 'quantity', label: 'Qty', align: 'right' },
  { key: 'orderedQty', label: 'Ordered', align: 'right' },
  { key: 'receivedQty', label: 'Received', align: 'right' },
  { key: 'returnQty', label: 'Returned', align: 'right' },
  { key: 'unitPrice', label: 'Unit price', align: 'right', money: true },
  { key: 'totalPrice', label: 'Total', align: 'right', money: true },
  { key: 'reason', label: 'Reason' },
];

function hasValue(item: VerificationItem, key: keyof VerificationItem): boolean {
  const value = item[key];
  return value !== null && value !== undefined && value !== '';
}

function formatQuantity(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(numeric);
}

function formatMoney(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric)} RWF`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy">{title}</h2>
        {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: IconComponent;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-[#f8fafc] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1.5 break-words text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}

function ItemsTable({ items }: { items: VerificationItem[] }) {
  const columns = useMemo(
    () => ITEM_COLUMNS.filter((column) => items.some((item) => hasValue(item, column.key))),
    [items],
  );

  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-navy text-left text-[11px] font-semibold uppercase tracking-wide text-white">
          <tr>
            <th className="px-3 py-2.5 text-left">#</th>
            <th className="px-3 py-2.5 text-left">Item</th>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-3 py-2.5 ${
                  column.align === 'right'
                    ? 'text-right'
                    : column.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={`${item.itemName}-${index}`}
              className="border-t border-border/70 odd:bg-white even:bg-[#f8fafc]"
            >
              <td className="px-3 py-2.5 text-right tabular-nums text-muted">{index + 1}</td>
              <td className="px-3 py-2.5 font-medium text-navy">{item.itemName}</td>
              {columns.map((column) => {
                const value = item[column.key];
                const display = column.money
                  ? formatMoney(value)
                  : column.key === 'reason' || column.key === 'unit'
                    ? value == null || value === ''
                      ? '—'
                      : String(value)
                    : formatQuantity(value);
                return (
                  <td
                    key={column.key}
                    className={`px-3 py-2.5 ${
                      column.align === 'right'
                        ? 'text-right tabular-nums'
                        : column.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                    } ${column.key === 'unitPrice' || column.key === 'totalPrice' ? 'font-semibold text-navy' : 'text-navy/80'}`}
                  >
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function VerifyClient({ token }: { token: string }) {
  const [data, setData] = useState<PublicVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await procurementApi.publicVerification.verify(token);
      setData(result);
    } catch {
      setData(null);
      setError(
        'The verification service could not be reached right now. Please check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const hero = HERO[data?.authenticity ?? 'INVALID'];
  const invalid = data?.authenticity === 'INVALID';

  const fields = data?.fields ?? [];
  const items = data?.items ?? [];
  const related = data?.related ?? [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_-10%,#fdf1d8_0%,#f8fafc_45%,#eef2f8_100%)]">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy text-primary shadow-soft">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-navy">ShulePlus</p>
              <p className="text-xs text-muted">Procurement Document Verification</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-muted ring-1 ring-border">
            <ScanLine className="h-3.5 w-3.5" />
            Secure verification
          </span>
        </header>

        <main className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_60px_-24px_rgba(0,4,53,0.35)] ring-1 ring-border">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-semibold text-navy">Verifying document…</p>
              <p className="text-xs text-muted">Checking the secure link against our records.</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <CircleAlert className="h-7 w-7" />
              </div>
              <h1 className="text-lg font-bold text-navy">Verification unavailable</h1>
              <p className="max-w-md text-sm text-muted">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="btn-primary mt-2 text-xs"
              >
                <RefreshCw className="h-4 w-4" /> Try again
              </button>
            </div>
          ) : (
            <>
              <div
                className={`relative overflow-hidden bg-gradient-to-br ${hero.gradient} px-5 py-8 text-white sm:px-8 sm:py-10`}
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-white/5" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-4 ${hero.ring}`}
                    >
                      <hero.Icon className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                        Authenticity status
                      </p>
                      <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
                        {hero.label}
                      </h1>
                      {data && !invalid ? (
                        <p className="mt-1 text-sm text-white/85">
                          {data.documentTypeLabel}
                          {data.reference ? ` · ${data.reference}` : ''}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {data && !invalid && data.statusLabel ? (
                    <span className="inline-flex w-fit items-center rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/25">
                      Current status: {data.statusLabel}
                    </span>
                  ) : null}
                </div>
                <p className="relative mt-4 max-w-2xl text-sm leading-relaxed text-white/85">
                  {hero.description}
                </p>
              </div>

              {data ? (
                <div className="space-y-7 px-5 py-7 sm:px-8 sm:py-8">
                  {!invalid ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <SummaryTile
                          icon={Building2}
                          label="Organization"
                          value={data.organization.name || '—'}
                        />
                        <SummaryTile
                          icon={FileText}
                          label="Department"
                          value={data.department || '—'}
                        />
                        <SummaryTile
                          icon={CalendarDays}
                          label="Created on"
                          value={formatDate(data.createdAt)}
                        />
                        <SummaryTile
                          icon={User}
                          label="Created by"
                          value={data.createdBy || '—'}
                        />
                      </div>

                      {fields.length > 0 ? (
                        <Section title="Document details">
                          <dl className="grid gap-x-6 gap-y-0 rounded-2xl border border-border sm:grid-cols-2">
                            {fields.map((field, index) => (
                              <div
                                key={`${field.label}-${index}`}
                                className="flex items-start justify-between gap-4 border-b border-border/70 px-4 py-3 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
                              >
                                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                                  {field.label}
                                </dt>
                                <dd className="max-w-[60%] break-words text-right text-sm font-semibold text-navy">
                                  {field.value || '—'}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </Section>
                      ) : null}

                      {items.length > 0 ? (
                        <Section
                          title="Items"
                          description="Quantities and values recorded on this document."
                        >
                          <ItemsTable items={items} />
                        </Section>
                      ) : null}

                      {related.length > 0 ? (
                        <Section
                          title="Related documents"
                          description="Only real links recorded in the procurement workflow are shown."
                        >
                          <ul className="flex flex-wrap gap-2">
                            {related.map((relation, index) => (
                              <li
                                key={`${relation.type}-${relation.reference}-${index}`}
                                className="inline-flex items-center gap-2 rounded-full border border-border bg-[#f8fafc] px-3 py-1.5 text-xs text-navy"
                              >
                                <Link2 className="h-3.5 w-3.5 text-muted" />
                                <span className="font-semibold">{relation.label}</span>
                                <span className="text-muted">{relation.reference}</span>
                              </li>
                            ))}
                          </ul>
                        </Section>
                      ) : null}
                    </>
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="font-semibold">What you can do</p>
                      <p className="mt-1 text-amber-900/80">
                        Check that the link was copied completely, or scan the QR code printed on
                        the document again. If the problem continues, contact the issuing school or
                        procurement office.
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-border bg-[#f8fafc] p-4 text-xs leading-relaxed text-muted">
                    <p className="font-semibold text-navy">About this verification</p>
                    <p className="mt-1">
                      This page confirms document authenticity and current status only. Supplier
                      financial details, approval comments and downloadable copies are available
                      exclusively to authorized users signed in to ShulePlus.
                    </p>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </main>

        <footer className="mt-5 flex flex-col items-center justify-between gap-2 text-center text-[11px] text-muted sm:flex-row sm:text-left">
          <span>© {new Date().getFullYear()} ShulePlus · Procurement MIS</span>
          <span>
            {data?.verifiedAt
              ? `Checked on ${formatDateTime(data.verifiedAt)}`
              : 'Secure document verification'}
          </span>
        </footer>
      </div>
    </div>
  );
}
