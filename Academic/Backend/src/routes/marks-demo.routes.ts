import { Router } from 'express';
import { marksDemoController } from '../controllers/marks-demo.controller';

const router = Router();

router.get('/status', (req, res, next) => marksDemoController.status(req, res, next));
router.post('/apply', (req, res, next) => marksDemoController.apply(req, res, next));
router.delete('/', (req, res, next) => marksDemoController.remove(req, res, next));

export default router;
