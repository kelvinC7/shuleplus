import { Prisma } from '../generated/prisma';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: unknown,
  _req: unknown,
  res: import('express').Response,
  _next: import('express').NextFunction
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }
  if (err && typeof err === 'object' && 'issues' in err) {
    res.status(400).json({ success: false, message: 'Validation error', details: err });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: 'This course code is already used by another course.',
        code: err.code,
      });
      return;
    }
    if (err.code === 'P2022') {
      res.status(503).json({
        success: false,
        message:
          'Timetable database is missing a required column (for example is_core). Run: npm run prisma:migrate in Timetable/Backend.',
        code: err.code,
      });
      return;
    }
    console.error('[prisma]', err.code, err.message);
    res.status(500).json({ success: false, message: err.message, code: err.code });
    return;
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    const raw = err.message || '';
    const unknownArg = raw.match(/Unknown argument `(\w+)`/);
    const message = unknownArg
      ? `Course save failed: field "${unknownArg[1]}" is not in the running Prisma client. Restart Timetable API after "npx prisma generate".`
      : raw.split('\n').find((line) => line.includes('Argument')) ||
        raw.split('\n')[0] ||
        'Invalid course data';
    res.status(400).json({ success: false, message, ...(process.env.NODE_ENV !== 'production' ? { details: raw } : {}) });
    return;
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}

export function notFoundHandler(_req: import('express').Request, res: import('express').Response) {
  res.status(404).json({ success: false, message: 'Route not found' });
}
