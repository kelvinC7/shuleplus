import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { enrollmentService } from '../services/enrollment.service';

const enrollSchema = z.object({
  studentId: z.string().min(1),
  classId: z.string().min(1),
  academicYear: z.string().min(1),
});

const promoteSchema = z.object({
  enrollmentId: z.string().min(1),
  newClassId: z.string().min(1),
  newAcademicYear: z.string().min(1),
});

const listQuerySchema = z.object({
  classId: z.string().optional(),
  academicYear: z.string().optional(),
  isCurrent: z.string().optional(),
});

const promotionListQuerySchema = z.object({
  classId: z.string().optional(),
  academicYear: z.string().optional(),
  search: z.string().optional(),
});

const updatePromotionSchema = z.object({
  newClassId: z.string().min(1),
});

export class EnrollmentController {
  async enroll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = enrollSchema.parse(req.body);
      const data = await enrollmentService.enroll(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async promote(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = promoteSchema.parse(req.body);
      const data = await enrollmentService.promote(req.organizationRef!, req.user!.sub, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const query = listQuerySchema.parse(req.query);
      const data = await enrollmentService.list(req.organizationRef!, query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listPromotions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const query = promotionListQuerySchema.parse(req.query);
      const data = await enrollmentService.listPromotions(req.organizationRef!, query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getPromotion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await enrollmentService.getPromotion(req.organizationRef!, req.params.id as string);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updatePromotion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updatePromotionSchema.parse(req.body);
      const data = await enrollmentService.updatePromotionTarget(
        req.organizationRef!,
        req.params.id as string,
        body.newClassId
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async revertPromotion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await enrollmentService.revertPromotion(req.organizationRef!, req.params.id as string);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const enrollmentController = new EnrollmentController();
