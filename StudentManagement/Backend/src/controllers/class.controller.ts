import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { classService } from '../services/class.service';
import { listTeacherCandidates } from '../services/teacher-candidate.service';

const educationLevelSchema = z.enum(['NURSERY', 'PRIMARY', 'SECONDARY', 'TVET']);

const createSchema = z.object({
  name: z.string().min(1),
  stream: z.string().optional(),
  category: educationLevelSchema.optional(),
  gradeId: z.string().optional(),
  combinationId: z.string().optional(),
});

const updateSchema = createSchema.partial();

const headTeacherSchema = z.object({
  headTeacherUserId: z.string().nullable().optional(),
  headTeacherRefId: z.string().nullable().optional(),
  headTeacherName: z.string().nullable().optional(),
  headTeacherEmail: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  headTeacherSource: z.enum(['TIMETABLE', 'HR', 'MANUAL']).nullable().optional(),
});

export class ClassController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await classService.create(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const headTeacherUserId =
        typeof req.query.headTeacherUserId === 'string' ? req.query.headTeacherUserId : undefined;
      const headTeacherEmail =
        typeof req.query.headTeacherEmail === 'string' ? req.query.headTeacherEmail : undefined;
      const headTeacherUserIds =
        typeof req.query.headTeacherUserIds === 'string'
          ? req.query.headTeacherUserIds.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined;
      const data = await classService.list(req.organizationRef!, {
        headTeacherUserId,
        headTeacherUserIds,
        headTeacherEmail,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async teacherCandidates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const data = await listTeacherCandidates(req.organizationRef!, search);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async assignHeadTeacher(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = headTeacherSchema.parse(req.body);
      const data = await classService.assignHeadTeacher(req.params.id as string, req.organizationRef!, {
        ...body,
        headTeacherEmail: body.headTeacherEmail === '' ? null : body.headTeacherEmail,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const academicYear =
        typeof req.query.academicYear === 'string' && req.query.academicYear.trim()
          ? req.query.academicYear.trim()
          : undefined;
      const data = await classService.getById(req.params.id as string, req.organizationRef!, academicYear);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await classService.update(req.params.id as string, req.organizationRef!, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await classService.delete(req.params.id as string, req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const classController = new ClassController();
