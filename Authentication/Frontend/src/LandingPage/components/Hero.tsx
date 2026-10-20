'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Loader2,
  Send,
} from 'lucide-react';
import { PaymentWizardModal } from './ui/PaymentWizardModal';
import { StudentLookupModal } from './ui/StudentLookupModal';
import { SchoolFeesPay } from './SchoolFeesPay';
import { RequirementsPay } from './RequirementsPay';
import {
  lookupStudentByCode,
  studentWizardContext,
  type LookupStudent,
} from '../services/portal-api';
import { useFeeReminderPayDeepLink } from '../hooks/useFeeReminderPayDeepLink';
import { useStudentProfileDeepLink } from '../hooks/useStudentProfileDeepLink';
import { useAppLanguage } from '@/i18n/app-language';

const PARENT_PORTAL_URL =
  process.env.NEXT_PUBLIC_PARENT_PORTAL_URL?.trim() ||
  (process.env.NODE_ENV === 'production'
    ? 'https://parents.shuleplus.rw/login'
    : 'http://localhost:3049/login');

const TEACHER_PORTAL_URL =
  process.env.NEXT_PUBLIC_TEACHER_PORTAL_URL?.trim() ||
  (process.env.NODE_ENV === 'production'
    ? 'https://ticha.shuleplus.rw/login'
    : 'http://localhost:5173/login');

const ORANGE = '#FCB038';

/** Subtle tiled texture — sits above the photo/scrim, below the content. */
function BgPattern({
  opacity = 0.16,
  blend = 'soft-light',
}: {
  opacity?: number;
  blend?: 'soft-light' | 'multiply' | 'normal';
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1]"
      style={{
        backgroundImage: 'url(/my_bg_amber.jpeg)',
        backgroundRepeat: 'repeat',
        backgroundSize: '420px auto',
        opacity,
        mixBlendMode: blend,
      }}
      aria-hidden
    />
  );
}

