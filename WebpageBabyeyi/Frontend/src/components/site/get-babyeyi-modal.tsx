'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { School } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  assertStudentBelongsToSchool,
  normalizeStudentPhotoUrl,
  STUDENT_LOOKUP_NOT_FOUND,
} from '@/lib/flow-student';

const BABYEYI_API = process.env.NEXT_PUBLIC_BABYEYI_API_URL ?? 'http://localhost:3099/api';

interface GetBabyeyiModalProps {
  school: School;
  open: boolean;
  onClose: () => void;
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

export function GetBabyeyiModal({ school, open, onClose }: GetBabyeyiModalProps) {
  const [canPortal, setCanPortal] = useState(false);
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

  useEffect(() => setCanPortal(true), []);

  useEffect(() => {
    if (!open) { setMounted(false); return; }
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (open) {
      setStep(1); setLang(null); setStudentCode('');
      setStudentData(null); setLookupError(null);
      setCircularOptions([]); setSelectedYear(''); setSelectedTerm('');
      setCircularData(null); setCircularError(null);
      setDownloaded(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [open, onClose]);

  const t = TEXT[lang ?? 'en'];

  /* ─── Lookup student ─── */
  async function lookupStudent() {
    const code = studentCode.trim();
    if (code.length < 3) return;
    setLookupLoading(true);
    setLookupError(null);
    setStudentData(null);
    try {
      const res = await fetch(`${BABYEYI_API}/babyeyi/lookup?code=${encodeURIComponent(code)}&organizationId=${encodeURIComponent(school.id)}`);
      const ct = res.headers.get('content-type') ?? '';
      let json: any;
      if (!ct.includes('application/json')) {
        const text = await res.text();
        throw new Error(text || `Unexpected response (status ${res.status})`);
      }
      json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? STUDENT_LOOKUP_NOT_FOUND);
      assertStudentBelongsToSchool(json.data.student?.organizationId, school.id);
      const raw = json.data.student as StudentData;
      setStudentData({
        ...raw,
        photoUrl: normalizeStudentPhotoUrl(raw.photoUrl),
      });
      /* Use circular options returned by the backend */
      if (Array.isArray(json.data.circulars)) {
        setCircularOptions(json.data.circulars);
        if (json.data.circulars.length > 0) {
          // Prefer the centrally-configured current period (org admin → Settings,
          // the same year/term BabyeyiWizard uses); fall back to the first option.
          const currentYear = json.data.currentAcademicYear ?? json.data.circulars[0].academicYear;
          const yearOption = json.data.circulars.find((o: any) => o.academicYear === currentYear) ?? json.data.circulars[0];
          const terms = Array.isArray(yearOption.terms) ? yearOption.terms : [];
          const currentTerm = json.data.currentTerm ?? terms[0] ?? '';
          setSelectedYear(yearOption.academicYear);
          setSelectedTerm(terms.includes(currentTerm) ? currentTerm : (terms[0] ?? ''));
        }
      }
      setStep(3);
    } catch (err) {
        const raw = err instanceof Error ? err.message : 'Student not found';
        // strip possible HTML tags and show short summary
        const cleaned = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
        setLookupError(`${t.error}: ${cleaned}`);
    } finally {
      setLookupLoading(false);
    }
  }

  /* ─── Fetch circular ─── */
  async function fetchCircular() {
    if (!studentData || !selectedYear || !selectedTerm) return;
    setCircularLoading(true);
    setCircularError(null);
    try {
      // Ask the backend to fetch circular details for us (includes class filtering)
      const url = `${BABYEYI_API}/babyeyi/lookup?code=${encodeURIComponent(studentData.studentCode)}&organizationId=${encodeURIComponent(school.id)}&academicYear=${encodeURIComponent(selectedYear)}&term=${encodeURIComponent(selectedTerm)}&lang=${encodeURIComponent(lang ?? 'en')}`;
      const res = await fetch(url, { method: 'GET' });
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) {
        const text = await res.text();
        throw new Error(text || `Unexpected response (status ${res.status})`);
      }
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? 'No circular found');
      // backend returns circular in json.data.circular
      setCircularData(json.data.circular ?? null);
      setStep(4);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'No circular found for this period';
      const cleaned = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
      setCircularError(`${t.error}: ${cleaned}`);
    } finally {
      setCircularLoading(false);
    }
  }

  /* ─── Open the modern, localized print view (same as BabyeyiWizard) ─── */
  function openPrintView() {
    if (!studentData || !circularData?.id) return;
    const url =
      `${BABYEYI_API}/circulars/${encodeURIComponent(circularData.id)}/print` +
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

  if (!open || !canPortal) return null;

  const STEP_LABELS = [t.step1Title, t.step2Title, lang === 'rw' ? 'Babyeyi' : lang === 'fr' ? 'Votre Babyeyi' : 'Your Babyeyi'];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Get Babyeyi">
      <button type="button" aria-label="Close" onClick={onClose}
        className={cn('absolute inset-0 bg-ink-950/55 backdrop-blur-sm transition-opacity duration-200', mounted ? 'opacity-100' : 'opacity-0')} />

      <div className={cn(
        'relative z-[101] flex max-h-[92dvh] w-full max-w-[620px] flex-col overflow-hidden rounded-t-[26px] bg-white shadow-2xl transition-all duration-200 sm:max-h-[90vh] sm:rounded-[26px]',
        mounted ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.98] opacity-0 sm:translate-y-3 sm:scale-[0.97]',
      )}>
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-sky-600 via-sky-700 to-[#042f2e] px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-6">
          <span aria-hidden className="absolute -left-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <span aria-hidden className="absolute -bottom-16 -right-8 h-52 w-52 rounded-full bg-amber-400/20 blur-2xl" />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.05em] text-amber-200">
                Babyeyi
              </span>
              <h2 className="mt-1.5 text-[16px] font-medium leading-snug text-white sm:mt-2 sm:text-[19px]">{school.name}</h2>
              {studentData && (
                <p className="mt-0.5 text-[12px] text-white/60">{studentData.fullName} · {studentData.className}</p>
              )}
            </div>
            <button type="button" aria-label="Close" onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/30">
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Step dots */}
          <div className="relative z-10 mt-3 flex items-center gap-1 sm:mt-5 sm:gap-2">
            {STEP_LABELS.map((label, i) => {
              const n = (i + 1) as Step;
              const active = n === step;
              const done = n < step;
              return (
                <div key={label} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
                  <div className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-medium transition-colors sm:h-6 sm:w-6 sm:text-[10.5px]',
                    done ? 'bg-teal-400 text-[#042f2e]' : active ? 'bg-amber-400 text-[#402A00]' : 'bg-white/15 text-white/70',
                  )}>
                    {done ? <CheckIcon className="h-3 w-3" /> : n}
                  </div>
                  <span className={cn('hidden text-[11px] font-medium sm:inline', active ? 'text-white' : 'text-white/60')}>
                    {label}
                  </span>
                  {i < STEP_LABELS.length - 1 && <span className={cn('hidden h-[2px] min-w-[6px] flex-1 rounded-full sm:block', done ? 'bg-teal-400' : 'bg-white/15')} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6">
          {/* STEP 1  Language */}
          {step === 1 && (
            <div>
              <h3 className="text-[16px] font-medium text-ink-900">{t.step1Title}</h3>
              <p className="mt-1 text-[13px] text-ink-500">{t.step1Sub}</p>
              <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {LANGUAGES.map((l) => {
                  const selected = lang === l.code;
                  return (
                    <button key={l.code} type="button" onClick={() => setLang(l.code)}
                      className={cn('flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition-all',
                        selected ? 'border-sky-500 bg-sky-50 shadow-sm' : 'border-ink-200 bg-white hover:border-sky-200 hover:bg-sky-50/40')}>
                      <span className={cn('flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-medium',
                        selected ? 'bg-sky-600 text-white' : 'bg-ink-100 text-ink-600')}>
                        {l.code.toUpperCase()}
                      </span>
                      <span className="mt-1 text-[13.5px] font-medium text-ink-900">{l.native}</span>
                      <span className="text-[11px] text-ink-500">{l.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2  Student code */}
          {step === 2 && (
            <div>
              <h3 className="text-[16px] font-medium text-ink-900">{t.step2Title}</h3>
              <p className="mt-1 text-[13px] text-ink-500">{t.step2Sub}</p>
              <div className="mt-5 flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-ink-500">
                    {t.studentCodeLabel}
                  </label>
                  <input type="text" value={studentCode} onChange={(e) => setStudentCode(e.target.value)}
                    placeholder={t.studentCodePlaceholder}
                    onKeyDown={(e) => e.key === 'Enter' && canGenerate && lookupStudent()}
                    className="w-full rounded-xl border-[1.5px] border-ink-200 bg-white px-4 py-3 text-[14px] text-ink-900 outline-none transition-colors focus:border-sky-400 focus:bg-sky-50" />
                </div>
                {lookupError && (
                  <div className="rounded-xl border border-magenta-200 bg-magenta-50 px-4 py-3 text-[13px] font-medium text-magenta-700">
                    {lookupError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 Circular selection */}
          {step === 3 && studentData && (
            <div>
              <h3 className="text-[16px] font-medium text-ink-900">Select Period</h3>
              <p className="mt-1 text-[13px] text-ink-500">Choose the academic year and term for the Babyeyi notice.</p>

              {/* Student info card */}
              <div className="mt-4 rounded-2xl border border-ink-200 bg-ink-50 p-4">
                <div className="flex items-center gap-3">
                  <StudentPhoto
                    photoUrl={studentData.photoUrl}
                    firstName={studentData.firstName}
                    lastName={studentData.lastName}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-ink-900">{studentData.fullName}</p>
                    <p className="text-[12px] text-ink-500">{studentData.shuleCode} · {studentData.className}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
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

              {circularError && (
                <div className="mt-3 rounded-xl border border-magenta-200 bg-magenta-50 px-4 py-3 text-[13px] font-medium text-magenta-700">
                  {circularError}
                </div>
              )}
            </div>
          )}

          {/* STEP 4  Generated Babyeyi document */}
          {step === 4 && (
            <div>
              <div className="overflow-hidden rounded-2xl border border-ink-200 shadow-sm">
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
        </div>

        {/* Footer nav */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-ink-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4">
          {step > 1 ? (
            <button type="button" onClick={() => setStep((s) => (s - 1) as Step)}
              className="flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-medium text-ink-600 transition-colors hover:bg-ink-100 sm:w-auto sm:justify-start">
              <ChevronLeft className="h-4 w-4" /> {t.back}
            </button>
          ) : <span className="hidden sm:block" />}

          {step === 1 && (
            <button type="button" disabled={!canGoStep3} onClick={() => setStep(2)}
              className={cn('w-full rounded-full px-6 py-2.5 text-[13px] font-medium shadow-md transition-all sm:w-auto',
                canGoStep3 ? 'bg-sky-600 text-white hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-lg' : 'cursor-not-allowed bg-ink-100 text-ink-400')}>
              {t.continue}
            </button>
          )}
          {step === 2 && (
            <button type="button" disabled={!canGenerate || lookupLoading}
              onClick={() => void lookupStudent()}
              className={cn('flex w-full items-center justify-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-medium shadow-md transition-all sm:w-auto',
                canGenerate && !lookupLoading ? 'bg-sky-600 text-white hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-lg' : 'cursor-not-allowed bg-ink-100 text-ink-400')}>
              {lookupLoading && <Spinner className="h-4 w-4" />}
              {lookupLoading ? t.loading : t.continue}
            </button>
          )}
          {step === 3 && (
            <button type="button" disabled={!selectedYear || !selectedTerm || circularLoading}
              onClick={() => void fetchCircular()}
              className={cn('flex w-full items-center justify-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-medium shadow-md transition-all sm:w-auto',
                selectedYear && selectedTerm && !circularLoading ? 'bg-sky-600 text-white hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-lg' : 'cursor-not-allowed bg-ink-100 text-ink-400')}>
              {circularLoading && <Spinner className="h-4 w-4" />}
              {circularLoading ? t.loading : t.generate}
            </button>
          )}
          {step === 4 && (
            <button type="button" onClick={() => setStep(1)}
              className="rounded-full border border-ink-200 px-5 py-2.5 text-[13px] font-medium text-ink-600 transition-colors hover:bg-ink-100">
              {t.newRequest}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
