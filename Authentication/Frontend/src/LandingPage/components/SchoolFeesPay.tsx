'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  CheckSquare,
  Square,
  Wallet2,
  Smartphone,
  CreditCard,
  Landmark,
  Bell,
  MessageSquareText,
  Mail,
  MessagesSquare,
  BadgeCheck,
  Download,
  RotateCcw,
  GraduationCap,
  Building2,
  BookOpenCheck,
  Loader2,
  AlertCircle,
  Phone,
  Clock3,
  XCircle,
  ShieldCheck,
} from 'lucide-react';
import { WizardShell } from './ui/WizardShell';
import {
  fetchCircularOptions,
  fetchPublicCircular,
  fetchStudentFeesStructure,
  getPublicPaymentStatus,
  initiateStudentFeePayment,
  type CircularPaymentLine,
  type PublicPayMethod,
} from '../services/portal-api';
import {
  downloadFeeReceiptPdf,
  makePaymentReference,
  type PaymentSuccessPayload,
} from '../services/portal-receipt';

type Fee = {
  id: string;
  name: string;
  required: number;
  paid: number;
};

export type SchoolFeesStudentContext = {
  name: string;
  fullName?: string | null;
  school: string;
  studentClass: string;
  organizationId?: string;
  classLabel?: string | null;
  preferredYear?: string | null;
  preferredTerm?: string | null;
  studentUid?: string | null;
  id?: string | null;
  studentCode?: string | null;
};

const FALLBACK_YEARS = ['2026/2027', '2025/2026'];
const FALLBACK_TERMS = ['Term I', 'Term II', 'Term III'];

const FALLBACK_FEES: Fee[] = [
  { id: 'tuition', name: 'Tuition Fees', required: 150000, paid: 0 },
  { id: 'registration', name: 'Registration Fees', required: 20000, paid: 0 },
  { id: 'examination', name: 'Examination Fees', required: 15000, paid: 0 },
  { id: 'transport', name: 'Transport Fees', required: 50000, paid: 0 },
  { id: 'feeding', name: 'Feeding Fees', required: 60000, paid: 0 },
  { id: 'boarding', name: 'Boarding Fees', required: 80000, paid: 0 },
  { id: 'ict', name: 'ICT Fees', required: 10000, paid: 0 },
  { id: 'insurance', name: 'Insurance Fees', required: 8000, paid: 0 },
];

const PAYMENT_METHODS: Array<{
  id: 'momo' | 'card' | 'bank';
  label: string;
  sub: string;
  icon: typeof Smartphone;
  accent: string;
}> = [
  { id: 'momo', label: 'Mobile Money', sub: 'MTN · Airtel', icon: Smartphone, accent: '#FCB038' },
  { id: 'card', label: 'Bank Card', sub: 'Visa · Mastercard', icon: CreditCard, accent: '#8640AA' },
  { id: 'bank', label: 'Bank Account', sub: 'Direct transfer', icon: Landmark, accent: '#000435' },
];

const RWANDA_BANKS = [
  'Bank of Kigali (BK)',
  'BPR Bank Rwanda',
  'I&M Bank Rwanda',
  'Equity Bank Rwanda',
  'Ecobank Rwanda',
  'Access Bank Rwanda',
  'Bank of Africa Rwanda (BOA)',
  'Guaranty Trust Bank Rwanda (GTBank)',
  'NCBA Bank Rwanda',
  'AB Bank Rwanda',
  'Urwego Bank',
  'Zigama Credit and Savings Bank',
  'Unguka Bank',
];

/** Rwandan mobile prefixes → network (72/73/75 Airtel incl. legacy Tigo, 78/79 MTN). */
function detectNetwork(phone: string): 'MTN' | 'AIRTEL' | null {
  const m = phone.replace(/[^\d+]/g, '').match(/^(?:\+?250|0)?(7\d)(\d{7})$/);
  if (!m) return null;
  if (['72', '73', '75'].includes(m[1])) return 'AIRTEL';
  if (['78', '79'].includes(m[1])) return 'MTN';
  return null;
}

function normalizeMomoPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '').replace(/^\+?250/, '0');
  return digits.length === 9 && digits.startsWith('7') ? `0${digits}` : digits;
}

function isValidMomoPhone(phone: string): boolean {
  return /^07\d{8}$/.test(normalizeMomoPhone(phone));
}

const STEPS = [
  { label: 'Academic info', shortLabel: 'Year & Term', icon: CalendarDays },
  { label: 'Select fees', shortLabel: 'Fees', icon: CheckSquare },
  { label: 'Installment', shortLabel: 'Installment', icon: BookOpenCheck },
  { label: 'Summary', shortLabel: 'Summary', icon: BadgeCheck },
  { label: 'Pay', shortLabel: 'Payment', icon: Wallet2 },
];

