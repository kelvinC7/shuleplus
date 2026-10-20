'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  Printer,
  Receipt,
  Wallet,
  X,
} from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { KpiCard, StatsGrid } from '@/components/shared/stat-card';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/services/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { downloadReceiptAsPdf, printReceiptPdf } from '@/utils/download-fee-pdfs';
import { loadParentReceipt } from '@/utils/parent-receipt';
import type { SchoolBranding } from '@/utils/fee-documents';
import { receiptPublicUrl } from '@/utils/receipt-qr';

type Txn = {
  id: string;
  transactionId?: string;
  date: string;
  studentId?: string;
  studentCode?: string;
  studentName?: string;
  className?: string | null;
  academicYear?: string | null;
  term?: string | null;
  description?: string;
  amount: number;
  previousBalance?: number;
  remainingBalance?: number;
  method?: string;
  status?: string;
  receiptNumber?: string | null;
  receiptUrl?: string | null;
  recordedBy?: string | null;
};

type Payload = {
  branding?: SchoolBranding | null;
  currency: string;
  totalPaid: number;
  thisTermPaid: number;
  outstanding: number;
  transactions: number;
  students: Array<{ studentId: string; studentCode: string; studentName: string; className?: string | null }>;
  years?: string[];
  terms?: string[];
  payments: Txn[];
};

function statusMeta(status?: string) {
  const s = (status ?? 'SUCCESSFUL').toUpperCase();
  if (s === 'SUCCESSFUL' || s === 'COMPLETED' || s === 'PAID') {
    return { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700' };
  }
  if (s === 'PENDING') return { label: 'Pending', cls: 'bg-amber-50 text-amber-800' };
  if (s === 'FAILED') return { label: 'Failed', cls: 'bg-rose-50 text-rose-700' };
  if (s === 'REVERSED') return { label: 'Reversed', cls: 'bg-slate-100 text-slate-700' };
  return { label: status ?? '—', cls: 'bg-slate-100 text-slate-600' };
}

function inDateRange(iso: string, range: string, customFrom: string, customTo: string) {
  const d = new Date(iso);
  const now = new Date();
  if (range === 'today') {
    return d.toDateString() === now.toDateString();
  }
  if (range === 'month') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  if (range === 'custom' && customFrom) {
    const from = new Date(customFrom);
    const to = customTo ? new Date(customTo) : now;
    to.setHours(23, 59, 59, 999);
    return d >= from && d <= to;
  }
  return true;
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-muted">Loading transactions…</div>}>
      <TransactionsInner />
    </Suspense>
  );
}

