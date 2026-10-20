'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FilePlus2,
  Files,
  CheckCircle2,
  BarChart3,
  FileText,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAcademicPeriod } from '@/contexts/academic-period-context';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { HrChartCard } from '@/components/charts/hr-chart-card';
import { MultiBarChart, DonutChart, NAVY, PRIMARY, TEAL } from '@/components/charts/hr-charts';
import { fetchDashboard } from '@/services/babyeyi-api';
import type { DashboardSummary } from '@/types';

const QUICK_ACTIONS = [
  { href: '/create', label: 'Create circular', icon: FilePlus2 },
  { href: '/templates', label: 'Browse templates', icon: Files },
  { href: '/approvals', label: 'Approval center', icon: CheckCircle2 },
  { href: '/analytics', label: 'Circular analytics', icon: BarChart3 },
] as const;

const YEAR_COLORS = [NAVY, PRIMARY, TEAL];
const MAX_CLASSES_SHOWN = 8;

/** Natural class ordering: N1–N3, P1–P6, S1–S6, then TVET/other levels, then alphabetical. */
function classSortKey(name: string): [number, number] {
  const match = name.trim().match(/^([A-Za-z]+)\s*-?\s*(\d+)?/);
  const prefix = (match?.[1] ?? name).toUpperCase();
  const num = match?.[2] ? parseInt(match[2], 10) : 0;
  const order = ['N', 'P', 'S', 'L', 'TVET', 'Y'];
  const idx = order.findIndex((o) => prefix.startsWith(o));
  return [idx === -1 ? order.length : idx, num];
}

function sortClasses(classes: string[]): string[] {
  return [...classes].sort((a, b) => {
    const [ra, na] = classSortKey(a);
    const [rb, nb] = classSortKey(b);
    if (ra !== rb) return ra - rb;
    if (na !== nb) return na - nb;
    return a.localeCompare(b);
  });
}

function formatRwf(value: number): string {
  return `RWF ${Math.round(value).toLocaleString()}`;
}

export function DashboardView() {
  const { summary: authSummary } = useAuth();
  const { year: periodYear } = useAcademicPeriod();
  const [data, setData] = useState<DashboardSummary | null>(authSummary);
  const [loading, setLoading] = useState(!authSummary);

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const kpis = data?.kpis;

  const statusSegments = (data?.charts.statusBreakdown ?? [])
    .filter((s) => s.count > 0)
    .map((s, i) => ({
      label: s.status.charAt(0) + s.status.slice(1).toLowerCase(),
      value: s.count,
      color: [NAVY, PRIMARY, TEAL, '#f97316', '#ef4444', '#94a3b8'][i % 6],
    }));

  // Pivot the flat (academicYear, className) rows into a class-by-year grid,
  // reflecting how circulars — and the fees inside them — actually vary per class and year.
  const { classes, countSeries, feeSeries } = useMemo(() => {
    const allRows = data?.charts.classYearBreakdown ?? [];
    const rows = periodYear ? allRows.filter((r) => r.academicYear === periodYear) : allRows;
    if (rows.length === 0) {
      return { classes: [] as string[], countSeries: [], feeSeries: [] };
    }

    const years = periodYear
      ? [periodYear]
      : Array.from(new Set(rows.map((r) => r.academicYear))).sort().slice(-3);

    const totalByClass = new Map<string, number>();
    for (const r of rows) {
      totalByClass.set(r.className, (totalByClass.get(r.className) ?? 0) + r.count);
    }

    let classList = sortClasses(Array.from(totalByClass.keys()));
    if (classList.length > MAX_CLASSES_SHOWN) {
      classList = sortClasses(
        [...classList]
          .sort((a, b) => (totalByClass.get(b) ?? 0) - (totalByClass.get(a) ?? 0))
          .slice(0, MAX_CLASSES_SHOWN)
      );
    }

    const lookup = new Map(rows.map((r) => [`${r.academicYear}__${r.className}`, r]));

    const countSeries = years.map((year, i) => ({
      name: year,
      color: YEAR_COLORS[i % YEAR_COLORS.length],
      values: classList.map((cls) => lookup.get(`${year}__${cls}`)?.count ?? 0),
    }));
    const feeSeries = years.map((year, i) => ({
      name: year,
      color: YEAR_COLORS[i % YEAR_COLORS.length],
      values: classList.map((cls) => lookup.get(`${year}__${cls}`)?.totalFee ?? 0),
    }));

    return { classes: classList, countSeries, feeSeries };
  }, [data, periodYear]);

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">Loading dashboard…</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <StatsGrid columns={3}>
        <StatCard label="Today's Circulars" value={kpis?.todayCirculars ?? 0} delta={kpis?.todayDelta ?? '+0%'} icon={<Clock size={20} />} />
        <StatCard label="Published" value={kpis?.published ?? 0} icon={<CheckCircle2 size={20} />} />
        <StatCard label="Drafts" value={kpis?.drafts ?? 0} icon={<FileText size={20} />} />
      </StatsGrid>

      {/* Circular status + fee trend, side by side — the two "state of things" views. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <HrChartCard title="Circular status" subtitle="Where circulars stand right now">
          {statusSegments.length > 0 ? (
            <DonutChart segments={statusSegments} centerLabel={String(kpis?.totalCirculars ?? 0)} size={180} />
          ) : (
            <p className="flex h-[180px] items-center justify-center text-sm text-muted">
              No circulars yet.
            </p>
          )}
        </HrChartCard>

        <HrChartCard title="School fees by class" subtitle="Total fee amount per class, across academic years">
          <MultiBarChart categories={classes} series={feeSeries} valueFormatter={formatRwf} />
        </HrChartCard>
      </div>

      {/* Circulars by class + quick actions, side by side as a main chart with a vertical action rail. */}
      <div className="grid gap-6 lg:grid-cols-3">
        <HrChartCard title="Circulars by class" subtitle="Created per class, across academic years" className="lg:col-span-2">
          <MultiBarChart categories={classes} series={countSeries} />
        </HrChartCard>

        <div className="hr-card p-5 sm:p-6">
          <h3 className="mb-3 text-sm font-bold text-navy sm:text-base">Quick actions</h3>
          <div className="flex flex-col">
            {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="group flex items-center gap-3 border-t border-border/70 py-3 first:border-t-0 first:pt-0 last:pb-0"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy/5 text-navy transition group-hover:bg-primary/15">
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <span className="flex-1 text-sm font-medium text-navy">{label}</span>
                <ChevronRight size={15} className="text-muted/50 transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