const RWF = new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 });
function frw(n: number) {
  return `${RWF.format(Math.max(0, n))} Frw`;
}

function paymentsToFees(lines: CircularPaymentLine[]): Fee[] {
  return lines.map((p) => ({
    id: p.id,
    name: p.name,
    required: p.amount,
    paid: 0,
  }));
}

export function SchoolFeesPay({
  student = {
    name: 'Jean Claude Habimana',
    school: 'Kigali Bright Academy',
    studentClass: 'Senior 3 · Science',
  },
  onPaymentSuccess,
  onClose,
}: {
  student?: SchoolFeesStudentContext;
  onPaymentSuccess?: (payload: PaymentSuccessPayload) => void;
  onClose?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [years, setYears] = useState<string[]>(FALLBACK_YEARS);
  const [terms, setTerms] = useState<string[]>(FALLBACK_TERMS);
  const [year, setYear] = useState(student.preferredYear ?? '');
  const [term, setTerm] = useState(student.preferredTerm ?? '');
  const [fees, setFees] = useState<Fee[]>(FALLBACK_FEES);
  const [feeFilter, setFeeFilter] = useState('');
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [feesLoading, setFeesLoading] = useState(false);
  const [circularMeta, setCircularMeta] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [notify, setNotify] = useState(true);
  const [channels, setChannels] = useState<Set<string>>(new Set(['sms', 'email']));
  const [method, setMethod] = useState<'momo' | 'card' | 'bank' | null>(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [receiptRef, setReceiptRef] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PENDING'>('PAID');
  const [downloading, setDownloading] = useState(false);
  const [rechecking, setRechecking] = useState(false);

  // Method-specific fields
  const [momoPhone, setMomoPhone] = useState('');
  const [momoProvider, setMomoProvider] = useState<'MTN' | 'AIRTEL' | ''>('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [bankConfirm, setBankConfirm] = useState(false);

  // Payment lifecycle
  const [payStage, setPayStage] = useState<'idle' | 'processing' | 'awaiting' | 'failed'>('idle');
  const [payError, setPayError] = useState<string | null>(null);
  const apiRefRef = useRef('');
  const pollRef = useRef<{ timer?: ReturnType<typeof setTimeout>; cancelled?: boolean }>({});

  useEffect(
    () => () => {
      if (pollRef.current.timer) clearTimeout(pollRef.current.timer);
    },
    []
  );

  function stopPolling() {
    pollRef.current.cancelled = true;
    if (pollRef.current.timer) clearTimeout(pollRef.current.timer);
  }

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

  const totals = useMemo(() => {
    const required = fees.reduce((s, f) => s + f.required, 0);
    const alreadyPaid = fees.reduce((s, f) => s + f.paid, 0);
    const remaining = required - alreadyPaid;
    const selectedAmount = fees
      .filter((f) => selected.has(f.id))
      .reduce((s, f) => s + Math.max(0, f.required - f.paid), 0);
    return { required, alreadyPaid, remaining, selectedAmount };
  }, [fees, selected]);

  const needsInstallment = totals.selectedAmount > 0 && totals.selectedAmount < totals.remaining;
  const selectedFees = fees.filter((f) => selected.has(f.id));
  const filteredFees = fees.filter((f) =>
    feeFilter.trim() ? f.name.toLowerCase().includes(feeFilter.trim().toLowerCase()) : true
  );

  function toggleFee(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleChannel(id: string) {
    setChannels((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function loadFeesFromCircular() {
    if (!student.organizationId || !year || !term) {
      setFees(FALLBACK_FEES);
      setCircularMeta(null);
      return true;
    }
    setFeesLoading(true);
    setLoadError(null);
    try {
      const fromPortal = await fetchStudentFeesStructure({
        organizationId: student.organizationId,
        academicYear: year,
        term,
        className: student.classLabel,
        studentCode: student.studentUid ?? student.studentCode ?? undefined,
        studentId: student.id,
        studentName: student.fullName,
        autoBill: true,
      });

      if (fromPortal?.fees?.length) {
        let remainingPaid = fromPortal.paid;
        const next: Fee[] = fromPortal.fees.map((f) => {
          const paid = Math.min(f.amount, remainingPaid);
          remainingPaid -= paid;
          return { id: f.id, name: f.name, required: f.amount, paid };
        });
        setFees(next);
        setSelected(new Set(next.filter((f) => f.required - f.paid > 0).map((f) => f.id)));
        setCircularMeta(
          fromPortal.billNumber
            ? `${fromPortal.structureName ?? 'School Fees'} · ${fromPortal.billNumber}`
            : fromPortal.structureName ?? 'School Fees structure'
        );
        return true;
      }

      const circular = await fetchPublicCircular({
        organizationId: student.organizationId,
        academicYear: year,
        term,
        classLabel: student.classLabel,
      });
      const schoolOnly = circular.payments.filter(
        (p) => (p.payChannel ?? 'school').toLowerCase() === 'school'
      );
      const next = paymentsToFees(schoolOnly);
      setFees(next.length ? next : FALLBACK_FEES);
      setSelected(new Set());
      setCircularMeta(`${circular.className} · ${circular.status}`);
      return true;
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Could not load circular fees';
      setLoadError(
        /failed to fetch|networkerror|load failed/i.test(raw)
          ? 'Cannot reach Shule+ Fee Wizard API (port 3012). Start it and allow CORS for the landing page.'
          : raw
      );
      setFees([]);
      setCircularMeta(null);
      return false;
    } finally {
      setFeesLoading(false);
    }
  }

  function selectMethod(next: 'momo' | 'card' | 'bank') {
    if (method === next) return;
    stopPolling();
    setMethod(next);
    setBankConfirm(false);
    setPayStage('idle');
    setPayError(null);
  }

  function methodValid(): boolean {
    if (method === 'momo') {
      return isValidMomoPhone(momoPhone) && momoProvider !== '';
    }
    if (method === 'card') {
      const digits = cardNumber.replace(/\D/g, '');
      const mm = Number(cardExpiry.slice(0, 2));
      return (
        digits.length >= 12 &&
        digits.length <= 19 &&
        cardHolder.trim().length >= 2 &&
        /^\d{2}\/\d{2}$/.test(cardExpiry) &&
        mm >= 1 &&
        mm <= 12 &&
        /^\d{3,4}$/.test(cardCvv)
      );
    }
    if (method === 'bank') {
      return bankName !== '' && bankAccount.replace(/\s/g, '').length >= 4 && bankHolder.trim().length >= 2;
    }
    return false;
  }

  function finalizeSuccess(refLabel: string, status: 'PAID' | 'PENDING' = 'PAID') {
    stopPolling();
    setReceiptRef(refLabel || makePaymentReference('SF'));
    setPaymentStatus(status);
    setPaying(false);
    setPayStage('idle');
    setPaid(true);
    const methodLabel = PAYMENT_METHODS.find((m) => m.id === method)?.label ?? 'Mobile Money';
    onPaymentSuccess?.({
      kind: 'school-fees',
      studentName: student.name,
      studentUid: student.studentUid ?? undefined,
      organizationId: student.organizationId,
      amountPaid: totals.selectedAmount,
      remainingBalance: Math.max(0, totals.remaining - totals.selectedAmount),
      academicYear: year || '—',
      term: term || '—',
      reference: refLabel,
      method: methodLabel,
      status,
      lines: selectedFees.map((f) => ({
        name: f.name,
        amount: Math.max(0, f.required - f.paid),
      })),
    });
  }

  async function pollUntilDone(reference: string, opts: { maxAttempts: number; intervalMs: number; onTimeout?: 'failed' | 'accept' }) {
    let attempts = 0;
    pollRef.current.cancelled = false;
    const tick = async () => {
      if (pollRef.current.cancelled) return;
      attempts += 1;
      try {
        const st = await getPublicPaymentStatus(reference);
        if (st.status === 'COMPLETED' || st.status === 'SUCCESSFUL') {
          finalizeSuccess(st.receiptNumber || st.paymentNumber || reference, 'PAID');
          return;
        }
        if (st.status === 'FAILED') {
          stopPolling();
          setPaying(false);
          setPayStage('failed');
          setPayError('The payment was declined. Please check the details and try again.');
          return;
        }
      } catch {
        /* transient — keep polling */
      }
      if (attempts >= opts.maxAttempts) {
        stopPolling();
        if (opts.onTimeout === 'accept') {
          // Card/bank: payment is recorded server-side but funds are not confirmed
          // yet — keep the server reference and mark the receipt PENDING until
          // finance confirms/collects in the fees portal.
          finalizeSuccess(apiRefRef.current || makePaymentReference('SF'), 'PENDING');
          return;
        }
        setPaying(false);
        setPayStage('failed');
        setPayError(
          'Still waiting for confirmation. Approve the request on your phone with your Mobile Money PIN, then tap "Check again".'
        );
        return;
      }
      pollRef.current.timer = setTimeout(tick, opts.intervalMs);
    };
    pollRef.current.timer = setTimeout(tick, opts.intervalMs);
  }

  function checkMomoAgain() {
    if (!apiRefRef.current) return;
    setPayStage('awaiting');
    setPaying(true);
    setPayError(null);
    void pollUntilDone(apiRefRef.current, { maxAttempts: 45, intervalMs: 4000 });
  }

  async function recheckPendingPayment() {
    if (!apiRefRef.current || rechecking) return;
    setRechecking(true);
    try {
      const st = await getPublicPaymentStatus(apiRefRef.current);
      if (st.status === 'COMPLETED' || st.status === 'SUCCESSFUL') {
        setReceiptRef(st.receiptNumber || st.paymentNumber || receiptRef);
        setPaymentStatus('PAID');
      }
    } catch {
      /* transient — user can retry */
    } finally {
      setRechecking(false);
    }
  }

  async function startPayment() {
    if (!method || !methodValid() || paying) return;
    if (method === 'bank' && !bankConfirm) {
      setBankConfirm(true);
      return;
    }
    setPaying(true);
    setPayError(null);
    setPayStage('processing');
    try {
      const res = await initiateStudentFeePayment({
        organizationId: student.organizationId ?? undefined,
        studentId: student.id ?? undefined,
        studentCode: (student.studentCode ?? student.studentUid ?? undefined) as string | undefined,
        studentName: (student.fullName ?? student.name) as string,
        academicYear: year || '—',
        term: term || '—',
        className: student.classLabel ?? undefined,
        amount: totals.selectedAmount,
        method: method.toUpperCase() as PublicPayMethod,
        provider: method === 'momo' ? ((momoProvider || detectNetwork(momoPhone) || 'MTN') as 'MTN' | 'AIRTEL') : undefined,
        phone: method === 'momo' ? normalizeMomoPhone(momoPhone) : undefined,
        cardNumber: method === 'card' ? cardNumber : undefined,
        cardHolder: method === 'card' ? cardHolder.trim() : undefined,
        expiry: method === 'card' ? cardExpiry : undefined,
        cvv: method === 'card' ? cardCvv : undefined,
        bankName: method === 'bank' ? bankName : undefined,
        accountNumber: method === 'bank' ? bankAccount : undefined,
        accountHolder: method === 'bank' ? bankHolder.trim() : undefined,
        allowOverpay: true,
        lines: selectedFees.map((f) => ({
          name: f.name,
          amount: Math.max(0, f.required - f.paid),
        })),
      });
      apiRefRef.current = res.reference;
      if (method === 'momo') {
        setPayStage('awaiting');
        void pollUntilDone(res.reference, { maxAttempts: 45, intervalMs: 4000, onTimeout: 'failed' });
      } else {
        await new Promise((r) => setTimeout(r, 900));
        void pollUntilDone(res.reference, { maxAttempts: 4, intervalMs: 3000, onTimeout: 'accept' });
      }
    } catch (err) {
      stopPolling();
      setPaying(false);
      setPayStage('idle');
      setPayError(err instanceof Error ? err.message : 'Could not start the payment');
    }
  }

  function handleDownloadReceipt() {
    setDownloading(true);
    const methodLabel = PAYMENT_METHODS.find((m) => m.id === method)?.label ?? 'Mobile Money';
    void downloadFeeReceiptPdf({
      kind: 'school-fees',
      reference: receiptRef || apiRefRef.current || makePaymentReference('SF'),
      studentName: student.name,
      schoolName: student.school,
      studentClass: student.studentClass,
      studentUid: student.studentUid ?? undefined,
      academicYear: year || '—',
      term: term || '—',
      method: methodLabel,
      lines: selectedFees.map((f) => ({
        name: f.name,
        amount: Math.max(0, f.required - f.paid),
      })),
      amountPaid: totals.selectedAmount,
      remainingBalance: Math.max(0, totals.remaining - totals.selectedAmount),
      paidAt: new Date(),
      status: paymentStatus,
    });
    setTimeout(() => setDownloading(false), 600);
  }

  function resetAll() {
    stopPolling();
    setStep(0);
    setSelected(new Set());
    setDeadline('');
    setNotes('');
    setMethod(null);
    setPaid(false);
    setReceiptRef('');
    setPaymentStatus('PAID');
    setLoadError(null);
    setPayStage('idle');
    setPayError(null);
    setBankConfirm(false);
    apiRefRef.current = '';
  }

  const effectiveSteps = needsInstallment ? STEPS : STEPS.filter((s) => s.label !== 'Installment');
  const stepIndex = (label: string) => effectiveSteps.findIndex((s) => s.label === label);

  async function goNext() {
    if (effectiveSteps[step]?.label === 'Academic info') {
      const ok = await loadFeesFromCircular();
      if (!ok && student.organizationId) return;
    }
    if (effectiveSteps[step]?.label === 'Select fees' && !needsInstallment) {
      setStep(stepIndex('Summary'));
      return;
    }
    setStep((s) => Math.min(s + 1, effectiveSteps.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  const currentLabel = effectiveSteps[step]?.label;

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
        <h2 className="mt-5 font-display text-2xl font-bold text-navy-900">
          {paymentStatus === 'PENDING' ? 'Payment recorded' : 'Payment successful'}
        </h2>
        <div className="mt-3 flex justify-center">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-extrabold tracking-[0.14em] ${
              paymentStatus === 'PENDING'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {paymentStatus === 'PENDING' ? (
              <Clock3 className="h-3.5 w-3.5" />
            ) : (
              <BadgeCheck className="h-3.5 w-3.5" />
            )}
            {paymentStatus === 'PENDING' ? 'PENDING' : 'PAID'}
          </span>
        </div>
        {paymentStatus === 'PENDING' ? (
          <p className="mx-auto mt-3 max-w-md rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
            The payment request is saved but the money has not arrived yet. Keep this
            reference — it turns to <strong>PAID</strong> automatically once the funds are
            confirmed by the school.
          </p>
        ) : null}
        <p className="mt-2 text-sm text-navy-700/60">
          {frw(totals.selectedAmount)} paid for {student.name} · {year || '—'} {term || ''}
        </p>
        <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-navy-900/[0.06] bg-[#F8F9FA] p-4 text-left text-sm">
          <div className="flex justify-between py-1">
            <span className="text-navy-700/60">Reference</span>
            <span className="font-semibold text-navy-900 font-mono">{receiptRef}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-navy-700/60">Method</span>
            <span className="font-semibold text-navy-900">
              {PAYMENT_METHODS.find((m) => m.id === method)?.label ?? 'Mobile Money'}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-navy-700/60">Remaining balance</span>
            <span className="font-semibold text-navy-900">
              {frw(totals.remaining - totals.selectedAmount)}
            </span>
          </div>
        </div>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {paymentStatus === 'PENDING' && apiRefRef.current ? (
            <button
              type="button"
              onClick={recheckPendingPayment}
              disabled={rechecking}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-6 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
            >
              {rechecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}
              Check again
            </button>
          ) : null}
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
            Make another payment
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
      eyebrow="School fees"
      title="Pay school fees"
      steps={effectiveSteps}
      current={step}
      onBack={step > 0 && !paying ? goBack : undefined}
      onNext={currentLabel === 'Pay' ? startPayment : goNext}
      nextLabel={
        currentLabel === 'Pay'
          ? paying
            ? 'Processing…'
            : !method
              ? 'Select a payment method'
              : method === 'bank' && !bankConfirm
                ? 'Continue to secure bank page'
                : `Pay · ${frw(totals.selectedAmount)}`
            : feesLoading
              ? 'Loading fees…'
              : 'Continue'
      }
      nextDisabled={
        feesLoading ||
        (currentLabel === 'Academic info' && (!year || !term)) ||
        (currentLabel === 'Select fees' && selected.size === 0) ||
        (currentLabel === 'Installment' && !deadline) ||
        (currentLabel === 'Pay' && (!method || !methodValid() || payStage === 'awaiting'))
      }
      loading={(currentLabel === 'Pay' && paying) || feesLoading}
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
              Loading academic years &amp; terms from Shule+ circulars…
            </p>
          ) : (
            <p className="text-[12.5px] text-navy-700/55">
              Select the year and term of the approved Shule+ circular for this class.
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
          {year && term ? (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[12.5px] text-navy-700/55"
            >
              Continue to load fee structure from the approved circular for {year}, {term}
              {student.classLabel ? ` · ${student.classLabel}` : ''}.
            </motion.p>
          ) : null}
        </div>
      )}

      {currentLabel === 'Select fees' && (
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
              value={feeFilter}
              onChange={(e) => setFeeFilter(e.target.value)}
              placeholder="Filter fees…"
              className="h-9 min-w-[140px] flex-1 rounded-xl border border-navy-900/10 bg-white px-3 text-sm outline-none focus:border-[#2355FF]/40"
            />
            <div className="flex gap-2 text-xs font-semibold">
              <button
                type="button"
                className="text-[#2355FF] hover:underline"
                onClick={() => setSelected(new Set(fees.map((f) => f.id)))}
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
            {filteredFees.map((f) => {
              const remaining = f.required - f.paid;
              const isChecked = selected.has(f.id);
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => toggleFee(f.id)}
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
                        <span className="block text-sm font-semibold text-navy-900">{f.name}</span>
                        <span className="block text-[11.5px] text-navy-700/50">
                          {frw(f.required)} required · {frw(f.paid)} paid
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-navy-900">{frw(remaining)}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {!filteredFees.length ? (
            <p className="py-6 text-center text-sm text-navy-700/50">No fees available for this circular.</p>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-2.5 rounded-2xl bg-[#F8F9FA] p-4 text-sm sm:grid-cols-4">
            <TotalCell label="Required" value={frw(totals.required)} />
            <TotalCell label="Already paid" value={frw(totals.alreadyPaid)} />
            <TotalCell label="Remaining" value={frw(totals.remaining)} />
            <TotalCell label="Selected" value={frw(totals.selectedAmount)} highlight />
          </div>
        </div>
      )}

      {currentLabel === 'Installment' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-amber-500/20 bg-[#FCB038]/[0.06] px-4 py-3 text-[12.5px] text-navy-900/80">
            Your selected payment of <strong>{frw(totals.selectedAmount)}</strong> doesn&apos;t cover
            the full remaining balance of <strong>{frw(totals.remaining)}</strong>. Let us know when
            you plan to complete the rest.
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-navy-900">
              Expected payment deadline
            </label>
            <div className="flex items-center gap-2.5 rounded-2xl border border-navy-900/10 px-4 py-3.5 focus-within:border-[#2355FF]/50 focus-within:ring-4 focus-within:ring-[#2355FF]/10">
              <CalendarDays className="h-4 w-4 text-navy-700/40" />
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-transparent text-sm text-navy-900 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-navy-900">
              Installment notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. I will complete payment on 15 September 2026"
              className="w-full rounded-2xl border border-navy-900/10 px-4 py-3 text-sm text-navy-900 outline-none placeholder:text-navy-700/35 focus:border-[#2355FF]/50 focus:ring-4 focus:ring-[#2355FF]/10"
            />
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                <Bell className="h-4 w-4 text-amber-500" />
                Receive notifications
              </span>
              <button
                type="button"
                onClick={() => setNotify((v) => !v)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${notify ? 'bg-[#FCB038]' : 'bg-navy-900/15'}`}
              >
                <motion.span
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
                  animate={{ left: notify ? 22 : 2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              </button>
            </div>
            {notify ? (
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'sms', label: 'SMS', icon: MessageSquareText },
                  { id: 'email', label: 'Email', icon: Mail },
                  { id: 'whatsapp', label: 'WhatsApp', icon: MessagesSquare },
                ].map((c) => {
                  const Icon = c.icon;
                  const on = channels.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleChannel(c.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        on
                          ? 'border-[#2355FF]/30 bg-[#2355FF]/10 text-[#2355FF]'
                          : 'border-navy-900/10 text-navy-700/55'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {currentLabel === 'Summary' && (
        <div className="space-y-5">
          <SummaryRow label="Student" value={student.name} />
          <SummaryRow label="School" value={student.school} />
          <SummaryRow label="Class" value={student.studentClass} />
          <SummaryRow label="Academic year" value={year || '—'} />
          <SummaryRow label="Term" value={term || '—'} />

          <div className="rounded-2xl border border-navy-900/[0.07] p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-700/45">
              Selected fees
            </p>
            <ul className="space-y-1.5">
              {selectedFees.map((f) => (
                <li key={f.id} className="flex justify-between text-sm">
                  <span className="text-navy-700/70">{f.name}</span>
                  <span className="font-semibold text-navy-900">{frw(f.required - f.paid)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-[#F8F9FA] p-4 text-sm">
            <TotalCell label="Current payment" value={frw(totals.selectedAmount)} highlight />
            <TotalCell
              label="Remaining balance"
              value={frw(totals.remaining - totals.selectedAmount)}
            />
          </div>

          {needsInstallment ? (
            <div className="rounded-2xl border border-navy-900/[0.07] p-4 text-sm">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-navy-700/45">
                Installment
              </p>
              <SummaryRow label="Expected deadline" value={deadline || '—'} compact />
              <SummaryRow label="Notifications" value={notify ? 'Enabled' : 'Disabled'} compact />
            </div>
          ) : null}

          <div className="flex items-center justify-between rounded-2xl bg-[#000435] px-5 py-4 text-white">
            <span className="text-sm font-semibold text-white/70">Total to pay now</span>
            <span className="font-display text-xl font-extrabold text-[#FCB038]">
              {frw(totals.selectedAmount)}
            </span>
          </div>
        </div>
      )}

      {currentLabel === 'Pay' && (
        <div className="space-y-5">
          <p className="text-sm text-navy-700/55">Choose how you&apos;d like to pay</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PAYMENT_METHODS.map((m) => {
              const Icon = m.icon;
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => selectMethod(m.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-4 transition ${
                    active
                      ? 'border-transparent'
                      : 'border-navy-900/10 hover:border-navy-900/20'
                  }`}
                  style={
                    active
                      ? { backgroundColor: `${m.accent}12`, boxShadow: `0 0 0 2px ${m.accent}` }
                      : undefined
                  }
                >
                  <Icon className="h-6 w-6" style={{ color: m.accent }} />
                  <span className="text-xs font-bold text-navy-900">{m.label}</span>
                  <span className="text-[10.5px] font-medium uppercase tracking-wide text-navy-700/45">
                    {m.sub}
                  </span>
                </button>
              );
            })}
          </div>

          {payError && payStage !== 'failed' && method !== 'momo' ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12.5px] text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {payError}
            </div>
          ) : null}

          {/* ---------------- Mobile Money ---------------- */}
          {method === 'momo' && payStage === 'awaiting' ? (
            <div className="rounded-2xl border border-[#FCB038]/40 bg-[#FCB038]/[0.07] p-5 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#FCB038]" />
              <h3 className="mt-3 font-display text-lg font-bold text-navy-900">
                Payment request sent
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-navy-700/70">
                Check your phone{' '}
                <span className="font-semibold text-navy-900">{normalizeMomoPhone(momoPhone)}</span>{' '}
                and approve the payment request using your Mobile Money PIN.
              </p>
              <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-navy-700 shadow-sm">
                <Clock3 className="h-3.5 w-3.5 animate-pulse text-[#FCB038]" />
                Waiting for confirmation…
              </div>
              {apiRefRef.current ? (
                <p className="mt-3 font-mono text-[11px] text-navy-700/50">
                  Ref: {apiRefRef.current}
                </p>
              ) : null}
            </div>
          ) : null}

          {method === 'momo' && payStage !== 'awaiting' ? (
            <div className="space-y-4 rounded-2xl border border-navy-900/[0.07] p-4 sm:p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-navy-900">
                <Phone className="h-4 w-4 text-[#FCB038]" />
                Mobile Money Payment
              </h3>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-navy-900">
                  Phone Number
                </label>
                <input
                  value={momoPhone}
                  onChange={(e) => {
                    setMomoPhone(e.target.value);
                    const net = detectNetwork(e.target.value);
                    if (net) setMomoProvider(net);
                  }}
                  inputMode="tel"
                  placeholder="+250 7XX XXX XXX"
                  className="h-11 w-full rounded-xl border border-navy-900/10 bg-white px-3.5 font-mono text-sm outline-none focus:border-[#2355FF]/40 focus:ring-4 focus:ring-[#2355FF]/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-navy-900">Network</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['MTN', 'AIRTEL'] as const).map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => setMomoProvider(net)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                        momoProvider === net
                          ? 'border-[#FCB038] bg-[#FCB038]/10 text-navy-900'
                          : 'border-navy-900/10 text-navy-700/70 hover:border-navy-900/20'
                      }`}
                    >
                      {net === 'MTN' ? 'MTN Mobile Money' : 'Airtel Money'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#F8F9FA] px-4 py-3 text-sm">
                <span className="text-navy-700/60">Amount</span>
                <span className="font-display font-extrabold text-navy-900">{frw(totals.selectedAmount)}</span>
              </div>
              <p className="text-[12px] text-navy-700/50">
                You&apos;ll receive a prompt on your phone — approve it with your Mobile Money PIN to
                complete the payment.
              </p>
            </div>
          ) : null}

          {/* ---------------- Card ---------------- */}
          {method === 'card' ? (
            <div className="space-y-4 rounded-2xl border border-navy-900/[0.07] p-4 sm:p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-navy-900">
                <CreditCard className="h-4 w-4 text-[#8640AA]" />
                Card Payment
              </h3>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-navy-900">Card Number</label>
                <input
                  value={cardNumber}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, '').slice(0, 19);
                    setCardNumber(d.replace(/(.{4})/g, '$1 ').trim());
                  }}
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  className="h-11 w-full rounded-xl border border-navy-900/10 bg-white px-3.5 font-mono text-sm outline-none focus:border-[#2355FF]/40 focus:ring-4 focus:ring-[#2355FF]/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-navy-900">
                  Cardholder Name
                </label>
                <input
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="Name as printed on the card"
                  className="h-11 w-full rounded-xl border border-navy-900/10 bg-white px-3.5 text-sm outline-none focus:border-[#2355FF]/40 focus:ring-4 focus:ring-[#2355FF]/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-semibold text-navy-900">Expiry Date</label>
                  <input
                    value={cardExpiry}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setCardExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
                    }}
                    inputMode="numeric"
                    placeholder="MM/YY"
                    className="h-11 w-full rounded-xl border border-navy-900/10 bg-white px-3.5 font-mono text-sm outline-none focus:border-[#2355FF]/40 focus:ring-4 focus:ring-[#2355FF]/10"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-semibold text-navy-900">CVV</label>
                  <input
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    inputMode="numeric"
                    type="password"
                    placeholder="•••"
                    className="h-11 w-full rounded-xl border border-navy-900/10 bg-white px-3.5 font-mono text-sm outline-none focus:border-[#2355FF]/40 focus:ring-4 focus:ring-[#2355FF]/10"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#F8F9FA] px-4 py-3 text-sm">
                <span className="text-navy-700/60">Amount</span>
                <span className="font-display font-extrabold text-navy-900">{frw(totals.selectedAmount)}</span>
              </div>
              <p className="flex items-start gap-1.5 text-[12px] text-navy-700/50">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                Your card details are processed by a PCI-compliant payment gateway — ShulePlus never
                stores your card number or CVV.
              </p>
            </div>
          ) : null}

          {/* ---------------- Bank ---------------- */}
          {method === 'bank' ? (
            <div className="space-y-4 rounded-2xl border border-navy-900/[0.07] p-4 sm:p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-navy-900">
                <Landmark className="h-4 w-4 text-[#000435]" />
                Bank Payment
              </h3>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-navy-900">Select Bank</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-navy-900/10 bg-white px-3 text-sm outline-none focus:border-[#2355FF]/40 focus:ring-4 focus:ring-[#2355FF]/10"
                >
                  <option value="">Choose your bank…</option>
                  {RWANDA_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-navy-900">Account Number</label>
                <input
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  inputMode="numeric"
                  placeholder="00012345678901"
                  className="h-11 w-full rounded-xl border border-navy-900/10 bg-white px-3.5 font-mono text-sm outline-none focus:border-[#2355FF]/40 focus:ring-4 focus:ring-[#2355FF]/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-navy-900">
                  Account Holder Name
                </label>
                <input
                  value={bankHolder}
                  onChange={(e) => setBankHolder(e.target.value)}
                  placeholder="Full name on the account"
                  className="h-11 w-full rounded-xl border border-navy-900/10 bg-white px-3.5 text-sm outline-none focus:border-[#2355FF]/40 focus:ring-4 focus:ring-[#2355FF]/10"
                />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#F8F9FA] px-4 py-3 text-sm">
                <span className="text-navy-700/60">Amount</span>
                <span className="font-display font-extrabold text-navy-900">{frw(totals.selectedAmount)}</span>
              </div>
              {bankConfirm ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-[12.5px] text-amber-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Confirm bank payment — you will be redirected to your bank&apos;s secure payment page to
                  authorize this transaction of {frw(totals.selectedAmount)} from {bankName}.
                </div>
              ) : null}
            </div>
          ) : null}

          {/* ---------------- Failed / retry (Mobile Money timeout) ---------------- */}
          {payStage === 'failed' ? (
            <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start gap-2 text-[13px] text-rose-700">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {payError ?? 'Payment could not be confirmed.'}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={checkMomoAgain}
                  disabled={!apiRefRef.current}
                  className="inline-flex h-9 items-center rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-40"
                >
                  Check again
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopPolling();
                    apiRefRef.current = '';
                    setPayStage('idle');
                    setPaying(false);
                    setPayError(null);
                  }}
                  className="inline-flex h-9 items-center rounded-xl border border-rose-300 bg-white px-4 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Change payment details
                </button>
              </div>
            </div>
          ) : null}

          {!method || method === 'card' || method === 'bank' ? (
            <div className="flex items-center justify-between rounded-2xl bg-[#F8F9FA] px-5 py-4">
              <span className="text-sm font-semibold text-navy-700/70">Amount to pay</span>
              <span className="font-display text-lg font-extrabold text-navy-900">
                {frw(totals.selectedAmount)}
              </span>
            </div>
          ) : null}
        </div>
      )}
    </WizardShell>
  );
}

function TotalCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-700/45">{label}</p>
      <p className={`mt-0.5 font-display text-[15px] font-bold ${highlight ? 'text-[#FCB038]' : 'text-navy-900'}`}>
        {value}
      </p>
    </div>
  );
}

function SummaryRow({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${compact ? 'py-1 text-[13px]' : 'py-1.5 text-sm'}`}>
      <span className="text-navy-700/55">{label}</span>
      <span className="font-semibold text-navy-900">{value}</span>
    </div>
  );
}
