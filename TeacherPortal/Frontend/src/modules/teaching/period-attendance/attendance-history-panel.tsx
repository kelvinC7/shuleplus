'use client';

import { ChevronRight, Eye, Search } from 'lucide-react';
import type { AttendanceHistoryRow, SmartLesson } from '@/types/smart-timetable';

export function AttendanceHistoryPanel({
  rows,
  search,
  classFilter,
  courseFilter,
  onSearchChange,
  onClassFilterChange,
  onCourseFilterChange,
  classOptions,
  courseOptions,
  onView,
  selectedSessionId,
}: {
  rows: AttendanceHistoryRow[];
  search: string;
  classFilter: string;
  courseFilter: string;
  onSearchChange: (v: string) => void;
  onClassFilterChange: (v: string) => void;
  onCourseFilterChange: (v: string) => void;
  classOptions: string[];
  courseOptions: string[];
  onView: (row: AttendanceHistoryRow) => void;
  selectedSessionId?: string | null;
}) {
  const filtered = rows.filter((r) => {
    if (classFilter && r.className !== classFilter) return false;
    if (courseFilter && r.subjectName !== courseFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${r.className} ${r.subjectName} ${r.periodLabel ?? ''} ${r.reference ?? ''} ${r.date}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const totals = filtered.reduce(
    (acc, r) => ({
      sessions: acc.sessions + 1,
      students: acc.students + r.total,
      present: acc.present + r.present,
      absent: acc.absent + r.absent,
    }),
    { sessions: 0, students: 0, present: 0, absent: 0 }
  );

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
        <p className="font-semibold text-navy">No submitted attendance yet</p>
        <p className="mt-1 text-sm text-muted">
          Completed period attendance will appear here for review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HistoryKpi label="Sessions" value={totals.sessions} />
        <HistoryKpi label="Students marked" value={totals.students} />
        <HistoryKpi label="Present" value={totals.present} tone="emerald" />
        <HistoryKpi label="Absent" value={totals.absent} tone="red" />
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="input w-full !py-2 pl-9"
            placeholder="Search class, course, period, reference…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          className="input !w-auto !py-2"
          value={classFilter}
          onChange={(e) => onClassFilterChange(e.target.value)}
        >
          <option value="">All classes</option>
          {classOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="input !w-auto !py-2"
          value={courseFilter}
          onChange={(e) => onCourseFilterChange(e.target.value)}
        >
          <option value="">All courses</option>
          {courseOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-gradient-to-r from-slate-50 to-white text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              <th className="px-4 py-3.5">Date</th>
              <th className="px-4 py-3.5">Period</th>
              <th className="px-4 py-3.5">Class · Course</th>
              <th className="px-4 py-3.5">Present</th>
              <th className="px-4 py-3.5">Absent</th>
              <th className="px-4 py-3.5">Late</th>
              <th className="px-4 py-3.5">Reference</th>
              <th className="px-4 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const selected = selectedSessionId === r.sessionId;
              const rate = r.total ? Math.round((r.present / r.total) * 100) : 0;
              return (
                <tr
                  key={r.sessionId}
                  className={`border-b border-border/60 transition hover:bg-slate-50/80 ${
                    selected ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="px-4 py-3.5 font-medium text-navy">{r.date}</td>
                  <td className="px-4 py-3.5">
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-navy">
                      {r.periodLabel ?? '—'}
                    </span>
                    <p className="mt-0.5 text-xs text-muted">{r.startTime}–{r.endTime}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-navy">{r.className}</p>
                    <p className="text-xs text-muted">{r.subjectName}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-semibold text-emerald-700">{r.present}</span>
                    <span className="text-muted">/{r.total}</span>
                    <p className="text-[10px] text-muted">{rate}%</p>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-red-700">{r.absent}</td>
                  <td className="px-4 py-3.5 font-semibold text-amber-700">{r.late}</td>
                  <td className="px-4 py-3.5 font-mono text-[10px] text-muted">{r.reference ?? '—'}</td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => onView(r)}
                      className="inline-flex items-center gap-1 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy/90"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View students
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length && (
          <p className="p-8 text-center text-sm text-muted">No records match your filters.</p>
        )}
      </div>
    </div>
  );
}

function HistoryKpi({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'emerald' | 'red';
}) {
  const bg =
    tone === 'emerald'
      ? 'bg-emerald-50 border-emerald-100'
      : tone === 'red'
        ? 'bg-red-50 border-red-100'
        : 'bg-white border-border';
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${bg}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-navy">{value}</p>
    </div>
  );
}

export function historyRowToLesson(row: AttendanceHistoryRow): SmartLesson {
  return {
    timetableId: '',
    className: row.className,
    stream: null as string | null,
    subjectName: row.subjectName,
    teacherUserId: '',
    teacherName: '',
    dayOfWeek: '',
    startTime: row.startTime,
    endTime: row.endTime,
    room: null as string | null,
    term: row.term ?? '',
    academicYear: row.academicYear ?? '',
    periodLabel: row.periodLabel,
    phase: 'past' as const,
    lessonStatus: 'completed',
    punctuality: '',
    qrVerified: false,
    attendanceDone: true,
    attendanceSubmittedAt: row.submittedAt,
    attendanceReference: row.reference,
    sessionId: row.sessionId,
    scannedAt: null as string | null,
    startedAt: null as string | null,
    completedAt: null as string | null,
    topic: null as string | null,
  };
}
