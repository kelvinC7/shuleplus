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
  if (err instanceof Error && err.name === 'ZodError') {
    res.status(400).json({
      success: false,
      message: 'Invalid input',
      errors: (err as { issues?: { path: (string | number)[]; message: string }[] }).issues,
    });
    return;
  }
  console.error(err);
  const detail =
    err instanceof Error && err.message
      ? err.message.replace(/\s+/g, ' ').slice(0, 240)
      : 'Internal server error';
  res.status(500).json({
    success: false,
    message: detail.startsWith('Internal') ? detail : `Internal server error: ${detail}`,
  });
}

export function notFoundHandler(_req: import('express').Request, res: import('express').Response) {
  res.status(404).json({ success: false, message: 'Route not found' });
}
