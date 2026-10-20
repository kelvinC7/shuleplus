'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  fetchRepSchoolFeesFilterOptions,
  fetchRepSchoolFeesOverview,
} from '@/lib/school-representative-api';
import { formatRwf, healthBadge } from '@/lib/rep-finance-utils';
import { RepFeesExportMenu } from '@/components/school-representative/rep-fees-export-menu';
import { RepFeesFilters, type FeesFilterState } from '@/components/school-representative/rep-fees-filters';
import { StatCard } from '@/components/school-representative/stat-card';
import { useRepContext } from '@/components/school-representative/rep-context';

const DEFAULT_FILTERS: FeesFilterState = {
  organizationId: 'all',
  academicYear: '',
  term: '',
  className: '',
  paymentStatus: '',
  feeCategory: '',
  paymentMethod: '',
  dateFrom: '',
  dateTo: '',
  search: '',
};

export default function RepSchoolFeesPage() {
  const { schools, academicYear, term, schoolScope, setSchoolScope } = useRepContext();
  const [filters, setFilters] = useState<FeesFilterState>({
    ...DEFAULT_FILTERS,
    organizationId: schoolScope,
    academicYear,
    term,
  });
  const [options, setOptions] = useState<Awaited<ReturnType<typeof fetchRepSchoolFeesFilterOptions>> | null>(
    null
  );
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchRepSchoolFeesOverview>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricFocus, setMetricFocus] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (filters.organizationId !== 'all') p.organizationId = filters.organizationId;
    if (filters.academicYear) p.academicYear = filters.academicYear;
    if (filters.term) p.term = filters.term;
    if (filters.className) p.className = filters.className;
    if (filters.paymentStatus) p.paymentStatus = filters.paymentStatus;
    if (filters.feeCategory) p.feeCategory = filters.feeCategory;
    if (filters.paymentMethod) p.paymentMethod = filters.paymentMethod;
    if (filters.dateFrom) p.dateFrom = filters.dateFrom;
    if (filters.dateTo) p.dateTo = filters.dateTo;
    if (filters.search) p.search = filters.search;
    return p;
  }, [filters]);

  const loadOptions = useCallback(async () => {
    setOptions(
      await fetchRepSchoolFeesFilterOptions(
        filters.organizationId !== 'all' ? filters.organizationId : undefined
      )
    );
  }, [filters.organizationId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchRepSchoolFeesOverview(queryParams));
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

  useEffect(() => {
    if (academicYear && term) {
      setFilters((f) => ({ ...f, academicYear, term }));
    }
  }, [academicYear, term]);

  useEffect(() => {
    setSchoolScope(filters.organizationId === 'all' ? 'all' : filters.organizationId);
  }, [filters.organizationId, setSchoolScope]);

  const filterSummary = [
    filters.organizationId === 'all' ? 'All assigned schools' : 'Single school',
    filters.academicYear || 'All years',
    filters.term || 'All terms',
  ].join(' · ');

  const exportTable = (data?.bySchool ?? []).map((s: {
    name: string;
    expected: number;
    collected: number;
    outstanding: number;
    rate: number;
  }) => ({
    School: s.name,
    Expected: s.expected,
    Collected: s.collected,
    Outstanding: s.outstanding,
    'Rate %': s.rate,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <RepFeesExportMenu
          title="School Fees Summary"
          filterSummary={filterSummary}
          summaryRows={[
            { Metric: 'Expected', Amount: data?.summary.totalExpected ?? 0 },
            { Metric: 'Collected', Amount: data?.summary.totalCollected ?? 0 },
            { Metric: 'Outstanding', Amount: data?.summary.outstanding ?? 0 },
            { Metric: 'Collection rate %', Amount: data?.summary.collectionRate ?? 0 },
          ]}
          tableHeaders={['School', 'Expected', 'Collected', 'Outstanding', 'Rate %']}
          tableRows={exportTable}
          fileBaseName="school-fees-summary"
        />
      </div>

      <RepFeesFilters
        schools={schools}
        filters={filters}
        onChange={setFilters}
        options={options}
        onReset={() => setFilters({ ...DEFAULT_FILTERS, organizationId: schoolScope, academicYear, term })}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button type="button" onClick={() => setMetricFocus('expected')} className="text-left">
          <StatCard
            label="Total expected"
            value={formatRwf(data?.summary.totalExpected)}
            hint="Fee obligations"
            accent={metricFocus === 'expected'}
          />
        </button>
        <button type="button" onClick={() => setMetricFocus('collected')} className="text-left">
          <StatCard
            label="Collected"
            value={formatRwf(data?.summary.totalCollected)}
            hint="Confirmed payments"
            accent={metricFocus === 'collected'}
          />
        </button>
        <button type="button" onClick={() => setMetricFocus('outstanding')} className="text-left">
          <StatCard
            label="Outstanding"
            value={formatRwf(data?.summary.outstanding)}
            hint="Remaining balance"
            accent={metricFocus === 'outstanding'}
          />
        </button>
        <button type="button" onClick={() => setMetricFocus('rate')} className="text-left">
          <StatCard
            label="Collection rate"
            value={data?.summary.collectionRate != null ? `${data.summary.collectionRate}%` : '—%'}
            hint="Collected / expected"
            accent={metricFocus === 'rate'}
          />
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-semibold text-navy">Collection progress</p>
          <span className="text-sm font-semibold text-primary">{data?.collectionProgress ?? 0}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all"
            style={{ width: `${Math.min(100, data?.collectionProgress ?? 0)}%` }}
          />
        </div>
      </div>

      {data?.integrationNotes?.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          {data.integrationNotes.map((n: { schoolName: string; detail: string }) => (
            <p key={n.schoolName}>
              <span className="font-semibold">{n.schoolName}:</span> {n.detail}
            </p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Collection by school">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.bySchool ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatRwf(v)} />
              <Legend />
              <Bar dataKey="expected" fill="#94a3b8" name="Expected" radius={[4, 4, 0, 0]} />
              <Bar dataKey="collected" fill="#22c55e" name="Collected" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outstanding" fill="#f59e0b" name="Outstanding" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Payment status">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data?.statusDistribution ?? []} dataKey="count" nameKey="status" innerRadius={55} outerRadius={90}>
                {(data?.statusDistribution ?? []).map((entry: { status: string }, i: number) => (
                  <Cell key={entry.status} fill={['#22c55e', '#f59e0b', '#64748b', '#ef4444'][i % 4]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Collection trend">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data?.collectionTrend ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatRwf(v)} />
            <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <p className="font-semibold text-navy">School collection summary</p>
          {loading ? <p className="text-xs text-muted">Loading…</p> : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f8f9fc] text-left text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Expected</th>
                <th className="px-4 py-3">Collected</th>
                <th className="px-4 py-3">Outstanding</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.bySchool ?? []).map((row: {
                organizationId: string;
                name: string;
                expected: number;
                collected: number;
                outstanding: number;
                rate: number;
                health: string;
                studentsWithOutstanding: number;
              }) => {
                const badge = healthBadge(row.health);
                return (
                  <tr key={row.organizationId} className="border-t border-border/70">
                    <td className="px-4 py-3 font-medium text-navy">{row.name}</td>
                    <td className="px-4 py-3">{formatRwf(row.expected)}</td>
                    <td className="px-4 py-3">{formatRwf(row.collected)}</td>
                    <td className="px-4 py-3">{formatRwf(row.outstanding)}</td>
                    <td className="px-4 py-3">{row.rate}%</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                      <p className="mt-1 text-[11px] text-muted">{row.studentsWithOutstanding} with balance</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
      <p className="mb-3 font-semibold text-navy">{title}</p>
      {children}
    </div>
  );
}
