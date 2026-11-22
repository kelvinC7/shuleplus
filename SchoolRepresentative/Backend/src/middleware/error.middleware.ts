import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export class AppError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    code: 'ROUTE_NOT_FOUND',
  });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({ success: false, message: err.message, code: err.code });
    return;
  }
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  if (env.NODE_ENV !== 'production') {
    console.error('[DirectorConsole] Unhandled error:', err);
  }
  res.status(500).json({ success: false, message, code: 'INTERNAL_ERROR' });
}
