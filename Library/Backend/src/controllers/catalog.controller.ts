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

const ALLOWED_UPDATE_FIELDS = [
  'title', 'isbn', 'author', 'publisher', 'edition', 'publicationYear',
  'language', 'description', 'categoryId', 'subjectId', 'shelfLocationId',
  'classLevel', 'academicYear', 'bookCode', 'coverUrl', 'status',
] as const;

async function generateCopyIdentifiers(orgId: string, count: number, startIndex: number) {
  const year = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => {
    const seq = startIndex + i + 1;
    return {
      barcode: `BAR-${year}-${String(seq).padStart(6, '0')}`,
      libraryId: `LIB-${year}-${String(seq).padStart(6, '0')}`,
    };
  });
}

export const catalogController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { search, categoryId, subjectId, status } = req.query as Record<string, string>;
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

      const where: Record<string, unknown> = { organizationId: orgId };
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { author: { contains: search, mode: 'insensitive' } },
          { isbn: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (categoryId) where.categoryId = categoryId;
      if (subjectId) where.subjectId = subjectId;
      if (status) where.status = status;

      const [books, total, statsAgg] = await Promise.all([
        prisma.bookResource.findMany({
          where,
          include: { category: true, subject: true, shelf: true },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.bookResource.count({ where }),
        Promise.all([
          prisma.bookResource.aggregate({
            where: { organizationId: orgId },
            _sum: { availableCopies: true, totalCopies: true },
          }),
          prisma.bookCopy.count({ where: { organizationId: orgId, status: 'BORROWED' } }),
          prisma.resourceCategory.count({ where: { organizationId: orgId } }),
        ]),
      ]);

      const [copyAgg, borrowedCopies, categoryCount] = statsAgg;

      res.json({
        success: true,
        data: {
          resources: books,
          pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
          stats: {
            total: copyAgg._sum.totalCopies ?? 0,
            available: copyAgg._sum.availableCopies ?? 0,
            borrowed: borrowedCopies,
            categories: categoryCount,
          },
        },
      });
    } catch (err) { next(err); }
  },

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);
      const book = await prisma.bookResource.findFirst({
        where: { id, organizationId: orgId },
        include: { category: true, subject: true, shelf: true, copies: true },
      });
      if (!book) throw new AppError(404, 'Resource not found');
      res.json({ success: true, data: book });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const { title, isbn, author, publisher, edition, publicationYear, language, description,
        categoryId, subjectId, shelfLocationId, totalCopies, classLevel, academicYear, bookCode } = req.body;
      if (!title) throw new AppError(400, 'Title is required');

      const copies = Math.max(1, totalCopies ? Number(totalCopies) : 1);

      const book = await prisma.$transaction(async (tx) => {
        const existingCopyCount = await tx.bookCopy.count({ where: { organizationId: orgId } });
        const identifiers = await generateCopyIdentifiers(orgId, copies, existingCopyCount);

        const created = await tx.bookResource.create({
          data: {
            organizationId: orgId,
            title,
            isbn: isbn || null,
            author,
            publisher,
            edition,
            publicationYear: publicationYear ? Number(publicationYear) : null,
            language: language ?? 'English',
            description,
            categoryId: categoryId || null,
            subjectId: subjectId || null,
            shelfLocationId: shelfLocationId || null,
            totalCopies: copies,
            availableCopies: copies,
            classLevel,
            academicYear,
            bookCode,
          },
          include: { category: true, subject: true, shelf: true },
        });

        await tx.bookCopy.createMany({
          data: identifiers.map((id) => ({
            organizationId: orgId,
            resourceId: created.id,
            barcode: id.barcode,
            libraryId: id.libraryId,
            status: 'AVAILABLE' as const,
            condition: 'Good',
          })),
        });

        return created;
      });

      res.status(201).json({ success: true, data: book });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);
      const existing = await prisma.bookResource.findFirst({ where: { id, organizationId: orgId } });
      if (!existing) throw new AppError(404, 'Resource not found');

      const updateData: Record<string, unknown> = {};
      for (const field of ALLOWED_UPDATE_FIELDS) {
        if (req.body[field] !== undefined) {
          updateData[field] = field === 'publicationYear' && req.body[field]
            ? Number(req.body[field])
            : req.body[field];
        }
      }

      const book = await prisma.bookResource.update({
        where: { id },
        data: updateData,
        include: { category: true, subject: true, shelf: true, copies: true },
      });
      res.json({ success: true, data: book });
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = getOrgId(req);
      const id = getId(req);
      const existing = await prisma.bookResource.findFirst({ where: { id, organizationId: orgId } });
      if (!existing) throw new AppError(404, 'Resource not found');

      const activeLoans = await prisma.loan.count({
        where: { copy: { resourceId: id }, status: 'ACTIVE' },
      });
      if (activeLoans > 0) throw new AppError(400, 'Cannot delete resource with active loans');

      await prisma.bookResource.delete({ where: { id } });
      res.json({ success: true, message: 'Resource deleted' });
    } catch (err) { next(err); }
  },
};
