import { useMemo } from 'react';
import { Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import useTpAcademic from '../../../hooks/useTpAcademic';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';

function BandCard({ band }) {
  const pctWidth = band.count ? Math.min(100, band.count * 8) : 4;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{band.label}</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#000435]">{band.count}</p>
          <p className="text-[11px] font-semibold text-slate-500">Grade {band.grade}</p>
        </div>
        <span className="rounded-lg bg-[#FCB038]/15 px-2 py-1 text-xs font-bold text-[#c87800]">{band.grade}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#000435]" style={{ width: `${pctWidth}%` }} />
      </div>
      <p className="mt-2 text-[10px] text-slate-400">students in this band (avg % across recorded assessments)</p>
    </div>
  );
}

function StudentList({ title, icon: Icon, tone, students, emptyText }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`flex items-center gap-2 border-b border-slate-100 px-4 py-3 ${tone}`}>
        <Icon className="h-4 w-4 shrink-0" />
        <h3 className="text-sm font-extrabold text-[#000435]">{title}</h3>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
          {students.length}
        </span>
      </div>
      <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
        {students.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-slate-400">{emptyText}</li>
        ) : (
          students.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#000435]">{s.name}</p>
                <p className="truncate text-[11px] text-slate-500">{s.class_name}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-extrabold tabular-nums text-[#000435]">{s.average ?? '-'}%</p>
                <p className="text-[10px] font-bold uppercase text-slate-400">Grade {s.grade || '-'}</p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default function RecordMarksPerformance() {
  const { term, academicYear, settings } = useTpAcademic();
  const termOptions = settings?.terms || [];
  const academicYearOptions = settings?.academicYears || [];
  const { data, loading, setParams, params } = useTeacherMarksAnalytics({
    academic_year: academicYear,
    term,
  });

  const bands = data?.performance_bands || [];
  const strong = data?.strong_students || [];
  const weak = data?.weak_students || [];

  const classOptions = useMemo(() => data?.filters?.classes || [], [data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-extrabold text-[#000435]">Class performance</h2>
          <p className="mt-1 text-xs text-slate-500">
            Based on published marks for the selected academic year and term (same template rules as report cards).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-[#000435]"
            value={params.academic_year || academicYear}
            onChange={(e) => setParams((p) => ({ ...p, academic_year: e.target.value }))}
          >
            {(academicYearOptions.length ? academicYearOptions : [academicYear]).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-[#000435]"
            value={params.term || term}
            onChange={(e) => setParams((p) => ({ ...p, term: e.target.value }))}
          >
            {(termOptions.length ? termOptions : [term]).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            className="h-10 min-w-[140px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-[#000435]"
            value={params.class_name || ''}
            onChange={(e) => setParams((p) => ({ ...p, class_name: e.target.value || undefined }))}
          >
            <option value="">All classes</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading performance…
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {bands.map((band) => (
              <BandCard key={band.label} band={band} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <StudentList
              title="Performing well (≥75%)"
              icon={TrendingUp}
              tone="text-emerald-700"
              students={strong}
              emptyText="No students at 75% or above yet."
            />
            <StudentList
              title="Need support (&lt;50%)"
              icon={TrendingDown}
              tone="text-amber-700"
              students={weak}
              emptyText="No students below 50%. Great work."
            />
          </div>
        </>
      )}
    </div>
  );
}
