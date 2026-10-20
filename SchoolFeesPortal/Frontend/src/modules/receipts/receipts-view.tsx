'use client';

import { useCallback, useEffect, useState } from 'react';
import { QrCode, RefreshCw, Search } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/shared/notifications';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { FeesDataTable, type FeesTableColumn } from '@/components/fees-data-table';
import { ReceiptDetailDrawer } from '@/modules/collections/receipt-detail-drawer';
import { FeesPageTitle } from '@/components/fees-page-title';
import { StudentFinancialDrawer } from '@/modules/collections/student-financial-drawer';

interface Receipt {
  id: string;
  receiptNumber: string;
  studentName: string;
  studentCode?: string | null;
  className?: string | null;
  amountPaid: number;
  outstanding: number;
  method: string;
  qrCode?: string | null;
  issuedAt: string;
  paymentStatus: string;
  reference?: string | null;
}

type Summary = {
  receiptsToday: number;
  amountCollectedToday: number;
  digitalReceipts: number;
  printed: number;
  cancelled: number;
};

export function ReceiptsView() {
  const toast = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Receipt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', method: 'all' });
  const [viewReceiptId, setViewReceiptId] = useState<string | null>(null);
  const [viewStudent, setViewStudent] = useState<{
    studentId: string;
    studentCode?: string | null;
    studentName?: string;
    className?: string | null;
  } | null>(null);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, pageSize };
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.method !== 'all') params.method = filters.method;
      const { data } = await api.get('/receipts', { params });
      setSummary(data.summary ?? null);
      setRows(data.data ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      toast.error('Could not load receipts');
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: FeesTableColumn<Receipt>[] = [
    {
      key: 'num',
      header: 'Receipt No.',
      render: (r) => (
        <div>
          <p className="font-semibold text-navy">{r.receiptNumber}</p>
          <p className="text-xs text-muted">{new Date(r.issuedAt).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      key: 'student',
      header: 'Student',
      render: (r) => (
        <div>
          <p className="font-semibold text-navy">{r.studentName}</p>
          <p className="text-xs text-muted">
            {r.className ?? '—'}
            {r.studentCode ? ` · ${r.studentCode}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'paid',
      header: 'Amount',
      render: (r) => <span className="font-bold tabular-nums">{Number(r.amountPaid).toLocaleString()} RWF</span>,
    },
    { key: 'method', header: 'Method', render: (r) => r.method.replace(/_/g, ' ') },
    {
      key: 'ref',
      header: 'Reference',
      render: (r) => r.reference ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            r.paymentStatus === 'REVERSED' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'
          }`}
        >
          {r.paymentStatus === 'REVERSED' ? 'Voided' : 'Paid'}
        </span>
      ),
    },
    {
      key: 'qr',
      header: 'Verify',
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
          <QrCode size={14} /> {r.qrCode ? 'QR' : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <FeesPageTitle>Digital Receipt & Verification Center</FeesPageTitle>
        <p className="text-sm text-muted">QR verification, smart search & audit-safe reversals</p>
      </div>

      {summary ? (
        <StatsGrid columns={5}>
          <StatCard label="Receipts Today" value={summary.receiptsToday} />
          <StatCard
            label="Amount Collected"
            value={`${(summary.amountCollectedToday / 1_000_000).toFixed(1)}M RWF`}
          />
          <StatCard label="Digital Receipts" value={summary.digitalReceipts} />
          <StatCard label="Printed" value={summary.printed} />
          <StatCard label="Cancelled" value={summary.cancelled} />
        </StatsGrid>
      ) : null}

      <div className="hr-card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm"
              placeholder="Receipt #, student, reference, phone, QR code"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <select
            className="rounded-xl border border-border px-3 py-2 text-sm"
            value={filters.method}
            onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}
          >
            <option value="all">All methods</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="BANK">Bank</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
          </select>
        </div>
        <button type="button" className="btn-secondary text-xs" onClick={() => void load()}>
          <RefreshCw size={14} /> Refresh
        </button>
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
        onRowClick={(r) => setViewReceiptId(r.id)}
        loading={loading}
        emptyMessage="No receipts issued yet"
      />

      <ReceiptDetailDrawer
        receiptId={viewReceiptId}
        onClose={() => setViewReceiptId(null)}
        onOpenStudent={(id) => {
          setViewReceiptId(null);
          const row = rows.find((r) => r.studentCode === id || r.studentName === id);
          setViewStudent({
            studentId: id,
            studentCode: row?.studentCode,
            studentName: row?.studentName,
            className: row?.className,
          });
        }}
      />
      <StudentFinancialDrawer
        studentId={viewStudent?.studentId ?? null}
        studentCode={viewStudent?.studentCode ?? undefined}
        studentName={viewStudent?.studentName}
        className={viewStudent?.className ?? undefined}
        onClose={() => setViewStudent(null)}
        tab="receipts"
      />
    </div>
  );
}
