'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, Plus, Search, Trash2, Upload } from 'lucide-react';
import {
  AvatarInitials,
  HrDataTable,
  PillBadge,
  type HrTableColumn,
} from '@/components/hr-data-table';
import { HrPageLayout } from '@/components/hr-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { hrApi } from '@/services/hr-api';
import { formatStaffCodeDisplay } from '@/lib/format-staff-code';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import type { Employee } from '@/types';

export function DirectoryView() {
  const router = useRouter();
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await hrApi.directory({
        search: search || undefined,
        status: status || undefined,
        page: String(page),
        limit: String(pageSize),
      });
      setEmployees(data.data);
      setStats(data.stats);
      setTotalPages(data.pagination.totalPages ?? 1);
      setTotal(data.pagination.total ?? data.data.length);
      if (data.stats.total === 0) {
        await hrApi.seedSamples();
        const retry = await hrApi.directory({
          search: search || undefined,
          status: status || undefined,
          page: String(page),
          limit: String(pageSize),
        });
        setEmployees(retry.data.data);
        setStats(retry.data.stats);
        setTotalPages(retry.data.pagination.totalPages ?? 1);
        setTotal(retry.data.pagination.total ?? retry.data.data.length);
      }
    } finally {
      setLoading(false);
    }
  }, [search, status, page, pageSize]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function handleDelete(id: string, isProtected?: boolean) {
    if (isProtected) {
      toast.warning('Cannot delete protected employee (Organization Administrator or School Manager).', 'Protected');
      return;
    }
    if (!confirm('Soft-delete this employee?')) return;
    try {
      await hrApi.deleteEmployee(id);
      toast.success('Employee was deleted.', 'Deleted');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Delete failed'), 'Delete failed');
    }
  }

  async function handleBulkDelete() {
    if (!selected.size || !confirm(`Delete ${selected.size} selected employees? Protected staff will be skipped.`)) return;
    try {
      const { data } = await hrApi.bulkDeleteEmployees([...selected]);
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

  const selectable = employees.filter((e) => !e.isProtected);
  const allSelected = selectable.length > 0 && selectable.every((e) => selected.has(e.id));

  const columns: HrTableColumn<Employee>[] = [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      render: (emp) => (
        <span className="font-mono text-xs text-muted">{formatStaffCodeDisplay(emp.employeeNumber)}</span>
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
            <Link href={`/directory/${emp.id}`} className="font-semibold text-navy hover:text-ochre">
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
          {new Date(emp.dateOfBirth).toLocaleDateString()}
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
      render: (emp) => <span className="text-muted">{emp.phone}</span>,
    },
  ];

  return (
    <HrPageLayout
      actions={
        <>
          <button type="button" className="btn-secondary">
            <Download size={16} /> Export
          </button>
          <Link href="/registration" className="btn-secondary">
            <Upload size={16} /> Import
          </Link>
          <Link href="/registration" className="btn-primary">
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

      <HrDataTable
        columns={columns}
        data={employees}
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
        emptyAction={<Link href="/registration" className="btn-primary">Register first employee</Link>}
        onView={(emp) => router.push(`/directory/${emp.id}`)}
        onEdit={(emp) => router.push(`/directory/${emp.id}/edit`)}
        onMore={(emp) => handleDelete(emp.id, emp.isProtected)}
      />
    </HrPageLayout>
  );
}
