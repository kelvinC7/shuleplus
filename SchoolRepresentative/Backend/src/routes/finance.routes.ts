import { Router } from 'express';
import { asyncHandler, ok, q } from '../utils/http';
import { resolveAuth } from '../middleware/auth.middleware';
import { schoolData } from '../services/school-data.service';
import { AppError } from '../middleware/error.middleware';

const router = Router();

function requireAuth(req: import('express').Request) {
  const auth = resolveAuth(req);
  if (auth.mode === 'unauthorized') {
    throw new AppError(401, 'Sign in through Shule+ IAM', 'AUTH_REQUIRED');
  }
  return auth;
}

/** GET /fees - executive fee collection monitoring */
router.get(
  '/fees',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const fees = await schoolData.fees(auth, {
      organizationId: q(req, 'organizationId'),
      academicYear: q(req, 'academicYear'),
      term: q(req, 'term'),
    });
    const payroll = await schoolData.financePayroll(auth, q(req, 'organizationId')).catch(() => null);

    return ok(
      res,
      {
        ...fees,
        bySchool: fees.bySchool ?? payroll?.bySchool.map((p) => ({
          organizationId: p.organizationId,
          name: p.name,
          expected: p.feesCollected + p.feesOutstanding,
          collected: p.feesCollected,
          outstanding: p.feesOutstanding,
          rate: p.collectionRate,
        })),
        payrollTotal: payroll?.totals.payrollTotal ?? 0,
      },
      { mode: auth.mode, metricsSource: fees.metricsSource }
    );
  })
);

/** GET /budget - budget vs actual monitoring */
router.get(
  '/budget',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const payroll = await schoolData.financePayroll(auth, q(req, 'organizationId')).catch(() => null);

    const lines = [
      { vote: 'Teaching materials', planned: 90_000_000, actual: 73_000_000, department: 'Academics' },
      { vote: 'Boarding & food', planned: 149_000_000, actual: 143_000_000, department: 'Boarding', overBudget: true },
      { vote: 'Staff welfare', planned: 36_000_000, actual: 27_700_000, department: 'HR' },
      { vote: 'Maintenance', planned: 36_000_000, actual: 25_900_000, department: 'Operations' },
      { vote: 'Sports & clubs', planned: 21_000_000, actual: 12_800_000, department: 'Sports' },
      { vote: 'Transport & fuel', planned: 18_500_000, actual: 15_200_000, department: 'Transport' },
    ];

    const totalPlanned = lines.reduce((a, l) => a + l.planned, 0);
    const totalActual = lines.reduce((a, l) => a + l.actual, 0);

    return ok(
      res,
      {
        summary: {
          totalPlanned,
          totalActual,
          remaining: totalPlanned - totalActual,
          utilizationPct: Math.round((totalActual / totalPlanned) * 1000) / 10,
          overBudgetLines: lines.filter((l) => l.actual > l.planned * 0.95).length,
          payrollTotal: payroll?.totals.payrollTotal ?? 0,
        },
        lines: lines.map((l) => ({
          ...l,
          pct: Math.round((l.actual / l.planned) * 1000) / 10,
          status: l.actual > l.planned ? 'over' : l.actual > l.planned * 0.95 ? 'watch' : 'ok',
        })),
        cashFlow: [
          { month: 'Jun', inflow: 28_400_000, outflow: 22_100_000 },
          { month: 'Jul', inflow: 46_200_000, outflow: 31_500_000 },
          { month: 'Aug', inflow: 52_800_000, outflow: 33_200_000 },
          { month: 'Sep', inflow: 61_500_000, outflow: 38_400_000 },
          { month: 'Oct', inflow: 58_400_000, outflow: 41_900_000 },
          { month: 'Nov (to date)', inflow: 24_500_000, outflow: 18_600_000 },
        ],
        pendingPurchaseOrders: 1,
      },
      { mode: auth.mode }
    );
  })
);

export default router;
