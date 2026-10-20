import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { studentsService } from "../services/students.service";

const studentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  className: z.string().optional(),
  academicYear: z.string().optional(),
  academicStudentId: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  profileMeta: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

const measurementSchema = z.object({
  height: z.union([z.string(), z.number()]).optional(),
  weight: z.union([z.string(), z.number()]).optional(),
  chest: z.union([z.string(), z.number()]).optional(),
  waist: z.union([z.string(), z.number()]).optional(),
  hip: z.union([z.string(), z.number()]).optional(),
  shoulder: z.union([z.string(), z.number()]).optional(),
  leg: z.union([z.string(), z.number()]).optional(),
  sleeve: z.union([z.string(), z.number()]).optional(),
  shirtSize: z.string().optional(),
  trouserSize: z.string().optional(),
  skirtSize: z.string().optional(),
  dressSize: z.string().optional(),
  sweaterSize: z.string().optional(),
  shoeSize: z.string().optional(),
  sportSize: z.string().optional(),
  hatSize: z.string().optional(),
  beltSize: z.string().optional(),
  sizes: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string().min(1),
        value: z.string().min(1),
      }),
    )
    .optional(),
});

const checklistSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().optional(),
      owned: z.boolean(),
      quantity: z.number().int().positive().optional(),
    }),
  ),
});

const bulkImportSchema = z.object({
  rows: z
    .array(
      studentSchema.extend({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
      }),
    )
    .min(1)
    .max(2000),
});

export class StudentsController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { search, className } = req.query;
      const data = await studentsService.list(req.organizationRef!, {
        search: typeof search === "string" ? search : undefined,
        className: typeof className === "string" ? className : undefined,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = studentSchema.parse(req.body);
      const data = await studentsService.create(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async academicSearch(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const q = typeof req.query.q === "string" ? req.query.q : "";
      const data = await studentsService.academicSearch(
        req.organizationRef!,
        q,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async academicStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const modules = req.user?.modules ?? [];
      const licensedInJwt = modules.some(
        (m) =>
          m === "student-management" ||
          m === "academic" ||
          m === "academic-1",
      );
      const availability = await studentsService.academicAvailability(
        req.organizationRef!,
      );
      res.json({
        success: true,
        data: {
          licensedInJwt,
          ...availability,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async syncAcademic(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await studentsService.syncFromAcademic(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async bulkImport(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = bulkImportSchema.parse(req.body);
      const data = await studentsService.bulkImport(
        req.organizationRef!,
        body.rows,
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await studentsService.getProfile(
        req.organizationRef!,
        String(req.params.id),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = studentSchema.partial().parse(req.body);
      const data = await studentsService.update(
        req.organizationRef!,
        String(req.params.id),
        body,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async upsertMeasurement(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = measurementSchema.parse(req.body);
      const data = await studentsService.upsertMeasurement(
        req.organizationRef!,
        String(req.params.id),
        body,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async setChecklist(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = checklistSchema.parse(req.body);
      const data = await studentsService.setChecklist(
        req.organizationRef!,
        String(req.params.id),
        body.items,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const studentsController = new StudentsController();
