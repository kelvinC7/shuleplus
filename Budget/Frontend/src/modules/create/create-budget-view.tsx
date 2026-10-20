'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Loader2,
  Plus,
  Wallet,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { budgetApi, unwrap } from '@/services/budget-api';
import { useToast } from '@/shared/notifications';
import { useAuth } from '@/contexts/auth-context';
import { formatDate, formatRwf, formatRwfStat } from '@/utils/format';
import { getApiErrorMessage } from '@/utils/api-error';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { BudgetDataTable, type BudgetTableColumn } from '@/components/budget-data-table';
import { BudgetModal } from '@/components/budget-modal';
import { BudgetFormModal } from '@/modules/create/budget-form-modal';
import { StatusBadge } from '@/components/status-badge';
import { BudgetFilterBar, FilterSelect } from '@/components/budget-filter-bar';
import { BudgetExportDropdown } from '@/components/budget-export-dropdown';
import { BudgetProgressBar } from '@/components/budget-progress-bar';
import type { BudgetOptions, IncomeConfig, SchoolBudget } from '@/types';

function budgetUsed(b: SchoolBudget) {
  return b.totalSpentRwf ?? b.lines?.reduce((s, l) => s + (l.usedAmountRwf ?? 0), 0) ?? 0;
}

function budgetRemaining(b: SchoolBudget) {
  return Math.max(0, (b.totalAllocatedRwf ?? 0) - budgetUsed(b));
}

function canEditBudget(b: SchoolBudget) {
  return b.status === 'draft' || b.status === 'rejected';
}

function canDeleteBudget(b: SchoolBudget) {
  return (
    (b.status === 'draft' || b.status === 'rejected') &&
    (b.totalAllocatedRwf ?? 0) === 0 &&
    (b.lines?.length ?? 0) === 0
  );
}

