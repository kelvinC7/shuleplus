import { Router } from 'express';
import babyeyiController from '../controllers/babyeyi.controller';

const router = Router();

// POST /api/babyeyi/lookup  { code }
router.post('/lookup', (req, res, next) => babyeyiController.apiLookup(req, res, next));
// Also allow GET /api/babyeyi/lookup?code=...
router.get('/lookup', (req, res, next) => babyeyiController.apiLookup(req, res, next));
// quick ping to verify routing
router.get('/_ping', (_req, res) => res.json({ success: true, ok: true }));

export default router;
