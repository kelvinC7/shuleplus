'use client';

import { useEffect, useState } from 'react';
import { budgetApi, unwrap } from '@/services/budget-api';
import { BudgetSelector } from '@/components/budget-selector';
import { BudgetDataTable, type BudgetTableColumn } from '@/components/budget-data-table';
import { useToast } from '@/shared/notifications';
import { formatDate } from '@/utils/format';
import { getApiErrorMessage } from '@/utils/api-error';
import type { AuditLog, SchoolBudget } from '@/types';

export function AuditLogsView() {
  const toast = useToast();
  const [budgets, setBudgets] = useState<SchoolBudget[]>([]);
  const [budgetId, setBudgetId] = useState('');
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [bRes, aRes] = await Promise.all([
          budgetApi.budgets(),
          budgetApi.auditLogs(budgetId || undefined),
        ]);
        setBudgets(unwrap(bRes.data));
        setRows(unwrap(aRes.data));
        setPage(1);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to load audit logs'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetId]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const columns: BudgetTableColumn<AuditLog>[] = [
    {
      key: 'when',
      header: 'When',
      render: (r) => formatDate(r.createdAt),
    },
    {
      key: 'action',
      header: 'Action',
      render: (r) => <span className="font-semibold text-navy">{r.action}</span>,
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (r) => r.actorRole ?? r.actorId ?? '—',
    },
    {
      key: 'budget',
      header: 'Budget',
      render: (r) => r.budgetId?.slice(0, 8) ?? '—',
    },
    {
      key: 'details',
      header: 'Details',
      render: (r) => (
        <span className="line-clamp-2 max-w-xs text-xs text-muted">
          {r.details ? JSON.stringify(r.details) : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy sm:text-2xl">Audit Logs</h1>
          <p className="mt-1 text-sm text-muted">Governance trail for budget actions.</p>
        </div>
        <BudgetSelector budgets={budgets} value={budgetId} onChange={setBudgetId} />
      </div>

      <BudgetDataTable
        columns={columns}
        data={pageRows}
        rowKey={(r) => r.id}
        page={page}
        totalPages={totalPages}
        total={rows.length}
        pageSize={pageSize}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No audit events yet"
      />
    </div>
  );
}