function HeroPeoplePhoto({ variant }: { variant: 'desktop' | 'mobile' }) {
  const src =
    variant === 'desktop'
      ? '/bg-logo-left.png'
      : '/bg-logo-right.png';

  if (variant === 'desktop') {
    return (
      <div className="pointer-events-none absolute top-10 right-0 bottom-0 z-[2] w-[min(50%,520px)] overflow-hidden xl:w-[min(40%,640px)] 2xl:w-[min(37%,700px)]">
        <Image
          src={src}
          alt=""
          fill
          priority
          sizes="(min-width: 1510px) 38vw, 45vw"
          className="object-contain object-right-bottom"
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute -top-4 bottom-0 left-0 z-[2] w-[min(76%,760px)] overflow-hidden sm:w-[min(90%,760px)]">
      <Image
        src={src}
        alt=""
        fill
        priority
        sizes="(min-width: 640px) 76vw, 82vw"
        className="object-contain object-left-bottom"
      />
    </div>
  );
}

function HeroStudentLookup({
  onOrange = false,
  compact = false,
  hideLabel = false,
}: {
  onOrange?: boolean;
  compact?: boolean;
  hideLabel?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<LookupStudent | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wizard, setWizard] = useState<'fees' | 'requirements' | null>(null);

  async function lookupAndOptionallyPay(code: string, openFees: boolean) {
    setQuery(code);
    setLoading(true);
    setError(null);
    setProfileOpen(false);
    try {
      const data = await lookupStudentByCode(code.trim());
      setStudent(data);
      if (openFees) {
        setWizard('fees');
        setProfileOpen(false);
      } else {
        setProfileOpen(true);
      }
    } catch (err) {
      setStudent(null);
      const raw = err instanceof Error ? err.message : 'Lookup failed';
      if (/failed to fetch|networkerror|load failed/i.test(raw)) {
        setError(
          'Cannot reach Student Management API. Check that Student Management is deployed and NEXT_PUBLIC_STUDENT_MANAGEMENT_API_URL points at the production API (CORS must allow this site).'
        );
      } else {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  }

  useFeeReminderPayDeepLink((code) => lookupAndOptionallyPay(code, true));
  useStudentProfileDeepLink((code) => lookupAndOptionallyPay(code, false));

  async function handleSearch(e?: FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    await lookupAndOptionallyPay(query.trim(), false);
  }

  function closeProfile() {
    setProfileOpen(false);
  }

  function openPay(kind: 'fees' | 'requirements') {
    setProfileOpen(false);
    setWizard(kind);
  }

  function closeWizard() {
    setWizard(null);
    if (student) setProfileOpen(true);
  }

  const { t } = useAppLanguage();
  const ctx = student ? studentWizardContext(student) : null;
  const canSearch = Boolean(query.trim()) && !loading;

  const iconBox = compact
    ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#000435]'
    : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#000435] sm:h-11 sm:w-11';
  const inputCls = compact
    ? 'h-9 min-w-0 flex-1 bg-transparent px-1.5 text-center text-[13px] font-medium text-[#000435] outline-none placeholder:text-[#000435]/40'
    : 'h-10 min-w-0 flex-1 bg-transparent px-1 text-sm font-medium text-[#000435] outline-none placeholder:text-[#000435]/40 sm:h-11 sm:px-2 sm:text-[15px]';
  const sendBtn = compact
    ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FCB038] text-[#000435] shadow-[0_4px_14px_-4px_rgba(252,176,56,0.7)] transition-colors hover:bg-[#ffb84d] disabled:cursor-not-allowed disabled:opacity-45'
    : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FCB038] text-[#000435] transition-colors hover:bg-[#ffb84d] disabled:cursor-not-allowed disabled:opacity-45 sm:h-11 sm:w-11';
  const shell = compact
    ? `flex items-center gap-2 rounded-full border border-[#000435]/12 bg-white p-1.5 shadow-[0_10px_28px_-10px_rgba(0,4,53,0.32),0_4px_12px_-4px_rgba(0,4,53,0.14)] ${
        onOrange ? 'border-white/40' : ''
      }`
    : `flex items-center gap-2 rounded-[1.35rem] border bg-white p-1.5 shadow-[0_8px_24px_-12px_rgba(0,4,53,0.22)] sm:gap-2.5 sm:rounded-full sm:p-2 ${
        onOrange ? 'border-white/40' : 'border-[#000435]/10'
      }`;

  return (
    <div className={`w-full ${compact ? 'max-w-none' : 'max-w-xl'}`}>
      {!hideLabel ? (
        <div
          className={`mb-2.5 flex items-center gap-2 ${
            compact ? 'justify-center' : ''
          }`}
        >
          <span className="flex items-center gap-1" aria-hidden>
            <span className={`h-1.5 w-1.5 rounded-full ${onOrange ? 'bg-white' : 'bg-[#000435]'}`} />
            <span className={`h-1.5 w-1.5 rounded-full ${onOrange ? 'bg-white/70' : 'bg-[#000435]/70'}`} />
            <span className={`h-1.5 w-1.5 rounded-full ${onOrange ? 'bg-white/45' : 'bg-[#000435]/45'}`} />
          </span>
          <p
            className={`text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[11px] ${
              onOrange ? 'text-white' : 'text-[#000435]'
            }`}
          >
            {t.studentCodeLabel}
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSearch}>
        <div className={shell}>
          <span className={iconBox}>
            <svg
              width={compact ? 17 : 20}
              height={compact ? 17 : 20}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="text-[#FCB038]"
            >
              <rect x="5" y="7" width="14" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="9.5" cy="12.5" r="1.3" fill="currentColor" />
              <circle cx="14.5" cy="12.5" r="1.3" fill="currentColor" />
              <path d="M9 16.2c.8.7 1.7 1 3 1s2.2-.3 3-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M9 7V5.5M15 7V5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="9" cy="4.5" r="1" fill="currentColor" />
              <circle cx="15" cy="4.5" r="1" fill="currentColor" />
            </svg>
          </span>

          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
            placeholder={t.studentCodePlaceholder}
            className={inputCls}
            autoComplete="off"
            spellCheck={false}
            aria-label={t.studentCodeLabel}
          />

          <button type="submit" disabled={!canSearch} aria-label={t.lookupStudent} className={sendBtn}>
            {loading ? (
              <Loader2 className={compact ? 'h-4 w-4 animate-spin' : 'h-4 w-4 animate-spin'} />
            ) : (
              <Send className={`${compact ? 'h-4 w-4' : 'h-4 w-4'} -translate-x-px translate-y-px`} />
            )}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {error && !loading ? (
          <motion.p
            key="err"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`mt-2.5 text-xs font-medium ${compact ? 'text-center' : ''} ${
              onOrange ? 'text-white' : 'text-rose-700'
            }`}
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {student && !profileOpen && !wizard ? (
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className={`mt-2.5 inline-flex w-full items-center gap-3 rounded-2xl border border-[#000435]/12 bg-white px-4 py-3 ${
            compact ? 'justify-center text-center' : 'justify-between text-left'
          }`}
        >
          <span>
            <span className="block text-sm font-semibold text-[#000435]">{student.fullName}</span>
            <span className="text-[11px] text-[#000435]/55">
              {student.studentUid} · {t.tapToReopen}
            </span>
          </span>
          {!compact ? <span className="text-xs font-semibold text-[#000435]">{t.view}</span> : null}
        </button>
      ) : null}

      <StudentLookupModal
        student={student}
        open={profileOpen && !wizard}
        onClose={closeProfile}
        onPayFees={() => openPay('fees')}
        onPayRequirements={() => openPay('requirements')}
      />

      {ctx ? (
        <>
          <PaymentWizardModal open={wizard === 'fees'} onClose={closeWizard} title={t.paySchoolFees}>
            <SchoolFeesPay key={`fees-${student?.id}`} student={ctx} onClose={closeWizard} />
          </PaymentWizardModal>
          <PaymentWizardModal
            open={wizard === 'requirements'}
            onClose={closeWizard}
            title={t.payRequirements}
          >
            <RequirementsPay key={`req-${student?.id}`} student={ctx} onClose={closeWizard} />
          </PaymentWizardModal>
        </>
      ) : null}
    </div>
  );
}

function HeroHeadline({
  className = '',
}: {
  className?: string;
}) {
  const { t } = useAppLanguage();
  return (
    <h1 className={`font-display font-bold tracking-tight text-white ${className}`}>
      <span className="block">{t.heroLine1}</span>
      <span className="block">{t.heroLine2}</span>
      <span className="block">{t.heroLine3}</span>
    </h1>
  );
}

function HeroEntryButtons({ compact = false }: { compact?: boolean }) {
  const { t } = useAppLanguage();
  if (compact) {
    const compactBtn =
      'inline-flex items-center justify-center rounded-xl bg-[#000435] px-3 py-3.5 text-[13px] font-semibold text-white transition-transform active:scale-[0.97] sm:py-4';
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <div className="grid w-full grid-cols-2 gap-3">
          <Link href="/enter-as-school" className={compactBtn}>
            {t.enterAsSchool}
          </Link>
          <a href={PARENT_PORTAL_URL} className={compactBtn}>
            {t.enterAsParent}
          </a>
        </div>
        <a href={TEACHER_PORTAL_URL} className={`${compactBtn} w-full`}>
          {t.enterAsTeacher}
        </a>
      </div>
    );
  }

  const desktopBtn =
    'inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-sm bg-[#000435] font-semibold text-white transition-all hover:bg-[#0a0f52] active:scale-[0.98] lg:min-h-[52px]';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/enter-as-school"
        className={`${desktopBtn} px-5 py-3.5 text-sm sm:px-6 sm:py-4 lg:px-8 lg:py-4 lg:text-[15px]`}
      >
        {t.enterAsSchool}
      </Link>
      <a
        href={PARENT_PORTAL_URL}
        className={`${desktopBtn} px-6 py-3.5 text-sm sm:px-7 sm:py-4 lg:px-8 lg:py-4 lg:text-[15px]`}
      >
        {t.enterAsParent}
      </a>
      <a
        href={TEACHER_PORTAL_URL}
        className={`${desktopBtn} px-6 py-3.5 text-sm sm:px-7 sm:py-4 lg:px-8 lg:py-4 lg:text-[15px]`}
      >
        {t.enterAsTeacher}
      </a>
    </div>
  );
}

export function Hero() {
  useEffect(() => {
    if (window.location.hash !== '#student-lookup') return;
    const t = window.setTimeout(() => {
      const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-student-lookup]'));
      const visible =
        targets.find((el) => {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          return el.getClientRects().length > 0;
        }) ?? targets[0];
      visible?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      visible?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    }, 80);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <section className="relative isolate w-full max-w-[100vw] overflow-hidden bg-white">
      {/* Mobile / tablet — fills viewport so About Us stays below the fold */}
      <div className="lg:hidden flex min-h-[calc(100dvh-60px)] flex-col sm:min-h-[calc(100dvh-72px)]">
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-[#FCB038]">
          <BgPattern opacity={1} blend="normal" />
          <HeroPeoplePhoto variant="mobile" />

          {/* Copy + buttons — centered in the hero */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 flex w-full flex-col items-center px-5 py-6 text-center sm:px-7"
          >
            <HeroHeadline className="text-[1.5rem] leading-[1.16] sm:text-[1.9rem]" />

            <div className="mt-3.5 w-full sm:mt-4">
              <HeroEntryButtons compact />
            </div>
          </motion.div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 leading-[0]" aria-hidden>
            <svg viewBox="0 0 1440 72" preserveAspectRatio="none" className="block h-9 w-full sm:h-14">
              <path
                d="M0,72 L0,30 C280,8 560,2 840,14 C1120,26 1280,40 1440,28 L1440,72 Z"
                fill="#ffffff"
              />
            </svg>
          </div>
        </div>

        <div className="relative z-20 -mt-4 shrink-0 bg-white px-4 pb-6 pt-0 sm:-mt-5 sm:px-6 sm:pb-8">
          <div
            data-student-lookup
            className="scroll-mt-28 rounded-2xl bg-white p-4 shadow-[0_20px_50px_-16px_rgba(0,4,53,0.35),0_8px_20px_-8px_rgba(0,4,53,0.15)] ring-1 ring-[#000435]/[0.07] sm:p-5"
          >
            <HeroStudentLookup compact />
          </div>
        </div>
      </div>

      {/* —— Desktop: amber panel + photo, copy left —— */}
      <div className="relative hidden min-h-[calc(100dvh-8px)] w-full overflow-hidden bg-[#FCB038] lg:block">
        <BgPattern opacity={1} blend="normal" />
        <HeroPeoplePhoto variant="desktop" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-8px)] w-full max-w-[1400px] flex-col justify-center px-6 pt-14 pb-48 sm:px-8 lg:pt-16 lg:pb-52 xl:px-10 xl:pb-56 2xl:px-12 2xl:pb-60">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-[42rem]"
          >
            <HeroHeadline className="text-left text-3xl lg:text-4xl xl:text-5xl 2xl:text-[3rem]" />

            <div className="mt-6 lg:mt-7">
              <HeroEntryButtons />
            </div>

            <div data-student-lookup className="mt-5 max-w-2xl scroll-mt-28 lg:mt-6">
              <HeroStudentLookup onOrange />
            </div>
          </motion.div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 leading-[0]" aria-hidden>
          <svg
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="block h-[120px] w-full xl:h-[130px] 2xl:h-[132px]"
          >
            <path
              d="M0,120 L0,68 C200,18 420,8 720,28 C1020,48 1240,96 1440,62 L1440,120 Z"
              fill="#ffffff"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}