import { prisma } from '../config/database';
import type { SchoolTrip } from './trips-goals.service';
import { markShuleTripOnlyPortal } from './portal-features.service';
import { sanitizePhone } from '../utils/password';
import { provisionGuardianForTripParticipant } from './trip-guardian-provision.service';

function formatDateTimeLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}

function formatTripDate(
  departIso: string | null | undefined,
  returnIso: string | null | undefined
): {
  date: string;
  short: string;
  depart: string;
  ret: string;
  day: number;
  departAtIso: string | null;
  returnAtIso: string | null;
} {
  if (!departIso) {
    return {
      date: 'Date TBC',
      short: 'TBC',
      depart: '—',
      ret: '—',
      day: 0,
      departAtIso: null,
      returnAtIso: null,
    };
  }
  const d = new Date(departIso);
  const date = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const short = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const depart = formatDateTimeLabel(departIso);
  const ret = returnIso ? formatDateTimeLabel(returnIso) : '—';
  const day = Math.max(0, Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  return {
    date,
    short,
    depart,
    ret,
    day,
    departAtIso: departIso,
    returnAtIso: returnIso ?? null,
  };
}

function parseItineraryPlan(itinerary: string | null | undefined): Array<[string, string]> {
  if (!itinerary?.trim()) return [];
  try {
    const parsed = JSON.parse(itinerary) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item, i) => {
        if (typeof item === 'string') return [`${i + 1}`, item];
        if (item && typeof item === 'object') {
          const row = item as Record<string, unknown>;
          const time = String(row.time ?? row.at ?? row.when ?? `${i + 1}`);
          const label = String(row.label ?? row.title ?? row.activity ?? row.description ?? item);
          return [time, label];
        }
        return [`${i + 1}`, String(item)];
      });
    }
  } catch {
    /* plain text itinerary */
  }
  return itinerary
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const match = line.match(/^(\d{1,2}:\d{2})\s*[-–—]?\s*(.+)$/);
      if (match) return [match[1], match[2]] as [string, string];
      return [`${i + 1}`, line];
    });
}

function emergencySchoolPhone(contact: unknown): string {
  if (!contact || typeof contact !== 'object') return '';
  const c = contact as Record<string, unknown>;
  for (const key of ['phone', 'schoolPhone', 'contactPhone', 'telephone', 'mobile']) {
    const v = c[key];
    if (typeof v === 'string' && v.trim()) return sanitizePhone(v);
  }
  return '';
}

export async function syncShuleTripFromModule(
  organizationId: string,
  payload: {
    trip: {
      id: string;
      reference: string;
      title: string;
      purpose?: string | null;
      destination?: string | null;
      departAt?: string | null;
      returnAt?: string | null;
      tripLeaderName?: string | null;
      itinerary?: string | null;
      emergencyContact?: unknown;
    };
    participants: Array<{
      studentId: string;
      fullName: string;
      guardianPhone?: string | null;
      guardianEmail?: string | null;
      classLabel?: string | null;
    }>;
  }
) {
  const key = `trips:${organizationId}`;
  const setting = await prisma.setting.findUnique({
    where: { organizationId_key: { organizationId, key } },
  });

  let trips: SchoolTrip[] = [];
  if (setting) {
    try {
      trips = JSON.parse(setting.value);
    } catch {
      trips = [];
    }
  }

  const tripId = payload.trip.id;
  const participantIds = new Set(payload.participants.map((p) => p.studentId));
  const priorByKey = new Map(trips.map((t) => [`${t.id}:${t.studentId}`, t] as const));
  trips = trips.filter((t) => !(t.id === tripId && participantIds.has(t.studentId)));

  const { date, short, depart, ret, day, departAtIso, returnAtIso } = formatTripDate(
    payload.trip.departAt ?? null,
    payload.trip.returnAt ?? null
  );
  const schoolPhone = emergencySchoolPhone(payload.trip.emergencyContact);
  const itineraryPlan = parseItineraryPlan(payload.trip.itinerary);
  const defaultPlan: Array<[string, string]> = itineraryPlan.length
    ? itineraryPlan
    : [[`${payload.trip.reference}`, 'School itinerary — see overview for purpose and destination.']];

  for (const p of payload.participants) {
    await provisionGuardianForTripParticipant({
      organizationId,
      studentId: p.studentId,
      fullName: p.fullName,
      guardianPhone: p.guardianPhone,
      classLabel: p.classLabel,
    });
    const existing = priorByKey.get(`${tripId}:${p.studentId}`);
    trips.push({
      id: tripId,
      studentId: p.studentId,
      studentName: p.fullName,
      title: payload.trip.title,
      reference: payload.trip.reference,
      purpose: payload.trip.purpose?.trim() || undefined,
      place: payload.trip.destination?.trim() || payload.trip.reference,
      date,
      short,
      depart,
      ret,
      departAtIso,
      returnAtIso,
      cost: 0,
      paid: 0,
      inst: 0,
      due: short,
      day,
      teacher: payload.trip.tripLeaderName ?? 'School trip leader',
      ph: sanitizePhone(p.guardianPhone ?? '') || existing?.ph || '',
      guardianEmail: p.guardianEmail?.trim() || existing?.guardianEmail || undefined,
      schoolPhone: schoolPhone || existing?.schoolPhone || undefined,
      plan: defaultPlan,
      pack: p.classLabel ? [`Class: ${p.classLabel}`] : [],
      consent: existing?.consent?.by ? existing.consent : undefined,
    });
  }

  if (setting) {
    await prisma.setting.update({
      where: { organizationId_key: { organizationId, key } },
      data: { value: JSON.stringify(trips) },
    });
  } else {
    await prisma.setting.create({
      data: { organizationId, key, value: JSON.stringify(trips) },
    });
  }

  await markShuleTripOnlyPortal(organizationId);

  return { synced: payload.participants.length };
}