export function CreateBudgetView() {
  const toast = useToast();
  const { user } = useAuth();
  const params = useSearchParams();
  const deepLinkEditId = params.get('id');

  const [budgets, setBudgets] = useState<SchoolBudget[]>([]);
  const [options, setOptions] = useState<BudgetOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<SchoolBudget | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<SchoolBudget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [budgetRes, optionsRes] = await Promise.all([
        budgetApi.budgets(),
        budgetApi.options(),
      ]);
      setBudgets(unwrap(budgetRes.data));
      setOptions(unwrap(optionsRes.data));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load budgets'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (deepLinkEditId) {
      setEditId(deepLinkEditId);
      setFormOpen(true);
    }
  }, [deepLinkEditId]);

  const stats = useMemo(() => {
    const drafts = budgets.filter((b) => b.status === 'draft').length;
    const pending = budgets.filter((b) => b.status === 'pending_approval').length;
    const approved = budgets.filter((b) => b.status === 'approved').length;
    const totalExpected = budgets.reduce((s, b) => s + (b.totalExpectedIncomeRwf ?? 0), 0);
    return { total: budgets.length, drafts, pending, approved, totalExpected };
  }, [budgets]);

  const academicYears = useMemo(() => {
    const fromBudgets = budgets.map((b) => b.academicYear);
    const fromOptions = options?.academicYears ?? [];
    return [...new Set([...fromOptions, ...fromBudgets])].sort().reverse();
  }, [budgets, options]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return budgets.filter((b) => {
      if (statusFilter && b.status !== statusFilter) return false;
      if (yearFilter && b.academicYear !== yearFilter) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.budgetCode.toLowerCase().includes(q) ||
        b.academicYear.toLowerCase().includes(q) ||
        b.term.toLowerCase().includes(q)
      );
    });
  }, [budgets, search, statusFilter, yearFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, yearFilter]);

  const exportData = useMemo(
    () =>
      filtered.map((b) => ({
        code: b.budgetCode,
        title: b.title,
        year: b.academicYear,
        term: b.term,
        type: b.budgetType,
        expected: formatRwf(b.totalExpectedIncomeRwf),
        allocated: formatRwf(b.totalAllocatedRwf ?? 0),
        used: formatRwf(budgetUsed(b)),
        remaining: formatRwf(budgetRemaining(b)),
        status: b.status.replace(/_/g, ' '),
        updated: formatDate(b.updatedAt ?? b.createdAt),
      })),
    [filtered]
  );

  const exportColumns = [
    { header: 'Code', accessor: 'code' },
    { header: 'Title', accessor: 'title' },
    { header: 'Academic Year', accessor: 'year' },
    { header: 'Term', accessor: 'term' },
    { header: 'Type', accessor: 'type' },
    { header: 'Expected Income', accessor: 'expected' },
    { header: 'Allocated', accessor: 'allocated' },
    { header: 'Used', accessor: 'used' },
    { header: 'Remaining', accessor: 'remaining' },
    { header: 'Status', accessor: 'status' },
    { header: 'Updated', accessor: 'updated' },
  ];

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const columns: BudgetTableColumn<SchoolBudget>[] = [
    {
      key: 'budget',
      header: 'Budget',
      render: (b) => (
        <div>
          <p className="font-semibold text-navy">{b.title}</p>
          <p className="text-xs text-muted">{b.budgetCode}</p>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (b) => (
        <div>
          <p className="text-sm text-navy">{b.academicYear}</p>
          <p className="text-xs text-muted">{b.term} · {b.budgetType}</p>
        </div>
      ),
    },
    {
      key: 'expected',
      header: 'Expected Income',
      className: 'whitespace-nowrap',
      render: (b) => <span className="font-semibold text-navy">{formatRwf(b.totalExpectedIncomeRwf)}</span>,
    },
    {
      key: 'allocated',
      header: 'Allocated',
      className: 'whitespace-nowrap hidden lg:table-cell',
      render: (b) => <span className="text-sm text-muted">{formatRwf(b.totalAllocatedRwf ?? 0)}</span>,
    },
    {
      key: 'used',
      header: 'Used',
      className: 'whitespace-nowrap',
      render: (b) => {
        const used = budgetUsed(b);
        return <span className="font-semibold text-navy">{formatRwfStat(used)}</span>;
      },
    },
    {
      key: 'remaining',
      header: 'Remaining',
      className: 'whitespace-nowrap hidden sm:table-cell',
      render: (b) => {
        const remaining = budgetRemaining(b);
        const allocated = b.totalAllocatedRwf ?? 0;
        return (
          <div className="min-w-[100px]">
            <span className="font-semibold text-emerald-700">{formatRwfStat(remaining)}</span>
            {allocated > 0 ? (
              <BudgetProgressBar used={budgetUsed(b)} planned={allocated} showLabels={false} size="sm" />
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => <StatusBadge status={b.status} />,
    },
    {
      key: 'updated',
      header: 'Updated',
      className: 'hidden lg:table-cell whitespace-nowrap',
      render: (b) => <span className="text-sm text-muted">{formatDate(b.updatedAt ?? b.createdAt)}</span>,
    },
  ];

  function openCreate() {
    void load();
    setEditId(null);
    setFormOpen(true);
  }

  function openEdit(b: SchoolBudget) {
    if (!canEditBudget(b)) {
      toast.error(
        `Cannot edit ${b.budgetCode} — only draft or rejected budgets can be modified. Approved budgets are locked.`
      );
      return;
    }
    setEditId(b.id);
    setFormOpen(true);
  }

  async function openView(b: SchoolBudget) {
    setViewOpen(true);
    setViewLoading(true);
    setViewItem(null);
    try {
      const res = await budgetApi.budget(b.id);
      setViewItem(unwrap(res.data));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load budget details'));
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  }

  function openDelete(b: SchoolBudget) {
    if (!canDeleteBudget(b)) {
      if (b.status === 'approved' || b.status === 'pending_approval' || b.status === 'closed') {
        toast.error(`Cannot delete ${b.budgetCode} — only draft or rejected budgets can be removed`);
      } else if ((b.totalAllocatedRwf ?? 0) > 0 || (b.lines?.length ?? 0) > 0) {
        toast.error(`Cannot delete ${b.budgetCode} — remove expense allocations first`);
      } else {
        toast.error('Only empty draft or rejected budgets can be deleted');
      }
      return;
    }
    setDeleteItem(b);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await budgetApi.deleteBudget(deleteItem.id);
      toast.success(`${deleteItem.budgetCode} deleted`);
      setDeleteOpen(false);
      setDeleteItem(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    } finally {
      setDeleting(false);
    }
  }

  function closeForm() {
    setFormOpen(false);
    setEditId(null);
    if (deepLinkEditId && typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/create');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-navy">
           
            Create Budget
          </h1>
          <p className="mt-1 text-sm text-muted">
            Plan school income, submit for approval, and manage budget records.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
          <Plus size={18} />
          New Budget
        </button>
      </div>

      <StatsGrid columns={4}>
        <StatCard label="Total Budgets" value={stats.total} icon={<FileText size={20} />} />
        <StatCard label="Drafts" value={stats.drafts} icon={<Wallet size={20} />} hint="Not yet submitted" />
        <StatCard label="Pending Approval" value={stats.pending} icon={<Clock size={20} />} />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={<CheckCircle2 size={20} />}
          hint={stats.totalExpected > 0 ? formatRwf(stats.totalExpected) + ' expected' : undefined}
        />
      </StatsGrid>

      <BudgetFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by title, code, year, or term…"
        actions={
          <BudgetExportDropdown
            title="School Budgets Report"
            columns={exportColumns}
            data={exportData}
            fileName="school_budgets"
            userName={user?.email}
          />
        }
      >
        <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="closed">Closed</option>
        </FilterSelect>
        <FilterSelect label="Academic year" value={yearFilter} onChange={setYearFilter}>
          <option value="">All years</option>
          {academicYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </FilterSelect>
      </BudgetFilterBar>

      <BudgetDataTable
        columns={columns}
        data={paged}
        rowKey={(b) => b.id}
        page={page}
        totalPages={totalPages}
        total={filtered.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        loading={loading}
        emptyMessage="No budgets yet. Create your first budget to get started."
        emptyAction={
          <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Create Budget
          </button>
        }
        onView={(b) => void openView(b)}
        onEdit={openEdit}
        onDelete={openDelete}
        canEdit={canEditBudget}
        canDelete={canDeleteBudget}
      />

      <BudgetModal
        open={formOpen}
        onClose={closeForm}
        title={editId ? 'Edit Budget' : 'Create Budget'}
        description="Define income sources with fixed or per-student calculations."
        size="xl"
      >
        <BudgetFormModal
          editId={editId}
          options={options}
          onSaved={() => {
            closeForm();
            void load();
          }}
          onCancel={closeForm}
        />
      </BudgetModal>

      <BudgetModal
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewItem(null);
        }}
        title={viewItem?.title ?? 'Budget Details'}
        description={viewItem ? `${viewItem.budgetCode} · ${viewItem.academicYear} · ${viewItem.term}` : undefined}
        size="xl"
      >
        {viewLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
            <Loader2 size={18} className="animate-spin" /> Loading…
          </div>
        ) : viewItem ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={viewItem.status} />
              {viewItem.preparedByName ? (
                <span className="text-xs text-muted">Prepared by {viewItem.preparedByName}</span>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Expected Income', value: formatRwfStat(viewItem.totalExpectedIncomeRwf), accent: 'text-navy' },
                { label: 'Allocated', value: formatRwfStat(viewItem.totalAllocatedRwf ?? 0), accent: 'text-navy' },
                { label: 'Used', value: formatRwfStat(budgetUsed(viewItem)), accent: 'text-amber-700' },
                { label: 'Remaining', value: formatRwfStat(budgetRemaining(viewItem)), accent: 'text-emerald-700' },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-border bg-gradient-to-br from-white to-slate-50/80 px-4 py-3 shadow-sm"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{kpi.label}</p>
                  <p className={`mt-1 text-base font-bold tabular-nums sm:text-lg ${kpi.accent}`}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {(viewItem.totalAllocatedRwf ?? 0) > 0 ? (
              <div className="rounded-xl border border-border bg-slate-50/60 px-4 py-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-navy">Budget utilization</p>
                  <span className="text-xs text-muted">
                    {formatRwfStat(budgetUsed(viewItem))} of {formatRwfStat(viewItem.totalAllocatedRwf ?? 0)} allocated
                  </span>
                </div>
                <BudgetProgressBar
                  used={budgetUsed(viewItem)}
                  planned={viewItem.totalAllocatedRwf ?? 0}
                />
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-dashed border-border bg-white px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Unallocated income</p>
                <p className="mt-1 text-base font-bold text-navy tabular-nums">
                  {formatRwfStat(viewItem.unallocatedRwf ?? Math.max(0, viewItem.totalExpectedIncomeRwf - (viewItem.totalAllocatedRwf ?? 0)))}
                </p>
                <p className="mt-1 text-xs text-muted">Not yet assigned to expense lines</p>
              </div>
              <div className="rounded-xl border border-dashed border-border bg-white px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Available balance</p>
                <p className="mt-1 text-base font-bold text-emerald-700 tabular-nums">
                  {formatRwfStat(viewItem.availableRwf ?? Math.max(0, viewItem.totalExpectedIncomeRwf - budgetUsed(viewItem)))}
                </p>
                <p className="mt-1 text-xs text-muted">Expected income minus total used</p>
              </div>
            </div>

            {viewItem.description ? (
              <p className="rounded-xl border border-border bg-slate-50/80 px-4 py-3 text-sm text-navy/80">
                {viewItem.description}
              </p>
            ) : null}

            {(viewItem.lines?.length ?? 0) > 0 ? (
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">Expense Lines</h3>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/80">
                        <th className="px-4 py-2.5 font-semibold text-navy">Line</th>
                        <th className="px-4 py-2.5 font-semibold text-navy">Planned</th>
                        <th className="px-4 py-2.5 font-semibold text-navy">Used</th>
                        <th className="px-4 py-2.5 font-semibold text-navy">Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewItem.lines!.map((line) => {
                        const lineRemaining = Math.max(0, line.plannedAmountRwf - (line.usedAmountRwf ?? 0));
                        return (
                          <tr key={line.id} className="border-b border-border/70 last:border-0">
                            <td className="px-4 py-3">
                              <p className="font-medium text-navy">{line.lineName}</p>
                              <p className="text-xs text-muted">{line.category} · {line.department}</p>
                            </td>
                            <td className="px-4 py-3 text-muted">{formatRwfStat(line.plannedAmountRwf)}</td>
                            <td className="px-4 py-3 font-medium text-navy">{formatRwfStat(line.usedAmountRwf ?? 0)}</td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-emerald-700">{formatRwfStat(lineRemaining)}</span>
                              <BudgetProgressBar
                                used={line.usedAmountRwf ?? 0}
                                planned={line.plannedAmountRwf}
                                showLabels={false}
                                size="sm"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">Income Sources</h3>
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/80">
                      <th className="px-4 py-2.5 font-semibold text-navy">Source</th>
                      <th className="px-4 py-2.5 font-semibold text-navy">Type</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-navy">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewItem.incomeSources ?? []).map((s) => {
                      const cfg = (s.configJson ?? {}) as IncomeConfig;
                      return (
                        <tr key={s.id ?? s.incomeSourceKey} className="border-b border-border/70 last:border-0">
                          <td className="px-4 py-3 font-medium text-navy">{s.incomeSourceKey}</td>
                          <td className="px-4 py-3 text-muted capitalize">
                            {(cfg.calculationType ?? 'fixed').replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-navy">
                            {formatRwf(s.expectedAmountRwf)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {canEditBudget(viewItem) ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setViewOpen(false);
                    openEdit(viewItem);
                  }}
                >
                  Edit Budget
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </BudgetModal>

      <BudgetModal
        open={deleteOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
            setDeleteItem(null);
          }
        }}
        title="Delete Budget"
        description={
          deleteItem
            ? `Remove ${deleteItem.budgetCode} — ${deleteItem.title}? This cannot be undone.`
            : undefined
        }
        size="md"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                setDeleteOpen(false);
                setDeleteItem(null);
              }}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void confirmDelete()}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete Budget'}
            </button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          Only draft or rejected budgets with no expense lines can be deleted.
        </p>
      </BudgetModal>
    </div>
  );
}
