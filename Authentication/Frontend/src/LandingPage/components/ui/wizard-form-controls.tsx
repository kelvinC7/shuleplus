'use client';

import { CheckSquare, ChevronDown, Square } from 'lucide-react';

/** Prefer the student's current year when present in the options list. */
export function pickCurrentAcademicYear(
  years: string[],
  preferred?: string | null,
  current?: string
): string {
  if (!years.length) return current || '';
  if (current && years.includes(current)) return current;
  if (preferred) {
    const match = years.find(
      (y) => y === preferred || y.replace(/[–—]/g, '-').replace(/\//g, '-') === preferred.replace(/[–—]/g, '-').replace(/\//g, '-')
    );
    if (match) return match;
  }
  return years[0];
}

export function AcademicYearDropdown({
  years,
  value,
  onChange,
  disabled,
  currentLabel,
}: {
  years: string[];
  value: string;
  onChange: (year: string) => void;
  disabled?: boolean;
  /** Optional badge when value matches the student's current year */
  currentLabel?: string | null;
}) {
  const isCurrent = Boolean(currentLabel && value && (value === currentLabel || currentLabel.includes(value)));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor="academic-year-select" className="block text-sm font-semibold text-navy-900">
          Academic year
        </label>
        {isCurrent ? (
          <span className="rounded-full bg-[#FCB038]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#9a6a10]">
            Current
          </span>
        ) : null}
      </div>
      <div className="relative">
        <select
          id="academic-year-select"
          value={value}
          disabled={disabled || years.length === 0}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full appearance-none rounded-2xl border border-navy-900/10 bg-white py-3 pl-4 pr-11 text-sm font-semibold text-navy-900 shadow-[0_4px_14px_-10px_rgba(0,4,53,0.25)] outline-none transition focus:border-[#FCB038] focus:ring-2 focus:ring-[#FCB038]/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {!value ? (
            <option value="" disabled>
              Select academic year
            </option>
          ) : null}
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
              {currentLabel && (y === currentLabel || currentLabel.includes(y)) ? ' · Current' : ''}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-900/35"
          aria-hidden
        />
      </div>
    </div>
  );
}

export function SelectAllControls({
  onSelectAll,
  onDeselectAll,
  selectedCount,
  totalCount,
}: {
  onSelectAll: () => void;
  onDeselectAll: () => void;
  selectedCount: number;
  totalCount: number;
}) {
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const noneSelected = selectedCount === 0;

  return (
    <div
      className="inline-flex items-center overflow-hidden rounded-xl border border-navy-900/10 bg-white shadow-[0_2px_8px_-4px_rgba(0,4,53,0.12)]"
      role="group"
      aria-label="Bulk selection"
    >
      <button
        type="button"
        onClick={onSelectAll}
        disabled={allSelected || totalCount === 0}
        className="inline-flex h-9 items-center gap-1.5 border-r border-navy-900/8 bg-[#000435] px-3 text-[12px] font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:bg-navy-900/25 disabled:text-white/70"
      >
        <CheckSquare className="h-3.5 w-3.5 text-[#FCB038]" aria-hidden />
        Select all
      </button>
      <button
        type="button"
        onClick={onDeselectAll}
        disabled={noneSelected}
        className="inline-flex h-9 items-center gap-1.5 px-3 text-[12px] font-semibold text-navy-900 transition hover:bg-navy-900/[0.04] disabled:cursor-not-allowed disabled:text-navy-900/30"
      >
        <Square className="h-3.5 w-3.5 text-navy-900/40" aria-hidden />
        Deselect all
      </button>
    </div>
  );
}
