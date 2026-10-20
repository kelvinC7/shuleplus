import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class HygieneService {
  async list(organizationId: string, query?: { checkType?: string; status?: string }) {
    const where: any = { organizationId };
    if (query?.checkType) where.checkType = query.checkType;
    if (query?.status) where.status = query.status;

    return prisma.hygieneChecklist.findMany({
      where,
      include: { items: true },
      orderBy: { checkDate: 'desc' },
    });
  }

  async getById(organizationId: string, id: string) {
    const checklist = await prisma.hygieneChecklist.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
    if (!checklist) throw new AppError(404, 'Hygiene checklist not found');
    return checklist;
  }

  async create(organizationId: string, userId: string, data: any) {
    const { items, ...checklistData } = data;
    return prisma.hygieneChecklist.create({
      data: {
        organizationId,
        checkedBy: userId,
        ...checklistData,
        items: items ? { create: items.map((i: any) => ({ ...i })) } : undefined,
      },
      include: { items: true },
    });
  }

  async update(organizationId: string, id: string, data: any) {
    const existing = await prisma.hygieneChecklist.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Hygiene checklist not found');

    const { items, ...checklistData } = data;

    return prisma.$transaction(async (tx) => {
      if (items) {
        await tx.hygieneChecklistItem.deleteMany({ where: { checklistId: id } });
      }
      return tx.hygieneChecklist.update({
        where: { id },
        data: {
          ...checklistData,
          ...(items && { items: { create: items.map((i: any) => ({ ...i })) } }),
        },
        include: { items: true },
      });
    });
  }

  async remove(organizationId: string, id: string) {
    const existing = await prisma.hygieneChecklist.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Hygiene checklist not found');
    await prisma.hygieneChecklist.delete({ where: { id } });
  }
}

export const hygieneService = new HygieneService();
