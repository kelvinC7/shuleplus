import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

const GRADE_ORDER: Record<string, number> = {
  N1: 1, N2: 2, N3: 3,
  P1: 4, P2: 5, P3: 6, P4: 7, P5: 8, P6: 9,
  S1: 10, S2: 11, S3: 12, S4: 13, S5: 14, S6: 15,
};

function parseSortOrder(name: string): number {
  return GRADE_ORDER[name.toUpperCase()] ?? 99;
}

function inferCategory(name: string): string | null {
  const normalized = name.trim().toUpperCase();
  if (normalized === 'BABY' || normalized.startsWith('BABY') || /^N\d/.test(normalized)) return 'Nursery';
  const prefix = name.replace(/[0-9]/g, '').toUpperCase();
  if (prefix === 'N') return 'Nursery';
  if (prefix === 'P') return 'Primary';
  if (prefix === 'S') return 'Secondary';
  return null;
}

export class GradeService {
  async create(organizationId: string, data: { name: string; category?: string; sortOrder?: number }) {
    const existing = await prisma.grade.findFirst({
      where: { organizationId, name: data.name },
    });
    if (existing) throw new AppError(409, 'Grade with this name already exists');

    return prisma.grade.create({
      data: {
        organizationId,
        name: data.name,
        category: data.category ?? inferCategory(data.name),
        sortOrder: data.sortOrder ?? parseSortOrder(data.name),
      },
    });
  }

  async list(organizationId: string) {
    return prisma.grade.findMany({
      where: { organizationId },
      include: { _count: { select: { classes: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getById(id: string, organizationId: string) {
    const grade = await prisma.grade.findFirst({
      where: { id, organizationId },
      include: { classes: { include: { combination: true }, orderBy: [{ sortOrder: 'asc' }, { stream: 'asc' }] } },
    });
    if (!grade) throw new AppError(404, 'Grade not found');
    return grade;
  }

  async update(id: string, organizationId: string, data: { name?: string; category?: string; sortOrder?: number }) {
    const existing = await prisma.grade.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Grade not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    return prisma.grade.update({ where: { id }, data: updateData });
  }

  async delete(id: string, organizationId: string) {
    const existing = await prisma.grade.findFirst({
      where: { id, organizationId },
      include: { classes: true },
    });
    if (!existing) throw new AppError(404, 'Grade not found');
    if (existing.classes.length > 0) {
      throw new AppError(400, 'Cannot delete grade with linked classes');
    }
    await prisma.grade.delete({ where: { id } });
    return { message: 'Grade deleted' };
  }
}

export const gradeService = new GradeService();
