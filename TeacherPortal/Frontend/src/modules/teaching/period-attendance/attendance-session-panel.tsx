'use client';

import { ArrowLeft, CheckCircle2, Eye, Loader2, Save, Search } from 'lucide-react';
import type { AttendanceAccess, AttendanceStatus, SmartAttendanceRow, SmartLesson } from '@/types/smart-timetable';
import {
  AttendanceStatusBadge,
  AttendanceStatusButton,
  AttendanceToolbarButton,
} from '@/components/attendance-status-ui';
import { ABSENT_REASONS, LATE_REASONS, STATUS_OPTIONS, type SortMode, type StatusFilter } from './constants';
import { computeMinutesLate, countByStatus } from './utils';

export function AttendanceSessionPanel({
  lesson,
  rows,
  displayRows,
  access,
  meta,
  readonly,
  rosterHint,
  rosterLoading,
  counts,
  progressPct,
  sortMode,
  statusFilter,
  studentSearch,
  saving,
  submitted,
  onClose,
  onSaveDraft,
  onReview,
  onSortChange,
  onStatusFilterChange,
  onSearchChange,
  onBulkStatus,
  onUpdateRow,
  onSetStatus,
}: {
  lesson: SmartLesson | null;
  rows: SmartAttendanceRow[];
  displayRows: SmartAttendanceRow[];
  access: AttendanceAccess | null;
  meta: { source?: string; demo?: boolean } | null;
  readonly: boolean;
  rosterHint: string | null;
  rosterLoading: boolean;
  counts: ReturnType<typeof countByStatus>;
  progressPct: number;
  sortMode: SortMode;
  statusFilter: StatusFilter;
  studentSearch: string;
  saving: boolean;
  submitted: { reference: string | null; at: string } | null;
  onClose: () => void;
  onSaveDraft: () => void;
  onReview: () => void;
  onSortChange: (m: SortMode) => void;
  onStatusFilterChange: (f: StatusFilter) => void;
  onSearchChange: (q: string) => void;
  onBulkStatus: (status: AttendanceStatus) => void;
  onUpdateRow: (code: string, patch: Partial<SmartAttendanceRow>) => void;
  onSetStatus: (code: string, status: AttendanceStatus) => void;
}) {
  if (rosterLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white py-16 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading students…
      </div>
    );
  }

  const viewOnly = readonly || access?.canEdit === false;
  const title = lesson
    ? `${lesson.periodLabel ?? 'Period'} · ${lesson.subjectName}`
    : 'Attendance session';

  const statusFilters: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.total },
    { id: 'marked', label: 'Marked', count: counts.marked },
    { id: 'unmarked', label: 'Unmarked', count: counts.unmarked },
  ];

  return (
    <div
      className={`min-w-0 max-w-full space-y-3 overflow-x-hidden sm:space-y-4 ${
        !viewOnly && rows.length > 0 ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0' : ''
      }`}
    >
      {/* Session header */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-slate-50 p-3 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onClose}
              className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-navy sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" /> Back
            </button>
            <h2 className="break-words text-base font-bold leading-snug text-navy sm:text-xl">{title}</h2>
            {lesson && (
              <p className="mt-1 break-words text-xs text-muted sm:text-sm">
                {lesson.className} · {lesson.startTime}–{lesson.endTime}
                {lesson.attendanceReference ? (
                  <span className="hidden sm:inline">{` · Ref ${lesson.attendanceReference}`}</span>
                ) : null}
              </p>
            )}
          </div>
          <div className="shrink-0 pt-6 sm:pt-0">
            {viewOnly ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800 sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs">
                <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> View only
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs">
                <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Edit
              </span>
            )}
          </div>
        </div>

        {/* Stats — horizontal scroll on mobile */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] sm:mt-4 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible lg:grid-cols-5 [&::-webkit-scrollbar]:hidden">
          <MiniStat label="Students" value={counts.total} className="min-w-[5.5rem] shrink-0 sm:min-w-0" />
          <MiniStat label="Present" value={counts.present} tone="emerald" className="min-w-[5.5rem] shrink-0 sm:min-w-0" />
          <MiniStat label="Late" value={counts.late} tone="amber" className="min-w-[5.5rem] shrink-0 sm:min-w-0" />
          <MiniStat label="Absent" value={counts.absent} tone="red" className="min-w-[5.5rem] shrink-0 sm:min-w-0" />
          <MiniStat
            label="Excused"
            value={counts.excused + counts.medical}
            tone="sky"
            className="min-w-[5.5rem] shrink-0 sm:min-w-0"
          />
        </div>

        <div className="mt-3 sm:mt-4">
          <div className="mb-1 flex justify-between text-[11px] font-semibold text-muted sm:text-xs">
            <span>
              Marked {counts.marked}/{counts.total}
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 sm:h-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {access && !access.canEdit && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-900 sm:px-4 sm:py-3 sm:text-sm">
          {access.lockReason ?? 'This period is locked. You can review students but not edit.'}
        </div>
      )}

      {rosterHint && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900 sm:px-4 sm:py-3 sm:text-sm">
          {rosterHint}
        </div>
      )}

      {submitted && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900 sm:px-4 sm:py-3 sm:text-sm">
          Submitted {new Date(submitted.at).toLocaleTimeString()}
          {submitted.reference ? ` · ${submitted.reference}` : ''}
        </div>
      )}

      {meta?.demo && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 sm:px-4 sm:py-3 sm:text-sm">
          Demo roster — Student Management unavailable.
        </p>
      )}

      {!viewOnly && rows.length > 0 && (
        <div className="hidden rounded-2xl border border-border bg-white p-4 shadow-sm md:block">
          <div className="flex flex-wrap gap-2">
            <AttendanceToolbarButton
              status="PRESENT"
              label="Mark all present"
              onClick={() => onBulkStatus('PRESENT')}
            />
            <AttendanceToolbarButton status="LATE" onClick={() => onBulkStatus('LATE')} />
            <AttendanceToolbarButton status="ABSENT" onClick={() => onBulkStatus('ABSENT')} />
            <AttendanceToolbarButton status="EXCUSED" onClick={() => onBulkStatus('EXCUSED')} />
            <select
              className="input !w-auto !py-2 text-sm"
              value={sortMode}
              onChange={(e) => onSortChange(e.target.value as SortMode)}
            >
              <option value="roll">Roll number</option>
              <option value="alpha">Alphabetical</option>
              <option value="default">Default</option>
            </select>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary inline-flex items-center gap-2" disabled={saving} onClick={onSaveDraft}>
              <Save className="h-4 w-4" /> Save draft
            </button>
            <button type="button" className="btn-primary" disabled={saving || rows.length === 0} onClick={onReview}>
              Submit attendance
            </button>
          </div>
        </div>
      )}

      {/* Sticky search + filters on mobile */}
      <div className="sticky top-[52px] z-20 space-y-2.5 rounded-2xl border border-border bg-white/95 p-3 shadow-sm backdrop-blur-sm sm:static sm:space-y-3 sm:p-4 sm:shadow-sm">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="input w-full min-w-0 !py-2 pl-9 pr-3 text-sm"
            placeholder="Search name or code"
            value={studentSearch}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {statusFilters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onStatusFilterChange(f.id)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 sm:py-1.5 sm:text-xs ${
                  statusFilter === f.id
                    ? 'border-navy bg-navy text-white'
                    : 'border-border bg-white text-muted hover:border-slate-300 hover:text-navy'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
          <select
            className="input w-auto max-w-[7.5rem] shrink-0 !py-1.5 text-[11px] sm:max-w-none sm:!py-2 sm:text-sm"
            value={sortMode}
            onChange={(e) => onSortChange(e.target.value as SortMode)}
            aria-label="Sort students"
          >
            <option value="roll">Roll #</option>
            <option value="alpha">A–Z</option>
            <option value="default">Default</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center sm:p-10">
          <p className="font-semibold text-navy">No students to show</p>
          <p className="mt-1 text-sm text-muted">
            {rosterHint ?? 'Enroll students in Student Management or submit attendance for this period.'}
          </p>
        </div>
      ) : displayRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-6 text-center sm:p-8">
          <p className="font-semibold text-navy">No students match this filter</p>
          <p className="mt-1 text-sm text-muted">
            {statusFilter === 'marked'
              ? 'No marked students yet — switch to All or Unmarked.'
              : statusFilter === 'unmarked'
                ? 'Everyone has been marked.'
                : 'Try a different search term.'}
          </p>
          {(statusFilter !== 'all' || studentSearch) && (
            <button
              type="button"
              className="btn-secondary mt-4 text-sm"
              onClick={() => {
                onStatusFilterChange('all');
                onSearchChange('');
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-gradient-to-r from-slate-50 to-white text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Status</th>
                  {!viewOnly && <th className="px-4 py-3">Mark</th>}
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, idx) => (
                  <tr key={row.studentCode} className="border-b border-border/60 hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-muted">{row.rollNumber ?? idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-navy">{row.fullName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{row.studentCode}</td>
                    <td className="px-4 py-3">
                      <AttendanceStatusBadge status={row.status} />
                    </td>
                    {!viewOnly && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {STATUS_OPTIONS.slice(0, 4).map((opt) => (
                            <AttendanceStatusButton
                              key={opt.value}
                              status={opt.value}
                              active={row.status === opt.value}
                              compact
                              onClick={() => onSetStatus(row.studentCode, opt.value)}
                            />
                          ))}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs text-muted">{row.reason ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted">{row.arrivalTime ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 md:hidden">
            {displayRows.map((row, idx) => (
              <MobileStudentCard
                key={row.studentCode}
                row={row}
                index={row.rollNumber ?? String(idx + 1)}
                readonly={viewOnly}
                scheduledStart={lesson?.startTime}
                onChange={(patch) => onUpdateRow(row.studentCode, patch)}
                onStatus={(s) => onSetStatus(row.studentCode, s)}
              />
            ))}
          </div>
        </>
      )}

      {!viewOnly && rows.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
            <div className="grid grid-cols-4 gap-1">
              {(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as AttendanceStatus[]).map((status) => (
                <AttendanceToolbarButton
                  key={status}
                  status={status}
                  onClick={() => onBulkStatus(status)}
                  variant="secondary"
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="btn-secondary inline-flex items-center justify-center gap-1.5 !py-2.5 text-sm"
                disabled={saving}
                onClick={onSaveDraft}
              >
                <Save className="h-4 w-4" /> Draft
              </button>
              <button
                type="button"
                className="btn-primary !py-2.5 text-sm"
                disabled={saving || rows.length === 0}
                onClick={onReview}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = 'default',
  className = '',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'emerald' | 'amber' | 'red' | 'sky';
  className?: string;
}) {
  const colors = {
    default: 'text-navy',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
    sky: 'text-sky-700',
  };
  return (
    <div className={`rounded-xl border border-border bg-white px-2.5 py-2 sm:px-3 ${className}`}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted sm:text-[10px]">{label}</p>
      <p className={`text-base font-bold sm:text-xl ${colors[tone]}`}>{value}</p>
    </div>
  );
}

function MobileStudentCard({
  row,
  index,
  readonly,
  scheduledStart,
  onChange,
  onStatus,
}: {
  row: SmartAttendanceRow;
  index: string | number;
  readonly: boolean;
  scheduledStart?: string;
  onChange: (patch: Partial<SmartAttendanceRow>) => void;
  onStatus: (s: AttendanceStatus) => void;
}) {
  return (
    <article className="rounded-xl border border-border bg-white p-3 shadow-sm">
      <div className="flex gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-muted">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-navy [overflow-wrap:anywhere]">{row.fullName}</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted">{row.studentCode}</p>
          <div className="mt-2">
            <AttendanceStatusBadge status={row.status} compact />
          </div>
          {(row.reason || row.arrivalTime) && (
            <div className="mt-2 space-y-0.5 text-[11px] text-muted">
              {row.reason && <p>Reason: {row.reason}</p>}
              {row.arrivalTime && <p>Arrived: {row.arrivalTime}</p>}
            </div>
          )}
        </div>
      </div>

      {!readonly && (
        <div className="mt-3 grid grid-cols-4 gap-1 border-t border-border/60 pt-3">
          {STATUS_OPTIONS.slice(0, 4).map((opt) => (
            <AttendanceStatusButton
              key={opt.value}
              status={opt.value}
              active={row.status === opt.value}
              compact
              onClick={() => onStatus(opt.value)}
            />
          ))}
        </div>
      )}

      {row.status === 'LATE' && !readonly && (
        <div className="mt-3 space-y-2 rounded-xl bg-amber-50/80 p-3">
          <label className="block text-xs font-semibold text-amber-900">
            Arrival time
            <input
              type="time"
              className="input mt-1 w-full !py-2 text-sm"
              value={row.arrivalTime ?? ''}
              onChange={(e) =>
                onChange({
                  arrivalTime: e.target.value,
                  minutesLate: scheduledStart
                    ? computeMinutesLate(scheduledStart, e.target.value)
                    : 0,
                })
              }
            />
          </label>
          <select
            className="input w-full !py-2 text-sm"
            value={row.reason ?? ''}
            onChange={(e) => onChange({ reason: e.target.value })}
          >
            <option value="">Reason…</option>
            {LATE_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      )}
      {row.status === 'ABSENT' && !readonly && (
        <div className="mt-3 rounded-xl bg-red-50/80 p-3">
          <p className="mb-2 text-xs font-semibold text-red-900">Reason</p>
          <div className="flex flex-wrap gap-1.5">
            {ABSENT_REASONS.map((r) => (
              <label
                key={r}
                className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-[11px]"
              >
                <input
                  type="radio"
                  name={`absent-${row.studentCode}`}
                  checked={row.reason === r}
                  onChange={() => onChange({ reason: r })}
                />
                {r}
              </label>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
