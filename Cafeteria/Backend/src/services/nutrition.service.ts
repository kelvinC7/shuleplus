import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class NutritionService {
  async listNutrition(organizationId: string) {
    return prisma.nutritionProfile.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createNutrition(organizationId: string, data: any) {
    return prisma.nutritionProfile.create({
      data: { organizationId, ...data },
    });
  }

  async listAllergies(organizationId: string, query?: { beneficiaryType?: string }) {
    const where: any = { organizationId };
    if (query?.beneficiaryType) where.beneficiaryType = query.beneficiaryType;
    return prisma.allergyProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAllergy(organizationId: string, data: any) {
    return prisma.allergyProfile.create({
      data: { organizationId, ...data },
    });
  }

  async updateAllergy(organizationId: string, id: string, data: any) {
    const existing = await prisma.allergyProfile.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Allergy profile not found');
    return prisma.allergyProfile.update({ where: { id }, data });
  }

  async removeAllergy(organizationId: string, id: string) {
    const existing = await prisma.allergyProfile.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Allergy profile not found');
    await prisma.allergyProfile.delete({ where: { id } });
  }
}

export const nutritionService = new NutritionService();
