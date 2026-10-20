export function formatRwf(amount: number): string {
  return new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(amount);
}
