import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: unknown[]
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    const first = err.errors[0];
    res.status(400).json({
      success: false,
      message: first?.message ?? 'Validation failed',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2021') {
      const model = err.meta?.modelName ? String(err.meta.modelName) : '';
      res.status(503).json({
        success: false,
        message: model
          ? `Database table missing (${model}). Run: bash scripts/apply-iam-pending-migrations.sh && bash scripts/apply-developer-portal-db.sh then pm2 restart auth-api`
          : 'Database table missing. Run: bash scripts/apply-iam-pending-migrations.sh && bash scripts/apply-developer-portal-db.sh then pm2 restart auth-api',
      });
      return;
    }
    if (err.code === 'P2022') {
      const column = err.meta?.column ? String(err.meta.column) : '';
      const model = err.meta?.modelName ? String(err.meta.modelName) : '';
      const detail =
        column && model
          ? `${column} on ${model}`
          : column
            ? column
            : 'unknown column';
      res.status(503).json({
        success: false,
        message: `Database schema is outdated (missing ${detail}). Run: bash scripts/apply-iam-pending-migrations.sh then pm2 restart auth-api`,
      });
      return;
    }
  }

  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
