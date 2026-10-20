import { ContractType, DepartmentStatus, EmployeeStatus, Gender, Prisma } from '../generated/prisma';
import fs from 'node:fs';
import { prisma } from '../config/database';
import { resolveStoredFilePath } from '../config/upload';
import {
  contractStatus,
  daysLeft,
  DEFAULT_CATEGORIES,
  DEFAULT_DEPARTMENTS,
  STATUTORY_LEAVE_POLICY_DEFAULTS,
  yearsOfService,
} from '../constants/hr.constants';
import {
  allocateHrEmployeeNumber,
  isModernStaffId,
  normalizeStaffIdInput,
} from '../utils/staff-id';
import { resolveStaffPhotoUrl } from '../utils/photo-url';
import { isProtectedEmployee } from '../constants/sample-employees';
import { AppError } from '../middleware/error.middleware';
import { pushEmployeeToPayroll } from './employee-sync-push';

function employeeWhere(orgId: string): Prisma.EmployeeWhereInput {
  return { organizationId: orgId, deletedAt: null };
}

function mapEmployee(e: Awaited<ReturnType<typeof prisma.employee.findFirst>> & object) {
  const emp = e as NonNullable<typeof e> & {
    department?: { name: string } | null;
    category?: { name: string } | null;
    qualifications?: unknown[];
    documents?: unknown[];
  };
  return {
    id: emp.id,
    employeeNumber: emp.employeeNumber,
    firstName: emp.firstName,
    middleName: emp.middleName,
    lastName: emp.lastName,
    fullName: [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' '),
    gender: emp.gender,
    dateOfBirth: emp.dateOfBirth,
    email: emp.email,
    phone: emp.phone,
    address: emp.address,
    nationalId: emp.nationalId,
    rfidUid: emp.rfidUid ?? null,
    fingerprintId: emp.fingerprintId ?? null,
    photoUrl: emp.photoUrl,
    departmentId: emp.departmentId,
    department: emp.department?.name ?? null,
    categoryId: emp.categoryId,
    category: emp.category?.name ?? null,
    position: emp.position,
    contractType: emp.contractType,
    status: emp.status,
    hireDate: emp.hireDate,
    contractEnd: emp.contractEnd,
    ongoingContract: emp.ongoingContract,
    basicSalary: emp.basicSalary ? Number(emp.basicSalary) : null,
    netSalary: emp.netSalary ? Number(emp.netSalary) : null,
    isProtected: emp.isProtected ?? isProtectedEmployee(emp),
    payrollStaffId: emp.payrollStaffId ?? null,
    yearsOfService: yearsOfService(emp.hireDate),
    contractStatus: contractStatus(emp.contractEnd, emp.ongoingContract),
    daysLeft: daysLeft(emp.contractEnd, emp.ongoingContract),
    hrProfile: emp.hrProfile,
    qualifications: emp.qualifications ?? [],
    documents: ((emp.documents ?? []) as Array<{
      id: string;
      category: string;
      filename: string;
      mimeType: string | null;
      verified: boolean;
      filePath: string | null;
      createdAt: Date;
    }>).map((d) => ({
      id: d.id,
      category: d.category,
      filename: d.filename,
      mimeType: d.mimeType,
      verified: d.verified,
      hasFile: Boolean(d.filePath),
      createdAt: d.createdAt,
    })),
    createdAt: emp.createdAt,
    updatedAt: emp.updatedAt,
  };
}

export class DashboardService {
  async summary(orgId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { organizationId: orgId } });
    if (!tenant) throw new AppError(404, 'Tenant not found');

    const employees = await prisma.employee.findMany({
      where: employeeWhere(orgId),
      include: { department: true },
    });

    const total = employees.length;
    const active = employees.filter((e) => e.status === 'ACTIVE').length;
    const teachers = employees.filter((e) =>
      /teacher|instructor|lecturer/i.test(e.position)
    ).length;
    const onLeave = employees.filter((e) => e.status === 'ON_LEAVE').length;

    const deptMap = new Map<string, number>();
    for (const e of employees) {
      const name = e.department?.name ?? 'Unassigned';
      deptMap.set(name, (deptMap.get(name) ?? 0) + 1);
    }

    const genderMap = { MALE: 0, FEMALE: 0, OTHER: 0 };
    for (const e of employees) genderMap[e.gender]++;

    const growthTrend = this.buildGrowthTrend(employees);
    const expiringContracts = employees.filter(
      (e) => contractStatus(e.contractEnd, e.ongoingContract) === 'Expiring'
    ).length;
    const missingDocs = await this.countMissingDocs(orgId);
    const activeRate = total ? Math.round((active / total) * 100) : 0;

    return {
      organizationId: orgId,
      organizationName: tenant.organizationName,
      status: tenant.status,
      kpis: {
        totalEmployees: total,
        activeEmployees: active,
        activeRate: total ? Math.round((active / total) * 100) : 0,
        teachers,
        teacherRate: total ? Math.round((teachers / total) * 100) : 0,
        onLeave,
        onLeaveRate: total ? Math.round((onLeave / total) * 100) : 0,
        attendanceRateToday: activeRate,
        attendanceRateMonth: total
          ? Math.min(100, Math.round(activeRate * 0.97 + (active / Math.max(total, 1)) * 3))
          : 0,
      },
      departmentBreakdown: Array.from(deptMap.entries()).map(([name, count]) => ({
        name,
        count,
        percentage: total ? Math.round((count / total) * 100) : 0,
      })),
      genderDistribution: genderMap,
      growthTrend,
      alerts: {
        expiringContracts,
        missingDocuments: missingDocs,
        probationEnding: employees.filter((e) => e.status === 'PROBATION').length,
      },
    };
  }

  private buildGrowthTrend(employees: { hireDate: Date }[]) {
    const months: { month: string; hires: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en', { month: 'short', year: '2-digit' });
      const hires = employees.filter((e) => {
        const h = new Date(e.hireDate);
        return h.getFullYear() === d.getFullYear() && h.getMonth() === d.getMonth();
      }).length;
      months.push({ month: label, hires });
    }
    return months;
  }

  private async countMissingDocs(orgId: string) {
    const employees = await prisma.employee.findMany({
      where: employeeWhere(orgId),
      include: { documents: true },
    });
    let count = 0;
    for (const e of employees) {
      const cats = new Set(e.documents.map((d) => d.category));
      if (!cats.has('cv') || !cats.has('national_id_copy') || !cats.has('contract')) count++;
    }
    return count;
  }
}

function mapDepartmentStatus(value: unknown): DepartmentStatus {
  const raw = String(value ?? 'ACTIVE').toUpperCase();
  if (raw === 'INACTIVE') return DepartmentStatus.INACTIVE;
  if (raw === 'ARCHIVED') return DepartmentStatus.ARCHIVED;
  return DepartmentStatus.ACTIVE;
}

