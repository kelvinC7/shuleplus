import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { tripController } from '../controllers/trip.controller';
import { reviewController } from '../controllers/review.controller';
import { govAdminController } from '../controllers/gov-admin.controller';
import { govAccountController } from '../controllers/gov-account.controller';
import { requireSuperAdmin } from '../middleware/super-admin.middleware';
import { govAttestationUpload } from '../middleware/upload.middleware';

const router = Router();

router.get('/dashboard', (req, res, next) => dashboardController.governmentSummary(req, res, next));
router.get('/me', (req, res, next) => govAccountController.me(req, res, next));
router.patch('/me/profile', (req, res, next) => govAccountController.updateProfile(req, res, next));
router.patch('/me/avatar', (req, res, next) => govAccountController.updateAvatar(req, res, next));
router.post('/me/password', (req, res, next) => govAccountController.changePassword(req, res, next));
router.get('/applications', (req, res, next) => tripController.listGovernment(req, res, next));
router.get('/applications/:tripId', (req, res, next) => reviewController.getApplication(req, res, next));
router.get('/applications/:tripId/authorization-letter', (req, res, next) =>
  reviewController.getAuthorizationLetter(req, res, next)
);
router.get('/applications/:tripId/documents/:documentId/file', (req, res, next) =>
  reviewController.downloadDocument(req, res, next)
);
router.get('/applications/:tripId/approvals/:approvalId/:asset', (req, res, next) =>
  reviewController.downloadApprovalAsset(req, res, next)
);
router.post('/applications/:tripId/start-review', (req, res, next) => reviewController.startReview(req, res, next));
router.post(
  '/applications/:tripId/decisions',
  govAttestationUpload.fields([
    { name: 'signatureFile', maxCount: 1 },
    { name: 'stampFile', maxCount: 1 },
  ]),
  (req, res, next) => reviewController.decide(req, res, next)
);

router.get('/admin/officials', requireSuperAdmin, (req, res, next) => govAdminController.listOfficials(req, res, next));
router.post('/admin/officials', requireSuperAdmin, (req, res, next) => govAdminController.createOfficial(req, res, next));
router.patch('/admin/officials/:id', requireSuperAdmin, (req, res, next) => govAdminController.updateOfficial(req, res, next));
router.delete('/admin/officials/:id', requireSuperAdmin, (req, res, next) => govAdminController.deleteOfficial(req, res, next));

export default router;
