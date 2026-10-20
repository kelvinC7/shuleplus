'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { DirectoryFilters, School, SortKey, ViewMode } from '@/lib/types';
import {
  DEFAULT_FILTERS,
  filterSchools,
  getCombinations,
  getCurricula,
  sortSchools,
} from '@/lib/data';
import { fetchOnboardedSchools } from '@/lib/api';
import {
  fetchDistricts,
  fetchProvinces,
  fetchSectors,
  type LocationOption,
} from '@/lib/locations';
import { TopBar } from './top-bar';
import { SiteHeader } from './site-header';
import { Hero } from './hero';
import { ShuleplusShowcase } from './shuleplus-showcase';
import { SidebarCol, MobileFiltersSheet } from './filters-sidebar';
import { ResultsHeader } from './results-header';
import { SchoolCard } from './school-card';
import { Pagination } from './pagination';
import { CtaBanner } from './cta-banner';
import { SiteFooter } from './site-footer';
import { countActiveFilters } from '@/lib/filter-utils';
import { useSiteLanguage } from './language-provider';

const FloatingWidgets = dynamic(
  () => import('./floating-widgets').then((m) => m.FloatingWidgets),
  { ssr: false },
);

const PAGE_SIZE = 6;

function SkeletonCard() {
  return (
    <div className="flex animate-pulse flex-col rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <span className="h-16 w-16 rounded-2xl bg-ink-100" />
        <span className="h-8 w-8 rounded-full bg-ink-100" />
      </div>
      <div className="mt-4 h-4 w-3/4 rounded-full bg-ink-100" />
      <div className="mt-2.5 h-3 w-1/2 rounded-full bg-ink-100" />
      <div className="mt-3 flex gap-1.5">
        <span className="h-[26px] w-20 rounded-full bg-ink-100" />
        <span className="h-[26px] w-14 rounded-full bg-ink-100" />
      </div>
      <div className="mt-3 h-3 w-full rounded-full bg-ink-100" />
      <div className="mt-1.5 h-3 w-5/6 rounded-full bg-ink-100" />
      <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
        <span className="h-[64px] rounded-[14px] bg-ink-100" />
        <span className="h-[64px] rounded-[14px] bg-ink-100" />
        <span className="h-[64px] rounded-[14px] bg-ink-100" />
      </div>
    </div>
  );
}

export function SchoolsDirectory() {
  const { t } = useSiteLanguage();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DirectoryFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>('relevant');
  const [view, setView] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [sectors, setSectors] = useState<LocationOption[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOnboardedSchools();
      setSchools(data);
    } catch {
      setError(t.results.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.results.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchProvinces()
      .then(setProvinces)
      .catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (!filters.provinceId) {
      setDistricts([]);
      return;
    }
    void fetchDistricts(filters.provinceId)
      .then(setDistricts)
      .catch(() => setDistricts([]));
  }, [filters.provinceId]);

  useEffect(() => {
    if (!filters.districtId) {
      setSectors([]);
      return;
    }
    void fetchSectors(filters.districtId)
      .then(setSectors)
      .catch(() => setSectors([]));
  }, [filters.districtId]);

  const handleFilterChange = useCallback((patch: Partial<DirectoryFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const combinations = useMemo(() => getCombinations(schools), [schools]);
  const curricula = useMemo(() => getCurricula(schools), [schools]);

  const filtered = useMemo(() => filterSchools(schools, filters), [schools, filters]);
  const sorted = useMemo(() => sortSchools(filtered, sort), [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const countText = loading
    ? t.results.loading
    : error
      ? t.results.unavailable
      : sorted.length
        ? t.results.showing(
            (safePage - 1) * PAGE_SIZE + 1,
            Math.min(safePage * PAGE_SIZE, sorted.length),
            sorted.length,
          )
        : t.results.none;

  const activeFilterCount = countActiveFilters(filters);
  const filterProps = {
    filters,
    totalCount: schools.length,
    provinces,
    districts,
    sectors,
    combinations,
    curricula,
    onChange: handleFilterChange,
    onClear: () => {
      setFilters(DEFAULT_FILTERS);
      setPage(1);
    },
  };

  function toggleSaved(id: string) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <TopBar />
      <SiteHeader />

      <Hero
        filters={filters}
        provinces={provinces}
        curricula={curricula}
        schoolCount={loading ? null : schools.length}
        schoolsLoading={loading}
        onFilterChange={handleFilterChange}
        onSubmit={() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })}
      />

      <ShuleplusShowcase />

      <main className="pb-5 pt-14">
        <div className="site-container grid items-start gap-7 lg:grid-cols-[256px_1fr]" id="results">
          <SidebarCol {...filterProps} />

          <MobileFiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} {...filterProps} />

          <section>
            <ResultsHeader
              title={filters.name ? t.results.resultsFor(filters.name) : t.results.allSchools}
              countText={countText}
              sort={sort}
              onSortChange={(s) => {
                setSort(s);
                setPage(1);
              }}
              view={view}
              onViewChange={setView}
              onOpenFilters={() => setFiltersOpen(true)}
              activeFilterCount={activeFilterCount}
            />

            {loading ? (
              <div className="grid grid-cols-3 gap-5 max-xl:grid-cols-2 max-lg:grid-cols-1">
                {Array.from({ length: PAGE_SIZE }, (_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-[22px] border border-dashed border-magenta-300 bg-white p-16 text-center">
                <p className="text-lg font-medium text-ink-900">{t.results.registryError}</p>
                <p className="mt-2 text-sm text-ink-500">{error}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-5 inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700"
                >
                  {t.results.tryAgain}
                </button>
              </div>
            ) : paged.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-ink-300 bg-white p-16 text-center">
                <p className="text-lg font-medium text-ink-900">{t.results.noMatch}</p>
                <p className="mt-2 text-sm text-ink-500">{t.results.noMatchHint}</p>
              </div>
            ) : (
              <div
                className={
                  view === 'grid'
                    ? 'grid grid-cols-3 gap-5 max-xl:grid-cols-2 max-lg:grid-cols-1'
                    : 'flex flex-col gap-3.5'
                }
              >
                {paged.map((s: School, i) => (
                  <SchoolCard
                    key={s.id}
                    school={s}
                    index={i}
                    view={view}
                    saved={savedIds.has(s.id)}
                    onSaveToggle={toggleSaved}
                  />
                ))}
              </div>
            )}

            {!loading && !error && (
              <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
            )}
          </section>
        </div>

        <CtaBanner />
      </main>

      <SiteFooter />
      <FloatingWidgets />
    </>
  );
}
