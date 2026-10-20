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
  flowSuccessBoxClass,
} from './flow-modal-shell';
import {
  FlowLanguageStep,
  pickFlowText,
  LOAN_I18N,
  type FlowLang,
} from './flow-language';
import { useSiteLanguage } from './language-provider';
import { fetchCircularOptions, fetchStudentFeesStructure } from '@/lib/school-flows/fees-api';
import {
  computeLoanSchedule,
  fetchLoanTypes,
  submitLoanApplication,
  type LoanDisbursement,
  type LoanFrequency,
  type LoanType,
} from '@/lib/school-flows/loan-api';
import { BABYEYI_WEB_API } from '@/lib/school-flows/api-config';
import {
  assertStudentBelongsToSchool,
  normalizeStudentPhotoUrl,
  STUDENT_LOOKUP_NOT_FOUND,
} from './helpers';
import { useFlowToast } from './flow-toast';

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */

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

const FREQUENCY_IDS: LoanFrequency[] = ['MONTHLY', 'BI_WEEKLY', 'WEEKLY', 'QUARTERLY'];

const DISBURSEMENT_IDS: LoanDisbursement[] = ['PAY_SCHOOL_DIRECTLY', 'MOBILE_MONEY', 'BANK'];

function normalizeMomoPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '').replace(/^\+?250/, '0');
  return digits.length === 9 && digits.startsWith('7') ? `0${digits}` : digits;
}

function isValidMomoPhone(phone: string): boolean {
  return /^07\d{8}$/.test(normalizeMomoPhone(phone));
}

