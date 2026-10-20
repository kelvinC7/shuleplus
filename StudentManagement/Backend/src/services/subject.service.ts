import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class SubjectService {
  async create(organizationId: string, data: { name: string; code?: string; category?: string }) {
    const existing = await prisma.subject.findFirst({
      where: { organizationId, name: data.name },
    });
    if (existing) throw new AppError(409, 'Subject with this name already exists');

    return prisma.subject.create({
      data: {
        organizationId,
        name: data.name,
        code: data.code ?? null,
        category: data.category ?? null,
      },
    });
  }

  async list(organizationId: string, category?: string) {
    const where: any = { organizationId };
    if (category) where.category = category;

    return prisma.subject.findMany({
      where,
      include: {
        _count: { select: { combinationSubjects: true } },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async getById(id: string, organizationId: string) {
    const subject = await prisma.subject.findFirst({
      where: { id, organizationId },
      include: {
        combinationSubjects: {
          include: { combination: true },
        },
        _count: { select: { combinationSubjects: true } },
      },
    });
    if (!subject) throw new AppError(404, 'Subject not found');
    return subject;
  }

  async update(id: string, organizationId: string, data: { name?: string; code?: string; category?: string }) {
    const existing = await prisma.subject.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Subject not found');

    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.subject.findFirst({
        where: { organizationId, name: data.name, id: { not: id } },
      });
      if (duplicate) throw new AppError(409, 'Subject with this name already exists');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.category !== undefined) updateData.category = data.category;

    return prisma.subject.update({ where: { id }, data: updateData });
  }

  async delete(id: string, organizationId: string) {
    const existing = await prisma.subject.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new AppError(404, 'Subject not found');

    const linked = await prisma.combinationSubject.count({ where: { subjectId: id } });
    if (linked > 0) {
      throw new AppError(400, 'Cannot delete subject linked to combinations. Remove it from combinations first.');
    }

    await prisma.subject.delete({ where: { id } });
    return { message: 'Subject deleted' };
  }

  async listCategories(organizationId: string) {
    const result = await prisma.subject.groupBy({
      by: ['category'],
      where: { organizationId, category: { not: null } },
      _count: { id: true },
      orderBy: { category: 'asc' },
    });
    return result.map(r => ({ category: r.category, count: r._count.id }));
  }
}

export const subjectService = new SubjectService();
