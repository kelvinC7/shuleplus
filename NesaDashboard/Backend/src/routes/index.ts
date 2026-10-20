import { Router, Request, Response } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { nesaController } from '../controllers/nesa.controller';
import { feePolicyController } from '../controllers/fee-policy.controller';
import { generalAssemblyPolicyController } from '../controllers/general-assembly-policy.controller';
import { policyEngineController } from '../controllers/policy-engine.controller';
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
} from '../middleware/auth.middleware';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'nesa-dashboard-service',
    module: 'nesa',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/tenant/create', requireServiceAuth, (req, res, next) =>
  tenantController.create(req, res, next)
);

/** Babyeyi / internal policy resolve (service key) */
router.get('/internal/policy-engine/resolve', requireServiceAuth, (req, res, next) =>
  policyEngineController.resolveInternal(req, res, next)
);
router.post('/internal/policy-engine/resolve', requireServiceAuth, (req, res, next) =>
  policyEngineController.resolveInternal(req, res, next)
);

const protectedRouter = Router();
protectedRouter.use(authenticate, requireModuleLicense('nesa'));

protectedRouter.get('/dashboard', (req, res, next) => nesaController.dashboard(req, res, next));
protectedRouter.get('/schools', (req, res, next) => nesaController.schools(req, res, next));
protectedRouter.get('/schools/:id', (req, res, next) => nesaController.school(req, res, next));
protectedRouter.get('/circulars', (req, res, next) => nesaController.circulars(req, res, next));
protectedRouter.get('/circulars/:id', (req, res, next) => nesaController.circular(req, res, next));
protectedRouter.post('/circulars/:id/comments', (req, res, next) =>
  nesaController.circularComment(req, res, next)
);
protectedRouter.post('/circulars/:id/reject', (req, res, next) =>
  nesaController.circularReject(req, res, next)
);
protectedRouter.post('/circulars/:id/unpublish', (req, res, next) =>
  nesaController.circularUnpublish(req, res, next)
);
protectedRouter.post('/circulars/:id/approve', (req, res, next) =>
  nesaController.circularApprove(req, res, next)
);
protectedRouter.get('/circulars/:id/print', (req, res, next) =>
  nesaController.circularPrint(req, res, next)
);
protectedRouter.get('/approvals', (req, res, next) => nesaController.approvals(req, res, next));
protectedRouter.get('/provinces', (req, res, next) => nesaController.provinces(req, res, next));
protectedRouter.get('/districts', (req, res, next) => nesaController.districts(req, res, next));
protectedRouter.get('/sectors', (req, res, next) => nesaController.sectors(req, res, next));
protectedRouter.get('/academic-years', (req, res, next) =>
  nesaController.academicYears(req, res, next)
);

protectedRouter.get('/fee-policies', (req, res, next) => feePolicyController.list(req, res, next));
protectedRouter.get('/fee-policies/:id', (req, res, next) => feePolicyController.get(req, res, next));
protectedRouter.post('/fee-policies', (req, res, next) => feePolicyController.create(req, res, next));
protectedRouter.put('/fee-policies/:id', (req, res, next) =>
  feePolicyController.update(req, res, next)
);
protectedRouter.post('/fee-policies/:id/archive', (req, res, next) =>
  feePolicyController.archive(req, res, next)
);

protectedRouter.get('/general-assembly-policies', (req, res, next) =>
  generalAssemblyPolicyController.list(req, res, next)
);
protectedRouter.get('/general-assembly-policies/:id', (req, res, next) =>
  generalAssemblyPolicyController.get(req, res, next)
);
protectedRouter.post('/general-assembly-policies', (req, res, next) =>
  generalAssemblyPolicyController.create(req, res, next)
);
protectedRouter.put('/general-assembly-policies/:id', (req, res, next) =>
  generalAssemblyPolicyController.update(req, res, next)
);
protectedRouter.post('/general-assembly-policies/:id/archive', (req, res, next) =>
  generalAssemblyPolicyController.archive(req, res, next)
);

protectedRouter.post('/policy-engine/resolve', (req, res, next) =>
  policyEngineController.resolve(req, res, next)
);
protectedRouter.get('/policy-engine/resolve', (req, res, next) =>
  policyEngineController.resolve(req, res, next)
);
protectedRouter.post('/policy-engine/simulate', (req, res, next) =>
  policyEngineController.simulate(req, res, next)
);

router.use(protectedRouter);

export default router;
