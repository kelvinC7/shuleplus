import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { departmentService, OTHER_DEPARTMENT_CODE } from './department.service';

function generatePRNumber(orgId: string): string {
  const date = new Date();
  const prefix = 'PR';
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${year}${month}-${random}`;
}

export class PurchaseRequestService {
  async list(organizationId: string, filters?: {
    status?: string;
    departmentId?: string;
    priority?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: any = { organizationId };
    if (filters?.status && filters.status !== 'ALL') where.status = filters.status;
    if (filters?.departmentId) where.departmentId = filters.departmentId;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }
    if (filters?.search) {
      where.OR = [
        { prNumber: { contains: filters.search, mode: 'insensitive' } },
        { requestedByName: { contains: filters.search, mode: 'insensitive' } },
        { purpose: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.purchaseRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        department: { select: { id: true, name: true } },
        items: true,
        approvals: { orderBy: { createdAt: 'asc' } },
        _count: { select: { items: true } },
      },
    });
  }

  async getById(organizationId: string, id: string) {
    const pr = await prisma.purchaseRequest.findFirst({
      where: { id, organizationId },
      include: {
        department: true,
        items: { include: { category: true } },
        approvals: { orderBy: { createdAt: 'asc' } },
        purchaseOrders: true,
      },
    });
    if (!pr) throw new AppError(404, 'Purchase request not found');
    return pr;
  }

  async create(organizationId: string, userId: string, data: any) {
    const department = await prisma.department.findFirst({
      where: { id: data.departmentId, organizationId, isActive: true },
    });
    if (!department) {
      throw new AppError(400, 'Please select a valid department');
    }

    if (department.code === OTHER_DEPARTMENT_CODE && !data.departmentOther?.trim()) {
      throw new AppError(400, 'Please specify the department name for Others');
    }

    const prNumber = generatePRNumber(organizationId);
    const totalEstimate = data.items?.reduce(
      (sum: number, item: any) =>
        sum + (Number(item.quantity) * (Number(item.estimatedPrice) || 0)),
      0,
    ) || 0;

    const pr = await prisma.purchaseRequest.create({
      data: {
        organizationId,
        prNumber,
        requestType: data.requestType || 'GOODS',
        departmentId: data.departmentId,
        departmentOther: data.departmentOther?.trim() || null,
        academicYear: data.academicYear?.trim() || null,
        term: data.term?.trim() || null,
        requestedBy: userId,
        requestedByName: data.requestedByName,
        purpose: data.purpose,
        project: data.project,
        budgetLine: data.budgetLine,
        priority: data.priority || 'MEDIUM',
        neededDate: new Date(data.neededDate),
        status: 'PENDING',
        totalEstimate,
        currentApprover: data.departmentHeadId,
        items: {
          create: data.items?.map((item: any) => ({
            itemName: item.itemName,
            description: item.description,
            unit: item.unit,
            quantity: Number(item.quantity),
            estimatedPrice: Number(item.estimatedPrice) || 0,
            estimatedTotal: Number(item.quantity) * (Number(item.estimatedPrice) || 0),
            categoryId: item.categoryId || null,
            preferredSupplierId: item.preferredSupplierId || null,
            warehouseLocation: item.warehouseLocation || null,
            availableStock: item.availableStock ? Number(item.availableStock) : null,
          })) || [],
        },
      },
      include: { items: true, department: true },
    });

    await this.logActivity(organizationId, userId, 'PR_CREATED', 'PurchaseRequest', pr.id, {
      prNumber,
      totalEstimate,
    });

    return pr;
  }

  async update(organizationId: string, id: string, data: any) {
    await this.getById(organizationId, id);
    const totalEstimate = data.items?.reduce(
      (sum: number, item: any) => sum + (Number(item.quantity) * Number(item.estimatedPrice)), 0
    );

    const updateData: any = { ...data };
    if (totalEstimate) updateData.totalEstimate = totalEstimate;
    if (data.neededDate) updateData.neededDate = new Date(data.neededDate);
    delete updateData.items;

    return prisma.purchaseRequest.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });
  }

  async approve(organizationId: string, id: string, userId: string, userName: string, comment?: string) {
    const pr = await this.getById(organizationId, id);
    if (pr.status === 'REJECTED' || pr.status === 'CANCELLED') {
      throw new AppError(400, 'Cannot approve a rejected or cancelled request');
    }

    const stages = ['PENDING', 'DEPARTMENT_HEAD_APPROVED', 'FINANCE_APPROVED', 'PROCUREMENT_APPROVED', 'MD_APPROVED'];
    const currentIdx = stages.indexOf(pr.status);
    if (currentIdx >= stages.length - 1) {
      throw new AppError(400, 'Request is already fully approved');
    }

    const nextStatus = stages[currentIdx + 1];
    const stageNames = ['Employee', 'Department Head', 'Finance', 'Procurement Officer', 'Managing Director'];
    const currentStageName = stageNames[currentIdx];

    const [updated] = await prisma.$transaction([
      prisma.purchaseRequest.update({
        where: { id },
        data: {
          status: nextStatus as any,
          currentApprover: nextStatus === 'MD_APPROVED' ? null : undefined,
        },
      }),
      prisma.pRApproval.create({
        data: {
          prId: id,
          stage: currentStageName,
          approverId: userId,
          approverName: userName,
          status: 'APPROVED',
          comment: comment || `Approved by ${currentStageName}`,
          approvedAt: new Date(),
        },
      }),
    ]);

    await this.logActivity(organizationId, userId, 'PR_APPROVED', 'PurchaseRequest', id, {
      stage: currentStageName,
      nextStatus,
    });

    return updated;
  }

  async reject(organizationId: string, id: string, userId: string, userName: string, reason: string) {
    const pr = await this.getById(organizationId, id);
    const stages = ['PENDING', 'DEPARTMENT_HEAD_APPROVED', 'FINANCE_APPROVED', 'PROCUREMENT_APPROVED', 'MD_APPROVED'];
    const currentIdx = stages.indexOf(pr.status);
    const stageNames = ['Employee', 'Department Head', 'Finance', 'Procurement Officer', 'Managing Director'];

    const [updated] = await prisma.$transaction([
      prisma.purchaseRequest.update({
        where: { id },
        data: { status: 'REJECTED', rejectionReason: reason },
      }),
      prisma.pRApproval.create({
        data: {
          prId: id,
          stage: stageNames[currentIdx] || 'Unknown',
          approverId: userId,
          approverName: userName,
          status: 'REJECTED',
          comment: reason,
        },
      }),
    ]);

    await this.logActivity(organizationId, userId, 'PR_REJECTED', 'PurchaseRequest', id, { reason });
    return updated;
  }

  async cancel(organizationId: string, id: string, userId: string) {
    await this.getById(organizationId, id);
    const updated = await prisma.purchaseRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    await this.logActivity(organizationId, userId, 'PR_CANCELLED', 'PurchaseRequest', id, {});
    return updated;
  }

  async remove(organizationId: string, id: string) {
    await this.getById(organizationId, id);
    return prisma.purchaseRequest.delete({ where: { id } });
  }

  private async logActivity(orgId: string, userId: string, action: string, entity: string, entityId: string, metadata: any) {
    await prisma.activityLog.create({
      data: {
        organizationId: orgId,
        userId,
        action,
        entity,
        entityId,
        metadata,
      },
    });
  }
}

export const purchaseRequestService = new PurchaseRequestService();
