'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  CheckSquare,
  Square,
  Wallet2,
  Smartphone,
  CreditCard,
  Landmark,
  BadgeCheck,
  Download,
  RotateCcw,
  GraduationCap,
  Building2,
  ShoppingBag,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { WizardShell } from './ui/WizardShell';
import {
  fetchCircularOptions,
  fetchPublicCircular,
  type CircularRequirementLine,
} from '../services/portal-api';
import {
  downloadModernReceipt,
  makePaymentReference,
  type PaymentSuccessPayload,
} from '../services/portal-receipt';

type Requirement = { id: string; name: string; price: number; description?: string | null };

export type RequirementsStudentContext = {
  name: string;
  school: string;
  studentClass: string;
  organizationId?: string;
  classLabel?: string | null;
  preferredYear?: string | null;
  preferredTerm?: string | null;
  studentUid?: string | null;
};

const FALLBACK_YEARS = ['2026/2027', '2025/2026'];
const FALLBACK_TERMS = ['Term I', 'Term II', 'Term III'];

const FALLBACK_REQUIREMENTS: Requirement[] = [
  { id: 'uniform', name: 'Uniform', price: 30000 },
  { id: 'books', name: 'Books', price: 15000 },
  { id: 'materials', name: 'School Materials', price: 8000 },
  { id: 'lab', name: 'Laboratory Materials', price: 12000 },
  { id: 'practical', name: 'Practical Fees', price: 9000 },
  { id: 'trip', name: 'School Trip', price: 25000 },
  { id: 'sports', name: 'Sports Materials', price: 10000 },
];

const PAYMENT_METHODS = [
  { id: 'momo', label: 'Mobile Money (MTN & Airtel)', icon: Smartphone, accent: '#FCB038' },
  { id: 'card', label: 'Card', icon: CreditCard, accent: '#8640AA' },
  { id: 'bank', label: 'Bank', icon: Landmark, accent: '#000435' },
];

const STEPS = [
  { label: 'Academic info', shortLabel: 'Year & Term', icon: CalendarDays },
  { label: 'Select items', shortLabel: 'Requirements', icon: ShoppingBag },
  { label: 'Summary', shortLabel: 'Summary', icon: BadgeCheck },
  { label: 'Pay', shortLabel: 'Payment', icon: Wallet2 },
];

const RWF = new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 });
function frw(n: number) {
  return `${RWF.format(Math.max(0, n))} Frw`;
}

function toRequirements(lines: CircularRequirementLine[]): Requirement[] {
  return lines.map((r) => ({
    id: r.id,
    name: r.name,
    price: r.price,
    description: r.description,
  }));
}

