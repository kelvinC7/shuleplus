import { Router } from 'express';
import { developerController } from '../controllers/developer.controller';
import { authenticateDeveloperDocs } from '../middleware/developer-auth.middleware';

const router = Router();

router.use(authenticateDeveloperDocs);

router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'StudentManagement Developer API — use the frontend at /developer/api or call /developer/api/catalog',
  });
});

router.get('/overview', (req, res) => developerController.overview(req, res));
router.get('/catalog', (req, res) => developerController.catalog(req, res));
router.get('/openapi.json', (req, res) => developerController.openapi(req, res));
router.get('/postman.json', (req, res) => developerController.postman(req, res));
router.post('/try', (req, res, next) => developerController.tryRequest(req, res, next));

export default router;
