export function formatFrw(amount: number | string | null | undefined): string {
  const value = Number(amount) || 0;
  return `${value.toLocaleString()} Frw`;
}

export function formatFrwCompact(amount: number | string | null | undefined): string {
  const value = Number(amount) || 0;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M Frw`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K Frw`;
  return formatFrw(value);
}
