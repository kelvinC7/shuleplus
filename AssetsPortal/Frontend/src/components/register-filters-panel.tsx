'use client';

import { Filter, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Category, FinancialYear } from '@/types';

export type RegisterFilters = {
  year: string;
  category: string;
  health: string;
  q: string;
};

type RegisterFiltersPanelProps = {
  filters: RegisterFilters;
  years: FinancialYear[];
  registerYears?: number[];
  categories: Category[];
  total: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (patch: Partial<RegisterFilters>) => void;
  onReset: () => void;
};

function mergeFilterYears(financialYears: FinancialYear[], registerYears?: number[]) {
  const byYear = new Map<number, FinancialYear>();
  for (const fy of financialYears) {
    byYear.set(fy.year, fy);
  }
  for (const y of registerYears ?? []) {
    if (!byYear.has(y)) {
      byYear.set(y, {
        id: `register-${y}`,
        organizationId: '',
        year: y,
        status: 'Closed',
        startDate: '',
        endDate: '',
        totalOpening: 0,
        totalPurchases: 0,
        totalClosing: 0,
      });
    }
  }
  return [...byYear.values()].sort((a, b) => b.year - a.year);
}

export function activeFilterCount(filters: RegisterFilters): number {
  let n = 0;
  if (filters.year) n++;
  if (filters.category) n++;
  if (filters.health) n++;
  if (filters.q.trim()) n++;
  return n;
}

export function RegisterFiltersButton({
  active,
  onClick,
}: {
  active: number;
  onClick: () => void;
}) {
  return (
    <button type="button" className="btn-secondary shrink-0" onClick={onClick}>
      <Filter size={16} />
      <span className="hidden sm:inline">Filters</span>
      <span className="sm:hidden">Filter</span>
      {active > 0 ? (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-navy">
          {active}
        </span>
      ) : null}
    </button>
  );
}

export function RegisterFiltersPanel({
  filters,
  years,
  registerYears,
  categories,
  total,
  open,
  onOpenChange,
  onChange,
  onReset,
}: RegisterFiltersPanelProps) {
  const yearOptions = mergeFilterYears(years, registerYears);
  const active = activeFilterCount(filters);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy/40 backdrop-blur-[2px]">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close filters"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-fade-in-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-filters-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-primary">
                <SlidersHorizontal size={16} />
              </span>
              <div>
                <h2 id="register-filters-title" className="text-base font-semibold text-navy">
                  Register filters
                </h2>
                <p className="text-xs text-muted">{total.toLocaleString()} assets match</p>
              </div>
            </div>
            {active > 0 ? (
              <p className="mt-2 text-xs font-medium text-ochre">{active} active filter(s)</p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-muted transition hover:bg-slate-100 hover:text-navy"
            onClick={() => onOpenChange(false)}
            aria-label="Close filters panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <FilterField label="Search">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                className="input !py-2.5 !pl-9"
                placeholder="Name, code, SKU…"
                value={filters.q}
                onChange={(e) => onChange({ q: e.target.value })}
              />
            </div>
          </FilterField>

          <FilterField label="Financial year">
            <select
              className="input !py-2.5"
              value={filters.year}
              onChange={(e) => onChange({ year: e.target.value })}
            >
              <option value="">All years</option>
              {yearOptions.map((y) => (
                <option key={y.id} value={y.year}>
                  {y.year}
                  {y.status ? ` · ${y.status}` : ''}
                  {String(y.id).startsWith('register-') ? ' · in register' : ''}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Category">
            <select
              className="input !py-2.5"
              value={filters.category}
              onChange={(e) => onChange({ category: e.target.value })}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Health status">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-1">
              {[
                { value: '', label: 'All health statuses' },
                { value: 'Used', label: 'Used' },
                { value: 'NotUsedOld', label: 'Not used (old)' },
              ].map((opt) => {
                const selected = filters.health === opt.value;
                return (
                  <button
                    key={opt.value || 'all'}
                    type="button"
                    onClick={() => onChange({ health: opt.value })}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                      selected
                        ? 'border-navy bg-navy text-white shadow-sm'
                        : 'border-border bg-white text-navy hover:border-primary/40 hover:bg-amber-50/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </FilterField>
        </div>

        <div className="flex flex-col gap-2 border-t border-border px-5 py-4 sm:flex-row">
          <button
            type="button"
            className="btn-secondary flex-1 justify-center"
            onClick={onReset}
            disabled={active === 0}
          >
            <RotateCcw size={14} /> Clear all
          </button>
          <button
            type="button"
            className="btn-primary flex-1 justify-center"
            onClick={() => onOpenChange(false)}
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      {children}
    </div>
  );
}
