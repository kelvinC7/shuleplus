import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class KitchenStaffService {
  async list(organizationId: string, query?: { role?: string }) {
    const where: any = { organizationId };
    if (query?.role) where.role = query.role;

    return prisma.kitchenStaff.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(organizationId: string, id: string) {
    const staff = await prisma.kitchenStaff.findFirst({ where: { id, organizationId } });
    if (!staff) throw new AppError(404, 'Kitchen staff not found');
    return staff;
  }

  async create(organizationId: string, data: any) {
    return prisma.kitchenStaff.create({
      data: { organizationId, ...data },
    });
  }

  async update(organizationId: string, id: string, data: any) {
    const existing = await prisma.kitchenStaff.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Kitchen staff not found');
    return prisma.kitchenStaff.update({ where: { id }, data });
  }

  async remove(organizationId: string, id: string) {
    const existing = await prisma.kitchenStaff.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Kitchen staff not found');
    await prisma.kitchenStaff.delete({ where: { id } });
  }
}

export const kitchenStaffService = new KitchenStaffService();
