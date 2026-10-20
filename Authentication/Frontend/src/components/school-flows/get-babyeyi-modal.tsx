'use client';

import { useEffect, useMemo, useState } from 'react';
import type { School } from '@/lib/school-flows/types';
import { BABYEYI_API } from '@/lib/school-flows/api-config';
import { fetchCircularOptions, fetchPublicCircular } from '@/lib/school-flows/fees-api';
import { lookupStudentByCode } from '@/LandingPage/services/portal-api';
import {
  assertStudentBelongsToSchool,
  normalizeStudentPhotoUrl,
  STUDENT_LOOKUP_NOT_FOUND,
} from './helpers';
import { cn } from '@/lib/utils';
import type { HandoffStudent } from './request-loan-modal';
import {
  FlowModalBody,
  FlowModalFooter,
  FlowModalHeader,
  FlowModalPortal,
  FlowModalStepper,
  flowErrorBoxClass,
  flowInputClass,
  flowLabelClass,
  flowCardClass,
  flowSectionSubClass,
  flowSectionTitleClass,
} from './flow-modal-shell';
import { FlowLanguageStep, type FlowLang } from './flow-language';

interface GetBabyeyiModalProps {
  school: School;
  open: boolean;
  onClose: () => void;
  /** When set, skips student lookup — starts at language, then period selection. */
  initialStudent?: HandoffStudent | null;
}

type Lang = 'rw' | 'en' | 'fr';
type Step = 1 | 2 | 3 | 4;

/* ─── Student lookup types ─── */
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

/* ─── Circular types ─── */
interface CircularOption {
  academicYear: string;
  terms: string[];
}
interface CircularLine {
  id: string;
  name: string;
  description?: string;
  amount: number;
  category?: string;
}
interface CircularData {
  id?: string;
  organizationId: string;
  academicYear: string;
  term: string;
  className?: string;
  feeLines: CircularLine[];
  requirementLines: CircularLine[];
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  grandTotal?: number;
}

/* ─── Inline icons ─── */
function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}
const CloseIcon = (p: { className?: string }) => <Icon {...p} path="M6 6l12 12M18 6L6 18" />;
const ChevronLeft = (p: { className?: string }) => <Icon {...p} path="M15 18l-6-6 6-6" />;
const CheckIcon = (p: { className?: string }) => <Icon {...p} path="M20 6L9 17l-5-5" />;

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
    </svg>
  );
}

/* ─── Content data ─── */
const LANGUAGES: { code: Lang; name: string; native: string }[] = [
  { code: 'rw', name: 'Kinyarwanda', native: 'Ikinyarwanda' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'fr', name: 'Français', native: 'Français' },
];

