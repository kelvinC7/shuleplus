'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Camera,
  Loader2,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { CheckInStatusPill } from '@/components/check-in-status-ui';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { useAuth } from '@/contexts/auth-context';
import {
  fetchTeacherSchedule,
  fetchTeacherToday,
  smartApiError,
} from '@/services/timetable-smart-api';
import type {
  ScheduleSlot,
  SmartLesson,
  TeacherScheduleData,
  TeacherTodayData,
} from '@/types/smart-timetable';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function isDailyView(data: TeacherScheduleData): data is TeacherTodayData {
  return 'lessons' in data && Array.isArray(data.lessons);
}

function greetingName(user: { email?: string; firstName?: string } | null) {
  if (user?.firstName) return user.firstName;
  if (user?.email) return user.email.split('@')[0];
  return 'Teacher';
}

function minutesRemaining(endTime: string): number | null {
  const now = new Date();
  const [eh, em] = endTime.split(':').map(Number);
  const end = new Date(now);
  end.setHours(eh, em, 0, 0);
  const diff = Math.round((end.getTime() - now.getTime()) / 60000);
  return diff > 0 ? diff : null;
}

export function ScheduleView() {
  const { user } = useAuth();
  const { term, academicYear, setTerm, setAcademicYear, settings } = useAcademicSettings();

  const [viewMode, setViewMode] = useState<'today' | 'week' | 'list'>('today');
  const [filterClass, setFilterClass] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [data, setData] = useState<TeacherScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiView = viewMode === 'today' ? 'daily' : 'weekly';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        term,
        academicYear,
        className: filterClass || undefined,
        day: filterDay || undefined,
        course: filterCourse || undefined,
      };
      if (viewMode === 'today') {
        setData(await fetchTeacherToday(params));
      } else {
        setData(await fetchTeacherSchedule(apiView, params));
      }
    } catch (err) {
      setError(smartApiError(err, 'Could not load schedule'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [term, academicYear, filterClass, filterDay, filterCourse, viewMode, apiView]);

  useEffect(() => {
    load();
  }, [load]);

  const filterOptions = useMemo(() => {
    if (!data) return { classes: [] as string[], courses: [] as string[] };
    if (isDailyView(data)) {
      return {
        classes: [...new Set(data.lessons.map((l) => l.className))].sort(),
        courses: [...new Set(data.lessons.map((l) => l.subjectName))].sort(),
      };
    }
    return {
      classes: data.classes ?? [],
      courses: data.courses ?? [],
    };
  }, [data]);

  const todayData = data && isDailyView(data) ? data : null;
  const weekData = data && !isDailyView(data) ? data : null;

  const teachingHours = useMemo(() => {
    const lessons = todayData?.lessons ?? [];
    let mins = 0;
    for (const l of lessons) {
      const [sh, sm] = l.startTime.split(':').map(Number);
      const [eh, em] = l.endTime.split(':').map(Number);
      mins += eh * 60 + em - (sh * 60 + sm);
    }
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`;
  }, [todayData]);

  const completedPct =
    todayData && todayData.lessons.length
      ? Math.round((todayData.kpis.lessonsCompleted / todayData.lessons.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold text-primary">
          Good {new Date().getHours() < 12 ? 'morning' : 'day'}, {greetingName(user)} 👋
        </p>
        <h1 className="mt-1 text-2xl font-bold text-navy">My Timetable</h1>
        <p className="mt-1 text-sm text-muted">Your teaching schedule from the organization academic calendar.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <FilterSelect
            label="Class"
            value={filterClass}
            onChange={setFilterClass}
            options={[
              { value: '', label: 'All My Classes' },
              ...filterOptions.classes.map((c) => ({ value: c, label: c })),
            ]}
          />
          <FilterSelect
            label="Course"
            value={filterCourse}
            onChange={setFilterCourse}
            options={[
              { value: '', label: 'All Courses' },
              ...filterOptions.courses.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-border bg-white p-1 shadow-sm">
          {(['today', 'week', 'list'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                viewMode === mode ? 'bg-primary text-navy' : 'text-muted hover:text-navy'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-xl border border-border bg-white p-1">
            <button
              type="button"
              onClick={() => setFilterDay('')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                !filterDay ? 'bg-navy text-white' : 'text-muted'
              }`}
            >
              All
            </button>
            {DAY_SHORT.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => setFilterDay(DAY_ORDER[i])}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  filterDay === DAY_ORDER[i] ? 'bg-navy text-white' : 'text-muted'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={load}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {todayData ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Today's Periods" value={String(todayData.kpis.todayClasses)} />
          <KpiCard
            label="Classes Today"
            value={String(new Set(todayData.lessons.map((l) => l.className)).size)}
          />
          <KpiCard label="Teaching Hours" value={teachingHours} />
          <KpiCard label="Completed" value={`${completedPct}%`} />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading schedule…
        </div>
      ) : null}

      {todayData?.current ? (
        <CurrentLessonCard lesson={todayData.current} />
      ) : null}

      {todayData ? (
        <TodayTimeline data={todayData} />
      ) : null}

      {weekData && viewMode === 'week' ? <WeeklyGrid data={weekData} /> : null}

      {weekData && viewMode === 'list' ? <ListView data={weekData} /> : null}

      {!loading && !error && !todayData && !weekData ? (
        <div className="rounded-2xl border border-dashed border-border bg-slate-50/60 px-6 py-12 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-muted/40" />
          <p className="mt-3 font-semibold text-navy">No timetable found</p>
          <p className="mt-1 text-sm text-muted">
            Your schedule for {term} · {academicYear} has not been published yet.
          </p>
        </div>
      ) : null}
    </div>
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
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <select
        className="input w-full py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={`${label}-${o.value}`} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-navy">{value}</p>
    </div>
  );
}

