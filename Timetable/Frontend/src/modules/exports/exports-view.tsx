'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  GraduationCap,
  Loader2,
  Search,
  Square,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { TermYearBar } from '@/components/term-year-bar';
import { timetableApi } from '@/services/timetable-api';
import { useAuth } from '@/contexts/auth-context';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { HrPageLayout } from '@/components/hr-page-layout';
import type { CourseConfig, SchoolSchedule, TimetableRow } from '@/types';
import { WEEK_DAYS } from '@/types';
import { resolveSchedulePeriodSlots, uniqueClasses, uniqueTeachers } from '@/utils/timetable';
import type { TimetablePdfContext } from '@/utils/timetable-pdf-export';
import {
  buildClassSummaries,
  buildTeacherSummaries,
  groupClassesByStream,
  type ClassSummaryCard,
  type TeacherSummaryCard,
} from '@/utils/timetable-summary';

async function loadPdfExport() {
  return import('@/utils/timetable-pdf-export');
}

type ExportsTab = 'class-summary' | 'teacher-summary' | 'downloads';

const ACTIVE_DAYS = [...WEEK_DAYS].slice(0, 5);

export function ExportsView() {
  const { summary } = useAuth();
  const { term, academicYear, setTerm, setAcademicYear, settings: academicSettings } =
    useAcademicSettings();
  const [rows, setRows] = useState<TimetableRow[]>([]);
  const [courses, setCourses] = useState<CourseConfig[]>([]);
  const [schedule, setSchedule] = useState<SchoolSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ExportsTab>('class-summary');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [busyExport, setBusyExport] = useState(false);

  const meta = {
    schoolName: summary?.organizationName,
    term,
    academicYear,
  };

  const pdfCtx = useMemo((): TimetablePdfContext => {
    const periodSlots = schedule ? resolveSchedulePeriodSlots(schedule) : [];
    return { periodSlots, courses };
  }, [schedule, courses]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      timetableApi.listTimetable({ term, academic_year: academicYear }),
      timetableApi.listCourseConfig(),
      timetableApi.getSchedule(term, academicYear),
    ])
      .then(([timetableRes, coursesRes, scheduleRes]) => {
        setRows(timetableRes.data.data);
        setCourses(coursesRes.data.data);
        setSchedule(scheduleRes.data.data);
      })
      .finally(() => setLoading(false));
  }, [term, academicYear]);

  const classes = useMemo(() => uniqueClasses(rows), [rows]);
  const teachers = useMemo(() => uniqueTeachers(rows), [rows]);
  const streamGroups = useMemo(() => groupClassesByStream(classes), [classes]);

  const classSummaries = useMemo(
    () => buildClassSummaries(rows, courses),
    [rows, courses]
  );
  const teacherSummaries = useMemo(
    () => buildTeacherSummaries(rows, courses),
    [rows, courses]
  );

  const filteredClassSummaries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classSummaries;
    return classSummaries.filter(
      (c) =>
        c.className.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        c.courses.some((x) => x.subjectName.toLowerCase().includes(q) || x.courseCode.toLowerCase().includes(q))
    );
  }, [classSummaries, search]);

  const filteredTeacherSummaries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teacherSummaries;
    return teacherSummaries.filter(
      (t) =>
        t.teacherName.toLowerCase().includes(q) ||
        t.classes.some((c) => c.toLowerCase().includes(q)) ||
        t.courses.some((x) => x.subjectName.toLowerCase().includes(q))
    );
  }, [teacherSummaries, search]);

  function toggleClass(className: string) {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(className)) next.delete(className);
      else next.add(className);
      return next;
    });
  }

  function toggleGroup(groupClasses: string[]) {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      const allSelected = groupClasses.every((c) => next.has(c));
      if (allSelected) groupClasses.forEach((c) => next.delete(c));
      else groupClasses.forEach((c) => next.add(c));
      return next;
    });
  }

  function selectAllClasses() {
    setSelectedClasses(new Set(classes));
  }

  function clearSelection() {
    setSelectedClasses(new Set());
  }

  async function downloadMasterSelected() {
    const selected = [...selectedClasses].sort();
    if (!selected.length) {
      toast.error('Select at least one class');
      return;
    }
    setBusyExport(true);
    try {
      const { exportMasterTimetablePdf } = await loadPdfExport();
      const label =
        selected.length <= 3
          ? selected.join(', ')
          : `${selected.length} classes`;
      exportMasterTimetablePdf(selected, rows, meta, pdfCtx, {
        title: `Master Timetable · ${label}`,
        filename: `master-timetable-${selected.length}-classes-${academicYear}-${term.replace(/\s+/g, '-')}.pdf`,
      });
      toast.success(`Downloaded master PDF for ${selected.length} class(es)`);
    } catch {
      toast.error('Could not create master PDF');
    } finally {
      setBusyExport(false);
    }
  }

  const tabs: Array<{ id: ExportsTab; label: string; icon: typeof GraduationCap }> = [
    { id: 'class-summary', label: 'Summary by Class', icon: GraduationCap },
    { id: 'teacher-summary', label: 'Summary by Teacher', icon: Users },
    { id: 'downloads', label: 'Downloads', icon: Download },
  ];

  return (
    <div className="space-y-6">
      <TermYearBar
        term={term}
        academicYear={academicYear}
        onTermChange={setTerm}
        onYearChange={setAcademicYear}
        terms={academicSettings?.terms}
        academicYears={academicSettings?.academicYears}
      />

      <HrPageLayout
        title="Exports & Summaries"
        description={`${term} · ${academicYear}. Review workload by class or teacher, then download individual or master PDFs.`}
        kpis={[
          { label: 'Classes', value: classes.length },
          { label: 'Teachers', value: teachers.length },
          { label: 'Lessons / week', value: rows.filter((r) => !r.isExtraActivity).length },
          { label: 'Selected', value: selectedClasses.size || '—' },
        ]}
      >
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setSearch('');
                  setExpanded(null);
                }}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-navy text-white shadow-sm'
                    : 'border border-border bg-white text-muted hover:border-navy/30 hover:text-navy'
                }`}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-muted" size={22} />
          </div>
        ) : tab === 'downloads' ? (
          <DownloadsPanel
            streamGroups={streamGroups}
            selectedClasses={selectedClasses}
            busyExport={busyExport}
            teachers={teachers}
            rows={rows}
            meta={meta}
            pdfCtx={pdfCtx}
            onToggleClass={toggleClass}
            onToggleGroup={toggleGroup}
            onSelectAll={selectAllClasses}
            onClear={clearSelection}
            onMasterDownload={() => void downloadMasterSelected()}
          />
        ) : (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  tab === 'class-summary' ? 'Search class or course…' : 'Search teacher or class…'
                }
                className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-navy/40"
              />
            </div>

            {tab === 'class-summary' ? (
              filteredClassSummaries.length === 0 ? (
                <EmptyState message="No class timetable data for this term yet." />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {filteredClassSummaries.map((card) => (
                    <ClassSummaryPanel
                      key={card.className}
                      card={card}
                      term={term}
                      expanded={expanded === `class:${card.className}`}
                      onToggle={() =>
                        setExpanded((cur) =>
                          cur === `class:${card.className}` ? null : `class:${card.className}`
                        )
                      }
                      onDownload={async () => {
                        const { exportClassTimetablePdf } = await loadPdfExport();
                        exportClassTimetablePdf(
                          card.className,
                          rows.filter((r) => r.className === card.className),
                          meta,
                          pdfCtx
                        );
                      }}
                    />
                  ))}
                </div>
              )
            ) : filteredTeacherSummaries.length === 0 ? (
              <EmptyState message="No teacher timetable data for this term yet." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredTeacherSummaries.map((card) => (
                  <TeacherSummaryPanel
                    key={card.teacherUserId}
                    card={card}
                    term={term}
                    expanded={expanded === `teacher:${card.teacherUserId}`}
                    onToggle={() =>
                      setExpanded((cur) =>
                        cur === `teacher:${card.teacherUserId}`
                          ? null
                          : `teacher:${card.teacherUserId}`
                      )
                    }
                    onDownload={async () => {
                      const { exportTeacherTimetablePdf } = await loadPdfExport();
                      exportTeacherTimetablePdf(
                        card.teacherUserId,
                        card.teacherName,
                        rows,
                        meta,
                        pdfCtx
                      );
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </HrPageLayout>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-slate-50/80 px-6 py-14 text-center text-sm text-muted">
      {message}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold tabular-nums text-navy">{value}</p>
    </div>
  );
}

function CourseBreakdownTable({
  courses,
  term,
}: {
  courses: ClassSummaryCard['courses'];
  term: string;
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2 font-bold">Course</th>
            <th className="px-3 py-2 font-bold">Teacher</th>
            <th className="px-3 py-2 font-bold text-right">/ week</th>
            <th className="px-3 py-2 font-bold text-right">/ day</th>
            <th className="px-3 py-2 font-bold text-right">/ {term}</th>
            {ACTIVE_DAYS.map((d) => (
              <th key={d} className="px-2 py-2 text-center font-bold">
                {d.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.subjectName} className="border-t border-border/80">
              <td className="px-3 py-2">
                <span className="font-bold text-navy">{c.courseCode}</span>
                <span className="ml-1.5 text-muted">{c.subjectName}</span>
              </td>
              <td className="px-3 py-2 text-muted">{c.teacherName}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums text-navy">
                {c.periodsPerWeek}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-muted">{c.periodsPerDay}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums text-navy">
                {c.periodsPerTerm}
              </td>
              {ACTIVE_DAYS.map((d) => (
                <td key={d} className="px-2 py-2 text-center tabular-nums text-muted">
                  {c.byDay[d] || '·'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClassSummaryPanel({
  card,
  term,
  expanded,
  onToggle,
  onDownload,
}: {
  card: ClassSummaryCard;
  term: string;
  expanded: boolean;
  onToggle: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
            <p className="text-base font-extrabold text-navy">{card.className}</p>
            {card.group !== card.className ? (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">
                {card.group}
              </span>
            ) : null}
          </div>
          <p className="mt-1 pl-6 text-xs text-muted">
            {card.courseCount} courses · {card.teacherCount} teachers
          </p>
        </button>
        <button
          type="button"
          className="btn-secondary py-1.5 text-xs"
          onClick={() => void onDownload()}
          title="Download class PDF"
        >
          <FileText size={14} /> PDF
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatChip label="Periods / week" value={card.totalPeriodsWeek} />
        <StatChip label="Avg / day" value={card.avgPeriodsPerDay} />
        <StatChip label={`Per ${term}`} value={card.totalPeriodsTerm} />
      </div>

      {expanded ? <CourseBreakdownTable courses={card.courses} term={term} /> : null}
    </div>
  );
}

function TeacherSummaryPanel({
  card,
  term,
  expanded,
  onToggle,
  onDownload,
}: {
  card: TeacherSummaryCard;
  term: string;
  expanded: boolean;
  onToggle: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
            <p className="text-base font-extrabold text-navy">{card.teacherName}</p>
          </div>
          <p className="mt-1 pl-6 text-xs text-muted">
            {card.classCount} classes · {card.courseCount} courses
          </p>
        </button>
        <button
          type="button"
          className="btn-secondary py-1.5 text-xs"
          onClick={() => void onDownload()}
          title="Download teacher PDF"
        >
          <FileText size={14} /> PDF
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatChip label="Periods / week" value={card.totalPeriodsWeek} />
        <StatChip label="Avg / day" value={card.avgPeriodsPerDay} />
        <StatChip label={`Per ${term}`} value={card.totalPeriodsTerm} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 pl-0.5">
        {card.classes.map((c) => (
          <span
            key={c}
            className="rounded-lg border border-border bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-navy"
          >
            {c}
          </span>
        ))}
      </div>

      {expanded ? <CourseBreakdownTable courses={card.courses} term={term} /> : null}
    </div>
  );
}

function DownloadsPanel({
  streamGroups,
  selectedClasses,
  busyExport,
  teachers,
  rows,
  meta,
  pdfCtx,
  onToggleClass,
  onToggleGroup,
  onSelectAll,
  onClear,
  onMasterDownload,
}: {
  streamGroups: ReturnType<typeof groupClassesByStream>;
  selectedClasses: Set<string>;
  busyExport: boolean;
  teachers: Array<{ id: string; name: string }>;
  rows: TimetableRow[];
  meta: { schoolName?: string; term: string; academicYear: string };
  pdfCtx: TimetablePdfContext;
  onToggleClass: (className: string) => void;
  onToggleGroup: (classes: string[]) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onMasterDownload: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-slate-50 to-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold text-navy">Master Timetable</p>
            <p className="mt-1 max-w-xl text-xs text-muted">
              Select streams (e.g. S3 picks S3 A and S3 B) or individual classes, then download one
              PDF with every selected timetable.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary py-2 text-xs" onClick={onSelectAll}>
              Select all
            </button>
            <button type="button" className="btn-secondary py-2 text-xs" onClick={onClear}>
              Clear
            </button>
            <button
              type="button"
              className="btn-primary py-2 text-xs"
              disabled={busyExport || selectedClasses.size === 0}
              onClick={onMasterDownload}
            >
              {busyExport ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download master ({selectedClasses.size})
            </button>
          </div>
        </div>

        {streamGroups.length === 0 ? (
          <p className="mt-6 text-sm text-muted">No classes to export yet.</p>
        ) : (
          <div className="mt-5 space-y-4">
            {streamGroups.map((group) => {
              const allOn = group.classes.every((c) => selectedClasses.has(c));
              const someOn = group.classes.some((c) => selectedClasses.has(c));
              return (
                <div key={group.group} className="rounded-xl border border-border bg-white p-4">
                  <button
                    type="button"
                    onClick={() => onToggleGroup(group.classes)}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    {allOn ? (
                      <CheckSquare size={18} className="text-primary" />
                    ) : someOn ? (
                      <CheckSquare size={18} className="text-primary/50" />
                    ) : (
                      <Square size={18} className="text-muted" />
                    )}
                    <span className="text-sm font-extrabold text-navy">{group.group}</span>
                    <span className="text-xs text-muted">
                      {group.classes.length} stream{group.classes.length === 1 ? '' : 's'}
                    </span>
                  </button>
                  <div className="mt-3 flex flex-wrap gap-2 pl-7">
                    {group.classes.map((className) => {
                      const on = selectedClasses.has(className);
                      return (
                        <button
                          key={className}
                          type="button"
                          onClick={() => onToggleClass(className)}
                          className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                            on
                              ? 'border-navy bg-navy text-white'
                              : 'border-border bg-slate-50 text-navy hover:border-navy/40'
                          }`}
                        >
                          {className}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-5">
          <h3 className="font-bold text-navy">Single class PDF</h3>
          <p className="mt-1 text-xs text-muted">One grid per class for notice boards.</p>
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {streamGroups.flatMap((g) => g.classes).map((className) => (
              <div
                key={className}
                className="flex items-center justify-between gap-2 rounded-xl border border-border px-4 py-2.5"
              >
                <span className="text-sm font-medium text-navy">{className}</span>
                <button
                  type="button"
                  className="rounded-lg p-2 hover:bg-primary/10"
                  title="Download PDF"
                  onClick={async () => {
                    const { exportClassTimetablePdf } = await loadPdfExport();
                    exportClassTimetablePdf(
                      className,
                      rows.filter((r) => r.className === className),
                      meta,
                      pdfCtx
                    );
                  }}
                >
                  <FileText size={16} className="text-primary" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5">
          <h3 className="font-bold text-navy">Single teacher PDF</h3>
          <p className="mt-1 text-xs text-muted">Shows course code and class name on each period.</p>
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {teachers.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border px-4 py-2.5"
              >
                <span className="text-sm font-medium text-navy">{t.name}</span>
                <button
                  type="button"
                  className="rounded-lg p-2 hover:bg-primary/10"
                  title="Download PDF"
                  onClick={async () => {
                    const { exportTeacherTimetablePdf } = await loadPdfExport();
                    exportTeacherTimetablePdf(t.id, t.name, rows, meta, pdfCtx);
                  }}
                >
                  <FileText size={16} className="text-primary" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
