'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Filter, Search, X } from 'lucide-react';
import { attendanceApi, type AcademicContext, type AttendanceFilterParams } from '@/services/attendance-api';
import { filterSelectClass } from '@/components/attendance-ui';

export type FilterMode = 'today' | 'term' | 'year' | 'range' | 'date';

export interface AttendanceFiltersState {
  mode: FilterMode;
  academicYear: string;
  term: string;
  date: string;
  from: string;
  to: string;
  q: string;
  className: string;
}

const defaultFilters = (): AttendanceFiltersState => ({
  mode: 'today',
  academicYear: '',
  term: '',
  date: new Date().toISOString().slice(0, 10),
  from: '',
  to: '',
  q: '',
  className: '',
});

export function filtersToParams(filters: AttendanceFiltersState): AttendanceFilterParams {
  const params: AttendanceFilterParams = {};
  if (filters.q.trim()) params.q = filters.q.trim();
  if (filters.className.trim()) params.className = filters.className.trim();

  if (filters.mode === 'today') {
    params.date = new Date().toISOString().slice(0, 10);
  } else if (filters.mode === 'date' && filters.date) {
    params.date = filters.date;
  } else if (filters.mode === 'term' && filters.term) {
    params.term = filters.term;
    if (filters.academicYear.trim()) params.academicYear = filters.academicYear.trim();
  } else if (filters.mode === 'year' && filters.academicYear) {
    params.academicYear = filters.academicYear;
  } else if (filters.mode === 'range' && filters.from && filters.to) {
    params.from = filters.from;
    params.to = filters.to;
  }
  return params;
}

export function filterSummary(filters: AttendanceFiltersState, academic?: AcademicContext | null) {
  if (filters.mode === 'today') return 'Today';
  if (filters.mode === 'date' && filters.date) return filters.date;
  if (filters.mode === 'term' && filters.term) return filters.term;
  if (filters.mode === 'year' && filters.academicYear) return filters.academicYear;
  if (filters.mode === 'range' && filters.from && filters.to) return `${filters.from} → ${filters.to}`;
  if (academic?.currentTerm) return academic.currentTerm;
  return 'Today';
}

export function useAttendanceFilters(initial?: Partial<AttendanceFiltersState>) {
  const [filters, setFilters] = useState<AttendanceFiltersState>({ ...defaultFilters(), ...initial });
  const [academic, setAcademic] = useState<AcademicContext | null>(null);

  const loadAcademic = useCallback(async () => {
    try {
      const { data } = await attendanceApi.academicContext();
      const ctx = data.data;
      setAcademic(ctx);
      setFilters((prev) => ({
        ...prev,
        academicYear: prev.academicYear || ctx.currentAcademicYear || ctx.academicYears[0] || '',
        term: prev.term || ctx.currentTerm || ctx.terms[0] || '',
      }));
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    void loadAcademic();
  }, [loadAcademic]);

  const params = useMemo(() => filtersToParams(filters), [filters]);

  return { filters, setFilters, params, academic, reloadAcademic: loadAcademic };
}

const PERIOD_MODES: { id: FilterMode; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'term', label: 'Term' },
  { id: 'year', label: 'Year' },
  { id: 'date', label: 'Date' },
  { id: 'range', label: 'Range' },
];

