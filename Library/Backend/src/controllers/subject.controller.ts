import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

function getOrgId(req: Request): string {
  const orgId = (req as AuthenticatedRequest).organizationRef;
  if (!orgId) throw new AppError(401, 'Organization not resolved');
  return orgId;
}

function getId(req: Request): string {
  const id = req.params.id;
  if (!id) throw new AppError(400, 'Missing resource id');
  return Array.isArray(id) ? id[0] : id;
}

export const subjectController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const subjects = await prisma.subject.findMany({
        where: { organizationId: orgId },
        include: { _count: { select: { books: true } } },
        orderBy: { name: 'asc' },
      });
      res.json({ success: true, data: subjects });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { name, code, category } = req.body;
      if (!name) throw new AppError(400, 'Name is required');

      const existing = await prisma.subject.findUnique({
        where: { organizationId_name: { organizationId: orgId, name } },
      });
      if (existing) throw new AppError(409, 'Subject already exists');

      const subject = await prisma.subject.create({
        data: { organizationId: orgId, name, code, category },
      });
      res.status(201).json({ success: true, data: subject });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);
      const { name, code, category } = req.body;

      const existing = await prisma.subject.findFirst({ where: { id, organizationId: orgId } });
      if (!existing) throw new AppError(404, 'Subject not found');

      const subject = await prisma.subject.update({
        where: { id },
        data: { ...(name && { name }), ...(code !== undefined && { code }), ...(category !== undefined && { category }) },
      });
      res.json({ success: true, data: subject });
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);
      const existing = await prisma.subject.findFirst({ where: { id, organizationId: orgId } });
      if (!existing) throw new AppError(404, 'Subject not found');
      await prisma.subject.delete({ where: { id } });
      res.json({ success: true, message: 'Subject deleted' });
    } catch (err) { next(err); }
  },
};
