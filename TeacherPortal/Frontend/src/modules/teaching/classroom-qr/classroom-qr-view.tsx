'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  History,
  Keyboard,
  Loader2,
  MapPin,
  QrCode,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { CheckInStatusPill, PunctualityBanner, punctualityLabel } from '@/components/check-in-status-ui';
import {
  fetchCheckInHistory,
  fetchTeacherToday,
  scanClassroomQr,
  smartApiError,
} from '@/services/timetable-smart-api';
import type { CheckInHistoryRow, QrCheckInResult, SmartLesson, TeacherTodayData } from '@/types/smart-timetable';
import { QrScannerModal } from './qr-scanner-modal';

type Tab = 'scan' | 'history';
type Flow = 'home' | 'scanner' | 'manual' | 'result';

function minutesUntil(startTime: string): number | null {
  const now = new Date();
  const [h, m] = startTime.split(':').map(Number);
  const start = new Date(now);
  start.setHours(h, m, 0, 0);
  const diff = Math.round((start.getTime() - now.getTime()) / 60000);
  return diff > 0 ? diff : null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeClassroomCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const prefixed =
    trimmed.match(/\b(\d{3,})-QR-CLS-(\d+)\b/i) ??
    trimmed.match(/\b(\d{3,})-QR-CLASS-(\d+)\b/i) ??
    trimmed.match(/\b([A-Z0-9]{3,})-QR-CLS-(\d+)\b/i);
  if (prefixed) return `${prefixed[1]}-QR-CLS-${prefixed[2]}`.toUpperCase();
  const match = trimmed.match(/QR-CLS-\d+/i) ?? trimmed.match(/QR-CLASS-\d+/i);
  if (match) return match[0].toUpperCase().replace('QR-CLASS', 'QR-CLS');
  return trimmed;
}

