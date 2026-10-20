import { Response, NextFunction, Request } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { taskService } from '../services/task.service';

function paramId(req: Request, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

function orgId(req: AuthenticatedRequest) {
  return req.organizationRef!;
}

export class TaskController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await taskService.list(orgId(req), req.query as Record<string, string>);
      res.json({ success: true, ...data });
    } catch (e) {
      next(e);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await taskService.getById(orgId(req), paramId(req, 'id'));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await taskService.create(orgId(req), req.user!.sub, req.user!.email, req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await taskService.update(orgId(req), paramId(req, 'id'), req.user!.sub, req.user!.email, req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await taskService.delete(orgId(req), paramId(req, 'id'), req.user!.sub, req.user!.email);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body as { status: string };
      const data = await taskService.updateStatus(orgId(req), paramId(req, 'id'), status as any, req.user!.sub, req.user!.email);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async board(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await taskService.board(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getSubtasks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await taskService.getSubtasks(orgId(req), paramId(req, 'id'));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createSubtask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await taskService.createSubtask(orgId(req), paramId(req, 'id'), req.user!.sub, req.user!.email, req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async addComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { content, mentions } = req.body as { content: string; mentions?: string[] };
      const data = await taskService.addComment(orgId(req), paramId(req, 'id'), req.user!.sub, req.user!.email, content, mentions ?? []);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getComments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await taskService.getComments(orgId(req), paramId(req, 'id'));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const taskController = new TaskController();
