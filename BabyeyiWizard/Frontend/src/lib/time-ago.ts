const UNITS: Array<{ limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { limit: 60, divisor: 1, unit: 'second' },
  { limit: 3600, divisor: 60, unit: 'minute' },
  { limit: 86400, divisor: 3600, unit: 'hour' },
  { limit: 2592000, divisor: 86400, unit: 'day' },
  { limit: 31536000, divisor: 2592000, unit: 'month' },
  { limit: Infinity, divisor: 31536000, unit: 'year' },
];

const rtf = typeof Intl !== 'undefined' ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : null;

/** Human-friendly relative time, e.g. "2 days ago", "yesterday", "just now". */
export function timeAgo(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);

  if (abs < 30) return 'just now';

  for (const { limit, divisor, unit } of UNITS) {
    if (abs < limit) {
      const amount = Math.round(seconds / divisor);
      return rtf ? rtf.format(amount, unit) : `${Math.abs(amount)} ${unit}${Math.abs(amount) === 1 ? '' : 's'} ago`;
    }
  }
  return 'a while ago';
}
