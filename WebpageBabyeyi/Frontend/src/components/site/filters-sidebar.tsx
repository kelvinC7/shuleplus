'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DirectoryFilters } from '@/lib/types';
import type { LocationOption } from '@/lib/locations';
import { LEVELS, SCHOOL_TYPES } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSiteLanguage } from './language-provider';

interface FiltersSidebarProps {
  filters: DirectoryFilters;
  totalCount: number;
  provinces: LocationOption[];
  districts: LocationOption[];
  sectors: LocationOption[];
  combinations: { value: string; label: string }[];
  curricula: string[];
  onChange: (patch: Partial<DirectoryFilters>) => void;
  onClear: () => void;
}

function FilterGroup({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-[18px] border-b border-ink-100 pb-4 last:border-none last:pb-0">
      <h4 className="mb-3 flex items-center gap-1 text-[13px] font-medium uppercase tracking-[0.04em] text-ink-500">
        <span>{title}</span>
        {note && <span className="text-[11px] normal-case tracking-normal text-ink-400">· {note}</span>}
      </h4>
      {children}
    </div>
  );
}

const selectClass =
  'w-full rounded-lg border-[1.5px] border-ink-200 bg-white px-2.5 py-2 text-[13.5px] text-ink-700 outline-none transition-colors focus:border-sky-400';

