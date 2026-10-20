import { Request, Response, NextFunction } from 'express';
import { publicLookupService } from '../services/public-lookup.service';

export class PublicLookupController {
  async lookupStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const code = String(req.query.code ?? req.query.q ?? '').trim();
      const data = await publicLookupService.lookupByCode(code);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async claimParent(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body ?? {};
      const role = String(body.role ?? '');
      if (role !== 'FATHER' && role !== 'MOTHER' && role !== 'GUARDIAN') {
        res.status(400).json({ success: false, message: 'role must be FATHER, MOTHER or GUARDIAN' });
        return;
      }
      const data = await publicLookupService.claimParentByCode({
        studentCode: String(body.studentCode ?? ''),
        firstName: String(body.firstName ?? ''),
        lastName: String(body.lastName ?? ''),
        phone: typeof body.phone === 'string' ? body.phone : undefined,
        email: typeof body.email === 'string' ? body.email : undefined,
        role,
      });
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const publicLookupController = new PublicLookupController();
