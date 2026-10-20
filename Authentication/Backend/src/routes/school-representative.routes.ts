import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { ROLES } from '../constants/roles';
import { schoolRepresentativeController } from '../controllers/school-representative.controller';

const router = Router();

router.use(authenticate, requireRole(ROLES.SCHOOL_REPRESENTATIVE));

router.get('/session', (req, res, next) => schoolRepresentativeController.session(req, res, next));
router.get('/schools', (req, res, next) => schoolRepresentativeController.schools(req, res, next));
router.get('/academic-context', (req, res, next) =>
  schoolRepresentativeController.academicContext(req, res, next)
);
router.get('/overview', (req, res, next) => schoolRepresentativeController.overview(req, res, next));
router.get('/academics', (req, res, next) => schoolRepresentativeController.academics(req, res, next));
router.get('/finance-payroll', (req, res, next) =>
  schoolRepresentativeController.financePayroll(req, res, next)
);
router.get('/finance/school-fees', (req, res, next) =>
  schoolRepresentativeController.schoolFeesOverview(req, res, next)
);
router.get('/finance/school-fees/filter-options', (req, res, next) =>
  schoolRepresentativeController.schoolFeesFilterOptions(req, res, next)
);
router.get('/finance/school-fees/analytics', (req, res, next) =>
  schoolRepresentativeController.schoolFeesAnalytics(req, res, next)
);
router.get('/finance/school-fees/transactions', (req, res, next) =>
  schoolRepresentativeController.schoolFeesTransactions(req, res, next)
);
router.get('/finance/school-fees/balances', (req, res, next) =>
  schoolRepresentativeController.schoolFeesBalances(req, res, next)
);
router.get('/attendance', (req, res, next) =>
  schoolRepresentativeController.attendance(req, res, next)
);
router.get('/attendance/metrics', (req, res, next) =>
  schoolRepresentativeController.attendanceMetrics(req, res, next)
);
router.get('/attendance/gate', (req, res, next) =>
  schoolRepresentativeController.gateAttendance(req, res, next)
);
router.get('/students', (req, res, next) =>
  schoolRepresentativeController.studentsDirectory(req, res, next)
);
router.get('/staff', (req, res, next) =>
  schoolRepresentativeController.staffDirectory(req, res, next)
);
router.get('/alerts', (req, res, next) => schoolRepresentativeController.alerts(req, res, next));
router.get('/follow-ups', (req, res, next) =>
  schoolRepresentativeController.followUps(req, res, next)
);
router.post('/follow-ups', (req, res, next) =>
  schoolRepresentativeController.createFollowUp(req, res, next)
);
router.patch('/follow-ups/:id', (req, res, next) =>
  schoolRepresentativeController.updateFollowUp(req, res, next)
);
router.get('/chief-accountants', (req, res, next) =>
  schoolRepresentativeController.listChiefAccountants(req, res, next)
);
router.delete('/chief-accountants/:userId', (req, res, next) =>
  schoolRepresentativeController.revokeChiefAccountant(req, res, next)
);

export default router;
