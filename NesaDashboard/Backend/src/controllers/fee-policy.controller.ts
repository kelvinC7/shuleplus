import { Response, NextFunction } from 'express';
import { feePolicyService, type FeePolicyInput } from '../services/fee-policy.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

function actor(req: AuthenticatedRequest) {
  return { id: req.user?.sub, name: req.user?.name ?? req.user?.email };
}

function queryOf(req: AuthenticatedRequest): Record<string, string | undefined> {
  const q = req.query as Record<string, string | string[] | undefined>;
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(q)) {
    out[key] = Array.isArray(value) ? value[0] : value;
  }
  return out;
}

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export class FeePolicyController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feePolicyService.list(queryOf(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feePolicyService.get(param(req.params.id));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as FeePolicyInput;
      const data = await feePolicyService.create(body, actor(req));
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feePolicyService.update(
        param(req.params.id),
        req.body as Partial<FeePolicyInput>,
        actor(req)
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async archive(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feePolicyService.archive(param(req.params.id), actor(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const feePolicyController = new FeePolicyController();
