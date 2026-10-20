'use client';

import Link from 'next/link';
import { ArrowUpRight, Play, Settings2, Users, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { ModuleTile } from '@/components/module-tile';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { SUB_PAGES, MONTHS, formatRwf } from '@/config/payroll-nav';

export function DashboardView() {
  const { summary } = useAuth();
  const kpis = summary?.kpis as Record<string, number | boolean> | undefined;
  const recentRuns =
    (summary?.recentRuns as {
      id: string;
      runNumber: string;
      month: number;
      year: number;
      status: string;
      totals?: Record<string, number>;
    }[]) ?? [];

  return (
    <div className="space-y-6">
      <StatsGrid>
        <StatCard
          label="Active Staff"
          value={Number(kpis?.activeStaff ?? 0)}
          hint="On payroll roster"
          icon={<Users size={20} />}
        />
        <StatCard
          label="Payroll Runs"
          value={Number(kpis?.totalRuns ?? 0)}
          hint="All time"
          icon={<Play size={20} />}
        />
        <StatCard
          label="Last Gross"
          value={formatRwf(Number(kpis?.lastGross ?? 0)).replace(' RWF', '')}
          hint="Most recent run"
          icon={<Wallet size={20} />}
        />
        <StatCard
          label="Last Net Payable"
          value={formatRwf(Number(kpis?.lastNet ?? 0)).replace(' RWF', '')}
          hint="After deductions"
          icon={<Settings2 size={20} />}
        />
      </StatsGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="hr-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy">Recent Payroll Runs</h2>
            <Link href="/run" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              New run <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentRuns.length === 0 && (
              <p className="text-sm text-muted">No payroll runs yet. Start with Payroll Run.</p>
            )}
            {recentRuns.map((r) => (
              <Link
                key={r.id}
                href={`/salary-payment?run=${r.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-slate-50/60 px-4 py-3 transition hover:border-primary/30 hover:bg-primary/5"
              >
                <div>
                  <p className="text-sm font-semibold text-navy">{r.runNumber}</p>
                  <p className="text-xs text-muted">
                    {MONTHS[r.month - 1]} {r.year}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </Link>
            ))}
          </div>
        </div>

        <div className="hr-card p-5 sm:p-6">
          <h2 className="text-sm font-bold text-navy">Payroll Alerts</h2>
          <div className="mt-4 space-y-3">
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                kpis?.templateActive ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
              }`}
            >
              {kpis?.templateActive
                ? 'Salary template is active and configured'
                : 'Configure your salary template before running payroll'}
            </div>
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                Number(kpis?.pendingTerminations ?? 0) > 0 ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'
              }`}
            >
              {Number(kpis?.pendingTerminations ?? 0)} pending termination benefit
              {Number(kpis?.pendingTerminations ?? 0) !== 1 ? 's' : ''}
            </div>
            <div className="rounded-xl bg-navy/[0.03] px-4 py-3 text-sm text-navy">
              Last PAYE remittance: {formatRwf(Number(kpis?.lastPaye ?? 0))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { label: 'Run Payroll', href: '/run' },
              { label: 'Staff Setup', href: '/staff-salary-setup' },
              { label: 'Mark Paid', href: '/salary-payment' },
              { label: 'Reports', href: '/reports' },
            ].map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-center text-xs font-medium text-navy transition hover:border-primary/40"
              >
                {q.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-bold text-navy">Payroll Modules</h2>
          <span className="rounded-full bg-navy/5 px-2.5 py-0.5 text-xs font-semibold text-navy/60">
            {SUB_PAGES.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
          {SUB_PAGES.map((mod) => (
            <ModuleTile
              key={mod.href}
              href={mod.href}
              label={mod.label}
              description={mod.description}
              icon={mod.icon}
            />
          ))}
        </div>
      </section> */}
    </div>
  );
}
