'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Clock, Loader2, RefreshCw, Search } from 'lucide-react';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import {
  fetchMyCourses,
  myCoursesApiError,
  type MyCourseGroup,
} from '@/services/my-courses-api';

export function MyCoursesView() {
  const { term, academicYear } = useAcademicSettings();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchMyCourses>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchMyCourses({ term, academicYear }));
    } catch (err) {
      setError(myCoursesApiError(err, 'Could not load your courses'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [term, academicYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data?.grouped ?? [];
    if (!q) return list;
    return list.filter(
      (group) =>
        group.subjectName.toLowerCase().includes(q) ||
        group.classes.some((c) => c.className.toLowerCase().includes(q))
    );
  }, [data?.grouped, search]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[320px] items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your courses…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
          <p className="mt-1 text-sm text-slate-600">
            Subjects and classes from your timetable teaching assignments.
          </p>
          {data?.teacherName && (
            <p className="mt-1 text-xs font-medium text-slate-500">{data.teacherName}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subjects</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{data?.grouped.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Class assignments</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{data?.assignments.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Periods / week</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{data?.totalPeriods ?? 0}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search subject or class…"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-sky-500 focus:ring-2"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
          No course assignments found. Timetable admin can add your teaching assignments.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((group) => (
            <CourseCard key={group.subjectName} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ group }: { group: MyCourseGroup }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{group.subjectName}</h2>
            <p className="text-xs text-slate-500">{group.classes.length} class(es)</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          <Clock className="h-3.5 w-3.5" />
          {group.totalPeriods} p/w
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {group.classes.map((cls) => (
          <div
            key={`${group.subjectName}-${cls.className}`}
            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
          >
            <span className="font-medium text-slate-800">{cls.className}</span>
            <span className="flex items-center gap-3 text-xs text-slate-500">
              {cls.periodsPerWeek} periods{cls.room ? ` · ${cls.room}` : ''}
              <Link
                href={`/assessments/create?subject=${encodeURIComponent(group.subjectName)}&className=${encodeURIComponent(cls.className)}${
                  cls.classId ? `&classId=${encodeURIComponent(cls.classId)}` : ''
                }`}
                className="font-semibold text-sky-700 hover:underline"
              >
                Assess
              </Link>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
