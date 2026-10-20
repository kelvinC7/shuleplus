import { Request, Response, NextFunction } from 'express';
import { smartAccessService } from '../services/smart-access.service';

export const smartAccessController = {
  async schools(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await smartAccessService.listSchools({
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

  async students(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const data = await smartAccessService.listStudents(organizationId, {
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        classId: typeof req.query.classId === 'string' ? req.query.classId : undefined,
        className: typeof req.query.className === 'string' ? req.query.className : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async classes(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const data = await smartAccessService.listClasses(organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async parents(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const data = await smartAccessService.listParents(organizationId, {
        studentId: typeof req.query.studentId === 'string' ? req.query.studentId : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async toggleParentSms(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const parentId = String(req.params.parentId ?? '');
      const { enabled } = req.body as { enabled: boolean };
      const data = await smartAccessService.toggleParentSms(organizationId, parentId, enabled);
      if (enabled) {
        try {
          const { attendanceModuleClient } = await import('../clients/attendance-module.client');
          await attendanceModuleClient.enableSmsChannel(organizationId);
        } catch {
          /* optional */
        }
      }
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async bulkParentSms(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const { enabled } = req.body as { enabled?: boolean };
      if (typeof enabled !== 'boolean') {
        res.status(400).json({ success: false, message: 'enabled boolean is required' });
        return;
      }
      const data = await smartAccessService.bulkParentSms(organizationId, enabled);
      // Also turn on Attendance gate SMS channel so taps can deliver messages
      try {
        const { attendanceModuleClient } = await import('../clients/attendance-module.client');
        await attendanceModuleClient.enableSmsChannel(organizationId);
      } catch {
        /* Attendance module optional — parent flags still saved */
      }
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async staff(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const data = await smartAccessService.listStaff(organizationId, {
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateStudentIdentity(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const studentId = String(req.params.studentId ?? '');
      const data = await smartAccessService.updateStudentIdentity(organizationId, studentId, req.body ?? {});
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateStaffIdentity(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const staffId = String(req.params.staffId ?? '');
      const source =
        req.query.source === 'hr' || req.query.source === 'timetable' || req.query.source === 'iam'
          ? req.query.source
          : undefined;
      const data = await smartAccessService.updateStaffIdentity(
        organizationId,
        staffId,
        req.body ?? {},
        source
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
