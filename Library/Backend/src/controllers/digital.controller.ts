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

export const digitalController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { fileType, subjectId, search } = req.query as Record<string, string>;

      const where: any = { organizationId: orgId };
      if (fileType) where.fileType = fileType;
      if (subjectId) where.subjectId = subjectId;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const resources = await prisma.digitalResource.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: resources });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { title, description, fileType, fileUrl, fileName, fileSize, uploadedBy, accessRoles, subjectId, classLevel } = req.body;

      if (!title || !fileType || !fileUrl || !fileName) {
        throw new AppError(400, 'title, fileType, fileUrl, and fileName are required');
      }

      const resource = await prisma.digitalResource.create({
        data: {
          organizationId: orgId,
          title,
          description,
          fileType,
          fileUrl,
          fileName,
          fileSize: fileSize ? Number(fileSize) : null,
          uploadedBy,
          accessRoles: accessRoles ?? [],
          subjectId,
          classLevel,
        },
      });

      res.status(201).json({ success: true, data: resource });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);

      const existing = await prisma.digitalResource.findFirst({ where: { id, organizationId: orgId } });
      if (!existing) throw new AppError(404, 'Digital resource not found');

      const updated = await prisma.digitalResource.update({
        where: { id },
        data: { ...req.body },
      });

      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);

      const existing = await prisma.digitalResource.findFirst({ where: { id, organizationId: orgId } });
      if (!existing) throw new AppError(404, 'Digital resource not found');

      await prisma.digitalResource.delete({ where: { id } });
      res.json({ success: true, message: 'Digital resource deleted' });
    } catch (err) { next(err); }
  },

  async incrementDownload(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);

      const existing = await prisma.digitalResource.findFirst({ where: { id, organizationId: orgId } });
      if (!existing) throw new AppError(404, 'Digital resource not found');

      const updated = await prisma.digitalResource.update({
        where: { id },
        data: { downloadCount: { increment: 1 } },
      });

      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  },
};
