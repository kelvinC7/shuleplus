export function formatRwf(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(amount)) return 'RWF —';
  return `RWF ${Math.round(amount).toLocaleString('en-US')}`;
}

export function healthBadge(health: string) {
  if (health === 'on_track') return { label: 'On track', className: 'bg-emerald-100 text-emerald-800' };
  if (health === 'needs_attention') return { label: 'Needs attention', className: 'bg-amber-100 text-amber-900' };
  return { label: 'Critical', className: 'bg-rose-100 text-rose-800' };
}

export function balanceStatusLabel(status: string) {
  const s = status.toLowerCase();
  if (s === 'paid') return { label: 'Paid', tone: 'bg-emerald-100 text-emerald-800' };
  if (s === 'partial') return { label: 'Partial', tone: 'bg-amber-100 text-amber-900' };
  if (s === 'overdue') return { label: 'Overdue', tone: 'bg-rose-100 text-rose-800' };
  return { label: 'Unpaid', tone: 'bg-slate-100 text-slate-700' };
}