function buildAutoDepartmentCode(name: string, numericSuffix?: string) {
  const letter = name.trim()[0]?.toUpperCase() ?? '';
  if (!letter) return '';
  const suffix = numericSuffix ?? String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${letter}${suffix}`;
}

async function generateUniqueDepartmentCode(orgId: string, name: string): Promise<string> {
  const letter = name.trim()[0]?.toUpperCase() || 'D';
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const code = `${letter}${suffix}`;
    const exists = await prisma.department.findFirst({
      where: { organizationId: orgId, code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  return `${letter}${Date.now().toString().slice(-4)}`;
}

function buildAutoDepartmentCodeFromName(name: string) {
  return buildAutoDepartmentCode(name);
}

function buildDepartmentProfile(body: Record<string, unknown>) {
  const {
    name,
    code,
    headName,
    departmentHead,
    budget,
    annualBudget,
    status,
    departmentType,
    branch,
    parentDepartment,
    parentDepartmentId,
    ...rest
  } = body;

  return {
    departmentCategory: rest.departmentCategory ?? null,
    reportsTo: rest.reportsTo ?? null,
    departmentLevel: rest.departmentLevel ?? null,
    organizationalUnit: rest.organizationalUnit ?? null,
    assistantManager: rest.assistantManager ?? null,
    actingHead: rest.actingHead ?? null,
    departmentSecretary: rest.departmentSecretary ?? null,
    officialEmail: rest.officialEmail ?? null,
    phoneNumber: rest.phoneNumber ?? null,
    extension: rest.extension ?? null,
    whatsappNumber: rest.whatsappNumber ?? null,
    website: rest.website ?? null,
    building: rest.building ?? null,
    floor: rest.floor ?? null,
    officeNumber: rest.officeNumber ?? null,
    physicalAddress: rest.physicalAddress ?? null,
    costCenter: rest.costCenter ?? null,
    budgetCode: rest.budgetCode ?? null,
    currency: rest.currency ?? 'RWF',
    expenseCategory: rest.expenseCategory ?? null,
    maxEmployees: rest.maxEmployees ?? null,
    minEmployees: rest.minEmployees ?? null,
    workingSchedule: rest.workingSchedule ?? null,
    workingDays: rest.workingDays ?? [],
    startTime: rest.startTime ?? null,
    endTime: rest.endTime ?? null,
    accessModules: rest.accessModules ?? [],
    tags: rest.tags ?? [],
    description: rest.description ?? null,
    effectiveStartDate: rest.effectiveStartDate ?? null,
    effectiveEndDate: rest.effectiveEndDate ?? null,
    visibility: rest.visibility ?? 'EVERYONE',
    notifications: rest.notifications ?? {},
  };
}

type DepartmentWithRelations = Prisma.DepartmentGetPayload<{
  include: {
    parentDepartment: { select: { id: true; name: true } };
    employees: { select: { id: true; firstName: true; lastName: true; position: true; gender: true } };
  };
}>;

function mapDepartment(d: DepartmentWithRelations) {
  const profile = (d.departmentProfile ?? {}) as Record<string, unknown>;
  const maxEmployees = profile.maxEmployees ? Number(profile.maxEmployees) : null;
  const employees = d.employees.length;

  return {
    id: d.id,
    name: d.name,
    code: d.code,
    headName: d.headName,
    budget: d.budget ? Number(d.budget) : null,
    status: d.status,
    departmentType: d.departmentType,
    branch: d.branch,
    parentDepartmentId: d.parentDepartmentId,
    parentDepartment: d.parentDepartment?.name ?? null,
    employees,
    male: d.employees.filter((e) => e.gender === 'MALE').length,
    female: d.employees.filter((e) => e.gender === 'FEMALE').length,
    maxEmployees,
    openPositions: maxEmployees != null ? Math.max(maxEmployees - employees, 0) : null,
    capacityPercent: maxEmployees ? Math.min(Math.round((employees / maxEmployees) * 100), 100) : null,
    tags: Array.isArray(profile.tags) ? profile.tags : [],
    description: typeof profile.description === 'string' ? profile.description : null,
    officialEmail: typeof profile.officialEmail === 'string' ? profile.officialEmail : null,
    phoneNumber: typeof profile.phoneNumber === 'string' ? profile.phoneNumber : null,
    costCenter: typeof profile.costCenter === 'string' ? profile.costCenter : null,
    assistantManager: typeof profile.assistantManager === 'string' ? profile.assistantManager : null,
    accessModules: Array.isArray(profile.accessModules) ? profile.accessModules : [],
    departmentProfile: profile,
    employeePreview: d.employees.slice(0, 3).map((e) => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName}`,
      position: e.position,
    })),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export class DepartmentService {
  private include = {
    parentDepartment: { select: { id: true, name: true } },
    employees: {
      where: { deletedAt: null },
      select: { id: true, firstName: true, lastName: true, position: true, gender: true },
    },
  } as const;

  private async resolveParentId(orgId: string, parentName?: string | null) {
    if (!parentName || parentName === 'None (Top-Level)') return null;
    const parent = await prisma.department.findFirst({
      where: { organizationId: orgId, name: parentName },
      select: { id: true },
    });
    return parent?.id ?? null;
  }

  async list(orgId: string, filters: Record<string, string> = {}) {
    const where: Prisma.DepartmentWhereInput = { organizationId: orgId };

    if (filters.status && filters.status !== 'ALL') {
      where.status = mapDepartmentStatus(filters.status);
    }
    if (filters.branch && filters.branch !== 'ALL') where.branch = filters.branch;
    if (filters.departmentType && filters.departmentType !== 'ALL') {
      where.departmentType = filters.departmentType;
    }
    if (filters.manager && filters.manager !== 'ALL') {
      where.headName = { contains: filters.manager, mode: 'insensitive' };
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { headName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const sortBy = filters.sortBy ?? 'name';
    const orderBy: Prisma.DepartmentOrderByWithRelationInput =
      sortBy === 'createdAt'
        ? { createdAt: 'desc' }
        : sortBy === 'employees'
          ? { employees: { _count: 'desc' } }
          : { name: 'asc' };

    const departments = await prisma.department.findMany({
      where,
      include: this.include,
      orderBy,
    });

    return departments.map(mapDepartment);
  }

  async listForSync(orgId: string) {
    return prisma.department.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  }

  async stats(orgId: string) {
    const departments = await prisma.department.findMany({
      where: { organizationId: orgId },
      include: {
        employees: { where: { deletedAt: null }, select: { id: true } },
      },
    });

    const total = departments.length;
    const active = departments.filter((d) => d.status === DepartmentStatus.ACTIVE).length;
    const inactive = departments.filter((d) => d.status === DepartmentStatus.INACTIVE).length;
    const archived = departments.filter((d) => d.status === DepartmentStatus.ARCHIVED).length;
    const totalEmployees = departments.reduce((sum, d) => sum + d.employees.length, 0);
    const headsAssigned = departments.filter((d) => d.headName).length;
    const openPositions = departments.reduce((sum, d) => {
      const profile = (d.departmentProfile ?? {}) as Record<string, unknown>;
      const max = profile.maxEmployees ? Number(profile.maxEmployees) : 0;
      if (!max) return sum;
      return sum + Math.max(max - d.employees.length, 0);
    }, 0);

    return {
      totalDepartments: total,
      activeDepartments: active,
      inactiveDepartments: inactive + archived,
      totalEmployees,
      headsAssigned,
      openPositions,
    };
  }

  async getById(orgId: string, id: string) {
    const department = await prisma.department.findFirst({
      where: { id, organizationId: orgId },
      include: this.include,
    });
    if (!department) throw new AppError(404, 'Department not found');
    return mapDepartment(department);
  }

  async create(orgId: string, body: Record<string, unknown>) {
    if (!body.name) throw new AppError(400, 'Department name is required');

    const parentDepartmentId =
      (body.parentDepartmentId as string | undefined) ??
      (await this.resolveParentId(orgId, body.parentDepartment as string | undefined));

    const code =
      body.code != null && String(body.code).trim() !== ''
        ? String(body.code).trim().toUpperCase()
        : await generateUniqueDepartmentCode(orgId, String(body.name));

    const department = await prisma.department.create({
      data: {
        organizationId: orgId,
        name: String(body.name),
        code,
        headName: (body.departmentHead as string) || (body.headName as string) || null,
        budget:
          body.annualBudget != null && body.annualBudget !== ''
            ? Number(body.annualBudget)
            : body.budget != null
              ? Number(body.budget)
              : null,
        status: mapDepartmentStatus(body.status),
        departmentType: body.departmentType ? String(body.departmentType) : null,
        branch: body.branch ? String(body.branch) : null,
        parentDepartmentId,
        departmentProfile: buildDepartmentProfile(body),
      },
      include: this.include,
    });

    return mapDepartment(department);
  }

  async update(orgId: string, id: string, body: Record<string, unknown>) {
    const existing = await prisma.department.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new AppError(404, 'Department not found');

    const parentDepartmentId =
      body.parentDepartmentId !== undefined
        ? (body.parentDepartmentId as string | null)
        : body.parentDepartment !== undefined
          ? await this.resolveParentId(orgId, body.parentDepartment as string | undefined)
          : undefined;

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name) } : {}),
        ...(body.code !== undefined ? { code: body.code ? String(body.code) : null } : {}),
        ...(body.departmentHead !== undefined || body.headName !== undefined
          ? { headName: (body.departmentHead as string) || (body.headName as string) || null }
          : {}),
        ...(body.annualBudget !== undefined || body.budget !== undefined
          ? {
              budget:
                body.annualBudget != null && body.annualBudget !== ''
                  ? Number(body.annualBudget)
                  : body.budget != null
                    ? Number(body.budget)
                    : null,
            }
          : {}),
        ...(body.status !== undefined ? { status: mapDepartmentStatus(body.status) } : {}),
        ...(body.departmentType !== undefined
          ? { departmentType: body.departmentType ? String(body.departmentType) : null }
          : {}),
        ...(body.branch !== undefined ? { branch: body.branch ? String(body.branch) : null } : {}),
        ...(parentDepartmentId !== undefined ? { parentDepartmentId } : {}),
        departmentProfile: {
          ...((existing.departmentProfile as Record<string, unknown>) ?? {}),
          ...buildDepartmentProfile({ ...(existing.departmentProfile as object), ...body }),
        },
      },
      include: this.include,
    });

    return mapDepartment(department);
  }

  async bulkUpdateStatus(orgId: string, ids: string[], status: string) {
    const mapped = mapDepartmentStatus(status);
    const result = await prisma.department.updateMany({
      where: { organizationId: orgId, id: { in: ids } },
      data: { status: mapped },
    });
    return { updated: result.count };
  }

  async duplicate(orgId: string, id: string) {
    const source = await this.getById(orgId, id);
    const copy = await this.create(orgId, {
      ...source.departmentProfile,
      name: `${source.name} (Copy)`,
      code: source.code ? `${source.code}-COPY` : null,
      departmentHead: source.headName,
      annualBudget: source.budget,
      status: 'ACTIVE',
      departmentType: source.departmentType,
      branch: source.branch,
      parentDepartment: source.parentDepartment,
      tags: source.tags,
      description: source.description,
    });
    return copy;
  }

  async delete(orgId: string, id: string) {
    const dept = await prisma.department.findFirst({ where: { id, organizationId: orgId } });
    if (!dept) throw new AppError(404, 'Department not found');
    const employeeCount = await prisma.employee.count({
      where: { organizationId: orgId, departmentId: id, deletedAt: null },
    });
    if (employeeCount > 0) {
      throw new AppError(400, 'Cannot delete a department that still has employees assigned');
    }
    await prisma.department.delete({ where: { id } });
    return { success: true };
  }

  async seedDefaults(orgId: string) {
    const existing = await prisma.department.count({ where: { organizationId: orgId } });
    if (existing > 0) return this.list(orgId);

    await prisma.department.createMany({
      data: DEFAULT_DEPARTMENTS.map((d) => ({
        ...d,
        organizationId: orgId,
        code: buildAutoDepartmentCodeFromName(d.name),
        status: DepartmentStatus.ACTIVE,
      })),
    });
    return this.list(orgId);
  }
}

