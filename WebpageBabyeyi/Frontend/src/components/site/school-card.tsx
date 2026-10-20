'use client';

import { useState } from 'react';
import type { School, ViewMode } from '@/lib/types';
import { SchoolLogo } from './school-logo';
import { curriculumTagClass } from '@/lib/data';
import {
  ArrowRightIcon,
  CardIcon,
  GraduationCapIcon,
  HeartIcon,
  MapPinIcon,
  UsersIcon,
} from './icons';
import {
  AdmissionModal,
  GetBabyeyiModal,
  PayFeesModal,
  RequestLoanModal,
  SchoolInfoModal,
} from './lazy-modals';
import {
  formatProvinceDistrict,
  schoolProgramLabel,
} from './location-map-preview';
import type { HandoffStudent } from './request-loan-modal';
import { cn, schoolSiteUrl } from '@/lib/utils';
import { useSiteLanguage } from './language-provider';

const ACTION_KEYS = [
  { key: 'profile' as const, labelKey: 'getBabyeyi' as const, Icon: UsersIcon, classes: 'from-sky-400 to-sky-700' },
  { key: 'fees' as const, labelKey: 'payFees' as const, Icon: CardIcon, classes: 'from-amber-400 to-amber-600' },
  { key: 'admission' as const, labelKey: 'admission' as const, Icon: GraduationCapIcon, classes: 'from-teal-500 to-teal-700' },
];

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.5v6" />
      <circle cx="12" cy="7.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface SchoolCardProps {
  school: School;
  index: number;
  view: ViewMode;
  saved: boolean;
  onSaveToggle: (id: string) => void;
}

export function SchoolCard({ school, index, view, saved, onSaveToggle }: SchoolCardProps) {
  const { t } = useSiteLanguage();
  const isList = view === 'list';
  const [infoOpen, setInfoOpen] = useState(false);
  const [babyeyiOpen, setBabyeyiOpen] = useState(false);
  const [feesOpen, setFeesOpen] = useState(false);
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [loanStudent, setLoanStudent] = useState<HandoffStudent | null>(null);
  const siteUrl = schoolSiteUrl(school);
  const provinceDistrict = formatProvinceDistrict(school);
  const programLabel = schoolProgramLabel(school);

  return (
    <>
      <article
        className={cn(
          'group flex overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-[3px] hover:border-sky-200 hover:shadow-md',
          isList ? 'flex-col md:flex-row' : 'flex-col',
        )}
      >
        <div
          className={cn(
            'flex items-start justify-between px-[18px] pt-5',
            isList &&
              'w-auto flex-row justify-between gap-2.5 border-b border-ink-100 p-4 md:w-[104px] md:flex-col md:justify-center md:border-b-0 md:border-r',
          )}
        >
          <SchoolLogo
            name={school.name}
            initials={school.initials}
            logoUrl={school.logoUrl}
            index={index}
            size={64}
            className="rounded-2xl p-[5px] shadow-md"
          />

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={t.card.viewDetails(school.name)}
              onClick={() => setInfoOpen(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500 transition-colors hover:bg-sky-100 hover:text-sky-600"
            >
              <InfoIcon className="h-[15px] w-[15px]" />
            </button>
            <button
              type="button"
              aria-label={saved ? t.card.unsave(school.name) : t.card.save(school.name)}
              onClick={() => onSaveToggle(school.id)}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                saved
                  ? 'bg-amber-500 text-[#402A00]'
                  : 'bg-ink-100 text-ink-500 hover:bg-amber-100 hover:text-amber-600',
              )}
            >
              <HeartIcon filled={saved} className="h-[15px] w-[15px]" />
            </button>
          </div>
        </div>

        <div
          className={cn(
            'flex flex-1 flex-col gap-2.5 px-[18px] pb-[18px] pt-3.5',
            isList && 'flex-row items-center gap-5 px-5 py-4 max-md:flex-col max-md:items-stretch',
          )}
        >
          <div className={cn('flex flex-col gap-2.5', isList && 'min-w-0 flex-1 gap-1.5')}>
            <h3
              className={cn(
                'text-[15.5px] font-semibold leading-snug text-ink-900',
                !isList && 'line-clamp-2',
                isList && 'line-clamp-1',
              )}
            >
              {school.name}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {provinceDistrict && (
                <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                  <MapPinIcon className="h-3 w-3 shrink-0 text-sky-500" />
                  <span className="font-medium">{provinceDistrict}</span>
                </span>
              )}
              {programLabel && (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-sky-700 ring-1 ring-sky-200">
                  {programLabel}
                </span>
              )}
              {school.type && (
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-ink-600">
                  {school.category || school.type}
                </span>
              )}
              {school.verified && (
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-teal-700">
                  {t.card.verified}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {school.curricula.map((c) => (
                <span
                  key={c}
                  className={cn(
                    'whitespace-nowrap rounded-full px-2.5 py-[5px] text-[10.5px] font-medium',
                    curriculumTagClass(c),
                  )}
                >
                  {c}
                </span>
              ))}
            </div>
            <p
              className={cn(
                'text-xs leading-relaxed text-ink-500',
                isList ? 'hidden' : 'line-clamp-2',
              )}
            >
              {school.desc}
            </p>
          </div>

          <div
            className={cn(
              'mt-auto flex flex-col gap-2.5',
              isList && 'mt-0 flex-row items-center gap-4 shrink-0 max-md:mt-2 max-md:flex-col max-md:items-stretch',
            )}
          >
            <div
              className={cn(
                'grid gap-2',
                school.admissionsEnabled
                  ? 'grid-cols-3 max-md:grid-cols-3'
                  : 'grid-cols-2',
                isList && school.admissionsEnabled && 'md:grid-cols-[repeat(3,76px)] max-md:grid-cols-3',
                isList && !school.admissionsEnabled && 'md:grid-cols-[repeat(2,76px)] max-md:grid-cols-2',
              )}
            >
              {ACTION_KEYS.filter(({ key }) => key !== 'admission' || school.admissionsEnabled).map(({ key, labelKey, Icon, classes }) => (
                <a
                  key={key}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (key === 'profile') setBabyeyiOpen(true);
                    if (key === 'fees') setFeesOpen(true);
                    if (key === 'admission') setAdmissionOpen(true);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-[7px] rounded-[14px] border border-ink-200 bg-white px-1 pb-2.5 pt-3 text-center text-[9.5px] font-medium uppercase tracking-[0.03em] text-ink-700 transition-all duration-200 hover:-translate-y-[3px] hover:border-white hover:shadow-md active:translate-y-[-1px] active:scale-[0.98]',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-[0_3px_8px_rgba(15,23,42,0.14)]',
                      classes,
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  {t.card[labelKey]}
                </a>
              ))}
            </div>

            <div className={cn('h-px w-full bg-ink-100', isList && 'md:hidden')} />

            <a
              href={siteUrl ?? '#'}
              target="_blank"
              rel="noopener"
              className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[12.5px] font-medium text-sky-600 transition-colors group-hover:text-amber-600"
            >
              {t.card.viewSite} <ArrowRightIcon className="h-3 w-3" />
            </a>
          </div>
        </div>
      </article>

      {infoOpen ? (
        <SchoolInfoModal school={school} open={infoOpen} onClose={() => setInfoOpen(false)} />
      ) : null}
      {babyeyiOpen ? (
        <GetBabyeyiModal school={school} open={babyeyiOpen} onClose={() => setBabyeyiOpen(false)} />
      ) : null}
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
      {admissionOpen ? (
        <AdmissionModal school={school} open={admissionOpen} onClose={() => setAdmissionOpen(false)} />
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