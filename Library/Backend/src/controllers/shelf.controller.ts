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

export const shelfController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const shelves = await prisma.shelfLocation.findMany({
        where: { organizationId: orgId },
        include: { _count: { select: { books: true } } },
        orderBy: [{ building: 'asc' }, { section: 'asc' }, { shelf: 'asc' }],
      });
      res.json({ success: true, data: shelves });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { building, room, section, shelf, row, position, capacity } = req.body;
      if (!section || !shelf) throw new AppError(400, 'Section and shelf are required');

      const existing = await prisma.shelfLocation.findFirst({
        where: { organizationId: orgId, building: building ?? 'Main', section, shelf },
      });
      if (existing) throw new AppError(409, 'Shelf location already exists');

      const location = await prisma.shelfLocation.create({
        data: {
          organizationId: orgId,
          building: building ?? 'Main',
          room,
          section,
          shelf,
          row,
          position,
          capacity: capacity ? Number(capacity) : 50,
        },
      });
      res.status(201).json({ success: true, data: location });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);
      const { building, room, section, shelf, row, position, capacity } = req.body;

      const existing = await prisma.shelfLocation.findFirst({ where: { id, organizationId: orgId } });
      if (!existing) throw new AppError(404, 'Shelf not found');

      const location = await prisma.shelfLocation.update({
        where: { id },
        data: {
          ...(building && { building }),
          ...(room !== undefined && { room }),
          ...(section && { section }),
          ...(shelf && { shelf }),
          ...(row !== undefined && { row }),
          ...(position !== undefined && { position }),
          ...(capacity !== undefined && { capacity: Number(capacity) }),
        },
      });
      res.json({ success: true, data: location });
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);
      const existing = await prisma.shelfLocation.findFirst({ where: { id, organizationId: orgId } });
      if (!existing) throw new AppError(404, 'Shelf not found');
      await prisma.shelfLocation.delete({ where: { id } });
      res.json({ success: true, message: 'Shelf deleted' });
    } catch (err) { next(err); }
  },
};
