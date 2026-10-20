import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { markService } from '../services/mark.service';

const bulkSaveSchema = z.object({
  examId: z.string().uuid(),
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  marks: z.array(z.object({
    studentId: z.string().uuid(),
    score: z.number(),
    remarks: z.string().optional(),
  })),
});

export class MarkController {
  async getStudentsForEntry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { classId, academicYear } = req.query;
      const data = await markService.getStudentsForEntry(req.organizationRef!, classId as string, academicYear as string);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getMarksForEntry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { examId, classId, subjectId } = req.query;
      const data = await markService.getMarksForEntry(req.organizationRef!, examId as string, classId as string, subjectId as string);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async bulkSave(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = bulkSaveSchema.parse(req.body);
      const data = await markService.bulkSave(req.organizationRef!, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listByExamAndClass(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { examId, classId } = req.query;
      const data = await markService.listByExamAndClass(req.organizationRef!, examId as string, classId as string);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await markService.delete(req.organizationRef!, req.params.id as string);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async deleteByEntry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { examId, classId, subjectId } = req.query;
      const data = await markService.deleteByEntry(req.organizationRef!, examId as string, classId as string, subjectId as string);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const markController = new MarkController();