const TEXT: Record<Lang, {
  step1Title: string; step1Sub: string;
  step2Title: string; step2Sub: string;
  studentCodeLabel: string; studentCodePlaceholder: string;
  yearLabel: string; termLabel: string;
  back: string; continue: string; generate: string;
  docTitle: string; toParent: string;
  intro: (school: string, term: string, year: string) => string;
  feesTitle: string; itemsTitle: string; total: string; grandTotal: string;
  bankTitle: string; bankName: string; bankAcct: string; bankAcctName: string;
  downloadBtn: string; downloaded: string; newRequest: string;
  loading: string; notFound: string; error: string;
}> = {
  rw: {
    step1Title: 'Hitamo Ururimi', step1Sub: 'Uzabona Babyeyi mu rurimi wahisemo.',
    step2Title: 'Amakuru y\u2019Umunyeshuri', step2Sub: 'Shakisha umunyeshuri bwandyandikisha kode y\u2019awe.',
    studentCodeLabel: 'Kode y\u2019Umunyeshuri (SDMS)', studentCodePlaceholder: 'urugero: SDM-2026-004821',
    yearLabel: 'Umwaka w\u2019Amashuri', termLabel: 'Igihembwe',
    back: 'Subira', continue: 'Komeza', generate: 'Reba Babyeyi',
    docTitle: 'UBUTUMWA BW\u2019ABABYEYI', toParent: 'Ku mubyeyi/Umwishingizi',
    intro: (school, term, year) => `Tunejejwe kubamenyesha ko umunyeshuri yemerewe gukomeza kwiga mu ${term} ku kigo cya ${school} mu mwaka w\u2019amashuri wa ${year}.`,
    feesTitle: 'URUTONDE RW\u2019AMAFARANGA', itemsTitle: 'IBIKORESHO BY\u2019UMUNYESHURI',
    total: 'IGITERANYO', grandTotal: 'AMAFARANGA YOSE YISHYURWA',
    bankTitle: 'AMAKURU Y\u2019AMABANKI', bankName: 'Izina rya Banki', bankAcct: 'Nimero ya Konti', bankAcctName: 'Izina rya Konti',
    downloadBtn: 'Kuramo PDF', downloaded: 'Byakuwe', newRequest: 'Saba indi Babyeyi',
    loading: 'Birimo gushakisha...', notFound: 'Umunyeshuri abonetse', error: 'Habaye ikosa mu gutanga amakuru',
  },
  en: {
    step1Title: 'Choose Your Language', step1Sub: 'Your Babyeyi notice will be generated in this language.',
    step2Title: 'Student Details', step2Sub: 'Enter the student code to look up their information.',
    studentCodeLabel: 'Student Code (SDMS)', studentCodePlaceholder: 'e.g. SDM-2026-004821',
    yearLabel: 'Academic Year', termLabel: 'Term',
    back: 'Back', continue: 'Continue', generate: 'Get Babyeyi',
    docTitle: 'MESSAGE TO PARENTS', toParent: 'To the Parent / Guardian',
    intro: (school, term, year) => `We are pleased to confirm your child's continued enrollment for ${term} at ${school} for the ${year} academic year.`,
    feesTitle: 'FEE SCHEDULE', itemsTitle: 'STUDENT SUPPLIES',
    total: 'TOTAL', grandTotal: 'TOTAL AMOUNT PAYABLE',
    bankTitle: 'BANK DETAILS', bankName: 'Bank Name', bankAcct: 'Account Number', bankAcctName: 'Account Name',
    downloadBtn: 'Download PDF', downloaded: 'Downloaded', newRequest: 'Start a new request',
    loading: 'Looking up student...', notFound: 'Student not found', error: 'Failed to load student data',
  },
  fr: {
    step1Title: 'Choisissez la langue', step1Sub: 'Votre avis Babyeyi sera généré dans cette langue.',
    step2Title: 'Informations de l\u2019élève', step2Sub: 'Saisissez le code élève pour rechercher ses informations.',
    studentCodeLabel: 'Code élève (SDMS)', studentCodePlaceholder: 'ex : SDM-2026-004821',
    yearLabel: 'Année scolaire', termLabel: 'Trimestre',
    back: 'Retour', continue: 'Continuer', generate: 'Obtenir le Babyeyi',
    docTitle: 'MESSAGE AUX PARENTS', toParent: 'Au parent / tuteur',
    intro: (school, term, year) => `Nous confirmons avec plaisir la poursuite de la scolarité de votre enfant pour le ${term} à ${school} pour l\u2019année ${year}.`,
    feesTitle: 'LISTE DES FRAIS', itemsTitle: 'FOURNITURES SCOLAIRES',
    total: 'TOTAL', grandTotal: 'MONTANT TOTAL À PAYER',
    bankTitle: 'COORDONNÉES BANCAIRES', bankName: 'Nom de la banque', bankAcct: 'Numéro de compte', bankAcctName: 'Nom du compte',
    downloadBtn: 'Télécharger le PDF', downloaded: 'Téléchargé', newRequest: 'Nouvelle demande',
    loading: 'Recherche en cours...', notFound: 'Élève non trouvé', error: 'Échec du chargement des données',
  },
};