export function AttendanceFilterBar({
  filters,
  setFilters,
  academic,
  showClassFilter = false,
  searchPlaceholder = 'Search name, code, card…',
  extra,
}: {
  filters: AttendanceFiltersState;
  setFilters: React.Dispatch<React.SetStateAction<AttendanceFiltersState>>;
  academic?: AcademicContext | null;
  showClassFilter?: boolean;
  searchPlaceholder?: string;
  extra?: React.ReactNode;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const summary = filterSummary(filters, academic);

  return (
    <>
      <div className="hr-card space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100/90 p-1">
            {PERIOD_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, mode: m.id }))}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filters.mode === m.id
                    ? 'bg-white text-navy shadow-sm'
                    : 'text-muted hover:text-navy'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-navy">
            <Calendar size={12} className="text-primary" />
            {summary}
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="input !py-2 pl-9"
            placeholder={searchPlaceholder}
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
        </div>

        {filters.mode === 'term' ? (
          <select
            className={filterSelectClass}
            value={filters.term}
            onChange={(e) => setFilters((f) => ({ ...f, term: e.target.value }))}
          >
            {(academic?.terms ?? []).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        ) : null}

        {filters.mode === 'year' ? (
          <select
            className={filterSelectClass}
            value={filters.academicYear}
            onChange={(e) => setFilters((f) => ({ ...f, academicYear: e.target.value }))}
          >
            {(academic?.academicYears ?? []).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        ) : null}

        {filters.mode === 'date' ? (
          <input
            type="date"
            className={filterSelectClass}
            value={filters.date}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
          />
        ) : null}

        {filters.mode === 'range' ? (
          <>
            <input
              type="date"
              className={filterSelectClass}
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
            <span className="hidden text-xs text-muted sm:inline">to</span>
            <input
              type="date"
              className={filterSelectClass}
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
          </>
        ) : null}

        {showClassFilter ? (
          <input
            className={`${filterSelectClass} min-w-[88px] sm:min-w-[120px]`}
            placeholder="Class"
            value={filters.className}
            onChange={(e) => setFilters((f) => ({ ...f, className: e.target.value }))}
          />
        ) : null}

        {extra}

        <button
          type="button"
          className="btn-secondary !py-2 sm:ml-auto"
          onClick={() => setModalOpen(true)}
        >
          <Filter size={16} />
          <span className="hidden sm:inline">More</span>
        </button>
        </div>
      </div>

      <FilterModal open={modalOpen} onClose={() => setModalOpen(false)} filters={filters} setFilters={setFilters} academic={academic} showClassFilter={showClassFilter} />
    </>
  );
}

export function FilterModal({
  open,
  onClose,
  filters,
  setFilters,
  academic,
  showClassFilter,
}: {
  open: boolean;
  onClose: () => void;
  filters: AttendanceFiltersState;
  setFilters: React.Dispatch<React.SetStateAction<AttendanceFiltersState>>;
  academic?: AcademicContext | null;
  showClassFilter?: boolean;
}) {
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center">
      <div className="w-full max-w-lg animate-fade-in-up rounded-2xl border border-border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-primary" />
            <h3 className="font-bold text-navy">Filter attendance</h3>
          </div>
          <button type="button" className="btn-ghost !p-2" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Period</span>
            <select
              className="input w-full !py-2.5"
              value={draft.mode}
              onChange={(e) => setDraft((d) => ({ ...d, mode: e.target.value as FilterMode }))}
            >
              <option value="today">Today</option>
              <option value="term">By term</option>
              <option value="year">By academic year</option>
              <option value="date">Specific date</option>
              <option value="range">Custom date range</option>
            </select>
          </label>

          {draft.mode === 'term' ? (
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Term</span>
              <select className="input w-full !py-2.5" value={draft.term} onChange={(e) => setDraft((d) => ({ ...d, term: e.target.value }))}>
                {(academic?.terms ?? []).map((t) => (
                  <option key={t} value={t}>
                    {t}
                    {academic?.termDates?.[t] ? ` (${academic.termDates[t].start} → ${academic.termDates[t].end})` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {draft.mode === 'year' ? (
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Academic year</span>
              <select className="input w-full !py-2.5" value={draft.academicYear} onChange={(e) => setDraft((d) => ({ ...d, academicYear: e.target.value }))}>
                {(academic?.academicYears ?? []).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {draft.mode === 'date' ? (
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Date</span>
              <input type="date" className="input w-full !py-2.5" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
            </label>
          ) : null}

          {draft.mode === 'range' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">From</span>
                <input type="date" className="input w-full !py-2.5" value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">To</span>
                <input type="date" className="input w-full !py-2.5" value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
              </label>
            </div>
          ) : null}

          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Search</span>
            <input className="input w-full !py-2.5" placeholder="Name, code, card…" value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} />
          </label>

          {showClassFilter ? (
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Class</span>
              <input className="input w-full !py-2.5" placeholder="e.g. P5A" value={draft.className} onChange={(e) => setDraft((d) => ({ ...d, className: e.target.value }))} />
            </label>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setDraft(defaultFilters());
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setFilters(draft);
              onClose();
            }}
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
}
