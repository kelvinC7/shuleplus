import { prisma } from '../config/database';

export type PortalFeatures = {
  studentManagement: boolean;
  shuleTrip: boolean;
};

const KEY = 'portal:features';

const DEFAULT_FULL: PortalFeatures = {
  studentManagement: true,
  shuleTrip: true,
};

export const SHULE_TRIP_ONLY: PortalFeatures = {
  studentManagement: false,
  shuleTrip: true,
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function orgUsesStudentManagementData(organizationId: string) {
  const [grades, fees] = await Promise.all([
    prisma.grade.count({ where: { student: { organizationId } } }),
    prisma.feeStatement.count({ where: { student: { organizationId } } }),
  ]);
  return grades > 0 || fees > 0;
}

async function orgHasShuleTripModuleTrips(organizationId: string) {
  const tripsRow = await prisma.setting.findUnique({
    where: { organizationId_key: { organizationId, key: `trips:${organizationId}` } },
  });
  if (!tripsRow?.value) return false;
  try {
    const trips = JSON.parse(tripsRow.value) as Array<{ id?: string }>;
    return Array.isArray(trips) && trips.some((t) => t.id && UUID_RE.test(t.id));
  } catch {
    return false;
  }
}

export async function getPortalFeatures(organizationId: string): Promise<PortalFeatures> {
  const row = await prisma.setting.findUnique({
    where: { organizationId_key: { organizationId, key: KEY } },
  });
  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value) as Partial<PortalFeatures>;
      let studentManagement = parsed.studentManagement !== false;
      if (
        studentManagement &&
        (await orgHasShuleTripModuleTrips(organizationId)) &&
        !(await orgUsesStudentManagementData(organizationId))
      ) {
        studentManagement = false;
      }
      return {
        studentManagement,
        shuleTrip: parsed.shuleTrip !== false,
      };
    } catch {
      /* fall through */
    }
  }

  if (await orgHasShuleTripModuleTrips(organizationId)) {
    return SHULE_TRIP_ONLY;
  }

  return DEFAULT_FULL;
}

export async function setPortalFeatures(organizationId: string, patch: Partial<PortalFeatures>) {
  const current = await getPortalFeatures(organizationId);
  const next: PortalFeatures = {
    studentManagement: patch.studentManagement ?? current.studentManagement,
    shuleTrip: patch.shuleTrip ?? current.shuleTrip,
  };
  await prisma.setting.upsert({
    where: { organizationId_key: { organizationId, key: KEY } },
    create: { organizationId, key: KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return next;
}

/** Schools that only use ShuleTrip (no Student Management enrolment). */
export async function markShuleTripOnlyPortal(organizationId: string) {
  const row = await prisma.setting.findUnique({
    where: { organizationId_key: { organizationId, key: KEY } },
  });
  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value) as Partial<PortalFeatures>;
      if (parsed.studentManagement === true) return getPortalFeatures(organizationId);
    } catch {
      /* fall through */
    }
  }
  return setPortalFeatures(organizationId, SHULE_TRIP_ONLY);
}

export async function enableStudentManagementPortal(organizationId: string) {
  return setPortalFeatures(organizationId, { studentManagement: true, shuleTrip: true });
}

export function isShuleTripOnlyPortal(features: PortalFeatures) {
  return features.shuleTrip && !features.studentManagement;
}
