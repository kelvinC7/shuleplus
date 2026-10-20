export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: unknown, _req: unknown, res: import('express').Response) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }
  console.error(err);
  const prismaCode = (err as { code?: string })?.code;
  const prismaMessage = (err as { message?: string })?.message;
  const detail =
    process.env.NODE_ENV === 'development' && prismaMessage
      ? prismaMessage
      : 'Internal server error';
  const hint =
    prismaCode === 'P2021' || prismaMessage?.includes('does not exist')
      ? 'Run database migrations: cd Payroll/Backend && npm run prisma:migrate'
      : undefined;
  res.status(500).json({
    success: false,
    message: hint ? `${detail}. ${hint}` : detail,
  });
}

export function notFoundHandler(_req: import('express').Request, res: import('express').Response) {
  res.status(404).json({ success: false, message: 'Route not found' });
}
