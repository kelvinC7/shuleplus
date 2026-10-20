'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Calculator, Loader2, Search, ChevronRight } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/shared/notifications';
import { AvatarInitials } from '@/components/fees-data-table';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

type LookupResult = {
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string | null;
  academicYear: string | null;
  term: string | null;
};

type AccountData = {
  found: boolean;
  structureName?: string;
  total?: number;
  paid?: number;
  remaining?: number;
  feeBreakdown?: Array<{ id: string; description: string; amount: number; paid: number; remaining: number }>;
};

type Impact = {
  before: number;
  totalFees: number;
  paid: number;
  scholarship: number;
  newBalance: number;
  parentSaves: number;
  studentName?: string | null;
  className?: string | null;
  feeBreakdown?: Array<{ description: string; amount: number }>;
};

const TYPES = [
  { value: 'MERIT', label: 'Academic Excellence' },
  { value: 'NEED_BASED', label: 'Need-Based Support' },
  { value: 'FINANCIAL_AID', label: 'Full / Partial Scholarship' },
  { value: 'GOVERNMENT', label: 'Government / Institution' },
  { value: 'NGO', label: 'NGO Sponsored' },
  { value: 'PRIVATE', label: 'Sports / Staff / Custom' },
];

export function CreateScholarshipModal({ open, onClose, onCreated }: Props) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<LookupResult[]>([]);
  const [selected, setSelected] = useState<LookupResult | null>(null);
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('');
  const [account, setAccount] = useState<AccountData | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [ctxYears, setCtxYears] = useState<string[]>([]);
  const [ctxTerms, setCtxTerms] = useState<string[]>([]);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [form, setForm] = useState({
    type: 'MERIT',
    coverageType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    coveragePercent: 50,
    coverageAmount: 0,
    notes: '',
    submitForApproval: true,
  });

  const reset = useCallback(() => {
    setStep(0);
    setSearch('');
    setLookupResults([]);
    setSelected(null);
    setAcademicYear('');
    setTerm('');
    setAccount(null);
    setImpact(null);
    setForm({
      type: 'MERIT',
      coverageType: 'PERCENTAGE',
      coveragePercent: 50,
      coverageAmount: 0,
      notes: '',
      submitForApproval: true,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
    void api.get('/structures/academic-context').then(({ data }) => {
      setCtxYears(data.data?.academicYears ?? []);
      setCtxTerms(data.data?.terms ?? []);
      if (data.data?.currentAcademicYear) setAcademicYear(data.data.currentAcademicYear);
      if (data.data?.currentTerm) setTerm(data.data.currentTerm);
    });
  }, [open, reset]);

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
      .catch(() => toast.error('Could not load student fees'))
      .finally(() => setAccountLoading(false));
  }, [open, selected, academicYear, term, toast]);

  const scholarshipAmount =
    form.coverageType === 'PERCENTAGE'
      ? Math.round(((account?.remaining ?? account?.total ?? 0) * form.coveragePercent) / 100)
      : form.coverageAmount;

  useEffect(() => {
    if (!open || !selected || !academicYear || !term || step < 1) return;
    void api
      .post('/scholarships/preview-impact', {
        studentCode: selected.studentCode,
        academicYear,
        term,
        scholarshipAmount,
      })
      .then(({ data }) => setImpact(data.data as Impact))
      .catch(() => setImpact(null));
  }, [open, selected, academicYear, term, scholarshipAmount, step]);

  useEffect(() => {
    if (account?.remaining && form.coverageAmount === 0) {
      setForm((f) => ({
        ...f,
        coverageAmount: Math.round((account.remaining ?? 0) / 2),
      }));
    }
  }, [account?.remaining, form.coverageAmount]);

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

  async function save() {
    if (!selected || !account?.found) return;
    setSaving(true);
    try {
      const totalEligible = account.remaining ?? account.total ?? 0;
      const allocated = scholarshipAmount;
      await api.post('/scholarships', {
        studentId: selected.studentId,
        studentCode: selected.studentCode,
        studentName: selected.studentName,
        className: selected.className,
        type: form.type,
        academicYear,
        term,
        amount: totalEligible,
        allocated,
        totalEligible,
        coverageType: form.coverageType,
        coveragePercent: form.coverageType === 'PERCENTAGE' ? form.coveragePercent : undefined,
        coverageAmount: form.coverageType === 'FIXED' ? form.coverageAmount : undefined,
        notes: form.notes || undefined,
        submitForApproval: form.submitForApproval,
      });
      onCreated();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Could not create scholarship');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-navy/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              {step === 0 ? 'Step 1 — Find student' : 'Step 2 — Scholarship details'}
            </p>
            <h3 className="text-lg font-bold text-navy">Create Scholarship</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 0 ? (
            <div className="space-y-4">
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
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-navy">{r.studentName}</p>
                          <p className="text-xs text-muted">{r.studentCode} · {r.className ?? '—'}</p>
                        </div>
                        <ChevronRight size={16} className="text-muted" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Search by student code or name from Student Management.</p>
              )}

              {selected ? (
                <div className="rounded-xl border border-border bg-slate-50/80 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase text-muted">Academic year</span>
                      <select className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
                        <option value="">Select</option>
                        {ctxYears.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase text-muted">Term</span>
                      <select className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm" value={term} onChange={(e) => setTerm(e.target.value)}>
                        <option value="">Select</option>
                        {ctxTerms.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                  </div>
                  {accountLoading ? (
                    <p className="mt-3 text-sm text-muted">Loading fee account…</p>
                  ) : account?.found ? (
                    <div className="mt-3 rounded-lg bg-white p-3 text-sm">
                      <p className="font-semibold text-navy">{account.structureName}</p>
                      <div className="mt-2 flex justify-between"><span>Total fees</span><strong>{account.total?.toLocaleString()} RWF</strong></div>
                      <div className="flex justify-between text-emerald-700"><span>Paid</span><strong>{account.paid?.toLocaleString()} RWF</strong></div>
                      <div className="flex justify-between font-bold text-red-700"><span>Outstanding</span><span>{account.remaining?.toLocaleString()} RWF</span></div>
                    </div>
                  ) : academicYear && term ? (
                    <p className="mt-3 text-sm text-amber-700">No fee structure found for this student.</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-slate-50 p-3 text-sm">
                  <p className="font-bold text-navy">{selected?.studentName}</p>
                  <p className="text-muted">{selected?.studentCode} · {selected?.className ?? '—'}</p>
                  <p className="text-muted">{academicYear} · {term}</p>
                </div>

                <label className="block text-sm">
                  <span className="text-muted">Scholarship type</span>
                  <select className="input mt-1 w-full" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>

                <div>
                  <p className="text-sm text-muted">Coverage</p>
                  <div className="mt-1 flex gap-2">
                    {(['PERCENTAGE', 'FIXED'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${form.coverageType === t ? 'bg-navy text-primary' : 'bg-slate-100 text-navy'}`}
                        onClick={() => setForm((f) => ({ ...f, coverageType: t }))}
                      >
                        {t === 'PERCENTAGE' ? 'Percentage' : 'Fixed amount'}
                      </button>
                    ))}
                  </div>
                </div>

                {form.coverageType === 'PERCENTAGE' ? (
                  <label className="block text-sm">
                    <span className="text-muted">Coverage % of outstanding balance</span>
                    <input type="number" min={1} max={100} className="input mt-1 w-full" value={form.coveragePercent} onChange={(e) => setForm((f) => ({ ...f, coveragePercent: Number(e.target.value) }))} />
                    <p className="mt-1 text-xs text-muted">Award: {scholarshipAmount.toLocaleString()} RWF</p>
                  </label>
                ) : (
                  <label className="block text-sm">
                    <span className="text-muted">Award amount (RWF)</span>
                    <input type="number" className="input mt-1 w-full" value={form.coverageAmount} onChange={(e) => setForm((f) => ({ ...f, coverageAmount: Number(e.target.value) }))} />
                  </label>
                )}

                <label className="block text-sm">
                  <span className="text-muted">Notes / reason</span>
                  <textarea className="input mt-1 min-h-[80px] w-full" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Merit award, need-based support…" />
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.submitForApproval} onChange={(e) => setForm((f) => ({ ...f, submitForApproval: e.target.checked }))} />
                  Submit for approval
                </label>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-emerald-900">
                    <Calculator size={16} />
                    <span className="text-sm font-bold">Impact preview</span>
                  </div>
                  {impact ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted">Outstanding before</span><span>{impact.before.toLocaleString()} RWF</span></div>
                      <div className="flex justify-between text-emerald-700"><span>Scholarship</span><span>-{impact.scholarship.toLocaleString()} RWF</span></div>
                      <div className="flex justify-between border-t border-emerald-200 pt-2 font-bold text-navy"><span>New balance</span><span>{impact.newBalance.toLocaleString()} RWF</span></div>
                      {impact.feeBreakdown && impact.feeBreakdown.length > 0 ? (
                        <ul className="mt-3 space-y-1 border-t border-emerald-200 pt-2 text-xs text-muted">
                          {impact.feeBreakdown.filter((li) => li.amount > 0).map((li) => (
                            <li key={li.description} className="flex justify-between">
                              <span>{li.description}</span>
                              <span>{li.amount.toLocaleString()} RWF</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">Calculating from live fee account…</p>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-slate-50/80 p-4 text-sm">
                  <p className="font-semibold text-navy">Approval workflow</p>
                  <p className="mt-1 text-muted">Draft → Under Review → Approved → Applied to student bill</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          {step === 0 ? (
            <button
              type="button"
              className="btn-primary"
              disabled={!selected || !academicYear || !term || !account?.found}
              onClick={() => setStep(1)}
            >
              Continue →
            </button>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={() => setStep(0)}>Back</button>
              <button type="button" className="btn-primary" disabled={saving || scholarshipAmount <= 0} onClick={() => void save()}>
                {saving ? 'Saving…' : form.submitForApproval ? 'Submit for approval' : 'Save draft'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
