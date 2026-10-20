'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  Building2,
  ChevronDown,
  Copy,
  Download,
  GitBranch,
  LayoutGrid,
  List,
  MoreVertical,
  Network,
  Plus,
  Search,
  Trash2,
  Upload,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { DonutChart, GroupedBarChart, NAVY, PRIMARY } from '@/components/charts/hr-charts';
import { HrPageLayout } from '@/components/hr-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { hrApi } from '@/services/hr-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import type { Department, DepartmentStats } from '@/types';
import { DepartmentCreateModal } from './department-create-modal';

type ViewMode = 'table' | 'card' | 'tree';

const PAGE_SIZE = 10;

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusLabel(status: string) {
  if (status === 'INACTIVE') return 'Inactive';
  if (status === 'ARCHIVED') return 'Archived';
  return 'Active';
}

function DepartmentActionsMenu({
  department,
  onView,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onDelete,
}: {
  department: Department;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-[#000435]"
      >
        <MoreVertical size={16} />
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-xl">
            {[
              { label: 'View Department', action: onView },
              { label: 'Edit', action: onEdit },
              { label: 'Manage Employees', action: () => window.location.assign(`/directory?departmentId=${department.id}`) },
              { label: 'View Organization Tree', action: () => onView() },
              { label: 'Change Manager', action: onEdit },
              { label: 'Duplicate', action: onDuplicate },
              {
                label: department.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
                action: onToggleStatus,
              },
              { label: 'Delete', action: onDelete, danger: true },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  item.action();
                  setOpen(false);
                }}
                className={`block w-full px-4 py-2 text-left text-sm transition hover:bg-slate-50 ${
                  item.danger ? 'text-red-600' : 'text-[#000435]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function DepartmentDetailDrawer({
  department,
  onClose,
  onEdit,
}: {
  department: Department | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!department) return null;
  const profile = department.departmentProfile ?? {};

  return (
    <>
      <button type="button" className="fixed inset-0 z-40 bg-[#000435]/30 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-100 bg-white shadow-2xl">
        <div className="border-b border-slate-100 bg-[#000435] px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FCB038]">{department.code || '—'}</p>
              <h2 className="mt-1 text-xl font-bold">{department.name}</h2>
              <div className="mt-2"><StatusBadge status={statusLabel(department.status)} /></div>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-2 py-1 text-xs">Close</button>
          </div>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Description</h3>
            <p className="mt-2 text-sm text-[#000435]">{department.description || 'No description provided.'}</p>
          </section>
          <section className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Department Head', department.headName],
              ['Assistant', department.assistantManager],
              ['Employees', department.employees],
              ['Budget', department.budget ? `${department.budget.toLocaleString()} RWF` : '—'],
              ['Cost Center', department.costCenter],
              ['Branch', department.branch],
              ['Building', String(profile.building ?? '—')],
              ['Floor', String(profile.floor ?? '—')],
              ['Phone', department.phoneNumber],
              ['Email', department.officialEmail],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1 font-semibold text-[#000435]">{value || '—'}</p>
              </div>
            ))}
          </section>
          {department.accessModules && department.accessModules.length > 0 ? (
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Modules</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {department.accessModules.map((mod) => (
                  <span key={mod} className="rounded-full bg-[#FCB038]/15 px-2.5 py-1 text-xs font-semibold text-[#000435]">✓ {mod}</span>
                ))}
              </div>
            </section>
          ) : null}
          {department.tags && department.tags.length > 0 ? (
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tags</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {department.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600">{tag}</span>
                ))}
              </div>
            </section>
          ) : null}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Employees</h3>
            <div className="mt-2 space-y-2">
              {(department.employeePreview ?? []).map((emp) => (
                <div key={emp.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#000435]/5 text-xs font-bold text-[#000435]">
                    {emp.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#000435]">{emp.name}</p>
                    <p className="text-xs text-slate-500">{emp.position}</p>
                  </div>
                </div>
              ))}
              <Link href={`/directory?departmentId=${department.id}`} className="inline-flex text-xs font-semibold text-[#FCB038]">
                View All Employees →
              </Link>
            </div>
          </section>
          <section className="grid grid-cols-2 gap-3 text-xs text-slate-500">
            <div>Created {formatDate(department.createdAt)}</div>
            <div>Updated {formatDate(department.updatedAt)}</div>
          </section>
        </div>
        <div className="border-t border-slate-100 p-4">
          <button type="button" onClick={onEdit} className="btn-primary w-full">Edit Department</button>
        </div>
      </aside>
    </>
  );
}

function DepartmentTree({ departments }: { departments: Department[] }) {
  const roots = departments.filter((d) => !d.parentDepartmentId);
  const childrenOf = (parentId: string) => departments.filter((d) => d.parentDepartmentId === parentId);

  function Node({ dept, depth = 0 }: { dept: Department; depth?: number }) {
    const children = childrenOf(dept.id);
    const [open, setOpen] = useState(true);
    return (
      <div style={{ marginLeft: depth * 20 }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
        >
          {children.length ? <ChevronDown size={14} className={open ? '' : '-rotate-90'} /> : <span className="w-3.5" />}
          <Building2 size={14} className="text-[#FCB038]" />
          <span className="font-semibold text-[#000435]">{dept.name}</span>
          <span className="text-xs text-slate-400">({dept.employees})</span>
        </button>
        {open ? children.map((child) => <Node key={child.id} dept={child} depth={depth + 1} />) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      {roots.length ? roots.map((d) => <Node key={d.id} dept={d} />) : (
        <p className="py-8 text-center text-sm text-slate-400">No hierarchy defined yet.</p>
      )}
    </div>
  );
}

export function DepartmentsView() {
  const toast = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<DepartmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [branch, setBranch] = useState('ALL');
  const [departmentType, setDepartmentType] = useState('ALL');
  const [manager, setManager] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drawerDept, setDrawerDept] = useState<Department | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        hrApi.departments({
          search: search || undefined,
          status: status !== 'ALL' ? status : undefined,
          branch: branch !== 'ALL' ? branch : undefined,
          departmentType: departmentType !== 'ALL' ? departmentType : undefined,
          manager: manager !== 'ALL' ? manager : undefined,
          sortBy,
        }),
        hrApi.departmentStats(),
      ]);
      setDepartments(listRes.data.data);
      setStats(statsRes.data.data);
    } finally {
      setLoading(false);
    }
  }, [search, status, branch, departmentType, manager, sortBy]);

  useEffect(() => {
    load();
  }, [load]);

  const branches = useMemo(
    () => ['ALL', ...Array.from(new Set(departments.map((d) => d.branch).filter(Boolean) as string[]))],
    [departments]
  );
  const types = useMemo(
    () => ['ALL', ...Array.from(new Set(departments.map((d) => d.departmentType).filter(Boolean) as string[]))],
    [departments]
  );
  const managers = useMemo(
    () => ['ALL', ...Array.from(new Set(departments.map((d) => d.headName).filter(Boolean) as string[]))],
    [departments]
  );

  const totalPages = Math.max(1, Math.ceil(departments.length / PAGE_SIZE));
  const paged = departments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const chartBars = departments.slice(0, 8).map((d) => ({
    label: (d.code || d.name).slice(0, 4),
    budget: d.maxEmployees ?? d.employees + 5,
    actual: d.employees,
  }));
  const donutSegments = departments.slice(0, 6).map((d, i) => ({
    label: d.name,
    value: d.employees,
    color: [NAVY, PRIMARY, '#a78bfa', '#14b8a6', '#f97316', '#64748b'][i % 6],
  }));

  function openCreate() {
    setEditId(undefined);
    setModalOpen(true);
  }

  function openEdit(id: string) {
    setEditId(id);
    setModalOpen(true);
  }

  async function removeDepartment(id: string) {
    if (!confirm('Delete this department?')) return;
    try {
      await hrApi.deleteDepartment(id);
      toast.success('Department was deleted.', 'Deleted');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Delete failed'), 'Delete failed');
    }
  }

  async function duplicateDepartment(id: string) {
    try {
      await hrApi.duplicateDepartment(id);
      toast.success('Department duplicated successfully.', 'Duplicated');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Duplicate failed'), 'Duplicate failed');
    }
  }

  async function toggleStatus(department: Department) {
    const next = department.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await hrApi.bulkDepartmentStatus([department.id], next);
      toast.success(`Department marked as ${next.toLowerCase()}.`, 'Status updated');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Status update failed'), 'Update failed');
    }
  }

  async function bulkStatus(next: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED') {
    if (!selectedIds.length) return;
    try {
      await hrApi.bulkDepartmentStatus(selectedIds, next);
      toast.success(`${selectedIds.length} department(s) updated to ${next.toLowerCase()}.`, 'Bulk update');
      setSelectedIds([]);
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Bulk update failed'), 'Update failed');
    }
  }

  function exportCsv() {
    const header = ['Name', 'Code', 'Manager', 'Parent', 'Employees', 'Branch', 'Status', 'Created'];
    const rows = departments.map((d) => [
      d.name,
      d.code ?? '',
      d.headName ?? '',
      d.parentDepartment ?? '',
      d.employees,
      d.branch ?? '',
      statusLabel(d.status),
      formatDate(d.createdAt),
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'departments.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <HrPageLayout>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-[#000435]">
              <Building2 className="text-[#FCB038]" size={24} /> Departments
            </h1>
            <p className="mt-1 text-sm text-slate-500">Manage organizational departments, structures, and managers.</p>
          </div>
          <button type="button" onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Create Department
          </button>
        </div>

        <StatsGrid columns={3}>
          <StatCard label="Total Departments" value={stats?.totalDepartments ?? '—'} icon={<Building2 size={20} />} showTrend={false} />
          <StatCard label="Active Departments" value={stats?.activeDepartments ?? '—'} icon={<UserCheck size={20} />} showTrend={false} />
          <StatCard label="Inactive" value={stats?.inactiveDepartments ?? '—'} icon={<UserX size={20} />} showTrend={false} />
          <StatCard label="Total Employees" value={stats?.totalEmployees ?? '—'} icon={<Users size={20} />} showTrend={false} />
          <StatCard label="Department Heads Assigned" value={stats?.headsAssigned ?? '—'} icon={<UserCheck size={20} />} showTrend={false} />
          <StatCard label="Open Positions" value={stats?.openPositions ?? '—'} icon={<GitBranch size={20} />} showTrend={false} />
        </StatsGrid>

        <div className="hr-card space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openCreate} className="btn-secondary text-xs"><Plus size={14} /> Create Department</button>
            <button type="button" className="btn-secondary text-xs"><Upload size={14} /> Import</button>
            <button type="button" onClick={exportCsv} className="btn-secondary text-xs"><Download size={14} /> Export</button>
            <button type="button" onClick={() => setView('tree')} className="btn-secondary text-xs"><Network size={14} /> Organization Chart</button>
            <button type="button" disabled={!selectedIds.length} onClick={() => bulkStatus('ACTIVE')} className="btn-secondary text-xs disabled:opacity-40">Bulk Activate</button>
            <button type="button" disabled={!selectedIds.length} onClick={() => bulkStatus('INACTIVE')} className="btn-secondary text-xs disabled:opacity-40">Bulk Deactivate</button>
            <button type="button" disabled={!selectedIds.length} onClick={() => bulkStatus('ARCHIVED')} className="btn-secondary text-xs disabled:opacity-40"><Archive size={14} /> Archive</button>
          </div>

          <div className="grid gap-3 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Search departments…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">Status: All</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <select className="input" value={branch} onChange={(e) => setBranch(e.target.value)}>
              {branches.map((b) => <option key={b} value={b}>{b === 'ALL' ? 'Branch: All' : b}</option>)}
            </select>
            <select className="input" value={departmentType} onChange={(e) => setDepartmentType(e.target.value)}>
              {types.map((t) => <option key={t} value={t}>{t === 'ALL' ? 'Type: All' : t}</option>)}
            </select>
            <select className="input" value={manager} onChange={(e) => setManager(e.target.value)}>
              {managers.map((m) => <option key={m} value={m}>{m === 'ALL' ? 'Manager: All' : m}</option>)}
            </select>
            <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name">Sort: Department Name</option>
              <option value="createdAt">Sort: Created Date</option>
              <option value="employees">Sort: Employee Count</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => { setSearch(''); setStatus('ALL'); setBranch('ALL'); setDepartmentType('ALL'); setManager('ALL'); setSortBy('name'); }}
            className="text-xs font-semibold text-[#FCB038]"
          >
            Reset Filters
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {([
                ['table', List, 'Table View'],
                ['card', LayoutGrid, 'Card View'],
                ['tree', Network, 'Organization Tree'],
              ] as const).map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    view === mode ? 'bg-white text-[#000435] shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, departments.length)} of {departments.length} departments
            </p>
          </div>
        </div>

        {loading ? (
          <div className="hr-card p-10 text-center text-sm text-slate-400">Loading departments…</div>
        ) : departments.length === 0 ? (
          <div className="hr-card flex flex-col items-center px-6 py-16 text-center">
            <Building2 size={40} className="text-[#FCB038]" />
            <h3 className="mt-4 text-lg font-bold text-[#000435]">No departments found</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Departments help organize employees, budgets and reporting structures.
            </p>
            <button type="button" onClick={openCreate} className="btn-primary mt-6"><Plus size={16} /> Create First Department</button>
          </div>
        ) : view === 'table' ? (
          <div className="hr-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3"><input type="checkbox" checked={selectedIds.length === paged.length && paged.length > 0} onChange={(e) => setSelectedIds(e.target.checked ? paged.map((d) => d.id) : [])} /></th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Manager</th>
                    <th className="px-4 py-3">Parent</th>
                    <th className="px-4 py-3">Employees</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((d) => (
                    <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(d.id)}
                          onChange={(e) => setSelectedIds((ids) => e.target.checked ? [...ids, d.id] : ids.filter((id) => id !== d.id))}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => setDrawerDept(d)} className="font-semibold text-[#000435] hover:text-[#FCB038]">{d.name}</button>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{d.code || '—'}</td>
                      <td className="px-4 py-3">{d.headName || '—'}</td>
                      <td className="px-4 py-3">{d.parentDepartment || '—'}</td>
                      <td className="px-4 py-3">{d.employees}{d.maxEmployees ? ` / ${d.maxEmployees}` : ''}</td>
                      <td className="px-4 py-3">{d.branch || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={statusLabel(d.status)} /></td>
                      <td className="px-4 py-3">{new Date(d.createdAt).getFullYear()}</td>
                      <td className="px-4 py-3">
                        <DepartmentActionsMenu
                          department={d}
                          onView={() => setDrawerDept(d)}
                          onEdit={() => openEdit(d.id)}
                          onDuplicate={() => duplicateDepartment(d.id)}
                          onToggleStatus={() => toggleStatus(d)}
                          onDelete={() => removeDepartment(d.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : view === 'card' ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paged.map((d) => (
              <div key={d.id} className="hr-card p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#000435]/5 text-[#FCB038]">
                    <Building2 size={22} />
                  </div>
                  <StatusBadge status={statusLabel(d.status)} />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#000435]">{d.name}</h3>
                <p className="text-xs font-mono uppercase tracking-wider text-[#FCB038]">{d.code || '—'}</p>
                <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                  <p>👤 {d.headName || 'No manager'}</p>
                  <p>👥 {d.employees} Employees{d.maxEmployees ? ` / ${d.maxEmployees}` : ''}</p>
                  <p>📍 {d.branch || 'Headquarters'}</p>
                  {d.officialEmail ? <p>📧 {d.officialEmail}</p> : null}
                  {d.phoneNumber ? <p>📞 {d.phoneNumber}</p> : null}
                </div>
                {d.capacityPercent != null ? (
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase text-slate-400">
                      <span>Capacity</span><span>{d.capacityPercent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-[#FCB038]" style={{ width: `${d.capacityPercent}%` }} />
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {(d.tags ?? []).slice(0, 2).map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{tag}</span>
                  ))}
                </div>
                <div className="mt-5 flex gap-2">
                  <button type="button" onClick={() => setDrawerDept(d)} className="btn-secondary flex-1 text-xs">View</button>
                  <button type="button" onClick={() => openEdit(d.id)} className="btn-secondary flex-1 text-xs">Edit</button>
                  <Link href={`/directory?departmentId=${d.id}`} className="btn-primary flex-1 text-center text-xs">Employees</Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <DepartmentTree departments={departments} />
        )}

        {departments.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="hr-card p-5">
              <h3 className="mb-4 text-sm font-bold text-[#000435]">Employees per Department</h3>
              <GroupedBarChart groups={chartBars} />
            </div>
            <div className="hr-card p-5">
              <h3 className="mb-4 text-sm font-bold text-[#000435]">Department Distribution</h3>
              <DonutChart
                segments={donutSegments.length ? donutSegments : [{ label: 'None', value: 1, color: '#e2e8f0' }]}
                centerLabel={String(donutSegments.reduce((sum, d) => sum + d.value, 0))}
              />
            </div>
          </div>
        ) : null}

        {totalPages > 1 ? (
          <div className="flex items-center justify-center gap-2">
            <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary text-xs disabled:opacity-40">◀ Previous</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((n) => (
              <button key={n} type="button" onClick={() => setPage(n)} className={`h-9 w-9 rounded-lg text-xs font-bold ${page === n ? 'bg-[#000435] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{n}</button>
            ))}
            <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary text-xs disabled:opacity-40">Next ▶</button>
          </div>
        ) : null}
      </HrPageLayout>

      <DepartmentCreateModal
        open={modalOpen}
        departmentId={editId}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          load();
        }}
      />
      <DepartmentDetailDrawer
        department={drawerDept}
        onClose={() => setDrawerDept(null)}
        onEdit={() => {
          if (!drawerDept) return;
          setDrawerDept(null);
          openEdit(drawerDept.id);
        }}
      />
    </>
  );
}
