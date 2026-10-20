'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  KeyRound,
  MoreVertical,
  Network,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
  UserX,
  Scale,
  X,
} from 'lucide-react';
import { AddUserWizard } from '@/components/organization-admin/add-user-wizard';
import { EditUserModal } from '@/components/organization-admin/edit-user-modal';
import { ManageDepartmentsModal } from '@/components/organization-admin/manage-departments-modal';
import { ManageUserModulesSheet } from '@/components/organization-admin/manage-user-modules-sheet';
import { ResetPasswordDialog } from '@/components/organization-admin/reset-password-dialog';
import {
  type LicensedModule,
  type ModuleAssignment,
  type OrgDepartment,
  type OrgChiefAccountantRow,
  type OrgUser,
  type UserStatus,
  orgAdminApi,
} from '@/lib/org-admin-api';
import { exportOrgUsersToExcel, exportOrgUsersToPdf } from '@/lib/org-users-export';
import { isTeachingStaffUser } from '@/lib/teaching-staff';
import { formatStaffCodeDisplay } from '@/lib/format-staff-code';
import { resolveCardAssetUrl } from '@/lib/smart-card-renderer';
import { useToast } from '@/shared/notifications';
import { OrgChiefAccountantsSection } from '@/components/organization-admin/org-chief-accountants-section';

