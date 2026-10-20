'use client';

import { useState } from 'react';
import { CreditCard, Download, ChevronDown, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { KpiCard, StatsGrid } from '@/components/shared/stat-card';
import { useStudentFetch } from '@/hooks/use-fetch';
import { useAuth } from '@/contexts/auth-context';
import { formatCurrency, formatShortDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { downloadReceiptAsPdf, downloadStatementAsPdf } from '@/utils/download-fee-pdfs';
import { loadParentReceipt } from '@/utils/parent-receipt';
import type { SchoolBranding } from '@/utils/fee-documents';

interface FeeStatement {
  id: string;
  term: string;
  academicYear?: string;
  description: string;
  items?: Array<{ description: string; amount: number }>;
  amount: number;
  paid: number;
  balance: number;
  status: string;
  dueDate: string;
}

interface FeePayment {
  id: string;
  date: string;
  description: string;
  amount: number;
  method: string;
  reference: string;
  receiptUrl?: string | null;
  receiptNumber?: string | null;
  studentName?: string | null;
  studentCode?: string | null;
  className?: string | null;
  academicYear?: string | null;
  term?: string | null;
  remainingBalance?: number;
  lineItems?: Array<{ description: string; amount: number }>;
}

interface FeesResponse {
  branding?: SchoolBranding | null;
  studentName?: string | null;
  studentCode?: string | null;
  className?: string | null;
  academicYear?: string | null;
  term?: string | null;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  currency: string;
  statements: FeeStatement[];
  payments: FeePayment[];
}

function statusBadge(status: string) {
  const styles: Record<string, { pill: string; dot: string }> = {
    PAID: { pill: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    PARTIAL: { pill: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
    UNPAID: { pill: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
    OVERDUE: { pill: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  };
  const s = styles[status] ?? { pill: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', s.pill)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default function FeesPage() {
  const { data, loading, error } = useStudentFetch<FeesResponse>('/fees');
  const { summary, linkedStudents, activeStudentId } = useAuth();
  const [activeTab, setActiveTab] = useState<'statement' | 'payments'>('statement');
  const [termFilter, setTermFilter] = useState('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const statements = data?.statements ?? [];
  const payments = data?.payments ?? [];
  const child =
    linkedStudents.find((s) => s.id === activeStudentId) ??
    (summary?.student
      ? { fullName: summary.student.fullName, shuleCode: summary.student.shuleCode, className: summary.student.class }
      : null);

  const uniqueTerms = ['All', ...Array.from(new Set(statements.map((s) => s.term)))];
  const filteredStatements = termFilter === 'All' ? statements : statements.filter((s) => s.term === termFilter);

  async function downloadStatement() {
    if (!data) return;
    setBusy(true);
    try {
      await downloadStatementAsPdf(
        {
          studentName: data.studentName || child?.fullName || 'Student',
          studentCode: data.studentCode || child?.shuleCode,
          className: data.className || child?.className,
          academicYear: data.academicYear,
          term: termFilter === 'All' ? data.term : termFilter,
          totalBilled: data.totalBilled,
          totalPaid: data.totalPaid,
          outstanding: data.outstanding,
          overdue: data.overdue,
          statements: filteredStatements,
          payments,
        },
        data.branding ?? null
      );
    } finally {
      setBusy(false);
    }
  }

  async function downloadPaymentPdf(payment: FeePayment) {
    setBusy(true);
    try {
      const { receipt, branding } = await loadParentReceipt(payment, {
        studentName: data?.studentName || child?.fullName,
        studentCode: data?.studentCode || child?.shuleCode,
        className: data?.className || child?.className,
        branding: data?.branding,
      });
      await downloadReceiptAsPdf(receipt, branding);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Fee Management"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 px-4 py-2 text-sm font-semibold text-navy">
              <CreditCard className="size-4 text-primary" />
              {data ? formatCurrency(data.outstanding) : '—'} outstanding
            </div>
            {(data?.outstanding ?? 0) > 0 && (
              <a
                href="/shulecard"
                className="inline-flex items-center gap-2 rounded-xl bg-[#000435] px-4 py-2 text-sm font-semibold text-white"
              >
                Pay now
              </a>
            )}
            <button
              type="button"
              disabled={!data || busy}
              onClick={() => void downloadStatement()}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-navy disabled:opacity-60"
            >
              <Download className="size-4" /> {busy ? 'Preparing…' : 'Download statement'}
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <StatsGrid>
        <KpiCard label="Total Billed" value={loading ? '—' : formatCurrency(data?.totalBilled ?? 0)} icon={<CreditCard />} accent="blue" />
        <KpiCard label="Total Paid" value={loading ? '—' : formatCurrency(data?.totalPaid ?? 0)} icon={<CheckCircle2 />} accent="emerald" />
        <KpiCard
          label="Outstanding"
          value={loading ? '—' : formatCurrency(data?.outstanding ?? 0)}
          icon={<Clock />}
          accent={(data?.outstanding ?? 0) > 0 ? 'red' : 'emerald'}
          className={(data?.outstanding ?? 0) > 0 ? 'text-red-600' : undefined}
        />
        <KpiCard label="Overdue" value={loading ? '—' : formatCurrency(data?.overdue ?? 0)} icon={<AlertCircle />} accent={(data?.overdue ?? 0) > 0 ? 'red' : 'slate'} />
      </StatsGrid>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<AlertCircle className="text-red-500" />} title="Unable to load fee data" description={error} />
      ) : statements.length === 0 ? (
        <EmptyState title="No fee statements yet" description="Fee statements for your child will appear here when published by the school." />
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 rounded-lg border bg-gray-50 p-1 w-fit">
            <button onClick={() => setActiveTab('statement')} className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${activeTab === 'statement' ? 'bg-white shadow-sm text-navy' : 'text-muted-foreground hover:text-navy'}`}>
              Fee Statement
            </button>
            <button onClick={() => setActiveTab('payments')} className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${activeTab === 'payments' ? 'bg-white shadow-sm text-navy' : 'text-muted-foreground hover:text-navy'}`}>
              Payment History
            </button>
          </div>

          {/* Fee Statement */}
          {activeTab === 'statement' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button onClick={() => setFilterOpen(!filterOpen)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-navy transition-all hover:border-slate-300 hover:bg-slate-50">
                    {termFilter}
                    <ChevronDown className={`h-4 w-4 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {filterOpen && (
                    <div className="absolute left-0 z-50 mt-2 w-48 rounded-xl border bg-white shadow-lg ring-1 ring-black/5">
                      {uniqueTerms.map((term) => (
                        <button key={term} onClick={() => { setTermFilter(term); setFilterOpen(false); }} className={`flex w-full items-center px-4 py-2.5 text-sm text-left transition-colors hover:bg-gray-50 ${term === termFilter ? 'font-medium text-blue-600' : 'text-navy'}`}>
                          {term}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="hr-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/80">
                        <th className="text-left px-6 py-3 font-semibold text-navy">Term</th>
                        <th className="text-left px-4 py-3 font-semibold text-navy">Description</th>
                        <th className="text-right px-4 py-3 font-semibold text-navy">Amount</th>
                        <th className="text-right px-4 py-3 font-semibold text-navy">Paid</th>
                        <th className="text-right px-4 py-3 font-semibold text-navy">Balance</th>
                        <th className="text-center px-4 py-3 font-semibold text-navy">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStatements.map((item) => (
                        <tr key={item.id} className="border-b border-border/70 transition hover:bg-slate-50/60 last:border-0">
                          <td className="px-6 py-3.5 text-muted">{item.term}</td>
                          <td className="px-4 py-3.5 font-medium text-navy">{item.description}</td>
                          <td className="px-4 py-3.5 text-right text-muted">{formatCurrency(item.amount)}</td>
                          <td className="px-4 py-3.5 text-right font-medium text-green-600">{formatCurrency(item.paid)}</td>
                          <td className={`px-4 py-3.5 text-right font-medium ${item.balance > 0 ? 'text-red-600' : 'text-navy'}`}>{formatCurrency(item.balance)}</td>
                          <td className="px-4 py-3.5 text-center">{statusBadge(item.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Payment History */}
          {activeTab === 'payments' && (
            payments.length === 0 ? (
              <EmptyState title="No payments recorded" description="Payments made for your child will appear here." />
            ) : (
              <div className="hr-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/80">
                        <th className="text-left px-6 py-3 font-semibold text-navy">Date</th>
                        <th className="text-left px-4 py-3 font-semibold text-navy">Description</th>
                        <th className="text-right px-4 py-3 font-semibold text-navy">Amount</th>
                        <th className="text-center px-4 py-3 font-semibold text-navy">Method</th>
                        <th className="text-center px-4 py-3 font-semibold text-navy">Reference</th>
                        <th className="text-center px-4 py-3 font-semibold text-navy">Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b border-border/70 transition hover:bg-slate-50/60 last:border-0">
                          <td className="px-6 py-3.5 text-muted">{formatShortDate(payment.date)}</td>
                          <td className="px-4 py-3.5 font-medium text-navy">{payment.description}</td>
                          <td className="px-4 py-3.5 text-right font-semibold text-green-600">{formatCurrency(payment.amount)}</td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{payment.method}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center font-mono text-xs text-muted">{payment.reference || '—'}</td>
                          <td className="px-4 py-3.5 text-center">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void downloadPaymentPdf(payment)}
                              className="inline-flex rounded-lg p-2 text-blue-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                              title="Download modern receipt"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
