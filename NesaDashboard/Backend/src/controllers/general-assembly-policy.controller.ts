import { Response, NextFunction } from 'express';
import {
  generalAssemblyPolicyService,
  type GaPolicyInput,
} from '../services/general-assembly-policy.service';
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

export class GeneralAssemblyPolicyController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await generalAssemblyPolicyService.list(queryOf(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await generalAssemblyPolicyService.get(param(req.params.id));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await generalAssemblyPolicyService.create(req.body as GaPolicyInput, actor(req));
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await generalAssemblyPolicyService.update(
        param(req.params.id),
        req.body as Partial<GaPolicyInput>,
        actor(req)
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async archive(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await generalAssemblyPolicyService.archive(param(req.params.id), actor(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const generalAssemblyPolicyController = new GeneralAssemblyPolicyController();
