import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class MenuItemService {
  async list(organizationId: string, query?: { mealType?: string; isActive?: string }) {
    const where: any = { organizationId };
    if (query?.mealType) where.mealType = query.mealType;
    if (query?.isActive !== undefined) where.isActive = query.isActive === 'true';

    return prisma.menuItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(organizationId: string, id: string) {
    const item = await prisma.menuItem.findFirst({ where: { id, organizationId } });
    if (!item) throw new AppError(404, 'Menu item not found');
    return item;
  }

  async create(organizationId: string, userId: string, data: any) {
    const item = await prisma.menuItem.create({
      data: { organizationId, ...data },
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        action: 'MENU_ITEM_CREATED',
        metadata: { menuItemId: item.id, name: item.name },
      },
    });

    return item;
  }

  async update(organizationId: string, id: string, data: any) {
    const existing = await prisma.menuItem.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Menu item not found');

    return prisma.menuItem.update({ where: { id }, data });
  }

  async remove(organizationId: string, id: string) {
    const existing = await prisma.menuItem.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Menu item not found');

    await prisma.menuItem.delete({ where: { id } });
  }
}

export const menuItemService = new MenuItemService();
