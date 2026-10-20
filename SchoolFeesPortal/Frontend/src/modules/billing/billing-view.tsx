'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { api } from '@/services/api';
import { FeesDataTable, type FeesTableColumn } from '@/components/fees-data-table';
import { FeesPageTitle } from '@/components/fees-page-title';
import { StatusBadge } from '@/components/status-badge';
import type { StudentBill } from '@/types';

export function BillingView() {
  const [rows, setRows] = useState<StudentBill[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const pageSize = 10;

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/bills', { params: { page, pageSize, search } });
        setRows(data.data ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } finally {
        setLoading(false);
      }
    })();
  }, [page, search]);

  const columns: FeesTableColumn<StudentBill>[] = [
    { key: 'bill', header: 'Bill', render: (r) => (
      <div>
        <p className="font-semibold text-navy">{r.billNumber}</p>
        <p className="text-xs text-muted">{r.academicYear} · {r.term}</p>
      </div>
    )},
    { key: 'student', header: 'Student', render: (r) => (
      <div>
        <p className="font-semibold text-navy">{r.studentName}</p>
        <p className="text-xs text-muted">{r.studentCode}</p>
      </div>
    )},
    { key: 'class', header: 'Class', render: (r) => r.className },
    { key: 'net', header: 'Net', render: (r) => `${Number(r.netAmount).toLocaleString()} RWF` },
    { key: 'paid', header: 'Paid', render: (r) => `${Number(r.paidAmount).toLocaleString()} RWF` },
    { key: 'balance', header: 'Balance', render: (r) => (
      <span className="font-bold text-navy">{Number(r.balance).toLocaleString()} RWF</span>
    )},
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <FeesPageTitle className="text-lg font-bold text-navy">Student Billing</FeesPageTitle>
          <p className="text-sm text-muted">Automatic, bulk, class & installment billing</p>
        </div>
        <Link href="/billing/new" className="btn-primary"><Plus size={16} /> Create Bill</Link>
      </div>
      <input
        className="input max-w-md"
        placeholder="Search student, bill number…"
        value={search}
        onChange={(e) => { setPage(1); setSearch(e.target.value); }}
      />
      <FeesDataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No bills found"
      />
    </div>
  );
}
