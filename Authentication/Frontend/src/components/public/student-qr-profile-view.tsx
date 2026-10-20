'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
  BadgeCheck,
  Building2,
  ChevronRight,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  QrCode,
  ScrollText,
  UserRound,
  Users,
  Wallet2,
} from 'lucide-react';
import {
  lookupStudentByCode,
  type LookupStudent,
} from '@/LandingPage/services/portal-api';
import { PayFeesModal } from '@/components/school-flows/pay-fees-modal';
import { GetBabyeyiModal } from '@/components/school-flows/get-babyeyi-modal';
import {
  RequestLoanModal,
  type HandoffStudent,
} from '@/components/school-flows/request-loan-modal';
import { LanguageProvider } from '@/components/school-flows/language-provider';
import { lookupToHandoffStudent, lookupToSchool } from '@/components/school-flows/helpers';
import { cn } from '@/lib/utils';

type TabId = 'profile' | 'school' | 'academic' | 'guardians';

const TABS: { id: TabId; label: string; icon: typeof UserRound }[] = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'school', label: 'School', icon: Building2 },
  { id: 'academic', label: 'Academic', icon: GraduationCap },
  { id: 'guardians', label: 'Guardians', icon: Users },
];

function statusTone(status: string) {
  const s = status.toUpperCase();
  if (s === 'ACTIVE') return 'bg-emerald-accent/15 text-[#0D9B90]';
  if (s === 'GRADUATED') return 'bg-[#2355FF]/12 text-[#2355FF]';
  if (s === 'TRANSFERRED') return 'bg-amber-500/15 text-amber-700';
  return 'bg-navy-900/8 text-navy-700/70';
}

function formatGender(gender?: string | null) {
  if (!gender) return '—';
  const g = gender.toUpperCase();
  if (g === 'M' || g === 'MALE') return 'Male';
  if (g === 'F' || g === 'FEMALE') return 'Female';
  return gender;
}

