'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Calendar, Plus, Receipt, Wallet } from 'lucide-react';
import { budgetApi, unwrap } from '@/services/budget-api';
import { BudgetDataTable, type BudgetTableColumn } from '@/components/budget-data-table';
import { BudgetModal } from '@/components/budget-modal';
import { BudgetFilterBar, FilterSelect } from '@/components/budget-filter-bar';
import { BudgetExportDropdown } from '@/components/budget-export-dropdown';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { useToast } from '@/shared/notifications';
import { useAuth } from '@/contexts/auth-context';
import { formatDate, formatRwf, formatRwfStat } from '@/utils/format';
import { getApiErrorMessage } from '@/utils/api-error';
import type { BudgetLine, BudgetLineUsage, LineOptions, SchoolBudget } from '@/types';

const emptyForm = {
  budgetLineId: '',
  amountRwf: '',
  usageDate: new Date().toISOString().slice(0, 10),
  expenseCategory: '',
  paymentMethod: '',
  paymentBankName: '',
  paymentPhone: '',
  description: '',
};

export function UsageView() {
  const toast = useToast();
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<SchoolBudget[]>([]);
  const [budgetId, setBudgetId] = useState('');
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [usage, setUsage] = useState<BudgetLineUsage[]>([]);
  const [options, setOptions] = useState<LineOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, lRes, uRes, oRes] = await Promise.all([
        budgetApi.budgets(),
        budgetApi.budgetLines(budgetId || undefined),
        budgetApi.listUsage({ budgetId: budgetId || undefined }),
        budgetApi.budgetLineOptions(),
      ]);
      setBudgets(unwrap(bRes.data));
      const lineRows = unwrap(lRes.data);
      setLines(lineRows);
      setUsage(unwrap(uRes.data));
      setOptions(unwrap(oRes.data));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load usage'));
    } finally {
      setLoading(false);
    }
  }, [budgetId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return usage.filter((u) => {
      if (categoryFilter && u.expenseCategory !== categoryFilter) return false;
      if (!q) return true;
      const lineName = u.budgetLine?.lineName ?? '';
      return (
        lineName.toLowerCase().includes(q) ||
        (u.description ?? '').toLowerCase().includes(q) ||
        (u.paymentMethod ?? '').toLowerCase().includes(q)
      );
    });
  }, [usage, search, categoryFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, budgetId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, u) => s + u.amountRwf, 0);
    const thisMonth = filtered.filter((u) => {
      const d = new Date(u.usageDate);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, u) => s + u.amountRwf, 0);
    return { count: filtered.length, total, thisMonth };
  }, [filtered]);

  const exportData = useMemo(
    () =>
      filtered.map((u) => ({
        date: formatDate(u.usageDate),
        line: u.budgetLine?.lineName ?? u.budgetLineId,
        amount: formatRwf(u.amountRwf),
        category: u.expenseCategory ?? '—',
        payment: u.paymentMethod ?? '—',
        description: u.description ?? '—',
      })),
    [filtered]
  );

  const exportColumns = [
    { header: 'Date', accessor: 'date' },
    { header: 'Line', accessor: 'line' },
    { header: 'Amount', accessor: 'amount' },
    { header: 'Category', accessor: 'category' },
    { header: 'Payment', accessor: 'payment' },
    { header: 'Description', accessor: 'description' },
  ];

  function openModal() {
    const activeLines = lines.filter((l) => !l.isFrozen);
    setForm({
      ...emptyForm,
      budgetLineId: activeLines[0]?.id ?? '',
      usageDate: new Date().toISOString().slice(0, 10),
      expenseCategory: options?.categories[0] ?? '',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setForm(emptyForm);
  }

  async function submitUsage() {
    if (!form.budgetLineId) {
      toast.error('Select a budget line');
      return;
    }
    if (!form.amountRwf || Number(form.amountRwf) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await budgetApi.createUsage({
        budgetLineId: form.budgetLineId,
        amountRwf: Number(form.amountRwf) || 0,
        usageDate: form.usageDate,
        expenseCategory: form.expenseCategory || undefined,
        paymentMethod: form.paymentMethod || undefined,
        paymentBankName: form.paymentBankName || undefined,
        paymentPhone: form.paymentPhone || undefined,
        description: form.description || undefined,
      });
      toast.success('Usage registered');
      closeModal();
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to register usage'));
    } finally {
      setSaving(false);
    }
  }

  const columns: BudgetTableColumn<BudgetLineUsage>[] = [
    {
      key: 'date',
      header: 'Date',
      className: 'whitespace-nowrap',
      render: (r) => <span className="text-sm text-navy">{formatDate(r.usageDate)}</span>,
    },
    {
      key: 'line',
      header: 'Expense Line',
      render: (r) => (
        <div>
          <p className="font-semibold text-navy">{r.budgetLine?.lineName ?? r.budgetLineId}</p>
          {r.expenseCategory ? <p className="text-xs text-muted">{r.expenseCategory}</p> : null}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'whitespace-nowrap',
      render: (r) => <span className="font-semibold text-navy">{formatRwf(r.amountRwf)}</span>,
    },
    {
      key: 'method',
      header: 'Payment',
      className: 'hidden sm:table-cell',
      render: (r) => r.paymentMethod ?? '—',
    },
    {
      key: 'desc',
      header: 'Description',
      className: 'hidden md:table-cell max-w-[200px] truncate',
      render: (r) => r.description ?? '—',
    },
  ];

  const selectedBudget = budgets.find((b) => b.id === budgetId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Usage Tracking</h1>
          <p className="mt-1 text-sm text-muted">
            Register spend against approved budget lines and review transaction history.
          </p>
        </div>
        <button type="button" onClick={openModal} className="btn-primary inline-flex items-center gap-2">
          <Plus size={18} />
          Register Usage
        </button>
      </div>

      <StatsGrid columns={3}>
        <StatCard
          label="Total Records"
          value={stats.count}
          icon={<Receipt size={20} />}
          hint={selectedBudget ? selectedBudget.budgetCode : 'All budgets'}
        />
        <StatCard label="Total Spent" value={formatRwfStat(stats.total)} icon={<Wallet size={20} />} />
        <StatCard label="This Month" value={formatRwfStat(stats.thisMonth)} icon={<Calendar size={20} />} />
      </StatsGrid>

      <BudgetFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search lines, descriptions, payment methods…"
        actions={
          <BudgetExportDropdown
            title="Usage Tracking Report"
            columns={exportColumns}
            data={exportData}
            fileName="usage_tracking"
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
        emptyMessage="No usage recorded yet. Register your first transaction."
        emptyAction={
          <button type="button" onClick={openModal} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Register Usage
          </button>
        }
      />

      <BudgetModal
        open={modalOpen}
        onClose={closeModal}
        title="Register Usage"
        description="Record spend against an approved budget line."
        size="lg"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={closeModal}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void submitUsage()}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Activity size={16} />
              {saving ? 'Saving…' : 'Register Usage'}
            </button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Budget line <span className="text-red-500">*</span>
            </span>
            <select
              value={form.budgetLineId}
              onChange={(e) => setForm((f) => ({ ...f, budgetLineId: e.target.value }))}
              className="input"
            >
              <option value="">Select line…</option>
              {lines.map((l) => (
                <option key={l.id} value={l.id} disabled={l.isFrozen}>
                  {l.lineName} — {formatRwf(l.remainingRwf ?? l.plannedAmountRwf - l.usedAmountRwf)} remaining
                  {l.isFrozen ? ' (frozen)' : ''}
                </option>
              ))}
            </select>
            {lines.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                No budget lines available. Allocate expense lines first or select a budget filter.
              </p>
            ) : null}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Amount (RWF) <span className="text-red-500">*</span>
            </span>
            <input
              type="number"
              min={0}
              value={form.amountRwf}
              onChange={(e) => setForm((f) => ({ ...f, amountRwf: e.target.value }))}
              placeholder="0"
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Usage date</span>
            <input
              type="date"
              value={form.usageDate}
              onChange={(e) => setForm((f) => ({ ...f, usageDate: e.target.value }))}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Category</span>
            <select
              value={form.expenseCategory}
              onChange={(e) => setForm((f) => ({ ...f, expenseCategory: e.target.value }))}
              className="input"
            >
              <option value="">Select category…</option>
              {(options?.categories ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Payment method</span>
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              className="input"
            >
              <option value="">Select method…</option>
              {(options?.paymentMethods ?? []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          {form.paymentMethod === 'Mobile Money' ? (
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Phone number</span>
              <input
                value={form.paymentPhone}
                onChange={(e) => setForm((f) => ({ ...f, paymentPhone: e.target.value }))}
                placeholder="+250…"
                className="input"
              />
            </label>
          ) : form.paymentMethod ? (
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Bank name</span>
              <input
                value={form.paymentBankName}
                onChange={(e) => setForm((f) => ({ ...f, paymentBankName: e.target.value }))}
                placeholder="Bank name…"
                className="input"
              />
            </label>
          ) : null}
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="What was purchased or paid for…"
              className="input resize-none"
            />
          </label>
        </div>
      </BudgetModal>
    </div>
  );
}
