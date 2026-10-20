'use client';

import { type ComponentType, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { School } from '@/lib/school-flows/types';
import { cn } from '@/lib/utils';
import {
  FlowModalBody,
  FlowModalFooter,
  FlowModalHeader,
  FlowModalPortal,
  FlowModalStepper,
  flowErrorBoxClass,
  flowInfoBoxClass,
  flowInputClass,
  flowLabelClass,
  flowSelectClass,
  flowSuccessBoxClass,
} from './flow-modal-shell';
import {
  FlowLanguageStep,
  pickFlowText,
  PAY_FEES_I18N,
  type FlowLang,
} from './flow-language';
import { useSiteLanguage } from './language-provider';
import {
  fetchCircularOptions,
  fetchPublicCircular,
  fetchStudentFeesStructure,
  getPublicPaymentStatus,
  initiateStudentFeePayment,
  schoolAccountPaymentsFromCircular,
  type PublicPayMethod,
  type StudentFeeLine,
} from '@/lib/school-flows/fees-api';
import type { HandoffStudent } from './request-loan-modal';
import { useFlowToast } from './flow-toast';
import { jsPDF } from 'jspdf';

/* ------------------------------------------------------------------ */
/* Contract helpers                                                    */
/* ------------------------------------------------------------------ */

import { BABYEYI_WEB_API } from '@/lib/school-flows/api-config';
import {
  assertStudentBelongsToSchool,
  normalizeStudentPhotoUrl,
  STUDENT_LOOKUP_NOT_FOUND,
} from './helpers';

const RWF = new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 });
function frw(n: number) {
  return `${RWF.format(Math.max(0, n))} Frw`;
}

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

function detectNetwork(phone: string): 'MTN' | 'AIRTEL' | null {
  const m = phone.replace(/[^\d+]/g, '').match(/^(?:\+?250|0)?(7\d)(\d{7})$/);
  if (!m) return null;
  if (['72', '73', '75'].includes(m[1]!)) return 'AIRTEL';
  if (['78', '79'].includes(m[1]!)) return 'MTN';
  return null;
}

function normalizeMomoPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '').replace(/^\+?250/, '0');
  return digits.length === 9 && digits.startsWith('7') ? `0${digits}` : digits;
}

function isValidMomoPhone(phone: string): boolean {
  return /^07\d{8}$/.test(normalizeMomoPhone(phone));
}

function makePaymentReference(): string {
  return `SF-${Math.floor(100000 + Math.random() * 900000)}`;
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type PayMethod = 'momo' | 'card' | 'bank';

type PayStage = 'idle' | 'processing' | 'awaiting' | 'failed';

interface StudentData {
  id?: string;
  fullName?: string;
  className?: string | null;
  classLabel?: string | null;
  schoolName?: string;
  organizationId?: string;
  academicYear?: string | null;
  term?: string | null;
  shuleCode?: string | null;
  studentCode?: string | null;
  photoUrl?: string | null;
}

interface LookupResult {
  student: StudentData;
  circulars?: Array<{ academicYear: string; terms: string[] }> | null;
  currentAcademicYear?: string | null;
  currentTerm?: string | null;
}

interface Fee {
  id: string;
  name: string;
  required: number;
  paid: number;
}

const PAYMENT_METHOD_DEFS: Array<{
  id: PayMethod;
  accent: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: 'momo', accent: '#FCB038', icon: IconMomo },
  { id: 'card', accent: '#8640AA', icon: IconCard },
  { id: 'bank', accent: '#000435', icon: IconBank },
];

/* ------------------------------------------------------------------ */
/* Inline icons (stroke-based, match get-babyeyi-modal)                */
/* ------------------------------------------------------------------ */

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}
const CloseIcon = (p: { className?: string }) => <Icon {...p} path="M6 6l12 12M18 6L6 18" />;
const ChevronLeft = (p: { className?: string }) => <Icon {...p} path="M15 18l-6-6 6-6" />;
const CheckIcon = (p: { className?: string }) => <Icon {...p} path="M20 6L9 17l-5-5" />;
const SquareIcon = (p: { className?: string }) => <Icon {...p} path="M5 4h14v16H5z" />;
const SearchIcon = (p: { className?: string }) => <Icon {...p} path="M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z" />;
const CameraIcon = (p: { className?: string }) => <Icon {...p} path="M4 7h3l2-3h6l2 3h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z M12 16a3 3 0 100-6 3 3 0 000 6z" />;
const UserIcon = (p: { className?: string }) => <Icon {...p} path="M20 21a8 8 0 00-16 0M12 11a4 4 0 100-8 4 4 0 000 8z" />;
const SchoolIcon = (p: { className?: string }) => <Icon {...p} path="M3 21V9l9-6 9 6v12M9 21v-6h6v6M3 21h18" />;
const ClockIcon = (p: { className?: string }) => <Icon {...p} path="M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2" />;
const RefreshIcon = (p: { className?: string }) => <Icon {...p} path="M21 12a9 9 0 11-2.6-6.3M21 3v6h-6" />;
const Spinner = ({ className }: { className?: string }) => (
  <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
    <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
  </svg>
);
function IconMomo(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="3" width="12" height="18" rx="3" />
      <path d="M11 18h2M8 6h8v8H8z" />
    </svg>
  );
}
function IconCard(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M2 10h20M6 15h4" />
    </svg>
  );
}
function IconBank(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-6 9 6M4 9h16v3H4zM6 12v6M10 12v6M14 12v6M18 12v6M3 21h18" />
    </svg>
  );
}

type ActionVariant = 'primary' | 'amber' | 'outline';

