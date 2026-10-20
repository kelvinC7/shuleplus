import { Router } from 'express';
import { env } from './config';
import { getSchoolRegistrations } from './handlers/school-registrations';
import { proxyGet, proxyGetRaw, proxyPost } from './proxy';
import babyeyiApiRoutes from './routes/babyeyi.api.routes';

const router = Router();

/** Health check */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'webpage-babyeyi-backend',
    upstreams: {
      studentManagement: env.STUDENT_MANAGEMENT_URL,
      babyeyiWizard: env.BABYEYI_WIZARD_URL,
      miniWebsite: env.MINIWEBSITE_API_URL,
    },
  });
});

/* ───────── Student Management proxies (public) ───────── */

/** Look up a student by ShuleCode / SDMS code */
router.get('/students/lookup', (req, res) =>
  proxyGet(env.STUDENT_MANAGEMENT_URL, '/public/students/lookup', req, res),
);

/* ───────── IAM public proxies (school directory + onboarding locations) ───────── */

router.get('/school-registrations', (req, res) => getSchoolRegistrations(req, res));

router.get('/locations/provinces', (req, res) =>
  proxyGet(env.AUTH_URL, '/public/locations/provinces', req, res),
);
router.get('/locations/provinces/:provinceId/districts', (req, res) =>
  proxyGet(env.AUTH_URL, `/public/locations/provinces/${req.params.provinceId}/districts`, req, res),
);
router.get('/locations/districts/:districtId/sectors', (req, res) =>
  proxyGet(env.AUTH_URL, `/public/locations/districts/${req.params.districtId}/sectors`, req, res),
);
router.get('/locations/sectors/:sectorId/cells', (req, res) =>
  proxyGet(env.AUTH_URL, `/public/locations/sectors/${req.params.sectorId}/cells`, req, res),
);
router.get('/locations/cells/:cellId/villages', (req, res) =>
  proxyGet(env.AUTH_URL, `/public/locations/cells/${req.params.cellId}/villages`, req, res),
);

/* ───────── BabyeyiWizard proxies (public) ───────── */

/** Get circular options (academic years / terms) for a school */
router.get('/circulars/options', (req, res) =>
  proxyGet(env.BABYEYI_WIZARD_URL, '/public/circulars/options', req, res),
);

/** Get a specific circular (fees, items, bank details) */
router.get('/circulars', (req, res) =>
  proxyGet(env.BABYEYI_WIZARD_URL, '/public/circulars', req, res),
);

/** List approved circulars for a school */
router.get('/circulars/list', (req, res) =>
  proxyGet(env.BABYEYI_WIZARD_URL, '/public/circulars/list', req, res),
);

/** Render modern, localized print HTML for a circular (language + autoprint via query) */
router.get('/circulars/:id/print', (req, res) =>
  proxyGetRaw(env.BABYEYI_WIZARD_URL, `/public/circulars/${req.params.id}/print`, req, res),
);

/* ───────── SchoolFeesPortal proxies (public payments) ───────── */

/** Get the active fee structure (items, required/paid) for a student + period */
router.get('/fees/student-fees', (req, res) =>
  proxyGet(env.SCHOOL_FEES_URL, '/public/student-fees', req, res),
);

/** Initiate a public payment (MOMO / CARD / BANK) */
router.post('/fees/payments/initiate', (req, res) =>
  proxyPost(env.SCHOOL_FEES_URL, '/public/payments/initiate', req, res),
);

/** Poll a payment status by reference */
router.get('/fees/payments/:reference/status', (req, res) =>
  proxyGet(env.SCHOOL_FEES_URL, `/public/payments/${req.params.reference}/status`, req, res),
);

/** Fetch a receipt by its number */
router.get('/fees/receipts/:receiptNumber', (req, res) =>
  proxyGet(env.SCHOOL_FEES_URL, `/public/receipts/${req.params.receiptNumber}`, req, res),
);

/** List available loan types (School Fees Loan) for a school */
router.get('/fees/loans/types', (req, res) =>
  proxyGet(env.SCHOOL_FEES_URL, '/public/loans/types', req, res),
);

/** Submit a loan application */
router.post('/fees/loans/applications', (req, res) =>
  proxyPost(env.SCHOOL_FEES_URL, '/public/loans/applications', req, res),
);

/** Poll a loan application status by its application number */
router.get('/fees/loans/:applicationNumber/status', (req, res) =>
  proxyGet(env.SCHOOL_FEES_URL, `/public/loans/${req.params.applicationNumber}/status`, req, res),
);

/* ───────── Admissions proxies (Authentication IAM public API) ───────── */

router.get('/admissions/check', (req, res) =>
  proxyGet(env.AUTH_URL, '/public/admissions/check', req, res),
);
router.get('/admissions/config', (req, res) =>
  proxyGet(env.AUTH_URL, '/public/admissions/config', req, res),
);
router.post('/admissions/submit', (req, res) =>
  proxyPost(env.AUTH_URL, '/public/admissions/submit', req, res),
);
router.post('/admissions/draft', (req, res) =>
  proxyPost(env.AUTH_URL, '/public/admissions/draft', req, res),
);
router.get('/admissions/track/:applicationNumber', (req, res) =>
  proxyGet(env.AUTH_URL, `/public/admissions/track/${req.params.applicationNumber}`, req, res),
);

// Babyeyi API (server-side calls StudentManagement/BabyeyiWizard)
router.use('/babyeyi', babyeyiApiRoutes);

export default router;
