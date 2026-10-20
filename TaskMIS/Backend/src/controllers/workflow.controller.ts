import { Response, NextFunction, Request } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { workflowService } from '../services/workflow.service';

function paramId(req: Request, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

function orgId(req: AuthenticatedRequest) {
  return req.organizationRef!;
}

export class WorkflowController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await workflowService.list(orgId(req), req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await workflowService.getById(orgId(req), paramId(req, 'id'));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await workflowService.create(orgId(req), req.user!.sub, req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await workflowService.update(orgId(req), paramId(req, 'id'), req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await workflowService.delete(orgId(req), paramId(req, 'id'));
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  async startInstance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.body as { taskId?: string };
      const data = await workflowService.startInstance(orgId(req), paramId(req, 'id'), req.user!.sub, taskId);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getInstance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await workflowService.getInstance(orgId(req), paramId(req, 'instanceId'));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async decideStep(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { decision, comments } = req.body as { decision: 'COMPLETED' | 'REJECTED'; comments?: string };
      const data = await workflowService.decideStep(
        orgId(req), paramId(req, 'id'), paramId(req, 'stepId'),
        decision, req.user!.sub, req.user!.email, comments
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listInstances(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await workflowService.listInstances(orgId(req), req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getTemplates(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await workflowService.getTemplates();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createFromTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { templateId } = req.body as { templateId: string };
      const data = await workflowService.createFromTemplate(orgId(req), req.user!.sub, templateId);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const workflowController = new WorkflowController();
