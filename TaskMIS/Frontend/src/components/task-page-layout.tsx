'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface TaskPageLayoutProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: ReactNode;
  kpis?: { label: string; value: string | number; hint?: string }[];
  children: ReactNode;
}

export function TaskPageLayout({
  title,
  subtitle,
  backHref = '/dashboard',
  actions,
  kpis,
  children,
}: TaskPageLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-navy px-6 py-8 text-white shadow-lg sm:px-8 sm:py-10">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/10" />
        <div className="relative">
          <Link
            href={backHref}
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/70 transition hover:text-primary"
          >
            <ArrowLeft size={14} />
            Back to Task Center
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
          {kpis && kpis.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
                >
                  <p className="text-[11px] uppercase tracking-wide text-white/60">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
                  {kpi.hint && <p className="text-[11px] text-white/50">{kpi.hint}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
