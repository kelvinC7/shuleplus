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

export const categoryController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const categories = await prisma.resourceCategory.findMany({
        where: { organizationId: orgId },
        include: { _count: { select: { books: true } } },
        orderBy: { name: 'asc' },
      });
      res.json({ success: true, data: categories.map(c => ({ ...c, resourceCount: c._count.books })) });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { name, description, type } = req.body;
      if (!name || !type) throw new AppError(400, 'Name and type are required');

      const existing = await prisma.resourceCategory.findUnique({
        where: { organizationId_name: { organizationId: orgId, name } },
      });
      if (existing) throw new AppError(409, 'Category already exists');

      const category = await prisma.resourceCategory.create({
        data: { organizationId: orgId, name, description, type },
      });
      res.status(201).json({ success: true, data: category });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);
      const { name, description, type } = req.body;

      const existing = await prisma.resourceCategory.findFirst({ where: { id, organizationId: orgId } });
      if (!existing) throw new AppError(404, 'Category not found');

      const category = await prisma.resourceCategory.update({
        where: { id },
        data: { ...(name && { name }), ...(description !== undefined && { description }), ...(type && { type }) },
      });
      res.json({ success: true, data: category });
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);
      const existing = await prisma.resourceCategory.findFirst({ where: { id, organizationId: orgId } });
      if (!existing) throw new AppError(404, 'Category not found');
      await prisma.resourceCategory.delete({ where: { id } });
      res.json({ success: true, message: 'Category deleted' });
    } catch (err) { next(err); }
  },
};
