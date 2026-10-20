import { prisma } from '../config/database';
import { payrollClient } from '../clients/payroll.client';

export async function pushEmployeeToPayroll(orgId: string, employeeId: string) {
  if (!payrollClient.isEnabled()) return;

  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: orgId },
    include: { department: true },
  });
  if (!emp) return;

  const result = await payrollClient.syncEmployee(orgId, {
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
    status: emp.deletedAt ? 'TERMINATED' : emp.status,
    hireDate: emp.hireDate,
    basicSalary: emp.basicSalary ? Number(emp.basicSalary) : null,
    isProtected: emp.isProtected,
    hrProfile: emp.hrProfile,
  });

  if (result?.payrollStaffId && result.payrollStaffId !== emp.payrollStaffId) {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { payrollStaffId: result.payrollStaffId },
    });
  }
}
