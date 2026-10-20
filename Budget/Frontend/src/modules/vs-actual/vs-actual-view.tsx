'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Scale, TrendingDown, Wallet } from 'lucide-react';
import { budgetApi, unwrap } from '@/services/budget-api';
import { BudgetDataTable, type BudgetTableColumn } from '@/components/budget-data-table';
import { BudgetFilterBar, FilterSelect } from '@/components/budget-filter-bar';
import { BudgetExportDropdown } from '@/components/budget-export-dropdown';
import { BudgetProgressBar } from '@/components/budget-progress-bar';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { useToast } from '@/shared/notifications';
import { useAuth } from '@/contexts/auth-context';
import { formatRwf, formatRwfStat } from '@/utils/format';
import { getApiErrorMessage } from '@/utils/api-error';
import type { SchoolBudget, VsActualRow } from '@/types';

export function VsActualView() {
  const toast = useToast();
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<SchoolBudget[]>([]);
  const [budgetId, setBudgetId] = useState('');
  const [rows, setRows] = useState<VsActualRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, vRes] = await Promise.all([
        budgetApi.budgets(),
        budgetApi.vsActual(budgetId || undefined),
      ]);
      setBudgets(unwrap(bRes.data));
      setRows(unwrap(vRes.data));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load variance'));
    } finally {
      setLoading(false);
    }
  }, [budgetId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (severityFilter && r.severity !== severityFilter) return false;
      if (!q) return true;
      return (
        r.lineName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q)
      );
    });
  }, [rows, search, severityFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, severityFilter, budgetId]);

  const stats = useMemo(() => {
    const planned = filtered.reduce((s, r) => s + r.planned, 0);
    const actual = filtered.reduce((s, r) => s + r.actual, 0);
    const remaining = Math.max(0, planned - actual);
    const overBudget = filtered.filter((r) => r.actual > r.planned).length;
    const utilization = planned > 0 ? Math.round((actual / planned) * 100) : 0;
    return { planned, actual, remaining, overBudget, utilization, lines: filtered.length };
  }, [filtered]);

  const topLines = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => {
          const pctA = a.planned > 0 ? a.actual / a.planned : 0;
          const pctB = b.planned > 0 ? b.actual / b.planned : 0;
          return pctB - pctA;
        })
        .slice(0, 5),
    [filtered]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportData = useMemo(
    () =>
      filtered.map((r) => ({
        line: r.lineName,
        department: r.department,
        category: r.category,
        budgeted: formatRwf(r.planned),
        used: formatRwf(r.actual),
        remaining: formatRwf(Math.max(0, r.planned - r.actual)),
        variance: formatRwf(r.variance),
        variancePct: `${r.variancePercent}%`,
        status: r.severity,
      })),
    [filtered]
  );

  const exportColumns = [
    { header: 'Line', accessor: 'line' },
    { header: 'Department', accessor: 'department' },
    { header: 'Category', accessor: 'category' },
    { header: 'Budgeted', accessor: 'budgeted' },
    { header: 'Used', accessor: 'used' },
    { header: 'Remaining', accessor: 'remaining' },
    { header: 'Variance', accessor: 'variance' },
    { header: 'Variance %', accessor: 'variancePct' },
    { header: 'Status', accessor: 'status' },
  ];

  const columns: BudgetTableColumn<VsActualRow>[] = [
    {
      key: 'line',
      header: 'Expense Line',
      render: (r) => (
        <div>
          <p className="font-semibold text-navy">{r.lineName}</p>
          <p className="text-xs text-muted">
            {r.department} · {r.category}
          </p>
        </div>
      ),
    },
    {
      key: 'planned',
      header: 'Budgeted',
      className: 'whitespace-nowrap',
      render: (r) => <span className="font-semibold text-navy">{formatRwf(r.planned)}</span>,
    },
    {
      key: 'actual',
      header: 'Used',
      className: 'whitespace-nowrap',
      render: (r) => formatRwf(r.actual),
    },
    {
      key: 'progress',
      header: 'Utilization',
      className: 'min-w-[150px]',
      render: (r) => <BudgetProgressBar used={r.actual} planned={r.planned} />,
    },
    {
      key: 'remaining',
      header: 'Remaining',
      className: 'whitespace-nowrap hidden sm:table-cell',
      render: (r) => (
        <span className={r.planned - r.actual < 0 ? 'font-semibold text-red-600' : 'text-navy'}>
          {formatRwf(Math.max(0, r.planned - r.actual))}
        </span>
      ),
    },
    {
      key: 'variance',
      header: 'Variance',
      className: 'whitespace-nowrap hidden md:table-cell',
      render: (r) => (
        <span className={r.variance < 0 ? 'font-semibold text-red-600' : 'text-navy'}>
          {formatRwf(r.variance)} ({r.variancePercent}%)
        </span>
      ),
    },
    {
      key: 'severity',
      header: 'Status',
      render: (r) => <StatusBadge status={r.severity} />,
    },
  ];

  const selectedBudget = budgets.find((b) => b.id === budgetId);
  const severities = [...new Set(rows.map((r) => r.severity))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Budget vs Usage Tracking</h1>
        <p className="mt-1 text-sm text-muted">
          Compare planned budget against registered usage — line-level utilization and remaining balances.
        </p>
      </div>

      <StatsGrid columns={4}>
        <StatCard
          label="Total Budgeted"
          value={formatRwfStat(stats.planned)}
          icon={<Wallet size={20} />}
          hint={selectedBudget ? `${selectedBudget.budgetCode}` : `${stats.lines} lines`}
        />
        <StatCard label="Total Used" value={formatRwfStat(stats.actual)} icon={<TrendingDown size={20} />} />
        <StatCard
          label="Remaining"
          value={formatRwfStat(stats.remaining)}
          icon={<Scale size={20} />}
          hint={`${stats.utilization}% utilized`}
        />
        <StatCard
          label="Over Budget"
          value={stats.overBudget}
          icon={<AlertTriangle size={20} />}
          valueClassName={stats.overBudget > 0 ? 'text-red-600' : 'text-[#000435]'}
          hint="Lines exceeding plan"
        />
      </StatsGrid>

      {topLines.length > 0 ? (
        <div className="hr-card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy">Top utilization by line</h2>
          </div>
          <div className="space-y-4">
            {topLines.map((r) => {
              const pct = r.planned > 0 ? Math.min(100, Math.round((r.actual / r.planned) * 100)) : 0;
              return (
                <div key={r.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium text-navy">{r.lineName}</span>
                    <span className="shrink-0 text-muted">
                      {formatRwf(r.actual)} / {formatRwf(r.planned)}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        pct >= 100 ? 'bg-red-500' : pct >= 85 ? 'bg-amber-500' : 'bg-primary'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <BudgetFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search lines, departments, categories…"
        actions={
          <BudgetExportDropdown
            title="Budget vs Usage Tracking Report"
            columns={exportColumns}
            data={exportData}
            fileName="budget_vs_usage"
            userName={user?.email}
            orientation="landscape"
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
        <FilterSelect label="Status" value={severityFilter} onChange={setSeverityFilter}>
          <option value="">All statuses</option>
          {severities.map((s) => (
            <option key={s} value={s}>{s}</option>
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
        emptyMessage="No variance data available for the selected budget."
      />
    </div>
  );
}
