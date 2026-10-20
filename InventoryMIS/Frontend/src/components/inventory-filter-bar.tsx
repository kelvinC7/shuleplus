'use client';

import { Filter, Search, X } from 'lucide-react';
import { InventoryDateRangePicker, type InventoryDateRange } from '@/components/inventory-date-range-picker';

export interface InventoryFilterValues {
  search: string;
  dateRange: InventoryDateRange;
  [key: string]: string | InventoryDateRange;
}

export interface InventorySelectFilter {
  key: string;
  allLabel: string;
  options: { value: string; label: string }[];
}

interface InventoryFilterBarProps {
  filters: InventoryFilterValues;
  onChange: (patch: Partial<InventoryFilterValues>) => void;
  onClear: () => void;
  selectFilters: InventorySelectFilter[];
  searchPlaceholder?: string;
  showDateFilter?: boolean;
}

export function InventoryFilterBar({
  filters,
  onChange,
  onClear,
  selectFilters,
  searchPlaceholder = 'Search…',
  showDateFilter = true,
}: InventoryFilterBarProps) {
  const hasActiveFilters =
    Boolean(filters.search) ||
    selectFilters.some((s) => Boolean(filters[s.key])) ||
    Boolean(filters.dateRange.from || filters.dateRange.to);

  return (
    <div className="hr-card space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#000435]">
          <Filter size={16} className="text-[#fcb038]" />
          Filters
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-[#fcb038]/40 hover:text-[#000435]"
          >
            <X size={12} />
            Clear all
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative sm:col-span-2 xl:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="input h-11 pl-10"
            placeholder={searchPlaceholder}
          />
        </div>

        {selectFilters.map((select) => (
          <select
            key={select.key}
            value={String(filters[select.key] ?? '')}
            onChange={(e) => onChange({ [select.key]: e.target.value })}
            className="input h-11"
          >
            <option value="">{select.allLabel}</option>
            {select.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ))}

        {showDateFilter ? (
          <InventoryDateRangePicker
            value={filters.dateRange}
            onChange={(dateRange) => onChange({ dateRange })}
            className="h-11"
          />
        ) : null}
      </div>
    </div>
  );
}

// Back-compat alias used by products page
export type InventoryListFilters = InventoryFilterValues & {
  categoryId: string;
  status: string;
};
