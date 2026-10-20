'use client';

import { useAuth } from '@/contexts/auth-context';
import { TaskPageLayout } from '@/components/task-page-layout';
import { BarChart3, Workflow, Clock, Target } from 'lucide-react';

export function ReportsView() {
  const { summary } = useAuth();
  const kpis = summary?.kpis;
  const workflow = summary?.workflowStats;

  return (
    <TaskPageLayout title="Reports & Analytics" subtitle="Performance insights and metrics">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total Tasks', value: kpis?.totalTasks ?? 0, icon: Target },
          { label: 'Completion Rate', value: `${kpis?.completionRate ?? 0}%`, icon: BarChart3 },
          { label: 'Active Workflows', value: workflow?.activeInstances ?? 0, icon: Workflow },
          { label: 'Exec Rate', value: `${workflow?.executionRate ?? 0}%`, icon: Workflow },
          { label: 'SLA Compliance', value: `${kpis?.slaCompliance ?? 100}%`, icon: Target },
          { label: 'Avg Completion', value: `${kpis?.avgCompletionTime ?? 0}h`, icon: Clock },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-sm text-center">
            <c.icon size={20} className="mx-auto text-ochre" />
            <p className="mt-2 text-2xl font-bold text-navy">{c.value}</p>
            <p className="text-[10px] uppercase text-muted">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-navy">Task Performance</h3>
          <div className="mt-4 space-y-3">
            {Object.entries(summary?.tasksByStatus ?? {}).map(([status, count]) => {
              const total = kpis?.totalTasks ?? 1;
              const pct = Math.round(((count as number) / total) * 100);
              const barColors: Record<string, string> = {
                TODO: 'bg-slate-400', IN_PROGRESS: 'bg-blue-500', REVIEW: 'bg-amber-500',
                DONE: 'bg-green-500', CANCELLED: 'bg-red-400',
              };
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm">
                    <span>{status.replace(/_/g, ' ')}</span>
                    <span className="text-muted">{count as number} ({pct}%)</span>
                  </div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${barColors[status] ?? 'bg-slate-300'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-navy">Priority Distribution</h3>
          <div className="mt-4 space-y-3">
            {Object.entries(summary?.tasksByPriority ?? {}).map(([priority, count]) => {
              const total = kpis?.totalTasks ?? 1;
              const pct = Math.round(((count as number) / total) * 100);
              const barColors: Record<string, string> = {
                CRITICAL: 'bg-red-500', HIGH: 'bg-orange-500', MEDIUM: 'bg-amber-400', LOW: 'bg-slate-300',
              };
              return (
                <div key={priority}>
                  <div className="flex justify-between text-sm">
                    <span>{priority}</span>
                    <span className="text-muted">{count as number} ({pct}%)</span>
                  </div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${barColors[priority] ?? 'bg-slate-300'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-navy">Department Workload</h3>
          <div className="mt-4 space-y-2">
            {(summary?.departmentWorkload ?? []).map((d) => (
              <div key={d.departmentId} className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-navy">{d.departmentName}</span>
                  <span className="text-muted">{d.activeTasks} active / {d.totalTasks} total</span>
                </div>
                {d.totalTasks > 0 && (
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-ochre" style={{ width: `${Math.round((d.completedTasks / d.totalTasks) * 100)}%` }} />
                  </div>
                )}
              </div>
            ))}
            {(!summary?.departmentWorkload || summary.departmentWorkload.length === 0) && (
              <p className="text-sm text-muted">No department data</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-navy">Employee Performance</h3>
          <div className="mt-4 space-y-2">
            {(summary?.employeeWorkload ?? []).slice(0, 10).map((w) => (
              <div key={w.userId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm font-medium text-navy">{w.userName}</span>
                <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-navy">{w.activeTasks} tasks</span>
              </div>
            ))}
            {(!summary?.employeeWorkload || summary.employeeWorkload.length === 0) && (
              <p className="text-sm text-muted">No employee data</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-navy">Activity Log</h3>
        <div className="mt-4 space-y-2">
          {(summary?.recentActivity ?? []).slice(0, 15).map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <div>
                <span className="text-sm font-medium text-navy">{a.userName ?? 'System'}</span>
                <span className="ml-2 text-sm text-muted">{a.action.replace(/_/g, ' ').toLowerCase()}</span>
                <span className="ml-1 text-xs text-muted">({a.entityType})</span>
              </div>
              <span className="text-[10px] text-muted">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </TaskPageLayout>
  );
}
