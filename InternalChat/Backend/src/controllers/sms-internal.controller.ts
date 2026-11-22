import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { listAllSchoolSettings, updateSchoolSettings } from '../services/sms/quota.service';

const patchSchema = z.object({
  smsEnabled: z.boolean().optional(),
  maxSegments: z.number().int().min(0).optional(),
  quotaPeriod: z.enum(['MONTHLY', 'TERM', 'ANNUAL', 'ONE_TIME']).optional(),
  segmentsUsed: z.number().int().min(0).optional(),
  updatedBy: z.string().optional(),
  parentPackagesEnabled: z.boolean().optional(),
  momoPayeeNumber: z.string().nullable().optional(),
  momoUssdTemplate: z.string().nullable().optional(),
  defaultAllocation: z.enum(['CHILD', 'FAMILY']).optional(),
});

export const smsInternalController = {
  async listSchools(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await listAllSchoolSettings();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateSchool(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId);
      const body = patchSchema.parse(req.body);
      const data = await updateSchoolSettings(organizationId, body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
