'use client';

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const tones: Record<string, string> = {
    open: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    closed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    'under review': 'bg-amber-50 text-amber-700 ring-amber-600/20',
    pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    rejected: 'bg-red-50 text-red-700 ring-red-600/20',
    cancelled: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    canceled: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    completed: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    overdue: 'bg-red-50 text-red-700 ring-red-600/20',
    out: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    high: 'bg-red-50 text-red-700 ring-red-600/20',
    medium: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    low: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  };
  const tone = tones[s] ?? 'bg-slate-100 text-slate-700 ring-slate-500/20';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone}`}>
      {status}
    </span>
  );
}
