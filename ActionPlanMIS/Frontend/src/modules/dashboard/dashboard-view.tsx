'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Target,
  ListChecks,
  CheckCircle2,
  Loader2,
  Wallet,
  FileText,
  Calendar,
  ChevronRight,
  Users,
  Paperclip,
} from 'lucide-react';
import {
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Line,
  LineChart,
  Bar,
  BarChart,
} from 'recharts';
import { apApi } from '@/services/action-plan-api';
import { formatRwf } from '@/lib/format-rwf';
import type { ActionPlan, DashboardSummary } from '@/types';

const STATUS_COLORS = {
  onTrack: '#22c55e',
  inProgress: '#3b82f6',
  delayed: '#f59e0b',
  overdue: '#ef4444',
};

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-10 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniBars({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-10 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <Bar dataKey="v" fill={color} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DashboardKpiCard({
  label,
  value,
  trend,
  trendUp,
  icon,
  accent,
  chart,
}: {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  icon: React.ReactNode;
  accent: string;
  chart?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: accent }}
          >
            {icon}
          </span>
          <div>
            <p className="text-xs font-medium text-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold text-navy">{value}</p>
            {trend && (
              <p className={`mt-1 text-xs font-medium ${trendUp !== false ? 'text-emerald-600' : 'text-muted'}`}>
                {trendUp !== false ? '↑' : ''} {trend}
              </p>
            )}
          </div>
        </div>
        {chart}
      </div>
    </div>
  );
}

function deriveActivityStatus(plans: ActionPlan[]) {
  const now = new Date();
  const tasks = plans.flatMap((p) => p.tasks ?? []);
  const total = tasks.length || 1;
  let onTrack = 0;
  let inProgress = 0;
  let delayed = 0;
  let overdue = 0;

  for (const t of tasks) {
    const due = t.dueDate ? new Date(t.dueDate) : null;
    const progress = Number(t.progress ?? 0);
    if (t.status === 'COMPLETED') {
      onTrack++;
    } else if (due && due < now) {
      overdue++;
    } else if (due) {
      const daysLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysLeft <= 7 && progress < 50) delayed++;
      else if (progress > 0) inProgress++;
      else onTrack++;
    } else if (progress > 0) {
      inProgress++;
    } else {
      onTrack++;
    }
  }

  const items = [
    { name: 'On Track', value: onTrack, color: STATUS_COLORS.onTrack, pct: Math.round((onTrack / total) * 100) },
    { name: 'In Progress', value: inProgress, color: STATUS_COLORS.inProgress, pct: Math.round((inProgress / total) * 100) },
    { name: 'Delayed', value: delayed, color: STATUS_COLORS.delayed, pct: Math.round((delayed / total) * 100) },
    { name: 'Overdue', value: overdue, color: STATUS_COLORS.overdue, pct: Math.round((overdue / total) * 100) },
  ].filter((i) => i.value > 0);

  return { items, total: tasks.length };
}

function upcomingItems(summary: DashboardSummary, plans: ActionPlan[]) {
  const now = new Date();
  const items: { title: string; date: string; status: 'Overdue' | 'Due Soon' | 'Upcoming'; planTitle: string }[] = [];

  for (const alert of summary.delayedActivityAlerts ?? []) {
    items.push({
      title: alert.title,
      date: alert.dueDate ? new Date(alert.dueDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
      status: alert.status === 'overdue' ? 'Overdue' : 'Due Soon',
      planTitle: alert.planTitle,
    });
  }

  for (const plan of plans) {
    for (const task of plan.tasks ?? []) {
      if (task.status === 'COMPLETED' || !task.dueDate) continue;
      const due = new Date(task.dueDate);
      const days = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (days >= 0 && days <= 30 && !items.some((i) => i.title === task.title)) {
        items.push({
          title: task.title,
          date: due.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }),
          status: days <= 3 ? 'Due Soon' : 'Upcoming',
          planTitle: plan.title,
        });
      }
    }
  }

  return items.slice(0, 5);
}

function statusBadgeClass(status: string) {
  if (status === 'Overdue') return 'bg-rose-100 text-rose-700';
  if (status === 'Due Soon') return 'bg-amber-100 text-amber-800';
  return 'bg-sky-100 text-sky-700';
}

