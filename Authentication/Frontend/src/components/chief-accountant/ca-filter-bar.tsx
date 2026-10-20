'use client';

import type { ReactNode } from 'react';
import { useCaContext } from './ca-context';

export function CaFilterBar({
  onRefresh,
  refreshing,
  extraFilters,
  embedded = false,
}: {
  onRefresh?: () => void;
  refreshing?: boolean;
  extraFilters?: ReactNode;
  /** Inside CaSchoolFeesToolbar: no outer card chrome */
  embedded?: boolean;
}) {
  const {
    organizations,
    orgScope,
    setOrgScope,
    academicYears,
    terms,
    academicYear,
    setAcademicYear,
    term,
    setTerm,
    financialPeriod,
    setFinancialPeriod,
    selectedOrganization,
    academicLoading,
  } = useCaContext();

  return (
    <div
      className={
        embedded ? 'bg-white p-4' : 'rounded-2xl border border-border bg-white p-4 shadow-sm'
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
            Organization scope
          </label>
          <select
            value={orgScope}
            onChange={(e) => setOrgScope(e.target.value as 'all' | string)}
            className="input w-full"
          >
            <option value="all">All assigned schools ({organizations.length})</option>
            {organizations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full min-w-[140px] sm:w-auto">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
            Academic year
          </label>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="input w-full"
            disabled={academicLoading}
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
          <select value={term} onChange={(e) => setTerm(e.target.value)} className="input w-full" disabled={academicLoading}>
            {terms.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full min-w-[160px] sm:w-auto">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
            Financial period
          </label>
          <input
            className="input w-full"
            value={financialPeriod}
            onChange={(e) => setFinancialPeriod(e.target.value)}
            placeholder="e.g. September 2026"
          />
        </div>
        {extraFilters}
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-60 lg:ml-auto"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        ) : null}
      </div>
      {selectedOrganization ? (
        <p className="mt-3 text-xs text-muted">
          <span className="font-semibold text-navy">{selectedOrganization.name}</span>
        </p>
      ) : null}
    </div>
  );
}
