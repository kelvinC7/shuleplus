'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  GraduationCap,
} from 'lucide-react';
import { ReportCardsPanel } from '@/components/academics/report-cards-panel';

import { EmptyState } from '@/components/shared/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NativeSelect } from '@/components/ui/native-select';
import { cn } from '@/lib/utils';
import { formatShortDate, daysLabel } from '@/lib/format';

export interface PublishedMark {
  id: string;
  title: string;
  subject: string;
  type: string;
  score: number;
  maxScore: number;
  percentage: number | null;
  grade: string | null;
  date: string | null;
  term: string;
  academicYear: string;
  status: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  subject: string;
  type: string;
  date: string | null;
  term: string;
  academicYear: string;
  status: string;
  maxScore: number;
  hasPublishedMark?: boolean;
  code?: string | null;
  className?: string | null;
}

export interface MarksPortalData {
  student: { fullName: string; className: string };
  publishedMarks: PublishedMark[];
  schedule: ScheduleItem[];
  filters: { academicYear: string; term: string; years: string[]; terms: string[] };
  terms: Array<{
    term: string;
    academicYear: string;
    gpa: number;
    classRank: number;
    totalStudents: number;
    subjects: Array<{ subject: string; total: number; grade: string }>;
  }>;
}

function gradeBadge(grade: string | null) {
  if (!grade) return 'bg-slate-100 text-slate-600';
  if (grade.startsWith('A')) return 'bg-emerald-100 text-emerald-800';
  if (grade.startsWith('B')) return 'bg-sky-100 text-sky-800';
  if (grade.startsWith('C')) return 'bg-amber-100 text-amber-900';
  return 'bg-rose-100 text-rose-800';
}

function statusTone(status: string) {
  const s = status.toUpperCase();
  if (s === 'UPCOMING' || s === 'OPEN') return 'bg-primary/15 text-navy';
  if (s === 'MARK_ENTRY' || s === 'IN_PROGRESS') return 'bg-sky-100 text-sky-800';
  if (s === 'SUBMITTED' || s === 'REVIEWED') return 'bg-violet-100 text-violet-800';
  if (s === 'COMPLETED' || s === 'APPROVED' || s === 'LOCKED') return 'bg-emerald-100 text-emerald-800';
  return 'bg-slate-100 text-slate-600';
}

const marksTabClass =
  'z-[1] min-h-10 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-slate-500 shadow-none after:hidden ' +
  'transition-[color,background,box-shadow] hover:bg-white/70 hover:text-navy ' +
  'data-active:border-border/60 data-active:bg-white data-active:!text-navy data-active:font-semibold data-active:shadow-sm';

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null; key: string }> = [];
  for (let i = 0; i < startPad; i++) cells.push({ day: null, key: `p-${i}` });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, key: `d-${d}` });
  while (cells.length % 7 !== 0) cells.push({ day: null, key: `t-${cells.length}` });
  return cells;
}

interface MarksPortalProps {
  data: MarksPortalData | null;
  loading: boolean;
  error: string | null;
  defaultTab?: 'marks' | 'schedule' | 'reports';
  activeStudentId?: string;
  academicYear: string;
  term: string;
  onAcademicYearChange: (year: string) => void;
  onTermChange: (term: string) => void;
}

