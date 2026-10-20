'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import type { ActionPlan } from '@/types';

export function GanttView() {
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apApi.listPlans({ limit: 50 })
      .then(({ data }) => setPlans(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">
        <Loader2 className="mr-2 animate-spin" size={16} />
        Loading Gantt chart…
      </div>
    );
  }

  // Calculate date range
  const dates = plans.flatMap((p) => [new Date(p.startDate), new Date(p.dueDate)]);
  const minDate = dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date();
  const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : new Date();
  const totalDays = Math.max((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24), 30);
  const todayOffset = (new Date().getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);

  return (
    <ApPageLayout
      title="Gantt Chart"
      subtitle="Timeline view of all action plans"
    >
      {/* Month headers */}
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <div className="sticky top-0 border-b border-border bg-slate-50">
          <div className="flex" style={{ minWidth: `${totalDays * 2 + 300}px` }}>
            <div className="w-[300px] shrink-0 p-3 text-xs font-semibold text-navy">Action Plan</div>
            {Array.from({ length: Math.ceil(totalDays / 30) }, (_, i) => {
              const month = new Date(minDate);
              month.setMonth(month.getMonth() + i);
              return (
                <div
                  key={i}
                  className="shrink-0 border-l border-border p-2 text-center text-[10px] font-medium text-muted uppercase"
                  style={{ width: `${Math.min(30 * 2, (totalDays - i * 30) * 2)}px` }}
                >
                  {month.toLocaleString('default', { month: 'short', year: '2-digit' })}
                </div>
              );
            })}
          </div>
        </div>
        <div className="divide-y divide-border">
          {plans.map((plan) => {
            const startOffset = (new Date(plan.startDate).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
            const duration = Math.max((new Date(plan.dueDate).getTime() - new Date(plan.startDate).getTime()) / (1000 * 60 * 60 * 24), 1);
            const color =
              plan.status === 'COMPLETED' ? 'bg-green-400' :
              plan.status === 'IN_PROGRESS' ? 'bg-blue-400' :
              plan.status === 'CANCELLED' ? 'bg-red-300' :
              plan.status === 'DRAFT' ? 'bg-slate-300' :
              'bg-amber-300';

            return (
              <div key={plan.id} className="flex" style={{ minWidth: `${totalDays * 2 + 300}px` }}>
                <div className="w-[300px] shrink-0 p-3">
                  <p className="truncate text-xs font-medium text-navy">{plan.title}</p>
                  <p className="text-[10px] text-muted">
                    {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="relative flex-1 p-2">
                  <div
                    className={`absolute top-2 h-6 rounded-full ${color} opacity-80`}
                    style={{
                      left: `${startOffset * 2}px`,
                      width: `${Math.max(duration * 2, 8)}px`,
                    }}
                  >
                    <div
                      className="h-full rounded-full bg-black/10"
                      style={{ width: `${plan.progress}%` }}
                    />
                  </div>
                  {/* Today line */}
                  {todayOffset >= 0 && todayOffset <= totalDays && (
                    <div
                      className="absolute top-0 h-full w-0.5 bg-red-400"
                      style={{ left: `${todayOffset * 2}px` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ApPageLayout>
  );
}
