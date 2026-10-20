export type RagStatus = 'on_track' | 'needs_attention' | 'critical' | 'pending_verification' | 'completed';

export interface RagInfo {
  status: RagStatus;
  label: string;
  progress: number;
  color: string;
  bg: string;
  dot: string;
}

/** RAG from progress % (time-based activities). */
export function ragFromProgress(progress: number, options?: { completed?: boolean; pendingVerification?: boolean }): RagInfo {
  if (options?.pendingVerification) return ragMeta('pending_verification', progress);
  if (options?.completed || progress >= 100) return ragMeta('completed', progress);
  if (progress >= 80) return ragMeta('on_track', progress);
  if (progress >= 50) return ragMeta('needs_attention', progress);
  return ragMeta('critical', progress);
}

/** RAG from KPI achievement (current vs target). */
export function ragFromKpi(current: number, target: number): RagInfo {
  if (target <= 0) return ragMeta('needs_attention', 0);
  const pct = Math.min(100, Math.round((current / target) * 100));
  return ragFromProgress(pct);
}

/** Activity delay detection. */
export function ragFromActivity(input: {
  progress: number;
  dueDate?: string | Date | null;
  status?: string;
  evidenceUploaded?: boolean;
  verified?: boolean;
}): RagInfo {
  const progress = Number(input.progress) || 0;
  const done = input.status === 'COMPLETED' || progress >= 100;

  if (done && input.verified) return ragMeta('completed', 100);
  if (done && !input.verified) return ragMeta('pending_verification', progress);

  const due = input.dueDate ? new Date(input.dueDate) : null;
  const now = new Date();

  if (due && due < now && !done) return ragMeta('critical', progress);

  if (due) {
    const daysLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysLeft <= 7 && progress < 50) return ragMeta('needs_attention', progress);
  }

  return ragFromProgress(progress);
}

function ragMeta(status: RagStatus, progress: number): RagInfo {
  const map: Record<RagStatus, Omit<RagInfo, 'status' | 'progress'>> = {
    on_track: { label: 'On Track', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
    needs_attention: { label: 'Needs Attention', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
    critical: { label: 'Critical / Delayed', color: 'text-rose-700', bg: 'bg-rose-50', dot: 'bg-rose-500' },
    pending_verification: { label: 'Pending Verification', color: 'text-sky-700', bg: 'bg-sky-50', dot: 'bg-sky-500' },
    completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  };
  return { status, progress, ...map[status] };
}
