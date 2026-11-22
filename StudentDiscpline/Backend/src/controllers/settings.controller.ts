import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { defaultAcademicSettings, fetchIamAcademicSettings } from '../clients/iam.client';
import { disciplineSettingsService } from '../services/discipline-settings.service';
import { attendanceDisciplineService } from '../services/attendance-discipline.service';

export const settingsController = {
  async getAcademic(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data =
        (await fetchIamAcademicSettings(req.organizationRef!)) ?? defaultAcademicSettings();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getDiscipline(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineSettingsService.get(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateDiscipline(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineSettingsService.update(req.organizationRef!, req.body);
      res.json({ success: true, data });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('Starting score')) return next(new AppError(400, msg));
      next(e);
    }
  },

  /**
   * Service-to-service: apply configured attendance deductions for a roster
   * of absent or late students on one school day. Idempotent per day.
   */
  async applyAttendanceEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const event = String(req.body?.event ?? '').toUpperCase();
      if (event !== 'ABSENCE' && event !== 'LATE') {
        throw new AppError(400, 'event must be ABSENCE or LATE');
      }
      const eventType = event as 'ABSENCE' | 'LATE';
      const date = typeof req.body?.date === 'string' ? req.body.date.slice(0, 10) : '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new AppError(400, 'date must be in YYYY-MM-DD format');
      }
      const students = Array.isArray(req.body?.students) ? req.body.students : [];
      if (!students.length) throw new AppError(400, 'students is required');

      const data = await attendanceDisciplineService.applyEvent(req.organizationRef!, {
        event: eventType,
        date,
        students,
        recordedBy:
          (typeof req.body?.recordedBy === 'string' && req.body.recordedBy) ||
          'attendance-service',
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async applyStartingScore(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineSettingsService.applyStartingScoreToAll(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  /** Service-to-service: list orgs with auto daily absence deductions enabled. */
  async listAutoAbsenceEnabled(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineSettingsService.listAutoAbsenceEnabled();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  /** Service-to-service: record that auto absence deductions ran for a date. */
  async markAutoAbsenceRun(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.body?.organizationId ?? req.headers['x-organization-id'] ?? '').trim();
      const date = String(req.body?.date ?? '').slice(0, 10);
      if (!organizationId) throw new AppError(400, 'organizationId is required');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError(400, 'date is required (YYYY-MM-DD)');
      const data = await disciplineSettingsService.markAutoAbsenceRun(organizationId, date);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async seedDefaultMarks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineSettingsService.seedDefaultMarks(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async initializeStudents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineSettingsService.initializeAllStudents(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
