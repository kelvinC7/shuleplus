'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react';
import { Progress, ProgressIndicator, ProgressLabel, ProgressTrack } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ACADEMIC_EMPTY } from '@/lib/academic-display';
import {
  type AttendanceRecord,
  formatRecordSource,
  statusMeta,
} from '@/components/attendance/parent-attendance-utils';

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'PRESENT', label: 'Present' },
  { id: 'ABSENT', label: 'Absent' },
  { id: 'LATE', label: 'Late' },
  { id: 'EXCUSED', label: 'Excused' },
] as const;

type Summary = {
  monthlyPresent: number;
  monthlyAbsent: number;
  monthlyLate: number;
  monthlyExcused: number;
  attendanceRate: number;
};

type Props = {
  records: AttendanceRecord[];
  summary: Summary | undefined;
  monthKeys: string[];
  activeMonth: string;
  onMonthChange: (month: string) => void;
};

export function ParentAttendanceRecordsTable({
  records,
  summary,
  monthKeys,
  activeMonth,
  onMonthChange,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]['id']>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const monthRecords = useMemo(
    () => records.filter((r) => r.date.slice(0, 7) === activeMonth),
    [records, activeMonth]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monthRecords
      .filter((r) => {
        if (statusFilter === 'ALL') return true;
        const s = r.status.toUpperCase();
        if (statusFilter === 'EXCUSED') return s === 'EXCUSED' || s === 'SICK';
        return s === statusFilter;
      })
      .filter((r) => {
        if (!q) return true;
        const meta = statusMeta(r.status).label.toLowerCase();
        const src = formatRecordSource(r.source).toLowerCase();
        return r.date.includes(q) || meta.includes(q) || src.includes(q) || (r.notes ?? '').toLowerCase().includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [monthRecords, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const monthLabel = new Date(`${activeMonth}-01T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const rate = summary?.attendanceRate ?? 0;

  return (
    <div className="space-y-4">
      <div className="hr-card overflow-hidden p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Monthly attendance</p>
            <p className="text-2xl font-extrabold tabular-nums text-navy">{monthLabel}</p>
          </div>
          {summary ? (
            <div className="flex flex-wrap gap-4 text-sm">
              {[
                { label: 'Present', value: summary.monthlyPresent },
                { label: 'Absent', value: summary.monthlyAbsent },
                { label: 'Late', value: summary.monthlyLate },
              ].map((row) => (
                <div key={row.label}>
                  <p className="text-[11px] font-semibold text-slate-500">{row.label}</p>
                  <p className="text-lg font-extrabold tabular-nums text-navy">{row.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <Progress value={rate} className="mt-4 w-full flex-col gap-2 sm:flex-row sm:items-center">
          <ProgressLabel className="text-sm font-semibold text-navy">Attendance rate</ProgressLabel>
          <ProgressTrack className="h-2.5 flex-1 bg-slate-100">
            <ProgressIndicator className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
          </ProgressTrack>
          <span className="text-base font-extrabold tabular-nums text-navy">{rate}%</span>
        </Progress>
      </div>

      <div className="hr-card overflow-hidden">
        <div className="space-y-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-extrabold text-navy">All records</h2>
            <select
              className="input max-w-full py-2 text-sm sm:max-w-[220px]"
              value={activeMonth}
              onChange={(e) => {
                onMonthChange(e.target.value);
                setPage(1);
              }}
            >
              {monthKeys.map((m) => (
                <option key={m} value={m}>
                  {new Date(`${m}-01T12:00:00`).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search date, status, notes…"
              className="input w-full py-2.5 pl-10 text-sm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Filter className="size-4 shrink-0 text-slate-400" aria-hidden />
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setStatusFilter(f.id);
                  setPage(1);
                }}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition',
                  statusFilter === f.id ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Check in</th>
                <th className="px-5 py-3">Check out</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted">
                    No records match your filters.
                  </td>
                </tr>
              ) : (
                slice.map((r, idx) => {
                  const meta = statusMeta(r.status);
                  const num = (safePage - 1) * PAGE_SIZE + idx + 1;
                  return (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 tabular-nums text-slate-400">{num}</td>
                      <td className="px-5 py-3.5 font-semibold text-navy">
                        {new Date(`${r.date}T12:00:00`).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1', meta.pill)}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums">{r.checkInTime || ACADEMIC_EMPTY}</td>
                      <td className="px-5 py-3.5 tabular-nums">{r.checkOutTime || ACADEMIC_EMPTY}</td>
                      <td className="px-5 py-3.5 text-slate-600">{formatRecordSource(r.source)}</td>
                      <td className="max-w-[200px] truncate px-5 py-3.5 text-slate-600" title={r.notes ?? undefined}>
                        {r.notes || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-slate-100 md:hidden">
          {slice.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">No records match your filters.</p>
          ) : (
            slice.map((r, idx) => {
              const meta = statusMeta(r.status);
              const num = (safePage - 1) * PAGE_SIZE + idx + 1;
              return (
                <article key={r.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400">#{num}</p>
                      <p className="font-extrabold text-navy">
                        {new Date(`${r.date}T12:00:00`).toLocaleDateString(undefined, {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1', meta.pill)}>
                      {meta.label}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="font-bold uppercase text-slate-400">In</dt>
                      <dd className="font-semibold text-navy">{r.checkInTime || ACADEMIC_EMPTY}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase text-slate-400">Out</dt>
                      <dd className="font-semibold text-navy">{r.checkOutTime || ACADEMIC_EMPTY}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="font-bold uppercase text-slate-400">Source</dt>
                      <dd className="font-semibold text-slate-700">{formatRecordSource(r.source)}</dd>
                    </div>
                    {r.notes ? (
                      <div className="col-span-2">
                        <dt className="font-bold uppercase text-slate-400">Note</dt>
                        <dd className="text-slate-600">{r.notes}</dd>
                      </div>
                    ) : null}
                  </dl>
                </article>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-muted">
            Showing {(safePage - 1) * PAGE_SIZE + (slice.length ? 1 : 0)}–
            {(safePage - 1) * PAGE_SIZE + slice.length} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold disabled:opacity-40"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
              Prev
            </button>
            <span className="min-w-[4.5rem] text-center text-sm font-bold tabular-nums text-navy">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold disabled:opacity-40"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
