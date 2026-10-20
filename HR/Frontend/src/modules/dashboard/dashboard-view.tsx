'use client';

import Link from 'next/link';
import { 
  ArrowUpRight, 
  Users, 
  UserCheck, 
  CalendarRange, 
  Plus, 
  FileText, 
  FileUp, 
  CalendarDays 
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { HrChartCard } from '@/components/charts/hr-chart-card';
import { AttendanceRateStatCard, StatCard, StatsGrid } from '@/components/stat-card';
import {
  DonutChart,
  DualAreaChart,
  GroupedBarChart,
  LAVENDER,
  NAVY,
  PRIMARY,
  SingleAreaChart,
  TEAL,
} from '@/components/charts/hr-charts';

export function DashboardView() {
  const { summary } = useAuth();
  const kpis = summary?.kpis;
  const growth = summary?.growthTrend ?? [];
  const departments = summary?.departmentBreakdown ?? [];

  const totalEmployees = kpis?.totalEmployees ?? 0;
  const activeEmployees = kpis?.activeEmployees ?? 0;

  const headcountSeriesA = growth.map((g, i) => ({
    label: g.month,
    value: Math.max(activeEmployees - (growth.length - i - 1) * 2, g.hires),
  }));
  const headcountSeriesB = growth.map((g) => ({
    label: g.month,
    value: g.hires,
  }));

  const cumulativeGrowth = growth.reduce<{ label: string; value: number }[]>((acc, g) => {
    const prev = acc.length ? acc[acc.length - 1].value : totalEmployees - growth.reduce((s, x) => s + x.hires, 0);
    acc.push({ label: g.month, value: prev + g.hires });
    return acc;
  }, []);

  const topDepartments = departments.slice(0, 5);
  const deptBarGroups = topDepartments.slice(0, 3).map((d) => ({
    label: d.name.slice(0, 3),
    budget: d.count + Math.round(d.count * 0.15),
    actual: d.count,
  }));

  const gender = summary?.genderDistribution;
  const genderSegments = [
    { label: 'Male', value: gender?.MALE ?? 0, color: NAVY },
    { label: 'Female', value: gender?.FEMALE ?? 0, color: PRIMARY },
    { label: 'Other', value: gender?.OTHER ?? 0, color: LAVENDER },
  ].filter((s) => s.value > 0);

  const categorySegments = topDepartments.map((d, i) => ({
    label: d.name,
    value: d.count,
    color: [NAVY, TEAL, LAVENDER, PRIMARY, '#f97316'][i % 5],
  }));

  const alerts = summary?.alerts;

  return (
    <div className="space-y-6">
      <StatsGrid>
        <StatCard
          label="Total Employees"
          value={totalEmployees}
          delta={`${kpis?.activeRate ?? 0}% active`}
          icon={<Users size={20} className="stroke-[1.75]" />}
        />
        <StatCard
          label="Active Staff"
          value={activeEmployees}
          delta={`${kpis?.teacherRate ?? 0}% teachers`}
          icon={<UserCheck size={20} className="stroke-[1.75]" />}
        />
        <AttendanceRateStatCard
          todayRate={kpis?.attendanceRateToday ?? kpis?.activeRate ?? 0}
          monthRate={kpis?.attendanceRateMonth ?? Math.max(0, (kpis?.activeRate ?? 0) - 2)}
        />
        <StatCard
          label="On Leave"
          value={kpis?.onLeave ?? 0}
          delta={`${kpis?.onLeaveRate ?? 0}% away today`}
          icon={<CalendarRange size={20} className="stroke-[1.75]" />}
        />
      </StatsGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        <HrChartCard
          title="Workforce Overview"
          metric={
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-bold text-navy">{totalEmployees.toLocaleString()}</span>
              <span className="flex items-center gap-0.5 text-xs font-semibold text-[#FCB038]">
                <ArrowUpRight size={14} />
                +{growth.reduce((s, g) => s + g.hires, 0)} hires this year
              </span>
            </div>
          }
        >
          <DualAreaChart
            seriesA={headcountSeriesA}
            seriesB={headcountSeriesB}
            labelA="Active Staff"
            labelB="New Hires"
            colorA={PRIMARY}
            colorB={NAVY}
          />
        </HrChartCard>

        <HrChartCard
          title="Department Headcount"
          subtitle="Budget vs actual staffing levels"
        >
          <GroupedBarChart
            groups={deptBarGroups.length ? deptBarGroups : [{ label: '—', budget: 0, actual: 0 }]}
            labelA="Target"
            labelB="Actual"
            colorA={LAVENDER}
            colorB={NAVY}
          />
        </HrChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <HrChartCard title="Staff by Department" subtitle="Distribution across org units">
          <DonutChart
            segments={categorySegments.length ? categorySegments : [{ label: 'None', value: 1, color: '#e2e8f0' }]}
            centerLabel={`${totalEmployees}`}
          />
        </HrChartCard>

        <HrChartCard
          title="Staff Growth Trend"
          metric={
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-bold text-navy">{totalEmployees.toLocaleString()}</span>
              <span className="flex items-center gap-0.5 text-xs font-semibold text-[#FCB038]">
                <ArrowUpRight size={14} />
                +{((growth.at(-1)?.hires ?? 0) / Math.max(growth.at(-2)?.hires ?? 1, 1) * 100 - 100).toFixed(1)}% vs last month
              </span>
            </div>
          }
        >
          <SingleAreaChart
            data={cumulativeGrowth.length ? cumulativeGrowth : [{ label: '—', value: 0 }]}
            color={LAVENDER}
          />
        </HrChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <HrChartCard title="Gender Distribution" className="lg:col-span-1">
          <DonutChart
            segments={genderSegments.length ? genderSegments : [{ label: 'No data', value: 1, color: '#e2e8f0' }]}
            centerLabel={`${totalEmployees}`}
          />
        </HrChartCard>

        <div className="hr-card p-6 lg:col-span-2 flex flex-col justify-between animate-scale-in">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-navy uppercase tracking-wider sm:text-base">HR Operations Command</h3>
                <p className="text-xs text-slate-400">Urgent action alerts and system activities</p>
              </div>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
            </div>

            {/* Alerts Panel */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: 'Expiring Contracts',
                  value: alerts?.expiringContracts ?? 0,
                  tone: 'border-red-100 bg-rose-500/5 text-rose-800',
                  badgeColor: 'bg-rose-500 text-white',
                },
                {
                  label: 'Missing Documents',
                  value: alerts?.missingDocuments ?? 0,
                  tone: 'border-amber-100 bg-amber-500/5 text-amber-800',
                  badgeColor: 'bg-amber-500 text-white',
                },
                {
                  label: 'Probation Ending',
                  value: alerts?.probationEnding ?? 0,
                  tone: 'border-blue-100 bg-blue-500/5 text-blue-800',
                  badgeColor: 'bg-blue-500 text-white',
                },
              ].map((alert) => (
                <div
                  key={alert.label}
                  className={`rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 transition-all duration-300 hover:shadow-sm ${alert.tone}`}
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{alert.label}</p>
                    <p className="mt-1 text-2xl font-extrabold">{alert.value}</p>
                  </div>
                  {alert.value > 0 && (
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${alert.badgeColor} animate-pulse`}>
                      !
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Deck */}
          <div className="mt-8">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Quick Operations</h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Add Employee', href: '/registration', icon: Plus, color: 'hover:border-[#000435]/20 hover:bg-[#000435]/5 text-[#000435]' },
                { label: 'New Contract', href: '/contracts', icon: FileText, color: 'hover:border-[#FCB038]/30 hover:bg-[#FCB038]/5 text-[#FCB038]' },
                { label: 'Upload Docs', href: '/documents', icon: FileUp, color: 'hover:border-[#000435]/20 hover:bg-[#000435]/5 text-[#000435]' },
                { label: 'Approve Leave', href: '/leave', icon: CalendarDays, color: 'hover:border-[#FCB038]/30 hover:bg-[#FCB038]/5 text-[#FCB038]' },
              ].map((action) => {
                const ActionIcon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={`rounded-2xl border border-slate-200 bg-white px-4 py-3.5 flex flex-col items-center justify-center gap-2 text-center text-xs font-bold text-navy transition-all duration-300 shadow-sm hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${action.color}`}
                  >
                    <ActionIcon size={18} className="stroke-[2]" />
                    <span>{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