export function MarksPortal({
  data,
  loading,
  error,
  defaultTab = 'marks',
  activeStudentId = '',
  academicYear,
  term,
  onAcademicYearChange,
  onTermChange,
}: MarksPortalProps) {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [cursor, setCursor] = useState(() => new Date());

  const activeTerm = data?.terms[0];
  const marks = data?.publishedMarks ?? [];
  const schedule = data?.schedule ?? [];
  const years = data?.filters.years ?? [];
  const terms = data?.filters.terms ?? [];

  const scheduleByDay = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const item of schedule) {
      if (!item.date) continue;
      const key = new Date(item.date).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [schedule]);

  const calYear = cursor.getFullYear();
  const calMonth = cursor.getMonth();
  const matrix = monthMatrix(calYear, calMonth);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid w-full grid-cols-2 gap-3 sm:max-w-sm">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Year</span>
            <NativeSelect
              value={academicYear}
              onChange={(e) => onAcademicYearChange(e.target.value)}
              className="w-full [&_select]:h-10 [&_select]:rounded-xl [&_select]:border-border [&_select]:bg-white [&_select]:font-medium [&_select]:text-navy"
              disabled={!years.length}
            >
              {!years.length ? <option value="">—</option> : null}
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Term</span>
            <NativeSelect
              value={term}
              onChange={(e) => onTermChange(e.target.value)}
              className="w-full [&_select]:h-10 [&_select]:rounded-xl [&_select]:border-border [&_select]:bg-white [&_select]:font-medium [&_select]:text-navy"
              disabled={!terms.length}
            >
              {!terms.length ? <option value="">—</option> : null}
              {terms.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {data?.student.className ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-navy">
              {data.student.className}
            </span>
          ) : null}
          {activeTerm ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3 py-1 text-xs font-medium text-primary">
              <GraduationCap className="size-3.5" />
              GPA {activeTerm.gpa.toFixed(1)}
            </span>
          ) : null}
        </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<AlertCircle className="text-red-500" />} title="Could not load marks" description={error} />
      ) : (
        <Tabs defaultValue={defaultTab} className="gap-4">
          <TabsList className="grid h-auto w-full max-w-xl grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1.5">
            <TabsTrigger value="marks" className={cn(marksTabClass, 'px-2 text-xs sm:text-sm')}>
              Marks
            </TabsTrigger>
            <TabsTrigger value="schedule" className={cn(marksTabClass, 'px-2 text-xs sm:text-sm')}>
              Schedule
            </TabsTrigger>
            <TabsTrigger value="reports" className={cn(marksTabClass, 'px-2 text-xs sm:text-sm')}>
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="marks" className="mt-0 space-y-4 focus-visible:outline-none">
            {marks.length === 0 ? (
              <EmptyState
                className="border-border/60 bg-white py-12"
                title="No marks yet"
                description="Scores show here after teachers publish them."
              />
            ) : (
              <>
                <div className="space-y-2 md:hidden">
                  {marks.map((row) => (
                    <article key={row.id} className="hr-card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-navy">{row.subject}</p>
                          <p className="truncate text-xs text-muted">{row.title}</p>
                        </div>
                        {row.grade ? (
                          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-bold', gradeBadge(row.grade))}>
                            {row.grade}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-navy">{row.type}</span>
                        <span className="font-semibold text-navy">
                          {row.score}/{row.maxScore}
                          {row.percentage != null ? ` · ${row.percentage}%` : ''}
                        </span>
                        {row.date ? <span className="text-muted">{formatShortDate(row.date)}</span> : null}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hr-card hidden overflow-hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-border bg-slate-50/90">
                          <th className="px-4 py-3 font-semibold text-navy">Subject</th>
                          <th className="px-4 py-3 font-semibold text-navy">Assessment</th>
                          <th className="px-4 py-3 font-semibold text-navy">Type</th>
                          <th className="px-4 py-3 text-center font-semibold text-navy">Score</th>
                          <th className="px-4 py-3 text-center font-semibold text-navy">Grade</th>
                          <th className="px-4 py-3 text-right font-semibold text-navy">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marks.map((row) => (
                          <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-medium text-navy">{row.subject}</td>
                            <td className="max-w-[200px] truncate px-4 py-3 text-muted">{row.title}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">{row.type}</span>
                            </td>
                            <td className="px-4 py-3 text-center font-semibold tabular-nums text-navy">
                              {row.score}/{row.maxScore}
                              {row.percentage != null ? (
                                <span className="ml-1 text-xs font-normal text-muted">({row.percentage}%)</span>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {row.grade ? (
                                <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold', gradeBadge(row.grade))}>
                                  {row.grade}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-muted">{row.date ? formatShortDate(row.date) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="schedule" className="mt-0 space-y-3 focus-visible:outline-none">
            <div className="rounded-2xl border border-border/60 bg-white p-4 sm:p-5">
            <div className="mb-4 inline-flex w-full gap-1 rounded-xl bg-slate-100 p-1 sm:w-auto">
              <button
                type="button"
                onClick={() => setView('list')}
                className={cn(
                  'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:flex-none',
                  view === 'list'
                    ? 'bg-white text-navy shadow-sm'
                    : 'text-slate-500 hover:bg-white/70 hover:text-navy'
                )}
              >
                <LayoutList className="size-3.5" /> List
              </button>
              <button
                type="button"
                onClick={() => setView('calendar')}
                className={cn(
                  'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:flex-none',
                  view === 'calendar'
                    ? 'bg-white text-navy shadow-sm'
                    : 'text-slate-500 hover:bg-white/70 hover:text-navy'
                )}
              >
                <CalendarDays className="size-3.5" /> Calendar
              </button>
            </div>

            {schedule.length === 0 ? (
              <EmptyState
                className="border-0 bg-slate-50/80 py-10"
                title="No assessments scheduled"
                description={
                  data?.student.className
                    ? `Nothing on the calendar for ${data.student.className} in ${term || 'this term'}.`
                    : 'Assessments for your child’s class appear here when teachers schedule them.'
                }
              />
            ) : view === 'list' ? (
              <div className="space-y-2">
                {schedule.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/60 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {'code' in item && item.code ? (
                          <span className="font-mono text-[11px] font-medium text-primary">{String(item.code)}</span>
                        ) : null}
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', statusTone(item.status))}>
                          {item.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="mt-1 font-semibold text-navy">{item.title}</p>
                      <p className="text-sm text-muted">
                        {item.subject} · {item.type}
                      </p>
                    </div>
                    <div className="shrink-0 sm:text-right">
                      <p className="text-sm font-medium text-navy">
                        {item.date ? formatShortDate(item.date) : 'Date to be confirmed'}
                      </p>
                      {item.date ? <p className="text-xs text-muted">{daysLabel(item.date)}</p> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/60 p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    aria-label="Previous month"
                    className="rounded-lg border border-border p-2 hover:bg-slate-50"
                    onClick={() => setCursor(new Date(calYear, calMonth - 1, 1))}
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <p className="text-sm font-bold text-navy">
                    {cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                  </p>
                  <button
                    type="button"
                    aria-label="Next month"
                    className="rounded-lg border border-border p-2 hover:bg-slate-50"
                    onClick={() => setCursor(new Date(calYear, calMonth + 1, 1))}
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-muted">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {matrix.map((cell) => {
                    if (cell.day == null) return <div key={cell.key} className="min-h-[52px] rounded-lg bg-transparent" />;
                    const date = new Date(calYear, calMonth, cell.day);
                    const items = scheduleByDay.get(date.toDateString()) ?? [];
                    const today = new Date().toDateString() === date.toDateString();
                    return (
                      <div
                        key={cell.key}
                        className={cn(
                          'min-h-[52px] rounded-lg border border-border/60 p-1 text-left',
                          today && 'border-primary/40 bg-primary/5',
                          items.length > 0 && 'bg-slate-50'
                        )}
                      >
                        <span className="text-[11px] font-semibold text-navy">{cell.day}</span>
                        {items.slice(0, 2).map((it) => (
                          <p key={it.id} className="truncate text-[9px] font-medium text-navy leading-tight">
                            {it.subject}
                          </p>
                        ))}
                        {items.length > 2 ? (
                          <p className="text-[9px] text-muted">+{items.length - 2}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-0">
            {activeStudentId ? (
              <ReportCardsPanel
                studentId={activeStudentId}
                academicYear={academicYear}
                term={term}
                years={years}
                terms={terms}
                onAcademicYearChange={onAcademicYearChange}
                onTermChange={onTermChange}
              />
            ) : (
              <p className="text-sm text-muted">Select a student to view report cards.</p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