function CurrentLessonCard({ lesson }: { lesson: SmartLesson }) {
  const remaining = minutesRemaining(lesson.endTime);
  const checkedIn = lesson.qrVerified || Boolean(lesson.scannedAt);
  return (
    <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-red-600">Current Lesson</p>
      <p className="mt-2 text-lg font-bold text-navy">
        {lesson.periodLabel ?? 'Period'} · {lesson.startTime} – {lesson.endTime}
      </p>
      <p className="mt-1 text-xl font-extrabold text-navy">{lesson.subjectName}</p>
      <p className="text-sm text-muted">{lesson.className}</p>
      {lesson.room ? (
        <p className="mt-2 inline-flex items-center gap-1 text-sm text-navy">
          <MapPin size={14} /> {lesson.room}
        </p>
      ) : null}
      <div className="mt-3">
        <CheckInStatusPill lesson={lesson} />
        {lesson.scannedAt ? (
          <p className="mt-1 text-xs text-muted">
            Checked {new Date(lesson.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        ) : null}
      </div>
      {remaining !== null ? (
        <p className="mt-2 text-sm font-semibold text-red-700">{remaining} minutes remaining</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {!checkedIn ? (
          <Link href="/classroom-scan" className="btn-primary inline-flex items-center gap-2 py-2 text-sm">
            <Camera className="h-4 w-4" /> Scan class monitor QRCode
          </Link>
        ) : null}
        <Link href="/attendance" className="btn-secondary py-2 text-sm">
          Take Attendance
        </Link>
      </div>
    </div>
  );
}

function TodayTimeline({ data }: { data: TeacherTodayData }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wider text-navy">
        Today — {data.dayOfWeek}, {data.date}
      </p>
      <div className="mt-5 space-y-0">
        {data.lessons.length === 0 ? (
          <p className="text-sm text-muted">No lessons scheduled today.</p>
        ) : (
          data.lessons.map((lesson, idx) => (
            <div key={lesson.timetableId} className="relative flex gap-4 pb-6 last:pb-0">
              <div className="flex w-14 shrink-0 flex-col items-center">
                <span className="text-xs font-bold text-navy">{lesson.startTime}</span>
                <span className="mt-1 h-full w-px bg-border" />
              </div>
              <div
                className={`flex-1 rounded-xl border px-4 py-3 ${
                  lesson.phase === 'current'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-slate-50/70'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-navy">{lesson.subjectName}</p>
                    <p className="text-sm text-muted">{lesson.className}</p>
                  </div>
                  <span className="text-xs font-semibold text-navy">
                    {lesson.startTime}–{lesson.endTime}
                  </span>
                </div>
                {lesson.room ? (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
                    <MapPin size={12} /> {lesson.room}
                  </p>
                ) : null}
                <div className="mt-2">
                  <CheckInStatusPill lesson={lesson} />
                  {lesson.scannedAt ? (
                    <p className="mt-1 text-[11px] text-muted">
                      Checked {new Date(lesson.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  ) : null}
                </div>
              </div>
              {idx < data.lessons.length - 1 ? null : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function WeeklyGrid({
  data,
}: {
  data: {
    byDay: Record<string, ScheduleSlot[]>;
    total: number;
    periodSlots?: Array<{ name: string; startTime: string; endTime: string }>;
  };
}) {
  const activeDays = data.periodSlots?.length
    ? DAY_ORDER.slice(0, 5)
    : DAY_ORDER.filter((d) => (data.byDay[d] ?? []).length > 0);

  const periodRows = data.periodSlots?.length
    ? data.periodSlots
    : [
        ...new Set(
          activeDays.flatMap((d) => (data.byDay[d] ?? []).map((s) => `${s.startTime}|${s.endTime}`)),
        ),
      ].sort().map((key) => {
        const [startTime, endTime] = key.split('|');
        return { name: startTime, startTime, endTime };
      });

  function findLesson(day: string, period: { startTime: string; endTime: string }) {
    return (data.byDay[day] ?? []).find(
      (s) => s.startTime === period.startTime && s.endTime === period.endTime,
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-slate-50/80">
            <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted">
              Period
            </th>
            {activeDays.map((d) => (
              <th key={d} className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-navy">
                {d.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periodRows.map((period) => (
            <tr key={`${period.name}-${period.startTime}`} className="border-b border-border/60 last:border-0">
              <td className="whitespace-nowrap px-3 py-3 align-top">
                <p className="text-xs font-semibold text-navy">{period.name}</p>
                <p className="text-[11px] tabular-nums text-muted">
                  {period.startTime}–{period.endTime}
                </p>
              </td>
              {activeDays.map((day) => {
                const slot = findLesson(day, period);
                return (
                  <td key={day} className="px-3 py-3 align-top">
                    {slot ? (
                      <div className="rounded-lg border border-border bg-slate-50/80 px-2 py-1.5">
                        <p className="font-semibold text-navy">{slot.className}</p>
                        <p className="text-xs text-muted">{slot.subjectName}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted/50">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border px-4 py-2 text-xs text-muted">{data.total} periods this term</p>
    </div>
  );
}

function ListView({
  data,
}: {
  data: { byDay: Record<string, ScheduleSlot[]>; total: number };
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {DAY_ORDER.filter((day) => (data.byDay[day] ?? []).length > 0).map((day) => (
        <div key={day} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-navy">{day}</h3>
          <ul className="mt-3 space-y-2">
            {(data.byDay[day] ?? []).map((slot) => (
              <li
                key={slot.id}
                className="flex items-start justify-between gap-2 rounded-xl border border-border bg-slate-50/70 px-3 py-2.5 text-sm"
              >
                <div>
                  <p className="font-semibold text-navy">{slot.subjectName}</p>
                  <p className="text-muted">
                    {slot.className}
                    {slot.room ? ` · ${slot.room}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-navy">
                  {slot.startTime}–{slot.endTime}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
