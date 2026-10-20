'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchRepStudents } from '@/lib/school-representative-api';
import { AttendanceStatusPill } from '@/components/school-representative/attendance-status-pill';
import { RepDataTable } from '@/components/school-representative/rep-data-table';
import { RepFilterBar } from '@/components/school-representative/rep-filter-bar';
import { StatCard } from '@/components/school-representative/stat-card';
import { useRepContext } from '@/components/school-representative/rep-context';

type StudentRow = Awaited<ReturnType<typeof fetchRepStudents>>[number];

export default function RepStudentsPage() {
  const { schoolScope } = useRepContext();
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(
        await fetchRepStudents({
          organizationId: schoolScope === 'all' ? undefined : schoolScope,
          search: search.trim() || undefined,
          className: classFilter || undefined,
          status: statusFilter || undefined,
        })
      );
    } finally {
      setLoading(false);
    }
  }, [schoolScope, search, classFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const present = rows.filter((r) => r.attendanceToday === 'present').length;
    const late = rows.filter((r) => r.attendanceToday === 'late').length;
    const absent = rows.filter((r) => r.attendanceToday === 'absent').length;
    const avg =
      rows.length > 0
        ? Math.round(rows.reduce((a, r) => a + r.attendanceRate, 0) / rows.length)
        : 0;
    return { present, late, absent, avg, total: rows.length };
  }, [rows]);

  return (
    <div className="space-y-6">
      <RepFilterBar
        showAcademic={false}
        onRefresh={load}
        refreshing={loading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Name, ID, class, school…"
        extraFilters={
          <>
            <div className="w-full min-w-[100px] sm:w-auto">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Class</label>
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="input w-full">
                <option value="">All classes</option>
                {['N1', 'N2', 'N3', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="w-full min-w-[120px] sm:w-auto">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Today</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-full">
                <option value="">All statuses</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>
            </div>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Students listed" value={stats.total} accent />
        <StatCard label="Present today" value={stats.present} />
        <StatCard label="Late today" value={stats.late} />
        <StatCard label="Absent today" value={stats.absent} />
        <StatCard label="Avg attendance" value={`${stats.avg}%`} />
      </div>

      <RepDataTable
        rows={rows}
        getRowKey={(r) => r.id}
        emptyMessage={loading ? 'Loading students…' : 'No students match your filters.'}
        columns={[
          { key: 'name', header: 'Student', render: (r) => <span className="font-semibold">{r.fullName}</span> },
          { key: 'code', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.studentCode}</span> },
          { key: 'class', header: 'Class', render: (r) => r.className },
          { key: 'school', header: 'School', render: (r) => r.schoolName },
          { key: 'today', header: 'Today', render: (r) => <AttendanceStatusPill status={r.attendanceToday} /> },
          { key: 'rate', header: 'Rate', render: (r) => `${r.attendanceRate}%` },
        ]}
      />
    </div>
  );
}
