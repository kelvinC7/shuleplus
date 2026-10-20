import { AuditAction, RepresentativeAssignmentStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
  DEFAULT_CHIEF_ACCOUNTANT_PERMISSIONS,
  mergeChiefAccountantPermissions,
  pickChiefAccountantPermissions,
  type ChiefAccountantPermissionProfile,
} from '../constants/chief-accountant-permissions';

export class OrgChiefAccountantAccessService {
  async listForOrganization(organizationId: string) {
    const rows = await prisma.chiefAccountantAssignment.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
            lastLoginAt: true,
            chiefAccountantProfile: {
              select: { accessLevel: true, enforceMfa: true, permissions: true },
            },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return rows.map((a) => ({
      assignmentId: a.id,
      userId: a.userId,
      organizationId: a.organizationId,
      status: a.status,
      permissions: mergeChiefAccountantPermissions(
        a.user.chiefAccountantProfile?.permissions,
        a.permissions
      ) as ChiefAccountantPermissionProfile,
      assignedAt: a.assignedAt.toISOString(),
      expiresAt: a.expiresAt?.toISOString() ?? null,
      user: {
        id: a.user.id,
        email: a.user.email,
        firstName: a.user.firstName,
        lastName: a.user.lastName,
        phone: a.user.phone,
        status: a.user.status,
        lastLoginAt: a.user.lastLoginAt?.toISOString() ?? null,
        accessLevel: a.user.chiefAccountantProfile?.accessLevel ?? 'prepare',
        enforceMfa: a.user.chiefAccountantProfile?.enforceMfa ?? false,
      },
      managedBy: 'platform' as const,
      canDeleteUser: false,
    }));
  }

  private async getAssignment(organizationId: string, userId: string) {
    const row = await prisma.chiefAccountantAssignment.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!row) throw new AppError(404, 'Chief Accountant is not assigned to this organization');
    return row;
  }

  /** Org admin: finance modules + suspend/activate for this school only. */
  async updateOrgAssignment(
    actorId: string,
    organizationId: string,
    userId: string,
    data: {
      permissions?: unknown;
      status?: RepresentativeAssignmentStatus;
    }
  ) {
    const assignment = await this.getAssignment(organizationId, userId);
    const patch = pickChiefAccountantPermissions(data.permissions);
    const moduleScope =
      data.permissions &&
      typeof data.permissions === 'object' &&
      !Array.isArray(data.permissions) &&
      (data.permissions as Record<string, unknown>).moduleScope;
    const merged: Record<string, unknown> = {
      ...DEFAULT_CHIEF_ACCOUNTANT_PERMISSIONS,
      ...(typeof assignment.permissions === 'object' && assignment.permissions
        ? (assignment.permissions as object)
        : {}),
      ...patch,
    };
    if (moduleScope !== undefined && typeof moduleScope === 'object' && moduleScope !== null) {
      merged.moduleScope = moduleScope;
    }

    let status = assignment.status;
    if (data.status) {
      if (
        data.status !== RepresentativeAssignmentStatus.ACTIVE &&
        data.status !== RepresentativeAssignmentStatus.SUSPENDED
      ) {
        throw new AppError(400, 'Organization admin can only set ACTIVE or SUSPENDED');
      }
      status = data.status;
    }

    const updated = await prisma.chiefAccountantAssignment.update({
      where: { id: assignment.id },
      data: {
        permissions: merged as import('../generated/prisma').Prisma.InputJsonValue,
        status,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: actorId,
        action: AuditAction.USER_UPDATED,
        resource: 'CHIEF_ACCOUNTANT_ASSIGNMENT',
        resourceId: assignment.id,
        metadata: {
          chiefAccountantUserId: userId,
          permissions: patch,
          status,
          operation: 'ORG_CA_SCOPE_UPDATED',
        },
      },
    });

    return updated;
  }

  /** Revoke school link only (not delete platform user). Rep or Super Admin. */
  async revokeSchoolAssignment(
    actorId: string,
    organizationId: string,
    userId: string,
    actorRole: 'school_representative' | 'super_admin'
  ) {
    const assignment = await this.getAssignment(organizationId, userId);
    await prisma.chiefAccountantAssignment.delete({ where: { id: assignment.id } });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: actorId,
        action: AuditAction.USER_UPDATED,
        resource: 'CHIEF_ACCOUNTANT_ASSIGNMENT',
        resourceId: assignment.id,
        metadata: {
          chiefAccountantUserId: userId,
          operation: 'CA_SCHOOL_ASSIGNMENT_REVOKED',
          revokedByRole: actorRole,
        },
      },
    });

    return { revoked: true, userId, organizationId };
  }
}

export const orgChiefAccountantAccessService = new OrgChiefAccountantAccessService();
