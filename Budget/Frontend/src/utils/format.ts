export function formatRwf(value: number | null | undefined): string {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Compact currency for stat cards — shorter label, fits narrow cards */
export function formatRwfStat(value: number | null | undefined): string {
  const n = Number(value) || 0;
  return `RF ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)}`;
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-RW').format(Number(value) || 0);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
