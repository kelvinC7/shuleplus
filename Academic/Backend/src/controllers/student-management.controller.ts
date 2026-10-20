import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { smListClasses, smListStudents, smListSubjects, smGetStudentProfile, smUpdateStudentStatus } from '../clients/student-management.client';

export class StudentManagementController {
  async listClasses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await smListClasses(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async listStudents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await smListStudents(req.organizationRef!, {
        classId: req.query.classId as string | undefined,
        className: req.query.className as string | undefined,
        academicYear: req.query.academicYear as string | undefined,
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
      });
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async listSubjects(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await smListSubjects(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getStudentProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { studentCode } = req.query;
      if (!studentCode) {
        res.status(400).json({ message: 'studentCode is required' });
        return;
      }
      const data = await smGetStudentProfile(req.organizationRef!, studentCode as string);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async updateStudentStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const studentId = req.params.id as string;
      const status = String((req.body as { status?: string })?.status ?? 'GRADUATED');
      const data = await smUpdateStudentStatus(req.organizationRef!, studentId, status);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}

export const smController = new StudentManagementController();
