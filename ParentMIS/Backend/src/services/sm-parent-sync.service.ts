import { prisma } from '../config/database';
import { sanitizePhone } from '../utils/password';
import { enableStudentManagementPortal } from './portal-features.service';
import { clearParentShuleTripOnly } from './parent-portal-mode.service';
import {
  smListParents,
  smLookupParentsByPhone,
  type SmLinkedStudent,
  type SmParentRow,
} from '../clients/student-management.client';
import type { JwtPayload } from '../middleware/auth.middleware';
import { shouldSkipStudentManagementSync } from './parent-portal-mode.service';

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
        phone: input.phone && !input.phone.startsWith('parent-') ? input.phone : byId.phone,
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

async function applySmParentBundle(organizationId: string, matches: SmParentRow[]) {
  if (!matches.length) return null;

  const source = matches[0];
  await enableStudentManagementPortal(organizationId);

  const phone = sanitizePhone(source.phone?.trim() || matches.find((m) => m.phone?.trim())?.phone || '');
  if (!phone) return null;

  const parent = await upsertParentAccount({
    id: source.id,
    organizationId,
    firstName: source.firstName || 'Parent',
    lastName: source.lastName || '',
    phone,
    email: source.email,
  });

  await clearParentShuleTripOnly(organizationId, parent.id);

  const children = new Map<string, SmLinkedStudent>();
  for (const row of matches) {
    for (const child of row.students ?? []) {
      if (child.studentId && !children.has(child.studentId)) {
        children.set(child.studentId, child);
      }
    }
  }

  let index = 0;
  for (const child of children.values()) {
    await upsertChild(organizationId, parent.id, child, index === 0);
    index += 1;
  }

  return parent;
}

/**
 * Create or refresh a ParentMIS account from Student Management guardian phone
 * (primary path for schools using Student Management).
 */
export async function provisionParentFromStudentManagement(phoneRaw: string): Promise<boolean> {
  const phone = phoneRaw?.trim();
  if (!phone) return false;

  let rows: SmParentRow[] = [];
  try {
    rows = await smLookupParentsByPhone(phone);
  } catch (err) {
    console.warn('[parent-provision] Student Management lookup failed:', (err as Error).message);
    return false;
  }

  if (!rows.length) return false;

  const byOrg = new Map<string, SmParentRow[]>();
  for (const row of rows) {
    const orgId = row.organizationId?.trim();
    if (!orgId) continue;
    const list = byOrg.get(orgId) ?? [];
    list.push(row);
    byOrg.set(orgId, list);
  }

  if (!byOrg.size) return false;

  let provisioned = false;
  for (const [organizationId, matches] of byOrg) {
    await ensureTenant(organizationId);
    const parent = await applySmParentBundle(organizationId, matches);
    if (parent) provisioned = true;
  }

  return provisioned;
}

/**
 * Copy the Student Management parent + all children into ParentMIS so every
 * portal page can resolve the same people enrolled against the login phone.
 */
export async function syncParentFromStudentManagement(payload: JwtPayload) {
  if (!payload.organizationId) return payload;
  if (await shouldSkipStudentManagementSync(payload)) return payload;

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
  } catch (err) {
    console.warn('[parent-sync] Student Management unreachable:', (err as Error).message);
    return payload;
  }

  const byIdRaw = rows.find((p) => p.id === (payload.parentId || payload.sub));
  const byId =
    byIdRaw && payload.phone && phonesMatch(byIdRaw.phone, payload.phone) ? byIdRaw : undefined;
  const byPhone = payload.phone
    ? rows.filter((p) => phonesMatch(p.phone, payload.phone))
    : [];
  const matches = byId ? [byId, ...byPhone.filter((p) => p.id !== byId.id)] : byPhone;
  const source = matches[0];
  if (!source) return payload;

  const parent = await applySmParentBundle(
    payload.organizationId,
    matches.length ? matches : source ? [source] : []
  );
  if (!parent) return payload;

  lastSyncAt.set(cacheKey, Date.now());
  payload.sub = parent.id;
  payload.parentId = parent.id;
  return payload;
}
