export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: unknown, _req: unknown, res: import('express').Response, _next: import('express').NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}

export function notFoundHandler(_req: import('express').Request, res: import('express').Response) {
  res.status(404).json({ success: false, message: 'Route not found' });
}
