import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { departmentService, OTHER_DEPARTMENT_CODE } from './department.service';
import { applyDateFilter } from '../utils/date-range';
import type { RequestVisibility } from '../utils/module-access';
import { resolveUserDisplayName, resolveUserDisplayNames } from '../utils/user-display-name';
import { inventoryClient } from '../clients/inventory.client';
import { normalizeItemName, toPositiveNumber } from '../utils/item-match';

function generatePRNumber(_orgId: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `PR-${year}-${month}-${random}`;
}

export class PurchaseRequestService {
  async list(organizationId: string, filters?: {
    status?: string;
    departmentId?: string;
    priority?: string;
    search?: string;
    academicYear?: string;
    term?: string;
    date?: string;
    week?: string;
    dateFrom?: string;
    dateTo?: string;
  }, visibility?: RequestVisibility) {
    const where: any = { organizationId };
    if (visibility && !visibility.canViewAll) {
      where.requestedBy = visibility.userId;
    }
    if (filters?.status && filters.status !== 'ALL') where.status = filters.status;
    if (filters?.departmentId) where.departmentId = filters.departmentId;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.academicYear) where.academicYear = filters.academicYear;
    if (filters?.term) where.term = filters.term;
    applyDateFilter(where, 'createdAt', filters);
    if (filters?.search) {
      where.OR = [
        { prNumber: { contains: filters.search, mode: 'insensitive' } },
        { requestedByName: { contains: filters.search, mode: 'insensitive' } },
        { purpose: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const requests = await prisma.purchaseRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        department: { select: { id: true, name: true } },
        items: true,
        approvals: { orderBy: { createdAt: 'asc' } },
        purchaseOrders: {
          include: {
            items: true,
            supplier: { select: { id: true, companyName: true } },
          },
        },
        _count: { select: { items: true } },
      },
    });

