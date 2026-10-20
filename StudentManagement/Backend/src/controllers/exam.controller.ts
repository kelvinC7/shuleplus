import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { examService } from '../services/exam.service';

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['MIDTERM', 'FINAL', 'ASSIGNMENT', 'QUIZ', 'CAT', 'HOMEWORK', 'PRACTICAL']),
  academicYear: z.string().min(1),
  term: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['DRAFT', 'UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  description: z.string().optional(),
  totalMarks: z.number().int().positive().optional(),
  passingMarks: z.number().int().positive().optional(),
});

const updateSchema = createSchema.partial();

export class ExamController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await examService.create(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        academicYear: req.query.academicYear as string | undefined,
        type: req.query.type as string | undefined,
      };
      const data = await examService.list(req.organizationRef!, filters);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examService.getById(req.params.id as string, req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await examService.update(req.params.id as string, req.organizationRef!, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examService.delete(req.params.id as string, req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listAcademicYears(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examService.listAcademicYears(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const examController = new ExamController();