export class CategoryService {
  async list(orgId: string) {
    const categories = await prisma.employmentCategory.findMany({
      where: { organizationId: orgId },
      include: { employees: { where: { deletedAt: null } } },
      orderBy: { name: 'asc' },
    });

    const totalStaff = categories.reduce((s, c) => s + c.employees.length, 0);

    return {
      totalStaff,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        employeeCount: c.employees.length,
        percentage: totalStaff ? Math.round((c.employees.length / totalStaff) * 100) : 0,
      })),
    };
  }

  async create(orgId: string, data: { name: string; description?: string }) {
    return prisma.employmentCategory.create({
      data: { organizationId: orgId, ...data },
    });
  }

  async update(orgId: string, id: string, data: { name?: string; description?: string }) {
    const cat = await prisma.employmentCategory.findFirst({ where: { id, organizationId: orgId } });
    if (!cat) throw new AppError(404, 'Category not found');
    return prisma.employmentCategory.update({ where: { id }, data });
  }

  async delete(orgId: string, id: string) {
    const cat = await prisma.employmentCategory.findFirst({ where: { id, organizationId: orgId } });
    if (!cat) throw new AppError(404, 'Category not found');
    await prisma.employmentCategory.delete({ where: { id } });
    return { success: true };
  }

  async seedDefaults(orgId: string) {
    const existing = await prisma.employmentCategory.count({ where: { organizationId: orgId } });
    if (existing > 0) return this.list(orgId);

    await prisma.employmentCategory.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, organizationId: orgId })),
    });
    return this.list(orgId);
  }
}

export class EmployeeService {
  async directory(orgId: string, filters: Record<string, string | undefined>) {
    const where: Prisma.EmployeeWhereInput = employeeWhere(orgId);

    if (filters.search) {
      const q = filters.search;
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { employeeNumber: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { position: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.status) where.status = filters.status as EmployeeStatus;
    if (filters.contractType) where.contractType = filters.contractType as ContractType;
    if (filters.year) {
      const y = parseInt(filters.year, 10);
      where.hireDate = {
        gte: new Date(y, 0, 1),
        lt: new Date(y + 1, 0, 1),
      };
    }
    if (filters.month) {
      const m = parseInt(filters.month, 10) - 1;
      const y = filters.year ? parseInt(filters.year, 10) : new Date().getFullYear();
      where.hireDate = { gte: new Date(y, m, 1), lt: new Date(y, m + 1, 1) };
    }

    const page = Math.max(1, parseInt(filters.page ?? '1', 10));
    const limit = Math.min(50, Math.max(10, parseInt(filters.limit ?? '10', 10)));
    const skip = (page - 1) * limit;

    const [items, total, allActive] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: {
          department: true,
          category: true,
          qualifications: true,
          documents: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where: employeeWhere(orgId),
        select: { status: true, position: true },
      }),
    ]);

    const totalAll = allActive.length;
    const activeCount = allActive.filter((e) => e.status === 'ACTIVE').length;
    const teachers = allActive.filter((e) => /teacher|instructor/i.test(e.position)).length;
    const support = allActive.filter((e) => /driver|security|cleaner|support/i.test(e.position)).length;
    const onLeave = allActive.filter((e) => e.status === 'ON_LEAVE').length;

