import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class CategoryService {
  async list(organizationId: string) {
    return prisma.productCategory.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async getById(organizationId: string, id: string) {
    const category = await prisma.productCategory.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw new AppError(404, 'Category not found');
    return category;
  }

  async create(organizationId: string, data: { name: string; description?: string }) {
    const existing = await prisma.productCategory.findUnique({
      where: { organizationId_name: { organizationId, name: data.name } },
    });
    if (existing) throw new AppError(409, 'Category with this name already exists');
    return prisma.productCategory.create({
      data: { organizationId, ...data },
    });
  }

  async update(organizationId: string, id: string, data: { name?: string; description?: string; isActive?: boolean }) {
    await this.getById(organizationId, id);
    if (data.name) {
      const existing = await prisma.productCategory.findFirst({
        where: { organizationId, name: data.name, id: { not: id } },
      });
      if (existing) throw new AppError(409, 'Category with this name already exists');
    }
    return prisma.productCategory.update({
      where: { id },
      data,
    });
  }

  async remove(organizationId: string, id: string) {
    await this.getById(organizationId, id);
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) throw new AppError(400, 'Cannot delete category with associated products');
    return prisma.productCategory.delete({ where: { id } });
  }
}

export const categoryService = new CategoryService();
