'use client';

import { useEffect, useState } from 'react';
import { budgetApi, unwrap } from '@/services/budget-api';
import { BudgetSelector } from '@/components/budget-selector';
import { BudgetDataTable, type BudgetTableColumn } from '@/components/budget-data-table';
import { useToast } from '@/shared/notifications';
import { formatRwf } from '@/utils/format';
import { getApiErrorMessage } from '@/utils/api-error';
import type { DepartmentAgg, SchoolBudget } from '@/types';

export function DepartmentsView() {
  const toast = useToast();
  const [budgets, setBudgets] = useState<SchoolBudget[]>([]);
  const [budgetId, setBudgetId] = useState('');
  const [rows, setRows] = useState<DepartmentAgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [bRes, dRes] = await Promise.all([
          budgetApi.budgets(),
          budgetApi.departments(budgetId || undefined),
        ]);
        setBudgets(unwrap(bRes.data));
        setRows(unwrap(dRes.data));
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to load departments'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetId]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const columns: BudgetTableColumn<DepartmentAgg>[] = [
    {
      key: 'dept',
      header: 'Department',
      render: (r) => <span className="font-semibold text-navy">{r.department ?? r.label}</span>,
    },
    { key: 'lines', header: 'Lines', render: (r) => r.lines ?? '—' },
    { key: 'planned', header: 'Planned', render: (r) => formatRwf(r.planned) },
    { key: 'used', header: 'Used', render: (r) => formatRwf(r.used) },
    { key: 'remaining', header: 'Remaining', render: (r) => formatRwf(r.remaining) },
    {
      key: 'pct',
      header: 'Usage %',
      render: (r) => `${r.usagePercent ?? 0}%`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy sm:text-2xl">Departments</h1>
          <p className="mt-1 text-sm text-muted">Aggregated planned vs used spend by department.</p>
        </div>
        <BudgetSelector budgets={budgets} value={budgetId} onChange={setBudgetId} />
      </div>

      <BudgetDataTable
        columns={columns}
        data={pageRows}
        rowKey={(r) => String(r.department ?? r.label)}
        page={page}
        totalPages={totalPages}
        total={rows.length}
        pageSize={pageSize}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No department allocations yet"
      />
    </div>
  );
}
