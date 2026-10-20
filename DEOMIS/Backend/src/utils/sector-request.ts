import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

export function requireSeiUserId(req: AuthenticatedRequest): string {
  const userId = req.user?.sub;
  if (!userId) throw new AppError(401, 'Authentication required');
  return userId;
}
