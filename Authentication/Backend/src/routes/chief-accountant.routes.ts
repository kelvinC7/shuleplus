import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { ROLES } from '../constants/roles';
import { chiefAccountantController } from '../controllers/chief-accountant.controller';

const router = Router();

router.use(authenticate, requireRole(ROLES.CHIEF_ACCOUNTANT));

router.get('/session', (req, res, next) => chiefAccountantController.session(req, res, next));
router.get('/organizations', (req, res, next) =>
  chiefAccountantController.organizations(req, res, next)
);
router.get('/academic-context', (req, res, next) =>
  chiefAccountantController.academicContext(req, res, next)
);
router.get('/overview', (req, res, next) => chiefAccountantController.overview(req, res, next));
router.get('/finance/school-fees', (req, res, next) =>
  chiefAccountantController.schoolFeesOverview(req, res, next)
);
router.get('/finance/school-fees/dashboard', (req, res, next) =>
  chiefAccountantController.schoolFeesDashboard(req, res, next)
);
router.get('/finance/school-fees/analytics', (req, res, next) =>
  chiefAccountantController.schoolFeesAnalytics(req, res, next)
);
router.get('/finance/school-fees/filter-options', (req, res, next) =>
  chiefAccountantController.schoolFeesFilterOptions(req, res, next)
);
router.get('/finance/school-fees/transactions', (req, res, next) =>
  chiefAccountantController.schoolFeesTransactions(req, res, next)
);
router.get('/finance/school-fees/balances', (req, res, next) =>
  chiefAccountantController.schoolFeesBalances(req, res, next)
);
router.get('/finance/school-fees/structures', (req, res, next) =>
  chiefAccountantController.schoolFeesStructures(req, res, next)
);
router.get('/finance/school-fees/bills', (req, res, next) =>
  chiefAccountantController.schoolFeesStudentBills(req, res, next)
);

export default router;
