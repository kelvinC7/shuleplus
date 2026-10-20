import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import LessonPlanningLayout from '../../components/lessonPlanning/LessonPlanningLayout';
import { fetchCoursePerformance, fetchLessonPlanningContext } from '../../services/lessonPlanningApi';

export default function CoursePerformancePage() {
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ academicYear: '', term: '' });
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchLessonPlanningContext().then((ctx) => {
      setFilters({ academicYear: ctx.academicYear, term: ctx.term });
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchCoursePerformance(filters);
        if (!cancelled) setData(res);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const s = data?.summary || {};

  return (
    <LessonPlanningLayout
      title="Course performance"
      subtitle="Planning vs teaching coverage by course."
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          className="min-h-[40px] w-full rounded-md border border-slate-200 px-3 py-2 text-sm sm:w-auto"
          value={filters.academicYear}
          onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
          placeholder="Academic year"
        />
        <input
          className="min-h-[40px] w-full rounded-md border border-slate-200 px-3 py-2 text-sm sm:w-auto"
          value={filters.term}
          onChange={(e) => setFilters({ ...filters, term: e.target.value })}
          placeholder="Term"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#000435]" size={32} />
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            {s.uniquePlannedLessons ?? 0} of {s.totalCurriculumLessons ?? 0} lessons planned (
            {s.planningCoveragePercent ?? 0}%) · {s.taughtLessons ?? 0} taught ({s.teachingCoveragePercent ?? 0}%)
          </p>

          <div className="mt-6 space-y-3 md:hidden">
            {(data?.courses || []).map((c) => (
              <article key={`${c.subject}-${c.className}`} className="border-b border-slate-200 py-4 last:border-0">
                <p className="font-bold text-[#000435]">{c.subject}</p>
                <p className="text-xs text-slate-500">{c.className}</p>
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-400">Planning</p>
                    <Bar value={c.planningCoveragePercent} fullWidth />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-400">Teaching</p>
                    <Bar value={c.teachingCoveragePercent} fullWidth />
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-slate-400">Saved plans</dt>
                    <dd className="font-semibold text-[#000435]">{c.savedPlans}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Remaining</dt>
                    <dd className="font-semibold text-[#000435]">{c.remainingLessons}</dd>
                  </div>
                </dl>
              </article>
            ))}
            {!data?.courses?.length ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No course progress yet. Generate lesson plans to see coverage.
              </p>
            ) : null}
          </div>

          <div className="mt-6 hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Course</th>
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-right">Planning %</th>
                  <th className="px-4 py-3 text-right">Teaching %</th>
                  <th className="px-4 py-3 text-right">Saved plans</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.courses || []).map((c) => (
                  <tr key={`${c.subject}-${c.className}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-[#000435]">{c.subject}</td>
                    <td className="px-4 py-3">{c.className}</td>
                    <td className="px-4 py-3 text-right">
                      <Bar value={c.planningCoveragePercent} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Bar value={c.teachingCoveragePercent} />
                    </td>
                    <td className="px-4 py-3 text-right">{c.savedPlans}</td>
                    <td className="px-4 py-3 text-right">{c.remainingLessons}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.courses?.length ? (
              <p className="p-8 text-center text-sm text-slate-500">No course progress yet. Generate lesson plans to see coverage.</p>
            ) : null}
          </div>
        </>
      )}
    </LessonPlanningLayout>
  );
}

function Bar({ value, color = '#334155', fullWidth = false }) {
  const v = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className={`flex items-center gap-2 ${fullWidth ? 'w-full' : 'inline-flex min-w-[100px]'}`}>
      <div className="h-2 flex-1 rounded-full bg-slate-100">
        <div className="h-2 rounded-full" style={{ width: `${v}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold tabular-nums">{v}%</span>
    </div>
  );
}
