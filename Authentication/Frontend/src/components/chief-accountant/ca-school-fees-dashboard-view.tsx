'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Printer } from 'lucide-react';
import {
  fetchCaSchoolFeesDashboard,
  fetchCaSchoolFeesFilterOptions,
} from '@/lib/chief-accountant-api';
import { formatRwf } from '@/lib/rep-finance-utils';
import { RepFeesExportMenu } from '@/components/school-representative/rep-fees-export-menu';
import { StatCard } from '@/components/school-representative/stat-card';
import { CaFilterBar } from '@/components/chief-accountant/ca-filter-bar';
import { CaSchoolFeesPageHeader } from '@/components/chief-accountant/ca-school-fees-page-header';
import { useCaContext } from '@/components/chief-accountant/ca-context';

type TrendGranularity = 'day' | 'week' | 'month';

function aggregateTrend(
  points: Array<{ date: string; amount: number }>,
  granularity: TrendGranularity
): Array<{ date: string; amount: number }> {
  if (granularity === 'day' || !points.length) return points;
  const buckets = new Map<string, number>();
  for (const p of points) {
    const d = new Date(p.date);
    if (Number.isNaN(d.getTime())) {
      buckets.set(p.date, (buckets.get(p.date) ?? 0) + p.amount);
      continue;
    }
    let key: string;
    if (granularity === 'week') {
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay());
      key = start.toISOString().slice(0, 10);
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    buckets.set(key, (buckets.get(key) ?? 0) + p.amount);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));
}

