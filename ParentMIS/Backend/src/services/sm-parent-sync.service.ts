import { prisma } from '../config/database';
import { smListParents, type SmLinkedStudent, type SmParentRow } from '../clients/student-management.client';
import type { JwtPayload } from '../middleware/auth.middleware';

const SYNC_TTL_MS = 120_000;
const lastSyncAt = new Map<string, number>();

function splitName(full: string | null | undefined) {
  const parts = String(full ?? '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Student',
    lastName: parts.slice(1).join(' ') || '',
  };
}

function phoneDigits(value: string | null | undefined) {
  return String(value ?? '').replace(/\D/g, '');
}

function phonesMatch(a?: string | null, b?: string | null) {
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

async function upsertParentAccount(input: {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
}) {
  const byId = await prisma.parentAccount.findUnique({ where: { id: input.id } });
  if (byId) {
    return prisma.parentAccount.update({
      where: { id: byId.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        email: input.email ?? byId.email,
      },
    });
  }

  const byPhone = await prisma.parentAccount.findFirst({
    where: { organizationId: input.organizationId, phone: input.phone },
  });
  if (byPhone) {
    return prisma.parentAccount.update({
      where: { id: byPhone.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email ?? byPhone.email,
      },
    });
  }

  return prisma.parentAccount.create({
    data: {
      id: input.id,
      organizationId: input.organizationId,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email,
    },
  });
}

async function upsertChild(
  organizationId: string,
  parentId: string,
  child: SmLinkedStudent,
  isPrimary: boolean
) {
  const studentId = child.studentId;
  if (!studentId) return;

  const names = splitName(child.studentName);
  const shuleCode = child.studentCode || studentId;
  const existing = await prisma.student.findFirst({
    where: { OR: [{ id: studentId }, { shuleCode }] },
  });

  const student = existing
    ? await prisma.student.update({
        where: { id: existing.id },
        data: {
          organizationId,
          firstName: names.firstName,
          lastName: names.lastName,
          shuleCode,
          className: child.className || existing.className || '—',
          avatarUrl: existing.avatarUrl,
        },
      })
    : await prisma.student.create({
        data: {
          id: studentId,
          organizationId,
          firstName: names.firstName,
          lastName: names.lastName,
          shuleCode,
          className: child.className || '—',
        },
      });

  const link = await prisma.parentStudentLink.findFirst({
    where: { parentId, studentId: student.id },
  });
  if (link) {
    await prisma.parentStudentLink.update({
      where: { id: link.id },
      data: { relationship: child.role || link.relationship, isPrimary },
    });
    return;
  }

  await prisma.parentStudentLink.create({
    data: {
      parentId,
      studentId: student.id,
      relationship: child.role || 'GUARDIAN',
      isPrimary,
    },
  });
}

/**
 * Copy the Student Management parent + all children into ParentMIS so every
 * portal page can resolve the same people enrolled against the login phone.
 */
export async function syncParentFromStudentManagement(payload: JwtPayload) {
  if (!payload.organizationId) return payload;

  const cacheKey = `${payload.organizationId}:${payload.parentId || payload.sub}:${payload.phone || ''}`;
  const previous = lastSyncAt.get(cacheKey);
  if (previous && Date.now() - previous < SYNC_TTL_MS) return payload;

  await ensureTenant(payload.organizationId);

  let rows: SmParentRow[] = [];
  try {
    rows = await smListParents(payload.organizationId, {
      parentId: payload.parentId || payload.sub,
      phone: payload.phone,
    });
    if (rows.length === 0) {
      rows = await smListParents(payload.organizationId);
    }
  } catch (err) {
    console.warn('[parent-sync] Student Management unreachable:', (err as Error).message);
  }

  const byId = rows.find((p) => p.id === (payload.parentId || payload.sub));
  const byPhone = rows.filter((p) => phonesMatch(p.phone, payload.phone));
  const matches = byId ? [byId, ...byPhone.filter((p) => p.id !== byId.id)] : byPhone;
  const source = matches[0] ?? rows[0];

  const firstName =
    source?.firstName ||
    (payload.email ? payload.email.split('@')[0] : 'Parent');
  const lastName = source?.lastName || '';
  const phone =
    source?.phone ||
    payload.phone ||
    `parent-${payload.parentId || payload.sub}`;

  const parent = await upsertParentAccount({
    id: source?.id || payload.parentId || payload.sub,
    organizationId: payload.organizationId,
    firstName,
    lastName,
    phone,
    email: source?.email || payload.email,
  });

  const children = new Map<string, SmLinkedStudent>();
  for (const row of matches.length ? matches : source ? [source] : []) {
    for (const child of row.students ?? []) {
      if (child.studentId && !children.has(child.studentId)) {
        children.set(child.studentId, child);
      }
    }
  }

  let index = 0;
  for (const child of children.values()) {
    await upsertChild(payload.organizationId, parent.id, child, index === 0);
    index += 1;
  }

  lastSyncAt.set(cacheKey, Date.now());
  payload.sub = parent.id;
  payload.parentId = parent.id;
  return payload;
}
