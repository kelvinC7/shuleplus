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
  if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      message: 'File too large. Maximum upload size is 512 MB (Excel + ZIP).',
    });
    return;
  }
  if (err && typeof err === 'object' && 'name' in err && (err as { name?: string }).name === 'MulterError') {
    res.status(400).json({
      success: false,
      message: (err as { message?: string }).message ?? 'Upload failed',
    });
    return;
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}

export function notFoundHandler(_req: import('express').Request, res: import('express').Response) {
  res.status(404).json({ success: false, message: 'Route not found' });
}
