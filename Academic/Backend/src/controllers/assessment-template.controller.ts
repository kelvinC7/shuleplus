import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { assessmentTemplateService } from '../services/assessment-template.service';

const componentSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(20),
  description: z.string().optional(),
  weightPercentage: z.number().min(0).max(100).optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  academicLevel: z.enum(['NURSERY', 'PRIMARY', 'SECONDARY', 'TVET', 'O_LEVEL', 'A_LEVEL', 'UNIVERSITY']),
  academicYear: z.string().min(1),
  term: z.string().min(1),
  calculationMethod: z.enum(['WEIGHTED_AVERAGE', 'SIMPLE_AVERAGE', 'BEST_SCORE', 'SUM_OF_SCORES']).optional(),
  defaultCourseMarks: z.number().min(1).max(1000).optional(),
  applicableClasses: z.any().optional(),
  components: z.array(componentSchema).min(1, 'At least one component is required'),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  academicLevel: z
    .enum(['NURSERY', 'PRIMARY', 'SECONDARY', 'TVET', 'O_LEVEL', 'A_LEVEL', 'UNIVERSITY'])
    .optional(),
  academicYear: z.string().min(1).optional(),
  term: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'REJECTED']).optional(),
  defaultCourseMarks: z.number().min(1).max(1000).optional(),
});

const syncComponentsSchema = z.object({
  components: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        code: z.string().min(1).max(20),
        weightPercentage: z.number().min(0).max(100),
        sortOrder: z.number().int().optional(),
        required: z.boolean().optional(),
        isActive: z.boolean().optional(),
        maxMark: z.number().min(0).optional(),
      })
    )
    .min(1),
});

const rejectTemplateSchema = z.object({
  reason: z.string().max(500).optional(),
});

const addComponentSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(20),
  description: z.string().optional(),
  weightPercentage: z.number().min(0).max(100).optional(),
  sortOrder: z.number().int().optional(),
});

const updateComponentSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).max(20).optional(),
  description: z.string().optional(),
  weightPercentage: z.number().min(0).max(100).optional(),
  maxMark: z.number().min(0).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  required: z.boolean().optional(),
});

const assignClassSchema = z.object({
  classId: z.string().uuid(),
});

const enterMarksSchema = z.object({
  subjectId: z.string().uuid(),
  marks: z.array(z.object({
    studentId: z.string().uuid(),
    componentId: z.string().uuid(),
    score: z.number().min(0),
    remarks: z.string().optional(),
  })),
});

const gradingScaleSchema = z.object({
  name: z.string().min(1),
  academicLevel: z.enum(['NURSERY', 'PRIMARY', 'SECONDARY', 'TVET', 'O_LEVEL', 'A_LEVEL', 'UNIVERSITY']),
  grades: z.array(z.object({
    minPercentage: z.number().min(0).max(100),
    maxPercentage: z.number().min(0).max(100),
    grade: z.string().min(1),
    description: z.string().optional(),
    remarks: z.string().optional(),
    sortOrder: z.number().int().optional(),
  })),
});

export class AssessmentTemplateController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createTemplateSchema.parse(req.body);
      const data = await assessmentTemplateService.create(req.organizationRef!, {
        ...body,
        createdBy: req.user?.sub,
      });
      res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        academicYear: req.query.academicYear as string | undefined,
        term: req.query.term as string | undefined,
        academicLevel: req.query.academicLevel as string | undefined,
      };
      const data = await assessmentTemplateService.list(req.organizationRef!, filters);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await assessmentTemplateService.getById(req.params.id as string, req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateTemplateSchema.parse(req.body);
      const data = await assessmentTemplateService.update(req.params.id as string, req.organizationRef!, body);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await assessmentTemplateService.delete(req.params.id as string, req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async syncComponents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = syncComponentsSchema.parse(req.body);
      const data = await assessmentTemplateService.syncComponents(
        req.params.id as string,
        req.organizationRef!,
        body.components.map((c, idx) => ({
          ...c,
          sortOrder: c.sortOrder ?? idx,
        }))
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async addComponent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = addComponentSchema.parse(req.body);
      const data = await assessmentTemplateService.addComponent(req.params.id as string, req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  }

  async updateComponent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateComponentSchema.parse(req.body);
      const data = await assessmentTemplateService.updateComponent(req.params.componentId as string, req.organizationRef!, body);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async deleteComponent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await assessmentTemplateService.deleteComponent(req.params.componentId as string, req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await assessmentTemplateService.approve(
        req.params.id as string,
        req.organizationRef!,
        req.user?.sub
      );
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = rejectTemplateSchema.parse(req.body ?? {});
      const data = await assessmentTemplateService.reject(
        req.params.id as string,
        req.organizationRef!,
        body.reason
      );
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async assignToClass(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = assignClassSchema.parse(req.body);
      const data = await assessmentTemplateService.assignToClass(req.params.id as string, req.organizationRef!, {
        ...body,
        assignedBy: req.user?.sub,
      });
      res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  }

  async removeAssignment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await assessmentTemplateService.removeClassAssignment(req.params.assignmentId as string, req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async listAssignments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        templateId: req.query.templateId as string | undefined,
        classId: req.query.classId as string | undefined,
        academicYear: req.query.academicYear as string | undefined,
        term: req.query.term as string | undefined,
      };
      const data = await assessmentTemplateService.listAssignments(req.organizationRef!, filters);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async enterMarks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = enterMarksSchema.parse(req.body);
      const data = await assessmentTemplateService.enterMarks(req.params.assignmentId as string, req.organizationRef!, {
        ...body,
        enteredBy: req.user?.sub,
      });
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async calculateResults(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await assessmentTemplateService.calculateResults(req.params.assignmentId as string, req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getClassResults(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await assessmentTemplateService.getClassResults(req.params.assignmentId as string, req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getStudentResults(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        studentId: req.query.studentId as string,
        academicYear: req.query.academicYear as string,
        term: req.query.term as string | undefined,
      };
      const data = await assessmentTemplateService.getStudentResults(req.organizationRef!, filters);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getReportCard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { studentId, classId, academicYear, term } = req.query;
      const data = await assessmentTemplateService.getReportCard(
        req.organizationRef!,
        studentId as string,
        classId as string,
        academicYear as string,
        term as string | undefined,
      );
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getGrowthData(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { studentId, classId } = req.query;
      const data = await assessmentTemplateService.getGrowthData(
        req.organizationRef!,
        studentId as string,
        classId as string,
      );
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async createGradingScale(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = gradingScaleSchema.parse(req.body);
      const data = await assessmentTemplateService.createGradingScale(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getGradingScales(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const academicLevel = req.query.academicLevel as string | undefined;
      const data = await assessmentTemplateService.getGradingScales(req.organizationRef!, academicLevel);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}

export const assessmentTemplateController = new AssessmentTemplateController();
