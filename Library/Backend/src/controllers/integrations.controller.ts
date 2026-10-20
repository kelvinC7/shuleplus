import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { studentManagementClient } from '../clients/student-management.client';
import { resolveLibraryTeachers, mergeLoanHistoryTeachers } from '../services/teachers.service';
import { prisma } from '../config/database';

function getOrgId(req: Request): string {
  const orgId = (req as AuthenticatedRequest).organizationRef;
  if (!orgId) throw new AppError(401, 'Organization not resolved');
  return orgId;
}

export const integrationsController = {
  async searchStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const q = String(req.query.q ?? req.query.search ?? '').trim();
      if (!q || q.length < 2) {
        res.json({ success: true, data: { students: [] } });
        return;
      }
      const students = await studentManagementClient.searchStudents(orgId, q);
      res.json({ success: true, data: { students } });
    } catch (err) {
      next(err);
    }
  },

  async searchTeachers(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const q = String(req.query.q ?? req.query.search ?? '').trim();

      if (q.length > 0 && q.length < 2) {
        res.json({ success: true, data: { teachers: [] } });
        return;
      }

      const integrated = await resolveLibraryTeachers(orgId, q || undefined);
      const merged = q ? integrated : await mergeLoanHistoryTeachers(orgId, integrated);

      const teachers = merged.map((t) => ({
        id: t.id,
        name: t.name,
        department: t.department,
        source: t.source,
      }));

      res.json({ success: true, data: { teachers: teachers.slice(0, 20) } });
    } catch (err) {
      next(err);
    }
  },

  async searchAvailableCopies(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const q = String(req.query.q ?? req.query.search ?? '').trim();

      const where: Record<string, unknown> = {
        organizationId: orgId,
        status: 'AVAILABLE',
      };

      if (q) {
        where.OR = [
          { barcode: { contains: q, mode: 'insensitive' } },
          { libraryId: { contains: q, mode: 'insensitive' } },
          { resource: { title: { contains: q, mode: 'insensitive' } } },
          { resource: { isbn: { contains: q, mode: 'insensitive' } } },
        ];
      }

      const copies = await prisma.bookCopy.findMany({
        where,
        include: { resource: { select: { id: true, title: true, author: true, isbn: true } } },
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: { copies } });
    } catch (err) {
      next(err);
    }
  },

  async searchResources(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const q = String(req.query.q ?? req.query.search ?? '').trim();

      const where: Record<string, unknown> = { organizationId: orgId };
      if (q) {
        where.OR = [
          { title: { contains: q, mode: 'insensitive' } },
          { author: { contains: q, mode: 'insensitive' } },
          { isbn: { contains: q, mode: 'insensitive' } },
        ];
      }

      const resources = await prisma.bookResource.findMany({
        where,
        select: {
          id: true,
          title: true,
          author: true,
          isbn: true,
          availableCopies: true,
          totalCopies: true,
        },
        take: 20,
        orderBy: { title: 'asc' },
      });

      res.json({ success: true, data: { resources } });
    } catch (err) {
      next(err);
    }
  },
};
