import { Request } from 'express';

export type StudentRef = { studentId?: string; studentCode?: string };
export type StudentSelector = string | StudentRef;

/**
 * Extract the explicitly requested student id from a request.
 * Supports both `?studentId=` query params and a `studentId` field in the body.
 */
export function getRequestedStudentId(req: Request): string | undefined {
  const fromQuery = req.query.studentId;
  if (typeof fromQuery === 'string' && fromQuery.trim()) return fromQuery.trim();

  const body = (req.body as Record<string, unknown> | undefined)?.studentId;
  if (typeof body === 'string' && body.trim()) return body.trim();

  return undefined;
}

export function getRequestedStudentCode(req: Request): string | undefined {
  const fromQuery = req.query.studentCode ?? req.query.shuleCode;
  if (typeof fromQuery === 'string' && fromQuery.trim()) return fromQuery.trim();
  const body = req.body as Record<string, unknown> | undefined;
  const fromBody = body?.studentCode ?? body?.shuleCode;
  if (typeof fromBody === 'string' && fromBody.trim()) return fromBody.trim();
  return undefined;
}

export function getRequestedStudent(req: Request): StudentRef {
  return {
    studentId: getRequestedStudentId(req),
    studentCode: getRequestedStudentCode(req),
  };
}
