import { prisma } from '../config/database';
import { smartAccessModuleClient } from '../clients/smart-access-module.client';
import { mergeStaffLists } from './smart-access-staff-merge';
import {
  findIamUserByRfid,
  listIamUsersForSmartAccess,
  updateIamUserIdentity,
} from './smart-access-iam-users.service';
import type { Prisma } from '../generated/prisma';
import { AppError } from '../middleware/error.middleware';

const PLATFORM_SLUG = 'shuleplus-platform';

const SCHOOL_TYPES = ['SCHOOL', 'TVET', 'UNIVERSITY'] as const;

function normalizeRfidUid(uid: string | null | undefined): string | null {
  if (uid == null) return null;
  const trimmed = uid.trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

type RfidExclude =
  | { kind: 'student'; id: string }
  | { kind: 'staff'; id: string; source?: 'hr' | 'iam' | 'timetable' };

type RfidHolder = {
  role: 'student' | 'staff';
  id: string;
  name: string;
  code?: string | null;
  school?: string | null;
  source?: string;
};

async function findGlobalRfidHolders(rfidUid: string): Promise<RfidHolder[]> {
  const [student, hr, timetable, iam] = await Promise.all([
    smartAccessModuleClient.lookupStudentByRfid(rfidUid),
    smartAccessModuleClient.lookupHrStaffByRfid(rfidUid),
    smartAccessModuleClient.lookupTimetableStaffByRfid(rfidUid),
    findIamUserByRfid(rfidUid),
  ]);

  const holders: RfidHolder[] = [];

  if (student) {
    holders.push({
      role: 'student',
      id: student.id ?? student.studentId ?? '',
      name: student.name ?? student.studentName ?? 'Student',
      code: student.code ?? student.studentCode,
      school: student.organizationName,
    });
  }
  if (hr) {
    holders.push({
      role: 'staff',
      id: hr.id,
      name: hr.name,
      code: hr.code,
      school: hr.organizationName,
      source: 'hr',
    });
  }
  if (timetable) {
    holders.push({
      role: 'staff',
      id: timetable.id,
      name: timetable.name,
      code: timetable.code,
      school: timetable.organizationName,
      source: 'timetable',
    });
  }
  if (iam) {
    holders.push({
      role: 'staff',
      id: iam.id,
      name: iam.name,
      code: iam.code,
      school: iam.organizationName,
      source: 'iam',
    });
  }

  return holders.filter((h) => Boolean(h.id));
}

function holderMatchesExclude(holder: RfidHolder, exclude: RfidExclude): boolean {
  if (exclude.kind === 'student') {
    return holder.role === 'student' && holder.id === exclude.id;
  }
  if (holder.role !== 'staff' || holder.id !== exclude.id) return false;
  if (!exclude.source || !holder.source) return true;
  return holder.source === exclude.source;
}

async function assertRfidGloballyUnique(rawUid: string | null | undefined, exclude: RfidExclude) {
  const rfidUid = normalizeRfidUid(rawUid);
  if (!rfidUid) return;

  const holders = await findGlobalRfidHolders(rfidUid);
  const conflict = holders.find((h) => !holderMatchesExclude(h, exclude));
  if (!conflict) return;

  const who =
    conflict.role === 'student'
      ? `student ${conflict.name}${conflict.code ? ` (${conflict.code})` : ''}`
      : `staff ${conflict.name}${conflict.code ? ` (${conflict.code})` : ''}`;
  const school = conflict.school ? ` at ${conflict.school}` : '';
  throw new AppError(
    409,
    `Card ${rfidUid} is already assigned to ${who}${school}. Each card can belong to only one person.`
  );
}

function buildLocationWhere(filters?: {
  provinceId?: string;
  districtId?: string;
  sectorId?: string;
}): Prisma.OrganizationWhereInput | null {
  if (!filters?.provinceId && !filters?.districtId && !filters?.sectorId) return null;

  if (filters.sectorId) {
    return {
      OR: [{ sectorId: filters.sectorId }, { cell: { sectorId: filters.sectorId } }],
    };
  }

  if (filters.districtId) {
    return {
      OR: [
        { districtId: filters.districtId },
        { sector: { districtId: filters.districtId } },
        { cell: { sector: { districtId: filters.districtId } } },
      ],
    };
  }

  if (filters.provinceId) {
    return {
      OR: [
        { provinceId: filters.provinceId },
        { district: { provinceId: filters.provinceId } },
        { sector: { district: { provinceId: filters.provinceId } } },
        { cell: { sector: { district: { provinceId: filters.provinceId } } } },
      ],
    };
  }

  return null;
}

function postalFromRegistrationPayloadJson(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const raw = (payload as { postalAddress?: unknown }).postalAddress;
  if (raw == null) return null;
  const s = String(raw).trim();
  return s || null;
}

export const smartAccessService = {
  async listSchools(filters?: {
    provinceId?: string;
    districtId?: string;
    sectorId?: string;
    search?: string;
  }) {
    const where: Prisma.OrganizationWhereInput = {
      slug: { not: PLATFORM_SLUG },
      type: { in: [...SCHOOL_TYPES] },
      status: { in: ['ACTIVE', 'PENDING'] },
    };

    const locationWhere = buildLocationWhere(filters);
    if (locationWhere) {
      where.AND = [locationWhere];
    }

    if (filters?.search?.trim()) {
      const q = filters.search.trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { organizationCode: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const rows = await prisma.organization.findMany({
      where,
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      include: {
        province: { select: { id: true, name: true } },
        district: { select: { id: true, name: true } },
        sector: { select: { id: true, name: true } },
        registration: { select: { payload: true } },
        schoolProfile: {
          select: {
            schoolCategory: true,
            schoolProgram: true,
            educationLevels: true,
          },
        },
      },
    });

    return rows.map((org) => ({
      id: org.id,
      name: org.name,
      email: org.email,
      phone: org.phone ?? null,
      poBox:
        org.poBox?.trim() ||
        org.physicalAddress?.trim() ||
        postalFromRegistrationPayloadJson(org.registration?.payload) ||
        null,
      website: org.website ?? null,
      status: org.status,
      organizationCode: org.organizationCode,
      province: org.province?.name ?? null,
      district: org.district?.name ?? null,
      sector: org.sector?.name ?? null,
      schoolCategory: org.schoolProfile?.schoolCategory ?? org.category ?? null,
      schoolProgram: org.schoolProfile?.schoolProgram ?? null,
      educationLevels: Array.isArray(org.schoolProfile?.educationLevels)
        ? (org.schoolProfile.educationLevels as string[])
        : [],
      locationComplete: Boolean(org.provinceId && org.districtId),
      logoUrl: org.logoUrl ?? null,
    }));
  },

  listStudents(
    organizationId: string,
    opts?: { search?: string; academicYear?: string; classId?: string; className?: string }
  ) {
    return smartAccessModuleClient.listStudents(organizationId, opts);
  },

  listClasses(organizationId: string) {
    return smartAccessModuleClient.listClasses(organizationId);
  },

  listParents(organizationId: string, opts?: { studentId?: string }) {
    return smartAccessModuleClient.listParents(organizationId, opts);
  },

  toggleParentSms(organizationId: string, parentId: string, enabled: boolean) {
    return smartAccessModuleClient.toggleParentSms(organizationId, parentId, enabled);
  },

  bulkParentSms(organizationId: string, enabled: boolean) {
    return smartAccessModuleClient.bulkParentSms(organizationId, enabled, true);
  },

  async listStaff(organizationId: string, opts?: { search?: string }) {
    const [hrRows, iamRows, timetableRows] = await Promise.all([
      smartAccessModuleClient.listStaffFromHr(organizationId, opts),
      listIamUsersForSmartAccess(organizationId, opts),
      smartAccessModuleClient.listStaffFromTimetable(organizationId, opts),
    ]);

    const iamPhotoById = new Map(
      iamRows.filter((row) => row.photoUrl).map((row) => [row.id, row.photoUrl as string])
    );
    const enrichedTimetable = timetableRows.map((row) => {
      if (row.photoUrl) return row;
      const linkedPhoto = iamPhotoById.get(row.employeeNumber);
      if (linkedPhoto) return { ...row, photoUrl: linkedPhoto };
      return row;
    });

    return mergeStaffLists(hrRows, iamRows, enrichedTimetable, opts?.search);
  },

  async updateStudentIdentity(
    organizationId: string,
    studentId: string,
    body: { rfidUid?: string | null; fingerprintId?: string | null; identityRemarks?: string | null }
  ) {
    if (body.rfidUid !== undefined) {
      await assertRfidGloballyUnique(body.rfidUid, { kind: 'student', id: studentId });
    }
    return smartAccessModuleClient.updateStudentIdentity(organizationId, studentId, body);
  },

  async updateStaffIdentity(
    organizationId: string,
    staffId: string,
    body: { rfidUid?: string | null; fingerprintId?: string | null; identityRemarks?: string | null },
    source?: 'hr' | 'iam' | 'timetable'
  ) {
    if (body.rfidUid !== undefined) {
      await assertRfidGloballyUnique(body.rfidUid, { kind: 'staff', id: staffId, source });
    }
    if (source === 'iam') {
      return updateIamUserIdentity(organizationId, staffId, body);
    }
    return smartAccessModuleClient.updateStaffIdentity(organizationId, staffId, body, source);
  },
};