    return this.withDisplayNames(requests);
  }

  async getById(organizationId: string, id: string, visibility?: RequestVisibility) {
    const where: any = { id, organizationId };
    if (visibility && !visibility.canViewAll) {
      where.requestedBy = visibility.userId;
    }

    const pr = await prisma.purchaseRequest.findFirst({
      where,
      include: {
        department: true,
        items: { include: { category: true } },
        approvals: { orderBy: { createdAt: 'asc' } },
        purchaseOrders: {
          include: {
            items: true,
            supplier: { select: { id: true, companyName: true } },
          },
        },
      },
    });
    if (!pr) throw new AppError(404, 'Purchase request not found');

    const displayName = await resolveUserDisplayName(pr.requestedBy, pr.requestedByName);
    return { ...pr, requestedByName: displayName || pr.requestedByName };
  }

  async create(organizationId: string, userId: string, data: any, userEmail?: string) {
    let department: { id: string; code: string } | null = null;
    const departmentId = data.departmentId?.trim() || null;

    if (departmentId) {
      department = await prisma.department.findFirst({
        where: { id: departmentId, organizationId, isActive: true },
        select: { id: true, code: true },
      });
      if (!department) {
        throw new AppError(400, 'Please select a valid department');
      }
      if (department.code === OTHER_DEPARTMENT_CODE && !data.departmentOther?.trim()) {
        throw new AppError(400, 'Please specify the department name for Others');
      }
    }

    const prNumber = generatePRNumber(organizationId);
    const totalEstimate = data.items?.reduce(
      (sum: number, item: any) =>
        sum + (Number(item.quantity) * (Number(item.estimatedPrice) || 0)),
      0,
    ) || 0;
    const requestedByName = await resolveUserDisplayName(
      userId,
      data.requestedByName || userEmail,
    );

    const neededDate = data.neededDate ? new Date(data.neededDate) : null;
    if (data.neededDate && neededDate && Number.isNaN(neededDate.getTime())) {
      throw new AppError(400, 'The needed date is invalid');
    }

    const pr = await prisma.purchaseRequest.create({
      data: {
        organizationId,
        prNumber,
        requestType: data.requestType || 'GOODS',
        departmentId: department?.id ?? null,
        departmentOther: departmentId ? (data.departmentOther?.trim() || null) : null,
        academicYear: data.academicYear?.trim() || null,
        term: data.term?.trim() || null,
        requestedBy: userId,
        requestedByName,
        purpose: data.purpose,
        project: data.project,
        budgetLine: data.budgetLine,
        priority: data.priority || 'MEDIUM',
        neededDate,
        status: data.status === 'DRAFT' ? 'DRAFT' : 'PENDING',
        totalEstimate,
        currentApprover: data.status === 'DRAFT' ? null : data.departmentHeadId,
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

  /**
   * Item catalogue used by the Excel import wizard.
   * Prefers InventoryMIS products, falling back to item names already used in
   * this organization's purchase requests so imports are never blocked when
   * the inventory service is temporarily unreachable.
   */
  async itemCatalog(organizationId: string) {
    try {
      const products = await inventoryClient.listProducts(organizationId);
      if (products.length > 0) {
        return products.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku ?? null,
          unit: product.unitOfMeasure ?? 'EA',
          source: 'inventory' as const,
        }));
      }
    } catch {
      // Fall through to procurement history.
    }

    const items = await prisma.purchaseRequestItem.findMany({
      where: { request: { organizationId } },
      select: { id: true, itemName: true, unit: true },
      distinct: ['itemName'],
      orderBy: { itemName: 'asc' },
    });

    return items.map((item) => ({
      id: item.id,
      name: item.itemName,
      sku: null,
      unit: item.unit,
      source: 'procurement' as const,
    }));
  }

  async importRequests(
    organizationId: string,
    userId: string,
    data: {
      departmentIds?: string[];
      items: { itemName: string; quantity: number | string; unit?: string }[];
      academicYear?: string;
      term?: string;
      priority?: string;
      neededDate?: string;
      purpose?: string;
      requestType?: string;
      departmentHeadId?: string;
    },
    userEmail?: string,
  ) {
    const merged = new Map<
      string,
      { itemName: string; quantity: number; unit: string }
    >();

    for (const raw of data.items ?? []) {
      const itemName = String(raw?.itemName ?? '').trim();
      if (!itemName) {
        throw new AppError(400, 'Every imported row must include an item name');
      }
      const quantity = toPositiveNumber(raw?.quantity);
      if (quantity === null) {
        throw new AppError(
          400,
          `Quantity for "${itemName}" must be a positive number`,
        );
      }
      const key = normalizeItemName(itemName);
      const existing = merged.get(key);
      if (existing) {
        existing.quantity += quantity;
      } else {
        merged.set(key, {
          itemName,
          quantity,
          unit: String(raw?.unit ?? '').trim() || 'EA',
        });
      }
    }

    const items = [...merged.values()];
    if (items.length === 0) {
      throw new AppError(400, 'No valid rows were provided for import');
    }

    const requestedIds = [
      ...new Set((data.departmentIds ?? []).map((id) => String(id)).filter(Boolean)),
    ];

    let departments;
    if (requestedIds.length > 0) {
      const found = await prisma.department.findMany({
        where: { organizationId, isActive: true, id: { in: requestedIds } },
      });
      if (found.length !== requestedIds.length) {
        throw new AppError(
          400,
          'One or more selected departments are no longer available',
        );
      }
      const byId = new Map(found.map((department) => [department.id, department]));
      departments = requestedIds.map((id) => byId.get(id)!);
    } else {
      // Existing assignment rule: reuse the requester's last department, then
      // fall back to the school's Administration department.
      const lastRequest = await prisma.purchaseRequest.findFirst({
        where: { organizationId, requestedBy: userId },
        orderBy: { createdAt: 'desc' },
        select: { departmentId: true },
      });
      let fallback =
        lastRequest?.departmentId
          ? await prisma.department.findFirst({
              where: {
                id: lastRequest.departmentId,
                organizationId,
                isActive: true,
              },
            })
          : null;
      fallback ??= await prisma.department.findFirst({
        where: { organizationId, isActive: true, code: 'ADMIN' },
      });
      fallback ??= await prisma.department.findFirst({
        where: { organizationId, isActive: true },
        orderBy: { name: 'asc' },
      });
      if (!fallback) {
        throw new AppError(
          400,
          'No active department is available. Select a department and try again.',
        );
      }
      departments = [fallback];
    }

    let neededDate: Date | null = null;
    if (data.neededDate) {
      neededDate = new Date(data.neededDate);
      if (Number.isNaN(neededDate.getTime())) {
        throw new AppError(400, 'The needed date is invalid');
      }
    }

    const requestedByName = await resolveUserDisplayName(userId, userEmail);
    const prNumbers = await this.generateUniquePRNumbers(
      organizationId,
      departments.length,
    );

    const created = await prisma.$transaction(async (tx) => {
      const results = [];
      for (let index = 0; index < departments.length; index += 1) {
        const department = departments[index];
        const pr = await tx.purchaseRequest.create({
          data: {
            organizationId,
            prNumber: prNumbers[index],
            requestType: data.requestType?.trim() || 'GOODS',
            departmentId: department.id,
            departmentOther: null,
            academicYear: data.academicYear?.trim() || null,
            term: data.term?.trim() || null,
            requestedBy: userId,
            requestedByName,
            purpose: data.purpose?.trim() || null,
            priority: (data.priority as any) || 'MEDIUM',
            neededDate,
            status: 'PENDING',
            totalEstimate: 0,
            currentApprover: data.departmentHeadId || null,
            items: {
              create: items.map((item) => ({
                itemName: item.itemName,
                unit: item.unit,
                quantity: item.quantity,
                estimatedPrice: 0,
                estimatedTotal: 0,
              })),
            },
          },
          include: { items: true },
        });

        await tx.activityLog.create({
          data: {
            organizationId,
            userId,
            action: 'PR_IMPORTED',
            entity: 'PurchaseRequest',
            entityId: pr.id,
            metadata: {
              prNumber: pr.prNumber,
              itemCount: items.length,
              source: 'EXCEL_IMPORT',
            },
          },
        });

        results.push(pr);
      }
      return results;
    });

    return {
      requests: created.map((pr) => ({
        id: pr.id,
        prNumber: pr.prNumber,
        departmentId: pr.departmentId,
        departmentName:
          departments.find((department) => department.id === pr.departmentId)?.name ?? '',
        itemCount: pr.items.length,
      })),
      itemCount: items.length,
      departmentCount: departments.length,
    };
  }

  private async generateUniquePRNumbers(
    organizationId: string,
    count: number,
  ): Promise<string[]> {
    const date = new Date();
    const prefix = `PR-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const numbers: string[] = [];

    for (let index = 0; index < count; index += 1) {
      let candidate = '';
      for (let attempt = 0; attempt < 25; attempt += 1) {
        const random = Math.floor(Math.random() * 9000 + 1000);
        candidate = `${prefix}-${random}`;
        const exists = await prisma.purchaseRequest.findFirst({
          where: { organizationId, prNumber: candidate },
          select: { id: true },
        });
        if (!exists && !numbers.includes(candidate)) break;
      }
      numbers.push(candidate);
    }

    return numbers;
  }

  async update(organizationId: string, id: string, data: any, visibility?: RequestVisibility) {
    await this.getById(organizationId, id, visibility);
    const totalEstimate = data.items?.reduce(
      (sum: number, item: any) => sum + (Number(item.quantity) * Number(item.estimatedPrice || 0)), 0
    );

    const updateData: any = { ...data };
    if (totalEstimate !== undefined) updateData.totalEstimate = totalEstimate;
    if ('neededDate' in data) {
      if (data.neededDate) {
        const parsed = new Date(data.neededDate);
        if (Number.isNaN(parsed.getTime())) throw new AppError(400, 'The needed date is invalid');
        updateData.neededDate = parsed;
      } else {
        updateData.neededDate = null;
      }
    }
    if ('departmentId' in data) {
      const deptId = data.departmentId?.trim() || null;
      if (deptId) {
        const dept = await prisma.department.findFirst({
          where: { id: deptId, organizationId, isActive: true },
          select: { id: true, code: true },
        });
        if (!dept) throw new AppError(400, 'Please select a valid department');
        if (dept.code === OTHER_DEPARTMENT_CODE && !data.departmentOther?.trim()) {
          throw new AppError(400, 'Please specify the department name for Others');
        }
        updateData.departmentId = dept.id;
        updateData.departmentOther = data.departmentOther?.trim() || null;
      } else {
        updateData.departmentId = null;
        updateData.departmentOther = null;
      }
    }
    delete updateData.items;
    delete updateData.requestedBy;
    delete updateData.requestedByName;
    delete updateData.departmentHeadId;

    const items = Array.isArray(data.items) ? data.items : null;

    return prisma.$transaction(async (tx) => {
      if (items) {
        await tx.purchaseRequestItem.deleteMany({ where: { prId: id } });
      }

      return tx.purchaseRequest.update({
        where: { id },
        data: {
          ...updateData,
          ...(items
            ? {
                items: {
                  create: items.map((item: any) => ({
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
                  })),
                },
              }
            : {}),
        },
        include: { items: true, department: true },
      });
    });
  }

  async approve(
    organizationId: string,
    id: string,
    userId: string,
    userName: string,
    comment?: string,
    visibility?: RequestVisibility,
  ) {
    const pr = await this.getById(organizationId, id, visibility);
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

  async reject(
    organizationId: string,
    id: string,
    userId: string,
    userName: string,
    reason: string,
    visibility?: RequestVisibility,
  ) {
    const pr = await this.getById(organizationId, id, visibility);
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

  async cancel(
    organizationId: string,
    id: string,
    userId: string,
    visibility?: RequestVisibility,
  ) {
    await this.getById(organizationId, id, visibility);
    const updated = await prisma.purchaseRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    await this.logActivity(organizationId, userId, 'PR_CANCELLED', 'PurchaseRequest', id, {});
    return updated;
  }

  async remove(organizationId: string, id: string, visibility?: RequestVisibility) {
    await this.getById(organizationId, id, visibility);
    return prisma.purchaseRequest.delete({ where: { id } });
  }

  private async withDisplayNames<
    T extends { requestedBy: string; requestedByName: string | null },
  >(requests: T[]): Promise<T[]> {
    if (requests.length === 0) return requests;

    const names = await resolveUserDisplayNames(
      requests.map((request) => request.requestedBy),
    );

    return requests.map((request) => {
      const resolved = names.get(request.requestedBy);
      if (!resolved || resolved === request.requestedByName) return request;
      return { ...request, requestedByName: resolved } as T;
    });
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
