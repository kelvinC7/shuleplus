'use client';

import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { useRepContext } from './rep-context';

export type RepFilterBarProps = {
  onRefresh?: () => void;
  refreshing?: boolean;
  showAcademic?: boolean;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  /** Extra filter controls rendered before refresh buttons */
  extraFilters?: ReactNode;
};

export function RepFilterBar({
  onRefresh,
  refreshing,
  showAcademic = true,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  extraFilters,
}: RepFilterBarProps) {
  const {
    schools,
    schoolScope,
    setSchoolScope,
    academicYears,
    terms,
    academicYear,
    setAcademicYear,
    term,
    setTerm,
    selectedSchool,
    academicLoading,
  } = useRepContext();

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
            School
          </label>
          <select
            value={schoolScope}
            onChange={(e) => setSchoolScope(e.target.value as 'all' | string)}
            className="input w-full"
          >
            <option value="all">All assigned schools ({schools.length})</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {showAcademic ? (
          <>
            <div className="w-full min-w-[140px] sm:w-auto">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
                Academic year
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="input w-full"
                disabled={academicLoading || !academicYears.length}
              >
                {academicYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full min-w-[120px] sm:w-auto">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
                Term
              </label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="input w-full"
                disabled={academicLoading || !terms.length}
              >
                {terms.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}

        {onSearchChange ? (
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={search ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="input w-full pl-9"
              />
            </div>
          </div>
        ) : null}

        {extraFilters}

        <div className="flex flex-wrap gap-2 lg:ml-auto">
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-60"
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        {selectedSchool ? (
          <>
            Viewing <span className="font-semibold text-navy">{selectedSchool.name}</span>
          </>
        ) : (
          <>Viewing all assigned schools</>
        )}
      </p>
    </div>
  );
}