export function RequirementsPay({
  student = {
    name: 'Jean Claude Habimana',
    school: 'Kigali Bright Academy',
    studentClass: 'Senior 3 · Science',
  },
  onPaymentSuccess,
  onClose,
}: {
  student?: RequirementsStudentContext;
  onPaymentSuccess?: (payload: PaymentSuccessPayload) => void;
  onClose?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [years, setYears] = useState<string[]>(FALLBACK_YEARS);
  const [terms, setTerms] = useState<string[]>(FALLBACK_TERMS);
  const [year, setYear] = useState(student.preferredYear ?? '');
  const [term, setTerm] = useState(student.preferredTerm ?? '');
  const [catalog, setCatalog] = useState<Requirement[]>(FALLBACK_REQUIREMENTS);
  const [filter, setFilter] = useState('');
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [circularMeta, setCircularMeta] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [method, setMethod] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [receiptRef, setReceiptRef] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!student.organizationId) return;
    let cancelled = false;
    (async () => {
      setOptionsLoading(true);
      try {
        const opts = await fetchCircularOptions(student.organizationId!, student.classLabel);
        if (cancelled) return;
        if (opts.academicYears.length) setYears(opts.academicYears);
        if (opts.terms.length) setTerms(opts.terms);
        if (!year && opts.academicYears[0]) setYear(opts.academicYears[0]);
        if (!term && opts.terms[0]) setTerm(opts.terms[0]);
      } catch {
        /* keep fallbacks */
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.organizationId, student.classLabel]);

  const selectedItems = catalog.filter((r) => selected.has(r.id));
  const total = useMemo(() => selectedItems.reduce((s, r) => s + r.price, 0), [selectedItems]);
  const filtered = catalog.filter((r) =>
    filter.trim() ? r.name.toLowerCase().includes(filter.trim().toLowerCase()) : true
  );

  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function loadRequirementsFromCircular() {
    if (!student.organizationId || !year || !term) {
      setCatalog(FALLBACK_REQUIREMENTS);
      setCircularMeta(null);
      return true;
    }
    setItemsLoading(true);
    setLoadError(null);
    try {
      const circular = await fetchPublicCircular({
        organizationId: student.organizationId,
        academicYear: year,
        term,
        classLabel: student.classLabel,
      });
      const next = toRequirements(circular.requirements);
      // Requirements may have zero cost in circular — still show them; allow paying listed price
      setCatalog(next.length ? next : FALLBACK_REQUIREMENTS);
      setSelected(new Set());
      setCircularMeta(`${circular.className} · ${circular.status}`);
      return true;
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Could not load circular requirements';
      setLoadError(
        /failed to fetch|networkerror|load failed/i.test(raw)
          ? 'Cannot reach Shule+ Fee Wizard API (port 3012). Start it and allow CORS for the landing page.'
          : raw
      );
      setCatalog([]);
      setCircularMeta(null);
      return false;
    } finally {
      setItemsLoading(false);
    }
  }

  async function confirmPayment() {
    setPaying(true);
    await new Promise((r) => setTimeout(r, 1200));
    const reference = makePaymentReference('RQ');
    const methodLabel = PAYMENT_METHODS.find((m) => m.id === method)?.label ?? 'Mobile Money';
    const lines = selectedItems.map((r) => ({ name: r.name, amount: r.price }));
    setReceiptRef(reference);
    setPaying(false);
    setPaid(true);
    onPaymentSuccess?.({
      kind: 'requirements',
      studentName: student.name,
      studentUid: student.studentUid ?? undefined,
      organizationId: student.organizationId,
      amountPaid: total,
      remainingBalance: null,
      academicYear: year || '—',
      term: term || '—',
      reference,
      method: methodLabel,
      lines,
    });
  }

  function handleDownloadReceipt() {
    setDownloading(true);
    const methodLabel = PAYMENT_METHODS.find((m) => m.id === method)?.label ?? 'Mobile Money';
    downloadModernReceipt({
      kind: 'requirements',
      reference: receiptRef || makePaymentReference('RQ'),
      studentName: student.name,
      schoolName: student.school,
      studentClass: student.studentClass,
      studentUid: student.studentUid ?? undefined,
      academicYear: year || '—',
      term: term || '—',
      method: methodLabel,
      lines: selectedItems.map((r) => ({ name: r.name, amount: r.price })),
      amountPaid: total,
      remainingBalance: null,
      paidAt: new Date(),
    });
    setTimeout(() => setDownloading(false), 600);
  }

  function resetAll() {
    setStep(0);
    setSelected(new Set());
    setMethod(null);
    setPaid(false);
    setReceiptRef('');
    setLoadError(null);
  }

  const currentLabel = STEPS[step].label;

  async function goNext() {
    if (currentLabel === 'Academic info') {
      const ok = await loadRequirementsFromCircular();
      if (!ok && student.organizationId) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  if (paid) {
    return (
      <div className="mx-auto w-full max-w-[720px] rounded-[24px] border border-navy-900/[0.06] bg-white p-6 text-center shadow-[0_16px_48px_-16px_rgba(0,4,53,0.16)] sm:p-10">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: '#FCB03822' }}
        >
          <BadgeCheck className="h-9 w-9 text-[#FCB038]" strokeWidth={2.2} />
        </motion.div>
        <h2 className="mt-5 font-display text-2xl font-bold text-navy-900">Payment successful</h2>
        <p className="mt-2 text-sm text-navy-700/60">
          {frw(total)} paid for {student.name} · {selectedItems.length} item
          {selectedItems.length === 1 ? '' : 's'}
        </p>
        <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-navy-900/[0.06] bg-[#F8F9FA] p-4 text-left text-sm">
          <div className="flex justify-between py-1">
            <span className="text-navy-700/60">Reference</span>
            <span className="font-semibold font-mono text-navy-900">{receiptRef}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-navy-700/60">Method</span>
            <span className="font-semibold text-navy-900">
              {PAYMENT_METHODS.find((m) => m.id === method)?.label ?? 'Mobile Money'}
            </span>
          </div>
        </div>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleDownloadReceipt}
            disabled={downloading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#000435] px-6 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(0,4,53,0.45)] transition hover:bg-navy-800 disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#FCB038]" />
            ) : (
              <Download className="h-4 w-4 text-[#FCB038]" />
            )}
            Download receipt
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-navy-900/12 px-6 text-sm font-semibold text-navy-900 hover:bg-navy-900/[0.03]"
          >
            <RotateCcw className="h-4 w-4" />
            Pay for more items
          </button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-navy-900/12 px-6 text-sm font-semibold text-navy-700/70 hover:bg-navy-900/[0.03]"
            >
              Back to registry
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <WizardShell
      eyebrow="Student requirements"
      title="Pay for requirements"
      steps={STEPS}
      current={step}
      onBack={step > 0 ? goBack : undefined}
      onNext={currentLabel === 'Pay' ? confirmPayment : goNext}
      nextLabel={
        currentLabel === 'Pay'
          ? `Confirm payment · ${frw(total)}`
          : itemsLoading
            ? 'Loading…'
            : 'Continue'
      }
      nextDisabled={
        itemsLoading ||
        paying ||
        (currentLabel === 'Academic info' && (!year || !term)) ||
        (currentLabel === 'Select items' && selected.size === 0) ||
        (currentLabel === 'Pay' && !method)
      }
      loading={(currentLabel === 'Pay' && paying) || itemsLoading}
    >
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-[#F8F9FA] px-3.5 py-2.5 text-[12.5px] text-navy-700/70">
        <span className="inline-flex items-center gap-1.5 font-semibold text-navy-900">
          <GraduationCap className="h-3.5 w-3.5 text-amber-500" />
          {student.name}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-amber-500" />
          {student.school}
        </span>
        <span>{student.studentClass}</span>
      </div>

      {currentLabel === 'Academic info' && (
        <div className="space-y-5">
          {loadError ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12.5px] text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {loadError}
            </div>
          ) : null}
          {optionsLoading ? (
            <p className="flex items-center gap-2 text-sm text-navy-700/55">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading years &amp; terms from Shule+ circulars…
            </p>
          ) : (
            <p className="text-[12.5px] text-navy-700/55">
              Requirements come from the approved Shule+ circular for the selected year and term.
              No outstanding-balance calculation — pay any selected items.
            </p>
          )}
          <div>
            <label className="mb-2 block text-sm font-semibold text-navy-900">Academic Year</label>
            <div className="grid grid-cols-2 gap-2.5">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    year === y
                      ? 'border-[#FCB038] bg-[#FCB038]/10 text-navy-900'
                      : 'border-navy-900/10 text-navy-700/70 hover:border-navy-900/20'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-navy-900">Term</label>
            <div className="grid grid-cols-3 gap-2.5">
              {terms.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTerm(t)}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                    term === t
                      ? 'border-[#FCB038] bg-[#FCB038]/10 text-navy-900'
                      : 'border-navy-900/10 text-navy-700/70 hover:border-navy-900/20'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentLabel === 'Select items' && (
        <div>
          {loadError ? (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12.5px] text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {loadError}
            </div>
          ) : null}
          {circularMeta ? (
            <p className="mb-3 text-[12px] text-navy-700/50">Circular: {circularMeta}</p>
          ) : null}

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter requirements…"
              className="h-9 min-w-[140px] flex-1 rounded-xl border border-navy-900/10 bg-white px-3 text-sm outline-none focus:border-[#2355FF]/40"
            />
            <div className="flex gap-2 text-xs font-semibold">
              <button
                type="button"
                className="text-[#2355FF] hover:underline"
                onClick={() => setSelected(new Set(catalog.map((r) => r.id)))}
              >
                Select all
              </button>
              <span className="text-navy-900/20">·</span>
              <button
                type="button"
                className="text-navy-700/60 hover:underline"
                onClick={() => setSelected(new Set())}
              >
                Deselect all
              </button>
            </div>
          </div>

          <ul className="max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
            {filtered.map((r) => {
              const isChecked = selected.has(r.id);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => toggleItem(r.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                      isChecked
                        ? 'border-[#FCB038] bg-[#FCB038]/[0.06]'
                        : 'border-navy-900/[0.07] hover:border-navy-900/15'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {isChecked ? (
                        <CheckSquare className="h-5 w-5 shrink-0 text-[#FCB038]" />
                      ) : (
                        <Square className="h-5 w-5 shrink-0 text-navy-900/25" />
                      )}
                      <span>
                        <span className="block text-sm font-semibold text-navy-900">{r.name}</span>
                        {r.description ? (
                          <span className="block text-[11.5px] text-navy-700/50">{r.description}</span>
                        ) : null}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-navy-900">{frw(r.price)}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {!filtered.length ? (
            <p className="py-6 text-center text-sm text-navy-700/50">
              No requirements listed on this circular.
            </p>
          ) : null}

          <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#F8F9FA] px-5 py-4">
            <span className="text-sm font-semibold text-navy-700/70">Selected total</span>
            <span className="font-display text-lg font-extrabold text-[#FCB038]">{frw(total)}</span>
          </div>
        </div>
      )}

      {currentLabel === 'Summary' && (
        <div className="space-y-5">
          <div className="flex justify-between text-sm">
            <span className="text-navy-700/55">Student</span>
            <span className="font-semibold text-navy-900">{student.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-navy-700/55">Academic year</span>
            <span className="font-semibold text-navy-900">{year || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-navy-700/55">Term</span>
            <span className="font-semibold text-navy-900">{term || '—'}</span>
          </div>

          <div className="rounded-2xl border border-navy-900/[0.07] p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-700/45">
              Selected requirements
            </p>
            <ul className="space-y-1.5">
              {selectedItems.map((r) => (
                <li key={r.id} className="flex justify-between text-sm">
                  <span className="text-navy-700/70">{r.name}</span>
                  <span className="font-semibold text-navy-900">{frw(r.price)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-[#000435] px-5 py-4 text-white">
            <span className="text-sm font-semibold text-white/70">Total to pay</span>
            <span className="font-display text-xl font-extrabold text-[#FCB038]">{frw(total)}</span>
          </div>
        </div>
      )}

      {currentLabel === 'Pay' && (
        <div className="space-y-5">
          <p className="text-sm text-navy-700/55">Choose how you&apos;d like to pay</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PAYMENT_METHODS.map((m) => {
              const Icon = m.icon;
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 transition ${
                    active
                      ? 'border-transparent shadow-[0_10px_24px_-10px_rgba(0,4,53,0.3)]'
                      : 'border-navy-900/10 hover:border-navy-900/20'
                  }`}
                  style={
                    active
                      ? { backgroundColor: `${m.accent}12`, boxShadow: `0 0 0 2px ${m.accent}` }
                      : undefined
                  }
                >
                  <Icon className="h-6 w-6" style={{ color: m.accent }} />
                  <span className="text-xs font-semibold text-navy-900">{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-[#F8F9FA] px-5 py-4">
            <span className="text-sm font-semibold text-navy-700/70">Amount to pay</span>
            <span className="font-display text-lg font-extrabold text-navy-900">{frw(total)}</span>
          </div>
        </div>
      )}
    </WizardShell>
  );
}