function ActionButton({
  onClick,
  disabled,
  icon,
  label,
  desc,
  variant = 'outline',
  full,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  desc: string;
  variant?: ActionVariant;
  full?: boolean;
}) {
  const base =
    'group inline-flex items-center gap-3 rounded-2xl border p-3 text-left transition disabled:opacity-60';
  const styles: Record<ActionVariant, string> = {
    primary:
      'border-[#000435] bg-[#000435] text-white shadow-[0_14px_28px_-14px_rgba(0,4,53,0.55)] hover:bg-[#0a1157]',
    amber:
      'border-amber-300 bg-amber-50 text-amber-900 shadow-[0_10px_22px_-14px_rgba(252,176,56,0.7)] hover:bg-amber-100',
    outline: 'border-slate-200 bg-white text-[#000435] hover:border-slate-300 hover:bg-slate-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn(base, styles[variant], full ? 'sm:col-span-2' : '')}>
      <span
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
          variant === 'primary' && 'bg-white/10 text-[#FCB038]',
          variant === 'amber' && 'bg-amber-200/70 text-amber-800',
          variant === 'outline' && 'bg-slate-100 text-[#000435] group-hover:bg-[#FCB038]/20',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-tight">{label}</span>
        <span className={cn('block truncate text-xs leading-tight', variant === 'primary' ? 'text-white/70' : 'text-slate-500')}>
          {desc}
        </span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

interface PayFeesModalProps {
  school: School;
  open: boolean;
  onClose: () => void;
  /** Pre-loaded student (QR profile) — skips lookup and opens on year/term + fees step. */
  initialStudent?: HandoffStudent | null;
  /** Called with the verified student when the user chooses "Request Loan" on the choose step. */
  onRequestLoan?: (student: Partial<StudentData>) => void;
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function PayFeesModal({ school, open, onClose, initialStudent, onRequestLoan }: PayFeesModalProps) {
  const { lang: siteLang } = useSiteLanguage();
  const { toast, FlowToastStack } = useFlowToast();
  const [step, setStep] = useState<Step>(1);
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<FlowLang | null>(null);
  const [choice, setChoice] = useState<'pay' | 'loan' | null>(null);
  const t = useMemo(() => pickFlowText(lang, PAY_FEES_I18N), [lang]);
  const steps = useMemo(() => t.stepLabels, [t]);
  const paymentMethods = useMemo(
    () =>
      PAYMENT_METHOD_DEFS.map((m) => ({
        ...m,
        label: m.id === 'momo' ? t.momoLabel : m.id === 'card' ? t.cardLabel : t.bankLabel,
        sub: m.id === 'momo' ? t.momoSub : m.id === 'card' ? t.cardSub : t.bankSub,
      })),
    [t],
  );

  // Student lookup
  const [code, setCode] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentData | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Fees
  const [fees, setFees] = useState<Fee[]>([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [structureMeta, setStructureMeta] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [years, setYears] = useState<string[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [year, setYear] = useState('');
  const [term, setTerm] = useState('');

  // Amount
  const [payFull, setPayFull] = useState(true);
  const [customAmount, setCustomAmount] = useState('');

  // Payment method
  const [method, setMethod] = useState<PayMethod | null>(null);
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
  const [paying, setPaying] = useState(false);
  const [payStage, setPayStage] = useState<PayStage>('idle');
  const [payError, setPayError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [receiptRef, setReceiptRef] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PENDING'>('PAID');
  const [downloading, setDownloading] = useState(false);
  const [rechecking, setRechecking] = useState(false);

  const apiRefRef = useRef('');
  const pollRef = useRef<{ timer?: ReturnType<typeof setTimeout>; cancelled?: boolean }>({});
  const circularsRef = useRef<Array<{ academicYear: string; terms: string[] }> | null>(null);
  const feesFetchKeyRef = useRef('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!initialStudent) {
      setLang(siteLang);
      setStep(siteLang ? 2 : 1);
      setChoice(null);
      setCode('');
      setStudent(null);
      setLookupError(null);
      setPaid(false);
    } else {
      setLang(siteLang);
      setStep(3);
      setChoice(null);
      setLookupError(null);
      setPaid(false);
    }
  }, [open, initialStudent, siteLang]);

  useEffect(() => {
    if (!open || !initialStudent) return;
    try {
      assertStudentBelongsToSchool(initialStudent.organizationId, school.id);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : STUDENT_LOOKUP_NOT_FOUND);
      return;
    }
    const s: StudentData = {
      id: initialStudent.id,
      fullName: initialStudent.fullName,
      className: initialStudent.className,
      classLabel: initialStudent.classLabel,
      schoolName: initialStudent.schoolName ?? school.name,
      organizationId: initialStudent.organizationId,
      academicYear: initialStudent.academicYear,
      term: initialStudent.term,
      shuleCode: initialStudent.shuleCode,
      studentCode: initialStudent.studentCode ?? initialStudent.shuleCode,
      photoUrl: normalizeStudentPhotoUrl(initialStudent.photoUrl),
    };
    setStudent(s);
    void bootstrapInitialStudent(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialStudent, school.name]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !paying && step !== 1) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, paying, step, onClose]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (pollRef.current.timer) clearTimeout(pollRef.current.timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
  }, []);

  useEffect(() => {
    if (scannerOpen && student) setScannerOpen(false);
  }, [student, scannerOpen]);

  function stopPolling() {
    pollRef.current.cancelled = true;
    if (pollRef.current.timer) clearTimeout(pollRef.current.timer);
  }

  /* ── totals & derived ── */
  const totals = useMemo(() => {
    const required = fees.reduce((s, f) => s + f.required, 0);
    const alreadyPaid = fees.reduce((s, f) => s + f.paid, 0);
    const remaining = required - alreadyPaid;
    const selectedRemaining = fees
      .filter((f) => selected.has(f.id))
      .reduce((s, f) => s + Math.max(0, f.required - f.paid), 0);
    return { required, alreadyPaid, remaining, selectedRemaining };
  }, [fees, selected]);

  const selectedFees = fees.filter((f) => selected.has(f.id));

  const customNumber = Math.max(0, Number(customAmount.replace(/[^\d.]/g, '')) || 0);
  const amount =
    !payFull && customNumber > 0
      ? Math.min(customNumber, Math.max(0, totals.selectedRemaining))
      : Math.max(0, totals.selectedRemaining);

  /* scaled lines so they total exactly `amount` */
  const paymentLines = useMemo(() => {
    const sel = selectedFees.map((f) => ({ name: f.name, remaining: Math.max(0, f.required - f.paid) }));
    const sum = sel.reduce((s, l) => s + l.remaining, 0);
    if (sum <= 0 || amount >= sum) return sel.map((l) => ({ name: l.name, amount: l.remaining }));
    let acc = 0;
    return sel.map((l, i) => {
      if (i === sel.length - 1) return { name: l.name, amount: amount - acc };
      const part = Math.round((l.remaining / sum) * amount);
      acc += part;
      return { name: l.name, amount: part };
    });
  }, [selectedFees, amount]);

  /* ── student lookup ── */
  async function bootstrapInitialStudent(s: StudentData) {
    const classKey = s.classLabel ?? s.className;
    let circYears: string[] = [];
    if (s.organizationId) {
      const opts = await fetchCircularOptions(s.organizationId, classKey);
      if (opts.grouped?.length) {
        circularsRef.current = opts.grouped;
        circYears = opts.grouped.map((c) => c.academicYear);
        setYears(circYears);
      } else {
        circYears = opts.academicYears;
        circularsRef.current = circYears.map((y) => ({ academicYear: y, terms: opts.terms ?? [] }));
        setYears(circYears);
      }
      const selYear = s.academicYear || opts.currentAcademicYear || circYears[0] || '';
      const yearTerms =
        circularsRef.current?.find((c) => c.academicYear === selYear)?.terms ??
        opts.terms ??
        [];
      const selTerm = s.term || opts.currentTerm || yearTerms[0] || '';
      setTerms(yearTerms);
      setYear(selYear);
      setTerm(selTerm);
      return;
    }
    const selYear = s.academicYear || '';
    const selTerm = s.term || '';
    setYear(selYear);
    setTerm(selTerm);
  }

  async function runLookup(codeValue?: string) {
    const value = (codeValue ?? code).trim();
    if (!value || lookupLoading) return;
    setLookupLoading(true);
    setLookupError(null);
    setScannerOpen(false);
    stopCamera();
    try {
      const res = await fetch(`${BABYEYI_WEB_API}/babyeyi/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value, organizationId: school.id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? STUDENT_LOOKUP_NOT_FOUND);
      }
      const body = (await res.json()) as { success: boolean; data: LookupResult };
      if (!body.success || !body.data?.student) {
        throw new Error(STUDENT_LOOKUP_NOT_FOUND);
      }
      const s = body.data.student;
      assertStudentBelongsToSchool(s.organizationId, school.id);
      const circs = body.data.circulars;
      setStudent({
        ...s,
        photoUrl: normalizeStudentPhotoUrl(s.photoUrl),
      });
      const circYears = (circs ?? []).map((c) => c.academicYear);
      const selYear =
        s.academicYear || body.data.currentAcademicYear || circYears[0] || '';
      const selTerm =
        s.term || body.data.currentTerm || circs?.find((c) => c.academicYear === selYear)?.terms?.[0] || '';
      circularsRef.current = circs ?? null;
      setYears(circYears);
      setTerms(circs?.find((c) => c.academicYear === selYear)?.terms ?? []);
      setYear(selYear);
      setTerm(selTerm);
      setStep(3);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLookupLoading(false);
    }
  }

  /* ── fees (also called with year/term after user adjusts on Step 2) ── */
  async function loadFees(
    s: StudentData,
    yr: string,
    tm: string,
    circs?: Array<{ academicYear: string; terms: string[] }> | null,
  ) {
    if (!s.organizationId || !yr || !tm) return;
    setFeesLoading(true);
    try {
      const fromPortal = await fetchStudentFeesStructure({
        organizationId: s.organizationId,
        academicYear: yr,
        term: tm,
        className: s.classLabel ?? s.className,
        studentCode: s.studentCode ?? s.shuleCode ?? undefined,
        studentId: s.id,
        studentName: s.fullName,
        autoBill: true,
      });
      if (fromPortal?.fees?.length) {
        let remainingPaid = fromPortal.paid;
        const next: Fee[] = fromPortal.fees.map((f: StudentFeeLine) => {
          const paid = Math.min(f.amount, remainingPaid);
          remainingPaid -= paid;
          return { id: f.id, name: f.name, required: f.amount, paid };
        });
        setFees(next);
        setSelected(new Set(next.filter((f) => f.required - f.paid > 0).map((f) => f.id)));
        setStructureMeta(
          fromPortal.billNumber
            ? `${fromPortal.structureName ?? 'School Fees'} · ${fromPortal.billNumber}`
            : fromPortal.structureName ?? 'School Fees structure',
        );
        return;
      }

      // Fallback: approved Babyeyi circular (same as IAM landing Pay Fees wizard).
      const classLabel = s.classLabel ?? s.className;
      const circular = await fetchPublicCircular({
        organizationId: s.organizationId,
        academicYear: yr,
        term: tm,
        classLabel,
      });
      if (circular) {
        const schoolLines = schoolAccountPaymentsFromCircular(circular);
        if (schoolLines.length) {
          const next: Fee[] = schoolLines.map((p) => ({
            id: p.id,
            name: p.name,
            required: p.amount,
            paid: 0,
          }));
          setFees(next);
          setSelected(new Set(next.map((f) => f.id)));
          setStructureMeta(`${circular.className} · Babyeyi circular (${circular.status})`);
          return;
        }
      }

      setFees([]);
      setSelected(new Set());
      setStructureMeta(null);
      toast.warning(
        `No fees are set up for ${classLabel || 'this class'} in ${yr}, ${tm}. Ask the school to activate a fee structure in School Fees Portal or publish an approved Babyeyi circular.`,
        'No fees found',
      );
    } catch {
      setFees([]);
      setStructureMeta(null);
      toast.error(
        'We could not load fees right now. Please check your connection and try selecting the period again.',
        'Unable to load fees',
      );
    } finally {
      setFeesLoading(false);
    }
  }

  useEffect(() => {
    if (!open) {
      feesFetchKeyRef.current = '';
      return;
    }
    if (!student || !year || !term || step !== 3 || paid) return;
    const key = `${student.id ?? student.studentCode ?? 'student'}-${year}-${term}`;
    if (feesFetchKeyRef.current === key) return;
    feesFetchKeyRef.current = key;
    void loadFees(student, year, term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student, year, term, step, paid]);

  function toggleFee(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  /* ── payment methods ── */
  function selectMethod(next: PayMethod) {
    if (method === next) return;
    stopPolling();
    setMethod(next);
    setBankConfirm(false);
    setPayStage('idle');
    setPayError(null);
  }

  function methodValid(): boolean {
    if (method === 'momo') return isValidMomoPhone(momoPhone) && momoProvider !== '';
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
    setReceiptRef(refLabel || makePaymentReference());
    setPaymentStatus(status);
    setPaying(false);
    setPayStage('idle');
    setPaid(true);
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
          finalizeSuccess(apiRefRef.current || makePaymentReference(), 'PENDING');
          return;
        }
        setPaying(false);
        setPayStage('failed');
        setPayError(
          'Still waiting for confirmation. Approve the request on your phone with your Mobile Money PIN, then tap "Check again".',
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
      /* transient */
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
    const studentName = student?.fullName ?? 'Student';
    try {
      const res = await initiateStudentFeePayment({
        organizationId: student?.organizationId ?? undefined,
        studentId: student?.id ?? undefined,
        studentCode: (student?.studentCode ?? student?.shuleCode ?? undefined) as string | undefined,
        studentName,
        academicYear: year || '—',
        term: term || '—',
        className: student?.classLabel ?? student?.className ?? undefined,
        amount,
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
        lines: paymentLines,
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

  /* ── receipt (jsPDF, matches SchoolFeesPortal FEE RECEIPT design) ── */
  async function downloadReceipt() {
    if (downloading) return;
    setDownloading(true);
    try {
      const methodLabel = paymentMethods.find((m) => m.id === method)?.label ?? t.momoLabel;
      const reference = receiptRef || apiRefRef.current || makePaymentReference();
      const doc = buildReceiptPdf({
        reference,
        studentName: student?.fullName ?? 'Student',
        schoolName: student?.schoolName ?? school.name,
        studentClass: student?.classLabel ?? student?.className ?? '—',
        studentUid: student?.studentCode ?? student?.shuleCode ?? undefined,
        academicYear: year || '—',
        term: term || '—',
        method: methodLabel,
        lines: paymentLines,
        amountPaid: amount,
        remainingBalance: Math.max(0, totals.remaining - amount),
        paidAt: new Date(),
        status: paymentStatus,
      });
      const safeRef = (reference || 'fees').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`fee-receipt-${safeRef}.pdf`);
    } catch (err) {
      console.error('Failed to generate receipt PDF', err);
      alert('Sorry, we could not generate the receipt PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  /* ── QR camera ── */
  const qrSupported = useMemo(
    () => typeof window !== 'undefined' && 'BarcodeDetector' in window,
    [],
  );

  async function openScanner() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setLookupError('Camera is not available in this browser. Please enter the student code manually.');
      return;
    }
    setScannerOpen(true);
    setLookupError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      void scanLoop();
    } catch {
      setLookupError('Camera is unavailable or permission was denied. Please enter the student code manually.');
      setScannerOpen(false);
    }
  }

  /** Decode a QR from the current video frame. Uses native BarcodeDetector when
   *  available, otherwise falls back to the jsQR canvas decoder. */
  async function detectFrame(): Promise<string | null> {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;

    const BD = (window as unknown as {
      BarcodeDetector?: new (o: { formats: string[] }) => {
        detect(v: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
      };
    }).BarcodeDetector;
    if (BD) {
      try {
        const codes = await new BD({ formats: ['qr_code'] }).detect(video);
        if (codes.length && codes[0]?.rawValue) return codes[0].rawValue;
      } catch {
        /* fall through to jsQR */
      }
    }

    if (video.videoWidth > 0 && video.videoHeight > 0 && !BD) {
      /* BarcodeDetector unavailable — enter student code manually. */
    }
    return null;
  }

  async function scanLoop() {
    while (scannerOpenRef.current) {
      try {
        const value = await detectFrame();
        if (value && value.trim()) {
          setCode(value.trim());
          void runLookup(value.trim());
          return;
        }
      } catch {
        /* keep scanning */
      }
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  const scannerOpenRef = useRef(false);
  useEffect(() => {
    scannerOpenRef.current = scannerOpen;
    if (!scannerOpen) stopCamera();
  }, [scannerOpen]);

  function stopCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  /* ── navigation ── */
  function canNext(): boolean {
    if (step === 1) return lang !== null;
    if (step === 2) {
      return student ? !lookupLoading : code.trim().length > 0 && !lookupLoading;
    }
    if (step === 3) return !feesLoading && selected.size > 0;
    if (step === 4) return choice !== null;
    if (step === 5) return amount > 0;
    if (step === 6) return !!method && methodValid();
    return !paying;
  }

  function nextLabel(): string {
    if (step === 1) return t.continue;
    if (step === 2) return student ? t.continue : t.findStudent;
    if (step === 3) return feesLoading ? t.loading : t.continue;
    if (step === 4) return choice === 'loan' ? t.requestLoan : t.continue;
    if (step === 5) return t.continue;
    if (step === 6) return t.reviewPay;
    return t.payAmount(frw(amount));
  }

  function goNext() {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      if (student) {
        setStep(3);
        return;
      }
      void runLookup();
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    if (step === 4) {
      if (choice === 'loan') {
        if (student) onRequestLoan?.({ ...student, academicYear: year, term });
        onClose();
        return;
      }
      setStep(5);
      return;
    }
    if (step === 5) {
      setStep(6);
      return;
    }
    if (step === 6) {
      setStep(7);
      return;
    }
    void startPayment();
  }

  function goBack() {
    if (step === 1) {
      onClose();
      return;
    }
    if (initialStudent && step === 3) {
      onClose();
      return;
    }
    setStep((s) => Math.max(1, (s as number) - 1) as Step);
  }

  function resetAll() {
    stopPolling();
    setStep(1);
    setLang(null);
    setChoice(null);
    setFees([]);
    setSelected(new Set());
    setMethod(null);
    setPaid(false);
    setReceiptRef('');
    setPaymentStatus('PAID');
    setPayError(null);
    setPayStage('idle');
    setBankConfirm(false);
    setStudent(null);
    setCode('');
    apiRefRef.current = '';
  }

  if (!open || !mounted) return null;

  return (
    <>
      <FlowToastStack />
      <FlowModalPortal open={open} mounted={mounted} onClose={paying ? () => {} : onClose} ariaLabel="Pay school fees">
      <FlowModalHeader
        badge={t.modalBadge}
        title={t.modalTitle}
        schoolName={school.name}
        subtitle={student?.fullName ? `${student.fullName}${student.className ? ` · ${student.className}` : ''}` : undefined}
        onClose={onClose}
        closeDisabled={paying}
        stepper={!paid ? <FlowModalStepper steps={steps} currentStep={step as number} /> : undefined}
      />

      <FlowModalBody>
          {!paid && step === 1 && (
            <FlowLanguageStep lang={lang} onSelect={setLang} />
          )}

          {!paid && step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[16px] font-medium text-ink-900">{t.studentTitle}</h3>
                <p className="mt-1 text-[13px] text-ink-500">{t.studentSub}</p>
              </div>

              <div className={flowInfoBoxClass}>
                <SchoolIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>{t.payIntro(school.name)}</span>
              </div>

              <div>
                <label className={flowLabelClass}>
                  {t.studentCodeLabel}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex flex-1 items-center gap-2.5 rounded-xl border-[1.5px] border-ink-200 bg-white px-3.5 focus-within:border-sky-400 focus-within:bg-sky-50">
                    <SearchIcon className="h-4 w-4 shrink-0 text-ink-400" />
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void runLookup();
                      }}
                      placeholder={t.studentCodePlaceholder}
                      className="h-11 w-full min-w-0 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void openScanner()}
                    className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-3.5 text-[12.5px] font-medium text-sky-700 transition hover:bg-sky-50 sm:w-auto"
                  >
                    <CameraIcon className="h-4 w-4" />
                    Scan QR
                  </button>
                </div>
              </div>
              <p className="text-[11.5px] text-ink-400">{t.scanTip}</p>

              {scannerOpen ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <video ref={videoRef} className="aspect-[4/3] w-full bg-black object-cover" muted playsInline />
                  <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5">
                    <span className="text-[12px] text-ink-500">{t.scanHint}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setScannerOpen(false);
                        stopCamera();
                      }}
                      className="rounded-lg border border-ink-200 px-2.5 py-1 text-[11px] font-medium text-ink-600 hover:bg-ink-100"
                    >
                      {t.scanCancel}
                    </button>
                  </div>
                </div>
              ) : null}

              {lookupLoading ? (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Spinner className="h-4 w-4 text-[#FCB038]" /> {t.lookingUp}
                </p>
              ) : null}
              {lookupError ? (
                <div className={flowErrorBoxClass}>{lookupError}</div>
              ) : null}

              {student ? (
                <div className={flowSuccessBoxClass}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#000435] text-sm font-medium text-white">
                      {student.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={student.photoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (student.fullName ?? '?')[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#000435]">{student.fullName}</p>
                      <p className="truncate text-[12px] text-slate-500">
                        {student.classLabel ?? student.className ?? 'Class'} · {student.schoolName}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ───────── Step 3: Select fees ───────── */}
          {!paid && step === 3 && (
            <div className="space-y-4">
              {student && !initialStudent ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <p className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.12em] text-slate-400">
                    {t.studentDetails}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#000435] text-lg font-medium text-white">
                      {student.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={student.photoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (student.fullName ?? '?')[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="grid flex-1 grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                      <span className="truncate text-sm font-medium text-[#000435]">
                        {student.fullName ?? '—'}
                      </span>
                      <span className="truncate text-[12px] font-mono text-slate-500">
                        {student.studentCode || student.shuleCode || '—'}
                      </span>
                      <span className="truncate text-[12px] text-slate-600">
                        {student.classLabel ?? student.className ?? t.classNotSet}
                      </span>
                      <span className="truncate text-[12px] text-slate-600">
                        {student.schoolName ?? school.name}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10.5px]">
                    <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-500 ring-1 ring-slate-200">
                      {t.classLabel}: {student.classLabel ?? student.className ?? '—'}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-500 ring-1 ring-slate-200">
                      {t.studentCodeBadge}: {student.studentCode || student.shuleCode || '—'}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-500 ring-1 ring-slate-200">
                      {student.schoolName ?? school.name}
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#000435]">{t.academicYear}</label>
                  <select
                    value={year}
                    onChange={(e) => {
                      const y = e.target.value;
                      feesFetchKeyRef.current = '';
                      setYear(y);
                      setTerm('');
                      setSelected(new Set());
                      setFees([]);
                      setTerms(circularsRef.current?.find((c) => c.academicYear === y)?.terms ?? []);
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-[#000435]/40"
                  >
                    {!year ? <option value="">{t.selectOption}</option> : null}
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#000435]">{t.term}</label>
                  <select
                    value={term}
                    onChange={(e) => {
                      feesFetchKeyRef.current = '';
                      setTerm(e.target.value);
                      setSelected(new Set());
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-[#000435]/40"
                  >
                    {!term ? <option value="">{t.selectOption}</option> : null}
                    {terms.map((termOption) => (
                      <option key={termOption} value={termOption}>
                        {termOption}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {feesLoading ? (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Spinner className="h-4 w-4 text-[#FCB038]" /> {t.loadingFees}
                </p>
              ) : null}

              {structureMeta ? (
                <p className="text-[11.5px] text-slate-400">{t.feeStructure}: {structureMeta}</p>
              ) : null}

              {!feesLoading && fees.length ? (
                <>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-500">{t.chooseFees}</span>
                    <button
                      type="button"
                      onClick={() => setSelected(new Set(fees.filter((f) => f.required - f.paid > 0).map((f) => f.id)))}
                      className="text-[#000435]/70 hover:underline"
                    >
                      {t.selectAll}
                    </button>
                  </div>
                  <ul className="max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
                    {fees.map((f) => {
                      const remaining = Math.max(0, f.required - f.paid);
                      const isChecked = selected.has(f.id);
                      return (
                        <li key={f.id}>
                          <button
                            type="button"
                            onClick={() => toggleFee(f.id)}
                            className={cn(
                              'flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition',
                              isChecked
                                ? 'border-[#FCB038] bg-[#FCB038]/[0.06]'
                                : 'border-slate-100 hover:border-slate-200',
                            )}
                          >
                            <span className="flex items-center gap-3">
                              {isChecked ? (
                                <CheckIcon className="h-5 w-5 shrink-0 text-[#FCB038]" />
                              ) : (
                                <SquareIcon className="h-5 w-5 shrink-0 text-slate-300" />
                              )}
                              <span>
                                <span className="block text-sm font-medium text-[#000435]">{f.name}</span>
                                <span className="block text-[11.5px] text-slate-400">
                                  {t.duePaid(frw(f.required), frw(f.paid))}
                                </span>
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-medium text-[#000435]">{frw(remaining)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}

              {!feesLoading && !fees.length && year && term ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No fee items for this period. Try another year or term, or ask the school to publish fees.
                </p>
              ) : null}

              <div className="grid grid-cols-1 gap-2.5 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <TotalCell label={t.remainingBalance} value={frw(totals.remaining)} />
                <TotalCell label={t.selectedAmount} value={frw(totals.selectedRemaining)} highlight />
              </div>
            </div>
          )}

          {/* ───────── Step 4: Choose how to settle ───────── */}
          {!paid && step === 4 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {t.settleQuestion(frw(totals.selectedRemaining), student?.fullName ?? '—', school.name)}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setChoice('pay')}
                  className={`group relative flex flex-col items-start gap-3 rounded-2xl border-2 p-5 text-left transition ${
                    choice === 'pay'
                      ? 'border-[#000435] bg-[#000435] text-white shadow-lg'
                      : 'border-slate-200 bg-white hover:border-[#000435]/30 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      choice === 'pay' ? 'bg-white/15 text-white' : 'bg-[#000435] text-[#FCB038]'
                    }`}
                  >
                    <IconCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.payNow}</p>
                    <p className={`mt-1 text-[12px] ${choice === 'pay' ? 'text-white/80' : 'text-slate-500'}`}>
                      {t.payNowDesc}
                    </p>
                  </div>
                  <span
                    className={`mt-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                      choice === 'pay' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {choice === 'pay' ? t.selected : t.instantSettlement}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setChoice('loan')}
                  className={`group relative flex flex-col items-start gap-3 rounded-2xl border-2 p-5 text-left transition ${
                    choice === 'loan'
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg'
                      : 'border-slate-200 bg-white hover:border-emerald-500/40 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      choice === 'loan' ? 'bg-white/15 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    <IconBank className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.requestLoanTitle}</p>
                    <p className={`mt-1 text-[12px] ${choice === 'loan' ? 'text-white/80' : 'text-slate-500'}`}>
                      {t.requestLoanDesc}
                    </p>
                  </div>
                  <span
                    className={`mt-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                      choice === 'loan' ? 'bg-white/15 text-white' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {choice === 'loan' ? t.selected : t.flexibleRepayment}
                  </span>
                </button>
              </div>

              <p className="text-[12px] leading-relaxed text-slate-400">
                {choice === 'loan' ? t.loanHandoffNote : t.chooseProceed}
              </p>
            </div>
          )}

          {/* ───────── Step 5: Amount ───────── */}
          {!paid && step === 5 && (
            <div className="space-y-5">
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
                <p className="text-[12px] text-slate-500">{t.outstandingSelected}</p>
                <p className="font-display text-2xl font-medium text-[#000435]">{frw(totals.selectedRemaining)}</p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setPayFull(true)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition',
                    payFull ? 'border-[#000435] bg-[#000435]/[0.03]' : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <span>
                    <span className="block text-sm font-medium text-[#000435]">{t.payFull}</span>
                    <span className="block text-[12px] text-slate-400">{t.payFullDesc}</span>
                  </span>
                  <span className="text-sm font-medium text-[#000435]">{frw(totals.selectedRemaining)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayFull(false)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition',
                    !payFull ? 'border-[#000435] bg-[#000435]/[0.03]' : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <span>
                    <span className="block text-sm font-medium text-[#000435]">{t.payCustom}</span>
                    <span className="block text-[12px] text-slate-400">{t.payCustomDesc}</span>
                  </span>
                  {!payFull ? (
                    <span className="text-sm font-medium text-[#000435]">{frw(amount)}</span>
                  ) : null}
                </button>
              </div>

              {!payFull ? (
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-medium text-[#000435]">
                    {t.enterAmount(frw(totals.selectedRemaining))}
                  </label>
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 focus-within:border-[#000435]/40">
                    <input
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      inputMode="numeric"
                      placeholder="e.g. 50000"
                      className="h-11 w-full bg-transparent text-sm text-[#000435] outline-none placeholder:text-slate-400"
                    />
                    <span className="text-sm font-medium text-slate-400">Frw</span>
                  </div>
                  {customNumber > totals.selectedRemaining ? (
                    <p className="mt-1.5 text-[11.5px] text-rose-600">
                      {t.amountCapped(frw(totals.selectedRemaining))}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex items-center justify-between rounded-2xl bg-[#000435] px-4 py-3.5 text-white">
                <span className="text-[12.5px] text-white/70">{t.amountToPayNow}</span>
                <span className="font-display text-lg font-medium text-[#FCB038]">{frw(amount)}</span>
              </div>
            </div>
          )}

          {/* ───────── Step 5: Payment method ───────── */}
          {!paid && step === 6 && (
            <div className="space-y-5">
              <p className="text-sm text-slate-500">{t.choosePayment}</p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {paymentMethods.map((m) => {
                  const active = method === m.id;
                  const MIcon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectMethod(m.id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-4 transition',
                        active ? '' : 'border-slate-200 hover:border-slate-300',
                      )}
                      style={
                        active
                          ? { backgroundColor: `${m.accent}12`, boxShadow: `0 0 0 2px ${m.accent}` }
                          : undefined
                      }
                    >
                      <MIcon className="h-6 w-6" />
                      <span className="text-xs font-medium text-[#000435]">{m.label}</span>
                      <span className="text-[10.5px] font-medium uppercase tracking-wide text-slate-400">{m.sub}</span>
                    </button>
                  );
                })}
              </div>

              {payError && payStage !== 'failed' ? (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700">
                  <span className="mt-0.5">⚠</span>
                  {payError}
                </div>
              ) : null}

              {/* Momo form / awaiting */}
              {method === 'momo' && payStage === 'awaiting' ? (
                <div className="rounded-2xl border border-[#FCB038]/40 bg-[#FCB038]/[0.07] p-5 text-center">
                  <Spinner className="mx-auto h-8 w-8 text-[#FCB038]" />
                  <h3 className="mt-3 font-display text-lg font-medium text-[#000435]">{t.paymentSent}</h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
                    {t.checkPhone(normalizeMomoPhone(momoPhone))}
                  </p>
                  <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                    <Spinner className="h-3.5 w-3.5 text-[#FCB038]" /> {t.waitingConfirm}
                  </div>
                </div>
              ) : null}

              {method === 'momo' && payStage !== 'awaiting' ? (
                <div className="space-y-4 rounded-2xl border border-slate-100 p-4 sm:p-5">
                  <h3 className="text-sm font-medium text-[#000435]">{t.momoPayment}</h3>
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-medium text-[#000435]">{t.phoneNumber}</label>
                    <input
                      value={momoPhone}
                      onChange={(e) => {
                        setMomoPhone(e.target.value);
                        const net = detectNetwork(e.target.value);
                        if (net) setMomoProvider(net);
                      }}
                      inputMode="tel"
                      placeholder="+250 7XX XXX XXX"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm outline-none focus:border-[#000435]/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-medium text-[#000435]">{t.network}</label>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {(['MTN', 'AIRTEL'] as const).map((net) => (
                        <button
                          key={net}
                          type="button"
                          onClick={() => setMomoProvider(net)}
                          className={cn(
                            'rounded-xl border px-3 py-2.5 text-sm font-medium transition',
                            momoProvider === net
                              ? 'border-[#FCB038] bg-[#FCB038]/10 text-[#000435]'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300',
                          )}
                        >
                          {net === 'MTN' ? t.mtnMomo : t.airtelMoney}
                        </button>
                      ))}
                    </div>
                  </div>
                  <AmountBar amount={amount} label={t.amount} />
                </div>
              ) : null}

              {/* Card form */}
              {method === 'card' ? (
                <div className="space-y-4 rounded-2xl border border-slate-100 p-4 sm:p-5">
                  <h3 className="text-sm font-medium text-[#000435]">{t.cardPayment}</h3>
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-medium text-[#000435]">{t.cardNumber}</label>
                    <input
                      value={cardNumber}
                      onChange={(e) => {
                        const d = e.target.value.replace(/\D/g, '').slice(0, 19);
                        setCardNumber(d.replace(/(.{4})/g, '$1 ').trim());
                      }}
                      inputMode="numeric"
                      placeholder="1234 5678 9012 3456"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm outline-none focus:border-[#000435]/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-medium text-[#000435]">{t.cardholder}</label>
                    <input
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="Name as printed on the card"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-[#000435]/40"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[12.5px] font-medium text-[#000435]">{t.expiry}</label>
                      <input
                        value={cardExpiry}
                        onChange={(e) => {
                          const d = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setCardExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
                        }}
                        inputMode="numeric"
                        placeholder="MM/YY"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm outline-none focus:border-[#000435]/40"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[12.5px] font-medium text-[#000435]">{t.cvv}</label>
                      <input
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        inputMode="numeric"
                        type="password"
                        placeholder="•••"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm outline-none focus:border-[#000435]/40"
                      />
                    </div>
                  </div>
                  <AmountBar amount={amount} label={t.amount} />
                  <p className="flex items-start gap-1.5 text-[12px] text-slate-400">
                    <span className="mt-0.5 text-emerald-600">✓</span>
                    {t.cardSecureNote}
                  </p>
                </div>
              ) : null}

              {/* Bank form */}
              {method === 'bank' ? (
                <div className="space-y-4 rounded-2xl border border-slate-100 p-4 sm:p-5">
                  <h3 className="text-sm font-medium text-[#000435]">{t.bankPayment}</h3>
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-medium text-[#000435]">{t.selectBank}</label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#000435]/40"
                    >
                      <option value="">{t.chooseBank}</option>
                      {RWANDA_BANKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-medium text-[#000435]">{t.accountNumber}</label>
                    <input
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      inputMode="numeric"
                      placeholder="00012345678901"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm outline-none focus:border-[#000435]/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-medium text-[#000435]">{t.accountHolder}</label>
                    <input
                      value={bankHolder}
                      onChange={(e) => setBankHolder(e.target.value)}
                      placeholder="Full name on the account"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-[#000435]/40"
                    />
                  </div>
                  <AmountBar amount={amount} label={t.amount} />
                  <p className="flex items-start gap-1.5 text-[12px] text-slate-400">
                    <span className="mt-0.5 text-emerald-600">✓</span>
                    {t.bankConfirmNote}
                  </p>
                </div>
              ) : null}

              {/* Failed / retry (Momo timeout) */}
              {payStage === 'failed' ? (
                <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <div className="flex items-start gap-2 text-[13px] text-rose-700">
                    <span className="mt-0.5">⚠</span>
                    {payError ?? 'Payment could not be confirmed.'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={checkMomoAgain}
                      disabled={!apiRefRef.current}
                      className="inline-flex h-9 items-center rounded-xl bg-rose-600 px-4 text-xs font-medium text-white transition hover:bg-rose-700 disabled:opacity-40"
                    >
                      {t.checkAgain}
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
                      className="inline-flex h-9 items-center rounded-xl border border-rose-300 bg-white px-4 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                    >
                      {t.changePayment}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ───────── Step 6: Review & Pay ───────── */}
          {!paid && step === 7 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">{t.reviewStudent}</p>
                <SummaryRow label={t.name} value={student?.fullName ?? '—'} />
                <SummaryRow label={t.school} value={student?.schoolName ?? school.name} />
                <SummaryRow label={t.classField} value={student?.classLabel ?? student?.className ?? '—'} />
                <SummaryRow label={t.period} value={`${year || '—'} · ${term || '—'}`} />
              </div>

              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">{t.selectedFees}</p>
                <ul className="space-y-1.5">
                  {selectedFees.map((f) => (
                    <li key={f.id} className="flex justify-between text-sm">
                      <span className="text-slate-500">{f.name}</span>
                      <span className="font-medium text-[#000435]">{frw(f.required - f.paid)}</span>
                    </li>
                  ))}
                </ul>
                {!payFull ? (
                  <p className="mt-2 border-t border-slate-100 pt-2 text-[12px] text-slate-400">
                    {t.partPaymentNote(frw(amount), frw(totals.selectedRemaining))}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">{t.paymentMethod}</p>
                <SummaryRow
                  label={t.method}
                  value={paymentMethods.find((m) => m.id === method)?.label ?? '—'}
                />
                {method === 'momo' ? (
                  <SummaryRow label={t.phone} value={normalizeMomoPhone(momoPhone)} />
                ) : null}
                {method === 'bank' && bankConfirm ? (
                  <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-[12.5px] text-amber-800">
                    <span className="mt-0.5">⚠</span>
                    {t.bankConfirmReview(frw(amount), bankName)}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-[#000435] px-4 py-4 text-white">
                <span className="text-sm text-white/70">{t.totalToPay}</span>
                <span className="font-display text-xl font-medium text-[#FCB038]">{frw(amount)}</span>
              </div>
            </div>
          )}

          {/* ───────── Payment success ───────── */}
          {paid && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckIcon className="h-9 w-9 text-emerald-600" />
              </div>
              <h2 className="font-display text-2xl font-medium text-[#000435]">
                {paymentStatus === 'PENDING' ? t.paymentRecorded : t.paymentSuccess}
              </h2>
              <div className="flex justify-center">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-medium tracking-[0.14em]',
                    paymentStatus === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700',
                  )}
                >
                  {paymentStatus === 'PENDING' ? 'PENDING' : 'PAID'}
                </span>
              </div>
              {paymentStatus === 'PENDING' ? (
                <p className="mx-auto max-w-md rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
                  {t.pendingNote}
                </p>
              ) : null}
              <p className="text-sm text-slate-500">
                {t.paidSummary(frw(amount), student?.fullName ?? '—', year || '—', term || '')}
              </p>
              <div className="mx-auto max-w-sm rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">{t.reference}</span>
                  <span className="font-mono font-medium text-[#000435]">{receiptRef}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">{t.method}</span>
                  <span className="font-medium text-[#000435]">
                    {paymentMethods.find((m) => m.id === method)?.label ?? t.momoLabel}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">{t.remaining}</span>
                  <span className="font-medium text-[#000435]">{frw(Math.max(0, totals.remaining - amount))}</span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {paymentStatus === 'PENDING' && apiRefRef.current ? (
                  <ActionButton
                    onClick={recheckPendingPayment}
                    disabled={rechecking}
                    icon={rechecking ? <Spinner className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}
                    label={t.checkAgain}
                    desc={t.checkAgainFunds}
                    variant="amber"
                    full
                  />
                ) : null}
                <ActionButton
                  onClick={() => void downloadReceipt()}
                  disabled={downloading}
                  icon={downloading ? <Spinner className="h-5 w-5" /> : <DownloadIcon className="h-5 w-5" />}
                  label={t.downloadReceipt}
                  desc={t.downloadReceiptDesc}
                  variant="primary"
                  full
                />
                <ActionButton
                  onClick={resetAll}
                  icon={<RefreshIcon className="h-5 w-5" />}
                  label={t.anotherPayment}
                  desc={t.anotherPaymentDesc}
                  variant="outline"
                />
                <ActionButton
                  onClick={onClose}
                  icon={<SchoolIcon className="h-5 w-5" />}
                  label={t.backToSchool}
                  desc={t.backToSchoolDesc}
                  variant="outline"
                />
              </div>
            </div>
          )}
      </FlowModalBody>

      <FlowModalFooter
        hideFooter={paid}
        hideBack={false}
        onBack={goBack}
        backLabel={step === 1 ? t.close : t.back}
        onNext={goNext}
        nextLabel={nextLabel()}
        nextDisabled={!canNext() || paying}
        loading={paying}
        nextIcon={paying ? <Spinner className="h-4 w-4" /> : undefined}
      />
    </FlowModalPortal>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

function AmountBar({ amount, label = 'Amount' }: { amount: number; label?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-display font-medium text-[#000435]">{frw(amount)}</span>
    </div>
  );
}

function TotalCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn('mt-0.5 font-display text-[15px] font-medium', highlight ? 'text-[#FCB038]' : 'text-[#000435]')}>
        {value}
      </p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-[#000435]">{value}</span>
    </div>
  );
}

function Clock(p: { className?: string }) {
  return <Icon {...p} path="M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
}
function DownloadIcon(p: { className?: string }) {
  return <Icon {...p} path="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />;
}

/* ------------------------------------------------------------------ */
/* HTML receipt builder (no external dependency)                       */
/* ------------------------------------------------------------------ */

interface ReceiptShape {
  reference: string;
  studentName: string;
  schoolName: string;
  studentClass: string;
  studentUid?: string;
  academicYear: string;
  term: string;
  method: string;
  lines: Array<{ name: string; amount: number }>;
  amountPaid: number;
  remainingBalance: number;
  paidAt: Date;
  status: 'PAID' | 'PENDING';
}

function buildReceiptPdf(r: ReceiptShape): jsPDF {
  const PRIMARY: [number, number, number] = [252, 176, 56];
  const NAVY: [number, number, number] = [0, 4, 53];
  const GRAY: [number, number, number] = [100, 116, 139];
  const WHITE: [number, number, number] = [255, 255, 255];

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentW = pageW - margin * 2;
  const centerX = pageW / 2;

  const lines = r.lines.length ? r.lines : [{ name: 'School fees payment', amount: r.amountPaid }];
  const money = (n: number) => `RWF ${Math.round(n).toLocaleString()}`;

  let y = margin + 8;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 46, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text('S+  Shule+', margin, y);
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text('DIGITAL PAYMENT RECEIPT', margin, y + 5.5);

  doc.setFontSize(19);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text(r.status === 'PENDING' ? 'Payment Recorded' : 'Payment Receipt', margin, y + 15);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.text(`Reference  ${r.reference}`, margin, y + 21);

  if (r.status === 'PENDING') {
    doc.setFillColor(252, 211, 77);
    doc.setTextColor(...NAVY);
    doc.setFontSize(8);
    doc.text('PENDING', pageW - margin, y + 4, { align: 'right' });
    doc.setTextColor(...WHITE);
  }

  doc.setFont('helvetica', 'normal');
  y = 58;

  const detailRows: Array<[string, string]> = [
    ['Student', r.studentName],
    ['School', r.schoolName],
    ['Class', r.studentClass],
    ['Period', [r.academicYear, r.term].filter((v) => v && v !== '—').join(' · ') || '—'],
    ['Method', r.method],
    ['Date', r.paidAt.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
  ];
  if (r.studentUid) detailRows.push(['ShuleCode', r.studentUid]);

  for (const [label, value] of detailRows) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(String(value || '—'), pageW - margin, y, { align: 'right' });
    y += 5.5;
  }
  y += 2;

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  doc.setFillColor(...NAVY);
  doc.rect(margin, y, contentW, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text('FEE ITEM', margin + 2, y + 4.5);
  doc.text('AMOUNT', pageW - margin - 2, y + 4.5, { align: 'right' });
  y += 9;

  for (const item of lines) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...NAVY);
    doc.text(item.name, margin + 2, y);
    doc.setFont('helvetica', 'bold');
    doc.text(Math.round(item.amount).toLocaleString(), pageW - margin - 2, y, { align: 'right' });
    y += 6;
  }
  y += 2;

  const totalsW = 76;
  const totalsX = pageW - margin - totalsW;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  for (const [label, value] of [
    ['Amount paid', money(r.amountPaid)],
    ['Remaining balance', money(r.remainingBalance)],
  ] as Array<[string, string]>) {
    doc.text(label, totalsX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(value, pageW - margin, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    y += 5;
  }
  y += 1.5;
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(totalsX - 2, y - 3.5, totalsW + 4, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('TOTAL PAID', totalsX, y + 2);
  doc.setFontSize(11);
  doc.text(money(r.amountPaid), pageW - margin, y + 2, { align: 'right' });

  y += 20;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin, y, margin + contentW * 0.4, y);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY);
  doc.text('SCHOOL FEES OFFICE', margin, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Thank you for paying school fees through Shule+.', margin, y + 24);
  doc.setTextColor(...GRAY);
  doc.text('Powered by Shule+', pageW - margin, y + 24, { align: 'right' });

  return doc;
}