function formatLoginParts(value: string | null) {
  if (!value) return { date: '—', time: '' };
  const d = new Date(value);
  return {
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  };
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${accent ?? 'text-navy'}`}>
            {value.toLocaleString()}
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-navy">
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}

function ModuleChips({
  modules,
  isOrgAdmin,
  onManage,
}: {
  modules: ModuleAssignment[];
  isOrgAdmin: boolean;
  onManage: () => void;
}) {
  if (isOrgAdmin) {
    return (
      <button
        type="button"
        onClick={onManage}
        className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-navy"
      >
        All modules
      </button>
    );
  }

  if (modules.length === 0) {
    return (
      <button
        type="button"
        onClick={onManage}
        className="text-[11px] text-slate-400 underline-offset-2 hover:text-navy hover:underline"
      >
        Assign modules
      </button>
    );
  }

  const visible = modules.slice(0, 3);
  const extra = modules.length - visible.length;

  return (
    <button
      type="button"
      onClick={onManage}
      className="flex max-w-[220px] flex-wrap items-center gap-1 text-left"
      title={modules.map((m) => m.shortName || m.slug).join(', ')}
    >
      {visible.map((m) => (
        <span
          key={m.slug}
          className="inline-flex max-w-[80px] truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-navy/80"
        >
          {m.shortName || m.slug}
        </span>
      ))}
      {extra > 0 ? (
        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          +{extra}
        </span>
      ) : null}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'ACTIVE';
  const bad = status === 'SUSPENDED' || status === 'LOCKED';
  const pending = status === 'PENDING_VERIFICATION';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        active
          ? 'bg-emerald-50 text-emerald-700'
          : bad
            ? 'bg-rose-50 text-rose-700'
            : pending
              ? 'bg-amber-50 text-amber-800'
              : 'bg-slate-100 text-slate-600'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? 'bg-emerald-500' : bad ? 'bg-rose-500' : pending ? 'bg-amber-500' : 'bg-slate-400'
        }`}
      />
      {status === 'ACTIVE'
        ? 'Active'
        : status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

export function UsersAccessView() {
  const toast = useToast();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [modules, setModules] = useState<LicensedModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TEACHERS'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [manageUser, setManageUser] = useState<OrgUser | null>(null);
  const [editUser, setEditUser] = useState<OrgUser | null>(null);
  const [resetUser, setResetUser] = useState<OrgUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<OrgUser | null>(null);
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showDepartmentsModal, setShowDepartmentsModal] = useState(false);
  const [departmentsVersion, setDepartmentsVersion] = useState(0);
  const [chiefAccountants, setChiefAccountants] = useState<OrgChiefAccountantRow[]>([]);
  const [accessTab, setAccessTab] = useState<'staff' | 'chief_accountant'>('staff');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, modulesRes, caRes] = await Promise.all([
        orgAdminApi.listUsers(),
        orgAdminApi.listModules(),
        orgAdminApi.listChiefAccountants().catch(() => ({ data: { data: [] as OrgChiefAccountantRow[] } })),
      ]);
      setUsers(usersRes.data.data);
      setModules(modulesRes.data.data);
      setChiefAccountants(caRes.data.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to load users';
      toast.error(message, 'Could not load users');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const showChiefAccountantTab = chiefAccountants.length > 0;

  useEffect(() => {
    if (!showChiefAccountantTab && accessTab === 'chief_accountant') {
      setAccessTab('staff');
    }
  }, [showChiefAccountantTab, accessTab]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    function close() {
      setMenuUserId(null);
      setExportOpen(false);
    }
    if (!menuUserId && !exportOpen) return;
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuUserId, exportOpen]);

  const [orgDepartments, setOrgDepartments] = useState<OrgDepartment[]>([]);

  useEffect(() => {
    void orgAdminApi
      .listDepartments()
      .then(({ data }) => setOrgDepartments(data.data))
      .catch(() => setOrgDepartments([]));
  }, [departmentsVersion]);

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    orgDepartments.forEach((d) => {
      if (d.name.trim()) set.add(d.name.trim());
    });
    users.forEach((u) => {
      if (u.department?.trim()) set.add(u.department.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [users, orgDepartments]);

  const positionOptions = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.position?.trim()) set.add(u.position.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      if (moduleFilter !== 'ALL' && !u.modules.some((m) => m.slug === moduleFilter)) return false;
      if (roleFilter === 'TEACHERS' && !isTeachingStaffUser(u)) return false;
      if (departmentFilter !== 'ALL' && (u.department?.trim() ?? '') !== departmentFilter) return false;
      if (positionFilter !== 'ALL' && (u.position?.trim() ?? '') !== positionFilter) return false;
      if (!q) return true;
      const haystack = [
        u.firstName,
        u.lastName,
        u.email,
        u.department,
        u.branch,
        u.position,
        u.employeeId,
        ...u.modules.map((m) => m.slug),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [users, search, statusFilter, moduleFilter, roleFilter, departmentFilter, positionFilter]);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.status === 'ACTIVE').length;
    const inactive = users.filter((u) => u.status !== 'ACTIVE').length;
    const teachers = users.filter((u) => isTeachingStaffUser(u)).length;
    const withModules = users.filter(
      (u) => u.roles.includes('organization_admin') || u.modules.length > 0
    ).length;
    return {
      total: users.length,
      active,
      inactive,
      teachers,
      withModules,
    };
  }, [users]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);
  const rangeEnd = Math.min(pageStart + pageSize, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, moduleFilter, roleFilter, departmentFilter, positionFilter, pageSize]);

  async function changeStatus(userId: string, status: UserStatus) {
    setBusyUserId(userId);
    try {
      await orgAdminApi.updateStatus(userId, status);
      toast.success(`User status updated to ${status.replace(/_/g, ' ')}`, 'Status updated');
      await reload();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to update status';
      toast.error(message, 'Update failed');
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleDeleteUser(user: OrgUser) {
    setBusyUserId(user.id);
    try {
      await orgAdminApi.deleteUser(user.id);
      toast.success(`${user.firstName} ${user.lastName} was removed.`, 'User deleted');
      setDeleteUser(null);
      setMenuUserId(null);
      setSelectedIds((prev) => prev.filter((id) => id !== user.id));
      await reload();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to delete user';
      toast.error(message, 'Delete failed');
    } finally {
      setBusyUserId(null);
    }
  }

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((row) => selectedIds.includes(row.id));

  function toggleSelectAll() {
    if (allPageSelected) {
      const pageIds = new Set(pageRows.map((r) => r.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageRows.map((r) => r.id)])));
    }
  }

  const filterActive =
    statusFilter !== 'ALL' ||
    moduleFilter !== 'ALL' ||
    roleFilter !== 'ALL' ||
    departmentFilter !== 'ALL' ||
    positionFilter !== 'ALL';

  function clearFilters() {
    setStatusFilter('ALL');
    setModuleFilter('ALL');
    setRoleFilter('ALL');
    setDepartmentFilter('ALL');
    setPositionFilter('ALL');
  }

  function handleExportExcel() {
    exportOrgUsersToExcel(filtered);
    setExportOpen(false);
    toast.success(`${filtered.length} user(s) exported.`, 'Excel export ready');
  }

  function handleExportPdf() {
    exportOrgUsersToPdf(filtered, 'Users & Access');
    setExportOpen(false);
    toast.success(`${filtered.length} user(s) exported.`, 'PDF export ready');
  }

  if (showWizard) {
    return (
      <div className="mx-auto max-w-6xl">
        <AddUserWizard
          modules={modules}
          users={users}
          departmentsVersion={departmentsVersion}
          onCancel={() => setShowWizard(false)}
          onCreated={async ({ email, credentialsSent }) => {
            toast.success(
              credentialsSent
                ? `User ${email} created. Login credentials were emailed.`
                : `User ${email} created.`,
              'User created'
            );
            setShowWizard(false);
            await reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <ManageUserModulesSheet
        user={manageUser}
        modules={modules}
        open={Boolean(manageUser)}
        onOpenChange={(open) => {
          if (!open) setManageUser(null);
        }}
        onSaved={async (message) => {
          toast.success(message, 'Access updated');
          await reload();
        }}
        onError={(message) => {
          toast.error(message, 'Update failed');
        }}
        onRequestResetPassword={() => {
          if (manageUser) setResetUser(manageUser);
        }}
      />

      <ResetPasswordDialog
        user={resetUser}
        open={Boolean(resetUser)}
        onOpenChange={(open) => {
          if (!open) setResetUser(null);
        }}
        onSuccess={(message) => {
          toast.success(message, 'Password updated');
        }}
        onError={(message) => {
          toast.error(message, 'Reset failed');
        }}
      />

      <ManageDepartmentsModal
        open={showDepartmentsModal}
        onClose={() => setShowDepartmentsModal(false)}
        onChanged={() => {
          setDepartmentsVersion((v) => v + 1);
          void reload();
        }}
      />

      <EditUserModal
        user={editUser}
        users={users}
        modules={modules}
        departmentsVersion={departmentsVersion}
        open={Boolean(editUser)}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}
        onSaved={async (message) => {
          toast.success(message, 'Profile updated');
          await reload();
        }}
        onError={(message) => {
          toast.error(message, 'Update failed');
        }}
      />

      {deleteUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-montserrat text-lg font-semibold text-navy">Delete user?</h3>
            <p className="mt-2 text-sm text-slate-500">
              This permanently removes{' '}
              <strong className="text-navy">
                {deleteUser.firstName} {deleteUser.lastName}
              </strong>{' '}
              ({deleteUser.email}). This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busyUserId === deleteUser.id}
                onClick={() => setDeleteUser(null)}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-navy hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyUserId === deleteUser.id}
                onClick={() => void handleDeleteUser(deleteUser)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                <Trash2 className="size-4" />
                {busyUserId === deleteUser.id ? 'Deleting…' : 'Delete user'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy text-primary shadow-sm">
            <Users className="size-6" />
          </span>
          <div className="min-w-0">
            <h1 className="font-montserrat text-xl font-bold text-navy sm:text-2xl">Users & Access</h1>
            <p className="text-sm text-slate-500">
              Manage staff accounts, roles, modules, and permissions
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowDepartmentsModal(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-navy hover:bg-slate-50"
          >
            <Building2 className="size-4" />
            Departments
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExportOpen((o) => !o);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-navy hover:bg-slate-50"
            >
              <Download className="size-4" />
              Export
            </button>
            {exportOpen ? (
              <div
                className="absolute right-0 top-12 z-20 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-navy hover:bg-slate-50"
                >
                  <FileSpreadsheet className="size-4 text-emerald-600" />
                  Export Excel (.csv)
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-navy hover:bg-slate-50"
                >
                  <FileText className="size-4 text-rose-600" />
                  Export PDF
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setShowWizard(true)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-navy px-4 text-sm font-semibold text-primary transition hover:bg-navy-light"
          >
            <Plus className="size-4" />
            Add User
          </button>
        </div>
      </div>

      {showChiefAccountantTab ? (
        <div
          className="inline-flex w-full max-w-md rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 shadow-inner sm:w-auto"
          role="tablist"
          aria-label="Users and access sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={accessTab === 'staff'}
            onClick={() => setAccessTab('staff')}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:flex-none sm:px-5 ${
              accessTab === 'staff'
                ? 'bg-white text-navy shadow-sm'
                : 'text-slate-600 hover:text-navy'
            }`}
          >
            <Users className="size-4" />
            Staff
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={accessTab === 'chief_accountant'}
            onClick={() => setAccessTab('chief_accountant')}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:flex-none sm:px-5 ${
              accessTab === 'chief_accountant'
                ? 'bg-white text-navy shadow-sm'
                : 'text-slate-600 hover:text-navy'
            }`}
          >
            <Scale className="size-4" />
            Chief Accountant
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
              {chiefAccountants.length}
            </span>
          </button>
        </div>
      ) : null}

      {accessTab === 'chief_accountant' && showChiefAccountantTab ? (
        <OrgChiefAccountantsSection
          rows={chiefAccountants}
          licensedModules={modules}
          loading={loading}
          onRowsChange={setChiefAccountants}
          onError={(message) => toast.error(message, 'Update failed')}
          onSuccess={(message) => toast.success(message, 'Access updated')}
        />
      ) : null}

      {accessTab === 'staff' ? (
        <>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        <StatCard label="Total Staff" value={stats.total} icon={Users} />
        <StatCard label="Active" value={stats.active} icon={UserCheck} accent="text-emerald-700" />
        <StatCard label="Inactive" value={stats.inactive} icon={UserX} accent="text-rose-600" />
        <StatCard label="Teachers" value={stats.teachers} icon={Briefcase} accent="text-blue-700" />
        <StatCard label="With Access" value={stats.withModules} icon={Network} accent="text-violet-700" />
      </div>

      {/* Filters + table card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <label className="min-w-0 flex-1 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Search</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, email, ID, department…"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-[#f4f6fb] py-2 pl-9 pr-3 text-sm text-navy outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:bg-white"
                />
              </div>
            </label>
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className={`inline-flex h-10 items-center gap-2 self-end rounded-xl border px-4 text-sm font-semibold lg:hidden ${
                filterActive ? 'border-primary/40 bg-primary/10 text-navy' : 'border-slate-200 text-navy'
              }`}
            >
              <Filter className="size-4" />
              Filters
              {filterActive ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
            </button>
          </div>

          <div
            className={`mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 ${
              filtersOpen ? 'grid' : 'hidden lg:grid'
            }`}
          >
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as 'ALL' | UserStatus)}
              options={[
                { value: 'ALL', label: 'All statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'SUSPENDED', label: 'Suspended' },
                { value: 'LOCKED', label: 'Locked' },
                { value: 'PENDING_VERIFICATION', label: 'Pending' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
            <FilterSelect
              label="Department"
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={[
                { value: 'ALL', label: 'All departments' },
                ...departmentOptions.map((d) => ({ value: d, label: d })),
              ]}
            />
            <FilterSelect
              label="Position"
              value={positionFilter}
              onChange={setPositionFilter}
              options={[
                { value: 'ALL', label: 'All positions' },
                ...positionOptions.map((p) => ({ value: p, label: p })),
              ]}
            />
            <FilterSelect
              label="Module"
              value={moduleFilter}
              onChange={setModuleFilter}
              options={[
                { value: 'ALL', label: 'All modules' },
                ...modules.map((m) => ({ value: m.slug, label: m.name })),
              ]}
            />
            <FilterSelect
              label="Role"
              value={roleFilter}
              onChange={(v) => setRoleFilter(v as 'ALL' | 'TEACHERS')}
              options={[
                { value: 'ALL', label: 'All users' },
                { value: 'TEACHERS', label: 'Teachers only' },
              ]}
            />
            {filterActive ? (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <X className="size-4" />
                  Clear
                </button>
              </div>
            ) : null}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Showing <strong className="text-navy">{filtered.length}</strong> of{' '}
            <strong className="text-navy">{users.length}</strong> users
            {filterActive ? ' (filtered)' : ''}
          </p>
        </div>

        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-sm sm:px-5">
            <span className="font-medium text-navy">{selectedIds.length} selected</span>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-navy hover:bg-slate-50"
              onClick={async () => {
                for (const id of selectedIds) {
                  await changeStatus(id, 'SUSPENDED');
                }
                setSelectedIds([]);
              }}
            >
              Bulk suspend
            </button>
            <button
              type="button"
              className="text-xs font-medium text-slate-500 hover:text-navy"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </button>
          </div>
        ) : null}

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="w-12 px-4 py-3">
                  <button
                    type="button"
                    aria-label="Select all on page"
                    onClick={toggleSelectAll}
                    className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                      allPageSelected ? 'border-primary bg-primary text-navy' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {allPageSelected ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : null}
                  </button>
                </th>
                {['User', 'Status', 'Department', 'Position', 'Modules', 'Last login', 'Actions'].map((label) => (
                  <th
                    key={label}
                    className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td colSpan={8} className="px-5 py-4">
                      <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <p className="text-sm font-medium text-navy">No users found</p>
                    <p className="mt-1 text-sm text-slate-500">Try adjusting filters or add a new user.</p>
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <UserTableRow
                    key={row.id}
                    row={row}
                    selected={selectedIds.includes(row.id)}
                    busyUserId={busyUserId}
                    menuUserId={menuUserId}
                    onSelect={(checked) =>
                      setSelectedIds((prev) =>
                        checked ? [...prev, row.id] : prev.filter((id) => id !== row.id)
                      )
                    }
                    onManage={() => setManageUser(row)}
                    onEdit={() => setEditUser(row)}
                    onReset={() => setResetUser(row)}
                    onDelete={() => setDeleteUser(row)}
                    onToggleMenu={() => setMenuUserId((id) => (id === row.id ? null : row.id))}
                    onChangeStatus={changeStatus}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-slate-100 md:hidden">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4">
                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ))
          ) : pageRows.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-medium text-navy">No users found</p>
              <p className="mt-1 text-sm text-slate-500">Try adjusting filters or add a new user.</p>
            </div>
          ) : (
            pageRows.map((row) => (
              <UserMobileCard
                key={row.id}
                row={row}
                busyUserId={busyUserId}
                onManage={() => setManageUser(row)}
                onEdit={() => setEditUser(row)}
                onReset={() => setResetUser(row)}
                onDelete={() => setDeleteUser(row)}
                onChangeStatus={changeStatus}
              />
            ))
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Show
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-navy outline-none"
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            entries
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
            <p className="text-xs text-slate-500">
              {filtered.length === 0 ? '0 of 0' : `${pageStart + 1}-${rangeEnd} of ${filtered.length}`}
            </p>
            <div className="flex items-center gap-1">
              <PagerButton label="First page" disabled={currentPage <= 1} onClick={() => setPage(1)}>
                <ChevronsLeft className="size-3.5" />
              </PagerButton>
              <PagerButton
                label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5" />
              </PagerButton>
              <span className="px-2 text-xs font-semibold text-navy">
                {currentPage} / {totalPages}
              </span>
              <PagerButton
                label="Next page"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="size-3.5" />
              </PagerButton>
              <PagerButton
                label="Last page"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                <ChevronsRight className="size-3.5" />
              </PagerButton>
            </div>
          </div>
        </div>
      </div>
        </>
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy outline-none focus:border-primary/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function UserTableRow({
  row,
  selected,
  busyUserId,
  menuUserId,
  onSelect,
  onManage,
  onEdit,
  onReset,
  onDelete,
  onToggleMenu,
  onChangeStatus,
}: {
  row: OrgUser;
  selected: boolean;
  busyUserId: string | null;
  menuUserId: string | null;
  onSelect: (checked: boolean) => void;
  onManage: () => void;
  onEdit: () => void;
  onReset: () => void;
  onDelete: () => void;
  onToggleMenu: () => void;
  onChangeStatus: (userId: string, status: UserStatus) => void;
}) {
  const isAdmin = row.roles.includes('organization_admin');
  const login = formatLoginParts(row.lastLoginAt);

  return (
    <tr className="border-b border-slate-100 transition hover:bg-slate-50/70 last:border-0">
      <td className="px-4 py-3.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
        />
      </td>
      <td className="px-3 py-3.5">
        <div className="flex items-center gap-3">
          <UserAvatar user={row} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-navy">
              {row.firstName} {row.lastName}
            </p>
            <p className="truncate text-xs text-slate-500">{row.email}</p>
            {row.employeeId ? (
              <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-medium text-slate-500">
                {formatStaffCodeDisplay(row.employeeId)}
              </span>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-3 py-3.5">
        <StatusBadge status={row.status} />
      </td>
      <td className="px-3 py-3.5">
        <p className="text-sm font-medium text-navy">{row.department || '—'}</p>
        {row.branch ? <p className="text-xs text-slate-500">{row.branch}</p> : null}
      </td>
      <td className="px-3 py-3.5">
        <p className="text-sm text-navy">{row.position || '—'}</p>
      </td>
      <td className="px-3 py-3.5">
        <ModuleChips modules={row.modules} isOrgAdmin={isAdmin} onManage={onManage} />
      </td>
      <td className="px-3 py-3.5">
        <p className="text-xs font-medium text-slate-600">{login.date}</p>
        {login.time ? <p className="text-[11px] text-slate-400">{login.time}</p> : null}
      </td>
      <td className="px-3 py-3.5">
        <UserActions
          row={row}
          isAdmin={isAdmin}
          busyUserId={busyUserId}
          menuUserId={menuUserId}
          onManage={onManage}
          onEdit={onEdit}
          onReset={onReset}
          onDelete={onDelete}
          onToggleMenu={onToggleMenu}
          onChangeStatus={onChangeStatus}
        />
      </td>
    </tr>
  );
}

function UserMobileCard({
  row,
  busyUserId,
  onManage,
  onEdit,
  onReset,
  onDelete,
  onChangeStatus,
}: {
  row: OrgUser;
  busyUserId: string | null;
  onManage: () => void;
  onEdit: () => void;
  onReset: () => void;
  onDelete: () => void;
  onChangeStatus: (userId: string, status: UserStatus) => void;
}) {
  const isAdmin = row.roles.includes('organization_admin');
  const login = formatLoginParts(row.lastLoginAt);

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start gap-3">
        <UserAvatar user={row} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-navy">
                {row.firstName} {row.lastName}
              </p>
              <p className="truncate text-xs text-slate-500">{row.email}</p>
            </div>
            <StatusBadge status={row.status} />
          </div>
          {row.employeeId ? (
            <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-medium text-slate-500">
              {formatStaffCodeDisplay(row.employeeId)}
            </span>
          ) : null}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="font-bold uppercase tracking-wide text-slate-400">Department</dt>
          <dd className="mt-0.5 font-medium text-navy">{row.department || '—'}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="font-bold uppercase tracking-wide text-slate-400">Position</dt>
          <dd className="mt-0.5 font-medium text-navy">{row.position || '—'}</dd>
        </div>
        <div className="col-span-2 rounded-lg bg-slate-50 px-3 py-2">
          <dt className="font-bold uppercase tracking-wide text-slate-400">Modules</dt>
          <dd className="mt-1">
            <ModuleChips modules={row.modules} isOrgAdmin={isAdmin} onManage={onManage} />
          </dd>
        </div>
        <div className="col-span-2 rounded-lg bg-slate-50 px-3 py-2">
          <dt className="font-bold uppercase tracking-wide text-slate-400">Last login</dt>
          <dd className="mt-0.5 font-medium text-navy">
            {login.date}
            {login.time ? ` · ${login.time}` : ''}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onManage}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-navy"
        >
          <Network className="size-3.5" /> Modules
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-navy"
        >
          <Pencil className="size-3.5" /> Edit
        </button>
        {!isAdmin && row.status === 'ACTIVE' ? (
          <button
            type="button"
            disabled={busyUserId === row.id}
            onClick={() => onChangeStatus(row.id, 'SUSPENDED')}
            className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"
          >
            <Pause className="size-3.5" />
          </button>
        ) : null}
        {!isAdmin && row.status !== 'ACTIVE' ? (
          <button
            type="button"
            disabled={busyUserId === row.id}
            onClick={() => onChangeStatus(row.id, 'ACTIVE')}
            className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"
          >
            <Play className="size-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-navy"
        >
          <KeyRound className="size-3.5" />
        </button>
        {!isAdmin ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function UserActions({
  row,
  isAdmin,
  busyUserId,
  menuUserId,
  onManage,
  onEdit,
  onReset,
  onDelete,
  onToggleMenu,
  onChangeStatus,
}: {
  row: OrgUser;
  isAdmin: boolean;
  busyUserId: string | null;
  menuUserId: string | null;
  onManage: () => void;
  onEdit: () => void;
  onReset: () => void;
  onDelete: () => void;
  onToggleMenu: () => void;
  onChangeStatus: (userId: string, status: UserStatus) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        title="Manage modules"
        onClick={onManage}
        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-navy"
      >
        <Network className="size-4" />
      </button>
      {!isAdmin && row.status === 'ACTIVE' ? (
        <button
          type="button"
          title="Suspend"
          disabled={busyUserId === row.id}
          onClick={() => onChangeStatus(row.id, 'SUSPENDED')}
          className="rounded-lg p-2 text-primary transition hover:bg-primary/10 disabled:opacity-50"
        >
          <Pause className="size-4" />
        </button>
      ) : null}
      {!isAdmin && row.status !== 'ACTIVE' ? (
        <button
          type="button"
          title="Activate"
          disabled={busyUserId === row.id}
          onClick={() => onChangeStatus(row.id, 'ACTIVE')}
          className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50"
        >
          <Play className="size-4" />
        </button>
      ) : null}
      <div className="relative">
        <button
          type="button"
          title="More actions"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMenu();
          }}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-navy"
        >
          <MoreVertical className="size-4" />
        </button>
        {menuUserId === row.id ? (
          <div
            className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-navy hover:bg-slate-50"
              onClick={onEdit}
            >
              <Pencil className="size-3.5" />
              Edit profile
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-navy hover:bg-slate-50"
              onClick={onManage}
            >
              <Network className="size-3.5" />
              Modules
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-navy hover:bg-slate-50"
              onClick={onReset}
            >
              <KeyRound className="size-3.5" />
              Reset password
            </button>
            {!isAdmin ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                onClick={onDelete}
              >
                <Trash2 className="size-3.5" />
                Delete user
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function UserAvatar({ user }: { user: OrgUser }) {
  const src = user.avatarUrl ? resolveCardAssetUrl(user.avatarUrl, 'iam') : '';
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?';

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover"
      />
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-primary">
      {initials}
    </span>
  );
}

function PagerButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
