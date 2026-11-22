import { Request, Response, NextFunction } from 'express';
import { staffSchoolAssignmentService } from '../services/staff-school-assignment.service';

function actorId(req: Request): string | undefined {
  const u = (req as any).user;
  return u?.userId || u?.id || undefined;
}

export const staffSchoolAssignmentController = {
  async schools(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await staffSchoolAssignmentService.listSchools({
        provinceId: typeof req.query.provinceId === 'string' ? req.query.provinceId : undefined,
        districtId: typeof req.query.districtId === 'string' ? req.query.districtId : undefined,
        sectorId: typeof req.query.sectorId === 'string' ? req.query.sectorId : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async listStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? req.query.organizationId ?? '');
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const data = await staffSchoolAssignmentService.listStaff(organizationId, { search });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async listAssignmentsForSchool(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const data = await staffSchoolAssignmentService.listAssignmentsForSchool(organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async listAssignmentsForStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const staffKey = String(req.params.staffKey ?? req.query.staffKey ?? '');
      const data = await staffSchoolAssignmentService.listAssignmentsForStaff(staffKey);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async upsert(req: Request, res: Response, next: NextFunction) {
    try {
      const body = (req.body ?? {}) as any;
      const organizationId = String(body.organizationId ?? req.params.organizationId ?? '');
      const staff = body.staff ?? {};
      // allow flat fields too
      const staffInput = {
        staffKey: staff.staffKey ?? body.staffKey,
        iamUserId: staff.iamUserId ?? body.iamUserId,
        email: staff.email ?? body.email,
        externalId: staff.externalId ?? staff.employeeNumber ?? body.externalId ?? body.employeeNumber,
        source: staff.source ?? body.source,
        staffName: staff.staffName ?? staff.fullName ?? staff.name ?? body.staffName,
        homeOrganizationId: staff.homeOrganizationId ?? body.homeOrganizationId,
      };
      const targetOrganizationIds: string[] = Array.isArray(body.targetOrganizationIds)
        ? body.targetOrganizationIds
        : Array.isArray(body.schoolIds)
          ? body.schoolIds
          : typeof body.targetOrganizationId === 'string'
            ? [body.targetOrganizationId]
            : [];
      const data = await staffSchoolAssignmentService.upsertAssignments({
        actorId: actorId(req),
        organizationId,
        staff: staffInput,
        targetOrganizationIds,
        replace: Boolean(body.replace),
        notes: body.notes ?? null,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? (req.body as any)?.organizationId ?? '');
      const staffKey = String(req.params.staffKey ?? (req.body as any)?.staffKey ?? '');
      const assignmentId = String(req.params.assignmentId ?? (req.body as any)?.assignmentId ?? '');
      const data = await staffSchoolAssignmentService.removeAssignment({
        actorId: actorId(req),
        organizationId,
        staffKey: staffKey || undefined,
        assignmentId: assignmentId || undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
