'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  UserRound,
  Building2,
  BadgeCheck,
  Phone,
  Mail,
  Wallet2,
  ShoppingBag,
  Globe,
  Loader2,
} from 'lucide-react';
import type { LookupStudent } from '../../services/portal-api';
import { fetchSchoolMiniWebsite, studentLookupCode } from '../../services/portal-api';

const RWF = new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 });

function statusTone(status: string) {
  const s = status.toUpperCase();
  if (s === 'ACTIVE') return 'bg-emerald-accent/15 text-[#0D9B90]';
  if (s === 'GRADUATED') return 'bg-[#2355FF]/12 text-[#2355FF]';
  if (s === 'TRANSFERRED') return 'bg-amber-500/15 text-amber-700';
  return 'bg-navy-900/8 text-navy-700/70';
}

export function StudentLookupModal({
  student,
  open,
  onClose,
  onPayFees,
  onPayRequirements,
}: {
  student: LookupStudent | null;
  open: boolean;
  onClose: () => void;
  onPayFees: () => void;
  onPayRequirements: () => void;
}) {
  const router = useRouter();
  const [websiteLoading, setWebsiteLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  async function handleOpenSchoolWebsite() {
    if (!student?.organizationId) return;
    setWebsiteLoading(true);
    try {
      const site = await fetchSchoolMiniWebsite(student.organizationId);
      if (site?.publicUrl) {
        window.open(site.publicUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      router.push(
        `/school-website/unavailable?school=${encodeURIComponent(student.schoolName)}&code=${encodeURIComponent(studentLookupCode(student))}`
      );
    } catch {
      router.push(
        `/school-website/unavailable?school=${encodeURIComponent(student.schoolName)}&code=${encodeURIComponent(studentLookupCode(student))}`
      );
    } finally {
      setWebsiteLoading(false);
    }
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && student ? (
        <motion.div
          className="fixed inset-0 z-[75] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close overlay"
            className="absolute inset-0 bg-navy-900/55 backdrop-blur-[3px]"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Student profile"
            initial={{ opacity: 0, y: 36, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="relative z-10 flex max-h-[min(94vh,880px)] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_28px_80px_-24px_rgba(0,4,53,0.5)] sm:rounded-[28px]"
          >
            {/* Header band */}
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#000435] via-[#12185a] to-[#1a2468] px-5 pb-6 pt-4 sm:px-6">
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full border-[28px] border-[#FCB038]/15"
                aria-hidden
              />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FCB038]">
                    Student profile
                  </p>
                  <p className="mt-1 text-[12px] text-white/55">Verified from Academic registry</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative mt-5 flex items-start gap-4">
                <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-2 ring-[#FCB038]/35">
                  {student.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={student.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-9 w-9 text-[#FCB038]" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                      {student.fullName}
                    </h3>
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
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <dl className="grid gap-2.5 text-[12.5px] sm:grid-cols-2">
                <InfoRow label="ShuleCode" value={student.studentUid} />
                <InfoRow label="SDMS Code" value={student.sdmCode || '—'} />
                <InfoRow label="Registration No." value={student.registrationNumber || '—'} />
                <InfoRow label="Current class" value={student.className || '—'} />
                <InfoRow label="Academic year" value={student.academicYear || '—'} />
                <InfoRow label="Term" value={student.term || '—'} />
                {student.outstandingBalance != null ? (
                  <InfoRow
                    label="Outstanding"
                    value={`${RWF.format(student.outstandingBalance)} Frw`}
                  />
                ) : null}
                {student.lastPayment ? (
                  <InfoRow
                    label="Last payment"
                    value={`${RWF.format(student.lastPayment.amount)} Frw · ${student.lastPayment.date}`}
                  />
                ) : null}
              </dl>

              {student.parents.length > 0 ? (
                <div className="mt-5 rounded-2xl border border-navy-900/[0.06] bg-[#F8F9FA] p-4">
                  <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-navy-700/45">
                    Parent / Guardian
                  </p>
                  <ul className="space-y-2.5">
                    {student.parents.map((p) => (
                      <li key={`${p.role}-${p.name}`} className="text-[13px] text-navy-700/80">
                        <span className="font-semibold text-navy-900">{p.name}</span>
                        <span className="text-navy-700/45"> · {p.role}</span>
                        {p.phone ? (
                          <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-navy-700/55 sm:mt-0 sm:ml-2 sm:inline-flex">
                            <Phone className="h-3 w-3" />
                            {p.phone}
                          </span>
                        ) : null}
                        {p.email ? (
                          <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-navy-700/55 sm:mt-0 sm:ml-2 sm:inline-flex">
                            <Mail className="h-3 w-3" />
                            {p.email}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="mb-2.5 mt-6 text-[11px] font-bold uppercase tracking-wide text-navy-700/45">
                Quick actions
              </p>
              <div className="grid gap-2.5 sm:grid-cols-3">
                <ActionCard
                  icon={Wallet2}
                  title="Pay school fees"
                  subtitle="Tuition, transport…"
                  accent="#FCB038"
                  onClick={onPayFees}
                />
                <ActionCard
                  icon={ShoppingBag}
                  title="Pay requirements"
                  subtitle="Uniforms, books…"
                  accent="#2355FF"
                  onClick={onPayRequirements}
                />
                <ActionCard
                  icon={Globe}
                  title="School Mini website"
                  subtitle={websiteLoading ? 'Opening…' : 'News, admissions…'}
                  accent="#8640AA"
                  onClick={handleOpenSchoolWebsite}
                  disabled={websiteLoading}
                  trailingIcon={websiteLoading ? Loader2 : undefined}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
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

function ActionCard({
  icon: Icon,
  title,
  subtitle,
  accent,
  onClick,
  href,
  external = false,
  disabled = false,
  trailingIcon: TrailingIcon,
}: {
  icon: typeof Wallet2;
  title: string;
  subtitle: string;
  accent: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  disabled?: boolean;
  trailingIcon?: typeof Loader2;
}) {
  const className =
    'group flex flex-col items-start gap-2 rounded-2xl border border-navy-900/[0.07] bg-white p-3.5 text-left shadow-[0_6px_18px_-12px_rgba(0,4,53,0.18)] transition hover:border-navy-900/15 hover:shadow-[0_12px_28px_-14px_rgba(0,4,53,0.22)] disabled:cursor-wait disabled:opacity-70';

  const body = (
    <>
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${accent}18`, color: accent }}
      >
        {TrailingIcon ? (
          <TrailingIcon className="h-4 w-4 animate-spin" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </span>
      <span>
        <span className="block text-sm font-bold text-navy-900">{title}</span>
        <span className="mt-0.5 block text-[11.5px] text-navy-700/50">{subtitle}</span>
      </span>
    </>
  );

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
          {body}
        </a>
      );
    }

    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {body}
    </button>
  );
}
