'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { X, Wallet, CreditCard, Receipt, ChevronRight } from 'lucide-react';
import { api } from '@/services/api';
import { CollectionStatusBadge } from './risk-badge';
import { ReceiptDetailDrawer } from './receipt-detail-drawer';

type FeeLine = {
  id: string;
  description: string;
  amount: number;
  paid: number;
  remaining: number;
};

type PaymentRow = {
  id: string;
  amount: number;
  method: string;
  paidAt: string;
  reference: string | null;
  receiptNumber: string | null;
  receiptId?: string | null;
};

type AccountData = {
  found: boolean;
  structureName?: string;
  academicYear?: string;
  term?: string;
  className?: string;
  billId?: string | null;
  total?: number;
  paid?: number;
  remaining?: number;
  progress?: number;
  feeBreakdown?: FeeLine[];
  payments?: PaymentRow[];
};

type Profile = {
  studentId: string;
  studentName: string;
  className: string | null;
  overview: {
    totalFees: number;
    scholarship: number;
    adjustedFees: number;
    paid: number;
    outstanding: number;
  };
  bills: Array<{
    id: string;
    billNumber: string;
    balance: number;
    academicYear?: string;
    term?: string;
    lineItems: Array<{ description: string; amount: number }>;
  }>;
  payments: Array<{ id: string; amount: number; method: string; paidAt: string }>;
  receipts: Array<{ id: string; receiptNumber: string; amountPaid: number; issuedAt?: string }>;
  installmentPlans: unknown[];
};

type Props = {
  studentId: string | null;
  studentCode?: string;
  academicYear?: string;
  term?: string;
  className?: string;
  studentName?: string;
  onClose: () => void;
  onCollectPayment?: () => void;
  tab?: 'overview' | 'outstanding' | 'receipts' | 'history';
};