function QuickActionButton({
  onClick,
  icon,
  title,
  subtitle,
  variant,
}: {
  onClick: () => void;
  icon: ReactNode;
  title: string;
  subtitle: string;
  variant: 'fees' | 'babyeyi';
}) {
  const isFees = variant === 'fees';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition active:scale-[0.99]',
        isFees
          ? 'border-[#000435]/10 bg-gradient-to-br from-white via-white to-[#FCB038]/[0.07] shadow-[0_8px_24px_-18px_rgba(0,4,53,0.2)] hover:border-[#FCB038]/35 hover:shadow-[0_16px_32px_-16px_rgba(252,176,56,0.35)]'
          : 'border-sky-200/70 bg-gradient-to-br from-white via-white to-sky-50/90 shadow-[0_8px_24px_-18px_rgba(14,165,233,0.15)] hover:border-sky-300 hover:shadow-[0_16px_32px_-16px_rgba(14,165,233,0.22)]',
      )}
    >
      <span
        className={cn(
          'grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 transition',
          isFees
            ? 'bg-[#FCB038]/15 text-[#b87a00] ring-[#FCB038]/25 group-hover:bg-[#FCB038]/22'
            : 'bg-sky-100 text-sky-700 ring-sky-200/70 group-hover:bg-sky-200/90',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold leading-tight text-navy">{title}</span>
        <span className="mt-0.5 block text-[11.5px] leading-snug text-navy/50">{subtitle}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-navy/30 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-xl border border-navy-900/[0.05] bg-[#F8F9FA] px-3.5 py-2.5">
      <dt className="text-navy-700/50">{label}</dt>
      <dd className="text-right font-semibold text-navy-900">{value}</dd>
    </div>
  );
}

function ProfileTab({ student }: { student: LookupStudent }) {
  return (
    <dl className="grid gap-2.5 text-[12.5px] sm:grid-cols-2">
      <InfoRow label="First name" value={student.firstName} />
      <InfoRow label="Last name" value={student.lastName} />
      <InfoRow label="Gender" value={formatGender(student.gender)} />
      <InfoRow label="Status" value={student.status} />
      <InfoRow label="ShuleCode" value={student.shuleCode ?? student.studentUid} />
      <InfoRow label="SDMS Code" value={student.sdmCode || '—'} />
      <InfoRow label="Registration No." value={student.registrationNumber || '—'} />
      <InfoRow label="Student ID" value={student.studentCode || student.studentUid} />
    </dl>
  );
}

function SchoolTab({ student }: { student: LookupStudent }) {
  const location = [student.sector, student.district, student.province].filter(Boolean).join(', ');
  return (
    <div className="space-y-4">
      <dl className="grid gap-2.5 text-[12.5px] sm:grid-cols-2">
        <InfoRow label="School" value={student.schoolName} />
        <InfoRow label="School code" value={student.schoolCode || student.organizationCode || '—'} />
        <InfoRow label="Province" value={student.province || '—'} />
        <InfoRow label="District" value={student.district || '—'} />
        <InfoRow label="Sector" value={student.sector || '—'} />
      </dl>
      {location ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-navy-900/[0.06] bg-[#F8F9FA] px-4 py-3.5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-navy-700/45">Location</p>
            <p className="mt-1 text-[13px] font-medium text-navy-900">{location}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AcademicTab({ student }: { student: LookupStudent }) {
  return (
    <dl className="grid gap-2.5 text-[12.5px] sm:grid-cols-2">
      <InfoRow label="Current class" value={student.className || '—'} />
      <InfoRow label="Class label" value={student.classLabel || '—'} />
      <InfoRow label="Education level" value={student.educationLevel || '—'} />
      <InfoRow label="Academic year" value={student.academicYear || '—'} />
      <InfoRow label="Term" value={student.term || '—'} />
    </dl>
  );
}

function GuardiansTab({ student }: { student: LookupStudent }) {
  if (student.parents.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-navy-900/10 bg-[#F8F9FA] px-4 py-10 text-center">
        <Users className="mx-auto h-8 w-8 text-navy-700/25" />
        <p className="mt-3 text-sm font-medium text-navy-700/60">No guardian records on file</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {student.parents.map((parent) => (
        <li
          key={`${parent.role}-${parent.name}`}
          className="rounded-2xl border border-navy-900/[0.06] bg-[#F8F9FA] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-navy-900">{parent.name}</p>
              <p className="mt-0.5 text-[12px] text-navy-700/50">{parent.role}</p>
            </div>
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">
              {parent.role}
            </span>
          </div>
          <div className="mt-3 space-y-1.5">
            {parent.phone ? (
              <p className="flex items-center gap-2 text-[13px] text-navy-700/70">
                <Phone className="h-3.5 w-3.5 text-primary" />
                {parent.phone}
              </p>
            ) : null}
            {parent.email ? (
              <p className="flex items-center gap-2 text-[13px] text-navy-700/70">
                <Mail className="h-3.5 w-3.5 text-primary" />
                {parent.email}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function StudentQrProfileView() {
  const params = useParams();
  const studentId = decodeURIComponent(String(params.studentId ?? '')).trim();

  const [student, setStudent] = useState<LookupStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('profile');
  const [feesOpen, setFeesOpen] = useState(false);
  const [babyeyiOpen, setBabyeyiOpen] = useState(false);
  const [loanStudent, setLoanStudent] = useState<HandoffStudent | null>(null);

  useEffect(() => {
    if (!studentId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);
    setStudent(null);

    lookupStudentByCode(studentId)
      .then((data) => {
        if (!cancelled) setStudent(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Could not load student profile';
        if (/not found|404/i.test(message)) {
          setNotFound(true);
        } else {
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return (
    <div className="auth-bg flex min-h-screen flex-col">
      <header className="flex shrink-0 items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="inline-flex items-center">
          <Image
            src="/logo.png"
            alt="Shule+"
            width={160}
            height={48}
            style={{ width: 'auto', height: 'auto' }}
            className="h-10 w-auto object-contain sm:h-12"
            priority
          />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white/80 px-4 py-2 text-sm font-semibold text-navy shadow-soft backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-white"
        >
          Back to home
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-8 pt-2 sm:px-6 sm:pt-4">
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-navy/5 bg-white shadow-[0_28px_90px_-32px_rgba(0,4,53,0.28)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-navy/50">Loading student profile…</p>
            </div>
          ) : notFound ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy/5">
                <QrCode className="h-8 w-8 text-navy/30" />
              </div>
              <div>
                <h1 className="font-montserrat text-xl font-bold text-navy">Student not found</h1>
                <p className="mt-2 text-sm text-navy/50">
                  No record matches code <span className="font-semibold text-navy">{studentId}</span>.
                  Check the QR code or contact the school.
                </p>
              </div>
              <Link
                href="/"
                className="mt-2 rounded-2xl bg-navy px-6 py-3 text-sm font-semibold text-primary transition hover:bg-navy-light"
              >
                Go to Shule+ home
              </Link>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
              <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                {error}
              </div>
              <p className="text-sm text-navy/50">
                Ensure Student Management is running and try again.
              </p>
            </div>
          ) : student ? (
            <>
              <div className="relative overflow-hidden bg-gradient-to-br from-[#000435] via-[#12185a] to-[#1a2468] px-5 pb-6 pt-5 sm:px-6">
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full border-[28px] border-[#FCB038]/15"
                  aria-hidden
                />
                <div className="relative">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FCB038]">
                    Smart ID · Verified profile
                  </p>
                  <p className="mt-1 text-[12px] text-white/55">Scanned from QR code</p>
                </div>

                <div className="relative mt-5 flex items-start gap-4">
                  <div className="flex h-[80px] w-[80px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-2 ring-[#FCB038]/35 sm:h-[88px] sm:w-[88px]">
                    {student.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={student.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-10 w-10 text-[#FCB038]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                        {student.fullName}
                      </h1>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(student.status)}`}
                      >
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {student.status}
                      </span>
                    </div>
                    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/70">
                      <Building2 className="h-3.5 w-3.5 text-[#FCB038]" />
                      {student.schoolName}
                    </p>
                    {student.className ? (
                      <p className="mt-1 text-[12px] text-white/50">{student.className}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="border-b border-navy/5 px-4 pt-4 sm:px-6">
                <div
                  role="tablist"
                  aria-label="Student profile sections"
                  className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {TABS.map(({ id, label, icon: Icon }) => {
                    const active = tab === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setTab(id)}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold transition ${
                          active
                            ? 'bg-navy text-primary shadow-[0_8px_20px_-10px_rgba(0,4,53,0.5)]'
                            : 'text-navy/50 hover:bg-navy/5 hover:text-navy'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6 sm:py-6" role="tabpanel">
                {tab === 'profile' ? <ProfileTab student={student} /> : null}
                {tab === 'school' ? <SchoolTab student={student} /> : null}
                {tab === 'academic' ? <AcademicTab student={student} /> : null}
                {tab === 'guardians' ? <GuardiansTab student={student} /> : null}
              </div>

              <div className="border-t border-navy/5 bg-gradient-to-b from-[#FAFBFC] to-white px-5 py-5 sm:px-6">
                <p className="mb-3.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-navy-700/40">
                  Quick actions
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <QuickActionButton
                    variant="fees"
                    onClick={() => setFeesOpen(true)}
                    icon={<Wallet2 className="h-5 w-5" strokeWidth={2} />}
                    title="Pay school fees"
                    subtitle="Tuition, services & online payment"
                  />
                  <QuickActionButton
                    variant="babyeyi"
                    onClick={() => setBabyeyiOpen(true)}
                    icon={<ScrollText className="h-5 w-5" strokeWidth={2} />}
                    title="Get Babyeyi"
                    subtitle="Parent notice, fees & supplies PDF"
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>

      {student ? (
        <LanguageProvider>
          <PayFeesModal
            school={lookupToSchool(student)}
            open={feesOpen}
            onClose={() => setFeesOpen(false)}
            initialStudent={lookupToHandoffStudent(student)}
            onRequestLoan={(handoff) => {
              setLoanStudent({
                ...lookupToHandoffStudent(student),
                ...handoff,
                fullName: handoff.fullName ?? student.fullName,
                academicYear: handoff.academicYear ?? student.academicYear,
                term: handoff.term ?? student.term,
              });
              setFeesOpen(false);
            }}
          />
          {loanStudent ? (
            <RequestLoanModal
              school={lookupToSchool(student)}
              open={!!loanStudent}
              onClose={() => setLoanStudent(null)}
              initialStudent={loanStudent}
            />
          ) : null}
          <GetBabyeyiModal
            school={lookupToSchool(student)}
            open={babyeyiOpen}
            onClose={() => setBabyeyiOpen(false)}
            initialStudent={lookupToHandoffStudent(student)}
          />
        </LanguageProvider>
      ) : null}
    </div>
  );
}
