import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { seedTenantData } from "./seed.service";

export async function listCategories(organizationId: string) {
  await seedTenantData(organizationId);
  return prisma.assetCategory.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(
  organizationId: string,
  input: { name: string; icon?: string; description?: string; depreciationRate: number }
) {
  const name = input.name.trim();
  if (!name) throw new AppError(400, "Category name is required");
  const existing = await prisma.assetCategory.findFirst({
    where: { organizationId, name: { equals: name, mode: "insensitive" }, deletedAt: null },
  });
  if (existing) throw new AppError(409, "Category already exists");

  return prisma.assetCategory.create({
    data: {
      organizationId,
      name,
      icon: input.icon,
      description: input.description,
      depreciationRate: Number(input.depreciationRate) || 0,
    },
  });
}

export async function updateCategory(
  organizationId: string,
  id: string,
  input: Partial<{ name: string; icon: string; description: string; depreciationRate: number }>
) {
  const cat = await prisma.assetCategory.findFirst({ where: { id, organizationId, deletedAt: null } });
  if (!cat) throw new AppError(404, "Category not found");

  return prisma.assetCategory.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.depreciationRate !== undefined
        ? { depreciationRate: Number(input.depreciationRate) }
        : {}),
    },
  });
}

export async function deleteCategory(organizationId: string, id: string) {
  const cat = await prisma.assetCategory.findFirst({ where: { id, organizationId, deletedAt: null } });
  if (!cat) throw new AppError(404, "Category not found");
  const inUse = await prisma.asset.count({
    where: { organizationId, categoryId: id, deletedAt: null },
  });
  if (inUse > 0) throw new AppError(400, "Category has assets and cannot be deleted");
  return prisma.assetCategory.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