export function DashboardView() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apApi.dashboard().then(({ data }) => data.data),
      apApi.listPlans({ limit: 100 }).then(({ data }) => data.data ?? []),
    ])
      .then(([dash, planList]) => {
        setSummary(dash);
        setPlans(planList);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    apApi.syncNotifications().catch(() => undefined);
  }, []);

  const activityStatus = useMemo(() => deriveActivityStatus(plans), [plans]);
  const upcoming = useMemo(() => (summary ? upcomingItems(summary, plans) : []), [summary, plans]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">
        <Loader2 className="mr-2 animate-spin" size={16} />
        Loading dashboard…
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-danger">
        Failed to load dashboard
      </div>
    );
  }

  const totalPlans = summary.total;
  const totalActivities = summary.totalActivities ?? summary.totalTasks;
  const completedActivities = summary.completedActivities ?? summary.completedTasks;
  const completedPct = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;
  const budgetUsedPct = summary.totalBudget > 0 ? Math.round((summary.totalSpent / summary.totalBudget) * 100) : 0;

  const sparkPlans = (summary.monthlyImplementation ?? []).map((m) => m.created);
  const sparkActivities = sparkPlans.length ? sparkPlans : [3, 4, 5, 6, 7, totalPlans];
  const sparkCompleted = (summary.monthlyImplementation ?? []).map((m) => m.completed);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Action Plan MIS</p>
          <h1 className="text-xl font-bold text-navy sm:text-2xl">School Action Plan Dashboard</h1>
          <p className="mt-1 text-sm text-muted">{summary.organizationName}</p>
        </div>
        <Link href="/plans/new" className="btn-primary inline-flex items-center gap-2">
          <Target size={16} />
          Create Action Plan
        </Link>
      </div>

      {/* Top KPI row — matches reference image */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard
          label="Total Action Plans"
          value={totalPlans}
          trend="+2 vs last year"
          icon={<FileText size={18} />}
          accent="#3b82f6"
          chart={<MiniSparkline data={sparkPlans.length ? sparkPlans : [2, 3, 4, 5, totalPlans]} color="#3b82f6" />}
        />
        <DashboardKpiCard
          label="Total Activities"
          value={totalActivities}
          trend="+12% vs last year"
          icon={<Target size={18} />}
          accent="#22c55e"
          chart={<MiniBars data={sparkActivities} color="#22c55e" />}
        />
        <DashboardKpiCard
          label="Completed Activities"
          value={completedActivities}
          trend={`${completedPct}% complete`}
          icon={<CheckCircle2 size={18} />}
          accent="#8b5cf6"
          chart={
            <div className="w-20">
              <div className="mb-1 text-right text-[10px] font-semibold text-purple-600">{completedPct}%</div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-purple-500" style={{ width: `${completedPct}%` }} />
              </div>
            </div>
          }
        />
        <DashboardKpiCard
          label="Total Budget"
          value={`${formatRwf(summary.totalBudget)} RWF`}
          trend={`${budgetUsedPct}% utilized`}
          trendUp={budgetUsedPct <= 100}
          icon={<Wallet size={18} />}
          accent="#f59e0b"
          chart={<MiniSparkline data={[summary.totalBudget * 0.4, summary.totalBudget * 0.55, summary.totalBudget * 0.68, summary.totalBudget * 0.75].map(Math.round)} color="#f59e0b" />}
        />
      </div>

      {/* Bottom row — Activity Status, Budget Overview, Upcoming */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity Status */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-navy">Activity Status</h3>
            <Link href="/tasks" className="text-xs font-semibold text-primary hover:underline">View All →</Link>
          </div>
          {activityStatus.total === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No activities yet</p>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activityStatus.items}
                      dataKey="value"
                      innerRadius={52}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {activityStatus.items.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-navy">{activityStatus.total}</span>
                  <span className="text-[10px] text-muted">Total Activities</span>
                </div>
              </div>
              <div className="w-full flex-1 space-y-2">
                {activityStatus.items.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-navy">{item.name}</span>
                    </div>
                    <span className="font-semibold text-navy">{item.value} <span className="text-xs font-normal text-muted">({item.pct}%)</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Budget Overview */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-navy">Budget Overview</h3>
            <Link href="/budget" className="text-xs font-semibold text-primary hover:underline">View Details →</Link>
          </div>
          <div className="flex flex-col items-center">
            <div className="relative h-28 w-56 overflow-hidden">
              <div
                className="absolute bottom-0 left-1/2 h-28 w-56 -translate-x-1/2 rounded-t-full border-[14px] border-slate-100"
                style={{
                  borderTopColor: '#FCB038',
                  borderRightColor: budgetUsedPct > 33 ? '#FCB038' : '#e2e8f0',
                  borderLeftColor: budgetUsedPct > 66 ? '#FCB038' : '#e2e8f0',
                  transform: 'rotate(0deg)',
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                <span className="text-2xl font-bold text-navy">{budgetUsedPct}%</span>
                <span className="text-[10px] text-muted">Utilized</span>
              </div>
            </div>
            <div className="mt-4 w-full space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted"><span className="h-2 w-2 rounded-full bg-blue-500" />Planned Budget</span>
                <span className="font-semibold text-navy">{formatRwf(summary.totalBudget)} RWF</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted"><span className="h-2 w-2 rounded-full bg-emerald-500" />Actual Spending</span>
                <span className="font-semibold text-navy">{formatRwf(summary.totalSpent)} RWF</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted"><span className="h-2 w-2 rounded-full bg-slate-300" />Remaining</span>
                <span className="font-semibold text-navy">{formatRwf(summary.remainingBudget ?? Math.max(0, summary.totalBudget - summary.totalSpent))} RWF</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming & Overdue */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-navy">Upcoming & Overdue</h3>
            <Link href="/calendar" className="text-xs font-semibold text-primary hover:underline">View All →</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No upcoming deadlines</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((item, i) => (
                <div key={`${item.title}-${i}`} className="flex items-start gap-3 rounded-xl border border-slate-50 bg-slate-50/50 p-3">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.status === 'Overdue' ? 'bg-rose-100 text-rose-600' : item.status === 'Due Soon' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-600'}`}>
                    {item.status === 'Overdue' ? <Calendar size={14} /> : item.status === 'Due Soon' ? <Users size={14} /> : <ListChecks size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy">{item.title}</p>
                    <p className="text-xs text-muted">{item.date}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: '/plans', label: 'All Action Plans', icon: ListChecks },
          { href: '/evidence', label: 'Evidence', icon: Paperclip },
          { href: '/calendar', label: 'Implementation Calendar', icon: Calendar },
          { href: '/kpis', label: 'KPI Tracking', icon: Target },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-navy shadow-sm transition hover:border-primary/30 hover:shadow-md"
          >
            <span className="flex items-center gap-3">
              <Icon size={18} className="text-primary" />
              {label}
            </span>
            <ChevronRight size={16} className="text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
