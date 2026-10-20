'use client';

import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { RepSchool } from '@/lib/school-representative-api';

export type FeesFilterState = {
  organizationId: string;
  academicYear: string;
  term: string;
  className: string;
  paymentStatus: string;
  feeCategory: string;
  paymentMethod: string;
  dateFrom: string;
  dateTo: string;
  search: string;
};

type FilterOptions = {
  academicYears: string[];
  terms: string[];
  classes: string[];
  feeCategories: Array<{ code: string; name: string }>;
  paymentMethods: string[];
};

type Props = {
  schools: RepSchool[];
  filters: FeesFilterState;
  onChange: (next: FeesFilterState) => void;
  options: FilterOptions | null;
  onReset: () => void;
  showPaymentStatus?: boolean;
  showDates?: boolean;
  searchPlaceholder?: string;
};

export function RepFeesFilters({
  schools,
  filters,
  onChange,
  options,
  onReset,
  showPaymentStatus = true,
  showDates = true,
  searchPlaceholder = 'Search student or payment…',
}: Props) {
  const [open, setOpen] = useState(true);
  const [more, setMore] = useState(false);

  function patch(partial: Partial<FeesFilterState>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-semibold text-navy"
          onClick={() => setOpen((v) => !v)}
        >
          Filter school fees
          {open ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>
      {open ? (
        <div className="space-y-3 px-4 py-4 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="School">
              <select
                className="input w-full"
                value={filters.organizationId}
                onChange={(e) => patch({ organizationId: e.target.value })}
              >
                <option value="all">All assigned schools</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Academic year">
              <select
                className="input w-full"
                value={filters.academicYear}
                onChange={(e) => patch({ academicYear: e.target.value })}
              >
                <option value="">All years</option>
                {(options?.academicYears ?? []).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Term">
              <select className="input w-full" value={filters.term} onChange={(e) => patch({ term: e.target.value })}>
                <option value="">All terms</option>
                {(options?.terms ?? []).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Search">
              <input
                className="input w-full"
                value={filters.search}
                onChange={(e) => patch({ search: e.target.value })}
                placeholder={searchPlaceholder}
              />
            </Field>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-primary"
            onClick={() => setMore((v) => !v)}
          >
            {more ? 'Hide filters' : 'More filters'}
          </button>
          {more ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Class">
                <select
                  className="input w-full"
                  value={filters.className}
                  onChange={(e) => patch({ className: e.target.value })}
                >
                  <option value="">All classes</option>
                  {(options?.classes ?? []).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              {showPaymentStatus ? (
                <Field label="Payment status">
                  <select
                    className="input w-full"
                    value={filters.paymentStatus}
                    onChange={(e) => patch({ paymentStatus: e.target.value })}
                  >
                    <option value="">Any</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partially paid</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </Field>
              ) : null}
              <Field label="Fee category">
                <select
                  className="input w-full"
                  value={filters.feeCategory}
                  onChange={(e) => patch({ feeCategory: e.target.value })}
                >
                  <option value="">All categories</option>
                  {(options?.feeCategories ?? []).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Payment method">
                <select
                  className="input w-full"
                  value={filters.paymentMethod}
                  onChange={(e) => patch({ paymentMethod: e.target.value })}
                >
                  <option value="">Any method</option>
                  {(options?.paymentMethods ?? []).map((m) => (
                    <option key={m} value={m}>
                      {m.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </Field>
              {showDates ? (
                <>
                  <Field label="Payment from">
                    <input
                      type="date"
                      className="input w-full"
                      value={filters.dateFrom}
                      onChange={(e) => patch({ dateFrom: e.target.value })}
                    />
                  </Field>
                  <Field label="Payment to">
                    <input
                      type="date"
                      className="input w-full"
                      value={filters.dateTo}
                      onChange={(e) => patch({ dateTo: e.target.value })}
                    />
                  </Field>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">{label}</label>
      {children}
    </div>
  );
}
