import { KitStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export interface KitRequirementInput {
  title: string;
  quantity?: number;
  unitPrice?: string | number;
  imageUrl?: string;
  notes?: string;
}

export interface KitInput {
  name: string;
  gradeLevel: string;
  description?: string;
  imageUrl?: string;
  amount: string | number;
  status?: KitStatus;
  requirements?: KitRequirementInput[];
}

/** Total price of a kit = sum(unitPrice × quantity) over requirements with a price. */
function computedAmount(requirements?: KitRequirementInput[]): number | null {
  if (!requirements?.length) return null;
  const sum = requirements.reduce((acc, r) => {
    const unit = Math.max(0, Number(r.unitPrice ?? 0) || 0);
    const qty = Math.max(1, parseInt(String(r.quantity), 10) || 1);
    return acc + unit * qty;
  }, 0);
  return sum > 0 ? sum : null;
}

export class KitService {
  async list(organizationId: string, gradeLevel?: string, status?: string) {
    return prisma.kit.findMany({
      where: {
        organizationId,
        ...(gradeLevel ? { gradeLevel } : {}),
        ...(status ? { status: status as KitStatus } : {}),
      },
      include: { requirements: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string, organizationId: string) {
    const kit = await prisma.kit.findFirst({
      where: { id, organizationId },
      include: { requirements: { orderBy: { createdAt: 'asc' } }, requests: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
    if (!kit) throw new AppError(404, 'Kit not found');
    return kit;
  }

  async create(organizationId: string, input: KitInput) {
    const existing = await prisma.kit.findFirst({
      where: { organizationId, gradeLevel: input.gradeLevel },
    });
    if (existing) throw new AppError(400, `A kit for "${input.gradeLevel}" already exists`);

    const autoAmount = computedAmount(input.requirements);
    const amount = autoAmount ?? input.amount;

    return prisma.kit.create({
      data: {
        organizationId,
        name: input.name,
        gradeLevel: input.gradeLevel,
        description: input.description,
        imageUrl: input.imageUrl,
        amount: String(amount),
        status: input.status ?? KitStatus.ACTIVE,
        requirements: input.requirements?.length
          ? {
              create: input.requirements.map((r) => ({
                organizationId,
                title: r.title,
                quantity: r.quantity ?? 1,
                unitPrice: String(r.unitPrice ?? 0),
                imageUrl: r.imageUrl,
                notes: r.notes,
              })),
            }
          : undefined,
      },
      include: { requirements: true },
    });
  }

  async update(id: string, organizationId: string, input: Partial<KitInput>) {
    const kit = await prisma.kit.findFirst({ where: { id, organizationId } });
    if (!kit) throw new AppError(404, 'Kit not found');

    if (input.gradeLevel) {
      const clash = await prisma.kit.findFirst({
        where: { organizationId, gradeLevel: input.gradeLevel, id: { not: id } },
      });
      if (clash) throw new AppError(400, `A kit for "${input.gradeLevel}" already exists`);
    }

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.gradeLevel !== undefined) updateData.gradeLevel = input.gradeLevel;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
    if (input.status !== undefined) updateData.status = input.status;

    if (input.requirements) {
      const autoAmount = computedAmount(input.requirements);
      if (autoAmount !== null) updateData.amount = String(autoAmount);
      updateData.requirements = {
        deleteMany: {},
        create: input.requirements.map((r) => ({
          organizationId,
          title: r.title,
          quantity: r.quantity ?? 1,
          unitPrice: String(r.unitPrice ?? 0),
          imageUrl: r.imageUrl,
          notes: r.notes,
        })),
      };
    } else if (input.amount !== undefined) {
      updateData.amount = String(input.amount);
    }

    return prisma.kit.update({
      where: { id },
      data: updateData,
      include: { requirements: true },
    });
  }

  async delete(id: string, organizationId: string) {
    const kit = await prisma.kit.findFirst({
      where: { id, organizationId },
      include: { requests: true },
    });
    if (!kit) throw new AppError(404, 'Kit not found');
    if (kit.requests.length > 0) {
      throw new AppError(400, 'Cannot delete a kit that has requests');
    }
    await prisma.kit.delete({ where: { id } });
    return { message: 'Kit deleted' };
  }
}

export const kitService = new KitService();
