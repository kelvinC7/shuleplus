export class AppError extends Error {
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }

  statusCode: number;
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
      ...(err.details !== undefined ? { data: err.details } : {}),
    });
    return;
  }
  if (err && typeof err === 'object' && 'issues' in err) {
    res.status(400).json({ success: false, message: 'Validation failed', errors: err });
    return;
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}

export function notFoundHandler(_req: import('express').Request, res: import('express').Response) {
  res.status(404).json({ success: false, message: 'Route not found' });
}
