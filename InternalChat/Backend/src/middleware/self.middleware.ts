import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { AppError } from './error.middleware';
import { memberService } from '../services/member.service';

/** Upsert the calling user into the org directory so conversations resolve. */
export async function ensureMember(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const user = req.user;
  const organizationId = req.organizationRef ?? user?.organizationId;
  if (!user || !organizationId) {
    return next(new AppError(401, 'Authentication required'));
  }
  try {
    await memberService.ensureSelf(user, organizationId);
    next();
  } catch (err) {
    next(err);
  }
}
