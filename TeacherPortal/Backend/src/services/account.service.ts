import { shuleAvanceService } from './shule-avance.service';
import {
  registrationPathFromLink,
  resolveTimetableTeacherLink,
} from './teacher-link.service';

export async function getAccountProfile(
  organizationId: string,
  userId: string,
  email: string,
  roles: string[],
  modules: string[]
) {
  const { prisma } = await import('../config/database');
  const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
  const timetable = await resolveTimetableTeacherLink(organizationId, userId, email);

  const eligibility = await shuleAvanceService.buildEligibility(organizationId, userId, {
    email,
  });
  const payroll = await shuleAvanceService.getPayrollSummary(organizationId, userId);
  const snapshot = await shuleAvanceService.getStaffSnapshot(organizationId, userId);

  const registrationPath = registrationPathFromLink(timetable, Boolean(snapshot));

  return {
    userId,
    email,
    roles,
    modules,
    organizationId,
    organizationName: tenant?.organizationName ?? 'Your school',
    displayName: snapshot?.displayName ?? timetable.profile?.teacherName ?? null,
    timetable: timetable.profile,
    emailAligned: timetable.emailMatched,
    registrationPath,
    teachingActive: timetable.linked,
    salaryAdvance: {
      payrollModuleEnabled: payroll.payroll_module_enabled,
      linked: payroll.source !== 'not-linked',
      eligible: payroll.ticha_avance_eligible,
      allowed: eligibility.allowed,
      status: eligibility.status,
      message: eligibility.message,
      netSalaryRwf: payroll.net_salary_rwf,
      employeeNumber: payroll.employee_number,
      syncedAt: payroll.synced_at,
      source: payroll.source,
      timetableLinked: eligibility.timetable_linked ?? timetable.linked,
      registrationVia: eligibility.registration_via ?? registrationPath,
    },
  };
}
