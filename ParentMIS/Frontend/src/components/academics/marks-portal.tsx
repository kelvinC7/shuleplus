'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CalendarDays,
  GraduationCap,
  BookOpen,
  FileText,
  ClipboardCheck,
  LayoutGrid,
  MessageSquare,
  Timer,
  ChevronRight,
} from 'lucide-react';
import { ReportCardsPanel } from '@/components/academics/report-cards-panel';
import { AcademicCourseDetail } from '@/components/academics/academic-course-detail';
import { AcademicMarksTable } from '@/components/academics/academic-marks-table';
import { AssessmentSchedulePanel } from '@/components/academics/assessment-schedule-panel';
import { ExamTimetablePanel } from '@/components/academics/exam-timetable-panel';
import type { UpcomingExam } from '@/types';

import { EmptyState } from '@/components/shared/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NativeSelect } from '@/components/ui/native-select';
import { cn } from '@/lib/utils';
import {
  buildAcademicAlerts,
  buildCourseOverview,
  type CourseOverviewRow,
} from '@/lib/academic-portal-utils';
import { api } from '@/services/api';
import { ACADEMIC_EMPTY, formatAssessmentTitle, formatClassLabel } from '@/lib/academic-display';

import type { PublishedMark, ScheduleItem } from '@/lib/academic-portal-utils';

export type { PublishedMark, ScheduleItem } from '@/lib/academic-portal-utils';

export interface MarksPortalData {
  student: { fullName: string; className: string };
  publishedMarks: PublishedMark[];
  schedule: ScheduleItem[];
  upcomingExams?: UpcomingExam[];
  filters: { academicYear: string; term: string; years: string[]; terms: string[] };
  marksLocked?: boolean;
  marksAccessMessage?: string | null;
  marksBalance?: number;
  marksPaymentStatus?: string;
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
  if (grade.startsWith('A')) return 'bg-emerald-100 text-emerald-900';
  if (grade.startsWith('B')) return 'bg-sky-100 text-sky-900';
  if (grade.startsWith('C')) return 'bg-amber-100 text-amber-950';
  return 'bg-rose-100 text-rose-900';
}

/** Override TabsTrigger defaults (`flex-1`, `after:` indicator) — scroll row on mobile, wrap on lg */
const marksTabsListClass =
  '!h-auto !w-full max-w-full flex flex-nowrap items-center justify-start gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-2xl border border-slate-200/90 bg-white p-1 shadow-sm snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ' +
  'lg:flex-wrap lg:justify-center lg:gap-1.5 lg:overflow-visible lg:p-1.5';

const marksTabClass =
  '!flex-none shrink-0 snap-start ' +
  'relative z-[1] inline-flex min-h-10 max-w-none items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-transparent px-2.5 py-2 text-[11px] font-semibold leading-none text-slate-600 shadow-none after:!hidden sm:gap-1.5 sm:px-3.5 sm:text-sm ' +
  'transition-colors hover:bg-slate-100 hover:text-navy ' +
  'data-[active]:!border-navy/15 data-[active]:!bg-navy data-[active]:!text-white data-[active]:shadow-md data-[active]:shadow-navy/20 ' +
  'data-active:!border-navy/15 data-active:!bg-navy data-active:!text-white';

const selectClass =
  'w-full [&_select]:h-11 [&_select]:rounded-xl [&_select]:border-white/20 [&_select]:bg-white [&_select]:font-medium [&_select]:text-navy';