export function StudentFinancialDrawer({
  studentId,
  studentCode,
  academicYear,
  term,
  className,
  studentName,
  onClose,
  onCollectPayment,
  tab = 'overview',
}: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(tab);
  const [entered, setEntered] = useState(false);
  const [viewReceiptId, setViewReceiptId] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(tab);
  }, [tab, studentId]);

  useEffect(() => {
    if (!studentId) {
      setProfile(null);
      setAccount(null);
      setEntered(false);
      return;
    }
    setLoading(true);
    setProfile(null);
    setAccount(null);

    const profileReq = api
      .get(`/students/${studentId}/financial-profile`, {
        params: studentCode ? { studentCode } : undefined,
      })
      .then(({ data }) => data.data as Profile)
      .catch(() => null);

    const accountReq =
      studentCode && academicYear && term
        ? api
            .get('/collections/fee-collection/student-account', {
              params: { studentCode, academicYear, term, className, studentName },
            })
            .then(({ data }) => data.data as AccountData)
            .catch(() => null)
        : Promise.resolve(null);

    void Promise.all([profileReq, accountReq])
      .then(([p, a]) => {
        setProfile(p);
        setAccount(a);
      })
      .finally(() => setLoading(false));
    requestAnimationFrame(() => setEntered(true));
  }, [studentId, studentCode, academicYear, term, className, studentName]);

  useEffect(() => {
    if (!studentId) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [studentId]);

  const o = profile?.overview;
  const displayName = studentName ?? profile?.studentName ?? 'Student';
  const displayClass = className ?? profile?.className ?? '—';
  const periodLabel = academicYear && term ? `${displayClass} · ${academicYear} · ${term}` : displayClass;
  const totalFees = account?.total ?? o?.adjustedFees ?? 0;
  const paid = account?.paid ?? o?.paid ?? 0;
  const remaining = account?.remaining ?? o?.outstanding ?? 0;
  const progress = account?.progress ?? (totalFees > 0 ? Math.round((paid / totalFees) * 100) : 0);
  const breakdown = account?.feeBreakdown ?? [];
  const timeline = account?.payments ?? profile?.payments ?? [];

  const outstandingBills = useMemo(() => {
    const fromProfile = (profile?.bills ?? []).filter((b) => b.balance > 0);
    if (fromProfile.length > 0) return fromProfile;

    const unpaidLines = breakdown.filter((li) => li.remaining > 0);
    if (unpaidLines.length === 0 && remaining <= 0) return [];

    if (unpaidLines.length > 0 || remaining > 0) {
      return [
        {
          id: account?.billId ?? 'current-term',
          billNumber: account?.structureName ?? 'Current term fees',
          balance: remaining,
          academicYear: account?.academicYear ?? academicYear,
          term: account?.term ?? term,
          lineItems: unpaidLines.length
            ? unpaidLines.map((li) => ({ description: li.description, amount: li.remaining }))
            : [{ description: 'Outstanding balance', amount: remaining }],
        },
      ];
    }
    return [];
  }, [profile, breakdown, remaining, account, academicYear, term]);

  const receiptList = useMemo(() => {
    const fromProfile = profile?.receipts ?? [];
    if (fromProfile.length > 0) return fromProfile;

    const fromPayments = (account?.payments ?? [])
      .filter((p) => p.receiptNumber && p.receiptId)
      .map((p) => ({
        id: p.receiptId!,
        receiptNumber: p.receiptNumber!,
        amountPaid: p.amount,
        issuedAt: p.paidAt,
      }));

    if (fromPayments.length > 0) return fromPayments;

    return (profile?.payments ?? [])
      .filter((p) => 'receiptId' in p && (p as PaymentRow).receiptId)
      .map((p) => ({
        id: (p as PaymentRow).receiptId!,
        receiptNumber: (p as PaymentRow).receiptNumber ?? 'Receipt',
        amountPaid: p.amount,
        issuedAt: p.paidAt,
      }));
  }, [profile, account]);

  if (!studentId) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Wallet },
    { id: 'history', label: 'Payments', icon: CreditCard },
    { id: 'outstanding', label: 'Outstanding', icon: CreditCard },
    { id: 'receipts', label: 'Receipts', icon: Receipt },
  ] as const;

  return (
    <div className="fixed inset-0 z-[85] flex justify-end">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-navy/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside
        className={`relative flex h-full w-full max-w-lg flex-col bg-white shadow-[-12px_0_40px_rgba(0,4,53,0.14)] transition-transform duration-300 ${
          entered ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Student account</p>
              <h2 className="text-lg font-bold text-navy">{loading ? 'Loading…' : displayName}</h2>
              <p className="text-sm text-muted">{periodLabel}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                  activeTab === id ? 'bg-navy text-primary' : 'text-muted hover:bg-slate-100'
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <>
              {activeTab === 'overview' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Metric label="Total fees" value={totalFees} />
                    <Metric label="Paid" value={paid} accent="primary" />
                    <Metric label="Remaining" value={remaining} accent="danger" />
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {account?.structureName ? (
                    <p className="text-xs text-muted">Structure: {account.structureName}</p>
                  ) : null}

                  {breakdown.length > 0 ? (
                    <div>
                      <h4 className="mb-2 text-sm font-bold text-navy">Fee breakdown</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs uppercase text-muted">
                            <th className="py-2">Fee item</th>
                            <th className="py-2 text-right">Amount</th>
                            <th className="py-2 text-right">Paid</th>
                            <th className="py-2 text-right">Remaining</th>
                          </tr>
                        </thead>
                        <tbody>
                          {breakdown.map((li) => (
                            <tr key={li.id} className="border-b border-border/60">
                              <td className="py-2">{li.description}</td>
                              <td className="py-2 text-right tabular-nums">{li.amount.toLocaleString()}</td>
                              <td className="py-2 text-right tabular-nums text-emerald-700">{li.paid.toLocaleString()}</td>
                              <td className="py-2 text-right tabular-nums">{li.remaining.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {onCollectPayment ? (
                      <button type="button" className="btn-primary text-xs" onClick={onCollectPayment}>
                        Collect Payment
                      </button>
                    ) : (
                      <Link href="/installments" className="btn-primary text-xs">Collect Payment</Link>
                    )}
                    <Link href="/scholarships" className="btn-secondary text-xs">Apply Scholarship</Link>
                  </div>
                </div>
              ) : null}

              {activeTab === 'history' ? (
                <ul className="space-y-3">
                  {timeline.length === 0 ? (
                    <p className="text-sm text-muted">No payments recorded yet.</p>
                  ) : (
                    timeline.map((p) => {
                      const receiptNo = 'receiptNumber' in p ? (p as PaymentRow).receiptNumber : null;
                      let receiptId = 'receiptId' in p ? (p as PaymentRow).receiptId : null;
                      if (!receiptId && receiptNo && profile?.receipts) {
                        receiptId = profile.receipts.find((r) => r.receiptNumber === receiptNo)?.id ?? null;
                      }
                      return (
                        <li key={p.id} className="rounded-xl border border-border bg-white p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-xs text-muted">
                                {new Date(p.paidAt).toLocaleDateString(undefined, {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                              <p className="text-lg font-bold text-emerald-700">{p.amount.toLocaleString()} RWF</p>
                              <p className="text-sm text-muted">{p.method.replace(/_/g, ' ')}</p>
                              {receiptNo ? (
                                <button
                                  type="button"
                                  className="mt-1 text-xs font-mono font-semibold text-primary hover:underline"
                                  onClick={() => setViewReceiptId(receiptId ?? null)}
                                >
                                  Receipt {receiptNo}
                                </button>
                              ) : null}
                            </div>
                            <CollectionStatusBadge status="PAID" />
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              ) : null}

              {activeTab === 'outstanding' ? (
                <div className="space-y-3">
                  {outstandingBills.length === 0 ? (
                    <p className="text-sm text-muted">No outstanding balance — account is fully paid.</p>
                  ) : (
                    outstandingBills.map((b) => (
                      <div key={b.id} className="rounded-xl border border-border bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-navy">{b.billNumber}</p>
                            {b.academicYear && b.term ? (
                              <p className="text-xs text-muted">
                                {b.academicYear} · {b.term}
                              </p>
                            ) : null}
                          </div>
                          <CollectionStatusBadge status={b.balance > 0 ? 'PARTIAL' : 'PAID'} />
                        </div>
                        <ul className="mt-3 space-y-2 text-sm">
                          {b.lineItems.map((li, i) => (
                            <li key={i} className="flex justify-between gap-3">
                              <span className="text-muted">{li.description}</span>
                              <span className="shrink-0 font-semibold tabular-nums text-navy">
                                {li.amount.toLocaleString()} RWF
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                          <span className="text-xs font-semibold uppercase text-muted">Total outstanding</span>
                          <span className="text-lg font-bold tabular-nums text-red-700">
                            {b.balance.toLocaleString()} RWF
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}

              {activeTab === 'receipts' ? (
                <ul className="space-y-2">
                  {receiptList.length === 0 ? (
                    <p className="text-sm text-muted">No receipts yet.</p>
                  ) : (
                    receiptList.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => setViewReceiptId(r.id)}
                          className="flex w-full items-center justify-between rounded-xl border border-border bg-white px-4 py-3 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
                        >
                          <div>
                            <p className="font-semibold text-navy">{r.receiptNumber}</p>
                            <p className="text-xs text-muted">
                              {r.issuedAt
                                ? new Date(r.issuedAt).toLocaleDateString(undefined, {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold tabular-nums text-navy">
                              {r.amountPaid.toLocaleString()} RWF
                            </span>
                            <ChevronRight size={16} className="text-muted" />
                          </div>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </>
          )}
        </div>
      </aside>

      <ReceiptDetailDrawer receiptId={viewReceiptId} onClose={() => setViewReceiptId(null)} />
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-slate-50/80 p-3">
      <p className="text-[10px] font-semibold uppercase text-muted">{label}</p>
      <p
        className={`text-sm font-bold ${
          accent === 'danger' ? 'text-red-700' : accent === 'primary' ? 'text-navy' : 'text-navy'
        }`}
      >
        {value.toLocaleString()} RWF
      </p>
    </div>
  );
}
