'use client';

import Image from 'next/image';
import type { DirectoryFilters } from '@/lib/types';
import type { LocationOption } from '@/lib/locations';
import { LEVELS } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { BookIcon, GraduationCapIcon, MapPinIcon, SearchIcon, StarIcon } from './icons';
import { useSiteLanguage } from './language-provider';

interface HeroProps {
  filters: DirectoryFilters;
  provinces: LocationOption[];
  curricula: string[];
  schoolCount: number | null;
  schoolsLoading?: boolean;
  onFilterChange: (patch: Partial<DirectoryFilters>) => void;
  onSubmit: () => void;
}

export function Hero({
  filters,
  provinces,
  curricula,
  schoolCount,
  schoolsLoading = false,
  onFilterChange,
  onSubmit,
}: HeroProps) {
  const { t } = useSiteLanguage();

  const schoolValue = schoolsLoading ? '…' : schoolCount !== null ? String(schoolCount) : '—';

  const stats = [
    { value: '30', label: t.hero.stats[0] },
    { value: schoolValue, label: t.hero.stats[1] },
    { value: 'Live', label: t.hero.stats[2] },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-sky-600 to-sky-700 pb-24 pt-10 text-white sm:pb-[110px] sm:pt-14 lg:pb-[130px] lg:pt-[72px]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_480px_at_85%_-10%,var(--color-sky-100),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[120px] -right-20 h-[420px] w-[420px] rounded-full bg-amber-400 opacity-15 max-sm:-right-32 max-sm:h-[280px] max-sm:w-[280px]"
      />

      <div className="site-container relative z-[2]">
        <div className="flex flex-col lg:flex-row lg:items-end lg:gap-7">
          {/* Hero photo — prominent on mobile */}
          <div className="relative mx-auto mb-2 flex w-full max-w-[420px] shrink-0 justify-center lg:mx-0 lg:mb-0 lg:w-auto lg:max-w-none lg:justify-start">
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-2 left-1/2 h-[min(72vw,300px)] w-[min(72vw,300px)] -translate-x-1/2 rounded-full bg-amber-400/30 blur-2xl lg:hidden"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-4 left-1/2 h-[min(78vw,320px)] w-[min(78vw,320px)] -translate-x-1/2 rounded-[40%] border border-white/10 bg-white/5 lg:hidden"
            />
            <Image
              src="/students.png"
              alt={t.hero.studentAlt}
              width={408}
              height={612}
              priority
              sizes="(max-width: 1024px) 88vw, 240px"
              className="relative z-[1] w-[min(340px,88vw)] max-w-full object-contain object-bottom drop-shadow-[0_20px_28px_rgba(3,20,40,0.4)] sm:w-[min(380px,82vw)] lg:w-[240px] lg:self-end"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mx-auto max-w-[640px] text-center lg:mx-0 lg:text-left">
              <span className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3.5 py-1.5 text-[12px] font-medium text-amber-300 sm:mb-5 sm:px-4 sm:text-[13px]">
                <StarIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate sm:whitespace-normal">{t.hero.badge}</span>
              </span>
              <h1 className="mb-3 text-[1.65rem] font-semibold leading-[1.12] tracking-[-0.5px] sm:mb-3.5 sm:text-[30px] lg:text-[40px]">
                {t.hero.titleBefore}
                <span className="text-amber-400">{t.hero.titleHighlight}</span>
              </h1>
              <p className="text-sm leading-relaxed text-sky-100 sm:text-base">{t.hero.subtitle}</p>
              <p className="mt-3 text-xs font-medium tracking-wide text-amber-300 sm:text-sm">{t.hero.subtitleActions}</p>
            </div>

            <form
              id="search"
              className="mx-auto mt-6 grid max-w-[640px] grid-cols-[1fr_1fr_1fr_auto] gap-2.5 rounded-[22px] bg-white p-3 shadow-lg sm:mt-8 sm:p-3.5 lg:mx-0 max-lg:grid-cols-1"
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
              }}
            >
              <label className="col-span-full flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-ink-200 px-3 py-2.5 transition-colors focus-within:border-sky-400 focus-within:bg-sky-50 sm:px-3.5">
                <SearchIcon className="h-[18px] w-[18px] shrink-0 text-sky-500" />
                <input
                  value={filters.name}
                  onChange={(e) => onFilterChange({ name: e.target.value })}
                  placeholder={t.hero.searchPlaceholder}
                  className="w-full min-w-0 border-none bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
                />
              </label>

              <label className="flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-ink-200 px-3 py-2.5 transition-colors focus-within:border-sky-400 focus-within:bg-sky-50 sm:px-3.5">
                <MapPinIcon className="h-[18px] w-[18px] shrink-0 text-sky-500" />
                <select
                  value={filters.provinceId}
                  onChange={(e) => {
                    const selected = provinces.find((p) => p.id === e.target.value);
                    onFilterChange({
                      provinceId: e.target.value,
                      province: selected?.name ?? '',
                      districtId: '',
                      district: '',
                      sectorId: '',
                      sector: '',
                    });
                  }}
                  className="w-full min-w-0 border-none bg-transparent text-sm text-ink-900 outline-none"
                >
                  <option value="">{t.hero.allProvinces}</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-ink-200 px-3 py-2.5 transition-colors focus-within:border-sky-400 focus-within:bg-sky-50 sm:px-3.5">
                <GraduationCapIcon className="h-[18px] w-[18px] shrink-0 text-sky-500" />
                <select
                  value={filters.level}
                  onChange={(e) => onFilterChange({ level: e.target.value })}
                  className="w-full min-w-0 border-none bg-transparent text-sm text-ink-900 outline-none"
                >
                  <option value="">{t.hero.allLevels}</option>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-ink-200 px-3 py-2.5 transition-colors focus-within:border-sky-400 focus-within:bg-sky-50 sm:px-3.5">
                <BookIcon className="h-[18px] w-[18px] shrink-0 text-sky-500" />
                <select
                  value={filters.curriculum}
                  onChange={(e) => onFilterChange({ curriculum: e.target.value })}
                  className="w-full min-w-0 border-none bg-transparent text-sm text-ink-900 outline-none"
                >
                  <option value="">{t.hero.allCurricula}</option>
                  {curricula.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <Button type="submit" className="rounded-[14px] px-[26px] py-3 max-lg:w-full lg:py-0">
                <SearchIcon className="h-4 w-4" />
                {t.hero.searchBtn}
              </Button>
            </form>

            <div className="mx-auto mt-6 grid max-w-[640px] grid-cols-3 gap-3 sm:mt-8 sm:gap-6 lg:mx-0 lg:flex lg:max-w-none lg:flex-wrap lg:justify-start lg:gap-11">
              {stats.map((s) => (
                <div key={s.label} className="text-center lg:text-left">
                  <b className="block text-xl font-semibold text-white sm:text-2xl">{s.value}</b>
                  <span className="mt-0.5 block text-[10.5px] leading-tight text-sky-200 sm:text-[12.5px]">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