const RWF = (n: number) => `${n.toLocaleString('en-US')} RWF`;

function StudentPhoto({
  photoUrl,
  firstName,
  lastName,
  className,
}: {
  photoUrl: string | null;
  firstName: string;
  lastName: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = normalizeStudentPhotoUrl(photoUrl);

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-[16px] font-medium text-sky-700',
          className,
        )}
      >
        {firstName[0]}
        {lastName[0]}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={cn('h-12 w-12 rounded-full object-cover ring-2 ring-white', className)}
      onError={() => setFailed(true)}
    />
  );
}

function handoffToStudentData(h: HandoffStudent, schoolName: string): StudentData {
  const first = h.firstName ?? h.fullName?.split(/\s+/)[0] ?? '';
  const last = h.lastName ?? h.fullName?.split(/\s+/).slice(1).join(' ') ?? '';
  const code = h.shuleCode?.trim() || h.studentCode?.trim() || '';
  return {
    id: h.id ?? code,
    fullName: h.fullName ?? `${first} ${last}`.trim(),
    firstName: first,
    lastName: last,
    gender: '',
    shuleCode: code,
    studentCode: h.studentCode?.trim() || code,
    schoolName: h.schoolName ?? schoolName,
    organizationId: h.organizationId ?? '',
    organizationCode: null,
    className: h.className ?? null,
    classLabel: h.classLabel ?? null,
    educationLevel: null,
    academicYear: h.academicYear ?? null,
    term: h.term ?? null,
    photoUrl: normalizeStudentPhotoUrl(h.photoUrl),
    parents: (h.parents ?? []).map((p) => ({
      role: p.role ?? 'Parent',
      name: p.name ?? '',
      phone: p.phone ?? null,
    })),
  };
}

