'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Plus,
  Users,
} from 'lucide-react';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { assessmentApiError, fetchAssessmentDashboard } from '@/services/assessment-api';
import { fetchMyCourses, type MyCourseAssignment } from '@/services/my-courses-api';
import { fetchMyClasses, type MyClassItem } from '@/services/my-classes-api';
import type { Assessment, AssessmentStatus, TeacherDashboardData } from '@/types/assessment';

const STATUS_BADGES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  OPEN: 'bg-emerald-100 text-emerald-700',
  MARK_ENTRY: 'bg-blue-100 text-blue-700',
  SUBMITTED: 'bg-amber-100 text-amber-800',
  REVIEWED: 'bg-violet-100 text-violet-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  LOCKED: 'bg-slate-200 text-slate-500',
};

function normalize(s: string) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s·_-]+/g, ' ');
}

function assessmentClassLabel(a: Assessment) {
  if (!a.class) return '';
  return a.class.stream ? `${a.class.name} ${a.class.stream}` : a.class.name;
}

function courseKey(subjectName: string, className: string) {
  return `${normalize(subjectName)}::${normalize(className)}`;
}

function statusLabel(s: AssessmentStatus) {
  return s.replace('_', ' ');
}

interface CourseCardModel {
  key: string;
  subjectName: string;
  className: string;
  classId: string | null;
  studentCount: number;
  periodsPerWeek: number;
  room: string | null;
  assessments: Assessment[];
}

