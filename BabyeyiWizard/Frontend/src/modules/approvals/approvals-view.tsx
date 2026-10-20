'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { useToast } from '@/shared/notifications';
import { actOnApproval, fetchApprovals } from '@/services/babyeyi-api';

export function ApprovalsView() {
  const toast = useToast();
  const [data, setData] = useState<{ pending: Array<{ id: string; stage: string; circular: { id: string; className: string; authorName?: string; increaseReason?: string; createdAt: string } }>; counts: Record<string, number>; total: number } | null>(null);

  async function load() {
    try {
      setData(await fetchApprovals());
    } catch {
      toast.error('Failed to load approvals');
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleAction(circularId: string, stage: string, action: string) {
    try {
      await actOnApproval(circularId, stage, action);
      toast.success(`Circular ${action.toLowerCase()}`);
      void load();
    } catch {
      toast.error('Action failed');
    }
  }

  return (
    <div className="space-y-6">
      <StatsGrid>
        <StatCard label="Pending" value={data?.total ?? 0} icon={<MessageSquare size={20} />} />
        <StatCard label="Waiting Director" value={data?.counts.director ?? 0} />
        <StatCard label="Waiting Accountant" value={data?.counts.accountant ?? 0} />
        <StatCard label="Waiting District" value={data?.counts.district ?? 0} />
        <StatCard label="Waiting NESA" value={data?.counts.nesa ?? 0} />
      </StatsGrid>

      <div className="space-y-4">
        {(data?.pending ?? []).map((item) => (
          <article key={item.id} className="hr-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-navy">{item.circular.className} Circular</h3>
                <p className="text-sm text-muted">Requested by {item.circular.authorName ?? '—'}</p>
                <p className="text-xs text-muted">Stage: {item.stage} · {new Date(item.circular.createdAt).toLocaleDateString()}</p>
                {item.circular.increaseReason && <p className="mt-2 text-sm text-amber-700">Reason: {item.circular.increaseReason}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void handleAction(item.circular.id, item.stage, 'APPROVED')} className="btn-primary text-xs"><CheckCircle2 size={14} /> Approve</button>
                <button type="button" onClick={() => void handleAction(item.circular.id, item.stage, 'REJECTED')} className="btn-secondary text-xs text-danger"><XCircle size={14} /> Reject</button>
                <button type="button" onClick={() => void handleAction(item.circular.id, item.stage, 'CHANGES_REQUESTED')} className="btn-secondary text-xs">Request Changes</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
