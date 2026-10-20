import { Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { formatStaffNumber } from '../constants/payroll.constants';
import type { HrEmployeeSyncPayload } from '../types/employee-sync';
import { hrClient } from '../clients/hr.client';
import { AppError } from '../middleware/error.middleware';

function normalizeGender(value?: string | null): string {
  const v = (value ?? '').trim().toUpperCase();
  if (v.startsWith('F')) return 'FEMALE';
  if (v.startsWith('M')) return 'MALE';
  return 'OTHER';
}

async function findExistingStaff(orgId: string, payload: HrEmployeeSyncPayload) {
  if (payload.payrollStaffId) {
    const byLink = await prisma.payrollStaff.findFirst({
      where: { organizationId: orgId, id: payload.payrollStaffId, deletedAt: null },
    });
    if (byLink) return byLink;
  }

  const byHrId = await prisma.payrollStaff.findFirst({
    where: { organizationId: orgId, hrEmployeeId: payload.hrEmployeeId, deletedAt: null },
  });
  if (byHrId) return byHrId;

  const matchers: Prisma.PayrollStaffWhereInput[] = [];
  if (payload.nationalId?.trim()) matchers.push({ nationalId: payload.nationalId.trim() });
  if (payload.rssbNumber?.trim()) matchers.push({ rssbNumber: payload.rssbNumber.trim() });
  if (payload.email?.trim()) matchers.push({ email: { equals: payload.email.trim(), mode: 'insensitive' } });
  if (payload.phone?.trim()) matchers.push({ phone: payload.phone.trim() });

  if (!matchers.length) return null;
  return prisma.payrollStaff.findFirst({
    where: { organizationId: orgId, deletedAt: null, OR: matchers },
  });
}

export class StaffSyncService {
  async upsertFromHr(orgId: string, payload: HrEmployeeSyncPayload) {
    const existing = await findExistingStaff(orgId, payload);
    const isTerminated = payload.status === 'TERMINATED';
    const staffData = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      gender: normalizeGender(payload.gender),
      dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
      hireDate: payload.hireDate ? new Date(payload.hireDate) : new Date(),
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      nationalId: payload.nationalId?.trim() || null,
      rssbNumber: payload.rssbNumber?.trim() || null,
      department: payload.department?.trim() || null,
      position: payload.position?.trim() || 'Staff',
      bankName: payload.bankName?.trim() || null,
      bankAccount: payload.bankAccount?.trim() || null,
      status: payload.status,
      isActive: !isTerminated,
      isProtected: Boolean(payload.isProtected),
      hrEmployeeId: payload.hrEmployeeId,
      hrProfile: {
        ...((payload.hrProfile as Record<string, unknown>) ?? {}),
        contractType: payload.contractType ?? 'PERMANENT',
        middleName: payload.middleName ?? null,
        hrEmployeeNumber: payload.employeeNumber,
      } as Prisma.InputJsonValue,
    };

    let staffId: string;

    if (existing) {
      await prisma.payrollStaff.update({
        where: { id: existing.id },
        data: {
          ...staffData,
          ...(payload.employeeNumber?.trim()
            ? { employeeNumber: payload.employeeNumber.trim() }
            : {}),
        },
      });
      staffId = existing.id;
    } else {
      const count = await prisma.payrollStaff.count({ where: { organizationId: orgId } });
      const created = await prisma.payrollStaff.create({
        data: {
          organizationId: orgId,
          employeeNumber: payload.employeeNumber?.trim() || formatStaffNumber(count + 1),
          ...staffData,
        },
      });
      staffId = created.id;
    }

    if (
      payload.basicSalary != null ||
      payload.transportAllowance != null ||
      payload.housingAllowance != null ||
      payload.othersAllowance != null
    ) {
      await prisma.staffPayrollProfile.upsert({
        where: { staffId },
        create: {
          organizationId: orgId,
          staffId,
          basicSalary: Number(payload.basicSalary ?? 0),
          transportAllowance: Number(payload.transportAllowance ?? 0),
          housingAllowance: Number(payload.housingAllowance ?? 0),
          othersAllowance: Number(payload.othersAllowance ?? 0),
        },
        update: {
          basicSalary: Number(payload.basicSalary ?? 0),
          transportAllowance: Number(payload.transportAllowance ?? 0),
          housingAllowance: Number(payload.housingAllowance ?? 0),
          othersAllowance: Number(payload.othersAllowance ?? 0),
        },
      });
    }

    return { payrollStaffId: staffId, created: !existing, updated: Boolean(existing) };
  }

  async syncAllFromHr(orgId: string) {
    if (!hrClient.isEnabled()) {
      throw new AppError(400, 'HR_API_URL is not configured — cannot sync employees from HR');
    }

    const employees = await hrClient.listEmployeesForSync(orgId);
    if (!employees?.length) {
      return { total: 0, created: 0, updated: 0 };
    }

    let created = 0;
    let updated = 0;
    for (const employee of employees) {
      const result = await this.upsertFromHr(orgId, employee);
      if (result.created) created += 1;
      else updated += 1;
    }

    return { total: employees.length, created, updated };
  }
}

export const staffSyncService = new StaffSyncService();
