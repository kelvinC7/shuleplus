import { randomUUID } from 'node:crypto';
import { prisma } from '../config/database';
import { phoneVariants, sanitizePhone } from '../utils/password';
import { markShuleTripOnlyPortal } from './portal-features.service';
import { markParentShuleTripOnly } from './parent-portal-mode.service';
import { pruneGuardianLinksOutsideManifest } from './manifest-guardian-scope.service';
import type { SchoolTrip } from './trips-goals.service';

function splitName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Student',
    lastName: parts.slice(1).join(' ') || '—',
  };
}

function phoneDigits(value: string | null | undefined) {
  return String(value ?? '').replace(/\D/g, '');
}

export function phonesMatch(a?: string | null, b?: string | null) {
  const left = phoneDigits(a);
  const right = phoneDigits(b);
  if (!left || !right) return false;
  return left.endsWith(right.slice(-9)) || right.endsWith(left.slice(-9));
}

async function ensureTenant(organizationId: string) {
  const existing = await prisma.tenant.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return prisma.tenant.create({
    data: {
      organizationId,
      organizationName: 'School',
      status: 'ACTIVE',
    },
  });
}

async function upsertTripStudent(
  organizationId: string,
  studentId: string,
  fullName: string,
  classLabel?: string | null
) {
  const names = splitName(fullName);
  const shuleCode = studentId.trim();
  const existing = await prisma.student.findFirst({
    where: { OR: [{ id: studentId }, { shuleCode }] },
  });

  if (existing) {
    return prisma.student.update({
      where: { id: existing.id },
      data: {
        organizationId,
        firstName: names.firstName,
        lastName: names.lastName,
        className: classLabel?.trim() || existing.className || '—',
      },
    });
  }

  return prisma.student.create({
    data: {
      id: studentId,
      organizationId,
      firstName: names.firstName,
      lastName: names.lastName,
      shuleCode,
      className: classLabel?.trim() || '—',
    },
  });
}

async function upsertTripGuardian(
  organizationId: string,
  phoneRaw: string,
  childFirstName: string
) {
  const phone = sanitizePhone(phoneRaw);
  const variants = phoneVariants(phoneRaw);
  const existing = await prisma.parentAccount.findFirst({
    where: { organizationId, phone: { in: variants } },
  });

  if (existing) {
    return prisma.parentAccount.update({
      where: { id: existing.id },
      data: { phone: existing.phone || phone },
    });
  }

  return prisma.parentAccount.create({
    data: {
      id: randomUUID(),
      organizationId,
      firstName: 'Guardian',
      lastName: childFirstName,
      phone,
    },
  });
}

async function linkGuardianToStudent(parentId: string, studentId: string, isPrimary: boolean) {
  const existing = await prisma.parentStudentLink.findFirst({
    where: { parentId, studentId },
  });
  if (existing) return existing;
  return prisma.parentStudentLink.create({
    data: {
      parentId,
      studentId,
      relationship: 'GUARDIAN',
      isPrimary,
    },
  });
}

export async function provisionGuardianForTripParticipant(input: {
  organizationId: string;
  studentId: string;
  fullName: string;
  guardianPhone?: string | null;
  classLabel?: string | null;
}) {
  const phone = input.guardianPhone?.trim();
  if (!phone) return null;

  await ensureTenant(input.organizationId);
  const student = await upsertTripStudent(
    input.organizationId,
    input.studentId,
    input.fullName,
    input.classLabel
  );
  const names = splitName(input.fullName);
  const parent = await upsertTripGuardian(input.organizationId, phone, names.firstName);
  await linkGuardianToStudent(parent.id, student.id, true);
  await markParentShuleTripOnly(input.organizationId, parent.id);
  await pruneGuardianLinksOutsideManifest(parent.id, phone);
  return parent;
}

/** Scan published ShuleTrip rows for a guardian phone and create accounts if missing. */
export async function provisionParentFromPublishedTrips(phoneRaw: string): Promise<boolean> {
  const settings = await prisma.setting.findMany({
    where: { key: { startsWith: 'trips:' } },
  });

  let provisioned = false;
  const touchedOrgs = new Set<string>();
  for (const setting of settings) {
    let trips: SchoolTrip[] = [];
    try {
      trips = JSON.parse(setting.value) as SchoolTrip[];
    } catch {
      continue;
    }
    const seenStudents = new Set<string>();
    for (const trip of trips) {
      if (!phonesMatch(trip.ph, phoneRaw)) continue;
      const studentId = trip.studentId;
      if (!studentId || seenStudents.has(studentId)) continue;
      seenStudents.add(studentId);
      await provisionGuardianForTripParticipant({
        organizationId: setting.organizationId,
        studentId,
        fullName: trip.studentName,
        guardianPhone: trip.ph,
        classLabel: trip.pack?.[0]?.replace(/^Class:\s*/i, ''),
      });
      touchedOrgs.add(setting.organizationId);
      provisioned = true;
    }
  }
  for (const orgId of touchedOrgs) {
    await markShuleTripOnlyPortal(orgId);
  }
  return provisioned;
}
