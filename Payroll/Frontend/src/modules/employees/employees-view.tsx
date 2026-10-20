'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, Plus, RefreshCw, Search, Trash2, Upload } from 'lucide-react';
import {
  AvatarInitials,
  PayrollDataTable,
  PillBadge,
  type PayrollTableColumn,
} from '@/components/payroll-data-table';
import { PayrollPageLayout } from '@/components/payroll-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { payrollApi, type PayrollStaff } from '@/services/payroll-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';

export function EmployeesView() {
  const router = useRouter();
  const toast = useToast();
  const [staff, setStaff] = useState<PayrollStaff[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const didSync = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await payrollApi.staffDirectory({
        search: search || undefined,
        status: status || undefined,
        page: String(page),
        limit: String(pageSize),
      });
      setStaff(data.data);
      setStats(data.stats);
      setTotalPages(data.pagination.totalPages ?? 1);
      setTotal(data.pagination.total ?? data.data.length);
    } finally {
      setLoading(false);
    }
  }, [search, status, page, pageSize]);

  const syncFromHr = useCallback(async (silent = false) => {
    setSyncing(true);
    try {
      const { data } = await payrollApi.syncFromHr();
      const result = data.data as { total: number; created: number; updated: number };
      if (!silent && result.total > 0) {
        toast.success(`Synced ${result.total} employee(s) from HR (${result.created} new, ${result.updated} updated).`, 'HR sync');
      }
      await load();
    } catch (err: unknown) {
      if (!silent) {
        toast.error(getApiErrorMessage(err, 'Could not sync employees from HR. Check HR_API_URL and SERVICE_API_KEY.'), 'Sync failed');
      }
    } finally {
      setSyncing(false);
    }
  }, [load, toast]);

  useEffect(() => {
    if (!didSync.current) {
      didSync.current = true;
      void syncFromHr(true);
      return;
    }
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search, syncFromHr]);

  async function handleDelete(id: string, isProtected?: boolean) {
    if (isProtected) {
      toast.warning('Cannot delete protected employee (Organization Administrator or School Manager).', 'Protected');
      return;
    }
    if (!confirm('Soft-delete this employee?')) return;
    try {
      await payrollApi.deleteStaff(id);
      toast.success('Employee was deleted.', 'Deleted');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Delete failed'), 'Delete failed');
    }
  }

  async function handleBulkDelete() {
    if (!selected.size || !confirm(`Delete ${selected.size} selected employees? Protected staff will be skipped.`)) return;
    try {
      const { data } = await payrollApi.bulkDeleteStaff([...selected]);
      if (data.skippedProtected) {
        toast.warning(`${data.skippedProtected} protected employee(s) were skipped.`, 'Bulk delete');
      }
      toast.success(`${data.count} employee(s) deleted.`, 'Bulk delete');
      setSelected(new Set());
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Bulk delete failed'), 'Delete failed');
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectable = staff.filter((e) => !e.isProtected);
  const allSelected = selectable.length > 0 && selectable.every((e) => selected.has(e.id));

  const columns: PayrollTableColumn<PayrollStaff>[] = [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      render: (emp) => (
        <span className="font-mono text-xs text-muted">{emp.employeeNumber}</span>
      ),
    },
    {
      key: 'name',
      header: 'Full Name',
      sortable: true,
      render: (emp) => (
        <div className="flex items-center gap-3">
          <AvatarInitials name={emp.fullName} seed={emp.id} />
          <div>
            <Link href={`/employees/${emp.id}`} className="font-semibold text-navy hover:text-ochre">
              {emp.fullName}
            </Link>
            <p className="text-xs text-muted">{emp.position}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      render: (emp) => (
        <PillBadge tone="blue">{emp.department ?? 'Unassigned'}</PillBadge>
      ),
    },
    {
      key: 'gender',
      header: 'Gender',
      sortable: true,
      render: (emp) => <span className="text-muted">{emp.gender}</span>,
    },
    {
      key: 'dob',
      header: 'Date of Birth',
      sortable: true,
      render: (emp) => (
        <span className="text-muted">
          {emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (emp) => <StatusBadge status={emp.status} />,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (emp) => <span className="text-muted">{emp.phone ?? '—'}</span>,
    },
  ];

  return (
    <PayrollPageLayout
      actions={
        <>
          <button type="button" className="btn-secondary" onClick={() => void syncFromHr()} disabled={syncing}>
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} /> Sync from HR
          </button>
          <button type="button" className="btn-secondary">
            <Download size={16} /> Export
          </button>
          <Link href="/employees/import" className="btn-secondary">
            <Upload size={16} /> Import
          </Link>
          <Link href="/employees/register" className="btn-primary">
            <Plus size={16} /> Add employee
          </Link>
        </>
      }
      kpis={[
        { label: 'Total', value: stats.total ?? 0 },
        { label: 'Active', value: stats.active ?? 0, hint: `${stats.activeRate ?? 0}%` },
        { label: 'Teachers', value: stats.teachers ?? 0, hint: `${stats.teacherRate ?? 0}%` },
        { label: 'On Leave', value: stats.onLeave ?? 0, hint: `${stats.onLeaveRate ?? 0}%` },
      ]}
    >
      <div className="hr-card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              className="input pl-9"
              placeholder="Search name, ID, email, position…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="input w-auto min-w-[140px]"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            {['ACTIVE', 'PROBATION', 'SUSPENDED', 'ON_LEAVE', 'TERMINATED'].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <span className="font-medium text-amber-900">{selected.size} selected</span>
          <button type="button" onClick={() => setSelected(new Set())} className="text-muted hover:text-navy">
            Clear
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            className="ml-auto flex items-center gap-1 font-medium text-red-600 hover:text-red-700"
          >
            <Trash2 size={14} /> Delete selected
          </button>
        </div>
      )}

      <PayrollDataTable
        columns={columns}
        data={staff}
        rowKey={(emp) => emp.id}
        selected={selected}
        onSelectRow={toggleSelect}
        onSelectAll={() => {
          if (allSelected) setSelected(new Set());
          else setSelected(new Set(selectable.map((e) => e.id)));
        }}
        allSelected={allSelected}
        isRowDisabled={(emp) => Boolean(emp.isProtected)}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        loading={loading}
        emptyMessage="No employees found"
        emptyAction={<Link href="/employees/register" className="btn-primary">Register first employee</Link>}
        onView={(emp) => router.push(`/employees/${emp.id}`)}
        onEdit={(emp) => router.push(`/employees/register?edit=${emp.id}`)}
        onMore={(emp) => handleDelete(emp.id, emp.isProtected)}
      />
    </PayrollPageLayout>
  );
}
