import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { smListParents, smLookupParentsByPhone } from '../clients/student-management.client';
import { phoneVariants } from '../utils/password';
import { phonesMatch } from './trip-guardian-provision.service';

type TripRow = { studentId?: string; ph?: string; guardianEmail?: string };

export function normalizeGuardianEmail(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase();
}

function addEmail(set: Set<string>, value: string | null | undefined) {
  const norm = normalizeGuardianEmail(value ?? '');
  if (!norm || !norm.includes('@')) return;
  set.add(norm);
}

async function emailsFromTripManifest(phoneRaw: string): Promise<Set<string>> {
  const out = new Set<string>();
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
      addEmail(out, trip.guardianEmail);
    }
  }
  return out;
}

/** Emails the school stored in Student Management or on a ShuleTrip manifest for this guardian phone. */
export async function collectRegisteredGuardianEmails(phoneRaw: string): Promise<string[]> {
  const variants = phoneVariants(phoneRaw);
  const parent = await prisma.parentAccount.findFirst({
    where: { phone: { in: variants } },
    orderBy: { updatedAt: 'desc' },
  });

  const emails = new Set<string>();

  try {
    const smRows = await smLookupParentsByPhone(phoneRaw);
    for (const row of smRows) {
      if (phonesMatch(row.phone, phoneRaw)) addEmail(emails, row.email);
    }
  } catch {
    /* SM unreachable — manifest / local emails still apply */
  }

  if (parent) {
    addEmail(emails, parent.email);
    const links = await prisma.parentStudentLink.findMany({
      where: { parentId: parent.id },
      include: {
        student: { select: { motherEmail: true, fatherEmail: true } },
      },
    });
    for (const link of links) {
      addEmail(emails, link.student.motherEmail);
      addEmail(emails, link.student.fatherEmail);
    }

    try {
      const smRows = await smListParents(parent.organizationId, { phone: parent.phone });
      for (const row of smRows) {
        if (phonesMatch(row.phone, parent.phone)) addEmail(emails, row.email);
      }
    } catch {
      /* SM unreachable — still allow manifest / local emails */
    }
  }

  for (const e of await emailsFromTripManifest(phoneRaw)) emails.add(e);

  return [...emails];
}

export async function assertGuardianEmailMatchesPhone(phoneRaw: string, emailRaw: string) {
  const submitted = normalizeGuardianEmail(emailRaw);
  if (!submitted || !submitted.includes('@')) {
    throw new AppError(400, 'Enter the guardian email saved at school');
  }

  const allowed = await collectRegisteredGuardianEmails(phoneRaw);
  if (!allowed.length) {
    throw new AppError(
      400,
      'No guardian email is on file for this phone. Ask the school to add your email in Student Management or on the ShuleTrip learner manifest.'
    );
  }

  if (!allowed.includes(submitted)) {
    throw new AppError(
      403,
      'That email does not match the guardian email on file for this phone number.'
    );
  }
}
