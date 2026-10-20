'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Play,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import {
  fetchTeacherToday,
  smartApiError,
  startLesson,
} from '@/services/timetable-smart-api';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import type { SmartLesson, TeacherTodayData } from '@/types/smart-timetable';
import { LessonCompleteModal } from './lesson-complete-view';

function statusTone(status: string) {
  switch (status) {
    case 'RUNNING':
      return 'bg-emerald-100 text-emerald-800';
    case 'COMPLETED':
      return 'bg-slate-100 text-slate-700';
    case 'MISSED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-amber-100 text-amber-900';
  }
}

export function MyTeachingView() {
  const { term, academicYear } = useAcademicSettings();
  const [data, setData] = useState<TeacherTodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [completeSession, setCompleteSession] = useState<SmartLesson | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchTeacherToday({ term, academicYear }));
    } catch (err) {
      setError(smartApiError(err, 'Could not load today’s teaching schedule'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [term, academicYear]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStart(lesson: SmartLesson, skipQr = false) {
    setBusyId(lesson.timetableId);
    setError(null);
    setSuccess(null);
    try {
      const session = await startLesson({ timetableId: lesson.timetableId, skipQr });
      setSuccess(`Lesson started — ${lesson.subjectName}`);
      await load();
      if (session.id) {
        // keep UI fresh; session id available via reload
      }
    } catch (err) {
      setError(smartApiError(err, 'Could not start lesson'));
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading today’s classes…
      </div>
    );
  }

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">My Teaching</h1>
          <p className="mt-1 text-sm text-muted">
            {data ? `${data.dayOfWeek} · ${data.date}` : 'Today’s lessons and actions'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/classroom-scan" className="btn-secondary inline-flex items-center gap-2">
            <QrCode className="h-4 w-4" /> Scan QR
          </Link>
          <Link href="/timetable" className="btn-secondary">
            Weekly schedule
          </Link>
          <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={load}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Today’s classes" value={kpis?.todayClasses ?? 0} />
        <Kpi label="Running" value={kpis?.classesRunning ?? 0} />
        <Kpi label="Completed" value={kpis?.lessonsCompleted ?? 0} />
        <Kpi label="Pending attendance" value={kpis?.pendingAttendance ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HighlightCard title="Current" lesson={data?.current ?? null} empty="No class in progress" />
        <HighlightCard title="Next" lesson={data?.next ?? null} empty="No upcoming class" />
      </div>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-navy">Today’s classes</h2>
        <div className="mt-4 space-y-3">
          {(data?.lessons ?? []).length === 0 ? (
            <p className="text-sm text-muted">No lessons scheduled for today.</p>
          ) : (
            data!.lessons.map((lesson) => (
              <LessonRow
                key={lesson.timetableId}
                lesson={lesson}
                busy={busyId === lesson.timetableId}
                onStart={() => handleStart(lesson, true)}
                onComplete={() => setCompleteSession(lesson)}
              />
            ))
          )}
        </div>
      </section>

      {completeSession?.sessionId ? (
        <LessonCompleteModal
          sessionId={completeSession.sessionId}
          subjectName={completeSession.subjectName}
          className={completeSession.className}
          onClose={() => setCompleteSession(null)}
          onCompleted={() => {
            setSuccess('Lesson marked complete');
            load();
          }}
        />
      ) : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.1)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-navy">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-navy">{value}</p>
    </div>
  );
}

function HighlightCard({
  title,
  lesson,
  empty,
}: {
  title: string;
  lesson: SmartLesson | null;
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{title}</p>
      {lesson ? (
        <div className="mt-2">
          <p className="text-lg font-bold text-navy">{lesson.subjectName}</p>
          <p className="text-sm text-muted">
            {lesson.className} · {lesson.startTime}–{lesson.endTime}
            {lesson.room ? ` · ${lesson.room}` : ''}
          </p>
          <span
            className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone(lesson.lessonStatus)}`}
          >
            {lesson.lessonStatus}
          </span>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      )}
    </div>
  );
}

function LessonRow({
  lesson,
  busy,
  onStart,
  onComplete,
}: {
  lesson: SmartLesson;
  busy: boolean;
  onStart: () => void;
  onComplete: () => void;
}) {
  const canStart = lesson.lessonStatus !== 'RUNNING' && lesson.lessonStatus !== 'COMPLETED';
  const canAttend = Boolean(lesson.sessionId) && lesson.lessonStatus === 'RUNNING';
  const canComplete = Boolean(lesson.sessionId) && lesson.lessonStatus === 'RUNNING';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-navy">{lesson.subjectName}</p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(lesson.lessonStatus)}`}
          >
            {lesson.lessonStatus}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {lesson.className} · {lesson.startTime}–{lesson.endTime}
          {lesson.room ? ` · Room ${lesson.room}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canStart ? (
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-1.5 !px-3 !py-2 text-xs"
            disabled={busy}
            onClick={onStart}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Start lesson
          </button>
        ) : null}
        <Link
          href="/classroom-scan"
          className="btn-secondary inline-flex items-center gap-1.5 !px-3 !py-2 text-xs"
        >
          <QrCode className="h-3.5 w-3.5" /> Scan QR
        </Link>
        {canAttend ? (
          <Link
            href={`/attendance?sessionId=${lesson.sessionId}`}
            className="btn-secondary inline-flex items-center gap-1.5 !px-3 !py-2 text-xs"
          >
            <ClipboardCheck className="h-3.5 w-3.5" /> Attendance
          </Link>
        ) : (
          <Link
            href="/attendance"
            className="btn-secondary inline-flex items-center gap-1.5 !px-3 !py-2 text-xs"
          >
            <ClipboardCheck className="h-3.5 w-3.5" /> Attendance
          </Link>
        )}
        {canComplete ? (
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-1.5 !px-3 !py-2 text-xs"
            onClick={onComplete}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Complete
          </button>
        ) : null}
      </div>
    </div>
  );
}
