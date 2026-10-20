import { Request, Response } from 'express';
import { competencyService } from '../services/competency.service';

export class CompetencyController {
  async createTemplate(req: Request, res: Response) {
    try {
      const organizationId = (req as any).organizationId;
      const template = await competencyService.createTemplate(organizationId, req.body);
      res.json({ data: template });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to create template' });
    }
  }

  async getTemplates(_req: Request, res: Response) {
    try {
      const organizationId = (_req as any).organizationId;
      const templates = await competencyService.getTemplates(organizationId);
      res.json({ data: templates });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch templates' });
    }
  }

  async getTemplateById(req: Request, res: Response) {
    try {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;
      const template = await competencyService.getTemplateById(id as string, organizationId);
      if (!template) {
        res.status(404).json({ message: 'Template not found' });
        return;
      }
      res.json({ data: template });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch template' });
    }
  }

  async updateTemplate(req: Request, res: Response) {
    try {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;
      const template = await competencyService.updateTemplate(id as string, organizationId, req.body);
      res.json({ data: template });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to update template' });
    }
  }

  async deleteTemplate(req: Request, res: Response) {
    try {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;
      await competencyService.deleteTemplate(id as string, organizationId);
      res.json({ data: { success: true } });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to delete template' });
    }
  }

  async recordStudentCompetency(req: Request, res: Response) {
    try {
      const organizationId = (req as any).organizationId;
      const record = await competencyService.recordStudentCompetency(organizationId, req.body);
      res.json({ data: record });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to record competency' });
    }
  }

  async getStudentCompetencies(req: Request, res: Response) {
    try {
      const organizationId = (req as any).organizationId;
      const { studentId } = req.params;
      const { academicYear, term } = req.query;
      const records = await competencyService.getStudentCompetencies(
        organizationId,
        studentId as string,
        academicYear as string | undefined,
        term as string | undefined,
      );
      res.json({ data: records });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch student competencies' });
    }
  }

  async getClassCompetencies(req: Request, res: Response) {
    try {
      const organizationId = (req as any).organizationId;
      const { templateId, academicYear, term } = req.query;
      if (!templateId || !academicYear || !term) {
        res.status(400).json({ message: 'templateId, academicYear, and term are required' });
        return;
      }
      const records = await competencyService.getClassCompetencies(
        organizationId,
        templateId as string,
        academicYear as string,
        term as string,
      );
      res.json({ data: records });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch class competencies' });
    }
  }
}

export const competencyController = new CompetencyController();
