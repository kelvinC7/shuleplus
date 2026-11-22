import type { Response, RequestHandler } from 'express';

export interface ApiMeta {
  [key: string]: unknown;
}

/** Consistent success envelope: { success, data, meta? } */
export function ok(res: Response, data: unknown, meta?: ApiMeta, status = 200) {
  return res.status(status).json(meta ? { success: true, data, meta } : { success: true, data });
}

/** Wrap async route handlers so rejections hit the error middleware. */
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/** Read a string query param, undefined when empty. */
export function q(req: { query: Record<string, unknown> }, key: string): string | undefined {
  const value = req.query[key];
  if (typeof value === 'string' && value.trim() !== '' && value !== 'all') return value.trim();
  return undefined;
}

/** Read a route param (Express 5 types allow string[]). */
export function param(req: { params: Record<string, unknown> }, key: string): string {
  const value = req.params[key];
  if (Array.isArray(value)) return String(value[0] ?? '');
  return String(value ?? '');
}

/** Read a pagination param. */
export function page(req: { query: Record<string, unknown> }, key: string, fallback: number) {
  const raw = req.query[key];
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
