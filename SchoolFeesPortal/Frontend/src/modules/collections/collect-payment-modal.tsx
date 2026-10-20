'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Loader2,
  Printer,
  Search,
  X,
} from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/shared/notifications';
import { AvatarInitials } from '@/components/fees-data-table';
import {
  ModernReceiptCard,
  type ReceiptViewData,
  type SchoolBranding,
} from '@/modules/collections/modern-receipt-card';
import { downloadReceiptAsPdf, printReceiptPdf } from '@/utils/download-receipt-pdf';

type LookupResult = {
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string | null;
  academicYear: string | null;
  term: string | null;
  billId: string | null;
};

type FeeLine = {
  id: string;
  description: string;
  amount: number;
  paid: number;
  remaining: number;
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
};

type Prefill = {
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string | null;
  academicYear: string;
  term: string;
  billId: string | null;
  remaining: number;
};

type AllocationMode = 'OLDEST' | 'PRIORITY' | 'MANUAL';

type Props = {
  open: boolean;
  prefill?: Prefill | null;
  defaultAcademicYear?: string;
  defaultTerm?: string;
  onClose: () => void;
  onSuccess: () => void;
};

type SuccessState = {
  receiptNumber: string;
  receiptId: string;
  amount: number;
  studentName: string;
  studentCode: string;
  className: string;
  balanceAfter: number;
  previousBalance: number;
  paymentId: string;
  method: string;
  reference: string | null;
  paidAt: string;
  accountStatus: 'PAID' | 'PARTIAL';
  lineItems: Array<{ description: string; amount: number }>;
  qrCode: string | null;
};

function allocatePayment(
  lines: FeeLine[],
  amount: number,
  mode: AllocationMode
): Array<{ lineItemId: string; amount: number }> {
  const ordered =
    mode === 'PRIORITY'
      ? [...lines].sort((a, b) => b.remaining - a.remaining)
      : [...lines];
  let left = amount;
  const result: Array<{ lineItemId: string; amount: number }> = [];
  for (const line of ordered) {
    if (left <= 0) break;
    const pay = Math.min(line.remaining, left);
    if (pay > 0) {
      result.push({ lineItemId: line.id, amount: pay });
      left -= pay;
    }
  }
  return result;
}

