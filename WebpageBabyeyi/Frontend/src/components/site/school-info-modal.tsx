'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import type { School } from '@/lib/types';
import { SchoolLogo } from './school-logo';
import { curriculumTagClass } from '@/lib/data';
import {
  ArrowRightIcon,
  CardIcon,
  MapPinIcon,
  PhoneIcon,
} from './icons';
import type { HandoffStudent } from './request-loan-modal';
import { cn, schoolSiteUrl } from '@/lib/utils';
import { useSiteLanguage } from './language-provider';
import {
  LocationMapPreview,
  LocationSummaryCard,
  formatProvinceDistrict,
  schoolLocationParts,
  schoolProgramLabel,
} from './location-map-preview';

const PayFeesModal = dynamic(
  () => import('./pay-fees-modal').then((m) => m.PayFeesModal),
  { ssr: false },
);

const RequestLoanModal = dynamic(
  () => import('./request-loan-modal').then((m) => m.RequestLoanModal),
  { ssr: false },
);

interface SchoolInfoModalProps {
  school: School;
  open: boolean;
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  government: 'bg-teal-500/15 text-teal-100 ring-teal-400/30',
  'government-aided': 'bg-sky-500/15 text-sky-100 ring-sky-400/30',
  private: 'bg-amber-500/15 text-amber-100 ring-amber-400/30',
  international: 'bg-violet-500/15 text-violet-100 ring-violet-400/30',
};

