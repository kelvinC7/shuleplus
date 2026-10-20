export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
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
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  const prismaCode =
    err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
  if (prismaCode === 'P1001' || prismaCode === 'P1000') {
    console.error('[School Fees] Database unreachable:', err);
    res.status(503).json({
      success: false,
      message: 'School Fees database is unreachable. Run scripts/fix-school-fees-db.sh on the server.',
    });
    return;
  }
  if (prismaCode === 'P2021' || prismaCode === 'P2022') {
    console.error('[School Fees] Database schema out of date:', err);
    res.status(503).json({
      success: false,
      message:
        'School Fees database schema is out of date. Run prisma migrate deploy for SchoolFeesPortal (or bash scripts/fix-school-fees-db.sh).',
    });
    return;
  }

  const prismaMessage =
    err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : '';
  if (/column .* does not exist|relation .* does not exist/i.test(prismaMessage)) {
    console.error('[School Fees] Database schema out of date:', err);
    res.status(503).json({
      success: false,
      message:
        'School Fees database schema is out of date. Run prisma migrate deploy for SchoolFeesPortal (or bash scripts/fix-school-fees-db.sh).',
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    success: false,
    message: prismaMessage && prismaMessage.length < 280 ? prismaMessage : 'Internal server error',
  });
}

export function notFoundHandler(_req: import('express').Request, res: import('express').Response) {
  res.status(404).json({ success: false, message: 'Route not found' });
}
