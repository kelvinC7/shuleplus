'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchRepSchoolFeesAnalytics,
  fetchRepSchoolFeesFilterOptions,
} from '@/lib/school-representative-api';
import { formatRwf } from '@/lib/rep-finance-utils';
import { RepFilterBar } from '@/components/school-representative/rep-filter-bar';
import { StatCard } from '@/components/school-representative/stat-card';
import { useRepContext } from '@/components/school-representative/rep-context';

const STATUS_COLORS = {
  Paid: '#22c55e',
  Partial: '#f59e0b',
  Unpaid: '#94a3b8',
  Overdue: '#ef4444',
};

export default function RepFinancialAnalyticsPage() {
  const { schoolScope, academicYear, term } = useRepContext();
  const [className, setClassName] = useState('');
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchRepSchoolFeesAnalytics>> | null>(null);
  const [loading, setLoading] = useState(true);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (schoolScope !== 'all') p.organizationId = schoolScope;
    if (academicYear) p.academicYear = academicYear;
    if (term) p.term = term;
    if (className) p.className = className;
    return p;
  }, [schoolScope, academicYear, term, className]);

  const loadOptions = useCallback(async () => {
    const opts = await fetchRepSchoolFeesFilterOptions(schoolScope !== 'all' ? schoolScope : undefined);
    setClassOptions(opts.classes ?? []);
    if (className && !opts.classes.includes(className)) {
      setClassName('');
    }
  }, [schoolScope, className]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchRepSchoolFeesAnalytics(queryParams));
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusPie = useMemo(() => {
    const s = data?.summary;
    if (!s) return [];
    return [
      { name: 'Paid', value: s.paid, fill: STATUS_COLORS.Paid },
      { name: 'Partial', value: s.partial, fill: STATUS_COLORS.Partial },
      { name: 'Unpaid', value: s.unpaid, fill: STATUS_COLORS.Unpaid },
      { name: 'Overdue', value: s.overdue, fill: STATUS_COLORS.Overdue },
    ].filter((x) => x.value > 0);
  }, [data?.summary]);

  const chartStatus = data?.chartStatusByClass ?? [];
  const chartMoney = data?.chartCollectionByClass ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy">Financial Analytics</h1>
        <p className="text-sm text-muted">
          School fees payment status by class — paid, partial, unpaid, and overdue
        </p>
      </div>

      <RepFilterBar
        onRefresh={load}
        refreshing={loading}
        extraFilters={
          <div className="w-full min-w-[140px] sm:w-auto">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Class</label>
            <select
              className="input w-full"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            >
              <option value="">All classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {data?.integrationNotes?.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          {data.integrationNotes.map((n) => (
            <p key={n.schoolName}>
              <span className="font-semibold">{n.schoolName}:</span> {n.detail}
            </p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students billed" value={data?.summary.students ?? '—'} hint="In selected scope" accent />
        <StatCard
          label="Fully paid"
          value={data?.summary.paid ?? '—'}
          hint="Completed fee obligations"
        />
        <StatCard
          label="Partial / unpaid"
          value={
            data?.summary
              ? (data.summary.partial + data.summary.unpaid + data.summary.overdue).toLocaleString()
              : '—'
          }
          hint="Needs follow-up"
        />
        <StatCard
          label="Collection rate"
          value={data?.summary.collectionRate != null ? `${data.summary.collectionRate}%` : '—'}
          hint={`${formatRwf(data?.summary.collected)} of ${formatRwf(data?.summary.expected)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm lg:col-span-1">
          <p className="mb-1 font-semibold text-navy">Payment mix</p>
          <p className="mb-4 text-xs text-muted">Share of students by status</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPie.length ? statusPie : [{ name: 'No data', value: 1, fill: '#e2e8f0' }]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {(statusPie.length ? statusPie : [{ name: 'No data', value: 1, fill: '#e2e8f0' }]).map(
                    (entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    )
                  )}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <ChartCard title="Students by class & status" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartStatus} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" vertical={false} />
              <XAxis dataKey="className" tick={{ fontSize: 10 }} angle={-28} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Paid" stackId="s" fill={STATUS_COLORS.Paid} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Partial" stackId="s" fill={STATUS_COLORS.Partial} />
              <Bar dataKey="Unpaid" stackId="s" fill={STATUS_COLORS.Unpaid} />
              <Bar dataKey="Overdue" stackId="s" fill={STATUS_COLORS.Overdue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Amount collected vs outstanding by class">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartMoney} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" vertical={false} />
            <XAxis dataKey="className" tick={{ fontSize: 10 }} angle={-28} textAnchor="end" height={70} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(v: number) => formatRwf(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="outstanding" name="Outstanding" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <p className="font-semibold text-navy">Class breakdown</p>
          {loading ? <p className="text-xs text-muted">Updating…</p> : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f8f9fc] text-left text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Students</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Partial</th>
                <th className="px-4 py-3">Unpaid</th>
                <th className="px-4 py-3">Overdue</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {(data?.byClass ?? []).map((row) => (
                <tr key={row.className} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium text-navy">{row.className}</td>
                  <td className="px-4 py-3 tabular-nums">{row.students}</td>
                  <td className="px-4 py-3 tabular-nums text-emerald-700">{row.paid}</td>
                  <td className="px-4 py-3 tabular-nums text-amber-700">{row.partial}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{row.unpaid}</td>
                  <td className="px-4 py-3 tabular-nums text-rose-700">{row.overdue}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold">{row.collectionRate}%</td>
                  <td className="px-4 py-3 tabular-nums">{formatRwf(row.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !(data?.byClass?.length ?? 0) ? (
            <p className="px-4 py-8 text-center text-sm text-muted">No class data for the current filters.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-white p-5 shadow-sm ${className}`}>
      <p className="mb-4 font-semibold text-navy">{title}</p>
      {children}
    </div>
  );
}
