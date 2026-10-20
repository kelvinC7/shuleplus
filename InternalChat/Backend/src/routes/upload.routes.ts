import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { uploadService } from '../services/upload.service';

export const uploadRouter = Router();

const uploadSchema = z.object({
  dataUri: z.string().min(1),
  name: z.string().max(255).optional(),
});

uploadRouter.post('/', authenticate, requireTenant, async (req: AuthenticatedRequest, res) => {
  const { dataUri, name } = uploadSchema.parse(req.body);
  const data = await uploadService.save(dataUri, name);
  res.status(201).json({ success: true, data });
});
