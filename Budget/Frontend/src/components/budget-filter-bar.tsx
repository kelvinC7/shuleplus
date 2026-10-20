'use client';

import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

interface BudgetFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
  actions?: ReactNode;
}

export function BudgetFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  children,
  actions,
}: BudgetFilterBarProps) {
  return (
    <div className="hr-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="input pl-10"
          />
        </div>
        {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
        {actions ? <div className="flex shrink-0 items-center gap-2 lg:ml-auto">{actions}</div> : null}
      </div>
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  children,
  className = 'input w-full sm:w-44',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className="block min-w-[140px]">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
        {children}
      </select>
    </label>
  );
}
