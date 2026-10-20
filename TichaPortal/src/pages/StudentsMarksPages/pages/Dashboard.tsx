import { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  GraduationCap,
  Loader2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';

const NAVY = '#000435';
const AMBER = '#FCB038';
const BAR_COLORS = ['#FCB038', '#000435', '#6366f1', '#10b981', '#f43f5e', '#8b5cf6'];

function initials(name: string) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function StudentRow({
  name,
  meta,
  average,
  tone,
}: {
  name: string;
  meta: string;
  average: number | null;
  tone: 'weak' | 'strong';
}) {
  const pct = average != null ? `${average}%` : '-';
  const isWeak = tone === 'weak';
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100/90 bg-white px-3 py-2.5 shadow-sm transition hover:shadow-md">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          isWeak ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
        }`}
      >
        {initials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#000435]">{name}</p>
        <p className="truncate text-[11px] text-slate-400">{meta}</p>
      </div>
      <span
        className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums ${
          isWeak ? 'bg-red-50 text-red-700 ring-1 ring-red-100' : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'
        }`}
      >
        {pct}
      </span>
    </div>
  );
}

function ClassBarRow({ className, average, maxAverage }: { className: string; average: number; maxAverage: number }) {
  const width = maxAverage > 0 ? Math.max(8, (average / maxAverage) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-[#000435]">{className}</span>
        <span className="font-bold tabular-nums text-[#c87800]">{average}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#000435] to-[#FCB038] transition-all duration-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [params, setParams] = useState<Record<string, string>>({});
  const {
    loading,
    error,
    kpis,
    classPerformance,
    courseClassComparison,
    termTrend,
    weakStudents,
    strongStudents,
    atRiskStudents,
    filters,
    selected,
    insights,
  } = useTeacherMarksAnalytics(params);

  const needsSupport = useMemo(() => {
    const list = (weakStudents?.length ? weakStudents : atRiskStudents) as Array<{
      id?: string;
      name: string;
      class_name?: string;
      average: number | null;
    }>;
    return [...list]
      .filter((s) => s.average != null)
      .sort((a, b) => (a.average ?? 0) - (b.average ?? 0))
      .slice(0, 8);
  }, [weakStudents, atRiskStudents]);

  const topPerformers = useMemo(() => {
    return [...(strongStudents || [])]
      .filter((s) => s.average != null)
      .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))
      .slice(0, 8);
  }, [strongStudents]);

  const comparisonSubject = selected?.subject_name || '';
  const subjectComparison = useMemo(() => {
    if (!courseClassComparison?.length) return null;
    if (comparisonSubject) {
      return courseClassComparison.find((g) => g.subject === comparisonSubject) || null;
    }
    return courseClassComparison.find((g) => g.classes?.length >= 2) || courseClassComparison[0] || null;
  }, [courseClassComparison, comparisonSubject]);

  const multiClassSubjects = useMemo(
    () => (courseClassComparison || []).filter((g) => g.classes?.length >= 2),
    [courseClassComparison],
  );

  if (loading && !filters) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#c87800]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
    );
  }

  const kpiCards = [
    { icon: BookOpen, label: 'Classes', value: kpis.total_classes ?? '-', tone: 'default' },
    { icon: Users, label: 'Students', value: kpis.total_students ?? '-', tone: 'default' },
    {
      icon: TrendingUp,
      label: 'Average',
      value: kpis.average_percent != null ? `${kpis.average_percent}%` : '-',
      tone: 'default',
    },
    {
      icon: Award,
      label: 'Pass rate',
      value: kpis.pass_rate != null ? `${kpis.pass_rate}%` : '-',
      tone: 'default',
    },
    {
      icon: TrendingDown,
      label: 'At risk',
      value: kpis.at_risk_count ?? 0,
      tone: (kpis.at_risk_count ?? 0) > 0 ? 'warn' : 'default',
    },
  ];

  const chartData = subjectComparison?.classes?.map((c) => ({
    name: c.class_name,
    average: c.average,
  })) || [];

  const maxClassAvg = Math.max(...chartData.map((c) => c.average || 0), 1);

  return (
    <div className="space-y-5 pb-10">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-[#000435] via-[#0a1454] to-[#1a237e] p-5 text-white shadow-lg sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Marks hub</p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">Your teaching performance</h2>
            <p className="mt-1 max-w-xl text-sm text-white/65">
              Track class averages, compare the same subject across classes, and spot learners who need support.
            </p>
          </div>
          {selected?.academic_year && (
            <div className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium ring-1 ring-white/15">
              {[selected.academic_year, selected.term].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>

      <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Updating…
        </div>
      )}

      {insights?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {insights.slice(0, 3).map((item, i) => (
            <div
              key={i}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                item.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'
                  : 'bg-amber-50 text-amber-900 ring-1 ring-amber-100'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-70" />
              {item.text}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-2xl border px-4 py-4 shadow-sm ${
              kpi.tone === 'warn'
                ? 'border-amber-200/80 bg-gradient-to-br from-amber-50 to-white'
                : 'border-slate-200/80 bg-white'
            }`}
          >
            <kpi.icon className={`h-4 w-4 ${kpi.tone === 'warn' ? 'text-amber-600' : 'text-[#c87800]'}`} />
            <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-[#000435]">{kpi.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{kpi.label}</p>
          </div>
        ))}
      </div>

      {subjectComparison && chartData.length > 0 && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCB038]/15">
                <GraduationCap className="h-5 w-5 text-[#c87800]" />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#000435]">
                  {subjectComparison.subject} across your classes
                </h3>
                <p className="text-xs text-slate-500">
                  {chartData.length >= 2
                    ? 'Compare average performance where you teach this subject in more than one class.'
                    : 'Average for this subject in the selected view.'}
                </p>
              </div>
            </div>
            {!comparisonSubject && multiClassSubjects.length > 1 && (
              <p className="text-[11px] text-slate-400">Select a subject in filters to focus one course.</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              {subjectComparison.classes.map((c) => (
                <ClassBarRow
                  key={c.class_name}
                  className={c.class_name}
                  average={c.average ?? 0}
                  maxAverage={maxClassAvg}
                />
              ))}
            </div>
            {chartData.length >= 2 && (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, 'Average']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="average" radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="text-sm font-bold text-[#000435]">Term trend</h3>
          <p className="mb-3 text-xs text-slate-400">Average mark performance over time</p>
          {termTrend.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Record marks to see trends</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={termTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="average" stroke={NAVY} strokeWidth={2.5} dot={{ fill: AMBER, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="text-sm font-bold text-[#000435]">All classes overview</h3>
          <p className="mb-3 text-xs text-slate-400">Combined averages (all subjects in each class)</p>
          <div className="max-h-[240px] space-y-3 overflow-y-auto pr-1">
            {classPerformance.slice(0, 10).map((c, i) => (
              <ClassBarRow
                key={c.name}
                className={c.name}
                average={c.average ?? 0}
                maxAverage={Math.max(...classPerformance.map((x) => x.average || 0), 1)}
              />
            ))}
            {!classPerformance.length && (
              <p className="py-8 text-center text-sm text-slate-400">No class averages yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-red-100/80 bg-gradient-to-b from-red-50/60 to-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <h3 className="text-sm font-bold text-[#000435]">Needs support</h3>
            <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
              &lt; 40%
            </span>
          </div>
          <div className="space-y-2">
            {needsSupport.length ? (
              needsSupport.map((s) => (
                <StudentRow
                  key={s.id || `${s.name}-${s.class_name}`}
                  name={s.name || 'Unknown learner'}
                  meta={[s.class_name, s.average != null ? `Avg ${s.average}%` : ''].filter(Boolean).join(' · ')}
                  average={s.average}
                  tone="weak"
                />
              ))
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">No learners below 40% in this view.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-100/80 bg-gradient-to-b from-emerald-50/50 to-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-[#000435]">Top performers</h3>
            <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              ≥ 75%
            </span>
          </div>
          <div className="space-y-2">
            {topPerformers.length ? (
              topPerformers.map((s) => (
                <StudentRow
                  key={s.id || `${s.name}-${s.class_name}`}
                  name={s.name || 'Unknown learner'}
                  meta={[s.class_name, s.average != null ? `Avg ${s.average}%` : ''].filter(Boolean).join(' · ')}
                  average={s.average as number | null}
                  tone="strong"
                />
              ))
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">Top learners appear after marks are recorded.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
