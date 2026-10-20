const TZ = 'Africa/Kigali';

export function formatAttendanceTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatDurationMins(mins?: number | null) {
  if (mins == null || mins < 0) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
