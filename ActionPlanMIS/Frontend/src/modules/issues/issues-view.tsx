'use client';

import { useEffect, useState } from 'react';
import { Bug, CheckCircle, Loader2 } from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import { StatusBadge } from '@/components/status-badge';
import type { ActionPlan } from '@/types';

export function IssuesView() {
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apApi.listPlans({ limit: 100 })
      .then(({ data }) => setPlans(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const allIssues = plans.flatMap((p) =>
    (p.issues ?? []).map((i) => ({ ...i, planTitle: p.title, planId: p.id }))
  );

  const open = allIssues.filter((i) => i.status === 'OPEN');
  const resolved = allIssues.filter((i) => i.status === 'RESOLVED');

  return (
    <ApPageLayout
      title="Issue Tracking"
      subtitle="Track and resolve issues across plans"
      kpis={[
        { label: 'Total Issues', value: allIssues.length },
        { label: 'Open', value: open.length },
        { label: 'Resolved', value: resolved.length },
        { label: 'Resolution Rate', value: allIssues.length > 0 ? `${Math.round((resolved.length / allIssues.length) * 100)}%` : '—' },
      ]}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted">
          <Loader2 className="mr-2 animate-spin" size={16} />
          Loading…
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Open Issues</h3>
            {open.length === 0 ? (
              <p className="text-sm text-muted">No open issues</p>
            ) : (
              <div className="space-y-2">
                {open.map((issue) => (
                  <div key={issue.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <Bug size={16} className={`shrink-0 ${
                      issue.severity === 'CRITICAL' ? 'text-red-500' :
                      issue.severity === 'HIGH' ? 'text-orange-500' : 'text-amber-500'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-navy">{issue.title}</p>
                        <StatusBadge status={issue.severity} />
                        <StatusBadge status={issue.priority} />
                      </div>
                      <p className="text-xs text-muted">
                        {issue.planTitle}
                        {issue.assignedTo && ` · Assigned to: ${issue.assignedTo}`}
                      </p>
                    </div>
                    <StatusBadge status={issue.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Resolved Issues</h3>
            {resolved.length === 0 ? (
              <p className="text-sm text-muted">No resolved issues</p>
            ) : (
              <div className="space-y-2">
                {resolved.map((issue) => (
                  <div key={issue.id} className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50/50 p-3">
                    <CheckCircle size={16} className="shrink-0 text-green-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-green-800">{issue.title}</p>
                      <p className="text-xs text-green-600">
                        Resolved{issue.resolvedAt ? ` ${new Date(issue.resolvedAt).toLocaleDateString()}` : ''}
                        {issue.resolution && ` · ${issue.resolution}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </ApPageLayout>
  );
}
