'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchRepStaff } from '@/lib/school-representative-api';
import { AttendanceStatusPill } from '@/components/school-representative/attendance-status-pill';
import { RepDataTable } from '@/components/school-representative/rep-data-table';
import { RepFilterBar } from '@/components/school-representative/rep-filter-bar';
import { StatCard } from '@/components/school-representative/stat-card';
import { useRepContext } from '@/components/school-representative/rep-context';

type StaffRow = Awaited<ReturnType<typeof fetchRepStaff>>[number];

const DEPARTMENTS = ['Administration', 'Teaching', 'Finance', 'Support', 'Security'];

export default function RepStaffPage() {
  const { schoolScope } = useRepContext();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(
        await fetchRepStaff({
          organizationId: schoolScope === 'all' ? undefined : schoolScope,
          search: search.trim() || undefined,
          department: department || undefined,
          status: statusFilter || undefined,
        })
      );
    } finally {
      setLoading(false);
    }
  }, [schoolScope, search, department, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const present = rows.filter((r) => r.attendanceToday === 'present').length;
    const absent = rows.filter((r) => r.attendanceToday === 'absent').length;
    const avg =
      rows.length > 0
        ? Math.round(rows.reduce((a, r) => a + r.attendanceRate, 0) / rows.length)
        : 0;
    return { present, absent, avg, total: rows.length, departments: new Set(rows.map((r) => r.department)).size };
  }, [rows]);

  return (
    <div className="space-y-6">
      <RepFilterBar
        showAcademic={false}
        onRefresh={load}
        refreshing={loading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Name, ID, role, department…"
        extraFilters={
          <>
            <div className="w-full min-w-[140px] sm:w-auto">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Department</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="input w-full">
                <option value="">All departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="w-full min-w-[120px] sm:w-auto">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Today</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-full">
                <option value="">All</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
            </div>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Staff listed" value={stats.total} accent />
        <StatCard label="Departments" value={stats.departments} />
        <StatCard label="Present today" value={stats.present} />
        <StatCard label="Absent today" value={stats.absent} />
        <StatCard label="Avg attendance" value={`${stats.avg}%`} />
      </div>

      <RepDataTable
        rows={rows}
        getRowKey={(r) => r.id}
        emptyMessage={loading ? 'Loading staff…' : 'No staff match your filters.'}
        columns={[
          { key: 'name', header: 'Name', render: (r) => <span className="font-semibold">{r.fullName}</span> },
          { key: 'code', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.employeeCode}</span> },
          { key: 'role', header: 'Role', render: (r) => r.role },
          { key: 'dept', header: 'Department', render: (r) => r.department },
          { key: 'school', header: 'School', render: (r) => r.schoolName },
          { key: 'today', header: 'Today', render: (r) => <AttendanceStatusPill status={r.attendanceToday} /> },
          { key: 'rate', header: 'Rate', render: (r) => `${r.attendanceRate}%` },
        ]}
      />
    </div>
  );
}
