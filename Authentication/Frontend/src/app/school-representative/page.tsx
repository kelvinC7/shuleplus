'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { fetchRepOverview } from '@/lib/school-representative-api';
import { RepFilterBar } from '@/components/school-representative/rep-filter-bar';
import { StatCard } from '@/components/school-representative/stat-card';
import { useRepContext } from '@/components/school-representative/rep-context';

const ATTENDANCE_COLORS = ['#FCB038', '#000435', '#6366f1'];

export default function RepresentativeOverviewPage() {
  const { schoolScope, academicYear, term } = useRepContext();
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof fetchRepOverview>> | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRepOverview({
        organizationId: schoolScope === 'all' ? 'all' : schoolScope,
        academicYear,
        term,
      });
      setOverview(data);
    } finally {
      setLoading(false);
    }
  }, [schoolScope, academicYear, term]);

  useEffect(() => {
    void load();
  }, [load]);

  const performance = overview?.schoolPerformance ?? [];
  const attendancePie = performance.map((p: { name: string; attendanceRate: number }) => ({
    name: p.name.length > 12 ? `${p.name.slice(0, 10)}…` : p.name,
    value: p.attendanceRate,
  }));

  return (
    <div className="space-y-6">
      <RepFilterBar onRefresh={load} refreshing={loading} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Assigned schools"
          value={overview?.summary.assignedSchools ?? '—'}
          hint="Under your oversight"
          accent
        />
        <StatCard
          label="Total students"
          value={overview ? overview.summary.totalStudents.toLocaleString() : '—'}
          hint="Across assigned schools"
        />
        <StatCard
          label="Total staff"
          value={overview ? overview.summary.totalStaff.toLocaleString() : '—'}
          hint="Teaching and non-teaching"
        />
        <StatCard
          label="Average attendance"
          value={overview ? `${overview.summary.averageAttendance}%` : '—'}
          hint={`${term} · ${academicYear}`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-border bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-navy">Academic performance by school</h2>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
              {overview?.summary.openAlerts ?? 0} open alerts
            </span>
          </div>
          {loading ? (
            <p className="py-16 text-center text-sm text-muted">Loading…</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-14} textAnchor="end" height={56} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="academicScore" name="Academic %" fill="#FCB038" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="passRate" name="Pass rate %" fill="#000435" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-navy">Attendance by school</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendancePie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {attendancePie.map((_, i) => (
                    <Cell key={i} fill={ATTENDANCE_COLORS[i % ATTENDANCE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-navy">Financial snapshot</h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {(overview?.financial ?? []).map((row: { organizationId: string; name: string; feesCollected: number; feesOutstanding: number }) => (
            <li
              key={row.organizationId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/80 bg-gradient-to-br from-slate-50 to-white px-4 py-4"
            >
              <span className="font-semibold text-navy">{row.name}</span>
              <div className="text-right text-xs">
                <p className="text-muted">
                  Collected{' '}
                  <span className="font-bold text-emerald-700">
                    RWF {row.feesCollected.toLocaleString()}
                  </span>
                </p>
                <p className="text-amber-800">
                  Outstanding RWF {row.feesOutstanding.toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {overview?.lastUpdated ? (
        <p className="text-xs text-muted">Last updated {new Date(overview.lastUpdated).toLocaleString()}</p>
      ) : null}
    </div>
  );
}