export function FiltersSidebar({
  filters,
  totalCount,
  provinces,
  districts,
  sectors,
  combinations,
  curricula,
  onChange,
  onClear,
  embedded = false,
}: FiltersSidebarProps & { embedded?: boolean }) {
  const radioRow = 'flex flex-wrap gap-4';
  const { t } = useSiteLanguage();

  return (
    <aside
      className={cn(
        embedded ? 'border-0 bg-transparent p-0 shadow-none' : 'rounded-[22px] border border-ink-200 bg-white p-5 shadow-sm',
      )}
      id={embedded ? undefined : 'filters'}
    >
      {!embedded ? (
        <>
          <div className="flex items-start justify-between gap-2.5">
            <div>
              <h3 className="mb-0.5 text-base font-semibold">{t.filters.title}</h3>
              <span className="text-[11px] font-medium text-ink-500">{t.filters.titleSub}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="border-amber-300 px-3.5 py-[7px] text-xs text-amber-600 hover:bg-amber-50"
            >
              {t.filters.clearFilters}
            </Button>
          </div>

          <p className="mb-1.5 mt-3.5 text-[12.5px] font-medium text-ink-500">
            {t.filters.totalAvailable}{' '}
            <b className="text-sky-700">{totalCount}</b>
          </p>
        </>
      ) : (
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-[12.5px] font-medium text-ink-500">
            <b className="text-sky-700">{totalCount}</b> {t.filters.schoolsMatch}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            className="border-amber-300 px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-50"
          >
            {t.filters.clearAll}
          </Button>
        </div>
      )}

      <div className="mt-4">
        <label className="flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-ink-200 px-3 py-2 transition-colors focus-within:border-sky-400 focus-within:bg-sky-50">
          <input
            value={filters.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={t.filters.filterByName}
            className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
          />
        </label>
      </div>

      <div className="mt-[18px]">
        <FilterGroup title={t.filters.province} note={t.filters.provinceNote}>
          <select
            value={filters.provinceId}
            onChange={(e) => {
              const selected = provinces.find((p) => p.id === e.target.value);
              onChange({
                provinceId: e.target.value,
                province: selected?.name ?? '',
                districtId: '',
                district: '',
                sectorId: '',
                sector: '',
              });
            }}
            className={selectClass}
          >
            <option value="">{t.filters.allProvinces}</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </FilterGroup>

        <FilterGroup title={t.filters.district} note={t.filters.districtNote}>
          <select
            value={filters.districtId}
            onChange={(e) => {
              const selected = districts.find((d) => d.id === e.target.value);
              onChange({
                districtId: e.target.value,
                district: selected?.name ?? '',
                sectorId: '',
                sector: '',
              });
            }}
            disabled={!filters.provinceId}
            className={selectClass}
          >
            <option value="">
              {filters.provinceId ? t.filters.allDistricts : t.filters.selectProvinceFirst}
            </option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </FilterGroup>

        <FilterGroup title={t.filters.sector} note={t.filters.sectorNote}>
          <select
            value={filters.sectorId}
            onChange={(e) => {
              const selected = sectors.find((s) => s.id === e.target.value);
              onChange({
                sectorId: e.target.value,
                sector: selected?.name ?? '',
              });
            }}
            disabled={!filters.districtId}
            className={selectClass}
          >
            <option value="">
              {filters.districtId ? t.filters.allSectors : t.filters.selectDistrictFirst}
            </option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FilterGroup>

        <FilterGroup title={t.filters.category}>
          <select
            value={filters.level}
            onChange={(e) => onChange({ level: e.target.value })}
            className={selectClass}
          >
            <option value="">{t.filters.allCategories}</option>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </FilterGroup>

        <FilterGroup title={t.filters.schoolType}>
          <select
            value={filters.type}
            onChange={(e) => onChange({ type: e.target.value })}
            className={selectClass}
          >
            <option value="">{t.filters.allTypes}</option>
            {SCHOOL_TYPES.map((typeKey) => (
              <option key={typeKey} value={typeKey}>
                {t.schoolTypes[typeKey]}
              </option>
            ))}
          </select>
        </FilterGroup>

        <FilterGroup title={t.filters.curriculum}>
          <select
            value={filters.curriculum}
            onChange={(e) => onChange({ curriculum: e.target.value })}
            className={selectClass}
          >
            <option value="">{t.filters.allCurricula}</option>
            {curricula.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FilterGroup>

        <FilterGroup title={t.filters.combination}>
          <select
            value={filters.combination}
            onChange={(e) => onChange({ combination: e.target.value })}
            className={selectClass}
          >
            <option value="">{t.filters.allCombinations}</option>
            {combinations.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </FilterGroup>

        <FilterGroup title={t.filters.gender}>
          <div className={radioRow}>
            {(['Male', 'Female', 'Mixed'] as const).map((g) => (
              <label key={g} className="flex cursor-pointer items-center gap-1.5 text-[13.5px] text-ink-700">
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={filters.gender === g}
                  onChange={() => onChange({ gender: filters.gender === g ? '' : g })}
                  className="sr-only"
                />
                <span className="radio-dot" />
                {t.gender[g]}
              </label>
            ))}
          </div>
        </FilterGroup>

        <FilterGroup title={t.filters.schoolMode}>
          <div className={radioRow}>
            {(['Boarding', 'Day'] as const).map((m) => (
              <label key={m} className="flex cursor-pointer items-center gap-1.5 text-[13.5px] text-ink-700">
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  checked={filters.mode === m}
                  onChange={() => onChange({ mode: filters.mode === m ? '' : m })}
                  className="sr-only"
                />
                <span className="radio-dot" />
                {t.mode[m]}
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-1.5 text-[13.5px] text-ink-700">
              <input
                type="radio"
                name="mode"
                checked={!filters.mode}
                onChange={() => onChange({ mode: '' })}
                className="sr-only"
              />
              <span className="radio-dot" />
              {t.mode.Both}
            </label>
          </div>
        </FilterGroup>

        <FilterGroup title={t.filters.feesPerTerm}>
          <input
            type="range"
            min={0}
            max={100}
            value={filters.maxFeesPct}
            onChange={(e) => onChange({ maxFeesPct: Number(e.target.value) })}
            className="range-fees"
          />
          <div className="mt-2 flex justify-between text-xs text-ink-500">
            <span>0</span>
            <span>{filters.maxFeesPct >= 100 ? '2,000,000+' : `≤ ${Math.round((filters.maxFeesPct / 100) * 2_000_000).toLocaleString()}`}</span>
          </div>
        </FilterGroup>

        {!embedded ? (
          <Button size="block" onClick={() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })}>
            {t.filters.applyFilters}
          </Button>
        ) : null}
      </div>
    </aside>
  );
}

export default FiltersSidebar;

export function SidebarCol(props: FiltersSidebarProps) {
  return (
    <div className="hidden flex-col gap-[18px] lg:sticky lg:top-24 lg:flex">
      <FiltersSidebar {...props} />
    </div>
  );
}

export function MobileFiltersSheet({
  open,
  onClose,
  ...props
}: FiltersSidebarProps & { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const { t } = useSiteLanguage();

  useEffect(() => {
    if (!open) {
      setMounted(false);
      return;
    }
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={t.filters.dialogLabel}
    >
      <button
        type="button"
        aria-label={t.filters.closeFilters}
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-ink-950/55 backdrop-blur-sm transition-opacity duration-200',
          mounted ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[26px] bg-white shadow-2xl transition-all duration-200',
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
        )}
      >
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-sky-600 via-sky-700 to-[#042f2e] px-5 pb-4 pt-5">
          <span aria-hidden className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-amber-400/20 blur-2xl" />
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.05em] text-amber-200">
                {t.filters.sheetBadge}
              </span>
              <h2 className="mt-2 text-[17px] font-medium text-white">{t.filters.sheetTitle}</h2>
              <p className="text-[12px] text-white/70">{t.filters.sheetSubtitle(props.totalCount)}</p>
            </div>
            <button
              type="button"
              aria-label={t.filters.close}
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <FiltersSidebar {...props} embedded />
        </div>

        <div className="shrink-0 border-t border-ink-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex w-full items-center justify-center rounded-full bg-sky-600 px-5 py-3 text-[13px] font-medium text-white shadow-md transition hover:bg-sky-700"
          >
            {t.filters.showResults}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export const sidebarClass = cn();
