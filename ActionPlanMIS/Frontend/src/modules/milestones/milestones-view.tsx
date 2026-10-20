'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import type { ActionPlan, Milestone } from '@/types';

export function MilestonesView() {
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apApi.listPlans({ limit: 100 })
      .then(({ data }) => setPlans(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const allMilestones = plans.flatMap((p) =>
    (p.milestones ?? []).map((m) => ({ ...m, planTitle: p.title, planId: p.id }))
  ).sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

  const completed = allMilestones.filter((m) => m.isCompleted);
  const upcoming = allMilestones.filter((m) => !m.isCompleted);

  return (
    <ApPageLayout
      title="Milestones"
      subtitle="Track key deliverables across all action plans"
      kpis={[
        { label: 'Total Milestones', value: allMilestones.length },
        { label: 'Completed', value: completed.length },
        { label: 'Upcoming', value: upcoming.length },
        { label: 'Completion Rate', value: allMilestones.length > 0 ? `${Math.round((completed.length / allMilestones.length) * 100)}%` : '0%' },
      ]}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted">
          <Loader2 className="mr-2 animate-spin" size={16} />
          Loading…
        </div>
      ) : allMilestones.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted">No milestones found across plans</div>
      ) : (
        <div className="space-y-6">
          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Upcoming Milestones</h3>
            <div className="space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted">All milestones completed!</p>
              ) : (
                upcoming.map((ms) => (
                  <div key={ms.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <Circle size={16} className="shrink-0 text-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-navy">{ms.title}</p>
                      <p className="text-xs text-muted">
                        {ms.planTitle} · Target: {new Date(ms.targetDate).toLocaleDateString()}
                        {ms.responsiblePerson && ` · ${ms.responsiblePerson}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${ms.progress}%` }} />
                      </div>
                      <span className="text-xs text-muted">{ms.progress}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Completed Milestones</h3>
            <div className="space-y-3">
              {completed.length === 0 ? (
                <p className="text-sm text-muted">No completed milestones yet</p>
              ) : (
                completed.map((ms) => (
                  <div key={ms.id} className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50/50 p-3">
                    <CheckCircle size={16} className="shrink-0 text-green-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-green-800">{ms.title}</p>
                      <p className="text-xs text-green-600">
                        {ms.planTitle} · Completed: {ms.completedDate ? new Date(ms.completedDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </ApPageLayout>
  );
}
