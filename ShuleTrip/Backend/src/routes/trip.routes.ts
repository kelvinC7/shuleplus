import { Router } from 'express';
import { tripController } from '../controllers/trip.controller';
import { tripDocumentUpload } from '../middleware/upload.middleware';

const router = Router();

router.get('/', (req, res, next) => tripController.listSchool(req, res, next));
router.post('/', (req, res, next) => tripController.createDraft(req, res, next));
router.get('/:tripId', (req, res, next) => tripController.getSchoolTrip(req, res, next));
router.get('/:tripId/readiness', (req, res, next) => tripController.readiness(req, res, next));
router.patch('/:tripId', (req, res, next) => tripController.updateDraft(req, res, next));
router.put('/:tripId/wizard', (req, res, next) => tripController.saveWizard(req, res, next));
router.put('/:tripId/participants', (req, res, next) => tripController.setParticipants(req, res, next));
router.put('/:tripId/staff', (req, res, next) => tripController.setStaff(req, res, next));
router.put('/:tripId/vehicles', (req, res, next) => tripController.setVehicles(req, res, next));
router.put('/:tripId/documents', (req, res, next) => tripController.setDocuments(req, res, next));
router.post('/:tripId/documents/upload', tripDocumentUpload.single('file'), (req, res, next) =>
  tripController.uploadDocument(req, res, next)
);
router.get('/:tripId/documents/:documentId/file', (req, res, next) =>
  tripController.downloadDocument(req, res, next)
);
router.post('/:tripId/submit', (req, res, next) => tripController.submit(req, res, next));
router.delete('/:tripId', (req, res, next) => tripController.deleteSchoolTrip(req, res, next));
router.get('/:tripId/authorization-letter', (req, res, next) => tripController.getAuthorizationLetter(req, res, next));
router.get('/:tripId/authorization/:asset', (req, res, next) =>
  tripController.downloadAuthorizationAsset(req, res, next)
);

export default router;
