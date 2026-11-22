export function formatTripDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Not scheduled';
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTripDate(iso: string | null | undefined): string {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTripTime(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function dateToKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function tripDateKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return dateToKey(new Date(iso));
}

export function isUpcomingTrip(departAt: string | null, status: string): boolean {
  if (!departAt) return false;
  if (!['APPROVED', 'TRIP_IN_PROGRESS', 'RESUBMITTED'].includes(status)) return false;
  return new Date(departAt).getTime() >= Date.now() - 86400000;
}

export function isOperationalTrip(status: string): boolean {
  return ['APPROVED', 'TRIP_IN_PROGRESS'].includes(status);
}