const LEVEL_PILL: Record<string, string> = {
  'Nursery / Pre-Primary': 'bg-pink-100 text-pink-700',
  'Primary (P1–P6)': 'bg-blue-100 text-blue-700',
  'O-Level (S1–S3)': 'bg-teal-100 text-teal-700',
  'A-Level (S4–S6)': 'bg-purple-100 text-purple-700',
  'TVET / IPRC': 'bg-orange-100 text-orange-700',
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#000435]/45">
      {children}
    </h3>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="M22 7l-10 6L2 7" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function SchoolInfoModal({ school, open, onClose }: SchoolInfoModalProps) {
  const { t } = useSiteLanguage();
  const [canPortal, setCanPortal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [feesOpen, setFeesOpen] = useState(false);
  const [loanStudent, setLoanStudent] = useState<HandoffStudent | null>(null);

  useEffect(() => setCanPortal(true), []);

  useEffect(() => {
    if (!open) {
      setMounted(false);
      return;
    }
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !canPortal) return null;

  const locationParts = schoolLocationParts(school);
  const siteUrl = schoolSiteUrl(school);
  const programLabel = schoolProgramLabel(school);
  const provinceDistrict = formatProvinceDistrict(school);

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t.schoolInfo.details(school.name)}
        >
          <button
            type="button"
            aria-label={t.schoolInfo.close}
            onClick={onClose}
            className={cn(
              'absolute inset-0 bg-[#000435]/60 backdrop-blur-sm transition-opacity duration-300',
              mounted ? 'opacity-100' : 'opacity-0',
            )}
          />

          <div
            className={cn(
              'relative z-[101] flex max-h-[94vh] w-full max-w-[760px] flex-col overflow-hidden rounded-t-[28px] bg-[#f8f9fb] shadow-[0_32px_80px_-24px_rgba(0,4,53,0.35)] transition-all duration-300 sm:rounded-[28px]',
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 sm:scale-[0.98]',
            )}
          >
            {/* Header */}
            <div
              className="relative shrink-0 overflow-hidden px-6 pb-6 pt-6 sm:px-8"
              style={{ backgroundColor: '#000435' }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 20% 20%, rgba(245,158,11,0.25) 0%, transparent 40%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.08) 0%, transparent 45%)',
                }}
              />

              <button
                type="button"
                aria-label={t.schoolInfo.close}
                onClick={onClose}
                className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>

              <div className="relative z-10 flex items-start gap-4">
                <SchoolLogo
                  name={school.name}
                  initials={school.initials}
                  logoUrl={school.logoUrl}
                  size={72}
                  className="rounded-2xl p-2 shadow-lg ring-1 ring-white/20"
                />

                <div className="min-w-0 flex-1 pr-8">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {school.verified && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-400/30">
                        {t.schoolInfo.verified}
                      </span>
                    )}
                    {school.category && (
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1',
                          TYPE_COLORS[school.type] ?? 'bg-white/10 text-white ring-white/20',
                        )}
                      >
                        {school.category}
                      </span>
                    )}
                    {programLabel && (
                      <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200 ring-1 ring-amber-400/30">
                        {programLabel}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-medium leading-snug text-white sm:text-2xl">{school.name}</h2>
                  {provinceDistrict && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/65">
                      <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
                      {provinceDistrict}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid gap-5 p-5 sm:grid-cols-[1fr_280px] sm:p-6">
                {/* Main column */}
                <div className="space-y-5">
                  {school.curricula.length > 0 && (
                    <div className="rounded-2xl border border-[#000435]/[0.08] bg-white p-4">
                      <SectionTitle>{t.schoolInfo.curriculum}</SectionTitle>
                      <div className="flex flex-wrap gap-1.5">
                        {school.curricula.map((c) => (
                          <span
                            key={c}
                            className={cn(
                              'rounded-full px-2.5 py-1 text-[11px] font-medium',
                              curriculumTagClass(c),
                            )}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {school.desc && (
                    <div className="rounded-2xl border border-[#000435]/[0.08] bg-white p-4">
                      <SectionTitle>{t.schoolInfo.about}</SectionTitle>
                      <p className="text-sm leading-relaxed text-[#000435]/70">{school.desc}</p>
                    </div>
                  )}

                  {school.levels.length > 0 && (
                    <div className="rounded-2xl border border-[#000435]/[0.08] bg-white p-4">
                      <SectionTitle>{t.schoolInfo.levels}</SectionTitle>
                      <div className="flex flex-wrap gap-2">
                        {school.levels.map((l) => (
                          <span
                            key={l}
                            className={cn(
                              'rounded-full px-3 py-1.5 text-xs font-medium',
                              LEVEL_PILL[l] ?? 'bg-[#000435]/5 text-[#000435]',
                            )}
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {school.aLevelCombinations.length > 0 && (
                    <div className="rounded-2xl border border-[#000435]/[0.08] bg-white p-4">
                      <SectionTitle>{t.schoolInfo.combinations}</SectionTitle>
                      <div className="flex flex-wrap gap-2">
                        {school.aLevelCombinations.map((combo) => (
                          <span
                            key={combo}
                            className="rounded-xl bg-purple-50 px-3 py-2 text-sm font-medium text-purple-800 ring-1 ring-purple-200"
                          >
                            {combo}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {school.tvetTrades.length > 0 && (
                    <div className="rounded-2xl border border-[#000435]/[0.08] bg-white p-4">
                      <SectionTitle>{t.schoolInfo.tvetTrades}</SectionTitle>
                      <div className="flex flex-wrap gap-1.5">
                        {school.tvetTrades.map((trade) => (
                          <span
                            key={trade}
                            className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700"
                          >
                            {trade}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(school.phone || school.email || siteUrl) && (
                    <div className="rounded-2xl border border-[#000435]/[0.08] bg-white p-4">
                      <SectionTitle>{t.schoolInfo.contact}</SectionTitle>
                      <div className="space-y-2">
                        {school.phone && (
                          <a
                            href={`tel:${school.phone}`}
                            className="flex items-center gap-3 rounded-xl bg-[#f8f9fb] px-3.5 py-3 text-sm font-medium text-[#000435] transition-colors hover:bg-[#000435]/5"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                              <PhoneIcon className="h-4 w-4" />
                            </span>
                            {school.phone}
                          </a>
                        )}
                        {school.email && (
                          <a
                            href={`mailto:${school.email}`}
                            className="flex items-center gap-3 rounded-xl bg-[#f8f9fb] px-3.5 py-3 text-sm font-medium text-[#000435] transition-colors hover:bg-[#000435]/5"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                              <EmailIcon className="h-4 w-4" />
                            </span>
                            {school.email}
                          </a>
                        )}
                        {siteUrl && (
                          <a
                            href={siteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-xl bg-[#f8f9fb] px-3.5 py-3 text-sm font-medium text-[#000435] transition-colors hover:bg-[#000435]/5"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                              <GlobeIcon className="h-4 w-4" />
                            </span>
                            {siteUrl.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFeesOpen(true)}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-[#000435]/[0.08] bg-white p-3 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm">
                        <CardIcon className="h-4 w-4" strokeWidth={2.2} />
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-[#000435]/70">{t.schoolInfo.payFees}</span>
                    </button>
                    {siteUrl && (
                      <a
                        href={siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-2 rounded-2xl border border-[#000435]/[0.08] bg-white p-3 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#000435] to-[#0a0f52] text-white shadow-sm">
                          <ArrowRightIcon className="h-4 w-4" />
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-wide text-[#000435]/70">{t.schoolInfo.visitSite}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Location column  same as onboarding */}
                <div className="space-y-3 sm:sticky sm:top-0 sm:self-start">
                  {locationParts.provinceName || locationParts.districtName ? (
                    <>
                      <LocationSummaryCard parts={locationParts} />
                      <LocationMapPreview parts={locationParts} title={t.schoolInfo.mapOf(school.name)} />
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#000435]/15 bg-white p-5 text-center">
                      <MapPinIcon className="mx-auto h-8 w-8 text-[#000435]/25" />
                      <p className="mt-2 text-sm font-medium text-[#000435]/70">{t.schoolInfo.locationMissing}</p>
                      <p className="mt-1 text-xs text-[#000435]/45">{t.schoolInfo.locationMissingHint}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
      {feesOpen ? (
        <PayFeesModal
          school={school}
          open={feesOpen}
          onClose={() => setFeesOpen(false)}
          onRequestLoan={(student) => {
            setLoanStudent(student as HandoffStudent);
            setFeesOpen(false);
          }}
        />
      ) : null}
      {loanStudent ? (
        <RequestLoanModal
          school={school}
          open={!!loanStudent}
          onClose={() => setLoanStudent(null)}
          initialStudent={loanStudent}
        />
      ) : null}
    </>
  );
}
