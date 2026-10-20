'use client';

import type { ReactNode } from 'react';
import { CalendarDays, Search, X } from 'lucide-react';

export function ApFilterBar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-navy/[0.06] bg-gradient-to-r from-white to-slate-50/80 p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end ${className}`}
    >
      {children}
    </div>
  );
}

export const apFilterSelectClass = 'input h-10 min-w-[148px] py-2 text-sm';
export const apFilterInputClass = 'input h-10 py-2 text-sm';

export function ApFilterField({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex min-w-[148px] flex-col gap-1.5 ${className}`}>
      <span className="text-[11px] font-bold uppercase tracking-wide text-navy/45">{label}</span>
      {children}
    </label>
  );
}

export function ApFilterSearch({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search…',
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <ApFilterField label="Search" className={`min-w-0 flex-1 lg:min-w-[240px] ${className}`}>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
          placeholder={placeholder}
          className={`${apFilterInputClass} w-full pl-9`}
        />
      </div>
    </ApFilterField>
  );
}

export function ApFilterSelect({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <ApFilterField label={label} className={className}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${apFilterSelectClass} w-full`}>
        {options.map((opt) => (
          <option key={opt.value || '__all'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </ApFilterField>
  );
}

export function ApFilterDate({
  label,
  value,
  onChange,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <ApFilterField label={label} className={className}>
      <div className="relative">
        <CalendarDays size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${apFilterInputClass} w-full pl-9`}
        />
      </div>
    </ApFilterField>
  );
}

export function ApFilterActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-2 lg:ml-auto">{children}</div>;
}

export function ApActiveFilters({
  items,
  onClearAll,
}: {
  items: { key: string; label: string; onClear: () => void }[];
  onClearAll?: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
      <span className="text-[11px] font-bold uppercase tracking-wide text-navy/40">Active filters</span>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={item.onClear}
          className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-navy transition hover:bg-primary/20"
        >
          {item.label}
          <X size={12} />
        </button>
      ))}
      {onClearAll ? (
        <button type="button" onClick={onClearAll} className="text-xs font-semibold text-muted underline-offset-2 hover:underline">
          Clear all
        </button>
      ) : null}
    </div>
  );
}
