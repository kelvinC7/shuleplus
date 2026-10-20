'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, RotateCcw, Clock, Loader2 } from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { useApPermissions } from '@/hooks/use-ap-permissions';
import type { ActionPlan } from '@/types';

export function ApprovalsView() {
  const { can } = useApPermissions();
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apApi.listPlans({ limit: 100 })
      .then(({ data }) => setPlans(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pendingApprovals = plans
    .filter((p) => p.status === 'SUBMITTED' || p.status === 'PENDING_APPROVAL')
    .flatMap((p) =>
      (p.approvals ?? [])
        .filter((a) => a.status === 'PENDING')
        .map((a) => ({ ...a, planTitle: p.title, planId: p.id, plan: p }))
    );

  async function handleApprove(planId: string, level: number, status: 'APPROVED' | 'REJECTED' | 'RETURNED') {
    try {
      await apApi.approve(planId, level, { status });
      const { data } = await apApi.listPlans({ limit: 100 });
      setPlans(data.data);
    } catch (err) { console.error(err); }
  }

  return (
    <ApPageLayout
      title="Approvals"
      subtitle="Review and process approval requests"
      kpis={[
        { label: 'Pending', value: pendingApprovals.length },
        { label: 'Plans in Workflow', value: plans.filter((p) => p.status === 'SUBMITTED' || p.status === 'PENDING_APPROVAL').length },
      ]}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted">
          <Loader2 className="mr-2 animate-spin" size={16} />
          Loading…
        </div>
      ) : pendingApprovals.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted">No pending approvals</div>
      ) : (
        <div className="space-y-3">
          {pendingApprovals.map((item) => (
            <div key={item.id} className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <Clock size={18} />
                  </div>
                  <div>
                    <Link href={`/plans/${item.planId}`} className="text-sm font-semibold text-navy hover:text-ochre">
                      {item.planTitle}
                    </Link>
                    <p className="text-xs text-muted">
                      Level {item.level}: {item.role}
                      {item.plan.department && ` · ${item.plan.department}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.plan.priority} />
                  <StatusBadge status={item.plan.status} />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                {can('plan.approve') ? (
                  <>
                    <button onClick={() => handleApprove(item.planId, item.level, 'APPROVED')} className="btn-primary !py-1.5 !px-3 text-xs">
                      <CheckCircle size={12} />
                      Approve
                    </button>
                    <button onClick={() => handleApprove(item.planId, item.level, 'REJECTED')} className="btn-danger !py-1.5 !px-3 text-xs">
                      <XCircle size={12} />
                      Reject
                    </button>
                    <button onClick={() => handleApprove(item.planId, item.level, 'RETURNED')} className="btn-secondary !py-1.5 !px-3 text-xs">
                      <RotateCcw size={12} />
                      Return
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-muted">You do not have permission to approve plans.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </ApPageLayout>
  );
}
