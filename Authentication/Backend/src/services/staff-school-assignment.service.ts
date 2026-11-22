import { AuditAction, RepresentativeAssignmentStatus } from '../generated/prisma';
import { attendanceModuleClient } from '../clients/attendance-module.client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { smartAccessService } from './smart-access.service';

type StaffIdentityInput = {
  staffKey?: string;
  iamUserId?: string | null;
  email?: string | null;
  externalId?: string | null;
  source?: string | null;
  staffName?: string | null;
  homeOrganizationId?: string | null;
};

function norm(v: unknown): string | null {
  const s = String(v ?? '').trim();
  return s || null;
}
function normEmail(v: unknown): string | null {
  const s = norm(v);
  return s ? s.toLowerCase() : null;
}

export function deriveStaffKey(input: StaffIdentityInput): string {
  const explicit = norm(input.staffKey);
  if (explicit) return explicit;
  const iamUserId = norm(input.iamUserId);
  if (iamUserId) return `iam:${iamUserId}`;
  const email = normEmail(input.email);
  if (email) return `email:${email}`;
  const source = (norm(input.source) || 'staff').toLowerCase();
  const externalId = norm(input.externalId);
  if (externalId) return `${source}:${externalId}`;
  throw new AppError(400, 'Unable to derive staffKey: provide staffKey, iamUserId, email, or externalId+source');
}

function toSyncRecord(a: {
  staffKey: string;
  iamUserId: string | null;
  email: string | null;
  externalId: string | null;
  source: string | null;
  status: RepresentativeAssignmentStatus | string;
}) {
  return {
    staffKey: a.staffKey,
    iamUserId: a.iamUserId,
    email: a.email,
    externalId: a.externalId,
    source: a.source,
    status: String(a.status),
  };
}

async function syncOrgToAttendance(organizationId: string) {
  const active = await prisma.staffSchoolAssignment.findMany({
    where: { organizationId, status: RepresentativeAssignmentStatus.ACTIVE },
    select: { staffKey: true, iamUserId: true, email: true, externalId: true, source: true, status: true },
  });
  await attendanceModuleClient.syncStaffSchoolAccess(organizationId, active.map(toSyncRecord));
}

async function audit(actorId: string | undefined, action: AuditAction, resourceId: string, metadata: any, organizationId?: string) {
  const platformOrgId =
    organizationId ||
    (await prisma.organization.findFirst({ where: { organizationCode: 'SHULEPLUS-HQ' }, select: { id: true } }))?.id ||
    (await prisma.organization.findFirst({ select: { id: true } }))?.id;
  if (!platformOrgId) return;
  await prisma.auditLog.create({
    data: {
      organizationId: platformOrgId,
      userId: actorId ?? null,
      action,
      resource: 'STAFF_SCHOOL_ASSIGNMENT',
      resourceId,
      metadata,
    } as any,
  }).catch(() => null);
}

