import { prisma } from '../config/database';
import { hrClient } from '../clients/hr.client';

export async function pushStaffToHr(orgId: string, staffId: string) {
  if (!hrClient.isEnabled()) return;

  const staff = await prisma.payrollStaff.findFirst({
    where: { id: staffId, organizationId: orgId },
    include: { profile: true },
  });
  if (!staff) return;

  const result = await hrClient.syncStaff(orgId, {
    id: staff.id,
    hrEmployeeId: staff.hrEmployeeId,
    employeeNumber: staff.employeeNumber,
    firstName: staff.firstName,
    lastName: staff.lastName,
    gender: staff.gender,
    dateOfBirth: staff.dateOfBirth?.toISOString() ?? null,
    email: staff.email,
    phone: staff.phone,
    nationalId: staff.nationalId,
    rssbNumber: staff.rssbNumber,
    department: staff.department,
    position: staff.position,
    status: staff.deletedAt ? 'TERMINATED' : staff.status,
    hireDate: staff.hireDate?.toISOString() ?? null,
    bankName: staff.bankName,
    bankAccount: staff.bankAccount,
    basicSalary: staff.profile ? Number(staff.profile.basicSalary) : 0,
    isProtected: staff.isProtected,
    hrProfile: staff.hrProfile,
    profile: staff.profile,
  });

  if (result?.hrEmployeeId && result.hrEmployeeId !== staff.hrEmployeeId) {
    await prisma.payrollStaff.update({
      where: { id: staffId },
      data: { hrEmployeeId: result.hrEmployeeId },
    });
  }
}
