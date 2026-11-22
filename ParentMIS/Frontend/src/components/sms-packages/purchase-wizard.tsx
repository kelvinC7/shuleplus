'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LinkedStudent } from '@/types';
import type { SmsPackage, SmsPortalConfig } from '@/lib/sms-packages-types';
import { api } from '@/services/api';
import { resolvePublicAssetUrl } from '@/utils/asset-url';

const STEPS = ['Students', 'Package', 'Pay', 'Done'];

type Props = {
  open: boolean;
  onClose: () => void;
  config: SmsPortalConfig;
  students: LinkedStudent[];
  defaultPhone: string;
  /** When false, show packages but block checkout until school enables purchases. */
  purchaseEnabled?: boolean;
  onComplete: () => void;
};

export function SmsPurchaseWizard({
  open,
  onClose,
  config,
  students,
  defaultPhone,
  purchaseEnabled = true,
  onComplete,
}: Props) {
  const [step, setStep] = useState(0);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [packageByStudent, setPackageByStudent] = useState<Record<string, string>>({});
  const [payerPhone, setPayerPhone] = useState(defaultPhone);
  const [momoRef, setMomoRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [purchaseRef, setPurchaseRef] = useState('');
  const [purchaseId, setPurchaseId] = useState('');

  const packages = config.packages;
  const termPkg = packages.find((p) => p.kind === 'TERM');
  const yearPkg = packages.find((p) => p.kind === 'ACADEMIC_YEAR');

  const totals = useMemo(() => {
    let amount = 0;
    let segments = 0;
    for (const sid of selectedStudents) {
      const pid = packageByStudent[sid];
      const pkg = packages.find((p) => p.id === pid);
      if (pkg) {
        amount += pkg.priceRwf;
        segments += pkg.segmentAllowance;
      }
    }
    return { amount, segments, count: selectedStudents.size };
  }, [selectedStudents, packageByStudent, packages]);

  function toggleStudent(id: string) {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function pickPackageForAll(pkg: SmsPackage) {
    const map: Record<string, string> = {};
    selectedStudents.forEach((sid) => {
      map[sid] = pkg.id;
    });
    setPackageByStudent(map);
  }

  async function createOrder() {
    setBusy(true);
    setError('');
    try {
      const lines = [...selectedStudents].map((studentId) => ({
        studentId,
        packageId: packageByStudent[studentId]!,
      }));
      const { data } = await api.post<{ data: { purchase: { purchaseRef: string; id: string } } }>(
        '/sms-packages/purchases',
        {
          payerPhone,
          allocation: config.defaultAllocation,
          lines,
        }
      );
      setPurchaseRef(data.data.purchase.purchaseRef);
      setPurchaseId(data.data.purchase.id);
      setStep(2);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not start purchase');
    } finally {
      setBusy(false);
    }
  }

  async function submitPayment() {
    setBusy(true);
    setError('');
    try {
      await api.post('/sms-packages/purchases/submit-payment', {
        purchaseId,
        momoReference: momoRef.trim(),
      });
      setStep(3);
      onComplete();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not submit payment');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:max-h-[88vh] sm:rounded-2xl">
        <div className="border-b border-navy/8 px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Buy SMS credits</p>
              <p className="text-sm font-semibold text-navy">Step {step + 1} of 4 · {STEPS[step]}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-slate-100">
              Close
            </button>
          </div>
          <div className="mt-3 flex gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className={cn('h-1 flex-1 rounded-full', i <= step ? 'bg-primary' : 'bg-slate-200')} />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {error ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          {!purchaseEnabled ? (
            <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Purchases are not enabled for your school yet. You can preview packages; checkout opens once Super Admin
              turns on parent SMS packages.
            </p>
          ) : null}

          {step === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted">Select children to cover with this purchase.</p>
              {students.map((s) => {
                const on = selectedStudents.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleStudent(s.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
                      on ? 'border-primary bg-amber-50/80' : 'border-navy/8 hover:border-navy/15'
                    )}
                  >
                    <img
                      src={resolvePublicAssetUrl(s.avatarUrl) || '/avatar-placeholder.png'}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover bg-slate-100"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-navy">{s.fullName}</p>
                      <p className="text-xs text-muted">
                        {s.className} · {s.shuleCode}
                      </p>
                    </div>
                    <div className={cn('flex h-6 w-6 items-center justify-center rounded-full border', on && 'border-primary bg-primary text-white')}>
                      {on ? <Check className="h-3.5 w-3.5" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">Choose a package for each child or apply one package to all.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[termPkg, yearPkg].filter(Boolean).map((pkg) => (
                  <PackageCard
                    key={pkg!.id}
                    pkg={pkg!}
                    onSelect={() => pickPackageForAll(pkg!)}
                    active={[...selectedStudents].every((sid) => packageByStudent[sid] === pkg!.id)}
                  />
                ))}
              </div>
              {[...selectedStudents].map((sid) => {
                const st = students.find((s) => s.id === sid);
                return (
                  <div key={sid} className="rounded-xl border border-navy/8 p-3">
                    <p className="text-sm font-semibold text-navy">{st?.fullName}</p>
                    <select
                      className="mt-2 w-full rounded-lg border border-navy/10 px-3 py-2 text-sm"
                      value={packageByStudent[sid] ?? ''}
                      onChange={(e) => setPackageByStudent((m) => ({ ...m, [sid]: e.target.value }))}
                    >
                      <option value="">Select package</option>
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} — RWF {p.priceRwf.toLocaleString()} ({p.segmentAllowance} SMS)
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
              <div className="rounded-xl bg-navy px-4 py-3 text-white">
                <p className="text-xs text-white/70">{totals.count} child(ren) selected</p>
                <p className="text-lg font-bold">RWF {totals.amount.toLocaleString()}</p>
                <p className="text-xs text-white/80">{totals.segments.toLocaleString()} SMS segments total</p>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-900">
                <Smartphone className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Pay with MTN MoMo</p>
                  <p className="text-xs">Complete USSD payment, then enter your transaction reference.</p>
                </div>
              </div>
              <div className="rounded-xl border border-navy/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Payment instructions</p>
                <p className="mt-2 break-all font-mono text-lg font-bold text-navy">
                  {config.momoUssdTemplate ?? '*182*1*…#'}
                </p>
                <p className="mt-3 text-sm">
                  Amount: <strong>RWF {totals.amount.toLocaleString()}</strong>
                </p>
                <p className="text-sm text-muted">Reference: {purchaseRef}</p>
              </div>
              <label className="block text-sm font-medium text-navy">
                Paying phone
                <input
                  className="mt-1 w-full rounded-lg border border-navy/10 px-3 py-2.5 text-sm"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-navy">
                MoMo transaction reference
                <input
                  className="mt-1 w-full rounded-lg border border-navy/10 px-3 py-2.5 text-sm"
                  placeholder="After you pay on your phone"
                  value={momoRef}
                  onChange={(e) => setMomoRef(e.target.value)}
                />
              </label>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-navy">Payment submitted</h3>
              <p className="text-sm text-muted">
                Your payment is awaiting verification. Credits activate once confirmed — check Purchase History anytime.
              </p>
              <div className="rounded-xl border border-navy/8 bg-slate-50 p-4 text-left text-sm">
                <p>
                  <span className="text-muted">Reference</span> · <strong>{purchaseRef}</strong>
                </p>
                <p className="mt-1">
                  <span className="text-muted">Status</span> · Pending approval
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-navy/8 px-4 py-3 sm:px-5">
          {step > 0 && step < 3 ? (
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-navy/15 py-2.5 text-sm font-semibold text-navy"
              onClick={() => setStep((s) => s - 1)}
              disabled={busy}
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          ) : null}
          {step === 0 ? (
            <button
              type="button"
              disabled={!selectedStudents.size || busy}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-navy disabled:opacity-50"
              onClick={() => setStep(1)}
            >
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}
          {step === 1 ? (
            <button
              type="button"
              disabled={
                busy || !purchaseEnabled || ![...selectedStudents].every((sid) => packageByStudent[sid])
              }
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-navy disabled:opacity-50"
              onClick={() => void createOrder()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue to pay
            </button>
          ) : null}
          {step === 2 ? (
            <button
              type="button"
              disabled={busy || momoRef.trim().length < 4}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-navy py-2.5 text-sm font-bold text-white disabled:opacity-50"
              onClick={() => void submitPayment()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit confirmation'}
            </button>
          ) : null}
          {step === 3 ? (
            <button type="button" className="flex-1 rounded-xl bg-navy py-2.5 text-sm font-bold text-white" onClick={onClose}>
              Done
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PackageCard({ pkg, onSelect, active }: { pkg: SmsPackage; onSelect: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'rounded-xl border p-4 text-left transition',
        active ? 'border-primary bg-amber-50/60 ring-1 ring-primary/30' : 'border-navy/8 hover:border-navy/15'
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-primary">{pkg.kind === 'TERM' ? 'Term' : 'Academic year'}</p>
      <p className="mt-1 font-bold text-navy">{pkg.title}</p>
      <p className="mt-2 text-xl font-extrabold text-navy">RWF {pkg.priceRwf.toLocaleString()}</p>
      <p className="text-xs text-muted">{pkg.segmentAllowance.toLocaleString()} SMS · {pkg.validityDays} days validity</p>
    </button>
  );
}
