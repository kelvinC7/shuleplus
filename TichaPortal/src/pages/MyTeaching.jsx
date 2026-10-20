import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Play,
  QrCode,
  RefreshCw,
  X,
} from 'lucide-react';
import TeacherPageShell from '../components/TeacherPageShell';
import { useAuth } from '../context/AuthContext';
import useTpAcademic from '../hooks/useTpAcademic';
import {
  completeLesson,
  fetchTeacherSchedule,
  fetchTeacherToday,
  startLesson,
  tpAcademicParams,
  tpApiError,
} from '../services/teacherPortalApi';

const btn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-sm text-[#000435] hover:bg-slate-50 transition-colors';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#000435] px-4 py-2.5 text-sm text-white hover:bg-[#000650] transition-colors disabled:opacity-50';

function statusTone(status) {
  switch (status) {
    case 'RUNNING':
      return 'text-emerald-700 bg-emerald-50';
    case 'COMPLETED':
      return 'text-slate-600 bg-slate-100';
    case 'MISSED':
      return 'text-red-700 bg-red-50';
    default:
      return 'text-amber-800 bg-amber-50';
  }
}

export default function MyTeaching() {
  const { teacher } = useAuth();
  const { ready, term, academicYear } = useTpAcademic();
  const [data, setData] = useState(null);
  const [weeklyClasses, setWeeklyClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [completeSession, setCompleteSession] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ac = tpAcademicParams(term, academicYear);
    try {
      const [today, week] = await Promise.all([
        fetchTeacherToday(ac),
        fetchTeacherSchedule('weekly', ac).catch(() => null),
      ]);
      setData(today);
      setWeeklyClasses(Array.isArray(week?.classes) ? week.classes : []);
    } catch (err) {
      setError(tpApiError(err, 'Could not load today’s teaching schedule'));
      setData(null);
      setWeeklyClasses([]);
    } finally {
      setLoading(false);
    }
  }, [term, academicYear]);

  useEffect(() => {
    if (!ready) return;
    load();
  }, [ready, load]);

  async function handleStart(lesson) {
    setBusyId(lesson.timetableId);
    setError(null);
    setSuccess(null);
    try {
      await startLesson({ timetableId: lesson.timetableId, skipQr: true });
      setSuccess(`Lesson started - ${lesson.subjectName}`);
      await load();
    } catch (err) {
      setError(tpApiError(err, 'Could not start lesson'));
    } finally {
      setBusyId(null);
    }
  }

  const kpis = data?.kpis;
  const firstName = teacher?.first_name || 'Teacher';

  const stats = [
    { label: 'Total Classes', value: loading && !data ? '-' : (kpis?.todayClasses ?? 0) },
    { label: 'Running Now', value: loading && !data ? '-' : (kpis?.classesRunning ?? 0) },
    { label: 'Lessons Done', value: loading && !data ? '-' : (kpis?.lessonsCompleted ?? 0) },
    { label: 'Pending Attendance', value: loading && !data ? '-' : (kpis?.pendingAttendance ?? 0) },
  ];

  const actions = (
    <>
      <Link to="/class-room-scan" className={btn}>
        <QrCode size={16} /> Scan QR
      </Link>
      <Link to="/timetable" className={btn}>
        Timetable
      </Link>
      <button type="button" className={btn} onClick={() => void load()}>
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
      </button>
    </>
  );

  return (
    <>
      <TeacherPageShell
        title="My Teaching"
        subtitle={`Welcome back, ${firstName}. Ready to inspire your students today?`}
        stats={stats}
        actions={actions}
      >
        {loading && !data ? (
          <div className="flex justify-center py-16 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
            )}
            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>
            )}

            {weeklyClasses.length > 0 && (
              <div className="rounded-2xl border border-[#000435]/10 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-3">
                  Your classes · {term} · {academicYear}
                </p>
                <div className="flex flex-wrap gap-2">
                  {weeklyClasses.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center rounded-xl bg-[#000435]/[0.06] px-3 py-1.5 text-xs font-bold text-[#000435]"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(data?.current || data?.next) && (
              <div className="tp-card divide-y divide-black/[0.06] overflow-hidden p-0 text-sm">
                {data.current ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Now</p>
                      <p className="text-[#000435]">{data.current.subjectName} · {data.current.className}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(data.current.lessonStatus)}`}>
                      {data.current.lessonStatus}
                    </span>
                  </div>
                ) : null}
                {data.next ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-50/50">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Next</p>
                      <p className="text-[#000435]">
                        {data.next.subjectName} · {data.next.startTime}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-[#000435]/10 bg-white shadow-sm">
              <div className="border-b border-black/[0.06] bg-gradient-to-r from-[#000435] to-[#12186a] px-4 py-4 text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">Today&apos;s periods</p>
                <h3 className="text-lg font-extrabold">{data?.dayOfWeek ?? '-'}</h3>
              </div>
              {(data?.lessons ?? []).length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm font-semibold text-slate-600">No periods scheduled for today.</p>
                  <p className="mt-1 text-xs text-slate-400">
                    When your school confirms your class timetable, it appears here and under Timetable.
                  </p>
                  <Link to="/timetable" className={`${btn} mt-4 inline-flex`}>
                    View weekly timetable
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-black/[0.06] p-2 sm:p-3 space-y-2">
                  {data.lessons.map((lesson) => (
                    <LessonRow
                      key={lesson.timetableId}
                      lesson={lesson}
                      busy={busyId === lesson.timetableId}
                      onStart={() => void handleStart(lesson)}
                      onComplete={() => setCompleteSession(lesson)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </TeacherPageShell>

      {completeSession?.sessionId ? (
        <LessonCompleteModal
          sessionId={completeSession.sessionId}
          subjectName={completeSession.subjectName}
          className={completeSession.className}
          onClose={() => setCompleteSession(null)}
          onCompleted={() => {
            setSuccess('Lesson marked complete');
            setCompleteSession(null);
            load();
          }}
        />
      ) : null}
    </>
  );
}

function LessonRow({ lesson, busy, onStart, onComplete }) {
  const canStart = lesson.lessonStatus !== 'RUNNING' && lesson.lessonStatus !== 'COMPLETED';
  const canAttend = Boolean(lesson.sessionId) && lesson.lessonStatus === 'RUNNING';
  const canComplete = Boolean(lesson.sessionId) && lesson.lessonStatus === 'RUNNING';
  const period = lesson.periodLabel || 'Period';

  return (
    <li className="rounded-xl border border-[#000435]/[0.08] bg-slate-50/40 px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex gap-3">
          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#000435] text-white">
            <span className="text-[9px] font-black uppercase opacity-70">Period</span>
            <span className="text-sm font-black leading-none">{period.replace(/^P/i, 'P')}</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-[#000435]">{lesson.subjectName}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone(lesson.lessonStatus)}`}>
                {lesson.lessonStatus}
              </span>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-[#000435]/80">{lesson.className}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {lesson.startTime}–{lesson.endTime}
              {lesson.room ? ` · Room ${lesson.room}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canStart ? (
            <button type="button" className={btnPrimary} disabled={busy} onClick={onStart}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play size={14} />}
              Start
            </button>
          ) : null}
          {canAttend ? (
            <Link to={`/attendance?sessionId=${lesson.sessionId}`} className={btn}>
              <ClipboardCheck size={14} /> Attendance
            </Link>
          ) : null}
          {canComplete ? (
            <button type="button" className={btn} onClick={onComplete}>
              <CheckCircle2 size={14} /> Complete
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function LessonCompleteModal({ sessionId, subjectName, className, onClose, onCompleted }) {
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [homework, setHomework] = useState('');
  const [objectives, setObjectives] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await completeLesson(sessionId, { topic, notes, homework, objectives, draft: false });
      onCompleted();
    } catch (err) {
      setError(tpApiError(err, 'Could not complete lesson'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#000435]/50 sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-lg text-[#000435]">Complete lesson</h3>
            <p className="text-sm text-slate-500">{[subjectName, className].filter(Boolean).join(' · ')}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 px-5 py-4">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
          <input className="tp-input" placeholder="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <input className="tp-input" placeholder="Objectives" value={objectives} onChange={(e) => setObjectives(e.target.value)} />
          <textarea className="tp-input min-h-[72px]" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <textarea className="tp-input min-h-[64px]" placeholder="Homework" value={homework} onChange={(e) => setHomework(e.target.value)} />
          <div className="flex gap-2 pt-2">
            <button type="button" className={`${btn} flex-1`} onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className={`${btnPrimary} flex-1`} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
