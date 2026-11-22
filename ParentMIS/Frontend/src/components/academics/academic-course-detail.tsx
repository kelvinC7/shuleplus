'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatShortDate } from '@/lib/format';
import { api } from '@/services/api';
import { AcademicMarksTable } from '@/components/academics/academic-marks-table';
import { ACADEMIC_EMPTY, formatAssessmentTitle } from '@/lib/academic-display';
import { marksForSubject, type CourseOverviewRow, type PublishedMark, type ScheduleItem } from '@/lib/academic-portal-utils';

type CategoryScore = {
  percentage: number;
  weight: number;
  contribution: number;
  normalizedScore?: number;
  normalizedMax?: number;
  marksRecorded?: boolean;
  consolidatedOnDefault?: number;
};

type CoursePayload = {
  subjectId: string;
  subjectName: string;
  defaultCourseMarks: number;
  totalScore: number;
  totalMax: number;
  percentage: number;
  grade: string | null;
  marksEntered: boolean;
  courseComplete: boolean;
  categoryScores: Record<string, CategoryScore>;
  teacherMarks: Array<{
    id: string;
    title: string;
    componentName: string | null;
    score: number;
    maxMark: number;
    percentage: number;
    date: string | null;
    code: string | null;
    assessmentStatus: string;
  }>;
};

function fmt(n: number | null | undefined, digits = 1) {
  if (n == null || !Number.isFinite(n)) return ACADEMIC_EMPTY;
  const r = Math.round(n * 10 ** digits) / 10 ** digits;
  return Number.isInteger(r) ? String(r) : r.toFixed(digits);
}

function gradeTone(grade: string | null) {
  if (!grade) return 'bg-slate-100 text-slate-600';
  if (grade.startsWith('A')) return 'bg-emerald-100 text-emerald-900';
  if (grade.startsWith('B')) return 'bg-sky-100 text-sky-900';
  if (grade.startsWith('C')) return 'bg-amber-100 text-amber-950';
  return 'bg-rose-100 text-rose-900';
}

function fallbackCourseFromMarks(subject: string, marks: PublishedMark[]): CoursePayload | null {
  const rows = marks.filter((m) => m.subject === subject);
  if (!rows.length) return null;
  return {
    subjectId: subject,
    subjectName: subject,
    defaultCourseMarks: 100,
    totalScore: 0,
    totalMax: 100,
    percentage: 0,
    grade: rows.find((r) => r.grade)?.grade ?? null,
    marksEntered: true,
    courseComplete: false,
    categoryScores: {},
    teacherMarks: rows.map((m) => ({
      id: m.id,
      title: m.title,
      componentName: m.type,
      score: m.score,
      maxMark: m.maxScore,
      percentage: m.percentage ?? 0,
      date: m.date,
      code: m.code ?? null,
      assessmentStatus: m.status,
    })),
  };
}