export function CaSchoolFeesDashboardView() {
  const { orgScope, academicYear, term, organizations } = useCaContext();
  const [className, setClassName] = useState('');
  const [feeCategory, setFeeCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>('day');
  const [options, setOptions] = useState<Awaited<ReturnType<typeof fetchCaSchoolFeesFilterOptions>> | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchCaSchoolFeesDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (orgScope !== 'all') p.organizationId = orgScope;
    if (academicYear) p.academicYear = academicYear;
    if (term) p.term = term;
    if (className) p.className = className;
    if (feeCategory) p.feeCategory = feeCategory;
    if (dateFrom) p.dateFrom = dateFrom;
    if (dateTo) p.dateTo = dateTo;
    return p;
  }, [orgScope, academicYear, term, className, feeCategory, dateFrom, dateTo]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchCaSchoolFeesDashboard(params));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void fetchCaSchoolFeesFilterOptions(orgScope !== 'all' ? orgScope : undefined).then(setOptions);
  }, [orgScope]);

  useEffect(() => {
    void load();
  }, [load]);

  const filterSummary = [
    orgScope === 'all' ? `All schools (${organizations.length})` : 'Single school',
    academicYear,
    term,
    className || 'All classes',
    feeCategory || 'All categories',
  ].join(' · ');

  const trendData = useMemo(
    () => aggregateTrend(data?.collectionTrend ?? [], trendGranularity),
    [data?.collectionTrend, trendGranularity]
  );

  const exportRows = (data?.bySchool ?? []).map((s) => ({
    School: s.name,
    Expected: s.expected,
    Paid: s.paid,
    Outstanding: s.outstanding,
    'Collection rate %': s.collectionRate,
  }));

  function handlePrint() {
    window.print();
  }

  const extraFilters = (
    <>
      <div className="w-full min-w-[120px] sm:w-auto">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Class</label>
        <select className="input w-full" value={className} onChange={(e) => setClassName(e.target.value)}>
          <option value="">All classes</option>
          {(options?.classes ?? []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="w-full min-w-[140px] sm:w-auto">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Fee category</label>
        <select className="input w-full" value={feeCategory} onChange={(e) => setFeeCategory(e.target.value)}>
          <option value="">All categories</option>
          {(options?.feeCategories ?? []).map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="w-full min-w-[130px] sm:w-auto">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">From</label>
        <input type="date" className="input w-full" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
      </div>
      <div className="w-full min-w-[130px] sm:w-auto">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">To</label>
        <input type="date" className="input w-full" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>
    </>
  );

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="print:hidden">
        <CaSchoolFeesPageHeader
          actions={
            <>
              <RepFeesExportMenu
                title="Chief Accountant · School Fees Dashboard"
                filterSummary={filterSummary}
                summaryRows={[
                  { Metric: 'Expected fees', Amount: data?.summary.expectedFees ?? 0 },
                  { Metric: 'Paid fees', Amount: data?.summary.paidFees ?? 0 },
                  { Metric: 'Outstanding', Amount: data?.summary.outstandingFees ?? 0 },
                  { Metric: 'Overdue', Amount: data?.summary.overdueFees ?? 0 },
                  { Metric: 'Collection rate %', Amount: data?.summary.collectionRate ?? 0 },
                ]}
                tableHeaders={['School', 'Expected', 'Paid', 'Outstanding', 'Collection rate %']}
                tableRows={exportRows}
                fileBaseName="ca-school-fees-dashboard"
              />
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </>
          }
        />
        <div className="mt-6">
          <CaFilterBar onRefresh={load} refreshing={loading} extraFilters={extraFilters} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Expected fees" value={formatRwf(data?.summary.expectedFees)} accent />
        <StatCard label="Paid fees" value={formatRwf(data?.summary.paidFees)} />
        <StatCard label="Outstanding" value={formatRwf(data?.summary.outstandingFees)} />
        <StatCard label="Overdue" value={formatRwf(data?.summary.overdueFees)} />
        <StatCard
          label="Collection rate"
          value={data?.summary.collectionRate != null ? `${data.summary.collectionRate}%` : '0%'}
        />
        <StatCard label="Unreconciled" value={formatRwf(data?.summary.unreconciledAmount)} />
      </div>

      {(data?.alerts ?? []).length ? (
        <div className="space-y-2 print:hidden">
          {data!.alerts.map((a) => (
            <div
              key={a.id}
              className={`flex items-start gap-2 rounded-xl border px-4 py-2 text-sm ${
                a.severity === 'critical'
                  ? 'border-red-200 bg-red-50 text-red-950'
                  : a.severity === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-950'
                    : 'border-sky-200 bg-sky-50 text-sky-950'
              }`}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {a.title}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Fee collection trend">
          <div className="mb-2 flex flex-wrap gap-1 print:hidden">
            {(['day', 'week', 'month'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setTrendGranularity(g)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${
                  trendGranularity === g ? 'bg-primary text-navy' : 'text-muted hover:bg-slate-100'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatRwf(Number(v ?? 0))} />
              <Line type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={2} dot={false} name="Collected" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Fee status distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data?.statusDistribution ?? []} dataKey="count" nameKey="status" innerRadius={55} outerRadius={90}>
                {(data?.statusDistribution ?? []).map((entry) => (
                  <Cell key={entry.status} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {orgScope === 'all' && (data?.bySchool?.length ?? 0) > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <p className="font-semibold text-navy">Collection by school</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f8f9fc] text-left text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Outstanding</th>
                  <th className="px-4 py-3">Collection rate</th>
                </tr>
              </thead>
              <tbody>
                {(data?.bySchool ?? []).map((s) => (
                  <tr key={s.organizationId} className="border-t border-border/60">
                    <td className="px-4 py-3 font-medium text-navy">{s.name}</td>
                    <td className="px-4 py-3 tabular-nums">{formatRwf(s.expected)}</td>
                    <td className="px-4 py-3 tabular-nums text-emerald-700">{formatRwf(s.paid)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatRwf(s.outstanding)}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{s.collectionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <ChartCard title="Collection by class (scope)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data?.bySchool ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatRwf(Number(v ?? 0))} />
              <Legend />
              <Bar dataKey="expected" fill="#94a3b8" name="Expected" radius={[4, 4, 0, 0]} />
              <Bar dataKey="paid" fill="#22c55e" name="Paid" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm print:hidden">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <p className="font-semibold text-navy">Recent payments</p>
          {loading ? <p className="text-xs text-muted">Updating…</p> : null}
        </div>
        <ul className="divide-y divide-border/60">
          {(data?.recentPayments ?? []).length ? (
            data!.recentPayments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm sm:px-5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy">{p.studentName}</p>
                  <p className="text-xs text-muted">
                    {[p.receiptNumber, p.method, new Date(p.paidAt).toLocaleDateString('en-GB')].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-emerald-700">{formatRwf(p.amount)}</span>
              </li>
            ))
          ) : (
            <li className="px-4 py-8 text-center text-sm text-muted">No recent payments.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
      <p className="mb-3 font-semibold text-navy">{title}</p>
      {children}
    </div>
  );
}
