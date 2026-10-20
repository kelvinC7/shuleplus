import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class RecipeService {
  async list(organizationId: string) {
    return prisma.recipe.findMany({
      where: { organizationId },
      include: {
        ingredients: true,
        menuItem: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(organizationId: string, id: string) {
    const recipe = await prisma.recipe.findFirst({
      where: { id, organizationId },
      include: {
        ingredients: true,
        menuItem: true,
      },
    });
    if (!recipe) throw new AppError(404, 'Recipe not found');
    return recipe;
  }

  async create(organizationId: string, data: any) {
    const { ingredients, ...recipeData } = data;
    return prisma.recipe.create({
      data: {
        organizationId,
        ...recipeData,
        ingredients: ingredients
          ? { create: ingredients.map((i: any) => ({ ...i })) }
          : undefined,
      },
      include: { ingredients: true },
    });
  }

  async update(organizationId: string, id: string, data: any) {
    const existing = await prisma.recipe.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Recipe not found');

    const { ingredients, ...recipeData } = data;

    return prisma.$transaction(async (tx) => {
      if (ingredients) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
      }
      return tx.recipe.update({
        where: { id },
        data: {
          ...recipeData,
          ...(ingredients && {
            ingredients: { create: ingredients.map((i: any) => ({ ...i })) },
          }),
        },
        include: { ingredients: true },
      });
    });
  }

  async remove(organizationId: string, id: string) {
    const existing = await prisma.recipe.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Recipe not found');
    await prisma.recipe.delete({ where: { id } });
  }
}

export const recipeService = new RecipeService();