export function ClassroomQrView() {
  const router = useRouter();
  const { term, academicYear, setTerm, setAcademicYear, settings } = useAcademicSettings();

  const [tab, setTab] = useState<Tab>('scan');
  const [flow, setFlow] = useState<Flow>('home');
  const [filterDate, setFilterDate] = useState(todayIso());
  const [today, setToday] = useState<TeacherTodayData | null>(null);
  const [history, setHistory] = useState<CheckInHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<QrCheckInResult | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError(null);
    try {
      const [todayData, historyData] = await Promise.all([
        fetchTeacherToday({ term, academicYear, date: filterDate }),
        fetchCheckInHistory({ term, academicYear, date: filterDate, limit: 30 }),
      ]);
      setToday(todayData);
      setHistory(historyData);
    } catch (err) {
      if (!silent) setError(smartApiError(err, 'Could not load classroom check-in data'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [term, academicYear, filterDate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab !== 'scan' || filterDate !== todayIso()) return;
    const id = window.setInterval(() => void load(true), 8000);
    return () => window.clearInterval(id);
  }, [tab, filterDate, load]);

  const focusLesson = today?.current ?? today?.next ?? null;
  const isToday = filterDate === todayIso();

  const kpis = useMemo(
    () => ({
      lessons: today?.kpis.todayClasses ?? 0,
      checkedIn: today?.kpis.checkedIn ?? 0,
      late: today?.kpis.lateArrivals ?? 0,
      missing: today?.kpis.notCheckedIn ?? 0,
    }),
    [today]
  );

  async function verifyCode(code: string) {
    const trimmed = normalizeClassroomCode(code);
    if (!trimmed) {
      setError('Enter a classroom QR code');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = await scanClassroomQr(trimmed);
      setResult(payload);
      setFlow('result');
      if (payload.ok) await load();
    } catch (err) {
      setError(smartApiError(err, 'Could not verify classroom QR'));
    } finally {
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setFlow('home');
    setResult(null);
    setManualCode('');
    setError(null);
  }

  if (flow === 'scanner') {
    return (
      <QrScannerModal
        onClose={resetFlow}
        onManual={() => setFlow('manual')}
        onScan={(code) => {
          setFlow('home');
          void verifyCode(code);
        }}
      />
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 pb-8 sm:space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-primary">
              <QrCode className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Classroom Check-In</span>
            </div>
            <h1 className="mt-1 text-xl font-bold text-navy sm:text-2xl">Classroom QR</h1>
            <p className="mt-1 text-sm text-muted">
              Verify your classroom presence for the scheduled period. Scan the room QR or enter the classroom code.
            </p>
          </div>
          <button type="button" className="btn-secondary inline-flex shrink-0 items-center gap-2 text-sm" onClick={() => void load()}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <FilterSelect
            label="Academic Year"
            value={academicYear}
            onChange={setAcademicYear}
            options={(settings?.academicYears ?? [academicYear]).map((y) => ({ value: y, label: y }))}
          />
          <FilterSelect
            label="Term"
            value={term}
            onChange={setTerm}
            options={(settings?.terms ?? [term]).map((t) => ({ value: t, label: t }))}
          />
          <FilterDate label="Date" value={filterDate} onChange={setFilterDate} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <KpiCard label="Lessons" value={kpis.lessons} />
        <KpiCard label="Checked In" value={kpis.checkedIn} tone="emerald" />
        <KpiCard label="Late" value={kpis.late} tone="amber" />
      </div>

      <div className="inline-flex w-full max-w-full overflow-x-auto rounded-xl border border-border bg-white p-1 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {([
          { id: 'scan' as const, label: 'Check-In', icon: QrCode },
          { id: 'history' as const, label: 'History', icon: History },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold ${
              tab === t.id ? 'bg-primary text-navy' : 'text-muted hover:text-navy'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {error && flow !== 'result' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {loading && !today ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : null}

      {tab === 'scan' && flow === 'home' ? (
        <>
          {focusLesson && isToday ? <CurrentLessonCard lesson={focusLesson} onScan={() => setFlow('scanner')} /> : null}

          <div className="rounded-2xl border border-border bg-white p-5 text-center shadow-sm sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-navy text-primary shadow-lg">
              <Camera className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-navy">Scan Classroom QR</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Point your camera at the QR poster in your scheduled classroom to verify your presence for this period.
            </p>
            <button type="button" className="btn-primary mx-auto mt-5 inline-flex items-center gap-2" onClick={() => setFlow('scanner')}>
              <Camera className="h-4 w-4" /> Scan QR
            </button>
            <button type="button" className="btn-secondary mx-auto mt-3 inline-flex items-center gap-2" onClick={() => setFlow('manual')}>
              <Keyboard className="h-4 w-4" /> Enter Code
            </button>
          </div>

          {today && today.lessons.length > 0 ? (
            <TodayCheckInList lessons={today.lessons} onScan={() => setFlow('scanner')} isToday={isToday} />
          ) : null}

          {isToday && tab === 'scan' && flow === 'home' ? (
            <button
              type="button"
              onClick={() => setFlow('scanner')}
              className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-primary shadow-xl transition hover:scale-105 hover:shadow-2xl sm:bottom-8 sm:right-8"
              aria-label="Scan classroom QR"
            >
              <Camera className="h-7 w-7" />
            </button>
          ) : null}
        </>
      ) : null}

      {tab === 'scan' && flow === 'manual' ? (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <button type="button" onClick={resetFlow} className="text-sm font-semibold text-muted hover:text-navy">
            ← Back
          </button>
          <h2 className="mt-2 text-lg font-bold text-navy">Enter Classroom Code</h2>
          <p className="mt-1 text-sm text-muted">Type the code printed under the classroom QR poster (e.g. 28001-QR-CLS-00004).</p>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Classroom code</span>
            <input
              className="input font-mono text-base"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="28001-QR-CLS-00004"
              autoFocus
            />
          </label>
          <button
            type="button"
            className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 sm:w-auto"
            disabled={submitting}
            onClick={() => void verifyCode(manualCode)}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Verify Classroom
          </button>
        </div>
      ) : null}

      {tab === 'scan' && flow === 'result' && result ? (
        <CheckInResultPanel result={result} onRetry={resetFlow} onAttendance={(id) => router.push(`/attendance?sessionId=${id}`)} />
      ) : null}

      {tab === 'history' ? <CheckInHistoryList rows={history} loading={loading} /> : null}
    </div>
  );
}

function CurrentLessonCard({ lesson, onScan }: { lesson: SmartLesson; onScan: () => void }) {
  const until = lesson.phase === 'upcoming' ? minutesUntil(lesson.startTime) : null;
  const checkedIn = lesson.qrVerified || Boolean(lesson.scannedAt);
  const inProgress = lesson.phase === 'current';
  const isLate = lesson.punctuality === 'LATE' || lesson.punctuality === 'VERY_LATE';

  const cardTone = checkedIn
    ? isLate
      ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-white'
      : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'
    : inProgress
      ? 'border-red-200 bg-gradient-to-br from-red-50 to-white'
      : 'border-slate-200 bg-gradient-to-br from-slate-50 to-white';

  const headerTone = checkedIn
    ? isLate
      ? 'text-amber-700'
      : 'text-emerald-700'
    : inProgress
      ? 'text-red-600'
      : 'text-navy';

  const headerLabel = checkedIn
    ? isLate
      ? 'Checked In · Late'
      : 'Checked In · On Time'
    : inProgress
      ? 'Lesson In Progress'
      : lesson.phase === 'upcoming'
        ? 'Next Lesson'
        : 'Current Lesson';

  return (
    <div className={`rounded-2xl border-2 p-4 shadow-sm sm:p-5 ${cardTone}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className={`text-xs font-bold uppercase tracking-wider ${headerTone}`}>{headerLabel}</p>
        {checkedIn && lesson.qrVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
            <QrCode className="h-3 w-3" /> QR Verified
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-lg font-bold text-navy">
        {lesson.periodLabel ?? 'Period'} · {lesson.subjectName}
      </p>
      <p className="text-sm text-muted">
        {lesson.className} · {lesson.startTime}–{lesson.endTime}
      </p>
      {lesson.room ? (
        <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-navy">
          <MapPin className="h-4 w-4" /> {lesson.room}
        </p>
      ) : null}

      {until !== null ? (
        <p className="mt-3 text-sm font-semibold text-emerald-800">Starts in {until} minutes</p>
      ) : null}

      <div className="mt-3">
        <CheckInStatusPill lesson={lesson} />
        {lesson.scannedAt ? (
          <p className="mt-2 text-xs text-muted">
            Checked in {new Date(lesson.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        ) : null}
      </div>

      {!checkedIn && isLessonScannable(lesson) ? (
        <button type="button" className="btn-primary mt-4 inline-flex items-center gap-2" onClick={onScan}>
          <Camera className="h-4 w-4" /> Scan Classroom QR
        </button>
      ) : null}
    </div>
  );
}

function isLessonScannable(lesson: SmartLesson) {
  return lesson.phase === 'current' || lesson.phase === 'upcoming';
}

function TodayCheckInList({
  lessons,
  onScan,
  isToday,
}: {
  lessons: SmartLesson[];
  onScan: () => void;
  isToday: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
      <p className="text-sm font-bold uppercase tracking-wider text-navy">Today&apos;s Timetable</p>
      <div className="mt-4 space-y-2">
        {lessons.map((lesson) => {
          const checkedIn = lesson.qrVerified || Boolean(lesson.scannedAt);
          const isLate = lesson.punctuality === 'LATE' || lesson.punctuality === 'VERY_LATE';
          return (
            <div
              key={lesson.timetableId}
              className={`rounded-xl border px-3 py-3 sm:px-4 ${
                lesson.phase === 'current'
                  ? checkedIn
                    ? isLate
                      ? 'border-amber-200 bg-amber-50/60'
                      : 'border-emerald-200 bg-emerald-50/60'
                    : 'border-primary bg-primary/5'
                  : 'border-border bg-slate-50/50'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-navy">
                    {lesson.periodLabel} · {lesson.subjectName}
                  </p>
                  <p className="text-sm text-muted">
                    {lesson.className} · {lesson.room ?? '—'}
                  </p>
                  <p className="text-xs text-muted">
                    {lesson.startTime}–{lesson.endTime}
                  </p>
                </div>
                <CheckInStatusPill lesson={lesson} />
              </div>
              {checkedIn && lesson.qrVerified ? (
                <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-emerald-700">
                  <QrCode className="h-3 w-3" /> QR scan recorded
                </p>
              ) : null}
              {isToday && lesson.phase === 'current' && !checkedIn ? (
                <button type="button" className="btn-secondary mt-3 w-full text-sm sm:w-auto" onClick={onScan}>
                  Scan Classroom QR
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CheckInResultPanel({
  result,
  onRetry,
  onAttendance,
}: {
  result: QrCheckInResult;
  onRetry: () => void;
  onAttendance: (sessionId: string) => void;
}) {
  const success = result.ok && (result.code === 'SUCCESS' || result.code === 'ALREADY_CHECKED_IN');
  const lesson = result.lesson;

  if (!success) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          {result.code === 'TOO_EARLY' ? (
            <Clock className="h-8 w-8 shrink-0 text-amber-600" />
          ) : result.code === 'WRONG_CLASSROOM' ? (
            <AlertTriangle className="h-8 w-8 shrink-0 text-amber-600" />
          ) : (
            <XCircle className="h-8 w-8 shrink-0 text-red-600" />
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-navy">
              {result.code === 'TOO_EARLY'
                ? 'Not Available Yet'
                : result.code === 'WRONG_CLASSROOM'
                  ? "Classroom Doesn't Match"
                  : result.code === 'INVALID_QR'
                    ? 'Invalid QR Code'
                    : 'Check-In Denied'}
            </h2>
            <p className="mt-1 text-sm text-muted">{result.message}</p>
          </div>
        </div>

        {result.expected ? (
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm">
            <p className="font-semibold text-sky-900">You are scheduled in:</p>
            <p className="mt-1 text-sky-800">
              {(result.expected.room?.trim() || result.expected.className) || '—'} · {result.expected.subjectName} · {result.expected.className}
            </p>
            <p className="text-sky-700">
              {result.expected.periodLabel} · {result.expected.startTime}–{result.expected.endTime}
            </p>
          </div>
        ) : null}

        {result.scanned && result.code === 'WRONG_CLASSROOM' ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-semibold text-amber-900">Scanned classroom:</p>
            <p className="text-amber-800">
              {result.scanned.name}
              {result.scanned.qrCode ? ` · ${result.scanned.qrCode}` : ''}
            </p>
          </div>
        ) : null}

        {result.opensAt ? (
          <p className="mt-3 text-sm text-muted">Check-in opens at {result.opensAt}</p>
        ) : null}

        <button type="button" className="btn-primary mt-5" onClick={onRetry}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 text-center shadow-sm sm:p-8">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
      </div>
      <h2 className="mt-3 text-xl font-bold text-navy">Check-In Successful</h2>
      <p className="mt-1 inline-flex items-center justify-center gap-1 text-xs font-semibold uppercase text-emerald-700">
        <QrCode className="h-3.5 w-3.5" /> Classroom QR verified
      </p>
      {lesson ? (
        <p className="mt-1 text-sm text-muted">
          {lesson.subjectName} · {lesson.className} · {lesson.room ?? '—'} · {lesson.periodLabel}
        </p>
      ) : null}
      <div className="mt-4">
        <PunctualityBanner
          punctuality={result.punctuality ?? 'ON_TIME'}
          minutesLate={result.minutesLate}
          checkedInAt={result.checkedInAt}
        />
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {result.session?.id ? (
          <button type="button" className="btn-primary" onClick={() => onAttendance(result.session!.id)}>
            Take Attendance
          </button>
        ) : null}
        <Link href="/timetable" className="btn-secondary">
          View Timetable
        </Link>
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Done
        </button>
      </div>
    </div>
  );
}

function CheckInHistoryList({ rows, loading }: { rows: CheckInHistoryRow[]; loading: boolean }) {
  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
        <History className="mx-auto h-10 w-10 text-muted/40" />
        <p className="mt-3 font-semibold text-navy">No check-ins yet</p>
        <p className="mt-1 text-sm text-muted">Your classroom QR check-ins will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.sessionId} className="rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-bold text-navy">
                {row.periodLabel} · {row.subjectName}
              </p>
              <p className="text-sm text-muted">
                {row.className} · {row.room ?? '—'}
              </p>
              <p className="text-xs text-muted">
                {row.date} · {row.startTime}–{row.endTime}
              </p>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                row.punctuality === 'ON_TIME' || row.punctuality === 'EARLY'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : row.punctuality === 'LATE' || row.punctuality === 'VERY_LATE'
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {punctualityLabel(row.punctuality, row.minutesLate)}
            </span>
          </div>
          {row.checkedInAt ? (
            <p className="mt-2 text-xs text-muted">
              Checked {new Date(row.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'emerald' | 'amber';
}) {
  const colors = {
    default: 'text-navy',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
  };
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2.5 shadow-sm sm:px-4 sm:py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className={`text-xl font-extrabold sm:text-2xl ${colors[tone]}`}>{value}</p>
    </div>
  );
}

function FilterDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <input type="date" className="input w-full py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <select className="input w-full py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={`${label}-${o.value}`} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
