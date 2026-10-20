'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { fetchRepAcademics } from '@/lib/school-representative-api';
import { RepFilterBar } from '@/components/school-representative/rep-filter-bar';
import { RepDataTable } from '@/components/school-representative/rep-data-table';
import { StatCard } from '@/components/school-representative/stat-card';
import { useRepContext } from '@/components/school-representative/rep-context';

export default function RepAcademicsPage() {
  const { schoolScope } = useRepContext();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchRepAcademics>> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchRepAcademics(schoolScope === 'all' ? undefined : schoolScope));
    } finally {
      setLoading(false);
    }
  }, [schoolScope]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy">Academic oversight</h1>
        <p className="text-sm text-muted">Performance across assigned schools (view-only by default)</p>
      </div>
      <RepFilterBar onRefresh={load} refreshing={loading} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Average marks" value={data?.summary.averageMarks ?? '—'} accent />
        <StatCard label="Pass rate" value={data ? `${data.summary.passRate}%` : '—'} />
        <StatCard label="Exams pending" value={data?.summary.examsPending ?? '—'} />
        <StatCard label="Results published" value={data?.summary.resultsPublished ?? '—'} />
      </div>

      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-navy">Average marks by school</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.chart ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf4" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="average" stroke="#f5b800" strokeWidth={2} name="Average %" />
              <Line type="monotone" dataKey="passRate" stroke="#000435" strokeWidth={2} name="Pass rate %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <RepDataTable
        rows={data?.bySchool ?? []}
        getRowKey={(r) => r.organizationId}
        columns={[
          { key: 'name', header: 'School', render: (r) => r.name },
          { key: 'avg', header: 'Average', render: (r) => `${r.averageMarks}%` },
          { key: 'pass', header: 'Pass rate', render: (r) => `${r.passRate}%` },
          {
            key: 'risk',
            header: 'At-risk students',
            render: (r) => (
              <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
                {r.atRiskStudents}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
