import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { loginPortal, submitSchoolRegistration } from '../services/portal-auth.service';

const loginSchema = z.object({
  portal: z.enum(['school', 'government', 'superadmin']),
  username: z.string().min(1),
  password: z.string().min(1),
});

const registerSchema = z.object({
  reference: z.string().min(6),
  schoolCode: z.string().min(2),
  officialName: z.string().min(2),
  accountEmail: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(8),
  payload: z.unknown(),
});

export const publicPortalController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const body = loginSchema.parse(req.body);
      const data = await loginPortal(body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async registerSchool(req: Request, res: Response, next: NextFunction) {
    try {
      const body = registerSchema.parse(req.body);
      const { row, confirmationEmailSent } = await submitSchoolRegistration({
        ...body,
        payload: body.payload ?? {},
      });
      res.status(201).json({
        success: true,
        data: {
          id: row.id,
          reference: row.reference,
          status: row.status,
          submittedAt: row.submittedAt,
          confirmationEmailSent,
        },
      });
    } catch (e) {
      next(e);
    }
  },
};
