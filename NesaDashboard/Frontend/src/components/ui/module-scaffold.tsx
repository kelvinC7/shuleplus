'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { KpiCard } from '@/components/ui/kpi-card';
import { ModulePage } from '@/components/ui/module-page';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';

export interface ScaffoldKpi {
  label: string;
  value: string | number;
  delta?: string;
}

export interface ScaffoldFilter {
  label: string;
  options: string[];
}

interface ModuleScaffoldProps {
  title: string;
  subtitle: string;
  kpis: ScaffoldKpi[];
  filters?: ScaffoldFilter[];
  actions?: ReactNode;
  tabs?: Array<{ label: string; href?: string; active?: boolean }>;
  tableTitle?: string;
  columns: DataTableColumn<Record<string, unknown>>[];
  rows: Record<string, unknown>[];
  rowKey: (row: Record<string, unknown>) => string;
  children?: ReactNode;
}

export function ModuleScaffold({
  title,
  subtitle,
  kpis,
  filters,
  actions,
  tabs,
  tableTitle = 'Records',
  columns,
  rows,
  rowKey,
  children,
}: ModuleScaffoldProps) {
  return (
    <ModulePage title={title} subtitle={subtitle} actions={actions}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} delta={k.delta} />
        ))}
      </div>

      {tabs && tabs.length > 0 ? (
        <div className="flex flex-wrap gap-1 border-b border-navy/10 pb-px">
          {tabs.map((tab) => {
            const className = `rounded-t-lg px-3 py-2 text-[13px] font-semibold transition ${
              tab.active
                ? 'border-b-2 border-primary text-navy'
                : 'text-navy/45 hover:text-navy'
            }`;
            return tab.href ? (
              <Link key={tab.label} href={tab.href} className={className}>
                {tab.label}
              </Link>
            ) : (
              <button key={tab.label} type="button" className={className}>
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {filters && filters.length > 0 ? (
        <div className="nesa-card flex flex-wrap items-end gap-3 !p-4">
          {filters.map((f) => (
            <label key={f.label} className="min-w-[140px] flex-1">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy/45">
                {f.label}
              </span>
              <select className="nesa-input">
                <option value="">All</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button
            type="button"
            className="rounded-lg bg-navy px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-navy/90"
          >
            Apply filters
          </button>
        </div>
      ) : null}

      {children}

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-navy">{tableTitle}</h2>
        <DataTable columns={columns} rows={rows} rowKey={rowKey} />
      </section>
    </ModulePage>
  );
}