export const staffSchoolAssignmentService = {
  async listSchools(filters?: {
    provinceId?: string;
    districtId?: string;
    sectorId?: string;
    search?: string;
  }) {
    return smartAccessService.listSchools(filters);
  },

  async listStaff(organizationId: string, opts?: { search?: string }) {
    if (!organizationId) throw new AppError(400, 'organizationId is required');
    return smartAccessService.listStaff(organizationId, opts);
  },

  async listAssignmentsForSchool(organizationId: string) {
    if (!organizationId) throw new AppError(400, 'organizationId is required');
    return prisma.staffSchoolAssignment.findMany({
      where: { organizationId },
      orderBy: [{ status: 'asc' }, { assignedAt: 'desc' }],
    });
  },

  async listAssignmentsForStaff(staffKey: string) {
    const key = norm(staffKey);
    if (!key) throw new AppError(400, 'staffKey is required');
    return prisma.staffSchoolAssignment.findMany({
      where: { staffKey: key },
      orderBy: [{ status: 'asc' }, { assignedAt: 'desc' }],
    });
  },

  async upsertAssignments(params: {
    actorId?: string;
    organizationId: string; // primary context/school (UI selected school) - not required by record except audit context; assignments specify target schools
    staff: StaffIdentityInput & { staffName?: string | null };
    targetOrganizationIds: string[];
    replace?: boolean;
    notes?: string | null;
  }) {
    const targets = Array.from(new Set((params.targetOrganizationIds || []).map((s) => String(s).trim()).filter(Boolean)));
    if (!targets.length) throw new AppError(400, 'Select at least one school to assign');
    const staffKey = deriveStaffKey(params.staff);
    const iamUserId = norm(params.staff.iamUserId);
    const email = normEmail(params.staff.email);
    const externalId = norm(params.staff.externalId);
    const source = norm(params.staff.source);
    const staffName = norm(params.staff.staffName);
    const homeOrganizationId = norm(params.staff.homeOrganizationId || params.organizationId);

    // Validate target orgs exist
    const orgs = await prisma.organization.findMany({ where: { id: { in: targets } }, select: { id: true } });
    const valid = new Set(orgs.map((o) => o.id));
    const missing = targets.filter((t) => !valid.has(t));
    if (missing.length) throw new AppError(400, `Unknown school(s): ${missing.join(', ')}`);

    const actorId = params.actorId;
    const affectedOrgIds = new Set<string>(targets);
    const removedOrgIds = new Set<string>();

    if (params.replace) {
      const existing = await prisma.staffSchoolAssignment.findMany({
        where: { staffKey, status: RepresentativeAssignmentStatus.ACTIVE },
        select: { organizationId: true },
      });
      for (const e of existing) {
        affectedOrgIds.add(e.organizationId);
        if (!targets.includes(e.organizationId)) removedOrgIds.add(e.organizationId);
      }
      await prisma.staffSchoolAssignment.updateMany({
        where: { staffKey, organizationId: { notIn: targets }, status: RepresentativeAssignmentStatus.ACTIVE },
        data: { status: RepresentativeAssignmentStatus.SUSPENDED, updatedAt: new Date() },
      });
    }

    const results: any[] = [];
    for (const orgId of targets) {
      const row = await prisma.staffSchoolAssignment.upsert({
        where: { organizationId_staffKey: { organizationId: orgId, staffKey } },
        create: {
          organizationId: orgId,
          staffKey,
          iamUserId,
          email,
          externalId,
          source,
          staffName,
          homeOrganizationId,
          status: RepresentativeAssignmentStatus.ACTIVE,
          assignedById: actorId ?? null,
          notes: norm(params.notes),
        },
        update: {
          iamUserId,
          email,
          externalId,
          source,
          staffName,
          homeOrganizationId,
          status: RepresentativeAssignmentStatus.ACTIVE,
          assignedById: actorId ?? null,
          notes: norm(params.notes),
          updatedAt: new Date(),
        },
      });
      results.push(row);
    }

    // Sync all affected orgs (including those removed by replace)
    for (const orgId of affectedOrgIds) {
      await syncOrgToAttendance(orgId).catch(() => null);
    }
    // Explicitly remove access in Attendance for orgs dropped by replace (sync is additive-only for provided active rows)
    for (const orgId of removedOrgIds) {
      await attendanceModuleClient.removeStaffSchoolAccess(orgId, [staffKey]).catch(() => null);
    }

    await audit(actorId, AuditAction.USER_UPDATED, staffKey, {
      action: 'STAFF_SCHOOL_ASSIGNMENT_UPSERT',
      staffKey,
      staffName,
      targetOrganizationIds: targets,
      replace: !!params.replace,
      homeOrganizationId,
    }, params.organizationId);

    return { staffKey, assignments: results };
  },

  async removeAssignment(params: { actorId?: string; organizationId: string; staffKey?: string; assignmentId?: string }) {
    const { organizationId, assignmentId } = params;
    let staffKey = norm(params.staffKey);
    if (!organizationId) throw new AppError(400, 'organizationId is required');

    let assignment: any = null;
    if (assignmentId) {
      assignment = await prisma.staffSchoolAssignment.findUnique({ where: { id: assignmentId } });
    } else if (staffKey) {
      assignment = await prisma.staffSchoolAssignment.findUnique({
        where: { organizationId_staffKey: { organizationId, staffKey } },
      });
    }
    if (!assignment) throw new AppError(404, 'Staff assignment not found');
    staffKey = assignment.staffKey;

    await prisma.staffSchoolAssignment.update({
      where: { id: assignment.id },
      data: { status: RepresentativeAssignmentStatus.SUSPENDED, updatedAt: new Date() },
    });

    await syncOrgToAttendance(organizationId).catch(() => null);
    // Also tell Attendance to inactivate this key for org (idempotent)
    await attendanceModuleClient.removeStaffSchoolAccess(organizationId, [staffKey]).catch(() => null);

    await audit(params.actorId, AuditAction.USER_UPDATED, staffKey, {
      action: 'STAFF_SCHOOL_ASSIGNMENT_REMOVED',
      staffKey,
      organizationId,
      assignmentId: assignment.id,
    }, organizationId);

    return { removed: true, organizationId, staffKey };
  },
};
