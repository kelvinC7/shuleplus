import { ContractType, EmployeeStatus, Gender, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { allocateHrEmployeeNumber } from '../utils/staff-id';
import type { PayrollStaffSyncPayload } from '../types/employee-sync';

function normalizeGender(value?: string | null): Gender {
  const v = (value ?? '').trim().toUpperCase();
  if (v.startsWith('F')) return 'FEMALE';
  if (v.startsWith('M')) return 'MALE';
  return 'OTHER';
}

function normalizeContractType(value?: string | null): ContractType {
  const v = (value ?? 'PERMANENT').toUpperCase().replace(/\s+/g, '_');
  const map: Record<string, ContractType> = {
    PERMANENT: 'PERMANENT',
    CONTRACT: 'CONTRACT',
    TEMPORARY: 'TEMPORARY',
    PROBATION: 'PROBATION',
    INTERNSHIP: 'INTERNSHIP',
    PART_TIME: 'PART_TIME',
    'PART-TIME': 'PART_TIME',
    CONSULTANCY: 'CONSULTANCY',
  };
  return map[v] ?? 'PERMANENT';
}

function normalizeStatus(value?: string | null): EmployeeStatus {
  const v = (value ?? 'ACTIVE').toUpperCase();
  const allowed: EmployeeStatus[] = ['ACTIVE', 'PROBATION', 'SUSPENDED', 'TERMINATED', 'ON_LEAVE'];
  return allowed.includes(v as EmployeeStatus) ? (v as EmployeeStatus) : 'ACTIVE';
}

async function resolveDepartmentId(orgId: string, name?: string | null) {
  if (!name?.trim()) return null;
  const existing = await prisma.department.findFirst({
    where: { organizationId: orgId, name: { equals: name.trim(), mode: 'insensitive' } },
  });
  if (existing) return existing.id;
  const created = await prisma.department.create({
    data: { organizationId: orgId, name: name.trim(), status: 'ACTIVE' },
  });
  return created.id;
}

async function findExistingEmployee(orgId: string, payload: PayrollStaffSyncPayload) {
  if (payload.hrEmployeeId) {
    const byLink = await prisma.employee.findFirst({
      where: { organizationId: orgId, id: payload.hrEmployeeId, deletedAt: null },
    });
    if (byLink) return byLink;
  }

  const byPayrollId = await prisma.employee.findFirst({
    where: { organizationId: orgId, payrollStaffId: payload.payrollStaffId, deletedAt: null },
  });
  if (byPayrollId) return byPayrollId;

  const matchers: Prisma.EmployeeWhereInput[] = [];
  if (payload.nationalId?.trim()) matchers.push({ nationalId: payload.nationalId.trim() });
  if (payload.email?.trim()) matchers.push({ email: { equals: payload.email.trim(), mode: 'insensitive' } });
  if (payload.phone?.trim()) matchers.push({ phone: payload.phone.trim() });

  if (!matchers.length) return null;
  return prisma.employee.findFirst({
    where: { organizationId: orgId, deletedAt: null, OR: matchers },
  });
}

export class EmployeeSyncService {
  async upsertFromPayroll(orgId: string, payload: PayrollStaffSyncPayload) {
    const existing = await findExistingEmployee(orgId, payload);
    const departmentId = await resolveDepartmentId(orgId, payload.department);
    const status = normalizeStatus(payload.status);
    const isTerminated = status === 'TERMINATED';

    const hrProfile = {
      rssbNumber: payload.rssbNumber?.trim() || null,
      contractType: payload.contractType ?? 'PERMANENT',
      payrollEmployeeNumber: payload.employeeNumber,
      banking: {
        bankName: payload.bankName?.trim() || null,
        accountNumber: payload.bankAccount?.trim() || null,
      },
      allowances: {
        transport: payload.transportAllowance ?? 0,
        housing: payload.housingAllowance ?? 0,
        others: payload.othersAllowance ?? 0,
      },
    } as Prisma.InputJsonValue;

    const employeeData = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      gender: normalizeGender(payload.gender),
      dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : new Date('1990-01-01'),
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || '+250000000000',
      nationalId: payload.nationalId?.trim() || null,
      departmentId,
      position: payload.position?.trim() || 'Staff',
      contractType: normalizeContractType(payload.contractType),
      status,
      hireDate: payload.hireDate ? new Date(payload.hireDate) : new Date(),
      basicSalary: payload.basicSalary != null ? Number(payload.basicSalary) : null,
      isProtected: Boolean(payload.isProtected),
      payrollStaffId: payload.payrollStaffId,
      hrProfile,
      ...(isTerminated ? { deletedAt: new Date() } : { deletedAt: null }),
    };

    let employeeId: string;

    if (existing) {
      await prisma.employee.update({
        where: { id: existing.id },
        data: employeeData,
      });
      employeeId = existing.id;
    } else {
      const tenant = await prisma.tenant.findUnique({ where: { organizationId: orgId } });
      const employeeNumber = await allocateHrEmployeeNumber(
        orgId,
        payload.position ?? 'Staff',
        tenant?.organizationCode
      );
      const created = await prisma.employee.create({
        data: {
          organizationId: orgId,
          employeeNumber,
          ...employeeData,
        },
      });
      employeeId = created.id;
    }

    return { hrEmployeeId: employeeId, created: !existing, updated: Boolean(existing) };
  }
}

export const employeeSyncService = new EmployeeSyncService();
