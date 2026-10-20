'use client';

import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  QrCode,
  RotateCcw,
  ShieldCheck,
  Loader2,
  UserRound,
  GraduationCap,
  Users,
  Smile,
} from 'lucide-react';
import { Container, Reveal } from './ui/Primitives';
import { Counter } from './ui/Counter';
import { LookupFlowGraphic } from './LookupFlowGraphic';
import { PaymentWizardModal } from './ui/PaymentWizardModal';
import { StudentLookupModal } from './ui/StudentLookupModal';
import { SchoolFeesPay } from './SchoolFeesPay';
import { RequirementsPay } from './RequirementsPay';
import {
  lookupStudentByCode,
  studentWizardContext,
  type LookupStudent,
} from '../services/portal-api';
import { useStudentProfileDeepLink } from '../hooks/useStudentProfileDeepLink';

const stats = [
  {
    value: 300,
    suffix: '+',
    label: 'Schools',
    icon: GraduationCap,
    iconWrap: 'bg-[#2355FF]/12 text-[#2355FF]',
  },
  {
    value: 50000,
    suffix: '+',
    label: 'Students',
    icon: Users,
    iconWrap: 'bg-amber-500/15 text-amber-600',
  },
  {
    value: 12000,
    suffix: '+',
    label: 'Parents',
    icon: UserRound,
    iconWrap: 'bg-amber-500/15 text-amber-600',
  },
  {
    value: 98,
    suffix: '%',
    label: 'Satisfaction',
    icon: Smile,
    iconWrap: 'bg-[#20D6C7]/15 text-[#0D9B90]',
  },
];

function LookupForm() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<LookupStudent | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wizard, setWizard] = useState<'fees' | 'requirements' | null>(null);

  async function reopenProfile(code: string) {
    setQuery(code);
    setLoading(true);
    setError(null);
    setProfileOpen(false);
    try {
      const data = await lookupStudentByCode(code.trim());
      setStudent(data);
      setProfileOpen(true);
    } catch (err) {
      setStudent(null);
      const raw = err instanceof Error ? err.message : 'Lookup failed';
      setError(raw);
    } finally {
      setLoading(false);
    }
  }

  useStudentProfileDeepLink(reopenProfile);

  async function handleSearch(e?: FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setProfileOpen(false);
    try {
      const data = await lookupStudentByCode(query.trim());
      setStudent(data);
      setProfileOpen(true);
    } catch (err) {
      setStudent(null);
      const raw = err instanceof Error ? err.message : 'Lookup failed';
      if (/failed to fetch|networkerror|load failed/i.test(raw)) {
        setError(
          'Cannot reach Student Management API. Ensure it is running on port 3052 and NEXT_PUBLIC_STUDENT_MANAGEMENT_API_URL is set (CORS must allow this site).'
        );
      } else {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setQuery('');
    setStudent(null);
    setProfileOpen(false);
    setError(null);
    setWizard(null);
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

  const ctx = student ? studentWizardContext(student) : null;
  const canSearch = Boolean(query.trim()) && !loading;

  return (
    <div className="h-full rounded-[24px] border border-navy-900/[0.06] bg-white p-5 shadow-[0_10px_36px_-14px_rgba(0,4,53,0.14)] sm:p-7">
      <h3 className="font-display text-xl font-bold text-navy-900 sm:text-2xl">Student Lookup</h3>
      <p className="mt-1 text-sm text-navy-700/55">Enter ShuleCode or SDMS Code to get started</p>

      <form onSubmit={handleSearch} className="mt-6 space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-[#8640AA]/25 bg-white px-4 py-3.5 focus-within:border-[#2355FF]/50 focus-within:ring-4 focus-within:ring-[#2355FF]/10">
            <Search className="h-4 w-4 shrink-0 text-navy-700/35" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setError(null);
              }}
              placeholder="Enter ShuleCode or SDMS Code"
              className="min-w-0 flex-1 bg-transparent text-sm text-navy-900 outline-none placeholder:text-navy-700/35"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <button
            type="submit"
            disabled={!canSearch}
            className="inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#000435] px-6 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(0,4,53,0.55)] transition hover:bg-navy-800 hover:shadow-[0_12px_28px_-12px_rgba(252,176,56,0.35)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none sm:min-w-[148px]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#FCB038]" />
            ) : (
              <Search className="h-4 w-4 text-[#FCB038]" />
            )}
            {loading ? 'Looking up…' : 'Lookup'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-navy-900/12 bg-white px-4 text-sm font-semibold text-navy-900 transition hover:bg-navy-900/[0.03]"
            title="QR scanner coming soon"
          >
            <QrCode className="h-4 w-4" />
            Scan QR Code
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-navy-900/12 bg-white px-4 text-sm font-semibold text-navy-900 transition hover:bg-navy-900/[0.03]"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
      </form>

      <p className="mt-5 flex items-start gap-2 text-[12.5px] text-navy-700/50">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-navy-700/40" />
        Look up any enrolled student with their exact ShuleCode or SDMS code — no login required to
        pay.
      </p>

      <AnimatePresence>
        {error && !loading ? (
          <motion.p
            key="err"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-sm text-rose-accent"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {student && !profileOpen && !wizard ? (
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="mt-4 inline-flex w-full items-center justify-between gap-3 rounded-2xl border border-navy-900/[0.07] bg-[#F8F9FA] px-4 py-3 text-left transition hover:border-navy-900/15"
        >
          <span>
            <span className="block text-sm font-semibold text-navy-900">{student.fullName}</span>
            <span className="text-[12px] text-navy-700/55">
              {student.studentUid} · Tap to reopen profile
            </span>
          </span>
          <span className="text-xs font-semibold text-[#2355FF]">View</span>
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
          <PaymentWizardModal
            open={wizard === 'fees'}
            onClose={closeWizard}
            title="Pay school fees"
          >
            <SchoolFeesPay key={`fees-${student?.id}`} student={ctx} onClose={closeWizard} />
          </PaymentWizardModal>
          <PaymentWizardModal
            open={wizard === 'requirements'}
            onClose={closeWizard}
            title="Pay student requirements"
          >
            <RequirementsPay key={`req-${student?.id}`} student={ctx} onClose={closeWizard} />
          </PaymentWizardModal>
        </>
      ) : null}
    </div>
  );
}

