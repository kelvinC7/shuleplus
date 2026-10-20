import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { Request } from 'express';
import { authService } from '../services/auth.service';

const statusSchema = z.object({ phone: z.string().min(1) });
const loginSchema = z.object({
  phone: z.string().min(1),
  pin: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
}).refine((b) => Boolean(b.pin ?? b.password), { message: 'PIN is required' });

const setPasswordSchema = z.object({
  phone: z.string().min(1),
  pin: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  confirmPin: z.string().min(1).optional(),
  confirmPassword: z.string().min(1).optional(),
}).refine((b) => Boolean(b.pin ?? b.password), { message: 'PIN is required' });

export class AuthController {
  async status(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = statusSchema.parse(req.query);
      const data = await authService.status(phone);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const body = loginSchema.parse(req.body);
      const data = await authService.login(body.phone, body.pin ?? body.password!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async setPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const body = setPasswordSchema.parse(req.body);
      const pin = body.pin ?? body.password!;
      const confirm = body.confirmPin ?? body.confirmPassword ?? pin;
      const data = await authService.setPassword(body.phone, pin, confirm);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
