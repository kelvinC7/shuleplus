'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import {
  fetchAttendanceHistory,
  fetchLessonAttendance,
  fetchTeacherToday,
  saveLessonAttendance,
  smartApiError,
  startLesson,
} from '@/services/timetable-smart-api';
import type {
  AttendanceAccess,
  AttendanceHistoryRow,
  AttendanceStatus,
  LessonSession,
  SmartAttendanceRow,
  SmartLesson,
  TeacherTodayData,
} from '@/types/smart-timetable';
import { type SortMode, type StatusFilter } from './constants';
import { clearDraft, loadDraft, saveDraft } from './offline-store';
import {
  AttendanceHistoryPanel,
  historyRowToLesson,
} from './attendance-history-panel';
import { AttendanceSessionPanel } from './attendance-session-panel';
import {
  bulkSetStatus,
  computeMinutesLate,
  countByStatus,
  currentTimeHm,
  defaultUnmarkedPresent,
  formatTodayLabel,
  minutesRemaining,
  sortRows,
  isMarkedStatus,
} from './utils';
import { TodayPeriodsTable } from './today-periods-table';

type Tab = 'current' | 'today' | 'history';

export function PeriodAttendanceView() {
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');
  const { term, academicYear, settings } = useAcademicSettings();

  const [tab, setTab] = useState<Tab>('current');
  const [today, setToday] = useState<TeacherTodayData | null>(null);
  const [history, setHistory] = useState<AttendanceHistoryRow[]>([]);
  const [activeLesson, setActiveLesson] = useState<SmartLesson | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(sessionIdParam);
  const [access, setAccess] = useState<AttendanceAccess | null>(null);
  const [rows, setRows] = useState<SmartAttendanceRow[]>([]);
  const [meta, setMeta] = useState<{ source?: string; demo?: boolean } | null>(null);
  const [filterClass, setFilterClass] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('roll');
  const [pageLoading, setPageLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rosterHint, setRosterHint] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [submitted, setSubmitted] = useState<{
    reference: string | null;
    at: string;
    lesson: SmartLesson;
  } | null>(null);
  const [offline, setOffline] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [historyClassFilter, setHistoryClassFilter] = useState('');
  const [historyCourseFilter, setHistoryCourseFilter] = useState('');

  const filtersLocked = Boolean(activeLesson?.phase === 'current' && sessionId);

  useEffect(() => {
    if (filtersLocked && activeLesson) {
      setFilterClass(activeLesson.className);
      setFilterCourse(activeLesson.subjectName);
    }
  }, [filtersLocked, activeLesson]);

  const loadToday = useCallback(async () => {
    try {
      const data = await fetchTeacherToday({
        term,
        academicYear,
        ...(filterDate ? { date: filterDate } : {}),
      });
      setToday(data);
      setFilterDate((prev) => prev || data.date);
      return data;
    } catch (err) {
      setError(smartApiError(err, 'Could not load timetable'));
      return null;
    }
  }, [term, academicYear, filterDate]);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await fetchAttendanceHistory({ term, academicYear, limit: 100 }));
    } catch {
      setHistory([]);
    }
  }, [term, academicYear]);

  function sessionToLesson(session: LessonSession, id: string): SmartLesson {
    return {
      timetableId: session.timetableId,
      className: session.className ?? '',
      stream: null,
      subjectName: session.subjectName ?? '',
      teacherUserId: '',
      teacherName: session.teacherName ?? '',
      dayOfWeek: '',
      startTime: session.scheduledStart ?? '',
      endTime: session.scheduledEnd ?? '',
      room: session.room ?? null,
      term: '',
      academicYear: '',
      periodLabel: session.periodLabel ?? null,
      phase: 'past',
      lessonStatus: session.status,
      punctuality: '',
      qrVerified: session.qrVerified,
      attendanceDone: session.attendanceDone,
      attendanceSubmittedAt: session.attendanceSubmittedAt,
      attendanceReference: session.attendanceReference,
      sessionId: id,
      scannedAt: null,
      startedAt: null,
      completedAt: null,
      topic: session.topic ?? null,
    };
  }

  function closeSession() {
    setSessionId(null);
    setActiveLesson(null);
    setRows([]);
    setAccess(null);
    setMeta(null);
    setRosterHint(null);
    setSubmitted(null);
    setStudentSearch('');
    setStatusFilter('all');
  }

  const loadAttendance = useCallback(async (id: string, lesson?: SmartLesson | null) => {
    setRosterLoading(true);
    setError(null);
    setRosterHint(null);
    try {
      const payload = await fetchLessonAttendance(id);
      const draft = payload.access?.canEdit ? loadDraft(id) : null;
      const rawRows = draft ?? payload.rows;
      const initialRows =
        !draft && payload.source === 'saved'
          ? rawRows
          : defaultUnmarkedPresent(rawRows);
      setRows(initialRows);
      setAccess(payload.access);
      setMeta({ source: payload.source, demo: payload.demo });
      setSessionId(id);
      setStudentSearch('');
      setStatusFilter('all');
      const resolvedLesson =
        lesson ??
        today?.lessons.find((l) => l.sessionId === id) ??
        sessionToLesson(payload.session, id);
      setActiveLesson(resolvedLesson);
      if (payload.rows.length === 0 && payload.source === 'academic') {
        const label = payload.rosterMeta?.classLabel ?? lesson?.className ?? 'this class';
        if (payload.rosterMeta?.matched === false) {
          setRosterHint(
            `No Student Management class matched "${label}". In Student Management, create class "${label}" (name + stream) and enroll students, matching the timetable class name exactly.`
          );
        } else if (payload.rosterMeta?.matched === true) {
          setRosterHint(
            `Class "${label}" was found in Student Management but no active enrollments were returned. Confirm students are enrolled for ${academicYear} with status Active.`
          );
        } else {
          setRosterHint(
            `No students found for ${label}. Open Student Management → enroll active students in this class with a current enrollment for ${academicYear}.`
          );
        }
      }
    } catch (err) {
      setError(smartApiError(err, 'Could not load attendance'));
      setRows([]);
      setAccess(null);
    } finally {
      setRosterLoading(false);
    }
  }, [today]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setPageLoading(true);
      const data = await loadToday();
      await loadHistory();
      if (cancelled) return;
      setPageLoading(false);
      if (sessionIdParam && data) {
        const lesson = data.lessons.find((l) => l.sessionId === sessionIdParam);
        await loadAttendance(sessionIdParam, lesson ?? data.current ?? undefined);
      } else if (data?.current) {
        setActiveLesson(data.current);
        setTab('current');
      } else if (data) {
        setTab('today');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [term, academicYear, sessionIdParam]);

  useEffect(() => {
    if (tab !== 'today' || !filterDate || pageLoading) return;
    void loadToday();
  }, [filterDate, tab]);

  useEffect(() => {
    function onOffline() {
      setOffline(true);
    }
    function onOnline() {
      setOffline(false);
    }
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const authorizedLessons = useMemo(() => {
    if (!today) return [];
    return today.lessons.filter((l) => {
      if (filterClass && l.className !== filterClass) return false;
      if (filterCourse && l.subjectName !== filterCourse) return false;
      return true;
    });
  }, [today, filterClass, filterCourse]);

  const displayRows = useMemo(() => {
    const sorted = sortRows(rows, sortMode);
    const q = studentSearch.trim().toLowerCase();
    return sorted.filter((r) => {
      if (statusFilter === 'marked' && !isMarkedStatus(r.status)) return false;
      if (statusFilter === 'unmarked' && isMarkedStatus(r.status)) return false;
      if (!q) return true;
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.studentCode.toLowerCase().includes(q) ||
        (r.rollNumber ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, sortMode, studentSearch, statusFilter]);

  const historyClassOptions = useMemo(
    () => [...new Set(history.map((h) => h.className))].sort(),
    [history]
  );
  const historyCourseOptions = useMemo(
    () => [...new Set(history.map((h) => h.subjectName))].sort(),
    [history]
  );

  const counts = useMemo(() => countByStatus(rows), [rows]);
  const progressPct = counts.total ? Math.round((counts.marked / counts.total) * 100) : 0;

  async function openAttendance(lesson: SmartLesson) {
    setOpening(true);
    setError(null);
    setSubmitted(null);
    try {
      let sid = lesson.sessionId;
      if (!sid) {
        const session = await startLesson({ timetableId: lesson.timetableId, skipQr: true });
        sid = session.id;
      }
      setActiveLesson({ ...lesson, sessionId: sid });
      await loadAttendance(sid, { ...lesson, sessionId: sid });
      setTab(lesson.phase === 'current' ? 'current' : 'today');
    } catch (err) {
      setError(smartApiError(err, 'Could not open attendance for this period'));
    } finally {
      setOpening(false);
    }
  }

  async function viewHistoryRecord(record: AttendanceHistoryRow) {
    setError(null);
    setSubmitted(null);
    const lesson = historyRowToLesson(record);
    setActiveLesson(lesson);
    await loadAttendance(record.sessionId, lesson);
  }
  async function handleRefresh() {
    setPageLoading(true);
    const data = await loadToday();
    await loadHistory();
    setPageLoading(false);
    if (sessionId) {
      const lesson = data?.lessons.find((l) => l.sessionId === sessionId) ?? activeLesson;
      await loadAttendance(sessionId, lesson);
    }
  }

  async function handleSaveDraft() {
    if (!sessionId || !access?.canEdit) return;
    saveDraft(sessionId, rows, offline);
    setError(null);
  }

  async function handleSubmit() {
    if (!sessionId || !activeLesson) return;
    setSaving(true);
    setError(null);
    try {
      const result = await saveLessonAttendance(sessionId, rows, true);
      setRows(result.rows);
      clearDraft(sessionId);
      setSubmitted({
        reference: result.reference,
        at: result.submittedAt ?? new Date().toISOString(),
        lesson: activeLesson,
      });
      setShowReview(false);
      await loadToday();
      await loadHistory();
    } catch (err) {
      if (!navigator.onLine) {
        saveDraft(sessionId, rows, true);
        setError('Saved offline — will sync when you reconnect.');
      } else {
        setError(smartApiError(err, 'Could not submit attendance'));
      }
    } finally {
      setSaving(false);
    }
  }

  function updateRow(code: string, patch: Partial<SmartAttendanceRow>) {
    setRows((prev) => prev.map((r) => (r.studentCode === code ? { ...r, ...patch } : r)));
  }

  function setStatus(code: string, status: AttendanceStatus) {
    const now = currentTimeHm();
    const start = activeLesson?.startTime ?? '08:00';
    updateRow(code, {
      status,
      ...(status === 'LATE'
        ? { arrivalTime: now, minutesLate: computeMinutesLate(start, now) }
        : {}),
      ...(status === 'PRESENT' ? { reason: null, arrivalTime: null, minutesLate: null, notes: null } : {}),
    });
  }

  const current = today?.current ?? null;
  const next = today?.next ?? null;
  const readonly = access ? !access.canEdit : false;
  const inSession = Boolean(sessionId && access);

  return (
    <div className={`min-w-0 max-w-full ${inSession ? 'space-y-3 pb-4 md:space-y-6 md:pb-10' : 'space-y-6 pb-10'}`}>
      {!inSession && (
        <>
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-navy sm:text-2xl">Period Attendance</h1>
              <p className="mt-1 text-sm text-muted">
                Mark today&apos;s periods or review past attendance and student lists.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" className="btn-secondary inline-flex items-center gap-2 text-sm" onClick={() => void handleRefresh()}>
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
              <Link href="/my-teaching" className="btn-secondary text-sm">My Teaching</Link>
            </div>
          </div>

          {/* Context bar */}
          <div className="grid gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            <ContextItem label="Academic Year" value={academicYear} />
            <ContextItem label="Term" value={term} />
            <ContextItem
              label="Today"
              value={today ? formatTodayLabel(today.date, today.dayOfWeek) : '—'}
            />
            <ContextItem label="Current Time" value={currentTimeHm()} />
          </div>
        </>
      )}

      {offline && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <WifiOff className="h-4 w-4 shrink-0" /> Offline mode — changes are saved locally and will sync when online.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {pageLoading && !today && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading timetable…
        </div>
      )}

      {rosterHint && !sessionId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {rosterHint}
        </div>
      )}

      {!sessionId && (
        <CurrentPeriodCard
          lesson={current}
          next={next}
          opening={opening}
          onStart={(l) => void openAttendance(l)}
        />
      )}

      {!inSession && (
        <div className="flex w-full max-w-full overflow-x-auto rounded-xl border border-border bg-white p-1 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(['current', 'today', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold capitalize transition sm:px-4 ${
                tab === t ? 'bg-primary text-navy' : 'text-muted hover:text-navy'
              }`}
            >
              {t === 'history' ? 'Previous Lessons' : t === 'today' ? 'By date' : t}
            </button>
          ))}
        </div>
      )}

      {inSession ? (
        <AttendanceSessionPanel
          lesson={activeLesson}
          rows={rows}
          displayRows={displayRows}
          access={access}
          meta={meta}
          readonly={readonly}
          rosterHint={rosterHint}
          rosterLoading={rosterLoading}
          counts={counts}
          progressPct={progressPct}
          sortMode={sortMode}
          statusFilter={statusFilter}
          studentSearch={studentSearch}
          saving={saving}
          submitted={submitted ? { reference: submitted.reference, at: submitted.at } : null}
          onClose={closeSession}
          onSaveDraft={() => void handleSaveDraft()}
          onReview={() => setShowReview(true)}
          onSortChange={setSortMode}
          onStatusFilterChange={setStatusFilter}
          onSearchChange={setStudentSearch}
          onBulkStatus={(status) => setRows((r) => bulkSetStatus(r, status))}
          onUpdateRow={updateRow}
          onSetStatus={setStatus}
        />
      ) : (
        <>
          {tab === 'current' && !today?.current && (
            <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
              <p className="font-semibold text-navy">No active lesson right now</p>
              <p className="mt-1 text-sm text-muted">
                Open <button type="button" className="font-semibold text-navy underline" onClick={() => setTab('today')}>Today</button>
                {' '}to mark past periods, or{' '}
                <button type="button" className="font-semibold text-navy underline" onClick={() => setTab('history')}>Previous Lessons</button>
                {' '}to review submitted attendance.
              </p>
            </div>
          )}

          {(tab === 'today' || tab === 'history') && (
            <div className="grid gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <FilterSelect
                label="Academic Year"
                value={academicYear}
                locked={filtersLocked}
                options={(settings?.academicYears ?? [academicYear]).map((y) => ({ value: y, label: y }))}
                onChange={() => {}}
              />
              <FilterSelect
                label="Term"
                value={term}
                locked={filtersLocked}
                options={(settings?.terms ?? [term]).map((t) => ({ value: t, label: t }))}
                onChange={() => {}}
              />
              {tab === 'today' && (
                <>
                  <FilterDateInput
                    label="Date"
                    value={filterDate}
                    onChange={setFilterDate}
                    disabled={filtersLocked}
                  />
                  <FilterSelect
                    label="Day"
                    value={today?.dayOfWeek ?? ''}
                    locked
                    options={[
                      { value: today?.dayOfWeek ?? '', label: today?.dayOfWeek ?? '—' },
                    ]}
                    onChange={() => {}}
                  />
                  <FilterSelect
                    label="Class"
                    value={filterClass}
                    locked={filtersLocked && Boolean(activeLesson?.className)}
                    options={[
                      { value: '', label: 'All classes' },
                      ...[...new Set(today?.lessons.map((l) => l.className) ?? [])].map((c) => ({ value: c, label: c })),
                    ]}
                    onChange={setFilterClass}
                  />
                  <FilterSelect
                    label="Course"
                    value={filterCourse}
                    locked={filtersLocked && Boolean(activeLesson?.subjectName)}
                    options={[
                      { value: '', label: 'All courses' },
                      ...[...new Set(today?.lessons.map((l) => l.subjectName) ?? [])].map((c) => ({ value: c, label: c })),
                    ]}
                    onChange={setFilterCourse}
                  />
                </>
              )}
            </div>
          )}

          {tab === 'today' && today && (
            <p className="text-sm text-muted">
              {formatTodayLabel(today.date, today.dayOfWeek)} · {authorizedLessons.length} period
              {authorizedLessons.length === 1 ? '' : 's'}
            </p>
          )}

          {tab === 'today' && (
            <TodayPeriodsTable lessons={authorizedLessons} onOpen={(l) => void openAttendance(l)} />
          )}

          {tab === 'history' && (
            <AttendanceHistoryPanel
              rows={history}
              search={historySearch}
              classFilter={historyClassFilter}
              courseFilter={historyCourseFilter}
              onSearchChange={setHistorySearch}
              onClassFilterChange={setHistoryClassFilter}
              onCourseFilterChange={setHistoryCourseFilter}
              classOptions={historyClassOptions}
              courseOptions={historyCourseOptions}
              onView={(row) => void viewHistoryRecord(row)}
              selectedSessionId={sessionId}
            />
          )}
        </>
      )}

      {showReview && activeLesson && (
        <ReviewModal
          lesson={activeLesson}
          counts={counts}
          saving={saving}
          onClose={() => setShowReview(false)}
          onSubmit={() => void handleSubmit()}
        />
      )}
    </div>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 font-semibold text-navy">{value}</p>
    </div>
  );
}

function CurrentPeriodCard({
  lesson,
  next,
  opening,
  onStart,
}: {
  lesson: SmartLesson | null;
  next: SmartLesson | null;
  opening: boolean;
  onStart: (l: SmartLesson) => void;
}) {
  if (!lesson || lesson.phase !== 'current') {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Current period</p>
        <p className="mt-2 text-lg font-semibold text-navy">No active lesson</p>
        {next ? (
          <p className="mt-2 text-sm text-muted">
            Your next lesson starts at {next.startTime}.{' '}
            <span className="font-semibold text-navy">
              {next.periodLabel} · {next.subjectName} · {next.className}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">No more lessons scheduled for today.</p>
        )}
      </div>
    );
  }

  const remaining = minutesRemaining(lesson.endTime);

  return (
    <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50/80 to-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
        <p className="text-xs font-bold uppercase tracking-wider text-red-700">Current period</p>
      </div>
      <p className="mt-2 text-lg font-bold text-navy">
        {lesson.periodLabel ?? 'Period'} · {lesson.startTime} – {lesson.endTime}
      </p>
      <p className="mt-1 font-semibold text-navy">{lesson.subjectName}</p>
      <p className="text-sm text-muted">
        {lesson.className} · Room {lesson.room ?? '—'} · Teacher {lesson.teacherName}
      </p>
      {remaining !== null && (
        <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-700">
          <Clock className="h-4 w-4" /> {remaining} minutes remaining
        </p>
      )}
      {!lesson.attendanceDone && (
        <button type="button" className="btn-primary mt-4" disabled={opening} onClick={() => onStart(lesson)}>
          {opening ? 'Opening…' : 'Start attendance'}
        </button>
      )}
      {lesson.attendanceDone && (
        <p className="mt-3 text-sm font-semibold text-emerald-700">✅ Attendance submitted for this period</p>
      )}
    </div>
  );
}

function FilterDateInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <input
        type="date"
        className="input mt-1 w-full !py-2 text-sm disabled:opacity-70"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  locked,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  locked?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <div className="relative mt-1">
        <select
          className="input w-full appearance-none !py-2 pr-8 text-sm disabled:opacity-70"
          value={value}
          disabled={locked}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </label>
  );
}

function ReviewModal({
  lesson,
  counts,
  saving,
  onClose,
  onSubmit,
}: {
  lesson: SmartLesson;
  counts: ReturnType<typeof countByStatus>;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-navy">Review attendance</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Class" value={lesson.className} />
          <Row label="Course" value={lesson.subjectName} />
          <Row label="Period" value={`${lesson.periodLabel ?? ''} ${lesson.startTime}–${lesson.endTime}`} />
          <Row label="Present" value={String(counts.present)} />
          <Row label="Late" value={String(counts.late)} />
          <Row label="Absent" value={String(counts.absent)} />
          <Row label="Total" value={String(counts.total)} />
        </dl>
        <div className="mt-6 flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Back</button>
          <button type="button" className="btn-primary flex-1" disabled={saving} onClick={onSubmit}>
            {saving ? 'Submitting…' : 'Submit attendance'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-navy">{value}</dd>
    </div>
  );
}
