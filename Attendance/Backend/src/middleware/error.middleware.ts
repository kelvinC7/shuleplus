export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

function isPrismaUniqueViolation(err: unknown): err is { code: string; meta?: { target?: unknown } } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  );
}

export function errorHandler(
  err: unknown,
  _req: unknown,
  res: import('express').Response,
  _next: import('express').NextFunction
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }
  if (isPrismaUniqueViolation(err)) {
    const target = err.meta?.target;
    const fields = Array.isArray(target) ? target.join(', ') : 'unique field';
    res.status(409).json({
      success: false,
      message: `A record with this ${fields} already exists`,
    });
    return;
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}

export function notFoundHandler(_req: import('express').Request, res: import('express').Response) {
  res.status(404).json({ success: false, message: 'Route not found' });
}
