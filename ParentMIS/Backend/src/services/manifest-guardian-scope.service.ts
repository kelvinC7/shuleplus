import { prisma } from '../config/database';
import { phonesMatch } from './trip-guardian-provision.service';

type TripRow = { studentId?: string; ph?: string };

export async function manifestStudentKeysForPhone(phoneRaw: string): Promise<Set<string>> {
  const keys = new Set<string>();
  if (!phoneRaw?.trim()) return keys;

  const settings = await prisma.setting.findMany({
    where: { key: { startsWith: 'trips:' } },
  });

  for (const setting of settings) {
    let trips: TripRow[] = [];
    try {
      trips = JSON.parse(setting.value);
    } catch {
      continue;
    }
    if (!Array.isArray(trips)) continue;
    for (const trip of trips) {
      if (!phonesMatch(trip.ph, phoneRaw)) continue;
      const sid = String(trip.studentId ?? '').trim();
      if (sid) keys.add(sid);
    }
  }
  return keys;
}

export function studentMatchesManifestKeys(
  keys: Set<string>,
  student: { id: string; shuleCode: string }
): boolean {
  if (!keys.size) return true;
  return keys.has(student.id) || keys.has(student.shuleCode);
}

/** Drop parent↔student links that are not on a manifest row for this guardian phone. */
export async function pruneGuardianLinksOutsideManifest(parentId: string, phoneRaw: string) {
  const keys = await manifestStudentKeysForPhone(phoneRaw);
  if (!keys.size) return;

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId },
    include: { student: { select: { id: true, shuleCode: true } } },
  });

  for (const link of links) {
    if (!studentMatchesManifestKeys(keys, link.student)) {
      await prisma.parentStudentLink.delete({ where: { id: link.id } });
    }
  }
}