function maskPhone(raw: string): string {
  const digits = String(raw ?? '').replace(/[^\d+]/g, '');
  if (!digits) return '+250 7••• •• •••';
  const last4 = digits.slice(-4);
  return `${digits.slice(0, 4)} ••• •• ${last4}`;
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface HandoffStudent {
  id?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  className?: string | null;
  classLabel?: string | null;
  schoolName?: string;
  organizationId?: string;
  academicYear?: string | null;
  term?: string | null;
  shuleCode?: string | null;
  studentCode?: string | null;
  photoUrl?: string | null;
  parents?: Array<{ role?: string; name?: string; phone?: string | null }>;
}

interface StudentData {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  gender: string;
  shuleCode: string;
  studentCode: string;
  schoolName: string;
  organizationId: string;
  organizationCode: string | null;
  className: string | null;
  classLabel: string | null;
  educationLevel: string | null;
  academicYear: string | null;
  term: string | null;
  photoUrl: string | null;
  parents: Array<{ role: string; name: string; phone: string | null }>;
}

interface LookupResult {
  student: Partial<StudentData>;
  circulars?: Array<{ academicYear: string; terms: string[] }> | null;
  currentAcademicYear?: string | null;
  currentTerm?: string | null;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface RequestLoanModalProps {
  school: School;
  open: boolean;
  onClose: () => void;
  initialStudent?: HandoffStudent | null;
}

interface SubmittedResult {
  applicationNumber: string;
  totalPayable: number;
  principal: number;
  status: string;
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const CheckIcon = (p: { className?: string }) => <Icon {...p} path="M20 6L9 17l-5-5" />;
const SearchIcon = (p: { className?: string }) => <Icon {...p} path="M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z" />;
const CameraIcon = (p: { className?: string }) => <Icon {...p} path="M4 7h3l2-3h6l2 3h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z M12 16a3 3 0 100-6 3 3 0 000 6z" />;
const SchoolIcon = (p: { className?: string }) => <Icon {...p} path="M3 21V9l9-6 9 6v12M9 21v-6h6v6M3 21h18" />;
const UserIcon = (p: { className?: string }) => <Icon {...p} path="M20 21a8 8 0 00-16 0M12 11a4 4 0 100-8 4 4 0 000 8z" />;
const WalletIcon = (p: { className?: string }) => <Icon {...p} path="M3 7h18v12H3zM16 13h1.5M3 7l14-3 1 5" />;
const CalendarIcon = (p: { className?: string }) => <Icon {...p} path="M8 3v3M16 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />;
const ShieldCheckIcon = (p: { className?: string }) => <Icon {...p} path="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4" />;
const ClockIcon = (p: { className?: string }) => <Icon {...p} path="M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2" />;
const LockIcon = (p: { className?: string }) => <Icon {...p} path="M7 11V8a5 5 0 0110 0v3M5 11h14v10H5z" />;
const DocIcon = (p: { className?: string }) => <Icon {...p} path="M6 3h8l4 4v14H6zM14 3v4h4" />;
const ChevronRightIcon = (p: { className?: string }) => <Icon {...p} path="M5 12h14M13 6l6 6-6 6" />;

function IconMomo(p: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="3" width="12" height="18" rx="3" />
      <path d="M11 18h2M8 6h8v8H8z" />
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

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Presentational helpers                                              */
/* ------------------------------------------------------------------ */

function SectionHeader({ icon, title, sub }: { icon: ReactNode; title: string; sub?: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#000435] text-[#FCB038]">{icon}</span>
      <div>
        <h3 className="text-sm font-medium text-[#000435]">{title}</h3>
        {sub ? <p className="text-[11.5px] text-slate-400">{sub}</p> : null}
      </div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className={flowLabelClass}>{label}</label>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-ink-400">{hint}</p> : null}
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px] text-slate-500">{label}</span>
      <span className={cn('text-[13px]', strong ? 'font-medium text-[#000435]' : 'font-medium text-[#000435]')}>
        {value}
      </span>
    </div>
  );
}

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
  variant?: 'primary' | 'outline';
  full?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition active:scale-[0.99] disabled:opacity-60',
        full && 'sm:col-span-2',
        variant === 'primary'
          ? 'border-[#000435] bg-gradient-to-br from-[#000435] to-[#12185a] text-white shadow-[0_16px_32px_-16px_rgba(0,4,53,0.65)] hover:shadow-[0_20px_36px_-14px_rgba(0,4,53,0.55)]'
          : 'border-slate-200/90 bg-white text-[#000435] hover:border-[#000435]/20 hover:bg-slate-50',
      )}
    >
      <span
        className={cn(
          'grid h-11 w-11 shrink-0 place-items-center rounded-xl transition',
          variant === 'primary'
            ? 'bg-white/12 text-[#FCB038] ring-1 ring-white/10'
            : 'bg-[#000435]/[0.04] text-[#000435] group-hover:bg-[#FCB038]/15 group-hover:text-[#9a6800]',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold leading-tight">{label}</span>
        <span
          className={cn(
            'mt-0.5 block truncate text-[11.5px] leading-snug',
            variant === 'primary' ? 'text-white/65' : 'text-slate-500',
          )}
        >
          {desc}
        </span>
      </span>
      <ChevronRightIcon
        className={cn(
          'h-4 w-4 shrink-0 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100',
          variant === 'primary' ? 'text-white/50' : 'text-slate-400',
        )}
      />
    </button>
  );
}

function handoffToStudent(h: HandoffStudent, schoolName: string): StudentData {
  return {
    id: h.id ?? '',
    fullName: h.fullName ?? 'Student',
    firstName: h.firstName ?? '',
    lastName: h.lastName ?? '',
    gender: '',
    shuleCode: h.shuleCode ?? '',
    studentCode: h.studentCode ?? h.shuleCode ?? '',
    schoolName: h.schoolName ?? schoolName,
    organizationId: h.organizationId ?? '',
    organizationCode: null,
    className: h.className ?? null,
    classLabel: h.classLabel ?? null,
    educationLevel: null,
    academicYear: h.academicYear ?? null,
    term: h.term ?? null,
    photoUrl: h.photoUrl ?? null,
    parents: (h.parents ?? []).map((p) => ({
      role: p.role ?? '',
      name: p.name ?? '',
      phone: p.phone ?? null,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function RequestLoanModal({ school, open, onClose, initialStudent }: RequestLoanModalProps) {
  const { lang: siteLang } = useSiteLanguage();
  const { toast, FlowToastStack } = useFlowToast();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [lang, setLang] = useState<FlowLang | null>(null);
  const [fromFees, setFromFees] = useState(false);
  const t = useMemo(() => pickFlowText(lang, LOAN_I18N), [lang]);
  const steps = useMemo(() => t.stepLabels, [t]);
  const frequencies = useMemo(
    () =>
      FREQUENCY_IDS.map((id) => ({
        id,
        label:
          id === 'MONTHLY'
            ? t.freqMonthly
            : id === 'BI_WEEKLY'
              ? t.freqBiWeekly
              : id === 'WEEKLY'
                ? t.freqWeekly
                : t.freqQuarterly,
        sub:
          id === 'MONTHLY'
            ? t.freqMonthlySub
            : id === 'BI_WEEKLY'
              ? t.freqBiWeeklySub
              : id === 'WEEKLY'
                ? t.freqWeeklySub
                : t.freqQuarterlySub,
      })),
    [t],
  );
  const disbursements = useMemo(
    () =>
      DISBURSEMENT_IDS.map((id) => ({
        id,
        label: id === 'PAY_SCHOOL_DIRECTLY' ? t.disbPaySchool : id === 'MOBILE_MONEY' ? t.disbMomo : t.disbBank,
        sub: id === 'PAY_SCHOOL_DIRECTLY' ? t.disbPaySchoolSub : id === 'MOBILE_MONEY' ? t.disbMomoSub : t.disbBankSub,
      })),
    [t],
  );

  const [code, setCode] = useState('');
  const [student, setStudent] = useState<StudentData | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [purpose, setPurpose] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [guarantorRelation, setGuarantorRelation] = useState('');

  const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
  const [loanType, setLoanType] = useState<LoanType | null>(null);
  const [outstanding, setOutstanding] = useState(0);
  const [feesLoading, setFeesLoading] = useState(false);
  const [feesStructureFound, setFeesStructureFound] = useState(false);
  const [years, setYears] = useState<string[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [year, setYear] = useState('');
  const [term, setTerm] = useState('');

  const [principalStr, setPrincipalStr] = useState('');
  const [periodMonths, setPeriodMonths] = useState(12);
  const [frequency, setFrequency] = useState<LoanFrequency>('MONTHLY');
  const [disbursement, setDisbursement] = useState<LoanDisbursement>('PAY_SCHOOL_DIRECTLY');
  const [momoPhone, setMomoPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [infoConfirmed, setInfoConfirmed] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmittedResult | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scannerOpenRef = useRef(false);
  const feesFetchKeyRef = useRef('');

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!open || !initialStudent) return;
    try {
      assertStudentBelongsToSchool(initialStudent.organizationId, school.id);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : STUDENT_LOOKUP_NOT_FOUND);
      return;
    }
    const s = handoffToStudent(initialStudent, school.name);
    setStudent(s);
    setFromFees(true);
    setPurpose(LOAN_I18N.en.purposeDefault);
    if (initialStudent.academicYear) setYear(initialStudent.academicYear);
    if (initialStudent.term) setTerm(initialStudent.term);
    void loadLoanDetails(
      s,
      initialStudent.academicYear ?? undefined,
      initialStudent.term ?? undefined,
    );
  }, [open, initialStudent, school.name]);

  useEffect(() => {
    if (!open) return;
    if (!initialStudent) {
      setLang(siteLang);
      setStep(siteLang ? 2 : 1);
      setFromFees(false);
      setStudent(null);
      setCode('');
      setLookupError(null);
      setResult(null);
    } else {
      setLang(siteLang);
      setStep(2);
    }
  }, [open, initialStudent, siteLang]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 1 && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step, submitting, onClose]);

  useEffect(() => {
    scannerOpenRef.current = scannerOpen;
    if (!scannerOpen) stopCamera();
  }, [scannerOpen]);

  useEffect(() => {
    if (scannerOpen && student) setScannerOpen(false);
  }, [student, scannerOpen]);

  useEffect(() => () => stopCamera(), []);

  const principal = Math.max(0, Number(principalStr.replace(/[^\d.]/g, '')) || 0);
  const minAmount = loanType?.minAmount ?? 0;
  const maxAmount = loanType?.maxAmount ?? 0;
  const maxPrincipal = loanType ? Math.min(outstanding > 0 ? outstanding : maxAmount, maxAmount) : 0;

  const schedule = useMemo(() => {
    if (!loanType || principal <= 0) return null;
    return computeLoanSchedule({
      principal,
      interestRatePct: loanType.interestRatePct,
      processingFee: loanType.processingFee,
      periodMonths,
      frequency,
    });
  }, [loanType, principal, periodMonths, frequency]);

  const verifyPhone = student?.parents?.[0]?.phone ?? '';

  function stopCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function loadLoanDetails(s: StudentData, yrOverride?: string, tmOverride?: string) {
    if (!s.organizationId) {
      setFeesStructureFound(false);
      toast.error('This student is not linked to a school account.', 'Profile incomplete');
      return;
    }
    setFeesLoading(true);
    try {
      const types = await fetchLoanTypes(s.organizationId);
      setLoanTypes(types);
      const selected = types.find((t) => t.code === 'SCHOOL_FEES_LOAN') ?? types[0] ?? null;
      setLoanType(selected);
      if (!selected) {
        setFeesStructureFound(false);
        toast.warning('School fee loans are not enabled for this school yet.', 'Loan unavailable');
        return;
      }

      const classKey = s.classLabel ?? s.className;
      const opts = await fetchCircularOptions(s.organizationId, classKey);
      if (opts.academicYears.length) setYears(opts.academicYears);
      if (opts.terms.length) setTerms(opts.terms);

      const yr = yrOverride ?? year ?? s.academicYear ?? opts.academicYears[0] ?? '';
      const tm = tmOverride ?? term ?? s.term ?? opts.terms[0] ?? '';
      if (yr) setYear(yr);
      if (tm) setTerm(tm);

      if (!yr || !tm) {
        setFeesStructureFound(false);
        return;
      }

      const fees = await fetchStudentFeesStructure({
        organizationId: s.organizationId,
        academicYear: yr,
        term: tm,
        className: classKey,
        studentCode: s.studentCode || s.shuleCode || undefined,
        studentId: s.id,
        studentName: s.fullName,
        autoBill: true,
      });

      if (fees?.found) {
        setFeesStructureFound(true);
        setOutstanding(fees.remaining);
        const suggested = Math.min(fees.remaining || selected.maxAmount, selected.maxAmount);
        const clamped = Math.max(selected.minAmount, suggested || 0);
        setPrincipalStr(String(clamped));
        setPeriodMonths(selected.maxPeriodMonths || 12);
      } else {
        setFeesStructureFound(false);
        setOutstanding(0);
        toast.warning(
          `No active fee structure for ${classKey || 'this class'} in ${yr}, ${tm}. Ask the school to activate fees in School Fees Portal before applying for a loan.`,
          'Fees not set up',
        );
      }
    } catch {
      setFeesStructureFound(false);
      toast.error('We could not load fee details. Please try again.', 'Unable to load fees');
    } finally {
      setFeesLoading(false);
    }
  }

  useEffect(() => {
    if (!open) {
      feesFetchKeyRef.current = '';
      return;
    }
    if (!student || !year || !term || step < 3) return;
    const key = `${student.id ?? student.studentCode}-${year}-${term}`;
    if (feesFetchKeyRef.current === key) return;
    feesFetchKeyRef.current = key;
    void loadLoanDetails(student, year, term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student, year, term, step]);

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
      const raw = body.data.student;
      assertStudentBelongsToSchool(raw.organizationId, school.id);
      const s = handoffToStudent(
        { ...raw, photoUrl: normalizeStudentPhotoUrl(raw.photoUrl) },
        school.name,
      );
      setStudent(s);
      await loadLoanDetails(s);
      setStep(3);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLookupLoading(false);
    }
  }

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
        if (value?.trim()) {
          setCode(value.trim());
          await runLookup(value.trim());
          return;
        }
      } catch {
        /* keep scanning */
      }
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  function amountValidation(): { ok: boolean; reasons: string[] } {
    const reasons: string[] = [];
    if (!student) reasons.push(t.valNoStudent);
    if (!loanType) reasons.push(t.valNoLoanType);
    if (principal < minAmount) reasons.push(t.valMinAmount(frw(minAmount)));
    if (principal > maxAmount) reasons.push(t.valMaxAmount(frw(maxAmount)));
    if (principal > 0 && outstanding > 0 && principal > outstanding) {
      reasons.push(t.valExceedOutstanding(frw(outstanding)));
    }
    const minPeriod = loanType?.minPeriodMonths ?? 1;
    const maxPeriod = loanType?.maxPeriodMonths ?? 12;
    if (periodMonths < minPeriod || periodMonths > maxPeriod) {
      reasons.push(t.valPeriod(minPeriod, maxPeriod));
    }
    return { ok: reasons.length === 0, reasons };
  }

  function disbursementValid(): boolean {
    if (disbursement === 'MOBILE_MONEY') return isValidMomoPhone(momoPhone);
    if (disbursement === 'BANK') return bankName.trim().length > 0 && accountNumber.trim().length > 0;
    return true;
  }

  function canNext(): boolean {
    if (step === 1) return lang !== null;
    if (step === 2) return !!student && !lookupLoading && !!loanType && !feesLoading && feesStructureFound;
    if (step === 3) return feesStructureFound && !feesLoading && principal >= minAmount && amountValidation().ok;
    if (step === 4) return disbursementValid();
    if (step === 5) return termsAccepted && infoConfirmed;
    if (step === 6) return /^\d{6}$/.test(otpCode) && !submitting;
    return true;
  }

  function nextLabel(): string {
    if (step === 1) return t.continue;
    if (step === 2) {
      if (!student) return t.findStudent;
      if (feesLoading) return t.loading;
      return t.continue;
    }
    if (step === 3 || step === 4) return t.continue;
    if (step === 5) return t.requestVerification;
    if (step === 6) return submitting ? t.submitting : t.verifySubmit;
    return t.done;
  }

  async function submitApplication() {
    if (!student || !loanType || !feesStructureFound) {
      toast.warning(
        'Fee structure must be loaded before submitting. Choose a valid academic year and term.',
        'Fees required',
      );
      return;
    }
    setSubmitting(true);
    try {
      const phone = normalizeMomoPhone(momoPhone);
      const application = await submitLoanApplication({
        organizationId: student.organizationId,
        studentId: student.id,
        studentCode: student.studentCode || student.shuleCode,
        studentName: student.fullName,
        className: student.classLabel ?? student.className,
        academicYear: year || student.academicYear || '',
        term: term || student.term || '',
        principal,
        periodMonths,
        frequency,
        disbursement,
        phone: disbursement === 'MOBILE_MONEY' ? phone : undefined,
        bankName: disbursement === 'BANK' ? bankName : undefined,
        accountNumber: disbursement === 'BANK' ? accountNumber : undefined,
        accountHolder: disbursement === 'BANK' ? accountHolder : undefined,
        guarantorName: guarantorName || undefined,
        guarantorPhone: guarantorPhone || undefined,
        guarantorRelation: guarantorRelation || undefined,
        purpose: purpose || undefined,
      });
      setResult({
        applicationNumber: application.applicationNumber,
        totalPayable: application.totalPayable,
        principal: application.principal,
        status: application.status,
      });
      setStep(7);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'We could not submit your application.';
      toast.error(
        message.includes('fee structure')
          ? 'No active fee structure for this student and period. Set up fees in School Fees Portal, then reload by changing year/term on the amount step.'
          : message,
        'Application not submitted',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      if (student) setStep(3);
      else void runLookup();
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    if (step === 4) {
      setStep(5);
      return;
    }
    if (step === 5) {
      setStep(6);
      return;
    }
    if (step === 6) {
      void submitApplication();
    }
  }

  function goBack() {
    if (step === 1) {
      onClose();
      return;
    }
    setStep((s) => Math.max(1, s - 1) as Step);
  }

  function resetAll() {
    setStep(1);
    setLang(null);
    setFromFees(false);
    setCode('');
    setStudent(null);
    setLookupError(null);
    setLoanTypes([]);
    setLoanType(null);
    setOutstanding(0);
    setFeesStructureFound(false);
    setYear('');
    setTerm('');
    setYears([]);
    setTerms([]);
    setPrincipalStr('');
    setPeriodMonths(12);
    setFrequency('MONTHLY');
    setDisbursement('PAY_SCHOOL_DIRECTLY');
    setMomoPhone('');
    setBankName('');
    setAccountNumber('');
    setAccountHolder('');
    setPurpose('');
    setGuarantorName('');
    setGuarantorPhone('');
    setGuarantorRelation('');
    setTermsAccepted(false);
    setInfoConfirmed(false);
    setOtpCode('');
    setResult(null);
    feesFetchKeyRef.current = '';
  }

  if (!open || !mounted) return null;

  const hideChrome = step === 7;
  const amountCheck = amountValidation();
  const freqLabel = frequencies.find((f) => f.id === frequency)?.label ?? frequency;
  const disbursementLabel = disbursements.find((d) => d.id === disbursement)?.label ?? disbursement;

  const disbursementIcons: Record<LoanDisbursement, ComponentType<{ className?: string }>> = {
    PAY_SCHOOL_DIRECTLY: SchoolIcon,
    MOBILE_MONEY: IconMomo,
    BANK: IconBank,
  };

  return (
    <>
      <FlowToastStack />
      <FlowModalPortal open={open} mounted={mounted} onClose={submitting ? () => {} : onClose} ariaLabel="Request school loan">
      <FlowModalHeader
        badge={t.modalBadge}
        title={t.modalTitle}
        schoolName={school.name}
        subtitle={
          student?.fullName
            ? `${student.fullName}${student.classLabel || student.className ? ` · ${student.classLabel ?? student.className}` : ''}`
            : undefined
        }
        onClose={onClose}
        closeDisabled={submitting}
        stepper={hideChrome ? undefined : <FlowModalStepper steps={steps} currentStep={step} />}
      />

      <FlowModalBody>
        {step === 1 && (
          <FlowLanguageStep lang={lang} onSelect={setLang} />
        )}

        {step === 2 && (
          <div className="space-y-4">
            {fromFees ? (
              <div className={cn(flowSuccessBoxClass, 'flex items-start gap-2')}>
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <span>
                  {t.fromFeesNote} <strong>{school.name}</strong>.
                </span>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-[16px] font-medium text-ink-900">{t.applicantTitle}</h3>
                  <p className="mt-1 text-[13px] text-ink-500">{t.applicantSub}</p>
                </div>

                <div className={cn(flowInfoBoxClass, 'flex items-start gap-2')}>
                  <SchoolIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span>{t.loanIntro(school.name)}</span>
                </div>

                <Field label={t.studentCodeLabel}>
                  <div className="flex gap-2">
                    <div className="flex flex-1 items-center gap-2.5 rounded-xl border-[1.5px] border-ink-200 bg-white px-3.5 focus-within:border-sky-400 focus-within:bg-sky-50">
                      <SearchIcon className="h-4 w-4 text-ink-400" />
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void runLookup();
                        }}
                        placeholder={t.studentCodePlaceholder}
                        className="h-11 w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void openScanner()}
                      className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-sky-200 bg-white px-3.5 text-[12.5px] font-medium text-sky-700 transition hover:bg-sky-50"
                    >
                      <CameraIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">{t.scanQr}</span>
                    </button>
                  </div>
                </Field>

                {scannerOpen ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <video ref={videoRef} className="aspect-[4/3] w-full bg-black object-cover" muted playsInline />
                    <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5">
                      <span className="text-[12px] text-slate-500">{t.scanHint}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setScannerOpen(false);
                          stopCamera();
                        }}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
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
                {lookupError ? <div className={flowErrorBoxClass}>{lookupError}</div> : null}
              </>
            )}

            {student ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
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
                        {student.classLabel ?? student.className ?? t.classNotSet} · {student.schoolName}
                      </p>
                      <p className="font-mono text-[11px] text-slate-400">{student.studentCode}</p>
                    </div>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
                      <CheckIcon className="h-3 w-3" /> {t.verified}
                    </span>
                  </div>
                </div>

                {feesLoading ? (
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <Spinner className="h-4 w-4 text-[#FCB038]" /> {t.checkingLoan}
                  </p>
                ) : null}
                {!feesLoading && student && !feesStructureFound ? (
                  <p className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12.5px] text-amber-800">
                    Fees are not set up for this student yet. The school must activate a fee structure before you can continue.
                  </p>
                ) : null}
                {!feesLoading && feesStructureFound ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[12.5px] text-emerald-800">
                    Outstanding fees: <strong>{frw(outstanding)}</strong>
                  </p>
                ) : null}

                <SectionHeader
                  icon={<UserIcon className="h-4 w-4" />}
                  title={t.applicantTitle}
                  sub={t.applicantOptional}
                />

                <Field label={t.purposeOfLoan}>
                  <input
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder={t.purposePh}
                    className={flowInputClass}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={t.guarantorName}>
                    <input
                      value={guarantorName}
                      onChange={(e) => setGuarantorName(e.target.value)}
                      placeholder={t.guarantorNamePh}
                      className={flowInputClass}
                    />
                  </Field>
                  <Field label={t.guarantorPhone}>
                    <input
                      value={guarantorPhone}
                      onChange={(e) => setGuarantorPhone(e.target.value)}
                      placeholder={t.guarantorPhonePh}
                      className={flowInputClass}
                    />
                  </Field>
                </div>

                <Field label={t.guarantorRelation}>
                  <input
                    value={guarantorRelation}
                    onChange={(e) => setGuarantorRelation(e.target.value)}
                    placeholder={t.guarantorRelationPh}
                    className={flowInputClass}
                  />
                </Field>
              </div>
            ) : null}
          </div>
        )}

        {step === 3 && loanType && (
          <div className="space-y-4">
            <SectionHeader icon={<WalletIcon className="h-4 w-4" />} title={t.loanAmountPlan} />

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[#000435]">Academic year</label>
                <select
                  value={year}
                  onChange={(e) => {
                    feesFetchKeyRef.current = '';
                    setYear(e.target.value);
                    setTerm('');
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-[#000435]/40"
                >
                  {!year ? <option value="">Select year</option> : null}
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[#000435]">Term</label>
                <select
                  value={term}
                  onChange={(e) => {
                    feesFetchKeyRef.current = '';
                    setTerm(e.target.value);
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-[#000435]/40"
                >
                  {!term ? <option value="">Select term</option> : null}
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
                <Spinner className="h-4 w-4 text-[#FCB038]" /> Loading fees for this period…
              </p>
            ) : null}

            {!feesLoading && feesStructureFound ? (
              <p className="text-[12.5px] text-slate-600">
                Outstanding balance: <strong className="text-[#000435]">{frw(outstanding)}</strong>
              </p>
            ) : null}

            <Field label={t.amountBorrow} hint={t.limits(frw(minAmount), frw(maxPrincipal))}>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 focus-within:border-[#000435]/40">
                <span className="text-sm font-medium text-[#000435]">RWF</span>
                <input
                  value={principalStr}
                  onChange={(e) => setPrincipalStr(e.target.value)}
                  inputMode="numeric"
                  placeholder="0"
                  className="h-11 w-full bg-transparent text-sm font-medium text-[#000435] outline-none"
                />
              </div>
            </Field>

            <input
              type="range"
              min={Math.min(minAmount, maxAmount)}
              max={Math.max(maxPrincipal, minAmount)}
              step={10000}
              value={Math.min(Math.max(principal, minAmount), Math.max(maxPrincipal, minAmount))}
              onChange={(e) => setPrincipalStr(e.target.value)}
              className="w-full accent-[#FCB038]"
              disabled={maxPrincipal <= 0}
            />

            <Field
              label={t.repaymentPeriod}
              hint={t.periodBetween(loanType.minPeriodMonths, loanType.maxPeriodMonths)}
            >
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {Array.from(
                  { length: loanType.maxPeriodMonths - loanType.minPeriodMonths + 1 },
                  (_, i) => loanType.minPeriodMonths + i,
                ).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPeriodMonths(m)}
                    className={cn(
                      'flex min-h-9 items-center justify-center rounded-xl border px-2 py-1.5 text-[11px] font-medium whitespace-nowrap transition sm:text-[12px]',
                      periodMonths === m
                        ? 'border-[#000435] bg-[#000435] text-[#FCB038]'
                        : 'border-slate-200 bg-white text-[#000435] hover:border-slate-300',
                    )}
                  >
                    {t.monthCount(m)}
                  </button>
                ))}
              </div>
            </Field>

            <Field label={t.paymentFrequency}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {frequencies.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFrequency(f.id)}
                    className={cn(
                      'flex flex-col items-center rounded-xl border p-3 text-center transition',
                      frequency === f.id
                        ? 'border-[#000435] bg-[#000435] text-white'
                        : 'border-slate-200 bg-white text-[#000435] hover:border-slate-300',
                    )}
                  >
                    <CalendarIcon className={cn('mb-1 h-4 w-4', frequency === f.id ? 'text-[#FCB038]' : 'text-slate-400')} />
                    <span className="text-[12.5px] font-medium">{f.label}</span>
                    <span className={cn('text-[10px]', frequency === f.id ? 'text-white/60' : 'text-slate-400')}>{f.sub}</span>
                  </button>
                ))}
              </div>
            </Field>

            {amountCheck.ok && schedule ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">{t.youBorrow}</p>
                    <p className="text-lg font-medium text-[#000435]">{frw(principal)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">{t.eachInstallment}</p>
                    <p className="text-lg font-medium text-[#000435]">{frw(schedule.installmentAmount)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
                <p className="text-[12px] font-medium text-amber-800">{t.almostThere}</p>
                <ul className="mt-1 space-y-0.5 text-[11.5px] text-amber-700">
                  {amountCheck.reasons.map((r) => (
                    <li key={r}>• {r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {step === 4 && loanType && schedule && (
          <div className="space-y-4">
            <SectionHeader icon={<CalendarIcon className="h-4 w-4" />} title={t.repaymentSchedule} />

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">{t.principal}</p>
                <p className="text-base font-medium text-[#000435]">{frw(principal)}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  {t.interest} ({loanType.interestRatePct}%)
                </p>
                <p className="text-base font-medium text-[#000435]">{frw(schedule.interest)}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">{t.processingFee}</p>
                <p className="text-base font-medium text-[#000435]">{frw(loanType.processingFee)}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
                <p className="text-[10px] uppercase tracking-wide text-amber-600">{t.totalPayable}</p>
                <p className="text-base font-medium text-[#000435]">{frw(schedule.totalPayable)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-[12px] font-medium text-[#000435]">
                  {t.installments} · {schedule.installments}
                </span>
                <span className="text-[12px] font-medium text-slate-500">
                  {frw(schedule.installmentAmount)} {t.each}
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-2 font-medium">{t.dueDate}</th>
                      <th className="px-4 py-2 text-right font-medium">{t.amountCol}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.schedule.map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 text-[12.5px]">
                        <td className="px-4 py-2 text-slate-500">
                          {new Date(row.due).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-[#000435]">{frw(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <SectionHeader icon={<WalletIcon className="h-4 w-4" />} title={t.receiveMoney} />

            <div className="grid grid-cols-1 gap-2">
              {disbursements.map((d) => {
                const DIcon = disbursementIcons[d.id];
                const active = disbursement === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDisbursement(d.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border p-3.5 text-left transition',
                      active
                        ? 'border-[#000435] bg-[#000435] text-white'
                        : 'border-slate-200 bg-white text-[#000435] hover:border-slate-300',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-9 w-9 place-items-center rounded-full',
                        active ? 'bg-white/15 text-[#FCB038]' : 'bg-slate-100 text-[#000435]',
                      )}
                    >
                      <DIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium">{d.label}</p>
                      <p className={cn('text-[11px]', active ? 'text-white/60' : 'text-slate-400')}>{d.sub}</p>
                    </div>
                    {d.id === 'PAY_SCHOOL_DIRECTLY' ? (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-medium',
                          active ? 'bg-[#FCB038] text-[#000435]' : 'bg-amber-100 text-amber-700',
                        )}
                      >
                        {t.recommended}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {disbursement === 'MOBILE_MONEY' ? (
              <Field label={t.momoNumber} hint={t.momoHint}>
                <input
                  value={momoPhone}
                  onChange={(e) => setMomoPhone(e.target.value)}
                  placeholder={t.momoPh}
                  className={flowInputClass}
                  inputMode="tel"
                />
              </Field>
            ) : null}

            {disbursement === 'BANK' ? (
              <div className="grid grid-cols-1 gap-3">
                <Field label={t.bank}>
                  <select value={bankName} onChange={(e) => setBankName(e.target.value)} className={flowInputClass}>
                    <option value="">{t.selectBank}</option>
                    {RWANDA_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={t.accountHolder}>
                    <input
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      placeholder={t.fullName}
                      className={flowInputClass}
                    />
                  </Field>
                  <Field label={t.accountNumber}>
                    <input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder={t.accountNumber}
                      className={flowInputClass}
                    />
                  </Field>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {step === 5 && loanType && schedule && student && (
          <div className="space-y-4">
            <SectionHeader icon={<DocIcon className="h-4 w-4" />} title={t.reviewTitle} />

            <div className="rounded-2xl border border-slate-100">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">{t.applicant}</p>
              </div>
              <div className="px-4">
                <SummaryRow label={t.student} value={student.fullName} />
                <SummaryRow label={t.school} value={student.schoolName} />
                <SummaryRow label={t.classField} value={student.classLabel ?? student.className ?? '—'} />
                <SummaryRow label={t.studentCode} value={student.studentCode || '—'} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">{t.loanDetails}</p>
              </div>
              <div className="px-4">
                <SummaryRow label={t.loanType} value={loanType.name} />
                <SummaryRow label={t.amount} value={frw(principal)} />
                <SummaryRow label={t.period} value={t.monthCount(periodMonths)} />
                <SummaryRow label={t.frequency} value={freqLabel} />
                <SummaryRow label={t.interest} value={frw(schedule.interest)} />
                <SummaryRow label={t.processingFee} value={frw(loanType.processingFee)} />
                <SummaryRow label={t.totalPayable} value={frw(schedule.totalPayable)} strong />
                <SummaryRow
                  label={t.installment}
                  value={`${frw(schedule.installmentAmount)} × ${schedule.installments}`}
                  strong
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">{t.disbursement}</p>
              </div>
              <div className="px-4">
                <SummaryRow label={t.method} value={disbursementLabel} />
                {disbursement === 'MOBILE_MONEY' ? <SummaryRow label={t.toMobile} value={momoPhone} /> : null}
                {disbursement === 'BANK' ? (
                  <>
                    <SummaryRow label={t.bank} value={bankName} />
                    <SummaryRow label={t.account} value={accountNumber} />
                  </>
                ) : null}
                {disbursement === 'PAY_SCHOOL_DIRECTLY' ? (
                  <SummaryRow label={t.destination} value={student.schoolName} />
                ) : null}
              </div>
            </div>

            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3.5">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#000435]"
              />
              <span className="text-[12.5px] text-slate-600">{t.agreeTerms(frw(schedule.totalPayable))}</span>
            </label>

            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3.5">
              <input
                type="checkbox"
                checked={infoConfirmed}
                onChange={(e) => setInfoConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#000435]"
              />
              <span className="text-[12.5px] text-slate-600">{t.confirmInfo}</span>
            </label>
          </div>
        )}

        {step === 6 && student && (
          <div className="space-y-4">
            <div className="flex flex-col items-center pt-2 text-center">
              <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-[#000435] text-[#FCB038]">
                <LockIcon className="h-6 w-6" />
              </div>
              <h3 className="text-base font-medium text-[#000435]">{t.verifyTitle}</h3>
              <p className="mt-1 max-w-xs text-[12.5px] text-slate-500">{t.verifySub(maskPhone(verifyPhone))}</p>
            </div>

            <input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="••••••"
              className="mx-auto block h-14 w-full max-w-[220px] rounded-2xl border border-slate-200 text-center text-2xl font-medium tracking-[0.5em] text-[#000435] outline-none focus:border-[#000435]/40"
            />

            <p className="text-center text-[11.5px] text-slate-400">{t.verifyDemo}</p>
          </div>
        )}

        {step === 7 && result && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckIcon className="h-9 w-9 text-emerald-600" />
            </div>
            <h2 className="font-display text-2xl font-medium text-[#000435]">{t.applicationSubmitted}</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-1.5 text-[11px] font-medium tracking-[0.14em] text-amber-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {t.statusUnderReview}
            </span>
            <p className="text-sm text-slate-500">{t.submittedSummary(frw(result.principal))}</p>

            <div className="mx-auto max-w-sm rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">{t.applicationNumber}</span>
                <span className="font-mono font-medium text-[#000435]">{result.applicationNumber}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">{t.student}</span>
                <span className="font-medium text-[#000435]">{student?.fullName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">{t.totalRepay}</span>
                <span className="font-medium text-[#000435]">{frw(result.totalPayable)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">{t.frequency}</span>
                <span className="font-medium text-[#000435]">{freqLabel}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <ActionButton
                onClick={onClose}
                icon={<DocIcon className="h-5 w-5" />}
                label={t.viewApplication}
                desc={t.viewApplicationDesc}
                variant="primary"
                full
              />
              <ActionButton
                onClick={onClose}
                icon={<ClockIcon className="h-5 w-5" />}
                label={t.checkLater}
                desc={t.checkLaterDesc}
              />
              <ActionButton
                onClick={() => {
                  resetAll();
                  onClose();
                }}
                icon={<SchoolIcon className="h-5 w-5" />}
                label={t.backToSchool}
                desc={t.backToSchoolDesc}
              />
            </div>
          </div>
        )}
      </FlowModalBody>

      <FlowModalFooter
        hideFooter={hideChrome}
        onBack={goBack}
        backLabel={step === 1 ? t.close : t.back}
        onNext={goNext}
        nextLabel={nextLabel()}
        nextDisabled={!canNext()}
        loading={submitting}
        nextIcon={submitting ? <Spinner className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
      />
    </FlowModalPortal>
    </>
  );
}
