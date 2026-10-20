export function formatRwf(value: number | null | undefined, opts?: { signed?: boolean }): string {
  const n = Number(value) || 0;
  const formatted = new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(Math.abs(n));
  if (opts?.signed && n !== 0) {
    return `${n > 0 ? '+' : '−'}${formatted}`;
  }
  return formatted;
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
