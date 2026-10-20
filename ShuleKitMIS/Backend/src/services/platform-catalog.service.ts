import { CatalogStatus, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
  babyeyiClient,
  explainNoSellableItems,
  extractSellableItems,
  summarizeRequirementChannels,
} from './babyeyi-client.service';
import { tenantService } from './tenant.service';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || `cat-${Date.now()}`;
}

export class PlatformCatalogService {
  // ── Categories ──────────────────────────────────────────────
  async listCategories(status?: string) {
    return prisma.productCategory.findMany({
      where: status ? { status: status as CatalogStatus } : undefined,
      include: { _count: { select: { products: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(input: { name: string; slug?: string; description?: string; status?: CatalogStatus; sortOrder?: number }) {
    const name = input.name.trim();
    if (!name) throw new AppError(400, 'Category name is required');
    const slug = (input.slug?.trim() || slugify(name)).toLowerCase();
    try {
      return await prisma.productCategory.create({
        data: {
          name,
          slug,
          description: input.description,
          status: input.status ?? 'ACTIVE',
          sortOrder: input.sortOrder ?? 0,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new AppError(409, 'Category slug already exists');
      }
      throw e;
    }
  }

  async updateCategory(id: string, input: Partial<{ name: string; slug: string; description: string; status: CatalogStatus; sortOrder: number }>) {
    const existing = await prisma.productCategory.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Category not found');
    return prisma.productCategory.update({
      where: { id },
      data: {
        name: input.name?.trim() ?? undefined,
        slug: input.slug?.trim()?.toLowerCase() ?? undefined,
        description: input.description,
        status: input.status,
        sortOrder: input.sortOrder,
      },
    });
  }

  async deleteCategory(id: string) {
    const existing = await prisma.productCategory.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Category not found');
    await prisma.productCategory.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Products ────────────────────────────────────────────────
  async listProducts(query: { status?: string; categoryId?: string; customEligible?: boolean; search?: string; featured?: boolean }) {
    const where: Prisma.ProductWhereInput = {};
    if (query.status) where.status = query.status as CatalogStatus;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.customEligible !== undefined) where.customEligible = query.customEligible;
    if (query.featured !== undefined) where.featured = query.featured;
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    return prisma.product.findMany({
      where,
      include: { category: true, pricingRules: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { name: 'asc' },
    });
  }

  async getProduct(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, pricingRules: { orderBy: { createdAt: 'desc' } } },
    });
    if (!product) throw new AppError(404, 'Product not found');
    return product;
  }

  async createProduct(input: {
    name: string;
    sku?: string;
    categoryId?: string;
    description?: string;
    imageUrl?: string;
    unitPrice?: number;
    stockQty?: number;
    vatPercent?: number | null;
    status?: CatalogStatus;
    featured?: boolean;
    customEligible?: boolean;
  }) {
    const name = input.name.trim();
    if (!name) throw new AppError(400, 'Product name is required');
    const sku = (input.sku?.trim() || `SKU-${Date.now()}`).toUpperCase();
    try {
      return await prisma.product.create({
        data: {
          name,
          sku,
          categoryId: input.categoryId || null,
          description: input.description,
          imageUrl: input.imageUrl,
          unitPrice: input.unitPrice ?? 0,
          stockQty: input.stockQty ?? 0,
          vatPercent: input.vatPercent ?? null,
          status: input.status ?? 'ACTIVE',
          featured: input.featured ?? false,
          customEligible: input.customEligible ?? true,
        },
        include: { category: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new AppError(409, 'SKU already exists');
      }
      throw e;
    }
  }

  async updateProduct(id: string, input: Record<string, unknown>) {
    await this.getProduct(id);
    return prisma.product.update({
      where: { id },
      data: {
        name: typeof input.name === 'string' ? input.name.trim() : undefined,
        sku: typeof input.sku === 'string' ? input.sku.trim().toUpperCase() : undefined,
        categoryId: input.categoryId === null ? null : typeof input.categoryId === 'string' ? input.categoryId : undefined,
        description: typeof input.description === 'string' ? input.description : undefined,
        imageUrl: typeof input.imageUrl === 'string' ? input.imageUrl : undefined,
        unitPrice: input.unitPrice !== undefined ? Number(input.unitPrice) : undefined,
        stockQty: input.stockQty !== undefined ? Number(input.stockQty) : undefined,
        vatPercent: input.vatPercent === null ? null : input.vatPercent !== undefined ? Number(input.vatPercent) : undefined,
        status: typeof input.status === 'string' ? (input.status as CatalogStatus) : undefined,
        featured: typeof input.featured === 'boolean' ? input.featured : undefined,
        customEligible: typeof input.customEligible === 'boolean' ? input.customEligible : undefined,
      },
      include: { category: true },
    });
  }

  async deleteProduct(id: string) {
    await this.getProduct(id);
    await prisma.product.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Pricing rules ───────────────────────────────────────────
  async listPricingRules() {
    return prisma.pricingRule.findMany({
      include: { product: true, standardKit: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertPricingRule(input: {
    id?: string;
    productId?: string;
    standardKitId?: string;
    sellingPrice: number;
    discountPct?: number;
    promotionLabel?: string;
    available?: boolean;
    featured?: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
  }) {
    if (!input.productId && !input.standardKitId) {
      throw new AppError(400, 'productId or standardKitId is required');
    }
    const data = {
      productId: input.productId ?? null,
      standardKitId: input.standardKitId ?? null,
      sellingPrice: input.sellingPrice,
      discountPct: input.discountPct ?? 0,
      promotionLabel: input.promotionLabel,
      available: input.available ?? true,
      featured: input.featured ?? false,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    };
    if (input.id) {
      return prisma.pricingRule.update({ where: { id: input.id }, data, include: { product: true, standardKit: true } });
    }
    return prisma.pricingRule.create({ data, include: { product: true, standardKit: true } });
  }

  async deletePricingRule(id: string) {
    await prisma.pricingRule.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Standard kits ───────────────────────────────────────────
  async listStandardKits(query: {
    organizationId?: string;
    district?: string;
    academicYear?: string;
    term?: string;
    className?: string;
    status?: string;
    search?: string;
  }) {
    const where: Prisma.StandardKitWhereInput = {};
    if (query.organizationId) where.organizationId = query.organizationId;
    if (query.district) where.district = { equals: query.district, mode: 'insensitive' };
    if (query.academicYear) {
      where.academicYear = { equals: query.academicYear, mode: 'insensitive' };
    }
    if (query.term) {
      where.term = { equals: query.term, mode: 'insensitive' };
    }
    if (query.className) where.className = { equals: query.className, mode: 'insensitive' };
    if (query.status) where.status = query.status as CatalogStatus;
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { organizationName: { contains: q, mode: 'insensitive' } },
        { className: { contains: q, mode: 'insensitive' } },
      ];
    }
    return prisma.standardKit.findMany({
      where,
      include: { items: true, pricingRules: { take: 1, orderBy: { createdAt: 'desc' } }, _count: { select: { items: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getStandardKit(id: string) {
    const kit = await prisma.standardKit.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, pricingRules: true },
    });
    if (!kit) throw new AppError(404, 'Standard kit not found');
    return kit;
  }

  async updateStandardKit(id: string, input: Record<string, unknown>) {
    await this.getStandardKit(id);
    const kit = await prisma.standardKit.update({
      where: { id },
      data: {
        name: typeof input.name === 'string' ? input.name.trim() : undefined,
        description: typeof input.description === 'string' ? input.description : undefined,
        imageUrl: typeof input.imageUrl === 'string' ? input.imageUrl : undefined,
        status: typeof input.status === 'string' ? (input.status as CatalogStatus) : undefined,
        totalAmount: input.totalAmount !== undefined ? Number(input.totalAmount) : undefined,
      },
      include: { items: true },
    });
    if (Array.isArray(input.items)) {
      for (const raw of input.items as Array<Record<string, unknown>>) {
        if (typeof raw.id !== 'string') continue;
        await prisma.standardKitItem.update({
          where: { id: raw.id },
          data: {
            unitPrice: raw.unitPrice !== undefined ? Number(raw.unitPrice) : undefined,
            quantity: raw.quantity !== undefined ? Number(raw.quantity) : undefined,
            imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
            title: typeof raw.title === 'string' ? raw.title : undefined,
            productId: typeof raw.productId === 'string' ? raw.productId : undefined,
          },
        });
      }
      const items = await prisma.standardKitItem.findMany({ where: { standardKitId: id } });
      const total = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
      return prisma.standardKit.update({
        where: { id },
        data: { totalAmount: total },
        include: { items: true, pricingRules: true },
      });
    }
    return kit;
  }

  async deleteStandardKit(id: string) {
    await this.getStandardKit(id);
    await prisma.standardKit.delete({ where: { id } });
    return { deleted: true };
  }

  // ── District / Babyeyi import ────────────────────────────────
  async listDistrictOptions(academicYear?: string) {
    const circulars = await babyeyiClient.listCirculars({
      academicYear,
      status: 'PUBLISHED',
      limit: 500,
    });
    const districts = [...new Set(circulars.map((c) => c.district).filter(Boolean) as string[])].sort();
    return { districts, totalCirculars: circulars.length };
  }

  async listDistrictSchools(district: string, academicYear?: string) {
    const circulars = await babyeyiClient.listCirculars({
      district,
      academicYear,
      limit: 500,
    });
    const byOrg = new Map<string, { organizationId: string; schoolName: string; schoolCode: string | null; circularCount: number; years: Set<string>; terms: Set<string> }>();
    for (const c of circulars) {
      const cur = byOrg.get(c.organizationId) ?? {
        organizationId: c.organizationId,
        schoolName: c.schoolName,
        schoolCode: c.schoolCode,
        circularCount: 0,
        years: new Set<string>(),
        terms: new Set<string>(),
      };
      cur.circularCount += 1;
      if (c.academicYear) cur.years.add(c.academicYear);
      if (c.term) cur.terms.add(c.term);
      byOrg.set(c.organizationId, cur);
    }
    return [...byOrg.values()].map((s) => ({
      organizationId: s.organizationId,
      schoolName: s.schoolName,
      schoolCode: s.schoolCode,
      circularCount: s.circularCount,
      academicYears: [...s.years].sort(),
      terms: [...s.terms].sort(),
    }));
  }

  async listSchoolCirculars(organizationId: string, query: { academicYear?: string; term?: string }) {
    let circulars = await babyeyiClient.listCirculars({
      organizationId,
      academicYear: query.academicYear,
      limit: 200,
    });
    if (query.term) {
      const term = query.term.toLowerCase();
      circulars = circulars.filter((c) => String(c.term).toLowerCase() === term);
    }
    const imported = await prisma.standardKit.findMany({
      where: { babyeyiCircularId: { in: circulars.map((c) => c.id) } },
      select: { id: true, babyeyiCircularId: true, status: true, totalAmount: true },
    });
    const byCircular = new Map(imported.map((k) => [k.babyeyiCircularId!, k]));

    const details = await Promise.all(
      circulars.map(async (c) => {
        try {
          return await babyeyiClient.getCircular(c.id);
        } catch {
          return null;
        }
      })
    );

    return circulars.map((c, idx) => {
      const detail = details[idx];
      const channels = detail
        ? summarizeRequirementChannels(detail)
        : { total: 0, schoolChannel: 0, otherRequirementChannel: 0, unknownChannel: 0, untitled: 0 };
      return {
        ...c,
        importedKit: byCircular.get(c.id) ?? null,
        itemCount: channels.total,
        importableCount: channels.otherRequirementChannel,
        schoolAccountCount: channels.schoolChannel,
      };
    });
  }

  async importCircular(
    circularId: string,
    itemOverrides?: Array<{ sourceItemKey: string; unitPrice: number; imageUrl?: string | null }>
  ) {
    const detail = await babyeyiClient.getCircular(circularId);
    const district = detail.district ?? detail.schoolDistrict ?? null;
    const schoolName = detail.schoolName ?? 'School';

    await tenantService.createTenant({
      organizationId: detail.organizationId,
      organizationName: schoolName,
      organizationCode: detail.schoolCode ?? undefined,
    });
    if (district) {
      await prisma.tenant.update({
        where: { organizationId: detail.organizationId },
        data: { district },
      });
    }

    const sellable = extractSellableItems(detail);
    if (sellable.length === 0) {
      throw new AppError(400, explainNoSellableItems(detail));
    }

    const overrideMap = new Map((itemOverrides ?? []).map((o) => [o.sourceItemKey, o] as const));
    const items = sellable.map((i) => {
      const o = overrideMap.get(i.sourceItemKey);
      const unitPrice =
        o && Number.isFinite(Number(o.unitPrice)) && Number(o.unitPrice) >= 0
          ? Number(o.unitPrice)
          : i.unitPrice;
      return {
        title: i.title,
        description: i.description,
        quantity: i.quantity,
        unitPrice,
        imageUrl: o?.imageUrl ? String(o.imageUrl) : null,
        sourceItemKey: i.sourceItemKey,
      };
    });

    if (items.some((i) => i.unitPrice <= 0)) {
      throw new AppError(
        400,
        'Set a unit price greater than 0 for every Other Requirement before importing.'
      );
    }

    const totalAmount = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const name = `${schoolName} · ${detail.className} · ${detail.term} ${detail.academicYear}`;

    const existing = await prisma.standardKit.findUnique({ where: { babyeyiCircularId: circularId } });
    if (existing) {
      await prisma.standardKitItem.deleteMany({ where: { standardKitId: existing.id } });
      return prisma.standardKit.update({
        where: { id: existing.id },
        data: {
          organizationId: detail.organizationId,
          organizationName: schoolName,
          district,
          academicYear: detail.academicYear,
          term: detail.term,
          className: detail.className,
          educationLevel: detail.educationLevel ?? null,
          name,
          totalAmount,
          status: 'ACTIVE',
          items: { create: items },
        },
        include: { items: true },
      });
    }

    return prisma.standardKit.create({
      data: {
        organizationId: detail.organizationId,
        organizationName: schoolName,
        district,
        academicYear: detail.academicYear,
        term: detail.term,
        className: detail.className,
        educationLevel: detail.educationLevel ?? null,
        name,
        babyeyiCircularId: circularId,
        totalAmount,
        status: 'ACTIVE',
        items: { create: items },
      },
      include: { items: true },
    });
  }

  async previewCircular(circularId: string) {
    const detail = await babyeyiClient.getCircular(circularId);
    const sellable = extractSellableItems(detail);
    const channels = summarizeRequirementChannels(detail);
    const existing = await prisma.standardKit.findUnique({
      where: { babyeyiCircularId: circularId },
      include: { items: true },
    });
    const existingByKey = new Map(
      (existing?.items ?? [])
        .filter((i) => i.sourceItemKey)
        .map((i) => [i.sourceItemKey!, i] as const)
    );

    const sellableItems = sellable.map((i) => {
      const prev = existingByKey.get(i.sourceItemKey);
      return {
        ...i,
        unitPrice: prev ? Number(prev.unitPrice) : i.unitPrice,
        imageUrl: prev?.imageUrl ?? null,
        paymentType: 'other' as const,
      };
    });

    return {
      circular: {
        id: detail.id,
        organizationId: detail.organizationId,
        schoolName: detail.schoolName,
        district: detail.district ?? detail.schoolDistrict,
        academicYear: detail.academicYear,
        term: detail.term,
        className: detail.className,
        status: detail.status,
      },
      totalRequirementLines: channels.total,
      sellableCount: sellableItems.length,
      importedToShuleKit: sellableItems.length,
      schoolPayChannelCount: channels.schoolChannel,
      otherRequirementCount: channels.otherRequirementChannel,
      skippedSchoolPayChannel: channels.schoolChannel,
      skippedBabyeyiPayChannel: channels.schoolChannel,
      skippedUntitled: channels.untitled,
      canImport: sellableItems.length > 0,
      importBlockReason: sellableItems.length === 0 ? explainNoSellableItems(detail) : null,
      alreadyImported: Boolean(existing),
      existingKitId: existing?.id ?? null,
      sellableItems,
      kitTotalPreview: sellableItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
      summary: {
        academicYear: detail.academicYear,
        term: detail.term,
        className: detail.className,
        totalRequirements: channels.total,
        importedToShuleKit: sellableItems.length,
        paidToSchoolAccount: channels.schoolChannel,
      },
    };
  }
}

export const platformCatalogService = new PlatformCatalogService();
