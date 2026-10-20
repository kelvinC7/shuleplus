import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { parentAuthService } from '../services/parent-auth.service';
import { env } from '../config/env';

export class ParentAuthController {
 async status(req: Request, res: Response, next: NextFunction) {
 try {
 const phone = String(req.query.phone ?? req.body?.phone ?? '');
 const data = await parentAuthService.status(phone);
 res.json({ success: true, data });
 } catch (err) {
 next(err);
 }
 }

 async setPassword(req: Request, res: Response, next: NextFunction) {
 try {
 const phone = String(req.body?.phone ?? '');
 const password = String(req.body?.password ?? '');
 const confirm = String(req.body?.confirmPassword ?? req.body?.passwordConfirm ?? '');
 if (confirm && confirm !== password) {
 res.status(400).json({ success: false, message: 'Passwords do not match' });
 return;
 }
 const data = await parentAuthService.setPassword(phone, password);
 res.json({ success: true, data });
 } catch (err) {
 next(err);
 }
 }

 async login(req: Request, res: Response, next: NextFunction) {
 try {
 const phone = String(req.body?.phone ?? '');
 const password = String(req.body?.password ?? '');
 const data = await parentAuthService.login(phone, password);
 res.json({ success: true, data });
 } catch (err) {
 next(err);
 }
 }

 /** Authenticated parent: return linked students for this phone (all Academic matches). */
 async me(req: Request, res: Response, next: NextFunction) {
 try {
 const authHeader = req.headers.authorization;
 if (!authHeader?.startsWith('Bearer ')) {
 res.status(401).json({ success: false, message: 'Authentication required' });
 return;
 }
 const payload = jwt.verify(authHeader.slice(7), env.JWT_ACCESS_SECRET) as {
 sub: string;
 phone?: string;
 roles?: string[];
 };
 if (!payload.roles?.includes('parent')) {
 res.status(403).json({ success: false, message: 'Parent access only' });
 return;
 }
 const data = await parentAuthService.sessionFromToken(payload.sub, payload.phone);
 res.json({ success: true, data });
 } catch (err) {
 next(err);
 }
 }
}

export const parentAuthController = new ParentAuthController();
