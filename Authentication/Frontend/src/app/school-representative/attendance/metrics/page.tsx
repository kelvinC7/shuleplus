'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { fetchRepAttendanceMetrics } from '@/lib/school-representative-api';
import { RepDataTable } from '@/components/school-representative/rep-data-table';
import { RepFilterBar } from '@/components/school-representative/rep-filter-bar';
import { StatCard } from '@/components/school-representative/stat-card';
import { useRepContext } from '@/components/school-representative/rep-context';

export default function RepAttendanceMetricsPage() {
  const { schoolScope } = useRepContext();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchRepAttendanceMetrics>> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [personKind, setPersonKind] = useState('all');
  const [department, setDepartment] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await fetchRepAttendanceMetrics({
          organizationId: schoolScope === 'all' ? undefined : schoolScope,
          period,
          personKind: personKind === 'all' ? undefined : personKind,
          department: department || undefined,
        })
      );
    } finally {
      setLoading(false);
    }
  }, [schoolScope, period, personKind, department]);

  useEffect(() => {
    void load();
  }, [load]);

  const mix = data?.attendanceMix ?? [];

  return (
    <div className="space-y-6">
      <RepFilterBar
        showAcademic={false}
        onRefresh={load}
        refreshing={loading}
        extraFilters={
          <>
            <div className="w-full min-w-[120px] sm:w-auto">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Period</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input w-full">
                <option value="week">This week</option>
                <option value="month">This month</option>
              </select>
            </div>
            <div className="w-full min-w-[120px] sm:w-auto">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Focus</label>
              <select value={personKind} onChange={(e) => setPersonKind(e.target.value)} className="input w-full">
                <option value="all">All people</option>
                <option value="student">Students</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div className="w-full min-w-[140px] sm:w-auto">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Department</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="input w-full">
                <option value="">All departments</option>
                {['Administration', 'Teaching', 'Finance', 'Support', 'Security'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Student rate" value={data ? `${data.summary.studentRate}%` : '—'} accent />
        <StatCard label="Staff rate" value={data ? `${data.summary.staffRate}%` : '—'} />
        <StatCard label="Late arrivals" value={data?.summary.lateArrivals ?? '—'} />
        <StatCard label="Total present (period)" value={data?.summary.totalPresent?.toLocaleString() ?? '—'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-border bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="mb-4 font-bold text-navy">Daily presence trend</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.dailyTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf4" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="studentsPresent" name="Students present" stroke="#FCB038" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="staffPresent" name="Staff present" stroke="#000435" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="late" name="Late" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-navy">Attendance mix</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={mix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {mix.map((entry: { fill: string }, i: number) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-navy">Students vs staff by school</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.compareSeries ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf4" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[75, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="students" name="Students %" fill="#FCB038" radius={[6, 6, 0, 0]} />
                <Bar dataKey="staff" name="Staff %" fill="#000435" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-navy">Staff by department</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.byDepartment ?? []} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8ecf4" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="department" width={100} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="present" name="Present %" fill="#22c55e" radius={[0, 6, 6, 0]} />
                <Bar dataKey="late" name="Late %" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <RepDataTable
        rows={data?.bySchool ?? []}
        getRowKey={(r) => r.organizationId}
        emptyMessage="No school attendance data."
        columns={[
          { key: 'school', header: 'School', render: (r) => <span className="font-semibold">{r.name}</span> },
          { key: 'stu', header: 'Students', render: (r) => `${r.studentRate}%` },
          { key: 'stf', header: 'Staff', render: (r) => `${r.staffRate}%` },
          { key: 'late', header: 'Late today', render: (r) => r.lateCount },
        ]}
      />
    </div>
  );
}