export function GetBabyeyiModal({ school, open, onClose, initialStudent }: GetBabyeyiModalProps) {
  const skipLookup = !!initialStudent;
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [lang, setLang] = useState<Lang | null>(null);

  /* Step 2  student lookup */
  const [studentCode, setStudentCode] = useState('');
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  /* Step 3  circular selection */
  const [circularOptions, setCircularOptions] = useState<CircularOption[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [circularData, setCircularData] = useState<CircularData | null>(null);
  const [circularLoading, setCircularLoading] = useState(false);
  const [circularError, setCircularError] = useState<string | null>(null);

  /* Step 4  document */
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (!open) { setMounted(false); return; }
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (open) {
      setStep(1);
      setLang(null);
      setStudentCode(
        initialStudent?.studentCode?.trim() ||
          initialStudent?.shuleCode?.trim() ||
          '',
      );
      setStudentData(null);
      setLookupError(null);
      setCircularOptions([]);
      setSelectedYear('');
      setSelectedTerm('');
      setCircularData(null);
      setCircularError(null);
      setDownloaded(false);
    }
  }, [open, initialStudent]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [open, onClose]);

  const t = TEXT[lang ?? 'en'];

  const stepLabels = skipLookup
    ? [
        { label: 'Language', short: 'Lang' },
        { label: 'Period', short: 'Period' },
        { label: 'Babyeyi', short: 'Babyeyi' },
      ]
    : [
        { label: 'Language', short: 'Lang' },
        { label: 'Student', short: 'Student' },
        { label: 'Period', short: 'Period' },
        { label: 'Babyeyi', short: 'Babyeyi' },
      ];

  function displayStep(s: Step) {
    if (!skipLookup) return s;
    if (s <= 1) return 1;
    if (s === 3) return 2;
    if (s === 4) return 3;
    return s;
  }

  function applyCircularOptions(
    circulars: CircularOption[],
    currentAcademicYear?: string | null,
    currentTerm?: string | null,
  ) {
    setCircularOptions(circulars);
    if (circulars.length === 0) return;
    const preferredYear = initialStudent?.academicYear ?? currentAcademicYear ?? circulars[0].academicYear;
    const yearMatch = circulars.find((o) => o.academicYear === preferredYear) ?? circulars[0];
    const terms = Array.isArray(yearMatch.terms) ? yearMatch.terms : [];
    const preferredTerm = initialStudent?.term ?? currentTerm ?? terms[0] ?? '';
    setSelectedYear(yearMatch.academicYear);
    setSelectedTerm(terms.includes(preferredTerm) ? preferredTerm : (terms[0] ?? ''));
  }

  async function loadCircularOptionsOnly(orgId: string, classLabel?: string | null) {
    const opts = await fetchCircularOptions(orgId, classLabel);
    if (opts.grouped?.length) {
      applyCircularOptions(opts.grouped, opts.currentAcademicYear, opts.currentTerm);
      return;
    }
    if (opts.academicYears.length > 0) {
      applyCircularOptions(
        opts.academicYears.map((y) => ({ academicYear: y, terms: opts.terms ?? [] })),
        opts.currentAcademicYear,
        opts.currentTerm,
      );
    }
  }

  function seedPeriodFromProfile(sd: StudentData) {
    if (!sd.academicYear) return;
    setCircularOptions((prev) =>
      prev.length > 0
        ? prev
        : [{ academicYear: sd.academicYear!, terms: sd.term ? [sd.term] : [] }],
    );
    setSelectedYear((prev) => prev || sd.academicYear || '');
    setSelectedTerm((prev) => prev || sd.term || '');
  }

  async function bootstrapHandoffStudent() {
    if (!initialStudent) return;
    const sd = handoffToStudentData(initialStudent, school.name);
    setStudentData(sd);
    setLookupLoading(true);
    setLookupError(null);
    try {
      if (sd.organizationId) {
        await loadCircularOptionsOnly(sd.organizationId, sd.classLabel ?? sd.className);
      }
      seedPeriodFromProfile(sd);
      setStep(3);
    } finally {
      setLookupLoading(false);
    }
  }

  async function lookupStudent(codeOverride?: string) {
    const code = (codeOverride ?? studentCode).trim();
    if (code.length < 3) return;
    setLookupLoading(true);
    setLookupError(null);
    try {
      const s = await lookupStudentByCode(code);
      assertStudentBelongsToSchool(s.organizationId, school.id);
      const sd: StudentData = {
        id: s.id,
        fullName: s.fullName,
        firstName: s.firstName,
        lastName: s.lastName,
        gender: s.gender ?? '',
        shuleCode: s.shuleCode ?? s.studentUid,
        studentCode: s.studentCode ?? s.sdmCode ?? s.studentUid,
        schoolName: s.schoolName,
        organizationId: s.organizationId,
        organizationCode: s.organizationCode ?? null,
        className: s.className,
        classLabel: s.classLabel,
        educationLevel: s.educationLevel ?? null,
        academicYear: s.academicYear,
        term: s.term,
        photoUrl: normalizeStudentPhotoUrl(s.photoUrl),
        parents: s.parents.map((p) => ({
          role: p.role,
          name: p.name,
          phone: p.phone ?? null,
        })),
      };
      setStudentData(sd);
      if (sd.organizationId) {
        await loadCircularOptionsOnly(sd.organizationId, sd.classLabel ?? sd.className);
      }
      seedPeriodFromProfile(sd);
      setStep(3);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Student not found';
      const cleaned = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
      setLookupError(cleaned);
    } finally {
      setLookupLoading(false);
    }
  }

  async function fetchCircular() {
    if (!studentData || !selectedYear || !selectedTerm) return;
    setCircularLoading(true);
    setCircularError(null);
    try {
      const circular = await fetchPublicCircular({
        organizationId: studentData.organizationId,
        academicYear: selectedYear,
        term: selectedTerm,
        classLabel: studentData.classLabel ?? studentData.className,
      });
      if (!circular) {
        throw new Error(
          lang === 'rw'
            ? `Nta Babyeyi yemewe yabonetse (${selectedYear}, ${selectedTerm}).`
            : `No approved Babyeyi notice for ${selectedYear}, ${selectedTerm}.`,
        );
      }
      setCircularData(circular as unknown as CircularData);
      setStep(4);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'No circular found for this period';
      const cleaned = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
      setCircularError(cleaned);
    } finally {
      setCircularLoading(false);
    }
  }

  /* ─── Open the modern, localized print view (same as BabyeyiWizard) ─── */
  function openPrintView() {
    if (!studentData || !circularData?.id) return;
    const url =
      `${BABYEYI_API}/public/circulars/${encodeURIComponent(circularData.id)}/print` +
      `?organizationId=${encodeURIComponent(studentData.organizationId)}` +
      `&lang=${encodeURIComponent(lang ?? 'en')}` +
      `&autoprint=1`;
    const win = window.open(url, '_blank', 'popup=yes,width=990,height=1200,left=60,top=40');
    // Script-opened popups may call window.close() and reliably trigger the
    // print dialog; fall back to a normal tab if the popup is blocked.
    if (!win) window.open(url, '_blank');
    setDownloaded(true);
  }

  const feesTotal = useMemo(() => circularData?.feeLines?.reduce((s, f) => s + f.amount, 0) ?? 0, [circularData]);
  const itemsTotal = useMemo(() => circularData?.requirementLines?.reduce((s, it) => s + it.amount, 0) ?? 0, [circularData]);
  const grandTotal = feesTotal + itemsTotal;
  const canGoStep3 = lang !== null;
  const canGenerate = studentCode.trim().length > 2;

  function goBack() {
    if (step === 1) {
      onClose();
      return;
    }
    if (skipLookup && step === 3) {
      setStep(1);
      return;
    }
    setStep((s) => Math.max(1, s - 1) as Step);
  }

  function goNext() {
    if (step === 1) {
      if (skipLookup) {
        void bootstrapHandoffStudent();
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      void lookupStudent(undefined);
      return;
    }
    if (step === 3) {
      void fetchCircular();
    }
  }

  function nextLabel() {
    if (step === 1) return lookupLoading ? t.loading : t.continue;
    if (step === 2) return lookupLoading ? t.loading : t.continue;
    if (step === 3) return circularLoading ? t.loading : t.generate;
    return t.newRequest;
  }

  function canNext() {
    if (step === 1) return canGoStep3 && !lookupLoading;
    if (step === 2) return canGenerate && !lookupLoading;
    if (step === 3) return !!selectedYear && !!selectedTerm && !circularLoading;
    return true;
  }

  if (!open || !mounted) return null;

  return (
    <FlowModalPortal open={open} mounted={mounted} onClose={onClose} ariaLabel="Get Babyeyi" zIndex={130}>
      <FlowModalHeader
        badge="Babyeyi"
        title={school.name}
        schoolName=""
        subtitle={
          studentData
            ? `${studentData.fullName}${studentData.className ? ` · ${studentData.className}` : ''}`
            : skipLookup
              ? initialStudent?.fullName ?? undefined
              : undefined
        }
        onClose={onClose}
        stepper={
          step < 4 ? (
            <FlowModalStepper steps={stepLabels} currentStep={displayStep(step)} />
          ) : undefined
        }
      />

      <FlowModalBody>
          {/* STEP 1  Language */}
          {step === 1 && (
            <>
              <FlowLanguageStep
                lang={lang as FlowLang | null}
                onSelect={(code) => setLang(code)}
                title={t.step1Title}
                subtitle={t.step1Sub}
              />
              {lookupError ? <div className={cn(flowErrorBoxClass, 'mt-4')}>{lookupError}</div> : null}
            </>
          )}

          {step === 2 && !skipLookup && (
            <div>
              <h3 className={flowSectionTitleClass}>{t.step2Title}</h3>
              <p className={flowSectionSubClass}>{t.step2Sub}</p>
              <div className="mt-5 flex flex-col gap-4">
                <div>
                  <label className={flowLabelClass}>{t.studentCodeLabel}</label>
                  <input
                    type="text"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    placeholder={t.studentCodePlaceholder}
                    onKeyDown={(e) => e.key === 'Enter' && canGenerate && void lookupStudent(undefined)}
                    className={flowInputClass}
                  />
                </div>
                {lookupError ? <div className={flowErrorBoxClass}>{lookupError}</div> : null}
              </div>
            </div>
          )}

          {step === 3 && studentData && (
            <div>
              <h3 className={flowSectionTitleClass}>
                {skipLookup ? 'Confirm student & period' : 'Select period'}
              </h3>
              <p className={flowSectionSubClass}>
                {skipLookup
                  ? 'Choose the academic year and term for the Babyeyi notice.'
                  : 'Choose the academic year and term for the Babyeyi notice.'}
              </p>

              {!skipLookup ? (
              <div className={cn(flowCardClass, 'mt-4')}>
                <div className="flex items-center gap-3">
                  <StudentPhoto
                    photoUrl={studentData.photoUrl}
                    firstName={studentData.firstName}
                    lastName={studentData.lastName}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-ink-900">{studentData.fullName}</p>
                    <p className="text-[12px] text-ink-500">{studentData.shuleCode} · {studentData.classLabel ?? studentData.className}</p>
                  </div>
                </div>
              </div>
              ) : null}

              <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', skipLookup ? 'mt-1' : 'mt-4')}>
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-ink-500">{t.yearLabel}</label>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full rounded-xl border-[1.5px] border-ink-200 bg-white px-4 py-3 text-[14px] font-medium text-ink-900 outline-none transition-colors focus:border-sky-400">
                    {circularOptions.map((o) => (
                      <option key={o.academicYear} value={o.academicYear}>{o.academicYear}</option>
                    ))}
                    {circularOptions.length === 0 && <option value="">No periods available</option>}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-ink-500">{t.termLabel}</label>
                  <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}
                    className="w-full rounded-xl border-[1.5px] border-ink-200 bg-white px-4 py-3 text-[14px] font-medium text-ink-900 outline-none transition-colors focus:border-sky-400">
                    {circularOptions.find((o) => o.academicYear === selectedYear)?.terms?.map((term) => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                    {!selectedYear && <option value="">Select year first</option>}
                  </select>
                </div>
              </div>

              {circularError ? <div className={cn(flowErrorBoxClass, 'mt-3')}>{circularError}</div> : null}
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="rounded-[14px] border-[1.5px] border-ink-200 bg-white p-[18px]">
                {/* Document header */}
                <div className="bg-gradient-to-br from-sky-700 to-[#042f2e] px-6 py-5 text-center text-white">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-amber-300">{school.name}</p>
                  <h4 className="mt-1 text-[18px] font-medium">{t.docTitle}</h4>
                </div>

                <div className="bg-white px-6 py-5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{t.toParent}</p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-700">
                    {t.intro(school.name, selectedTerm, selectedYear)}
                  </p>

                  {/* Student + period info */}
                  <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl bg-ink-50 p-3 sm:grid-cols-3">
                    <div>
                      <span className="block text-[10px] font-medium uppercase text-ink-400">Student</span>
                      <span className="text-[12.5px] font-medium text-ink-900">{studentData?.shuleCode}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-medium uppercase text-ink-400">{t.yearLabel}</span>
                      <span className="text-[12.5px] font-medium text-ink-900">{selectedYear}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-medium uppercase text-ink-400">{t.termLabel}</span>
                      <span className="text-[12.5px] font-medium text-ink-900">{selectedTerm}</span>
                    </div>
                  </div>

                  {/* Fees */}
                  {circularData?.feeLines && circularData.feeLines.length > 0 && (
                    <div className="mt-5">
                      <p className="text-[11.5px] font-medium uppercase tracking-wide text-sky-700">{t.feesTitle}</p>
                      <div className="mt-2 divide-y divide-ink-100 rounded-xl border border-ink-100">
                        {circularData.feeLines.map((f) => (
                          <div key={f.id} className="flex items-center justify-between px-3.5 py-2.5 text-[12.5px]">
                            <span className="text-ink-700">{f.name}</span>
                            <span className="font-medium text-ink-900">{RWF(f.amount)}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between bg-ink-50 px-3.5 py-2.5 text-[12.5px]">
                          <span className="font-medium text-ink-900">{t.total}</span>
                          <span className="font-medium text-sky-700">{RWF(feesTotal)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  {circularData?.requirementLines && circularData.requirementLines.length > 0 && (
                    <div className="mt-5">
                      <p className="text-[11.5px] font-medium uppercase tracking-wide text-teal-700">{t.itemsTitle}</p>
                      <div className="mt-2 divide-y divide-ink-100 rounded-xl border border-ink-100">
                        {circularData.requirementLines.map((it) => (
                          <div key={it.id} className="flex items-center justify-between px-3.5 py-2.5 text-[12.5px]">
                            <span className="text-ink-700">{it.name}</span>
                            <span className="font-medium text-ink-900">{it.amount > 0 ? RWF(it.amount) : 'Included'}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between bg-ink-50 px-3.5 py-2.5 text-[12.5px]">
                          <span className="font-medium text-ink-900">{t.total}</span>
                          <span className="font-medium text-teal-700">{RWF(itemsTotal)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bank details */}
                  {circularData?.bankName && (
                    <div className="mt-5 rounded-xl bg-amber-50 p-3.5">
                      <p className="text-[11.5px] font-medium uppercase tracking-wide text-amber-700">{t.bankTitle}</p>
                      <div className="mt-2 grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-3">
                        <div>
                          <span className="block text-[10px] font-medium text-amber-700/70">{t.bankName}</span>
                          <span className="font-medium text-ink-900">{circularData.bankName}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-medium text-amber-700/70">{t.bankAcct}</span>
                          <span className="font-medium text-ink-900">{circularData.bankAccount}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-medium text-amber-700/70">{t.bankAcctName}</span>
                          <span className="font-medium text-ink-900">{circularData.bankAccountName}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Grand total */}
                  <div className="mt-5 flex items-center justify-between rounded-xl bg-ink-900 px-4 py-3.5">
                    <span className="text-[13px] font-medium text-white">{t.grandTotal}</span>
                    <span className="text-[16px] font-medium text-amber-300">{RWF(grandTotal)}</span>
                  </div>
                </div>
              </div>

              <button type="button" onClick={openPrintView}
                className={cn(
                  'mt-5 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-[13.5px] font-medium shadow-md transition-all',
                  downloaded ? 'bg-teal-500 text-white' : 'bg-amber-500 text-[#402A00] hover:bg-amber-400 hover:-translate-y-0.5 hover:shadow-lg',
                )}>
                {downloaded ? <CheckIcon className="h-4 w-4" /> : (
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                  </svg>
                )}
                {downloaded ? t.downloaded : t.downloadBtn}
              </button>
              <p className="mt-2 text-center text-[11px] font-medium text-ink-400">
                {(lang === 'rw' ? 'PDF izasohoka mu Kinyarwanda' : lang === 'fr' ? 'Le PDF sera généré en français' : 'PDF will be generated in English')}
              </p>
            </div>
          )}
      </FlowModalBody>

      <FlowModalFooter
        hideFooter={step === 4}
        hideBack={step === 1}
        onBack={goBack}
        backLabel={t.back}
        onNext={step === 4 ? undefined : goNext}
        nextLabel={nextLabel()}
        nextDisabled={!canNext()}
        loading={lookupLoading || circularLoading}
        nextIcon={lookupLoading || circularLoading ? <Spinner className="h-4 w-4" /> : undefined}
      />
    </FlowModalPortal>
  );
}
