'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { ModuleTile } from '@/components/module-tile';
import { SUB_PAGES } from '@/config/task-nav';
import { StatusBadge } from '@/components/status-badge';

export function DashboardView() {
  const { summary } = useAuth();
  const kpis = summary?.kpis;
  const maxActivity = Math.max(
    ...(summary?.dailyActivity.map((d) => d.created + d.completed) ?? [1]),
    1
  );

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-navy px-6 py-8 text-white shadow-lg sm:px-8 sm:py-10">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10" />
        <div className="relative">
          <h1 className="text-2xl font-bold sm:text-3xl">Task & Workflow Center</h1>
          <p className="mt-1 text-sm text-white/70">
            Command center for {summary?.organizationName}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total Tasks', value: kpis?.totalTasks ?? 0 },
              { label: 'Active Tasks', value: kpis?.activeTasks ?? 0 },
              { label: 'Completed', value: kpis?.completedTasks ?? 0, hint: `${kpis?.completionRate ?? 0}% rate` },
              { label: 'Overdue', value: kpis?.overdueTasks ?? 0, hint: kpis?.overdueTasks ? 'Needs attention' : 'All clear' },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-white/60">{k.label}</p>
                <p className="mt-1 text-2xl font-bold">{k.value}</p>
                {k.hint && <p className="text-[11px] text-white/50">{k.hint}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted">Pending Approvals</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{kpis?.pendingApprovals ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted">SLA Compliance</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{kpis?.slaCompliance ?? 100}%</p>
        </div>
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted">Workflow Exec Rate</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{summary?.workflowStats.executionRate ?? 0}%</p>
        </div>
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted">Avg Completion</p>
          <p className="mt-2 text-3xl font-bold text-navy">{kpis?.avgCompletionTime ?? 0}h</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tasks by Status */}
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-navy">Tasks by Status</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(summary?.tasksByStatus ?? {}).map(([status, count]) => {
              const total = kpis?.totalTasks ?? 1;
              const pct = Math.round(((count as number) / total) * 100);
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm">
                    <StatusBadge status={status} />
                    <span className="text-muted">{count as number}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-ochre to-gold"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tasks by Priority */}
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-navy">Tasks by Priority</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(summary?.tasksByPriority ?? {}).map(([priority, count]) => {
              const total = kpis?.totalTasks ?? 1;
              const pct = Math.round(((count as number) / total) * 100);
              const colors: Record<string, string> = {
                CRITICAL: 'bg-red-500',
                HIGH: 'bg-orange-500',
                MEDIUM: 'bg-amber-400',
                LOW: 'bg-slate-300',
              };
              return (
                <div key={priority}>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${colors[priority] ?? 'bg-slate-300'}`} />
                      {priority}
                    </span>
                    <span className="text-muted">{count as number}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${colors[priority] ?? 'bg-slate-300'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity Timeline & Workload */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily Activity */}
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-navy">Daily Task Activity (30 days)</h2>
          <div className="mt-4 flex h-32 items-end gap-0.5">
            {(summary?.dailyActivity ?? []).slice(-30).map((d) => (
              <div key={d.date} className="group relative flex flex-1 flex-col items-center gap-0.5">
                <div className="flex w-full flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-t bg-blue-400"
                    style={{ height: `${Math.max(2, (d.completed / maxActivity) * 100)}%` }}
                  />
                  <div
                    className="w-full rounded-t bg-primary/60"
                    style={{ height: `${Math.max(2, (d.created / maxActivity) * 100)}%` }}
                  />
                </div>
                <span className="text-[8px] text-muted">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-4 text-[10px] text-muted">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary/60" /> Created</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-400" /> Completed</span>
          </div>
        </div>

        {/* Employee Workload */}
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-navy">Employee Workload</h2>
          <div className="mt-4 space-y-2">
            {(summary?.employeeWorkload ?? []).slice(0, 8).map((w) => (
              <div key={w.userId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm font-medium text-navy">{w.userName}</span>
                <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-navy">
                  {w.activeTasks} tasks
                </span>
              </div>
            ))}
            {(!summary?.employeeWorkload || summary.employeeWorkload.length === 0) && (
              <p className="text-sm text-muted">No workload data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottlenecks & Recent Tasks */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bottleneck Workflows */}
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-navy">Bottleneck Workflows</h2>
          <div className="mt-4 space-y-3">
            {(summary?.bottleneckWorkflows ?? []).map((b) => (
              <div key={b.instanceId} className="rounded-xl bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-800">{b.workflowName}</p>
                <p className="text-xs text-red-600">
                  Stuck at: {b.currentStep} &middot; {b.daysInQueue} days
                </p>
                <p className="text-xs text-red-500">Assignee: {b.assignee}</p>
              </div>
            ))}
            {(!summary?.bottleneckWorkflows || summary.bottleneckWorkflows.length === 0) && (
              <p className="text-sm text-green-600">No bottlenecks detected</p>
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-navy">Recent Tasks</h2>
            <Link href="/tasks" className="text-xs text-ochre hover:underline">View all</Link>
          </div>
          <div className="mt-4 space-y-2">
            {(summary?.recentTasks ?? []).slice(0, 6).map((t) => (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 transition hover:border-ochre/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy">{t.title}</p>
                  <p className="text-xs text-muted">
                    {t.assignedToName ?? 'Unassigned'} &middot; {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No due date'}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-navy">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Create Task', href: '/tasks?action=new' },
            { label: 'Kanban Board', href: '/board' },
            { label: 'Build Workflow', href: '/workflow-builder' },
            { label: 'View Reports', href: '/reports' },
            { label: 'Notifications', href: '/notifications' },
            { label: 'Time Tracking', href: '/time-tracking' },
            { label: 'Calendar', href: '/calendar' },
            { label: 'Settings', href: '/settings' },
          ].map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-center text-xs font-medium text-navy transition hover:border-amber-300"
            >
              {q.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Module Tiles */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-bold text-navy">Task Center Modules</h2>
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
      </section>
    </div>
  );
}