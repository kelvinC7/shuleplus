/** UI placeholders without em dash. */
export const EMPTY_LABEL = 'Not set';

export function displayText(value: string | null | undefined, fallback = EMPTY_LABEL): string {
  const v = value?.trim();
  return v ? v : fallback;
}

export function displayNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '0';
  return value.toLocaleString();
}

export function formatKigaliDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-GB', {
      timeZone: 'Africa/Kigali',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('en-GB', {
      timeZone: 'Africa/Kigali',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
}