export function AssessmentDashboardView() {
  const router = useRouter();
  const { term, academicYear, settings } = useAcademicSettings();
  const [filterYear, setFilterYear] = useState(academicYear || '');
  const [filterTerm, setFilterTerm] = useState(term || '');
  const [dash, setDash] = useState<TeacherDashboardData | null>(null);
  const [assignments, setAssignments] = useState<MyCourseAssignment[]>([]);
  const [classes, setClasses] = useState<MyClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings?.currentAcademicYear) setFilterYear(settings.currentAcademicYear);
    if (settings?.currentTerm) setFilterTerm(settings.currentTerm);
  }, [settings]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, coursesRes, classesRes] = await Promise.all([
        fetchAssessmentDashboard({
          academicYear: filterYear || undefined,
          term: filterTerm || undefined,
        }).catch(() => null),
        fetchMyCourses({
          term: filterTerm || undefined,
          academicYear: filterYear || undefined,
        }).catch(() => null),
        fetchMyClasses({
          term: filterTerm || undefined,
          academicYear: filterYear || undefined,
        }).catch(() => null),
      ]);
      setDash(dashRes);
      setAssignments(coursesRes?.assignments ?? []);
      setClasses(classesRes?.classes ?? []);
      if (!dashRes && !coursesRes) {
        setError('Could not load courses or assessments');
      }
    } catch (err) {
      setError(assessmentApiError(err, 'Could not load courses and assessments'));
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterTerm]);

  useEffect(() => {
    void load();
  }, [load]);

  const assessments = useMemo(() => {
    const list = dash?.assessments ?? [];
    return list.filter((a) => {
      if (filterYear && a.academicYear && a.academicYear !== filterYear) return false;
      if (filterTerm && a.term && a.term !== filterTerm) return false;
      return true;
    });
  }, [dash, filterYear, filterTerm]);

  const courses: CourseCardModel[] = useMemo(() => {
    const map = new Map<string, CourseCardModel>();
    const classById = new Map(classes.map((c) => [c.id, c]));
    const classByLabel = new Map(classes.map((c) => [normalize(c.label), c]));

    for (const assignment of assignments) {
      const matched =
        (assignment.classId ? classById.get(assignment.classId) : undefined) ||
        classByLabel.get(normalize(assignment.classLabel || assignment.className));
      const key = courseKey(assignment.subjectName, assignment.classLabel || assignment.className);
      if (!map.has(key)) {
        map.set(key, {
          key,
          subjectName: assignment.subjectName,
          className: assignment.classLabel || assignment.className,
          classId: assignment.classId || matched?.id || null,
          studentCount: matched?.studentCount ?? 0,
          periodsPerWeek: assignment.periodsPerWeek,
          room: assignment.room,
          assessments: [],
        });
      }
    }

    for (const a of assessments) {
      const className = assessmentClassLabel(a) || a.class?.name || '';
      const subjectName = a.subject?.name || 'Subject';
      const key = courseKey(subjectName, className);
      const matched = a.classId
        ? classById.get(a.classId)
        : classByLabel.get(normalize(className));
      if (!map.has(key)) {
        map.set(key, {
          key,
          subjectName,
          className: className || 'Class',
          classId: a.classId || matched?.id || null,
          studentCount: matched?.studentCount ?? 0,
          periodsPerWeek: 0,
          room: null,
          assessments: [],
        });
      }
      map.get(key)!.assessments.push(a);
    }

    return Array.from(map.values()).sort(
      (a, b) => a.subjectName.localeCompare(b.subjectName) || a.className.localeCompare(b.className),
    );
  }, [assignments, assessments, classes]);

  const totalAssessments = assessments.length;
  const completedAssessments = assessments.filter((a) =>
    ['APPROVED', 'LOCKED', 'SUBMITTED', 'REVIEWED'].includes(a.status),
  ).length;
  const pendingAssessments = assessments.filter((a) =>
    ['DRAFT', 'OPEN', 'MARK_ENTRY'].includes(a.status),
  ).length;
  const completionRate =
    totalAssessments > 0 ? Math.round((completedAssessments / totalAssessments) * 100) : 0;

  const years = useMemo(() => {
    const set = new Set<string>();
    dash?.assessments?.forEach((a) => {
      if (a.academicYear) set.add(a.academicYear);
    });
    assignments.forEach((a) => {
      if (a.academicYear) set.add(a.academicYear);
    });
    if (settings?.academicYears) settings.academicYears.forEach((y) => set.add(y));
    if (filterYear) set.add(filterYear);
    return Array.from(set).sort().reverse();
  }, [dash, assignments, settings, filterYear]);

  const terms = useMemo(() => {
    const set = new Set<string>(['Term 1', 'Term 2', 'Term 3']);
    dash?.assessments?.forEach((a) => {
      if (a.term) set.add(a.term);
    });
    if (settings?.terms) settings.terms.forEach((t) => set.add(t));
    return Array.from(set);
  }, [dash, settings]);

  if (loading && !dash && assignments.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Courses & Marks</h1>
          <p className="mt-1 text-sm text-muted">Manage your courses, assessments, and marks</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            <option value="">All terms</option>
            {terms.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Link
            href="/assessments/create"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Assessment
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => void load()} className="ml-2 underline hover:text-red-900">
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Courses"
          value={courses.length}
          icon={<BookOpen className="h-5 w-5" />}
          tone="bg-navy/5 text-navy"
        />
        <SummaryCard
          label="Assessments"
          value={totalAssessments}
          icon={<FileText className="h-5 w-5" />}
          tone="bg-blue-50 text-blue-700"
        />
        <SummaryCard
          label="Pending"
          value={pendingAssessments}
          icon={<Clock className="h-5 w-5" />}
          tone="bg-amber-50 text-amber-700"
        />
        <SummaryCard
          label="Completion"
          value={`${completionRate}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="bg-emerald-50 text-emerald-700"
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy">My courses</h2>
          <p className="text-xs text-muted">Assigned from Timetable · students from Student Management</p>
        </div>
        {courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white py-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-muted">No assigned courses yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Courses appear here from your Timetable teaching assignments.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => {
              const done = course.assessments.filter((a) =>
                ['APPROVED', 'LOCKED', 'SUBMITTED', 'REVIEWED'].includes(a.status),
              ).length;
              const total = course.assessments.length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const createHref = `/assessments/create?subject=${encodeURIComponent(course.subjectName)}&className=${encodeURIComponent(course.className)}${
                course.classId ? `&classId=${encodeURIComponent(course.classId)}` : ''
              }`;
              return (
                <div
                  key={course.key}
                  className="rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-navy">{course.subjectName}</h3>
                      <p className="mt-0.5 text-sm text-muted">
                        {course.className}
                        {course.studentCount > 0 ? ` · ${course.studentCount} students` : ''}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        pct === 100 && total > 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {done}/{total || 0}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {course.assessments.slice(0, 3).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() =>
                          router.push(
                            ['DRAFT', 'OPEN', 'MARK_ENTRY'].includes(a.status)
                              ? `/assessments/${a.id}/marks`
                              : `/assessments/${a.id}`,
                          )
                        }
                        className="flex w-full items-center justify-between gap-2 text-left"
                      >
                        <span className="truncate text-xs text-slate-600">{a.title}</span>
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            STATUS_BADGES[a.status] ?? STATUS_BADGES.DRAFT
                          }`}
                        >
                          {statusLabel(a.status)}
                        </span>
                      </button>
                    ))}
                    {course.assessments.length === 0 && (
                      <p className="text-xs text-slate-400">No assessments yet for this course</p>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <Users className="h-3.5 w-3.5" />
                      {course.studentCount} students
                    </span>
                    <Link
                      href={createHref}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Create assessment
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy">Recent assessments</h2>
          {assessments.length > 0 && (
            <p className="text-xs text-muted">
              {assessments.length} assessment{assessments.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {assessments.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white py-10 text-center">
            <FileText className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-muted">No assessments for this period</p>
            <Link href="/assessments/create" className="mt-2 inline-block text-sm font-semibold text-primary">
              Create your first assessment
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            {assessments.slice(0, 12).map((a, idx) => (
              <button
                key={a.id}
                type="button"
                onClick={() =>
                  router.push(
                    ['DRAFT', 'OPEN', 'MARK_ENTRY'].includes(a.status)
                      ? `/assessments/${a.id}/marks`
                      : `/assessments/${a.id}`,
                  )
                }
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                  idx > 0 ? 'border-t border-border' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy">{a.title}</p>
                  <p className="truncate text-xs text-muted">
                    {a.subject?.name ?? 'Subject'} · {assessmentClassLabel(a) || 'Class'} · Max {a.maxMark}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    STATUS_BADGES[a.status] ?? STATUS_BADGES.DRAFT
                  }`}
                >
                  {statusLabel(a.status)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
          <p className="text-2xl font-extrabold text-navy">{value}</p>
        </div>
      </div>
    </div>
  );
}
