import type { SchoolTrip, TripConsentState } from '@/types/shuletrip';

export function tripConsentState(trip: SchoolTrip): TripConsentState {
  if (trip.consent?.status === 'declined') return 'declined';
  if (trip.consent?.by) return 'approved';
  return 'awaiting';
}

export function isUpcomingTrip(trip: SchoolTrip): boolean {
  return trip.day > 0;
}

export function isHistoryTrip(trip: SchoolTrip): boolean {
  return trip.day <= 0 || tripConsentState(trip) === 'approved';
}

export function tripStats(trips: SchoolTrip[]) {
  const upcoming = trips.filter((t) => isUpcomingTrip(t) && tripConsentState(t) !== 'declined');
  const awaiting = trips.filter((t) => tripConsentState(t) === 'awaiting' && isUpcomingTrip(t));
  const completed = trips.filter((t) => tripConsentState(t) === 'approved' && !isUpcomingTrip(t));
  return {
    total: trips.length,
    upcoming: upcoming.length,
    completed: completed.length,
    awaiting: awaiting.length,
  };
}

export function tripCode(trip: SchoolTrip): string {
  if (trip.reference?.trim()) return trip.reference.trim();
  const year = new Date().getFullYear();
  const slug = trip.id.replace(/^t-?/, '').slice(0, 8).toUpperCase();
  return `ST-${year}-${slug.padEnd(3, '0').slice(0, 3)}`;
}

function formatFromIso(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}

/** Departure or return label with date and time (handles legacy time-only sync). */
export function tripDateTimeLabel(trip: SchoolTrip, kind: 'depart' | 'ret'): string {
  const iso = kind === 'depart' ? trip.departAtIso : trip.returnAtIso;
  if (iso) {
    const formatted = formatFromIso(iso);
    if (formatted) return formatted;
  }
  const raw = (kind === 'depart' ? trip.depart : trip.ret)?.trim();
  if (!raw || raw === '—') return '—';
  if (/\d{4}/.test(raw)) return raw;
  const dayHint = trip.short && trip.short !== 'TBC' ? trip.short : null;
  if (/^\d{1,2}:\d{2}/.test(raw) && dayHint) return `${dayHint}, ${raw}`;
  return raw;
}

export function tripLocationLabel(place: string): string {
  return place?.trim() || '—';
}

export function countdownLabel(trip: SchoolTrip): string {
  if (trip.day <= 0) return 'Departed';
  if (trip.day === 1) return 'Departure tomorrow';
  return `Departure in ${trip.day} days`;
}

export function statusBadge(trip: SchoolTrip): { label: string; tone: 'amber' | 'green' | 'slate' | 'red' } {
  const c = tripConsentState(trip);
  if (c === 'awaiting') return { label: 'Awaiting consent', tone: 'amber' };
  if (c === 'declined') return { label: 'Declined', tone: 'red' };
  if (!isUpcomingTrip(trip)) return { label: 'Completed', tone: 'green' };
  return { label: 'Approved', tone: 'green' };
}

export function destinationFromPlace(place: string): string {
  const part = place.split('·')[0]?.trim();
  return part || place;
}

export function estimateDuration(trip: SchoolTrip): string {
  if (trip.departAtIso && trip.returnAtIso) {
    const start = new Date(trip.departAtIso).getTime();
    const end = new Date(trip.returnAtIso).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
      const mins = Math.round((end - start) / (60 * 1000));
      if (mins < 90) return `${mins} min`;
      if (mins < 720) return `${Math.round(mins / 60)} hr`;
      const days = Math.ceil(mins / (24 * 60));
      return days === 1 ? '1 day' : `${days} days`;
    }
  }
  const [dh, dm] = trip.depart.split(':').map(Number);
  const [rh, rm] = trip.ret.split(':').map(Number);
  if (Number.isNaN(dh) || Number.isNaN(rh)) return 'Full day';
  const mins = rh * 60 + rm - (dh * 60 + dm);
  if (mins <= 0) return 'Full day';
  if (mins < 720) return '1 day';
  const days = Math.ceil(mins / (24 * 60));
  return days === 1 ? '1 day' : `${days} days`;
}
