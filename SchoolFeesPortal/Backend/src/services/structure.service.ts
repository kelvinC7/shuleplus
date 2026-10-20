import { BillStatus, FeeItemSource, FeeStructureStatus, Prisma } from '../generated/prisma';
import { fetchBabyeyiSchoolAccountItems, fetchBabyeyiClasses } from '../clients/babyeyi.client';
import { fetchIamAcademicSettings } from '../clients/iam.client';
import { fetchOrganizationClasses, studentManagementClient } from '../clients/student-management.client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { seedService } from './seed.service';

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

function normalizeTerm(value: string): string {
  const raw = value.toLowerCase().replace(/\s+/g, '');
  if (raw.includes('3') || raw.includes('iii')) return 'term3';
  if (raw.includes('2') || raw.includes('ii')) return 'term2';
  return 'term1';
}

function normalizeYear(value: string): string {
  return value.replace(/\//g, '-').replace(/\s+/g, '').toLowerCase();
}

function classFamily(name: string) {
  const compact = name.trim().toLowerCase().replace(/\s+/g, '');
  const match = compact.match(/^([a-z]+\d+)[a-z]?$/);
  return match ? match[1] : compact;
}

function classMatches(structureClass: string | null | undefined, studentClass: string) {
  const a = (structureClass ?? '').trim();
  const b = studentClass.trim();
  if (!a) return true;
  if (!b) return false;
  if (a.toLowerCase() === b.toLowerCase()) return true;
  if (classFamily(a) === classFamily(b)) return true;
  return b.toLowerCase().startsWith(`${a.toLowerCase()} `) || a.toLowerCase().startsWith(`${b.toLowerCase()} `);
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

type StructureItemInput = {
  categoryId: string;
  name: string;
  amount: number;
  itemType?: string;
  source?: string;
  paymentType?: string;
  externalKey?: string;
};

function computeSource(items: { source: FeeItemSource }[]): 'SCHOOL' | 'BABYEYI' | 'MIXED' {
  if (items.length === 0) return 'SCHOOL';
  const hasSchool = items.some((i) => i.source === FeeItemSource.SCHOOL);
  const hasBabyeyi = items.some((i) => i.source === FeeItemSource.BABYEYI);
  if (hasSchool && hasBabyeyi) return 'MIXED';
  if (hasBabyeyi) return 'BABYEYI';
  return 'SCHOOL';
}

function mapStructure(row: {
  id: string;
  name: string;
  code: string;
  academicYear: string;
  term: string;
  className: string | null;
  schoolLevel: string | null;
  status: FeeStructureStatus;
  totalAmount: Prisma.Decimal;
  version: number;
  updatedAt: Date;
  items: Array<{
    id: string;
    name: string;
    amount: Prisma.Decimal;
    itemType: string;
    source: FeeItemSource;
    paymentType: string;
    externalKey: string | null;
    category: { id: string; name: string; code: string };
  }>;
}) {
  const items = row.items.map((i) => ({
    ...i,
    amount: num(i.amount),
  }));
  return {
    ...row,
    totalAmount: num(row.totalAmount),
    itemCount: items.length,
    source: computeSource(items),
    items,
  };
}

async function ensureCategories(organizationId: string) {
  await seedService.ensureFeeCategories(organizationId);
}

async function defaultCategoryId(organizationId: string) {
  const cat = await prisma.feeCategory.findFirst({
    where: { organizationId, code: 'OTHER' },
  });
  if (cat) return cat.id;
  const any = await prisma.feeCategory.findFirst({ where: { organizationId } });
  if (!any) throw new AppError(400, 'No fee categories configured');
  return any.id;
}

function assertNoDuplicateItems(items: StructureItemInput[]) {
  const seen = new Set<string>();
  for (const item of items) {
    const key = normalizeName(item.name);
    if (seen.has(key)) {
      throw new AppError(400, `Duplicate fee item "${item.name}" in this structure`);
    }
    seen.add(key);
  }
}

export class StructureService {
  async getAcademicContext(organizationId: string) {
    const [settings, babyeyiClasses, smClasses, structureRows] = await Promise.all([
      fetchIamAcademicSettings(organizationId),
      fetchBabyeyiClasses(organizationId),
      fetchOrganizationClasses(organizationId),
      prisma.feeStructure.findMany({
        where: { organizationId },
        select: { className: true },
        distinct: ['className'],
      }),
    ]);

    const academicYears = settings?.academicYears?.length
      ? settings.academicYears
      : ['2026-2027', '2025-2026'];
    const terms = settings?.terms?.length ? settings.terms : ['Term 1', 'Term 2', 'Term 3'];

    const classMap = new Map<string, { id: string; name: string; label: string }>();
    for (const c of babyeyiClasses) classMap.set(c.name.toLowerCase(), c);
    for (const c of smClasses) {
      const label = c.label ?? c.name;
      classMap.set(label.toLowerCase(), { id: c.id, name: c.name, label });
    }
    for (const row of structureRows) {
      const name = row.className?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!classMap.has(key)) classMap.set(key, { id: name, name, label: name });
    }

    return {
      academicYears,
      terms,
      currentAcademicYear: settings?.currentAcademicYear ?? academicYears[0] ?? null,
      currentTerm: settings?.currentTerm ?? terms[0] ?? null,
      classes: [...classMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
      classSource: 'student_management_babyeyi_and_structures' as const,
    };
  }

  async getBabyeyiItems(
    organizationId: string,
    query: { academicYear: string; term: string; className?: string }
  ) {
    return fetchBabyeyiSchoolAccountItems({
      organizationId,
      academicYear: query.academicYear,
      term: query.term,
      className: query.className,
    });
  }

  async getSummary(organizationId: string) {
    await ensureCategories(organizationId);
    const rows = await prisma.feeStructure.findMany({
      where: { organizationId },
      include: { items: true },
    });
    const active = rows.filter((r) => r.status === FeeStructureStatus.ACTIVE).length;
    const classes = new Set(rows.map((r) => r.className).filter(Boolean)).size;
    const years = new Set(rows.map((r) => r.academicYear)).size;
    const totalItems = rows.reduce((s, r) => s + r.items.length, 0);
    return { activeStructures: active, academicYears: years, classesCovered: classes, totalFeeItems: totalItems };
  }

  async list(organizationId: string, query: Record<string, string | undefined>) {
    await ensureCategories(organizationId);

    const where: Prisma.FeeStructureWhereInput = { organizationId };

    if (query.academicYear?.trim()) {
      where.academicYear = { contains: query.academicYear.trim(), mode: 'insensitive' };
    }
    if (query.term?.trim()) {
      where.term = { contains: query.term.trim(), mode: 'insensitive' };
    }
    if (query.className?.trim() && query.className !== 'all') {
      where.className = { contains: query.className.trim(), mode: 'insensitive' };
    }
    if (query.status?.trim() && query.status !== 'all') {
      where.status = query.status.trim().toUpperCase() as FeeStructureStatus;
    }
    if (query.search?.trim()) {
      where.OR = [
        { name: { contains: query.search.trim(), mode: 'insensitive' } },
        { code: { contains: query.search.trim(), mode: 'insensitive' } },
        { className: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    const rows = await prisma.feeStructure.findMany({
      where,
      include: { items: { include: { category: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    let mapped = rows.map(mapStructure);

    if (query.source?.trim() && query.source !== 'all') {
      const src = query.source.toUpperCase();
      mapped = mapped.filter((r) => r.source === src);
    }

    return mapped;
  }

  async getById(organizationId: string, id: string) {
    const row = await prisma.feeStructure.findFirst({
      where: { id, organizationId },
      include: { items: { include: { category: true }, orderBy: { sortOrder: 'asc' } } },
    });
    if (!row) throw new AppError(404, 'Fee structure not found');

    const bills = await prisma.studentBill.findMany({
      where: { organizationId, structureId: id },
      select: { id: true, netAmount: true, paidAmount: true, balance: true, studentId: true },
    });

    const totalPaid = bills.reduce((s, b) => s + num(b.paidAmount), 0);
    const outstanding = bills.reduce((s, b) => s + num(b.balance), 0);
    const students = new Set(bills.map((b) => b.studentId)).size;

    return {
      ...mapStructure(row),
      stats: {
        students,
        totalPaid,
        outstanding,
        bills: bills.length,
      },
    };
  }

  async create(organizationId: string, body: Record<string, unknown>) {
    await ensureCategories(organizationId);
    const items = (body.items as StructureItemInput[]) ?? [];
    assertNoDuplicateItems(items);

    const fallbackCategory = await defaultCategoryId(organizationId);
    const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);

    const created = await prisma.feeStructure.create({
      data: {
        organizationId,
        name: String(body.name),
        code: String(body.code ?? `FS-${Date.now()}`),
        academicYear: String(body.academicYear),
        term: String(body.term),
        schoolCategory: body.schoolCategory ? String(body.schoolCategory) : null,
        schoolLevel: body.schoolLevel ? String(body.schoolLevel) : null,
        className: body.className ? String(body.className) : null,
        status: (body.status as FeeStructureStatus) ?? FeeStructureStatus.ACTIVE,
        totalAmount: total,
        notes: body.notes ? String(body.notes) : null,
        items: {
          create: items.map((i, idx) => ({
            categoryId: i.categoryId || fallbackCategory,
            name: i.name.trim(),
            amount: Number(i.amount),
            itemType: (i.itemType as 'MANDATORY' | 'OPTIONAL') ?? 'MANDATORY',
            source:
              i.source?.toUpperCase() === 'BABYEYI' ? FeeItemSource.BABYEYI : FeeItemSource.SCHOOL,
            paymentType: i.paymentType ?? 'SCHOOL_ACCOUNT',
            externalKey: i.externalKey ?? null,
            sortOrder: idx + 1,
          })),
        },
      },
      include: { items: { include: { category: true } } },
    });

    return mapStructure(created);
  }

  async update(organizationId: string, id: string, body: Record<string, unknown>) {
    const existing = await prisma.feeStructure.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Fee structure not found');

    const items = body.items as StructureItemInput[] | undefined;
    if (items) assertNoDuplicateItems(items);

    const total = items ? items.reduce((s, i) => s + Number(i.amount || 0), 0) : undefined;
    const fallbackCategory = await defaultCategoryId(organizationId);

    await prisma.$transaction(async (tx) => {
      if (items) {
        await tx.feeStructureItem.deleteMany({ where: { structureId: id } });
        await tx.feeStructureItem.createMany({
          data: items.map((i, idx) => ({
            structureId: id,
            categoryId: i.categoryId || fallbackCategory,
            name: i.name.trim(),
            amount: Number(i.amount),
            itemType: (i.itemType as 'MANDATORY' | 'OPTIONAL') ?? 'MANDATORY',
            source:
              i.source?.toUpperCase() === 'BABYEYI' ? FeeItemSource.BABYEYI : FeeItemSource.SCHOOL,
            paymentType: i.paymentType ?? 'SCHOOL_ACCOUNT',
            externalKey: i.externalKey ?? null,
            sortOrder: idx + 1,
          })),
        });
      }

      await tx.feeStructure.update({
        where: { id },
        data: {
          name: body.name != null ? String(body.name) : undefined,
          academicYear: body.academicYear != null ? String(body.academicYear) : undefined,
          term: body.term != null ? String(body.term) : undefined,
          className: body.className != null ? String(body.className) : undefined,
          status:
            body.status != null
              ? (String(body.status).toUpperCase() as FeeStructureStatus)
              : undefined,
          totalAmount: total,
          notes: body.notes != null ? String(body.notes) : undefined,
        },
      });
    });

    return this.getById(organizationId, id);
  }

  async remove(organizationId: string, id: string) {
    const existing = await prisma.feeStructure.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Fee structure not found');

    const used = await prisma.studentBill.count({
      where: { organizationId, structureId: id, paidAmount: { gt: 0 } },
    });
    if (used > 0) {
      throw new AppError(
        400,
        'Cannot delete: this structure has student payments recorded. Deactivate it instead.'
      );
    }

    await prisma.feeStructure.delete({ where: { id } });
    return { deleted: true };
  }

  async duplicate(
    organizationId: string,
    id: string,
    body: {
      academicYear: string;
      term?: string;
      className?: string;
      name?: string;
      copyItems?: boolean;
      refetchBabyeyi?: boolean;
    }
  ) {
    const src = await prisma.feeStructure.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
    if (!src) throw new AppError(404, 'Fee structure not found');

    let items: StructureItemInput[] = src.items.map((i) => ({
      categoryId: i.categoryId,
      name: i.name,
      amount: num(i.amount),
      itemType: i.itemType,
      source: i.source,
      paymentType: i.paymentType,
      externalKey: i.externalKey ?? undefined,
    }));

    if (body.refetchBabyeyi) {
      const babyeyi = await fetchBabyeyiSchoolAccountItems({
        organizationId,
        academicYear: body.academicYear,
        term: body.term ?? src.term,
        className: body.className ?? src.className ?? undefined,
      });
      const fallbackCategory = await defaultCategoryId(organizationId);
      const existingNames = new Set(items.map((i) => normalizeName(i.name)));
      for (const b of babyeyi.items) {
        if (existingNames.has(normalizeName(b.name))) continue;
        items.push({
          categoryId: fallbackCategory,
          name: b.name,
          amount: b.amount,
          itemType: 'MANDATORY',
          source: 'BABYEYI',
          paymentType: 'SCHOOL_ACCOUNT',
          externalKey: b.id,
        });
      }
    }

    if (body.copyItems === false) items = [];

    return this.create(organizationId, {
      name: body.name ?? `${src.name} (${body.academicYear})`,
      code: `${src.code}-${body.academicYear.replace(/[^0-9]/g, '')}`,
      academicYear: body.academicYear,
      term: body.term ?? src.term,
      className: body.className ?? src.className,
      schoolLevel: src.schoolLevel,
      status: FeeStructureStatus.DRAFT,
      items,
    });
  }

  async resolveStudentFees(params: {
    organizationId: string;
    academicYear: string;
    term: string;
    className?: string;
    studentCode?: string;
    studentId?: string;
    studentName?: string;
    autoBill?: boolean;
  }) {
    await ensureCategories(params.organizationId);

    const structures = await prisma.feeStructure.findMany({
      where: {
        organizationId: params.organizationId,
        status: FeeStructureStatus.ACTIVE,
      },
      include: { items: { include: { category: true }, orderBy: { sortOrder: 'asc' } } },
    });

    const yearKey = normalizeYear(params.academicYear);
    const termKey = normalizeTerm(params.term);
    const classKey = (params.className ?? '').trim();

    const match = structures
      .filter((s) => {
        if (normalizeYear(s.academicYear) !== yearKey) return false;
        if (normalizeTerm(s.term) !== termKey) return false;
        if (!classKey) return true;
        return classMatches(s.className, classKey);
      })
      .sort((a, b) => {
        const target = classKey.toLowerCase();
        const aExact = (a.className ?? '').trim().toLowerCase() === target ? 1 : 0;
        const bExact = (b.className ?? '').trim().toLowerCase() === target ? 1 : 0;
        if (bExact !== aExact) return bExact - aExact;
        return b.version - a.version;
      })[0];

    if (!match) {
      return { found: false as const, fees: [], total: 0, paid: 0, remaining: 0, billId: null };
    }

    const code = params.studentCode?.trim() ?? '';
    let resolvedStudentId = params.studentId ?? code;
    let resolvedStudentName = params.studentName?.trim() ?? '';
    let resolvedClassName = params.className ?? match.className ?? '—';

    if (code) {
      const sm = await studentManagementClient.lookupStudentByCode(params.organizationId, code);
      if (sm) {
        resolvedStudentId = sm.id;
        resolvedStudentName = sm.fullName;
        resolvedClassName = sm.className ?? resolvedClassName;
      }
    }
    if (!resolvedStudentName) resolvedStudentName = code || 'Unknown Student';

    let bill =
      code && params.autoBill !== false
        ? await this.ensureStudentBill({
            organizationId: params.organizationId,
            structure: match,
            studentId: resolvedStudentId,
            studentCode: code,
            studentName: resolvedStudentName,
            className: resolvedClassName,
            academicYear: params.academicYear,
            term: params.term,
          })
        : null;

    if (!bill && params.studentCode?.trim()) {
      bill = await prisma.studentBill.findFirst({
        where: {
          organizationId: params.organizationId,
          studentCode: params.studentCode.trim(),
          structureId: match.id,
          status: { not: BillStatus.CANCELLED },
        },
        include: { lineItems: true },
      });
    }

    const fees = (bill?.lineItems?.length
      ? bill.lineItems.map((li) => ({
          id: li.id,
          name: li.description,
          amount: num(li.amount),
          required: true,
          source: 'SCHOOL' as const,
        }))
      : match.items.map((i) => ({
          id: i.id,
          name: i.name,
          amount: num(i.amount),
          required: i.itemType === 'MANDATORY',
          source: i.source,
        }))) as Array<{
      id: string;
      name: string;
      amount: number;
      required: boolean;
      source: string;
    }>;

    const total = bill ? num(bill.netAmount) : fees.reduce((s, f) => s + f.amount, 0);
    const paid = bill ? num(bill.paidAmount) : 0;

    return {
      found: true as const,
      structureId: match.id,
      structureName: match.name,
      academicYear: match.academicYear,
      term: match.term,
      className: match.className,
      billId: bill?.id ?? null,
      billNumber: bill?.billNumber ?? null,
      fees,
      total,
      paid,
      remaining: Math.max(0, total - paid),
    };
  }

  private async ensureStudentBill(input: {
    organizationId: string;
    structure: {
      id: string;
      items: Array<{ name: string; amount: Prisma.Decimal; category: { name: string } }>;
    };
    studentId: string;
    studentCode: string;
    studentName: string;
    className: string;
    academicYear: string;
    term: string;
  }) {
    const existing = await prisma.studentBill.findFirst({
      where: {
        organizationId: input.organizationId,
        studentCode: input.studentCode,
        structureId: input.structure.id,
        academicYear: input.academicYear,
        term: input.term,
        status: { not: BillStatus.CANCELLED },
      },
      include: { lineItems: true },
    });
    if (existing) return existing;

    const gross = input.structure.items.reduce((s, i) => s + num(i.amount), 0);
    const count = await prisma.studentBill.count({ where: { organizationId: input.organizationId } });

    return prisma.studentBill.create({
      data: {
        organizationId: input.organizationId,
        billNumber: `BILL-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
        studentId: input.studentId,
        studentCode: input.studentCode,
        studentName: input.studentName,
        className: input.className,
        academicYear: input.academicYear,
        term: input.term,
        structureId: input.structure.id,
        status: BillStatus.PENDING,
        grossAmount: gross,
        discountAmount: 0,
        scholarshipAmount: 0,
        netAmount: gross,
        paidAmount: 0,
        balance: gross,
        lineItems: {
          create: input.structure.items.map((i) => ({
            category: i.category.name,
            description: i.name,
            amount: num(i.amount),
          })),
        },
      },
      include: { lineItems: true },
    });
  }

  exportStructuresCsv(rows: Awaited<ReturnType<StructureService['list']>>) {
    const header = [
      'Structure',
      'Code',
      'Academic Year',
      'Term',
      'Class',
      'Items',
      'Total (RWF)',
      'Source',
      'Status',
      'Updated',
    ];
    const lines = rows.map((r) =>
      [
        r.name,
        r.code,
        r.academicYear,
        r.term,
        r.className ?? '',
        r.itemCount ?? r.items.length,
        r.totalAmount,
        r.source,
        r.status,
        r.updatedAt ? new Date(r.updatedAt).toISOString() : '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    return [header.join(','), ...lines].join('\n');
  }
}

export const structureService = new StructureService();
