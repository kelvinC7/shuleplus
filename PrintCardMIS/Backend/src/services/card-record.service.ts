import { CardStatus, PersonKind, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import type { PrintCardStaff, PrintCardStudent } from '../clients/upstream.client';
import { hasPlatformPrintScope, type JwtPayload } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

export type CardListFilters = {
  search?: string;
  status?: CardStatus;
  className?: string;
  /** When true, match className exactly (dropdown). Default is contains (legacy free text). */
  classNameExact?: boolean;
  educationLevel?: string;
  academicYear?: string;
  gender?: string;
  role?: string;
  department?: string;
  /** When true, only rows with a non-empty profile photo URL; when false, only without. */
  hasPhoto?: boolean;
};

function deriveEducationLevel(className?: string | null, category?: string | null): string | null {
  const cls = String(className ?? '').trim();
  const cat = String(category ?? '').trim().toUpperCase();
  if (cat === 'TVET' || /^(L[1-5]|Y[1-3])/i.test(cls.split(/[\s/–—\-·]+/)[0] ?? '')) return cls || 'TVET';
  const token = cls.toUpperCase().split(/[\s/–—\-·]+/)[0]?.replace(/\s+/g, '') ?? '';
  const m = token.match(/^([NPS])([1-6])$/);
  if (!m) {
    if (cat === 'NURSERY') return 'Nursery';
    return cls || null;
  }
  const [, prefix, numStr] = m;
  const num = Number.parseInt(numStr!, 10);
  if (prefix === 'N') return 'Nursery';
  if (prefix === 'P') return num <= 3 ? 'Lower Primary' : 'Upper Primary';
  if (prefix === 'S') return num <= 3 ? 'Ordinary Level' : 'Advanced Level';
  return cls;
}

export async function syncStudentCards(organizationId: string, students: PrintCardStudent[]) {
  for (const s of students) {
    const educationLevel = deriveEducationLevel(s.className, s.educationLevel);
    await prisma.cardRecord.upsert({
      where: {
        organizationId_personKind_personId: {
          organizationId,
          personKind: PersonKind.STUDENT,
          personId: s.id,
        },
      },
      create: {
        organizationId,
        personKind: PersonKind.STUDENT,
        personId: s.id,
        personCode: s.studentCode,
        fullName: s.fullName,
        photoUrl: s.photoUrl ?? null,
        className: s.className ?? null,
        educationLevel,
        academicYear: s.academicYear ?? null,
        status: CardStatus.NOT_PRINTED,
      },
      update: {
        personCode: s.studentCode,
        fullName: s.fullName,
        ...(s.photoUrl ? { photoUrl: s.photoUrl } : {}),
        className: s.className ?? null,
        educationLevel,
        academicYear: s.academicYear ?? null,
      },
    });
  }
}

function normalizePersonName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Removes batch items / events / reprint rows that reference this card, then the card. */
export async function removeCardRecordSafely(cardRecordId: string) {
  await prisma.$transaction([
    prisma.printBatchItem.deleteMany({ where: { cardRecordId } }),
    prisma.printEvent.deleteMany({ where: { cardRecordId } }),
    prisma.reprintRequest.deleteMany({ where: { cardRecordId } }),
    prisma.cardRecord.delete({ where: { id: cardRecordId } }),
  ]);
}

/** Drop staff card rows left from an old HR/Timetable personId after IAM/HR ID migration. */
export async function pruneStaffCardsNotInRoster(
  organizationId: string,
  staff: PrintCardStaff[]
): Promise<number> {
  const keepPersonIds = staff.map((s) => s.id);
  if (keepPersonIds.length === 0) return 0;

  const stale = await prisma.cardRecord.findMany({
    where: {
      organizationId,
      personKind: PersonKind.STAFF,
      personId: { notIn: keepPersonIds },
    },
    select: { id: true },
  });

  for (const row of stale) {
    await removeCardRecordSafely(row.id);
  }
  return stale.length;
}

/** One row per name — keep roster personId / latest employee number. */
export async function dedupeStaffCardsByName(
  organizationId: string,
  staff: PrintCardStaff[]
): Promise<number> {
  const rosterByName = new Map<string, PrintCardStaff>();
  for (const s of staff) {
    rosterByName.set(normalizePersonName(s.fullName), s);
  }

  const cards = await prisma.cardRecord.findMany({
    where: { organizationId, personKind: PersonKind.STAFF },
  });

  const byName = new Map<string, typeof cards>();
  for (const card of cards) {
    const key = normalizePersonName(card.fullName);
    const group = byName.get(key) ?? [];
    group.push(card);
    byName.set(key, group);
  }

  let removed = 0;
  for (const [, group] of byName) {
    if (group.length <= 1) continue;

    const canonical = rosterByName.get(normalizePersonName(group[0]!.fullName));
    const keep =
      group.find((c) => c.personId === canonical?.id) ??
      group.find((c) => canonical && c.personCode === canonical.employeeNumber) ??
      group.reduce((best, c) => {
        const score = (code: string | null) => {
          if (!code) return 0;
          const n = code.replace(/\s+/g, '').toUpperCase();
          if (canonical?.employeeNumber && n === canonical.employeeNumber.replace(/\s+/g, '').toUpperCase()) {
            return 100;
          }
          if (/^TR0010/.test(n) || /^EMP-/.test(n)) return 1;
          return 50;
        };
        return score(c.personCode) > score(best.personCode) ? c : best;
      });

    for (const card of group) {
      if (card.id === keep.id) continue;
      await removeCardRecordSafely(card.id);
      removed += 1;
    }
  }

  return removed;
}

export async function syncStaffCards(organizationId: string, staff: PrintCardStaff[]) {
  for (const s of staff) {
    await prisma.cardRecord.upsert({
      where: {
        organizationId_personKind_personId: {
          organizationId,
          personKind: PersonKind.STAFF,
          personId: s.id,
        },
      },
      create: {
        organizationId,
        personKind: PersonKind.STAFF,
        personId: s.id,
        personCode: s.employeeNumber,
        fullName: s.fullName,
        photoUrl: s.photoUrl ?? null,
        role: s.position ?? null,
        department: null,
        status: CardStatus.NOT_PRINTED,
      },
      update: {
        personCode: s.employeeNumber,
        fullName: s.fullName,
        ...(s.photoUrl ? { photoUrl: s.photoUrl } : {}),
        role: s.position ?? null,
      },
    });
  }
}

export async function resyncStaffCardsFromRoster(organizationId: string, staff: PrintCardStaff[]) {
  await syncStaffCards(organizationId, staff);
  const pruned = await pruneStaffCardsNotInRoster(organizationId, staff);
  const deduped = await dedupeStaffCardsByName(organizationId, staff);
  return { roster: staff.length, pruned, deduped };
}

function buildWhere(organizationId: string, kind: PersonKind, filters?: CardListFilters): Prisma.CardRecordWhereInput {
  const where: Prisma.CardRecordWhereInput = { organizationId, personKind: kind };
  if (filters?.status) where.status = filters.status;
  if (filters?.className) {
    where.className = filters.classNameExact
      ? { equals: filters.className, mode: 'insensitive' }
      : { contains: filters.className, mode: 'insensitive' };
  }
  if (filters?.educationLevel) where.educationLevel = { contains: filters.educationLevel, mode: 'insensitive' };
  if (filters?.academicYear) where.academicYear = filters.academicYear;
  if (filters?.gender) where.gender = filters.gender;
  if (filters?.role) where.role = { contains: filters.role, mode: 'insensitive' };
  if (filters?.department) where.department = { contains: filters.department, mode: 'insensitive' };

  const andClauses: Prisma.CardRecordWhereInput[] = [];
  if (filters?.hasPhoto === true) {
    andClauses.push({ photoUrl: { not: null } }, { NOT: { photoUrl: '' } });
  } else if (filters?.hasPhoto === false) {
    andClauses.push({ OR: [{ photoUrl: null }, { photoUrl: '' }] });
  }
  if (filters?.search?.trim()) {
    const q = filters.search.trim();
    andClauses.push({
      OR: [
        { fullName: { contains: q, mode: 'insensitive' } },
        { personCode: { contains: q, mode: 'insensitive' } },
        { className: { contains: q, mode: 'insensitive' } },
      ],
    });
  }
  if (andClauses.length) where.AND = andClauses;

  return where;
}

export async function listCardRecords(organizationId: string, kind: PersonKind, filters?: CardListFilters) {
  return prisma.cardRecord.findMany({
    where: buildWhere(organizationId, kind, filters),
    orderBy: [{ fullName: 'asc' }],
  });
}

export async function getCardStats(organizationId: string, kind: PersonKind) {
  const base = { organizationId, personKind: kind };
  const [total, notPrinted, printed, reprintRequired, reprinted] = await Promise.all([
    prisma.cardRecord.count({ where: base }),
    prisma.cardRecord.count({ where: { ...base, status: CardStatus.NOT_PRINTED } }),
    prisma.cardRecord.count({
      where: { ...base, status: { in: [CardStatus.PRINTED, CardStatus.REPRINTED] } },
    }),
    prisma.cardRecord.count({ where: { ...base, status: CardStatus.REPRINT_REQUIRED } }),
    prisma.cardRecord.count({ where: { ...base, status: CardStatus.REPRINTED } }),
  ]);
  return { total, notPrinted, printed, reprintRequired, reprinted, selected: 0 };
}

export async function getCardRecordById(id: string, organizationId: string) {
  return prisma.cardRecord.findFirst({ where: { id, organizationId } });
}

export async function getCardEvents(cardRecordId: string, user: JwtPayload) {
  const card = await prisma.cardRecord.findUnique({ where: { id: cardRecordId } });
  if (!card) throw new AppError(404, 'Card not found');
  if (!hasPlatformPrintScope(user) && user.organizationId !== card.organizationId) {
    throw new AppError(403, 'You can only access your organization');
  }

  return prisma.printEvent.findMany({
    where: { cardRecordId: card.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function markCardAction(
  cardRecordId: string,
  organizationId: string,
  user: { sub: string; email: string },
  action: 'MARK_DAMAGED' | 'MARK_LOST' | 'CANCEL_REPRINT'
) {
  const card = await getCardRecordById(cardRecordId, organizationId);
  if (!card) throw new Error('Card not found');

  let newStatus: CardStatus = card.status;
  if (action === 'MARK_DAMAGED' || action === 'MARK_LOST') {
    newStatus = CardStatus.REPRINT_REQUIRED;
  } else if (action === 'CANCEL_REPRINT' && card.status === CardStatus.REPRINT_REQUIRED) {
    newStatus = card.printCount > 0 ? CardStatus.PRINTED : CardStatus.NOT_PRINTED;
  }

  await prisma.$transaction([
    prisma.cardRecord.update({
      where: { id: card.id },
      data: { status: newStatus },
    }),
    prisma.printEvent.create({
      data: {
        organizationId,
        cardRecordId: card.id,
        eventType: action,
        result: 'SUCCESS',
        performedBy: user.sub,
        performedByEmail: user.email,
      },
    }),
  ]);

  return prisma.cardRecord.findUnique({ where: { id: card.id } });
}
