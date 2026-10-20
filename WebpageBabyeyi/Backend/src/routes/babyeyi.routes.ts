import { Router } from 'express';
import babyeyiController from '../controllers/babyeyi.controller';

const router = Router();

router.get('/babyeyi', babyeyiController.renderLookupForm);
router.post('/babyeyi/lookup', babyeyiController.postLookup);

export default router;