export function AcademicCourseDetail({
  subject,
  row,
  activeStudentId,
  academicYear,
  term,
  publishedMarks,
  schedule,
  onClose,
}: {
  subject: string;
  row: CourseOverviewRow | null;
  activeStudentId: string;
  academicYear: string;
  term: string;
  publishedMarks: PublishedMark[];
  schedule: ScheduleItem[];
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [apiFailed, setApiFailed] = useState(false);
  const [course, setCourse] = useState<CoursePayload | null>(null);
  const [componentOrder, setComponentOrder] = useState<string[]>([]);
  const [calcAvailable, setCalcAvailable] = useState(false);

  const scheduled = useMemo(
    () => schedule.filter((s) => s.subject === subject),
    [schedule, subject]
  );

  const load = useCallback(async () => {
    if (!activeStudentId || !subject) return;
    setLoading(true);
    setApiFailed(false);
    try {
      const params = new URLSearchParams({ studentId: activeStudentId, subject });
      if (academicYear) params.set('academicYear', academicYear);
      if (term) params.set('term', term);
      const res = await api.get<{
        data: {
          courses: CoursePayload[];
          componentOrder?: string[];
          calcAvailable?: boolean;
        };
      }>(`/academics/course-performance?${params}`);
      const payload = res.data.data;
      const match =
        payload?.courses?.find((c) => c.subjectName === subject) ?? payload?.courses?.[0] ?? null;
      if (match) {
        setCourse(match);
        setComponentOrder(payload?.componentOrder ?? []);
        setCalcAvailable(
          Boolean(
            payload?.calcAvailable ??
              (match.categoryScores && Object.keys(match.categoryScores).length > 0)
          )
        );
      } else {
        setCourse(fallbackCourseFromMarks(subject, publishedMarks));
        setCalcAvailable(false);
      }
    } catch {
      setApiFailed(true);
      setCourse(fallbackCourseFromMarks(subject, publishedMarks));
      setCalcAvailable(false);
      setComponentOrder([]);
    } finally {
      setLoading(false);
    }
  }, [activeStudentId, subject, academicYear, term, publishedMarks]);

  useEffect(() => {
    void load();
  }, [load]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('course-detail-open');
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove('course-detail-open');
    };
  }, []);

  const courseMarks = useMemo(() => marksForSubject(publishedMarks, subject), [publishedMarks, subject]);
  const markCount = courseMarks.length || (course?.teacherMarks.length ?? 0);
  const componentNames =
    componentOrder.length > 0 ? componentOrder : Object.keys(course?.categoryScores ?? {});
  const avgPct =
    course?.marksEntered && calcAvailable && Number.isFinite(course.percentage)
      ? Math.min(100, Math.max(0, course.percentage))
      : null;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-navy/60 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${subject} details`}
        className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-slate-50 shadow-2xl sm:max-h-[min(820px,92vh)] sm:max-w-3xl sm:rounded-3xl"
      >
        {/* Grab handle (mobile) */}
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
          <span className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        <header className="flex items-center gap-3 bg-white px-4 pb-3 pt-2 sm:pt-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-navy transition active:scale-95"
          >
            <ArrowLeft className="size-4 sm:hidden" />
            <X className="hidden size-4 sm:block" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-extrabold leading-tight text-navy">{subject}</h2>
            <p className="truncate text-xs text-muted">
              TichaPortal · {term || 'Term'} {academicYear ? `· ${academicYear}` : ''}
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted">
              <Loader2 className="size-7 animate-spin text-primary" />
              <p className="text-sm">Loading…</p>
            </div>
          ) : (
            <div className="space-y-5">
              {apiFailed && markCount > 0 ? (
                <p className="rounded-2xl bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-950">
                  Report totals unavailable. Showing teacher marks only. Ensure ParentMIS{' '}
                  <span className="font-mono">ACADEMIC_API_URL</span> points to your Academic API (e.g.{' '}
                  <span className="font-mono">http://localhost:3003/api</span>).
                </p>
              ) : null}

              {/* Summary */}
              <div className="rounded-3xl bg-navy p-5 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-white/70">Course average</p>
                    <p className="mt-1 text-4xl font-extrabold tabular-nums leading-none">
                      {avgPct != null ? `${fmt(course?.percentage)}%` : ACADEMIC_EMPTY}
                    </p>
                  </div>
                  {course?.grade ? (
                    <span
                      className={cn(
                        'inline-flex rounded-full px-3 py-1 text-sm font-bold',
                        gradeTone(course.grade)
                      )}
                    >
                      {course.grade}
                    </span>
                  ) : null}
                </div>
                {avgPct != null ? (
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${avgPct}%` }}
                    />
                  </div>
                ) : null}
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
                  <div>
                    <dt className="text-xs text-white/60">Marks recorded</dt>
                    <dd className="mt-0.5 text-lg font-bold tabular-nums">{markCount}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-white/60">Default total</dt>
                    <dd className="mt-0.5 text-lg font-bold tabular-nums">
                      {fmt(course?.defaultCourseMarks, 0)}
                    </dd>
                  </div>
                </dl>
              </div>

              {calcAvailable && componentNames.length > 0 ? (
                <section>
                  <h3 className="mb-2 px-1 text-sm font-bold text-navy">Report components</h3>
                  <ul className="space-y-2">
                    {componentNames.map((name) => {
                      const cs = course?.categoryScores[name];
                      const recorded = cs?.marksRecorded !== false && cs != null;
                      const score = cs?.normalizedScore ?? cs?.contribution;
                      const cap = cs?.normalizedMax;
                      const display =
                        recorded && score != null
                          ? cap != null && cap > 0
                            ? `${fmt(score)}/${fmt(cap)}`
                            : fmt(score)
                          : ACADEMIC_EMPTY;
                      return (
                        <li
                          key={name}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-navy">{name}</p>
                            <p className="text-xs text-muted">Component cap · weight {fmt(cs?.weight, 0)}%</p>
                          </div>
                          <p className="shrink-0 text-base font-extrabold tabular-nums text-navy sm:text-lg">
                            {display}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              <section>
                <div className="mb-3 flex items-end justify-between gap-2 px-1">
                  <div>
                    <h3 className="text-sm font-bold text-navy">All marks this course</h3>
                    <p className="mt-0.5 text-xs text-muted">
                      Published scores for {term || 'this term'}
                      {academicYear ? ` · ${academicYear}` : ''}
                    </p>
                  </div>
                  {markCount > 0 ? (
                    <span className="shrink-0 rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-bold tabular-nums text-navy">
                      {markCount}
                    </span>
                  ) : null}
                </div>
                {courseMarks.length > 0 ? (
                  <AcademicMarksTable
                    marks={courseMarks}
                    pageSize={8}
                    showView={false}
                    showRowNumbers
                    submittedColumn="full"
                    singleSubject={subject}
                    emptyMessage="No marks for this course yet."
                  />
                ) : markCount === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-muted">
                    No marks for this course yet.
                    {scheduled.length > 0 ? (
                      <p className="mt-2 text-xs">{scheduled.length} assessment(s) scheduled.</p>
                    ) : null}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {course!.teacherMarks.map((m) => (
                      <li
                        key={m.id}
                        className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words font-semibold text-navy">
                              {formatAssessmentTitle(m.title, subject)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted">
                              {[m.componentName, m.date ? formatShortDate(m.date) : null]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>
                          <p className="shrink-0 text-lg font-extrabold tabular-nums text-navy">
                            {m.score}
                            <span className="text-sm font-medium text-muted">/{m.maxMark}</span>
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {scheduled.length > 0 && markCount === 0 ? (
                <section>
                  <h3 className="mb-2 px-1 text-sm font-bold text-navy">Scheduled</h3>
                  <ul className="space-y-2">
                    {scheduled.slice(0, 5).map((s) => (
                      <li
                        key={s.id}
                        className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm"
                      >
                        <span className="font-medium text-navy">{s.title}</span>
                        {s.date ? (
                          <span className="text-muted"> · {formatShortDate(s.date)}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}