/** Separate band from Hero — curved divider + pale grey + lookup + SVG graphic */
export function LookupSection() {
  return (
    <section id="lookup" className="relative bg-[#F1F3F7]">
      <div className="pointer-events-none absolute inset-x-0 -top-px leading-[0]" aria-hidden>
        <svg
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          className="block h-12 w-full sm:h-16 lg:h-20"
        >
          <path
            d="M0,80 L0,48 C240,8 480,0 720,12 C960,24 1200,56 1440,40 L1440,80 Z"
            fill="#F1F3F7"
          />
        </svg>
      </div>

      <Container className="relative max-w-[1280px] pb-20 pt-16 sm:pb-24 sm:pt-20 lg:pt-24">
        <Reveal>
          <div className="mb-8 sm:mb-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-600">
              Instant access
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
              Find any student in seconds
            </h2>
          </div>
        </Reveal>

        <Reveal index={1}>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="flex items-center gap-3.5 rounded-2xl border border-white bg-white px-4 py-3.5 shadow-[0_6px_20px_-10px_rgba(0,4,53,0.12)]"
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${s.iconWrap}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div>
                    <p className="font-display text-xl font-extrabold text-navy-900 sm:text-2xl">
                      <Counter value={s.value} suffix={s.suffix} />
                    </p>
                    <p className="text-sm text-navy-700/55">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>

        <Reveal index={2}>
          <div className="grid items-stretch gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
            <LookupForm />
            <div className="relative flex items-center justify-center overflow-hidden rounded-[24px] border border-white/80 bg-white/70 px-3 py-8 shadow-[0_10px_36px_-14px_rgba(0,4,53,0.1)] backdrop-blur-sm sm:px-5 sm:py-10">
              <LookupFlowGraphic />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
