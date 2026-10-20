import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, "Route not found"));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  if (error instanceof Error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(500).json({ message: "Unexpected server error" });
}
