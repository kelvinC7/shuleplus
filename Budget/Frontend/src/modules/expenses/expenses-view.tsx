'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Lock,
  LockOpen,
  Plus,
  Wallet,
  TrendingDown,
  Snowflake,
  Layers,
} from 'lucide-react';
import { budgetApi, unwrap } from '@/services/budget-api';
import { BudgetDataTable, type BudgetTableColumn } from '@/components/budget-data-table';
import { BudgetModal } from '@/components/budget-modal';
import { BudgetFilterBar, FilterSelect } from '@/components/budget-filter-bar';
import { BudgetExportDropdown } from '@/components/budget-export-dropdown';
import { BudgetProgressBar } from '@/components/budget-progress-bar';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { useToast } from '@/shared/notifications';
import { useAuth } from '@/contexts/auth-context';
import { formatRwf, formatRwfStat } from '@/utils/format';
import { getApiErrorMessage } from '@/utils/api-error';
import type { BudgetLine, LineOptions, LinesSummary, SchoolBudget } from '@/types';

const emptyForm = {
  lineName: '',
  category: '',
  department: '',
  priority: 'Medium',
  plannedAmountRwf: '',
  notes: '',
};

export function ExpensesView() {
  const toast = useToast();
  const { user } = useAuth();
  const isManager =
    user?.roles?.some((r) =>
      ['ORGANIZATION_ADMIN', 'SCHOOL_MANAGER', 'BUDGET_MANAGER', 'FINANCE_MANAGER'].includes(r)
    ) ?? false;

  const [budgets, setBudgets] = useState<SchoolBudget[]>([]);
  const [budgetId, setBudgetId] = useState('');
  const [summary, setSummary] = useState<LinesSummary | null>(null);
  const [options, setOptions] = useState<LineOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [modalBudgetId, setModalBudgetId] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, oRes, sRes] = await Promise.all([
        budgetApi.budgets(),
        budgetApi.budgetLineOptions(),
        budgetApi.budgetLinesSummary(budgetId || undefined),
      ]);
      setBudgets(unwrap(bRes.data));
      setOptions(unwrap(oRes.data));
      setSummary(unwrap(sRes.data));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load expenses'));
    } finally {
      setLoading(false);
    }
  }, [budgetId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const approvedBudgets = useMemo(
    () => budgets.filter((b) => b.status === 'approved'),
    [budgets]
  );

  const lines = summary?.lines ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lines.filter((l) => {
      if (categoryFilter && l.category !== categoryFilter) return false;
      if (departmentFilter && l.department !== departmentFilter) return false;
      if (!q) return true;
      return (
        l.lineName.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        l.department.toLowerCase().includes(q)
      );
    });
  }, [lines, search, categoryFilter, departmentFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, departmentFilter, budgetId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportData = useMemo(
    () =>
      filtered.map((l) => ({
        line: l.lineName,
        category: l.category,
        department: l.department,
        planned: formatRwf(l.plannedAmountRwf),
        used: formatRwf(l.usedAmountRwf),
        remaining: formatRwf(l.remainingRwf ?? l.plannedAmountRwf - l.usedAmountRwf),
        priority: l.priority ?? 'Medium',
        status: l.isFrozen ? 'Frozen' : (l.severity ?? 'Active'),
      })),
    [filtered]
  );

  const exportColumns = [
    { header: 'Line', accessor: 'line' },
    { header: 'Category', accessor: 'category' },
    { header: 'Department', accessor: 'department' },
    { header: 'Planned', accessor: 'planned' },
    { header: 'Used', accessor: 'used' },
    { header: 'Remaining', accessor: 'remaining' },
    { header: 'Priority', accessor: 'priority' },
    { header: 'Status', accessor: 'status' },
  ];

  function openCreateModal() {
    setEditId(null);
    setForm({
      ...emptyForm,
      category: options?.categories[0] ?? '',
      department: options?.departments[0] ?? '',
    });
    const defaultBudgetId = approvedBudgets[0]?.id ?? '';
    setModalBudgetId(budgetId || defaultBudgetId);
    setModalStep(1);
    setModalOpen(true);
  }

  function openEditModal(line: BudgetLine) {
    setEditId(line.id);
    setModalBudgetId(line.budgetId);
    setForm({
      lineName: line.lineName,
      category: line.category,
      department: line.department,
      priority: line.priority ?? 'Medium',
      plannedAmountRwf: String(line.plannedAmountRwf),
      notes: line.notes ?? '',
    });
    setModalStep(2);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setModalStep(1);
    setEditId(null);
    setForm(emptyForm);
  }

  async function saveLine() {
    const targetBudgetId = editId ? modalBudgetId : modalBudgetId;
    if (!targetBudgetId) {
      toast.error('Select a budget first');
      return;
    }
    if (!form.lineName.trim()) {
      toast.error('Line name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        budgetId: targetBudgetId,
        lineName: form.lineName.trim(),
        category: form.category,
        department: form.department,
        priority: form.priority,
        plannedAmountRwf: Number(form.plannedAmountRwf) || 0,
        notes: form.notes || undefined,
      };
      if (editId) {
        await budgetApi.updateBudgetLine(editId, payload);
        toast.success('Expense line updated');
      } else {
        await budgetApi.createBudgetLine(payload);
        toast.success('Expense line allocated');
      }
      closeModal();
      if (!budgetId) setBudgetId(targetBudgetId);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save line'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleFreeze(line: BudgetLine) {
    try {
      await budgetApi.freezeBudgetLine(line.id, !line.isFrozen);
      toast.success(line.isFrozen ? 'Line unfrozen' : 'Line frozen');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Freeze update failed'));
    }
  }

  const columns: BudgetTableColumn<BudgetLine>[] = [
    {
      key: 'line',
      header: 'Expense Line',
      render: (r) => (
        <div>
          <p className="font-semibold text-navy">{r.lineName}</p>
          <p className="text-xs text-muted">
            {r.category} · {r.department}
          </p>
        </div>
      ),
    },
    {
      key: 'planned',
      header: 'Planned',
      className: 'whitespace-nowrap',
      render: (r) => <span className="font-semibold text-navy">{formatRwf(r.plannedAmountRwf)}</span>,
    },
    {
      key: 'used',
      header: 'Used',
      className: 'whitespace-nowrap hidden sm:table-cell',
      render: (r) => formatRwf(r.usedAmountRwf),
    },
    {
      key: 'progress',
      header: 'Usage',
      className: 'min-w-[140px] hidden md:table-cell',
      render: (r) => (
        <BudgetProgressBar used={r.usedAmountRwf} planned={r.plannedAmountRwf} size="sm" />
      ),
    },
    {
      key: 'remaining',
      header: 'Remaining',
      className: 'whitespace-nowrap',
      render: (r) => formatRwf(r.remainingRwf ?? r.plannedAmountRwf - r.usedAmountRwf),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={r.severity ?? 'Active'} />
          {r.isFrozen ? <StatusBadge status="closed" /> : null}
          {isManager ? (
            <button
              type="button"
              onClick={() => void toggleFreeze(r)}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-navy hover:bg-slate-50"
              title={r.isFrozen ? 'Unfreeze' : 'Freeze'}
            >
              {r.isFrozen ? <LockOpen size={12} /> : <Lock size={12} />}
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const selectedBudget = budgets.find((b) => b.id === budgetId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Expenses</h1>
          <p className="mt-1 text-sm text-muted">
            Allocate budget lines to departments and track planned vs used amounts.
          </p>
        </div>
        <button type="button" onClick={openCreateModal} className="btn-primary inline-flex items-center gap-2">
          <Plus size={18} />
          Allocate Line
        </button>
      </div>

      <StatsGrid columns={4}>
        <StatCard label="Planned" value={formatRwfStat(summary?.totals.planned ?? 0)} icon={<Wallet size={20} />} />
        <StatCard label="Used" value={formatRwfStat(summary?.totals.used ?? 0)} icon={<TrendingDown size={20} />} />
        <StatCard
          label="Remaining"
          value={formatRwfStat(summary?.totals.remaining ?? 0)}
          icon={<Layers size={20} />}
          hint={selectedBudget ? `${selectedBudget.budgetCode} selected` : 'All budgets'}
        />
        <StatCard
          label="Frozen Lines"
          value={summary?.totals.frozen ?? 0}
          icon={<Snowflake size={20} />}
          hint={`${summary?.totals.lines ?? 0} total lines`}
        />
      </StatsGrid>

      <BudgetFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search lines, categories, departments…"
        actions={
          <BudgetExportDropdown
            title="Expense Lines Report"
            columns={exportColumns}
            data={exportData}
            fileName="expense_lines"
            userName={user?.email}
          />
        }
      >
        <FilterSelect label="Budget" value={budgetId} onChange={setBudgetId} className="input w-full sm:w-56">
          <option value="">All budgets</option>
          {budgets.map((b) => (
            <option key={b.id} value={b.id}>
              {b.budgetCode} — {b.title}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter}>
          <option value="">All categories</option>
          {(options?.categories ?? []).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="Department" value={departmentFilter} onChange={setDepartmentFilter}>
          <option value="">All departments</option>
          {(options?.departments ?? []).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </FilterSelect>
      </BudgetFilterBar>

      <BudgetDataTable
        columns={columns}
        data={pageRows}
        rowKey={(r) => r.id}
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
        emptyMessage={
          budgetId
            ? 'No expense lines for this budget. Allocate your first line.'
            : 'Select a budget or allocate a new expense line.'
        }
        emptyAction={
          <button type="button" onClick={openCreateModal} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Allocate Line
          </button>
        }
        onEdit={openEditModal}
      />

      <BudgetModal
        open={modalOpen}
        onClose={closeModal}
        title={editId ? 'Edit Expense Line' : 'Allocate Expense Line'}
        description={
          editId
            ? 'Update planned amount and line details.'
            : modalStep === 1
              ? 'Step 1 of 2 — Choose the budget to allocate against.'
              : 'Step 2 of 2 — Enter expense line details.'
        }
        size="lg"
        footer={
          <div className="flex flex-wrap justify-between gap-2">
            {!editId && modalStep === 2 ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => setModalStep(1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy hover:bg-white disabled:opacity-50"
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={closeModal}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>
              {!editId && modalStep === 1 ? (
                <button
                  type="button"
                  disabled={!modalBudgetId}
                  onClick={() => setModalStep(2)}
                  className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveLine()}
                  className="btn-primary disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editId ? 'Update Line' : 'Allocate Line'}
                </button>
              )}
            </div>
          </div>
        }
      >
        {!editId && modalStep === 1 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-navy/80">
              Select an <strong>approved budget</strong> first to avoid allocating expenses to the wrong period.
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                Budget <span className="text-red-500">*</span>
              </span>
              <select
                value={modalBudgetId}
                onChange={(e) => setModalBudgetId(e.target.value)}
                className="input"
              >
                <option value="">Select budget…</option>
                {approvedBudgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.budgetCode} — {b.title} ({b.academicYear} · {b.term})
                  </option>
                ))}
              </select>
            </label>
            {approvedBudgets.length === 0 ? (
              <p className="text-sm text-muted">No approved budgets available. Create and approve a budget first.</p>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                Line name <span className="text-red-500">*</span>
              </span>
              <input
                value={form.lineName}
                onChange={(e) => setForm((f) => ({ ...f, lineName: e.target.value }))}
                placeholder="e.g. Laboratory supplies"
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="input"
              >
                {(options?.categories ?? []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Department</span>
              <select
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className="input"
              >
                {(options?.departments ?? []).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Priority</span>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="input"
              >
                {(options?.priorities ?? ['High', 'Medium', 'Low']).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                Planned amount (RWF)
              </span>
              <input
                type="number"
                min={0}
                value={form.plannedAmountRwf}
                onChange={(e) => setForm((f) => ({ ...f, plannedAmountRwf: e.target.value }))}
                placeholder="0"
                className="input"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Optional notes…"
                className="input resize-none"
              />
            </label>
          </div>
        )}
      </BudgetModal>
    </div>
  );
}
