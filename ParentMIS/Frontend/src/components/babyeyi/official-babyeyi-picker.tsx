'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import {
  BABYEYI_LANGS,
  fetchPublicCircularOptions,
  findApprovedPublicCircular,
  publicCircularPrintUrl,
  type FoundChild,
  type PublicCircularOptions,
  type PublicCircularSummary,
} from '@/lib/parent-find-child';

export function OfficialBabyeyiPicker({ child }: { child: FoundChild }) {
  const [options, setOptions] = useState<PublicCircularOptions | null>(null);
  const [year, setYear] = useState('');
  const [term, setTerm] = useState('');
  const [lang, setLang] = useState<(typeof BABYEYI_LANGS)[number]['code']>('EN');
  const [circular, setCircular] = useState<PublicCircularSummary | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingCircular, setLoadingCircular] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoadingOptions(true);
    setError('');
    fetchPublicCircularOptions(child.organizationId, child.cls)
      .then((result) => {
        if (!active) return;
        setOptions(result);
        const periods = result.grouped.filter((period) => period.academicYear && period.terms.length);
        const preferred = periods.find((period) => period.academicYear === child.academicYear)
          ?? periods.find((period) => period.academicYear === result.currentAcademicYear)
          ?? periods[0];
        setYear(preferred?.academicYear ?? '');
        const preferredTerm = preferred?.terms.includes(child.term ?? '')
          ? child.term!
          : preferred?.terms.includes(result.currentTerm ?? '')
            ? result.currentTerm!
            : preferred?.terms[0] ?? '';
        setTerm(preferredTerm);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load Babyeyi periods.');
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });

    return () => {
      active = false;
    };
  }, [child.academicYear, child.cls, child.organizationId, child.term]);

  const yearOptions = options?.grouped.filter((period) => period.academicYear && period.terms.length) ?? [];
  const selectedPeriod = yearOptions.find((period) => period.academicYear === year);
  const termOptions = selectedPeriod?.terms ?? [];

  useEffect(() => {
    if (!year || !term || !child.organizationId) return;
    let active = true;
    setLoadingCircular(true);
    setCircular(null);
    setError('');
    findApprovedPublicCircular(child.organizationId, year, term, child.cls)
      .then((result) => {
        if (active) setCircular(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not find an approved Babyeyi.');
      })
      .finally(() => {
        if (active) setLoadingCircular(false);
      });

    return () => {
      active = false;
    };
  }, [child.cls, child.organizationId, term, year]);

  const printUrl = useMemo(
    () => circular ? publicCircularPrintUrl(circular, child.organizationId, lang) : '',
    [child.organizationId, circular, lang],
  );

  return (
    <div className="space-y-5">
      {loadingOptions ? (
        <div className="flex items-center gap-2 py-3 text-sm text-[var(--yo-muted)]"><Loader2 className="size-4 animate-spin" />Loading available school periods…</div>
      ) : yearOptions.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-[var(--yo-navy)]">
            Academic year
            <select
              value={year}
              onChange={(event) => {
                const nextYear = event.target.value;
                setYear(nextYear);
                const nextTerms = yearOptions.find((period) => period.academicYear === nextYear)?.terms ?? [];
                setTerm(nextTerms[0] ?? '');
              }}
              className="mt-1.5 h-12 w-full rounded-xl border border-[var(--yo-line)] bg-[var(--yo-bg)] px-4 text-sm font-semibold"
            >
              {yearOptions.map((period) => <option key={period.academicYear} value={period.academicYear}>{period.academicYear}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-[var(--yo-navy)]">
            Term
            <select
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              className="mt-1.5 h-12 w-full rounded-xl border border-[var(--yo-line)] bg-[var(--yo-bg)] px-4 text-sm font-semibold"
            >
              {termOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>
      ) : (
        <p className="rounded-xl bg-[var(--yo-bg)] px-4 py-3 text-sm text-[var(--yo-muted)]">No approved Babyeyi periods are available for this school and class yet.</p>
      )}

      <div>
        <p className="mb-2 text-xs font-bold text-[var(--yo-navy)]">Document language</p>
        <div className="flex flex-wrap gap-2">
          {BABYEYI_LANGS.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setLang(item.code)}
              aria-pressed={lang === item.code}
              className={`rounded-full px-4 py-2 text-xs font-bold ${lang === item.code ? 'bg-[var(--yo-navy)] text-white' : 'border border-[var(--yo-line)] bg-white text-[var(--yo-navy)]'}`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {loadingCircular ? (
        <div className="flex items-center gap-2 text-sm text-[var(--yo-muted)]"><Loader2 className="size-4 animate-spin" />Checking for the approved circular…</div>
      ) : circular ? (
        <div className="rounded-xl border border-[var(--yo-line)] bg-[var(--yo-bg)] p-4 text-sm">
          <p className="font-bold text-[var(--yo-navy)]">{circular.className} · {circular.academicYear} · {circular.term}</p>
          <p className="mt-1 text-xs text-[var(--yo-muted)]">Status: {circular.status === 'PUBLISHED' ? 'Published' : 'Approved'}</p>
        </div>
      ) : year && term && !error ? (
        <p className="rounded-xl bg-[#FFF3DC] px-4 py-3 text-sm font-medium text-[#805000]">No approved Babyeyi was found for {child.cls}, {term} {year}.</p>
      ) : null}

      {error ? <p role="alert" className="rounded-xl bg-[#FDE7E8] px-4 py-3 text-sm font-medium text-[#b4262b]">{error}</p> : null}

      <a
        href={printUrl || undefined}
        target={printUrl ? '_blank' : undefined}
        rel={printUrl ? 'noopener noreferrer' : undefined}
        aria-disabled={!printUrl || loadingCircular}
        className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--yo-amber)] px-5 text-sm font-extrabold text-[var(--yo-navy)] transition hover:brightness-95 ${!printUrl || loadingCircular ? 'pointer-events-none opacity-50' : ''}`}
      >
        <ExternalLink size={17} />
        Open official Babyeyi to save as PDF
      </a>
    </div>
  );
}
