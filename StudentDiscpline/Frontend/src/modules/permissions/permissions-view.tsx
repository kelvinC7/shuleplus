'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Plus, RefreshCw } from 'lucide-react';
import { DisciplinePageLayout } from '@/components/discipline-page-layout';
import { DisciplineDataTable, type DisciplineTableColumn, PillBadge } from '@/components/discipline-data-table';
import { StatusBadge } from '@/components/status-badge';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { PermissionFiltersBar } from '@/modules/permissions/permission-filters-bar';
import { RequestPermissionModal } from '@/modules/permissions/request-permission-modal';
import {
  displayStatus,
  exportPermissionsCsv,
  formatTime12h,
  permissionTypeLabel,
} from '@/modules/permissions/permission-utils';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { PermissionRequest, PermissionStats, SmClass } from '@/types/discipline';
import { toast } from 'sonner';

export function PermissionsView() {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const { academicYear, setAcademicYear, term, setTerm, settings: academicSettings } = useAcademicSettings();

  const [rows, setRows] = useState<PermissionRequest[]>([]);
  const [stats, setStats] = useState<PermissionStats>({
    total: 0,
    pendingApproval: 0,
    approvedToday: 0,
    currentlyOut: 0,
    returned: 0,
    overdue: 0,
  });
  const [classes, setClasses] = useState<SmClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const yearOptions = academicSettings?.academicYears?.length
    ? academicSettings.academicYears
    : [academicYear];
  const termOptions = academicSettings?.terms?.length
    ? academicSettings.terms
    : ['Term 1', 'Term 2', 'Term 3'];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search: search || undefined,
        academicYear,
        term,
        className: classFilter || undefined,
        permissionType: typeFilter || undefined,
        status: statusFilter || undefined,
        dateFilter: dateFilter === 'custom' ? undefined : dateFilter || undefined,
        from: dateFilter === 'custom' && customFrom ? customFrom : undefined,
        to: dateFilter === 'custom' && customTo ? customTo : undefined,
      };
      const [listRes, statsRes] = await Promise.all([
        disciplineApi.permissions(params),
        disciplineApi.permissionStats(),
      ]);
      setRows(listRes.data.data ?? []);
      setStats(statsRes.data.data ?? {
        total: 0,
        pendingApproval: 0,
        approvedToday: 0,
        currentlyOut: 0,
        returned: 0,
        overdue: 0,
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load permissions'));
    } finally {
      setLoading(false);
    }
  }, [search, academicYear, term, classFilter, typeFilter, statusFilter, dateFilter, customFrom, customTo]);

  useEffect(() => {
    void disciplineApi.classes().then((res) => setClasses(res.data.data ?? [])).catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  function clearFilters() {
    setSearch('');
    setClassFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setDateFilter('today');
    setCustomFrom('');
    setCustomTo('');
    setPage(1);
  }

  async function remove(row: PermissionRequest) {
    if (['Out', 'Completed'].includes(row.status)) {
      toast.error('Cannot delete a permission that is in progress or completed');
      return;
    }
    const ok = await confirm({
      title: 'Delete permission request',
      subtitle: row.referenceNumber,
      message: `Cancel and remove permission for ${row.studentName}? This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await disciplineApi.permissionAction(row.id, 'cancel');
      toast.success('Permission deleted');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    }
  }

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);

  const columns: DisciplineTableColumn<PermissionRequest>[] = useMemo(
    () => [
      {
        key: 'student',
        header: 'Student',
        render: (r) => (
          <div>
            <p className="font-semibold text-[#000435]">{r.studentName}</p>
            <p className="text-xs text-slate-400">{r.studentCode ?? r.scanCode ?? r.referenceNumber}</p>
          </div>
        ),
      },
      { key: 'class', header: 'Class', render: (r) => r.className },
      {
        key: 'type',
        header: 'Permission Type',
        render: (r) => <PillBadge tone="blue">{permissionTypeLabel(r)}</PillBadge>,
      },
      { key: 'departure', header: 'Departure', render: (r) => formatTime12h(r.departureTime) },
      { key: 'return', header: 'Expected Return', render: (r) => formatTime12h(r.expectedReturnTime) },
      {
        key: 'requestedBy',
        header: 'Requested By',
        render: (r) => r.requestedByName ?? r.requestedBy,
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => <StatusBadge status={displayStatus(r)} />,
      },
    ],
    []
  );

  return (
    <DisciplinePageLayout
      title="Student Permissions"
      subtitle="Manage student exit requests, approvals, departures and returns."
      actions={
        <>
          <button type="button" className="btn-secondary" onClick={() => exportPermissionsCsv(rows)} disabled={!rows.length}>
            <Download size={16} /> Export
          </button>
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Request Permission
          </button>
        </>
      }
      kpis={[
        { label: 'Total Requests', value: stats.total.toLocaleString(), hint: 'All permission requests for the selected period.' },
        { label: 'Pending Approval', value: stats.pendingApproval, hint: 'Requests waiting for approval.' },
        { label: 'Approved Today', value: stats.approvedToday, hint: 'Permissions approved today.' },
        { label: 'Currently Out', value: stats.currentlyOut, hint: 'Students who have left and not returned.' },
        { label: 'Returned', value: stats.returned, hint: 'Students who have returned.' },
        { label: 'Overdue', value: stats.overdue, hint: 'Expected return time has passed.' },
      ]}
    >
      {dialog}

      <PermissionFiltersBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        academicYear={academicYear}
        onAcademicYearChange={(v) => { setAcademicYear(v); setPage(1); }}
        yearOptions={yearOptions}
        term={term}
        onTermChange={(v) => { setTerm(v); setPage(1); }}
        termOptions={termOptions}
        classFilter={classFilter}
        onClassFilterChange={(v) => { setClassFilter(v); setPage(1); }}
        classes={classes}
        typeFilter={typeFilter}
        onTypeFilterChange={(v) => { setTypeFilter(v); setPage(1); }}
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => { setStatusFilter(v); setPage(1); }}
        dateFilter={dateFilter}
        onDateFilterChange={(v) => { setDateFilter(v); setPage(1); }}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        onClear={clearFilters}
      />

      <DisciplineDataTable
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        loading={loading}
        emptyMessage="No permission requests"
        onView={(r) => router.push(`/permissions/${r.id}`)}
        onEdit={(r) => router.push(`/permissions/${r.id}`)}
        onDelete={(r) => void remove(r)}
      />

      <RequestPermissionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSaved={() => void load()}
      />
    </DisciplinePageLayout>
  );
}