interface MarksPortalProps {
  data: MarksPortalData | null;
  loading: boolean;
  error: string | null;
  activeTab?: 'overview' | 'marks' | 'schedule' | 'exams' | 'reports' | 'feedback';
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
  activeTab = 'overview',
  activeStudentId = '',
  academicYear,
  term,
  onAcademicYearChange,
  onTermChange,
}: MarksPortalProps) {
  const router = useRouter();
  const [reportCount, setReportCount] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [performanceIndex, setPerformanceIndex] = useState<
    Map<string, { percentage: number; grade: string | null; totalScore: number; marksEntered: boolean }>
  >(new Map());

  const activeTerm = data?.terms[0];
  const marks = data?.publishedMarks ?? [];
  const schedule = data?.schedule ?? [];
  const upcomingExams = data?.upcomingExams ?? [];
  const years = data?.filters.years ?? [];
  const terms = data?.filters.terms ?? [];

  const courseRows = useMemo(() => {
    const base = buildCourseOverview(marks, schedule);
    const bySubject = new Map(base.map((r) => [r.subject, r]));
    for (const [subject, perf] of performanceIndex) {
      const existing = bySubject.get(subject);
      if (!existing) {
        const scheduled = schedule.filter((s) => s.subject === subject).length;
        bySubject.set(subject, {
          subject,
          assessmentsScheduled: scheduled,
          assessmentsEntered: perf.marksEntered ? 1 : 0,
          status: perf.marksEntered ? 'Updated' : scheduled > 0 ? 'In progress' : 'Not started',
          lastMarkDate: null,
        });
      } else if (perf.marksEntered && existing.status === 'Not started') {
        bySubject.set(subject, {
          ...existing,
          assessmentsEntered: Math.max(existing.assessmentsEntered, 1),
          status: existing.assessmentsScheduled > existing.assessmentsEntered ? 'In progress' : 'Updated',
        });
      }
    }
    return [...bySubject.values()].sort((a, b) => a.subject.localeCompare(b.subject));
  }, [marks, schedule, performanceIndex]);
  const alerts = useMemo(
    () => buildAcademicAlerts(marks, schedule, reportCount),
    [marks, schedule, reportCount]
  );
  const selectedCourseRow = useMemo(
    () => courseRows.find((r) => r.subject === selectedCourse) ?? null,
    [courseRows, selectedCourse]
  );

  const loadReportCount = useCallback(async () => {
    if (!activeStudentId) return;
    try {
      const params = new URLSearchParams({ studentId: activeStudentId });
      if (academicYear) params.set('academicYear', academicYear);
      if (term) params.set('term', term);
      const res = await api.get<{ data: { items: unknown[] } }>(`/report-cards?${params}`);
      setReportCount(res.data.data?.items?.length ?? 0);
    } catch {
      setReportCount(0);
    }
  }, [activeStudentId, academicYear, term]);

  useEffect(() => {
    void loadReportCount();
  }, [loadReportCount]);

  const loadPerformanceIndex = useCallback(async () => {
    if (!activeStudentId) return;
    try {
      const params = new URLSearchParams({ studentId: activeStudentId });
      if (academicYear) params.set('academicYear', academicYear);
      if (term) params.set('term', term);
      const res = await api.get<{
        data: {
          courses: Array<{
            subjectName: string;
            percentage: number;
            grade: string | null;
            totalScore: number;
            marksEntered?: boolean;
          }>;
        };
      }>(`/academics/course-performance?${params}`);
      const map = new Map<
        string,
        { percentage: number; grade: string | null; totalScore: number; marksEntered: boolean }
      >();
      for (const c of res.data.data?.courses ?? []) {
        map.set(c.subjectName, {
          percentage: c.percentage,
          grade: c.grade,
          totalScore: c.totalScore,
          marksEntered: Boolean(c.marksEntered ?? (c.percentage > 0 || c.totalScore > 0)),
        });
      }
      setPerformanceIndex(map);
    } catch {
      setPerformanceIndex(new Map());
    }
  }, [activeStudentId, academicYear, term]);

  useEffect(() => {
    void loadPerformanceIndex();
  }, [loadPerformanceIndex]);

  useEffect(() => {
    if (activeTab !== 'marks') setSelectedCourse(null);
  }, [activeTab]);

  const assessedSubjects = new Set(marks.map((m) => m.subject)).size;
  const overviewStats = [
    { label: 'Courses', value: courseRows.length, hint: 'This term', icon: BookOpen },
    { label: 'With marks', value: assessedSubjects, hint: 'From teachers', icon: ClipboardCheck },
    { label: 'Scheduled', value: schedule.length, hint: 'Assessments', icon: CalendarDays },
    { label: 'Reports', value: reportCount, hint: 'Published', icon: FileText },
  ];

  function courseStatusClass(status: CourseOverviewRow['status']) {
    if (status === 'Updated') return 'bg-emerald-50 text-emerald-800';
    if (status === 'In progress') return 'bg-amber-50 text-amber-900';
    return 'bg-slate-100 text-slate-600';
  }

  return (
    <div className="min-w-0 w-full space-y-4 sm:space-y-5">
      {/* Header: student first, filters underneath */}
      <div className="rounded-3xl bg-navy p-4 text-white sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/60">Academic</p>
            <h1 className="mt-0.5 truncate text-xl font-extrabold tracking-tight sm:text-2xl">
              {data?.student.fullName || 'Student'}
            </h1>
            <p className="mt-0.5 truncate text-sm text-white/70">
              {formatClassLabel(data?.student.className) || 'Class'}
            </p>
          </div>
          {activeTerm ? (
            <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-white/10 px-3 py-2">
              <GraduationCap className="size-5 text-amber-300" />
              <div className="leading-none">
                <p className="text-[10px] text-white/60">GPA</p>
                <p className="mt-1 text-lg font-extrabold tabular-nums">{activeTerm.gpa.toFixed(1)}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs font-medium text-white/70">Year</span>
            <NativeSelect
              value={academicYear}
              onChange={(e) => onAcademicYearChange(e.target.value)}
              className={selectClass}
              disabled={!years.length}
            >
              {!years.length ? <option value="">{ACADEMIC_EMPTY}</option> : null}
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs font-medium text-white/70">Term</span>
            <NativeSelect
              value={term}
              onChange={(e) => onTermChange(e.target.value)}
              className={selectClass}
              disabled={!terms.length}
            >
              {!terms.length ? <option value="">{ACADEMIC_EMPTY}</option> : null}
              {terms.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>
      </div>

      {!activeStudentId && !loading ? (
        <EmptyState
          className="border-slate-200 bg-white py-12"
          title="Select a student"
          description="Choose your child at the top of the page to view marks and reports."
        />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<AlertCircle className="text-red-500" />} title="Could not load marks" description={error} />
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(tab) => router.replace(`/academic?tab=${tab}`, { scroll: false })}
          className="min-w-0 w-full gap-3"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-white p-1 shadow-sm sm:p-1.5">
            <TabsList variant="line" className={marksTabsListClass}>
              <TabsTrigger value="overview" className={marksTabClass}>
                <LayoutGrid className="size-3.5 shrink-0 sm:size-4" aria-hidden />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="marks" className={marksTabClass}>
                <BookOpen className="size-3.5 shrink-0 sm:size-4" aria-hidden />
                <span>Marks</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className={marksTabClass}>
                <CalendarDays className="size-3.5 shrink-0 sm:size-4" aria-hidden />
                <span>Schedule</span>
              </TabsTrigger>
              <TabsTrigger value="exams" className={marksTabClass}>
                <Timer className="size-3.5 shrink-0 sm:size-4" aria-hidden />
                <span>Exams</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className={marksTabClass}>
                <FileText className="size-3.5 shrink-0 sm:size-4" aria-hidden />
                <span>Reports</span>
                {reportCount > 0 ? (
                  <span className="inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-amber-400 px-1 py-0.5 text-[9px] font-bold text-navy sm:text-[10px]">
                    {reportCount}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="feedback" className={marksTabClass}>
                <MessageSquare className="size-3.5 shrink-0 sm:size-4" aria-hidden />
                <span>Feedback</span>
              </TabsTrigger>
            </TabsList>
            <p className="mt-1.5 px-1 text-[10px] font-medium text-slate-400 lg:hidden">
              Swipe tabs for Marks, Schedule, Reports…
            </p>
          </div>

          <TabsContent value="overview" className="mt-0 space-y-4 focus-visible:outline-none">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {overviewStats.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-2xl border border-slate-200/80 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-2xl font-extrabold tabular-nums text-navy">{s.value}</p>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-navy">
                        <Icon className="size-4" />
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-700">{s.label}</p>
                    <p className="text-xs text-slate-500">{s.hint}</p>
                  </div>
                );
              })}
            </div>

            {alerts.length > 0 ? (
              <div className="flex flex-col gap-2">
                {alerts.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-sm leading-relaxed text-amber-950"
                  >
                    {a.detail}
                  </div>
                ))}
              </div>
            ) : null}

            {marks.length === 0 && schedule.length > 0 ? (
              <p className="rounded-2xl bg-white px-4 py-3 text-sm leading-relaxed text-slate-600">
                Assessments are scheduled for this term. Marks appear after teachers publish scores. School fees
                are not required to view marks; fees may only apply when opening official report cards if your
                school enables that rule.
              </p>
            ) : null}

            <div>
              <p className="mb-2 px-1 text-sm font-bold text-navy">Recent marks</p>
              {marks.length === 0 ? (
                <p className="rounded-2xl border border-slate-200/80 bg-white px-4 py-6 text-sm text-slate-500">
                  No marks published yet for this term.
                </p>
              ) : (
                <>
                  <div className="md:hidden">
                    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
                      {marks.slice(0, 5).map((row) => (
                        <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-navy">{row.subject}</p>
                            <p className="truncate text-xs text-muted">
                              {formatAssessmentTitle(row.title, row.subject)}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 font-bold tabular-nums text-navy">
                            {row.score}/{row.maxScore}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <AcademicMarksTable
                    marks={marks.slice(0, 5)}
                    compact
                    className="hidden md:block"
                    paginate={false}
                    showView={false}
                  />
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="marks" className="mt-0 space-y-4 focus-visible:outline-none">
            <div className="flex items-center gap-2 px-1">
              <BookOpen className="size-4 text-navy" />
              <h2 className="text-sm font-bold text-navy">Course performance</h2>
            </div>

            {data?.marksLocked ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-center">
                <p className="text-sm font-bold text-amber-900">Pay to view marks</p>
                <p className="mt-1 text-xs text-amber-800">
                  {data.marksAccessMessage || 'Publishing of marks for this term requires payment. Open the Reports tab for details.'}
                </p>
                {typeof data.marksBalance === 'number' ? (
                  <p className="mt-2 text-xs font-semibold text-amber-900">Outstanding balance: {data.marksBalance}</p>
                ) : null}
                <p className="mt-2 text-[11px] text-amber-700">
                  The school can grant access by publishing this term to you from Academic, then refresh this page.
                </p>
              </div>
            ) : courseRows.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-muted">
                Courses appear when assessments are scheduled or marks are published.
              </p>
            ) : (
              <>
                {/* Mobile: course cards */}
                <div className="grid gap-3 sm:grid-cols-2 md:hidden">
                  {courseRows.map((row) => {
                    const perf = performanceIndex.get(row.subject);
                    const pct = perf ? Math.min(100, Math.max(0, perf.percentage)) : null;
                    return (
                      <button
                        type="button"
                        key={row.subject}
                        onClick={() => setSelectedCourse(row.subject)}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-left transition active:scale-[0.99]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-navy">{row.subject}</p>
                            <p className="mt-0.5 text-xs text-muted">
                              {row.assessmentsScheduled > 0
                                ? `${row.assessmentsEntered}/${row.assessmentsScheduled} assessments`
                                : `${row.assessmentsEntered} mark(s)`}
                            </p>
                          </div>
                          {perf ? (
                            <div className="shrink-0 text-right">
                              <p className="text-xl font-extrabold tabular-nums leading-none text-navy">
                                {Math.round(perf.percentage * 10) / 10}%
                              </p>
                              {perf.grade ? (
                                <span
                                  className={cn(
                                    'mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold',
                                    gradeBadge(perf.grade)
                                  )}
                                >
                                  {perf.grade}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        {pct != null ? (
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-navy" style={{ width: `${pct}%` }} />
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                              courseStatusClass(row.status)
                            )}
                          >
                            {row.status}
                          </span>
                          <span className="flex items-center text-xs font-semibold text-navy">
                            View course <ChevronRight className="size-3.5" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Desktop: table */}
                <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80 text-xs text-slate-500">
                          <th className="px-4 py-3 font-semibold">Course</th>
                          <th className="px-4 py-3 font-semibold">Entered</th>
                          <th className="px-4 py-3 font-semibold">Average</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 text-right font-semibold"> </th>
                        </tr>
                      </thead>
                      <tbody>
                        {courseRows.map((row) => {
                          const perf = performanceIndex.get(row.subject);
                          return (
                            <tr key={row.subject} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                              <td className="px-4 py-3.5 font-semibold text-navy">{row.subject}</td>
                              <td className="px-4 py-3.5 tabular-nums text-muted">
                                {row.assessmentsScheduled > 0
                                  ? `${row.assessmentsEntered}/${row.assessmentsScheduled}`
                                  : row.assessmentsEntered}
                              </td>
                              <td className="px-4 py-3.5">
                                {perf ? (
                                  <span className="font-bold tabular-nums text-navy">
                                    {Math.round(perf.percentage * 10) / 10}%
                                    {perf.grade ? (
                                      <span
                                        className={cn(
                                          'ml-2 rounded-full px-2 py-0.5 text-xs font-bold',
                                          gradeBadge(perf.grade)
                                        )}
                                      >
                                        {perf.grade}
                                      </span>
                                    ) : null}
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-muted">{ACADEMIC_EMPTY}</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5">
                                <span
                                  className={cn(
                                    'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                    courseStatusClass(row.status)
                                  )}
                                >
                                  {row.status}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <button
                                  type="button"
                                  className="rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-navy/90"
                                  onClick={() => setSelectedCourse(row.subject)}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center gap-2 px-1 pt-2">
              <ClipboardCheck className="size-4 text-navy" />
              <h2 className="text-sm font-bold text-navy">All marks</h2>
            </div>

            {marks.length === 0 ? (
              <EmptyState
                className="border-slate-200 bg-white py-12"
                title="No marks yet"
                description="Scores show here after teachers publish them."
              />
            ) : (
              <AcademicMarksTable
                marks={marks}
                pageSize={10}
                showView
                onViewCourse={(subject) => setSelectedCourse(subject)}
                submittedColumn="full"
              />
            )}
          </TabsContent>

          <TabsContent value="schedule" className="relative z-0 mt-0 focus-visible:outline-none">
            <AssessmentSchedulePanel
              schedule={schedule}
              term={term}
              classNameLabel={formatClassLabel(data?.student.className)}
            />
          </TabsContent>

          <TabsContent value="exams" className="relative z-0 mt-0 focus-visible:outline-none">
            <ExamTimetablePanel
              exams={upcomingExams}
              term={term}
              classNameLabel={formatClassLabel(data?.student.className)}
            />
          </TabsContent>

          <TabsContent value="feedback" className="relative z-0 mt-0">
            <EmptyState
              className="border-slate-200 bg-white py-12"
              icon={<FileText className="text-primary" />}
              title="Teacher feedback"
              description="Course comments and recommendations from teachers appear here when your school enables feedback on published assessments and report cards."
            />
          </TabsContent>

          <TabsContent value="reports" className="relative z-0 mt-0">
            {activeStudentId ? (
              <ReportCardsPanel
                embedded
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

      {selectedCourse && activeStudentId ? (
        <AcademicCourseDetail
          subject={selectedCourse}
          row={selectedCourseRow}
          activeStudentId={activeStudentId}
          academicYear={academicYear}
          term={term}
          publishedMarks={marks}
          schedule={schedule}
          onClose={() => setSelectedCourse(null)}
        />
      ) : null}
    </div>
  );
}