    return {
      data: items.map(mapEmployee),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: {
        total: totalAll,
        active: activeCount,
        activeRate: totalAll ? Math.round((activeCount / totalAll) * 100) : 0,
        teachers,
        teacherRate: totalAll ? Math.round((teachers / totalAll) * 100) : 0,
        support,
        supportRate: totalAll ? Math.round((support / totalAll) * 100) : 0,
        onLeave,
        onLeaveRate: totalAll ? Math.round((onLeave / totalAll) * 100) : 0,
      },
    };
  }

  async listForPayrollSync(orgId: string) {
    const { buildHrEmployeeSyncPayload } = await import('../clients/payroll.client');
    const employees = await prisma.employee.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: { department: true },
    });
    return employees.map((emp) =>
      buildHrEmployeeSyncPayload({
        id: emp.id,
        payrollStaffId: emp.payrollStaffId,
        employeeNumber: emp.employeeNumber,
        firstName: emp.firstName,
        middleName: emp.middleName,
        lastName: emp.lastName,
        gender: emp.gender,
        dateOfBirth: emp.dateOfBirth,
        email: emp.email,
        phone: emp.phone,
        nationalId: emp.nationalId,
        department: emp.department?.name ?? null,
        position: emp.position,
        contractType: emp.contractType,
        status: emp.status,
        hireDate: emp.hireDate,
        basicSalary: emp.basicSalary ? Number(emp.basicSalary) : null,
        isProtected: emp.isProtected,
        hrProfile: emp.hrProfile,
      })
    );
  }

  async listTeachersForSync(orgId: string) {
    const employees = await prisma.employee.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        department: { select: { name: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return employees
      .filter((e) => /teacher|instructor|lecturer|head\s*of/i.test(e.position))
      .map((emp) => ({
        id: emp.id,
        fullName: [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' '),
        email: emp.email,
        phone: emp.phone,
        position: emp.position,
        department: emp.department?.name ?? null,
        employeeNumber: emp.employeeNumber,
        rfidUid: emp.rfidUid,
        fingerprintId: emp.fingerprintId,
      }));
  }

  async listStaffForSmartAccess(orgId: string, opts?: { search?: string }) {
    const where: Prisma.EmployeeWhereInput = {
      organizationId: orgId,
      deletedAt: null,
      status: 'ACTIVE',
    };
    if (opts?.search) {
      const q = opts.search.trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { employeeNumber: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const baseSelect = {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      email: true,
      phone: true,
      position: true,
      employeeNumber: true,
      photoUrl: true,
    } as const;

    type StaffRow = {
      id: string;
      firstName: string;
      middleName: string | null;
      lastName: string;
      email: string | null;
      phone: string;
      position: string;
      employeeNumber: string;
      photoUrl: string | null;
      rfidUid?: string | null;
      fingerprintId?: string | null;
      identityRemarks?: string | null;
    };

    let employees: StaffRow[];
    try {
      employees = await prisma.employee.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: {
          ...baseSelect,
          rfidUid: true,
          fingerprintId: true,
          identityRemarks: true,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/rfid_uid|fingerprint_id|identity_remarks|does not exist|Unknown field/i.test(message)) {
        throw err;
      }
      employees = await prisma.employee.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: baseSelect,
      });
    }

    return employees.map((emp) => ({
      id: emp.id,
      source: 'hr' as const,
      fullName: [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' '),
      firstName: emp.firstName,
      middleName: emp.middleName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone,
      position: emp.position,
      employeeNumber: emp.employeeNumber,
      photoUrl: resolveStaffPhotoUrl(emp.photoUrl),
      rfidUid: emp.rfidUid ?? null,
      fingerprintId: emp.fingerprintId ?? null,
      identityRemarks: emp.identityRemarks ?? null,
    }));
  }

  private normalizeRfidUid(uid: string | null | undefined): string | null {
    if (uid == null) return null;
    const trimmed = uid.trim();
    return trimmed ? trimmed.toUpperCase() : null;
  }

  async updateStaffIdentity(
    orgId: string,
    id: string,
    data: { rfidUid?: string | null; fingerprintId?: string | null; identityRemarks?: string | null }
  ) {
    const existing = await prisma.employee.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, 'Employee not found');

    const rfidUid = data.rfidUid !== undefined ? this.normalizeRfidUid(data.rfidUid) : undefined;
    if (rfidUid) {
      const duplicate = await prisma.employee.findFirst({
        where: { id: { not: id }, rfidUid, deletedAt: null },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          organizationId: true,
        },
      });
      if (duplicate) {
        const tenant = await prisma.tenant.findFirst({
          where: { organizationId: duplicate.organizationId, status: 'ACTIVE' },
          select: { organizationName: true, organizationCode: true },
        });
        const schoolName =
          tenant?.organizationName ?? tenant?.organizationCode ?? 'another school';
        const staffName = [duplicate.firstName, duplicate.lastName].filter(Boolean).join(' ').trim();
        throw new AppError(
          409,
          `Card ${rfidUid} is already assigned to ${staffName} (${duplicate.employeeNumber}) at ${schoolName}.`
        );
      }
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(rfidUid !== undefined ? { rfidUid } : {}),
        ...(data.fingerprintId !== undefined ? { fingerprintId: data.fingerprintId || null } : {}),
        ...(data.identityRemarks !== undefined ? { identityRemarks: data.identityRemarks || null } : {}),
      },
    });

    return {
      id: updated.id,
      rfidUid: updated.rfidUid,
      fingerprintId: updated.fingerprintId,
      identityRemarks: updated.identityRemarks,
    };
  }

  /** Cross-module RFID uniqueness: find staff who already holds this card. */
  async lookupRfidOwner(rfidUid: string) {
    const normalized = this.normalizeRfidUid(rfidUid);
    if (!normalized) return null;

    const emp = await prisma.employee.findFirst({
      where: { rfidUid: normalized, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        organizationId: true,
        rfidUid: true,
      },
    });
    if (!emp?.rfidUid) return null;

    const tenant = await prisma.tenant.findFirst({
      where: { organizationId: emp.organizationId, status: 'ACTIVE' },
      select: { organizationName: true, organizationCode: true },
    });

    return {
      kind: 'staff' as const,
      source: 'hr' as const,
      organizationId: emp.organizationId,
      organizationName: tenant?.organizationName ?? null,
      organizationCode: tenant?.organizationCode ?? null,
      id: emp.id,
      code: emp.employeeNumber,
      name: [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim(),
      rfidUid: emp.rfidUid,
    };
  }

  async getById(orgId: string, id: string) {
    const emp = await prisma.employee.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        department: true,
        category: true,
        qualifications: true,
        documents: true,
        leaveRequests: { orderBy: { appliedOn: 'desc' }, take: 20 },
      },
    });
    if (!emp) throw new AppError(404, 'Employee not found');
    return mapEmployee(emp);
  }

  async create(orgId: string, data: Record<string, unknown>) {
    const tenant = await prisma.tenant.findUnique({ where: { organizationId: orgId } });
    const position = String(data.position ?? 'Staff');
    const manualNumber = data.employeeNumber ? normalizeStaffIdInput(String(data.employeeNumber)) : '';
    const employeeNumber = manualNumber
      ? manualNumber
      : await allocateHrEmployeeNumber(orgId, position, tenant?.organizationCode);

    const emp = await prisma.employee.create({
      data: {
        organizationId: orgId,
        employeeNumber,
        firstName: String(data.firstName),
        middleName: data.middleName ? String(data.middleName) : null,
        lastName: String(data.lastName),
        gender: (data.gender as Gender) ?? 'OTHER',
        dateOfBirth: new Date(String(data.dateOfBirth)),
        email: data.email ? String(data.email) : null,
        phone: String(data.phone),
        address: data.address ? String(data.address) : null,
        nationalId: data.nationalId ? String(data.nationalId) : null,
        departmentId: data.departmentId ? String(data.departmentId) : null,
        categoryId: data.categoryId ? String(data.categoryId) : null,
        position: String(data.position),
        contractType: (data.contractType as ContractType) ?? 'PERMANENT',
        status: (data.status as EmployeeStatus) ?? 'ACTIVE',
        hireDate: new Date(String(data.hireDate)),
        contractEnd: data.contractEnd ? new Date(String(data.contractEnd)) : null,
        ongoingContract: Boolean(data.ongoingContract),
        basicSalary: data.basicSalary ? Number(data.basicSalary) : null,
        netSalary: data.netSalary ? Number(data.netSalary) : null,
        photoUrl: data.photoUrl ? String(data.photoUrl) : null,
        hrProfile: (data.hrProfile as Prisma.InputJsonValue) ?? {},
      },
      include: { department: true, category: true },
    });

    if (Array.isArray(data.qualifications)) {
      for (const q of data.qualifications as Record<string, unknown>[]) {
        await prisma.qualification.create({
          data: {
            organizationId: orgId,
            employeeId: emp.id,
            level: String(q.level),
            field: q.field ? String(q.field) : null,
            institution: q.institution ? String(q.institution) : null,
            year: q.year ? Number(q.year) : null,
            grade: q.grade ? String(q.grade) : null,
          },
        });
      }
    }

    const result = await this.getById(orgId, emp.id);
    void pushEmployeeToPayroll(orgId, emp.id).catch((err) =>
      console.warn('[HR] Payroll sync failed after create:', err)
    );
    return result;
  }

  /** IAM Users & Access → create/update a light HR staff row (full HR file can be completed later). */
  async upsertFromIam(
    orgId: string,
    data: {
      iamUserId?: string;
      firstName?: string;
      lastName?: string;
      email?: string | null;
      phone?: string | null;
      position?: string | null;
      department?: string | null;
      photoUrl?: string | null;
      employeeNumber?: string | null;
    }
  ) {
    const firstName = String(data.firstName ?? '').trim() || 'Staff';
    const lastName = String(data.lastName ?? '').trim() || 'Member';
    const email = data.email?.trim().toLowerCase() || null;
    const phone = (data.phone ?? '').trim() || '0000000000';
    const position = (data.position ?? '').trim() || 'Staff';
    const iamUserId = data.iamUserId?.trim() || null;

    let existing = email
      ? await prisma.employee.findFirst({
          where: { organizationId: orgId, deletedAt: null, email },
        })
      : null;

    if (!existing && iamUserId) {
      existing = await prisma.employee.findFirst({
        where: {
          organizationId: orgId,
          deletedAt: null,
          hrProfile: { path: ['iamUserId'], equals: iamUserId },
        },
      });
    }

    const prevProfile =
      existing?.hrProfile && typeof existing.hrProfile === 'object' && !Array.isArray(existing.hrProfile)
        ? (existing.hrProfile as Record<string, unknown>)
        : {};
    const hrProfile = {
      ...prevProfile,
      ...(iamUserId ? { iamUserId } : {}),
      sourcedFrom: 'iam-users-access',
      departmentHint: data.department ?? prevProfile.departmentHint ?? null,
    } as Prisma.InputJsonValue;

    if (existing) {
      const updated = await prisma.employee.update({
        where: { id: existing.id },
        data: {
          firstName,
          lastName,
          email: email ?? existing.email,
          phone: data.phone?.trim() ? phone : existing.phone,
          position,
          hrProfile,
          status: 'ACTIVE',
          ...(data.photoUrl?.trim() ? { photoUrl: data.photoUrl.trim() } : {}),
          ...(data.employeeNumber?.trim()
            ? { employeeNumber: normalizeStaffIdInput(data.employeeNumber) }
            : {}),
        },
      });
      return { id: updated.id, created: false };
    }

    const tenant = await prisma.tenant.findUnique({ where: { organizationId: orgId } });
    const fromIam = data.employeeNumber?.trim()
      ? normalizeStaffIdInput(data.employeeNumber)
      : '';
    const employeeNumber = fromIam
      ? fromIam
      : await allocateHrEmployeeNumber(orgId, position, tenant?.organizationCode);

    const created = await prisma.employee.create({
      data: {
        organizationId: orgId,
        employeeNumber,
        firstName,
        lastName,
        gender: 'OTHER',
        dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
        email,
        phone,
        position,
        contractType: 'PERMANENT',
        status: 'ACTIVE',
        hireDate: new Date(),
        ongoingContract: true,
        hrProfile,
        photoUrl: data.photoUrl?.trim() ? data.photoUrl.trim() : null,
      },
    });
    return { id: created.id, created: true };
  }

  async update(orgId: string, id: string, data: Record<string, unknown>) {
    const existing = await prisma.employee.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, 'Employee not found');

    const updateData: Prisma.EmployeeUpdateInput = {};
    const fields = [
      'firstName', 'middleName', 'lastName', 'email', 'phone', 'address', 'nationalId',
      'position', 'photoUrl', 'ongoingContract',
    ] as const;
    for (const f of fields) {
      if (data[f] !== undefined) (updateData as Record<string, unknown>)[f] = data[f];
    }
    if (data.gender) updateData.gender = data.gender as Gender;
    if (data.status) updateData.status = data.status as EmployeeStatus;
    if (data.contractType) updateData.contractType = data.contractType as ContractType;
    if (data.dateOfBirth) updateData.dateOfBirth = new Date(String(data.dateOfBirth));
    if (data.hireDate) updateData.hireDate = new Date(String(data.hireDate));
    if (data.contractEnd !== undefined) {
      updateData.contractEnd = data.contractEnd ? new Date(String(data.contractEnd)) : null;
    }
    if (data.basicSalary !== undefined) updateData.basicSalary = data.basicSalary ? Number(data.basicSalary) : null;
    if (data.netSalary !== undefined) updateData.netSalary = data.netSalary ? Number(data.netSalary) : null;
    if (data.hrProfile) updateData.hrProfile = data.hrProfile as Prisma.InputJsonValue;
    if (data.departmentId !== undefined) {
      updateData.department = data.departmentId
        ? { connect: { id: String(data.departmentId) } }
        : { disconnect: true };
    }
    if (data.categoryId !== undefined) {
      updateData.category = data.categoryId
        ? { connect: { id: String(data.categoryId) } }
        : { disconnect: true };
    }

    await prisma.employee.update({ where: { id }, data: updateData });
    const result = await this.getById(orgId, id);
    void pushEmployeeToPayroll(orgId, id).catch((err) =>
      console.warn('[HR] Payroll sync failed after update:', err)
    );
    return result;
  }

  async softDelete(orgId: string, id: string, currentUserId: string) {
    if (id === currentUserId) throw new AppError(400, 'Cannot delete your own account');
    const emp = await prisma.employee.findFirst({ where: { id, organizationId: orgId, deletedAt: null } });
    if (!emp) throw new AppError(404, 'Employee not found');
    if (isProtectedEmployee(emp)) {
      throw new AppError(400, 'Cannot delete protected employee (Organization Administrator or School Manager)');
    }
    await prisma.employee.update({ where: { id }, data: { deletedAt: new Date(), status: 'TERMINATED' } });
    void pushEmployeeToPayroll(orgId, id).catch((err) =>
      console.warn('[HR] Payroll sync failed after delete:', err)
    );
    return { success: true };
  }

  async bulkDelete(orgId: string, ids: string[]) {
    const employees = await prisma.employee.findMany({
      where: { id: { in: ids }, organizationId: orgId, deletedAt: null },
    });
    const deletable = employees.filter((e) => !isProtectedEmployee(e)).map((e) => e.id);
    const skipped = employees.length - deletable.length;
    if (deletable.length) {
      await prisma.employee.updateMany({
        where: { id: { in: deletable }, organizationId: orgId },
        data: { deletedAt: new Date(), status: 'TERMINATED' },
      });
      for (const id of deletable) {
        void pushEmployeeToPayroll(orgId, id).catch((err) =>
          console.warn('[HR] Payroll sync failed after bulk delete:', err)
        );
      }
    }
    return { success: true, count: deletable.length, skippedProtected: skipped };
  }

  async deleteAllDeletable(orgId: string) {
    const employees = await prisma.employee.findMany({
      where: { organizationId: orgId, deletedAt: null },
    });
    const deletable = employees.filter((e) => !isProtectedEmployee(e)).map((e) => e.id);
    if (deletable.length) {
      await prisma.employee.updateMany({
        where: { id: { in: deletable }, organizationId: orgId },
        data: { deletedAt: new Date(), status: 'TERMINATED' },
      });
    }
    return {
      success: true,
      deleted: deletable.length,
      keptProtected: employees.length - deletable.length,
    };
  }

  async contracts(orgId: string) {
    const employees = await prisma.employee.findMany({
      where: employeeWhere(orgId),
      include: { department: true },
    });

    const rows = employees.map((e) => ({
      contractId: `CON-${e.id.slice(0, 8).toUpperCase()}`,
      employeeId: e.id,
      employeeName: [e.firstName, e.lastName].join(' '),
      employeeNumber: e.employeeNumber,
      contractType: e.contractType,
      position: e.position,
      startDate: e.hireDate,
      endDate: e.contractEnd,
      ongoingContract: e.ongoingContract,
      basicSalary: e.basicSalary ? Number(e.basicSalary) : null,
      status: contractStatus(e.contractEnd, e.ongoingContract),
      daysLeft: daysLeft(e.contractEnd, e.ongoingContract),
    }));

    const expiring = rows.filter((r) => r.status === 'Expiring').length;
    const expired = rows.filter((r) => r.status === 'Expired').length;

    return { data: rows, stats: { total: rows.length, expiring, expired } };
  }

  async organization(orgId: string) {
    const [departments, employees] = await Promise.all([
      prisma.department.findMany({
        where: { organizationId: orgId },
        include: { employees: { where: { deletedAt: null } } },
      }),
      prisma.employee.findMany({
        where: employeeWhere(orgId),
        include: { department: true, category: true },
      }),
    ]);

    const positions = [...new Set(employees.map((e) => e.position))];
    const management = employees.filter((e) =>
      /director|head|manager|principal|dean/i.test(e.position)
    ).length;
    const teaching = employees.filter((e) => /teacher|instructor/i.test(e.position)).length;

    const nodes = departments.map((d) => ({
      id: d.id,
      type: 'department' as const,
      name: d.name,
      headName: d.headName,
      staffCount: d.employees.length,
      budget: d.budget ? Number(d.budget) : null,
      positions: [...new Set(d.employees.map((e) => e.position))].map((p) => ({
        title: p,
        count: d.employees.filter((e) => e.position === p).length,
        staff: d.employees
          .filter((e) => e.position === p)
          .map((e) => ({
            id: e.id,
            name: [e.firstName, e.lastName].join(' '),
            status: e.status,
          })),
      })),
    }));

    return {
      kpis: {
        totalStaff: employees.length,
        departments: departments.length,
        positions: positions.length,
        vacantPositions: 0,
        managementStaff: management,
        teachingStaff: teaching,
      },
      departments: nodes,
      employees: employees.map(mapEmployee),
    };
  }
}

