import { prisma } from '../config/database';
import { smListParents, smLookupParentsByPhone } from '../clients/student-management.client';
import {
  type PortalFeatures,
  SHULE_TRIP_ONLY,
  enableStudentManagementPortal,
} from './portal-features.service';
import { phonesMatch } from './trip-guardian-provision.service';
import { phoneVariants } from '../utils/password';
import type { JwtPayload } from '../middleware/auth.middleware';

const PARENT_MODE_PREFIX = 'parent:portal:';

export function parentPortalModeKey(parentId: string) {
  return `${PARENT_MODE_PREFIX}${parentId}`;
}

export async function markParentShuleTripOnly(organizationId: string, parentId: string) {
  const key = parentPortalModeKey(parentId);
  await prisma.setting.upsert({
    where: { organizationId_key: { organizationId, key } },
    create: { organizationId, key, value: 'shule_trip_only' },
    update: { value: 'shule_trip_only' },
  });
}

export async function clearParentShuleTripOnly(organizationId: string, parentId: string) {
  const key = parentPortalModeKey(parentId);
  await prisma.setting.deleteMany({ where: { organizationId, key } });
}

async function parentRegisteredInStudentManagement(
  organizationId: string,
  phone: string | null | undefined
): Promise<boolean> {
  if (!phone?.trim()) return false;
  try {
    const rows = await smListParents(organizationId, { phone });
    return rows.some((row) => phonesMatch(row.phone, phone));
  } catch {
    return false;
  }
}

export async function isGuardianPhoneInStudentManagement(phoneRaw: string): Promise<boolean> {
  if (!phoneRaw?.trim()) return false;
  try {
    const rows = await smLookupParentsByPhone(phoneRaw);
    return rows.some((row) => phonesMatch(row.phone, phoneRaw));
  } catch {
    return false;
  }
}

/**
 * Full yoShule portal only when the login phone exists in Student Management;
 * manifest-only guardians (ShuleTrip provision) stay on ShuleTrip-only UI.
 */
export async function resolvePortalFeaturesForParent(
  organizationId: string,
  parentId: string
): Promise<PortalFeatures> {
  const parent = await prisma.parentAccount.findUnique({ where: { id: parentId } });
  if (!parent) return SHULE_TRIP_ONLY;

  const orgId = parent.organizationId || organizationId;

  const modeRow = await prisma.setting.findUnique({
    where: { organizationId_key: { organizationId: orgId, key: parentPortalModeKey(parentId) } },
  });
  if (modeRow?.value === 'shule_trip_only') {
    return SHULE_TRIP_ONLY;
  }

  const inSm = await parentRegisteredInStudentManagement(orgId, parent.phone);
  if (inSm) {
    await enableStudentManagementPortal(orgId);
    await clearParentShuleTripOnly(orgId, parentId);
    return { studentManagement: true, shuleTrip: true };
  }

  await markParentShuleTripOnly(orgId, parentId);
  return SHULE_TRIP_ONLY;
}

/** Manifest / ShuleTrip-only guardians — skip Student Management sync and SM module calls. */
export async function isParentShuleTripOnly(organizationId: string, parentId: string): Promise<boolean> {
  const parent = await prisma.parentAccount.findUnique({ where: { id: parentId } });
  if (!parent) return false;
  const orgId = parent.organizationId || organizationId;
  const modeRow = await prisma.setting.findUnique({
    where: { organizationId_key: { organizationId: orgId, key: parentPortalModeKey(parentId) } },
  });
  if (modeRow?.value === 'shule_trip_only') return true;
  if (parent.firstName === 'Guardian') return true;
  return false;
}

export async function shouldSkipStudentManagementSync(payload: JwtPayload): Promise<boolean> {
  if (!payload.organizationId) return true;
  const ids = [...new Set([payload.parentId, payload.sub].filter(Boolean))] as string[];
  for (const id of ids) {
    if (await isParentShuleTripOnly(payload.organizationId, id)) return true;
  }
  if (payload.phone) {
    const parent = await prisma.parentAccount.findFirst({
      where: { phone: { in: phoneVariants(payload.phone) } },
    });
    if (parent && (await isParentShuleTripOnly(parent.organizationId, parent.id))) return true;
  }
  return false;
}