export function CollectPaymentModal({
  open,
  prefill,
  defaultAcademicYear,
  defaultTerm,
  onClose,
  onSuccess,
}: Props) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState('');
  const [lookupResults, setLookupResults] = useState<LookupResult[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [selected, setSelected] = useState<LookupResult | null>(null);
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('');
  const [account, setAccount] = useState<AccountData | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('OLDEST');
  const [manualAlloc, setManualAlloc] = useState<Record<string, string>>({});
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [branding, setBranding] = useState<SchoolBranding | null>(null);
  const [ctxYears, setCtxYears] = useState<string[]>([]);
  const [ctxTerms, setCtxTerms] = useState<string[]>([]);
  const [manualMode, setManualMode] = useState(false);
  const [manualForm, setManualForm] = useState({
    studentCode: '',
    studentName: '',
    className: '',
  });

  const reset = useCallback(() => {
    setStep(0);
    setSearch('');
    setLookupResults([]);
    setSelected(null);
    setAcademicYear(defaultAcademicYear ?? '');
    setTerm(defaultTerm ?? '');
    setAccount(null);
    setAmount('');
    setAllocationMode('OLDEST');
    setManualAlloc({});
    setMethod('CASH');
    setReference('');
    setPaidAt(new Date().toISOString().slice(0, 10));
    setNotes('');
    setSuccess(null);
    setBranding(null);
    setManualMode(false);
    setManualForm({ studentCode: '', studentName: '', className: '' });
  }, [defaultAcademicYear, defaultTerm]);

  useEffect(() => {
    if (!open) return;
    reset();
    void api.get('/organization/branding').then(({ data }) => setBranding(data.data ?? null));
    void api.get('/structures/academic-context').then(({ data }) => {
      setCtxYears(data.data?.academicYears ?? []);
      setCtxTerms(data.data?.terms ?? []);
    });
    if (prefill) {
      setSelected({
        studentId: prefill.studentId,
        studentCode: prefill.studentCode,
        studentName: prefill.studentName,
        className: prefill.className,
        academicYear: prefill.academicYear,
        term: prefill.term,
        billId: prefill.billId,
      });
      setAcademicYear(prefill.academicYear);
      setTerm(prefill.term);
      setSearch(prefill.studentCode);
    }
  }, [open, prefill, reset]);

  useEffect(() => {
    if (!open || !selected || !academicYear || !term) {
      setAccount(null);
      return;
    }
    setAccountLoading(true);
    void api
      .get('/collections/fee-collection/student-account', {
        params: {
          studentCode: selected.studentCode,
          academicYear,
          term,
          className: selected.className ?? undefined,
          studentName: selected.studentName,
        },
      })
      .then(({ data }) => setAccount(data.data as AccountData))
      .catch(() => toast.error('Could not load student account'))
      .finally(() => setAccountLoading(false));
  }, [open, selected, academicYear, term, toast]);

  function applyManualStudent() {
    if (!manualForm.studentCode.trim() || !manualForm.studentName.trim()) {
      toast.error('Student code and name are required');
      return;
    }
    void (async () => {
      setLookupLoading(true);
      try {
        const { data } = await api.get('/collections/fee-collection/lookup', {
          params: { search: manualForm.studentCode.trim() },
        });
        const found = (data.data as LookupResult[] | undefined)?.[0];
        if (found) {
          setSelected(found);
          if (found.academicYear) setAcademicYear(found.academicYear);
          if (found.term) setTerm(found.term);
          setManualMode(false);
          toast.success(`Found ${found.studentName} in Student Management`);
          return;
        }
      } catch {
        /* fall through to manual */
      } finally {
        setLookupLoading(false);
      }
      setSelected({
        studentId: manualForm.studentCode.trim(),
        studentCode: manualForm.studentCode.trim(),
        studentName: manualForm.studentName.trim(),
        className: manualForm.className.trim() || null,
        academicYear: null,
        term: null,
        billId: null,
      });
      setManualMode(false);
    })();
  }

  async function runLookup(q: string) {
    if (!q.trim()) return;
    setLookupLoading(true);
    try {
      const { data } = await api.get('/collections/fee-collection/lookup', { params: { search: q.trim() } });
      setLookupResults(data.data ?? []);
    } catch {
      toast.error('Student lookup failed');
    } finally {
      setLookupLoading(false);
    }
  }

  const paymentAmount = Number(amount) || 0;
  const previousBalance = account?.remaining ?? 0;
  const newBalance = Math.max(0, previousBalance - paymentAmount);

  const feeLines = account?.feeBreakdown ?? [];

  const allocation = useMemo(() => {
    if (allocationMode === 'MANUAL') {
      return feeLines
        .map((l) => ({ lineItemId: l.id, amount: Number(manualAlloc[l.id] || 0) }))
        .filter((a) => a.amount > 0);
    }
    return allocatePayment(feeLines, paymentAmount, allocationMode);
  }, [allocationMode, feeLines, manualAlloc, paymentAmount]);

  const allocationTotal = allocation.reduce((s, a) => s + a.amount, 0);

  useEffect(() => {
    if (allocationMode !== 'MANUAL' || paymentAmount <= 0 || feeLines.length === 0) return;
    const auto = allocatePayment(feeLines, paymentAmount, 'OLDEST');
    const next: Record<string, string> = {};
    auto.forEach((a) => { next[a.lineItemId] = String(a.amount); });
    setManualAlloc(next);
  }, [paymentAmount, allocationMode, feeLines]);

  async function confirmPayment() {
    if (!selected || !account?.found) return;
    if (paymentAmount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    if (paymentAmount > previousBalance + 0.01) {
      toast.warning('Payment exceeds remaining balance');
    }
    setSaving(true);
    try {
      const { data } = await api.post('/collections/fee-collection/payments', {
        billId: account.billId,
        studentId: selected.studentId,
        studentCode: selected.studentCode,
        studentName: selected.studentName,
        className: selected.className,
        amount: paymentAmount,
        method,
        reference: reference || undefined,
        paidAt,
        notes: notes || undefined,
        allocation,
        allocationMode: allocationMode.toLowerCase(),
        isPartial: newBalance > 0,
      });
      const payload = data.data as {
        receiptNumber: string;
        receiptId: string;
        balanceAfter: number;
        previousBalance: number;
        accountStatus: 'PAID' | 'PARTIAL';
        payment: { id: string };
        receipt?: { qrCode?: string | null };
      };
      const lineItems = allocation.map((a) => {
        const line = feeLines.find((l) => l.id === a.lineItemId);
        return { description: line?.description ?? 'School fees', amount: a.amount };
      });
      setSuccess({
        receiptNumber: payload.receiptNumber,
        receiptId: payload.receiptId,
        amount: paymentAmount,
        studentName: selected.studentName,
        studentCode: selected.studentCode,
        className: selected.className ?? '—',
        balanceAfter: payload.balanceAfter,
        previousBalance: payload.previousBalance ?? previousBalance,
        paymentId: payload.payment?.id,
        method,
        reference: reference || null,
        paidAt: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
        accountStatus: payload.accountStatus ?? (payload.balanceAfter <= 0 ? 'PAID' : 'PARTIAL'),
        lineItems: lineItems.length ? lineItems : [{ description: 'School fees', amount: paymentAmount }],
        qrCode: payload.receipt?.qrCode ?? `VERIFY:${payload.receiptNumber}`,
      });
    } catch {
      toast.error('Could not record payment');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const successReceipt: ReceiptViewData | null = success
    ? {
        receiptNumber: success.receiptNumber,
        studentName: success.studentName,
        studentCode: success.studentCode,
        className: success.className,
        amountPaid: success.amount,
        outstanding: success.balanceAfter,
        method: success.method,
        issuedAt: success.paidAt,
        reference: success.reference,
        lineItems: success.lineItems,
        qrCode: success.qrCode,
        academicYear,
        term,
        accountStatus: success.accountStatus,
        paymentStatus: 'COMPLETED',
        verifyValid: true,
        verifyMessage: 'Payment recorded and receipt issued',
      }
    : null;

  async function downloadSuccessReceipt() {
    if (!successReceipt) return;
    try {
      await downloadReceiptAsPdf(successReceipt, branding);
      toast.success('Receipt PDF downloaded');
    } catch {
      toast.error('Could not download receipt');
    }
  }

  async function printSuccessReceipt() {
    if (!successReceipt) return;
    try {
      await printReceiptPdf(successReceipt, branding);
    } catch {
      toast.error('Print failed');
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-navy/50 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              {success ? 'Payment complete' : step === 0 ? 'Step 1 — Find student' : 'Step 2 — Record payment'}
            </p>
            <h3 className="text-lg font-bold text-navy">Collect Payment</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {success && successReceipt ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800">
                <CheckCircle2 size={20} className="shrink-0" />
                <div className="text-left text-sm">
                  <p className="font-semibold">Payment recorded successfully</p>
                  <p className="text-xs opacity-90">
                    {success.accountStatus === 'PAID'
                      ? 'Account fully settled — no balance remaining'
                      : `${success.balanceAfter.toLocaleString()} RWF still outstanding`}
                  </p>
                </div>
              </div>

              <ModernReceiptCard branding={branding} receipt={successReceipt} compact />

              <div className="flex flex-wrap justify-center gap-2 pb-2">
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => void downloadSuccessReceipt()}
                >
                  <Download size={14} /> Download PDF
                </button>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => void printSuccessReceipt()}
                >
                  <Printer size={14} /> Print
                </button>
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : step === 0 ? (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold uppercase text-muted">Search student</label>
                <div className="mt-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      className="w-full rounded-xl border border-border py-2.5 pl-9 pr-3 text-sm"
                      placeholder="Student code, name, or SDMS code"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void runLookup(search)}
                    />
                  </div>
                  <button type="button" className="btn-primary" disabled={lookupLoading} onClick={() => void runLookup(search)}>
                    {lookupLoading ? <Loader2 size={16} className="animate-spin" /> : 'Find'}
                  </button>
                </div>
              </div>

              {lookupResults.length > 0 ? (
                <ul className="space-y-2">
                  {lookupResults.map((r) => (
                    <li key={r.studentCode}>
                      <button
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                          selected?.studentCode === r.studentCode ? 'border-primary bg-primary/5' : 'border-border hover:bg-slate-50'
                        }`}
                        onClick={() => {
                          setSelected(r);
                          if (r.academicYear) setAcademicYear(r.academicYear);
                          if (r.term) setTerm(r.term);
                        }}
                      >
                        <AvatarInitials name={r.studentName} seed={r.studentCode} />
                        <div>
                          <p className="font-semibold text-navy">{r.studentName}</p>
                          <p className="text-xs text-muted">{r.studentCode} · {r.className ?? '—'}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No students found in Student Management — try manual entry below.</p>
              )}

              <div className="rounded-xl border border-dashed border-border p-4">
                <button
                  type="button"
                  className="text-sm font-semibold text-primary"
                  onClick={() => setManualMode((m) => !m)}
                >
                  {manualMode ? 'Hide manual entry' : 'Enter student manually'}
                </button>
                {manualMode ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-semibold uppercase text-muted">Student code</span>
                      <input
                        className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                        value={manualForm.studentCode}
                        onChange={(e) => setManualForm((f) => ({ ...f, studentCode: e.target.value }))}
                        placeholder="SHL-000123"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-semibold uppercase text-muted">Student name</span>
                      <input
                        className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                        value={manualForm.studentName}
                        onChange={(e) => setManualForm((f) => ({ ...f, studentName: e.target.value }))}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-semibold uppercase text-muted">Class</span>
                      <input
                        className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                        value={manualForm.className}
                        onChange={(e) => setManualForm((f) => ({ ...f, className: e.target.value }))}
                        placeholder="Senior 3"
                      />
                    </label>
                    <button type="button" className="btn-secondary sm:col-span-2" onClick={applyManualStudent}>
                      Use this student
                    </button>
                  </div>
                ) : null}
              </div>

              {selected ? (
                <div className="rounded-xl border border-border bg-slate-50/80 p-4">
                  <div className="flex items-center gap-3">
                    <AvatarInitials name={selected.studentName} seed={selected.studentCode} />
                    <div>
                      <p className="font-bold text-navy">{selected.studentName}</p>
                      <p className="text-sm text-muted">Code: {selected.studentCode}</p>
                      <p className="text-sm text-muted">Class: {selected.className ?? '—'}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase text-muted">Academic year</span>
                      <select
                        className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                      >
                        <option value="">Select</option>
                        {ctxYears.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase text-muted">Term</span>
                      <select
                        className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                      >
                        <option value="">Select</option>
                        {ctxTerms.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {accountLoading ? (
                    <p className="mt-4 text-sm text-muted">Loading fee structure…</p>
                  ) : account?.found ? (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm font-semibold text-navy">
                        Applicable Fee Structure — {account.structureName}
                      </p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs uppercase text-muted">
                            <th className="py-2">Fee</th>
                            <th className="py-2 text-right">Expected</th>
                            <th className="py-2 text-right">Paid</th>
                            <th className="py-2 text-right">Remaining</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feeLines.map((l) => (
                            <tr key={l.id} className="border-b border-border/60">
                              <td className="py-2">{l.description}</td>
                              <td className="py-2 text-right tabular-nums">{l.amount.toLocaleString()}</td>
                              <td className="py-2 text-right tabular-nums text-emerald-700">{l.paid.toLocaleString()}</td>
                              <td className="py-2 text-right tabular-nums font-medium">{l.remaining.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="rounded-lg bg-white p-3 text-sm">
                        <div className="flex justify-between"><span>Total</span><strong>{account.total?.toLocaleString()} RWF</strong></div>
                        <div className="flex justify-between text-emerald-700"><span>Paid</span><strong>{account.paid?.toLocaleString()} RWF</strong></div>
                        <div className="flex justify-between font-bold"><span>Remaining</span><span>{account.remaining?.toLocaleString()} RWF</span></div>
                      </div>
                    </div>
                  ) : academicYear && term ? (
                    <p className="mt-4 text-sm text-amber-700">No fee structure found for this year, term and class.</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-border bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-navy">{selected?.studentName}</p>
                <p className="text-muted">{selected?.className} · {academicYear} · {term}</p>
              </div>

              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted">Amount paid (RWF)</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border border-border px-4 py-3 text-2xl font-bold tabular-nums"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </label>

              <div className="grid gap-2 rounded-xl border border-border p-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-muted">Previous Balance</p>
                  <p className="font-bold tabular-nums">{previousBalance.toLocaleString()} RWF</p>
                </div>
                <div>
                  <p className="text-muted">Payment</p>
                  <p className="font-bold tabular-nums text-emerald-700">−{paymentAmount.toLocaleString()} RWF</p>
                </div>
                <div>
                  <p className="text-muted">New Balance</p>
                  <p className="font-bold tabular-nums">{newBalance.toLocaleString()} RWF</p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted">Payment allocation</span>
                  <select
                    className="rounded-lg border border-border px-2 py-1 text-xs"
                    value={allocationMode}
                    onChange={(e) => setAllocationMode(e.target.value as AllocationMode)}
                  >
                    <option value="OLDEST">Oldest fee first</option>
                    <option value="PRIORITY">Priority fee first</option>
                    <option value="MANUAL">Manual allocation</option>
                  </select>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted">
                      <th className="py-2">Fee item</th>
                      <th className="py-2 text-right">Remaining</th>
                      <th className="py-2 text-right">Pay now</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeLines.map((l) => {
                      const payNow =
                        allocationMode === 'MANUAL'
                          ? Number(manualAlloc[l.id] || 0)
                          : allocation.find((a) => a.lineItemId === l.id)?.amount ?? 0;
                      return (
                        <tr key={l.id} className="border-b border-border/60">
                          <td className="py-2">{l.description}</td>
                          <td className="py-2 text-right tabular-nums">{l.remaining.toLocaleString()}</td>
                          <td className="py-2 text-right">
                            {allocationMode === 'MANUAL' ? (
                              <input
                                type="number"
                                className="w-24 rounded border border-border px-2 py-1 text-right text-sm"
                                value={manualAlloc[l.id] ?? ''}
                                onChange={(e) =>
                                  setManualAlloc((m) => ({ ...m, [l.id]: e.target.value }))
                                }
                              />
                            ) : (
                              <span className="font-semibold tabular-nums">{payNow.toLocaleString()}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="mt-2 text-right text-sm">
                  Total payment: <strong>{allocationMode === 'MANUAL' ? allocationTotal : paymentAmount} RWF</strong>
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted">Payment method</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: 'CASH', l: 'Cash' },
                    { v: 'BANK_TRANSFER', l: 'Bank Transfer' },
                    { v: 'MOBILE_MONEY', l: 'Mobile Money' },
                    { v: 'POS', l: 'Card' },
                    { v: 'CHEQUE', l: 'Cheque' },
                    { v: 'ONLINE', l: 'Other' },
                  ].map(({ v, l }) => (
                    <label key={v} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm">
                      <input
                        type="radio"
                        name="method"
                        value={v}
                        checked={method === v}
                        onChange={() => setMethod(v)}
                      />
                      {l}
                    </label>
                  ))}
                </div>
              </div>

              {(method === 'MOBILE_MONEY' || method === 'BANK_TRANSFER') ? (
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-muted">Transaction reference</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="MTN-238472938"
                  />
                </label>
              ) : (
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-muted">Payment reference</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </label>
              )}

              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted">Payment date</span>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted">Payment note (optional)</span>
                <textarea
                  className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Parent paid first installment…"
                />
              </label>

              <div className="rounded-xl border border-border bg-slate-50 p-4 text-sm space-y-1">
                <p className="font-semibold text-navy">Payment summary</p>
                <p>Previous balance: <strong>{previousBalance.toLocaleString()} RWF</strong></p>
                <p>Amount paid: <strong>{paymentAmount.toLocaleString()} RWF</strong></p>
                <p>Remaining: <strong>{newBalance.toLocaleString()} RWF</strong></p>
                <p>Method: <strong>{method.replace(/_/g, ' ')}</strong></p>
                {reference ? <p>Reference: <strong>{reference}</strong></p> : null}
              </div>
            </div>
          )}
        </div>

        {!success ? (
          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            {step === 0 ? (
              <button
                type="button"
                className="btn-primary"
                disabled={!selected || !academicYear || !term || !account?.found}
                onClick={() => {
                  setAmount(String(account?.remaining ?? ''));
                  setStep(1);
                }}
              >
                Continue →
              </button>
            ) : (
              <>
                <button type="button" className="btn-secondary" onClick={() => setStep(0)}>Back</button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={saving || paymentAmount <= 0}
                  onClick={() => void confirmPayment()}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Confirm & Generate Receipt'}
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