function TransactionsInner() {
  const search = useSearchParams();
  const { linkedStudents, activeStudentId } = useAuth();
  const studentKey = linkedStudents.map((s) => `${s.id}:${s.shuleCode}`).join('|');
  const [child, setChild] = useState<'ALL' | string>(activeStudentId || 'ALL');
  const [year, setYear] = useState('');
  const [term, setTerm] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [dateRange, setDateRange] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Txn | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (activeStudentId) setChild(activeStudentId);
  }, [activeStudentId]);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (child === 'ALL') {
      params.set('allChildren', '1');
    } else {
      const stu = linkedStudents.find((s) => s.id === child);
      params.set('studentId', child);
      if (stu?.shuleCode) params.set('studentCode', stu.shuleCode);
    }
    if (year) params.set('academicYear', year);
    if (term !== 'ALL') params.set('term', term);
    api
      .get(`/fees/transactions?${params}`)
      .then((res) => setData(res.data.data))
      .catch(() => setError('Could not load transactions'))
      .finally(() => setLoading(false));
  }, [child, year, term, studentKey]);

  useEffect(() => {
    const deep = search.get('id');
    if (deep && data?.payments) {
      const match = data.payments.find((p) => p.id === deep || p.transactionId === deep || p.receiptNumber === deep);
      if (match) setSelected(match);
    }
  }, [search, data]);

  const rows = useMemo(() => {
    const list = data?.payments ?? [];
    return list.filter((p) => {
      if (status !== 'ALL' && (p.status ?? 'SUCCESSFUL').toUpperCase() !== status) return false;
      if (!inDateRange(p.date, dateRange, customFrom, customTo)) return false;
      if (dateRange === 'term' && term !== 'ALL' && p.term && p.term !== term) return false;
      return true;
    });
  }, [data, status, dateRange, customFrom, customTo, term]);

  const years = data?.years?.length ? data.years : [...new Set((data?.payments ?? []).map((p) => p.academicYear).filter(Boolean) as string[])];
  const terms = data?.terms?.length ? data.terms : [...new Set((data?.payments ?? []).map((p) => p.term).filter(Boolean) as string[])];
  const children = (() => {
    const fromLinks = linkedStudents.map((s) => ({
      studentId: s.id,
      studentCode: s.shuleCode,
      studentName: s.fullName,
      className: s.className,
    }));
    const fromApi = data?.students ?? [];
    const byId = new Map(fromLinks.map((s) => [s.studentId, s]));
    for (const s of fromApi) {
      if (!byId.has(s.studentId)) byId.set(s.studentId, { ...s, className: s.className ?? '' });
    }
    return Array.from(byId.values());
  })();

  async function receiptDoc(txn: Txn) {
    return loadParentReceipt(txn, { branding: data?.branding ?? null });
  }

  async function viewReceipt(txn: Txn) {
    const number = txn.receiptNumber;
    const url = txn.receiptUrl || (number ? receiptPublicUrl(number) : '');
    if (url) {
      window.open(url, '_blank', 'noopener');
      return;
    }
    await downloadPdf(txn);
  }

  async function downloadPdf(txn: Txn) {
    setBusy(true);
    try {
      const { receipt, branding } = await receiptDoc(txn);
      await downloadReceiptAsPdf(receipt, branding);
    } finally {
      setBusy(false);
    }
  }

  async function printPdf(txn: Txn) {
    setBusy(true);
    try {
      const { receipt, branding } = await receiptDoc(txn);
      await printReceiptPdf(receipt, branding);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Transactions"
      />

      <StatsGrid>
        <KpiCard label="Total Paid" value={loading ? '—' : formatCurrency(data?.totalPaid ?? 0)} icon={<Wallet />} accent="emerald" />
        <KpiCard label="This Term" value={loading ? '—' : formatCurrency(data?.thisTermPaid ?? 0)} icon={<CreditCard />} accent="blue" />
        <KpiCard label="Outstanding" value={loading ? '—' : formatCurrency(data?.outstanding ?? 0)} icon={<Clock />} accent={(data?.outstanding ?? 0) > 0 ? 'red' : 'emerald'} />
        <KpiCard label="Transactions" value={loading ? '—' : String(data?.transactions ?? rows.length)} icon={<Receipt />} accent="amber" />
      </StatsGrid>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-white p-4">
        <label className="min-w-[180px] text-xs font-bold uppercase text-muted">
          Student
          <select className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold text-navy" value={child} onChange={(e) => setChild(e.target.value)}>
            <option value="ALL">All Children</option>
            {children.map((s) => (
              <option key={s.studentId} value={s.studentId}>
                {s.studentName}{s.className ? ` — ${s.className}` : ''}
              </option>
            ))}
            {activeStudentId && !children.some((s) => s.studentId === activeStudentId) ? (
              <option value={activeStudentId}>Current child</option>
            ) : null}
          </select>
        </label>
        <label className="min-w-[150px] text-xs font-bold uppercase text-muted">
          Academic Year
          <select className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold text-navy" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="min-w-[130px] text-xs font-bold uppercase text-muted">
          Term
          <select className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold text-navy" value={term} onChange={(e) => setTerm(e.target.value)}>
            <option value="ALL">All Terms</option>
            {terms.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-1">
          {['ALL', 'SUCCESSFUL', 'PENDING', 'FAILED', 'REVERSED'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn('rounded-full px-3 py-1.5 text-xs font-semibold', status === s ? 'bg-navy text-primary' : 'border border-border text-muted')}
            >
              {s === 'ALL' ? 'All' : s === 'SUCCESSFUL' ? 'Successful' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {[
            ['all', 'All dates'],
            ['today', 'Today'],
            ['month', 'This Month'],
            ['term', 'This Term'],
            ['custom', 'Custom'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setDateRange(id)}
              className={cn('rounded-full px-3 py-1.5 text-xs font-semibold', dateRange === id ? 'bg-primary/15 text-navy' : 'border border-border text-muted')}
            >
              {label}
            </button>
          ))}
        </div>
        {dateRange === 'custom' ? (
          <div className="flex gap-2">
            <input type="date" className="rounded-xl border border-border px-2 py-1.5 text-sm" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <input type="date" className="rounded-xl border border-border px-2 py-1.5 text-sm" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      ) : error ? (
        <EmptyState title="Unable to load transactions" description={error} />
      ) : !rows.length ? (
        <EmptyState title="No transactions yet" description="When the school records a payment for your child, it appears here automatically." />
      ) : (
        <div className="hr-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/80">
                  {['Date', 'Student', 'Payment', 'Amount', 'Method', 'Status', 'Receipt'].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold text-navy">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const st = statusMeta(p.status);
                  return (
                    <tr key={p.id} className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-slate-50/70" onClick={() => setSelected(p)}>
                      <td className="px-4 py-3.5 text-muted">{formatDate(p.date)}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-navy">{p.studentName || 'Student'}</p>
                        <p className="text-xs text-muted">{[p.studentCode, p.className].filter(Boolean).join(' · ')}</p>
                      </td>
                      <td className="px-4 py-3.5 text-navy">{p.description || 'School Fees'}</td>
                      <td className="px-4 py-3.5 font-bold text-emerald-700">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3.5"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">{p.method || '—'}</span></td>
                      <td className="px-4 py-3.5"><span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', st.cls)}>✓ {st.label}</span></td>
                      <td className="px-4 py-3.5">
                        <button type="button" className="font-semibold text-navy underline-offset-2 hover:underline" onClick={(e) => { e.stopPropagation(); setSelected(p); }}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy/40">
          <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <p className="text-sm font-bold uppercase tracking-wide text-muted">Transaction details</p>
              <button type="button" className="rounded-lg p-1 hover:bg-slate-100" onClick={() => setSelected(null)}><X size={16} /></button>
            </div>
            <div className="space-y-5 p-5">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-800"><CheckCircle2 size={16} /> Payment Successful</p>
                <p className="mt-1 text-3xl font-extrabold text-navy">{formatCurrency(selected.amount)}</p>
              </div>
              <div className="space-y-2 text-sm">
                <Row label="Transaction ID" value={selected.transactionId || selected.id} />
                <Row label="Student" value={selected.studentName || '—'} />
                <Row label="Student Code" value={selected.studentCode || '—'} />
                <Row label="Class" value={selected.className || '—'} />
                <Row label="Academic Year" value={selected.academicYear || '—'} />
                <Row label="Term" value={selected.term || '—'} />
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase text-muted">Payment information</p>
                <div className="space-y-2 text-sm">
                  <Row label="Payment Type" value={selected.description || 'School Fees'} />
                  <Row label="Amount" value={formatCurrency(selected.amount)} />
                  {selected.previousBalance != null ? <Row label="Previous Balance" value={formatCurrency(selected.previousBalance)} /> : null}
                  <Row label="Amount Paid" value={formatCurrency(selected.amount)} />
                  {selected.remainingBalance != null ? <Row label="Remaining Balance" value={formatCurrency(selected.remainingBalance)} /> : null}
                  <Row label="Payment Method" value={selected.method || '—'} />
                  <Row label="Payment Date" value={formatDate(selected.date)} />
                  <Row label="Recorded By" value={selected.recordedBy || 'School Finance Office'} />
                  <Row label="Status" value={statusMeta(selected.status).label} />
                  {selected.receiptNumber ? <Row label="Receipt" value={selected.receiptNumber} /> : null}
                </div>
              </div>
              <div className="grid gap-2">
                <button type="button" disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-primary disabled:opacity-60" onClick={() => void viewReceipt(selected)}>
                  <FileText size={16} /> View Receipt
                </button>
                <button type="button" disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60" onClick={() => void downloadPdf(selected)}>
                  <Download size={16} /> {busy ? 'Preparing…' : 'Download PDF'}
                </button>
                <button type="button" disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60" onClick={() => void printPdf(selected)}>
                  <Printer size={16} /> Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5">
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold text-navy">{value}</span>
    </div>
  );
}
