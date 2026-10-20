'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { api } from '@/services/api';
import { FeesDataTable, type FeesTableColumn } from '@/components/fees-data-table';
import { FeesPageTitle } from '@/components/fees-page-title';
import { StatusBadge } from '@/components/status-badge';
import type { PaymentRow } from '@/types';

export function PaymentsView() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/payments', { params: { page, pageSize } });
        setRows(data.data ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  const columns: FeesTableColumn<PaymentRow>[] = [
    { key: 'num', header: 'Payment', render: (r) => (
      <div>
        <p className="font-semibold text-navy">{r.paymentNumber}</p>
        <p className="text-xs text-muted">{r.receipt?.receiptNumber ?? '—'}</p>
      </div>
    )},
    { key: 'student', header: 'Student', render: (r) => (
      <div>
        <p className="font-semibold text-navy">{r.studentName}</p>
        <p className="text-xs text-muted">{r.className ?? '—'}</p>
      </div>
    )},
    { key: 'amount', header: 'Amount', render: (r) => (
      <span className="font-bold">{Number(r.amount).toLocaleString()} RWF</span>
    )},
    { key: 'method', header: 'Method', render: (r) => r.method.replace(/_/g, ' ') },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'date', header: 'Paid at', render: (r) => new Date(r.paidAt).toLocaleString() },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <FeesPageTitle className="text-lg font-bold text-navy">Payment Management</FeesPageTitle>
          <p className="text-sm text-muted">Cash, MoMo, bank, QR, POS & wallet payments</p>
        </div>
        <Link href="/payments/new" className="btn-primary"><Plus size={16} /> Record Payment</Link>
      </div>
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
        emptyMessage="No payments recorded"
      />
    </div>
  );
}