export class LeaveService {
  private buildWhere(orgId: string, filters: Record<string, string | undefined>) {
    const where: Prisma.LeaveRequestWhereInput = { organizationId: orgId };

    if (filters.status) where.status = filters.status as Prisma.EnumLeaveStatusFilter['equals'];
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.leaveType) where.leaveType = filters.leaveType;
    if (filters.department || filters.search) {
      const employeeFilter: Prisma.EmployeeWhereInput = {};
      if (filters.department) employeeFilter.department = { name: filters.department };
      if (filters.search) {
        employeeFilter.OR = [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { employeeNumber: { contains: filters.search, mode: 'insensitive' } },
        ];
      }
      where.employee = employeeFilter;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.startDate = {};
      if (filters.dateFrom) where.startDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.startDate.lte = new Date(filters.dateTo);
    }

    return where;
  }

  private mapMetadata(metadata: unknown) {
    return (metadata && typeof metadata === 'object' ? metadata : {}) as Record<string, unknown>;
  }

  private mapRow(l: Awaited<ReturnType<typeof prisma.leaveRequest.findFirst>> & {
    employee: { firstName: string; lastName: string; employeeNumber: string; photoUrl: string | null; department: { name: string } | null };
  }) {
    const meta = this.mapMetadata(l!.metadata);
    return {
      id: l!.id,
      employeeId: l!.employeeId,
      employeeName: [l!.employee.firstName, l!.employee.lastName].join(' '),
      employeeNumber: l!.employee.employeeNumber,
      avatarUrl: l!.employee.photoUrl,
      department: l!.employee.department?.name ?? '—',
      leaveType: l!.leaveType,
      leaveCategory: (meta.leaveCategory as string) ?? 'STATUTORY',
      startDate: l!.startDate.toISOString(),
      endDate: l!.endDate.toISOString(),
      workingDays: l!.totalDays,
      status: l!.status,
      approver: (meta.approver as string) ?? '—',
      balanceAfter: Number(meta.balanceAfter ?? 0),
      priority: (meta.priority as string) ?? 'Normal',
      reason: l!.reason,
      appliedOn: l!.appliedOn,
      metadata: meta,
    };
  }

  async list(orgId: string, filters: Record<string, string | undefined>) {
    const where = this.buildWhere(orgId, filters);
    const page = Math.max(1, parseInt(filters.page ?? '1', 10));
    const limit = Math.min(50, parseInt(filters.limit ?? '10', 10));

    const [items, total, stats] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: { employee: { include: { department: true } } },
        orderBy: { appliedOn: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leaveRequest.count({ where }),
      this.stats(orgId),
    ]);

    return {
      data: items.map((l) => this.mapRow(l)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats,
    };
  }

  async listRequests(orgId: string, filters: Record<string, string | undefined>) {
    const where = this.buildWhere(orgId, filters);
    const items = await prisma.leaveRequest.findMany({
      where,
      include: { employee: { include: { department: true } } },
      orderBy: { appliedOn: 'desc' },
      take: 200,
    });
    return items.map((l) => this.mapRow(l));
  }

  async stats(orgId: string) {
    const year = new Date().getFullYear();
    const monthStart = new Date(year, new Date().getMonth(), 1);
    const [total, pending, approved, rejected, onLeave] = await Promise.all([
      prisma.leaveRequest.count({ where: { organizationId: orgId } }),
      prisma.leaveRequest.count({ where: { organizationId: orgId, status: 'PENDING' } }),
      prisma.leaveRequest.count({
        where: {
          organizationId: orgId,
          status: 'APPROVED',
          appliedOn: { gte: new Date(year, 0, 1) },
        },
      }),
      prisma.leaveRequest.count({
        where: {
          organizationId: orgId,
          status: 'REJECTED',
          appliedOn: { gte: new Date(year, 0, 1) },
        },
      }),
      prisma.employee.count({ where: { organizationId: orgId, status: 'ON_LEAVE', deletedAt: null } }),
    ]);

    const annualUsed = await prisma.leaveRequest.aggregate({
      where: {
        organizationId: orgId,
        status: 'APPROVED',
        leaveType: 'Annual Leave',
        startDate: { gte: new Date(year, 0, 1) },
      },
      _sum: { totalDays: true },
    });

    const totalEmployees = await prisma.employee.count({ where: employeeWhere(orgId) });
    const annualEntitlement = totalEmployees * 18;
    const annualBalance = Math.max(0, annualEntitlement - (annualUsed._sum.totalDays ?? 0));

    return { total, pending, approved, rejected, onLeave, annualBalance };
  }

  async kpis(orgId: string) {
    const stats = await this.stats(orgId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const weekAhead = new Date(today);
    weekAhead.setDate(weekAhead.getDate() + 7);

    const [
      totalEmployees,
      onLeaveToday,
      approvedThisMonth,
      returningToday,
      upcomingLeave,
      annualUsed,
      sickUsed,
    ] = await Promise.all([
      prisma.employee.count({ where: employeeWhere(orgId) }),
      prisma.leaveRequest.count({
        where: {
          organizationId: orgId,
          status: 'APPROVED',
          startDate: { lte: today },
          endDate: { gte: today },
        },
      }),
      prisma.leaveRequest.count({
        where: { organizationId: orgId, status: 'APPROVED', appliedOn: { gte: monthStart } },
      }),
      prisma.leaveRequest.count({
        where: {
          organizationId: orgId,
          status: 'APPROVED',
          endDate: { gte: today, lt: tomorrow },
        },
      }),
      prisma.leaveRequest.count({
        where: {
          organizationId: orgId,
          status: { in: ['PENDING', 'APPROVED'] },
          startDate: { gt: today, lte: weekAhead },
        },
      }),
      prisma.leaveRequest.aggregate({
        where: {
          organizationId: orgId,
          status: 'APPROVED',
          leaveType: 'Annual Leave',
          startDate: { gte: new Date(today.getFullYear(), 0, 1) },
        },
        _sum: { totalDays: true },
      }),
      prisma.leaveRequest.aggregate({
        where: {
          organizationId: orgId,
          status: 'APPROVED',
          leaveType: 'Sick Leave',
          startDate: { gte: new Date(today.getFullYear(), 0, 1) },
        },
        _sum: { totalDays: true },
      }),
    ]);

    return {
      totalEmployees,
      onLeaveToday,
      pendingRequests: stats.pending,
      approvedThisMonth,
      rejectedRequests: stats.rejected,
      balanceAlerts: 0,
      returningToday,
      upcomingLeave,
      annualLeaveUsed: annualUsed._sum.totalDays ?? 0,
      sickLeaveUsed: sickUsed._sum.totalDays ?? 0,
    };
  }

  async charts(orgId: string) {
    const year = new Date().getFullYear();
    const requests = await prisma.leaveRequest.findMany({
      where: { organizationId: orgId, appliedOn: { gte: new Date(year, 0, 1) } },
      include: { employee: { include: { department: true } } },
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const byMonth = monthNames.map((month, i) => ({
      month,
      requests: requests.filter((r) => r.appliedOn.getMonth() === i).length,
    }));

    const utilization = monthNames.map((month, i) => {
      const used = requests
        .filter((r) => r.status === 'APPROVED' && r.startDate.getMonth() === i)
        .reduce((sum, r) => sum + r.totalDays, 0);
      return { month, used, entitled: 150 };
    });

    const deptMap = new Map<string, number>();
    for (const r of requests) {
      const dept = r.employee.department?.name ?? 'Unassigned';
      deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
    }
    const byDepartment = [...deptMap.entries()].map(([department, count]) => ({ department, count }));

    const typeMap = new Map<string, number>();
    for (const r of requests) {
      typeMap.set(r.leaveType, (typeMap.get(r.leaveType) ?? 0) + 1);
    }
    const byType = [...typeMap.entries()].map(([type, count]) => ({ type, count }));

    const trend = monthNames.map((month, i) => ({
      month,
      approved: requests.filter((r) => r.status === 'APPROVED' && r.appliedOn.getMonth() === i).length,
      rejected: requests.filter((r) => r.status === 'REJECTED' && r.appliedOn.getMonth() === i).length,
    }));

    return { utilization, byMonth, byDepartment, byType, trend };
  }

  async employeeLookup(orgId: string, query?: string) {
    const employees = await prisma.employee.findMany({
      where: {
        ...employeeWhere(orgId),
        ...(query
          ? {
              OR: [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                { employeeNumber: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { department: true },
      orderBy: { firstName: 'asc' },
      take: 100,
    });

    return employees.map((e) => {
      const profile = (e.hrProfile && typeof e.hrProfile === 'object' ? e.hrProfile : {}) as Record<
        string,
        Record<string, string>
      >;
      return {
        id: e.id,
        name: [e.firstName, e.lastName].join(' '),
        employeeId: e.employeeNumber,
        department: e.department?.name ?? '—',
        position: e.position,
        branch: profile.placement?.branch ?? profile.employment?.branch ?? 'Main',
        manager: profile.employment?.supervisor ?? profile.employment?.manager ?? '—',
        gender: e.gender,
        yearsOfService: yearsOfService(e.hireDate),
      };
    });
  }

  async balance(orgId: string, employeeId: string, leaveType: string) {
    const year = new Date().getFullYear();
    const policy = await this.getPolicyForType(orgId, leaveType);
    const maxDays = policy?.maxDays ?? (leaveType === 'Annual Leave' ? 18 : leaveType === 'Sick Leave' ? 180 : 10);

    const used = await prisma.leaveRequest.aggregate({
      where: {
        organizationId: orgId,
        employeeId,
        leaveType,
        status: 'APPROVED',
        startDate: { gte: new Date(year, 0, 1) },
      },
      _sum: { totalDays: true },
    });

    const usedDays = used._sum.totalDays ?? 0;
    const carryForward = policy?.carryForward ? 3 : 0;
    const earned = maxDays;
    const opening = carryForward;
    const balance = Math.max(0, opening + earned - usedDays);

    return { balance, opening, earned, carryForward, used: usedDays, maxDays, policyDays: maxDays };
  }

  publicHolidays(start: string, end: string) {
    const rwanda2026 = [
      '2026-01-01',
      '2026-01-02',
      '2026-04-07',
      '2026-05-01',
      '2026-07-01',
      '2026-07-04',
      '2026-08-15',
      '2026-12-25',
      '2026-12-26',
    ];
    return rwanda2026.filter((d) => d >= start && d <= end);
  }

  private computeDays(startDate: string, endDate: string, workingDays?: number) {
    if (workingDays && workingDays > 0) return workingDays;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  }

  async create(orgId: string, data: Record<string, unknown>) {
    const employeeId = String(data.employeeId);
    const leaveType = String(data.leaveType);
    const startDate = new Date(String(data.startDate));
    const endDate = new Date(String(data.endDate));
    const workingDays = Number(data.workingDays);
    const totalDays = this.computeDays(String(data.startDate), String(data.endDate), workingDays);

    const policy = await this.getPolicyForType(orgId, leaveType);
    this.assertWorkingDaysMatch(
      policy,
      workingDays,
      data.compassionateEvent ? String(data.compassionateEvent) : null
    );

    const balance = await this.balance(orgId, employeeId, leaveType);
    const handover = (data.handover && typeof data.handover === 'object' ? data.handover : {}) as Record<
      string,
      unknown
    >;
    const metadata = {
      leaveCategory: data.leaveCategory,
      compassionateEvent: data.compassionateEvent,
      priority: data.priority,
      isHalfDay: data.isHalfDay,
      halfDayPeriod: data.halfDayPeriod,
      returnDate: data.returnDate,
      policyMaxDays: this.allowedWorkingDays(
        policy,
        data.compassionateEvent ? String(data.compassionateEvent) : null
      ),
      approval: data.approval,
      contact: data.contact,
      handover: {
        person: handover.person ?? '',
        tasksToComplete: this.normalizeStringList(handover.tasksToComplete),
        pendingWork: this.normalizeStringList(handover.pendingWork),
        assetsReturned: this.normalizeStringList(handover.assetsReturned),
        customAssets: this.normalizeStringList(handover.customAssets),
      },
      balanceAfter: Math.max(0, balance.balance - totalDays),
    };

    return prisma.leaveRequest.create({
      data: {
        organizationId: orgId,
        employeeId,
        leaveType,
        startDate,
        endDate,
        totalDays,
        reason: data.reason ? String(data.reason) : null,
        status: 'PENDING',
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  async update(orgId: string, id: string, data: Record<string, unknown>) {
    const existing = await prisma.leaveRequest.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new AppError(404, 'Leave request not found');

    const leaveType = String(data.leaveType ?? existing.leaveType);
    const startDate = data.startDate ? new Date(String(data.startDate)) : existing.startDate;
    const endDate = data.endDate ? new Date(String(data.endDate)) : existing.endDate;
    const workingDays = Number(data.workingDays ?? existing.totalDays);
    const totalDays = this.computeDays(
      startDate.toISOString(),
      endDate.toISOString(),
      workingDays
    );

    const policy = await this.getPolicyForType(orgId, leaveType);
    this.assertWorkingDaysMatch(
      policy,
      workingDays,
      data.compassionateEvent ? String(data.compassionateEvent) : null
    );

    const prevMeta = this.mapMetadata(existing.metadata);
    const handoverInput = (data.handover && typeof data.handover === 'object'
      ? data.handover
      : prevMeta.handover) as Record<string, unknown>;
    const metadata = {
      ...prevMeta,
      leaveCategory: data.leaveCategory ?? prevMeta.leaveCategory,
      compassionateEvent: data.compassionateEvent ?? prevMeta.compassionateEvent,
      priority: data.priority ?? prevMeta.priority,
      isHalfDay: data.isHalfDay ?? prevMeta.isHalfDay,
      halfDayPeriod: data.halfDayPeriod ?? prevMeta.halfDayPeriod,
      returnDate: data.returnDate ?? prevMeta.returnDate,
      policyMaxDays: this.allowedWorkingDays(
        policy,
        String(data.compassionateEvent ?? prevMeta.compassionateEvent ?? '')
      ),
      approval: data.approval ?? prevMeta.approval,
      contact: data.contact ?? prevMeta.contact,
      handover: {
        person: handoverInput.person ?? (prevMeta.handover as Record<string, unknown>)?.person ?? '',
        tasksToComplete: this.normalizeStringList(
          handoverInput.tasksToComplete ?? (prevMeta.handover as Record<string, unknown>)?.tasksToComplete
        ),
        pendingWork: this.normalizeStringList(
          handoverInput.pendingWork ?? (prevMeta.handover as Record<string, unknown>)?.pendingWork
        ),
        assetsReturned: this.normalizeStringList(
          handoverInput.assetsReturned ?? (prevMeta.handover as Record<string, unknown>)?.assetsReturned
        ),
        customAssets: this.normalizeStringList(
          handoverInput.customAssets ?? (prevMeta.handover as Record<string, unknown>)?.customAssets
        ),
      },
    };

    return prisma.leaveRequest.update({
      where: { id },
      data: {
        leaveType,
        startDate,
        endDate,
        totalDays,
        reason: data.reason !== undefined ? (data.reason ? String(data.reason) : null) : existing.reason,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  async get(orgId: string, id: string) {
    const req = await prisma.leaveRequest.findFirst({
      where: { id, organizationId: orgId },
      include: { employee: { include: { department: true } } },
    });
    if (!req) throw new AppError(404, 'Leave request not found');

    const meta = this.mapMetadata(req.metadata);
    const employee = await this.employeeLookup(orgId);
    const emp = employee.find((e) => e.id === req.employeeId) ?? null;

    const handover = (meta.handover && typeof meta.handover === 'object' ? meta.handover : {}) as Record<
      string,
      unknown
    >;

    return {
      employee: emp,
      form: {
        leaveCategory: meta.leaveCategory ?? 'STATUTORY',
        leaveType: req.leaveType,
        compassionateEvent: meta.compassionateEvent ?? '',
        reason: req.reason ?? '',
        priority: meta.priority ?? 'Normal',
        isHalfDay: Boolean(meta.isHalfDay),
        halfDayPeriod: meta.halfDayPeriod ?? 'Morning',
        startDate: req.startDate.toISOString().slice(0, 10),
        endDate: req.endDate.toISOString().slice(0, 10),
        supervisor: (meta.approval as Record<string, string>)?.supervisor ?? '',
        hrOfficer: (meta.approval as Record<string, string>)?.hrOfficer ?? '',
        departmentHead: (meta.approval as Record<string, string>)?.departmentHead ?? '',
        ceoRequired: Boolean((meta.approval as Record<string, unknown>)?.ceoRequired),
        contactPhone: (meta.contact as Record<string, string>)?.phone ?? '',
        contactEmail: (meta.contact as Record<string, string>)?.email ?? '',
        temporaryAddress: (meta.contact as Record<string, string>)?.temporaryAddress ?? '',
        emergencyContact: (meta.contact as Record<string, string>)?.emergencyContact ?? '',
        canBeContacted: (meta.contact as Record<string, boolean>)?.canBeContacted ?? true,
        handoverPerson: String(handover.person ?? ''),
        tasksToComplete: this.normalizeStringList(handover.tasksToComplete),
        pendingWork: this.normalizeStringList(handover.pendingWork),
        assetsReturned: this.normalizeStringList(handover.assetsReturned),
        customAssets: this.normalizeStringList(handover.customAssets),
      },
    };
  }

  async updateStatus(orgId: string, id: string, status: 'APPROVED' | 'REJECTED', approverId: string) {
    const req = await prisma.leaveRequest.findFirst({ where: { id, organizationId: orgId } });
    if (!req) throw new AppError(404, 'Leave request not found');

    const meta = this.mapMetadata(req.metadata);
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        approvedBy: approverId,
        metadata: { ...meta, approver: approverId } as Prisma.InputJsonValue,
      },
    });

    if (status === 'APPROVED') {
      await prisma.employee.update({
        where: { id: req.employeeId },
        data: { status: 'ON_LEAVE' },
      });
    }

    return updated;
  }

  async cancel(orgId: string, id: string) {
    const req = await prisma.leaveRequest.findFirst({ where: { id, organizationId: orgId } });
    if (!req) throw new AppError(404, 'Leave request not found');
    if (req.status === 'CANCELLED') return req;

    const meta = this.mapMetadata(req.metadata);
    return prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        metadata: { ...meta, cancelledAt: new Date().toISOString() } as Prisma.InputJsonValue,
      },
    });
  }

  private mapPolicy(p: {
    id: string;
    leaveType: string;
    category: string;
    paid: boolean;
    maxDays: number;
    carryForward: boolean;
    genderRestriction: string;
    eligibleDepartments: string[];
    minYearsOfService: number;
    approvalWorkflow: string[];
    requiredDocuments: string[];
    active: boolean;
  }) {
    return {
      id: p.id,
      leaveType: p.leaveType,
      category: p.category,
      paid: p.paid,
      maxDays: p.maxDays,
      carryForward: p.carryForward,
      genderRestriction: p.genderRestriction,
      eligibleDepartments: p.eligibleDepartments,
      minYearsOfService: p.minYearsOfService,
      approvalWorkflow: p.approvalWorkflow,
      requiredDocuments: p.requiredDocuments,
      active: p.active,
    };
  }

  async listPolicies(orgId: string) {
    await this.ensurePolicyDefaults(orgId);
    const items = await prisma.leavePolicy.findMany({
      where: { organizationId: orgId },
      orderBy: [{ category: 'asc' }, { leaveType: 'asc' }],
    });
    return items.map((p) => this.mapPolicy(p));
  }

  async ensurePolicyDefaults(orgId: string) {
    const existing = await prisma.leavePolicy.count({ where: { organizationId: orgId } });
    if (existing > 0) return;

    for (const def of STATUTORY_LEAVE_POLICY_DEFAULTS) {
      await prisma.leavePolicy.create({
        data: {
          organizationId: orgId,
          leaveType: def.leaveType,
          category: 'STATUTORY',
          paid: def.paid,
          maxDays: def.maxDays,
          carryForward: def.carryForward,
          genderRestriction: def.genderRestriction,
          eligibleDepartments: [],
          minYearsOfService: 0,
          approvalWorkflow: ['Manager', 'HR'],
          requiredDocuments: 'requiredDocuments' in def ? [...def.requiredDocuments] : [],
          active: true,
        },
      });
    }
  }

  async getPolicyForType(orgId: string, leaveType: string) {
    await this.ensurePolicyDefaults(orgId);
    return prisma.leavePolicy.findFirst({
      where: { organizationId: orgId, leaveType, active: true },
    });
  }

  private compassionateDays(event?: string | null) {
    const map: Record<string, number> = {
      'Death of Spouse': 5,
      'Death of Child': 5,
      'Death of Father': 5,
      'Death of Mother': 5,
      'Death of Parent-in-law': 3,
      'Death of Brother/Sister': 3,
      'Death of Grandparent': 2,
      Marriage: 3,
      Childbirth: 2,
      Other: 1,
    };
    return event ? map[event] ?? null : null;
  }

  private normalizeStringList(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((v) => String(v).trim()).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
      return value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    }
    return [];
  }

  private allowedWorkingDays(
    policy: { maxDays: number; leaveType: string } | null,
    compassionateEvent?: string | null
  ) {
    if (policy?.leaveType === 'Compassionate Leave' && compassionateEvent) {
      const days = this.compassionateDays(compassionateEvent);
      if (days !== null) return days;
    }
    return policy?.maxDays ?? 0;
  }

  private assertWorkingDaysMatch(
    policy: { maxDays: number; leaveType: string } | null,
    workingDays: number,
    compassionateEvent?: string | null
  ) {
    const allowed = this.allowedWorkingDays(policy, compassionateEvent);
    if (allowed <= 0) return;
    const counted = Math.round(workingDays * 10) / 10;
    if (counted !== allowed) {
      const action = counted > allowed ? 'reduce' : 'increase';
      throw new AppError(
        400,
        `This leave type requires exactly ${allowed} working day(s). You selected ${counted}. Please ${action} your start or end date.`
      );
    }
  }

  async createPolicy(orgId: string, data: Record<string, unknown>) {
    const leaveType = String(data.leaveType).trim();
    if (!leaveType) throw new AppError(400, 'Leave type is required');

    const created = await prisma.leavePolicy.create({
      data: {
        organizationId: orgId,
        leaveType,
        category: String(data.category ?? 'ORGANIZATION'),
        paid: Boolean(data.paid ?? true),
        maxDays: Number(data.maxDays ?? 5),
        carryForward: Boolean(data.carryForward ?? false),
        genderRestriction: String(data.genderRestriction ?? 'ANY'),
        eligibleDepartments: (data.eligibleDepartments as string[]) ?? [],
        minYearsOfService: Number(data.minYearsOfService ?? 0),
        approvalWorkflow: (data.approvalWorkflow as string[]) ?? ['Manager'],
        requiredDocuments: (data.requiredDocuments as string[]) ?? [],
        active: data.active !== false,
      },
    });
    return this.mapPolicy(created);
  }

  async updatePolicy(orgId: string, id: string, data: Record<string, unknown>) {
    const existing = await prisma.leavePolicy.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new AppError(404, 'Leave policy not found');

    const updated = await prisma.leavePolicy.update({
      where: { id },
      data: {
        leaveType: data.leaveType ? String(data.leaveType) : undefined,
        category: data.category ? String(data.category) : undefined,
        paid: data.paid !== undefined ? Boolean(data.paid) : undefined,
        maxDays: data.maxDays !== undefined ? Number(data.maxDays) : undefined,
        carryForward: data.carryForward !== undefined ? Boolean(data.carryForward) : undefined,
        genderRestriction: data.genderRestriction ? String(data.genderRestriction) : undefined,
        eligibleDepartments: data.eligibleDepartments as string[] | undefined,
        minYearsOfService: data.minYearsOfService !== undefined ? Number(data.minYearsOfService) : undefined,
        approvalWorkflow: data.approvalWorkflow as string[] | undefined,
        requiredDocuments: data.requiredDocuments as string[] | undefined,
        active: data.active !== undefined ? Boolean(data.active) : undefined,
      },
    });
    return this.mapPolicy(updated);
  }

  async deletePolicy(orgId: string, id: string) {
    const existing = await prisma.leavePolicy.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new AppError(404, 'Leave policy not found');
    await prisma.leavePolicy.delete({ where: { id } });
    return { id };
  }
}

export class DocumentService {
  async repository(orgId: string, filters: Record<string, string | undefined>) {
    const where: Prisma.EmployeeDocumentWhereInput = { organizationId: orgId };
    if (filters.category) where.category = filters.category;
    if (filters.search) {
      where.OR = [
        { filename: { contains: filters.search, mode: 'insensitive' } },
        { employee: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { employee: { lastName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [documents, employees] = await Promise.all([
      prisma.employeeDocument.findMany({
        where,
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.employee.findMany({
        where: employeeWhere(orgId),
        include: { documents: true },
      }),
    ]);

    const compliance = employees.map((e) => {
      const cats = new Set(e.documents.map((d) => d.category));
      const missing = ['cv', 'national_id_copy', 'contract'].filter((c) => !cats.has(c));
      return {
        employeeId: e.id,
        employeeName: [e.firstName, e.lastName].join(' '),
        employeeNumber: e.employeeNumber,
        uploaded: e.documents.length,
        missing: missing.length,
        complete: missing.length === 0,
        uploadedCategories: [...cats],
        missingCategories: missing,
      };
    });

    return {
      stats: {
        totalDocs: documents.length,
        verified: documents.filter((d) => d.verified).length,
        pending: documents.filter((d) => !d.verified).length,
        missingStaff: compliance.filter((c) => !c.complete).length,
      },
      compliance,
      documents: documents.map((d) => ({
        id: d.id,
        employeeId: d.employeeId,
        employeeName: [d.employee.firstName, d.employee.lastName].join(' '),
        category: d.category,
        filename: d.filename,
        mimeType: d.mimeType,
        verified: d.verified,
        hasFile: Boolean(d.filePath),
        createdAt: d.createdAt,
      })),
    };
  }

  async upload(
    orgId: string,
    data: { employeeId: string; category: string; filename: string; storedName: string; mimeType: string }
  ) {
    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, organizationId: orgId, deletedAt: null },
    });
    if (!employee) throw new AppError(404, 'Employee not found');

    return prisma.employeeDocument.create({
      data: {
        organizationId: orgId,
        employeeId: data.employeeId,
        category: data.category,
        filename: data.filename,
        filePath: data.storedName,
        mimeType: data.mimeType,
      },
    });
  }

  async getForDownload(orgId: string, id: string) {
    const doc = await prisma.employeeDocument.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!doc) throw new AppError(404, 'Document not found');
    if (!doc.filePath) throw new AppError(404, 'No file attached to this document');

    const absolutePath = resolveStoredFilePath(doc.filePath);
    if (!fs.existsSync(absolutePath)) throw new AppError(404, 'File not found on server');

    return { doc, absolutePath };
  }

  async create(orgId: string, data: Record<string, unknown>) {
    return prisma.employeeDocument.create({
      data: {
        organizationId: orgId,
        employeeId: String(data.employeeId),
        category: String(data.category),
        filename: String(data.filename),
        filePath: data.filePath ? String(data.filePath) : null,
        mimeType: data.mimeType ? String(data.mimeType) : null,
        verified: Boolean(data.verified),
      },
    });
  }
}

export class QualificationService {
  async list(orgId: string, filters: Record<string, string | undefined>) {
    const where: Prisma.QualificationWhereInput = { organizationId: orgId };
    if (filters.level) where.level = filters.level;
    if (filters.search) {
      where.OR = [
        { field: { contains: filters.search, mode: 'insensitive' } },
        { institution: { contains: filters.search, mode: 'insensitive' } },
        { employee: { firstName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const items = await prisma.qualification.findMany({
      where,
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });

    const levelCounts: Record<string, number> = {};
    for (const q of items) {
      levelCounts[q.level] = (levelCounts[q.level] ?? 0) + 1;
    }

    return {
      stats: {
        records: items.length,
        verified: items.filter((q) => q.verified).length,
      },
      levelDistribution: levelCounts,
      data: items.map((q) => ({
        id: q.id,
        employeeId: q.employeeId,
        employeeName: [q.employee.firstName, q.employee.lastName].join(' '),
        employeeNumber: q.employee.employeeNumber,
        level: q.level,
        field: q.field,
        institution: q.institution,
        year: q.year,
        grade: q.grade,
        verified: q.verified,
      })),
    };
  }

  async verify(orgId: string, id: string) {
    const q = await prisma.qualification.findFirst({ where: { id, organizationId: orgId } });
    if (!q) throw new AppError(404, 'Qualification not found');
    return prisma.qualification.update({ where: { id }, data: { verified: true } });
  }
}

export const dashboardService = new DashboardService();
export const departmentService = new DepartmentService();
export const categoryService = new CategoryService();
export const employeeService = new EmployeeService();
export const leaveService = new LeaveService();
export const documentService = new DocumentService();
export const qualificationService = new QualificationService();
