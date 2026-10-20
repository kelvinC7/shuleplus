import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

function generateContractNumber(orgId: string): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 900 + 100);
  return `CTR-${year}${month}-${random}`;
}

export class ContractService {
  async list(organizationId: string) {
    return prisma.contract.findMany({
      where: { organizationId },
      orderBy: { endDate: 'asc' },
      include: { supplier: { select: { id: true, companyName: true } } },
    });
  }

  async getById(organizationId: string, id: string) {
    const contract = await prisma.contract.findFirst({
      where: { id, organizationId },
      include: { supplier: true },
    });
    if (!contract) throw new AppError(404, 'Contract not found');
    return contract;
  }

  async create(organizationId: string, data: any) {
    const contractNumber = data.contractNumber || generateContractNumber(organizationId);
    return prisma.contract.create({
      data: {
        organizationId,
        contractNumber,
        supplierId: data.supplierId,
        title: data.title,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        value: data.value ? Number(data.value) : null,
        signedBy: data.signedBy,
        renewalTerms: data.renewalTerms,
        notes: data.notes,
        documentUrl: data.documentUrl,
      },
      include: { supplier: true },
    });
  }

  async update(organizationId: string, id: string, data: any) {
    await this.getById(organizationId, id);
    const updateData = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    return prisma.contract.update({ where: { id }, data: updateData });
  }

  async getExpiring(organizationId: string, days: number = 30) {
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return prisma.contract.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        endDate: { lte: futureDate },
      },
      orderBy: { endDate: 'asc' },
      include: { supplier: { select: { companyName: true } } },
    });
  }
}

export const contractService = new ContractService();
