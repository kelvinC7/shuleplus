import { AppError } from '../middleware/error.middleware';
import type { JwtPayload } from '../middleware/auth.middleware';
import { isSuperAdmin, hasPlatformPrintScope, isPrintCardOperator } from '../middleware/auth.middleware';
import {
  fetchIamOrganizations,
  fetchIamSchoolProfile,
  proxyIamSmartAccess,
  upstreamClients,
  type PrintCardClass,
  type PrintCardSchool,
  type PrintCardStaff,
  type PrintCardStudent,
} from '../clients/upstream.client';
import { mergeRegisteredStaffForCards } from './staff-merge.service';

function assertOrgAccess(user: JwtPayload, organizationId: string) {
  if (hasPlatformPrintScope(user)) return;
  if (user.organizationId !== organizationId) {
    throw new AppError(403, 'You can only access your organization');
  }
}

export const printCardService = {
  async listSchools(
    user: JwtPayload,
    bearerToken: string,
    filters?: {
      provinceId?: string;
      districtId?: string;
      sectorId?: string;
      search?: string;
    }
  ): Promise<PrintCardSchool[]> {
    if (hasPlatformPrintScope(user)) {
      if (isSuperAdmin(user)) {
        return proxyIamSmartAccess<PrintCardSchool[]>(bearerToken, '/super-admin/smart-access/schools', {
          provinceId: filters?.provinceId,
          districtId: filters?.districtId,
          sectorId: filters?.sectorId,
          search: filters?.search,
        });
      }
      return fetchIamOrganizations(filters);
    }

    const school = await fetchIamSchoolProfile(user.organizationId);
    if (!school) {
      throw new AppError(404, 'Organization profile not found');
    }
    return [school];
  },

  async listClasses(user: JwtPayload, organizationId: string): Promise<PrintCardClass[]> {
    assertOrgAccess(user, organizationId);
    try {
      const rows = await upstreamClients.listClasses(organizationId);
      return [...rows].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    } catch {
      return [];
    }
  },

  async listStudents(
    user: JwtPayload,
    bearerToken: string,
    organizationId: string,
    opts?: { search?: string; academicYear?: string; classId?: string; className?: string }
  ): Promise<PrintCardStudent[]> {
    assertOrgAccess(user, organizationId);

    if (hasPlatformPrintScope(user)) {
      if (isSuperAdmin(user)) {
        return proxyIamSmartAccess<PrintCardStudent[]>(
          bearerToken,
          `/super-admin/smart-access/schools/${organizationId}/students`,
          {
            search: opts?.search,
            academicYear: opts?.academicYear,
            classId: opts?.classId,
            className: opts?.className,
          }
        );
      }
      return upstreamClients.listStudents(organizationId, opts);
    }

    return upstreamClients.listStudents(organizationId, opts);
  },

  async listStaff(
    user: JwtPayload,
    _bearerToken: string,
    organizationId: string,
    opts?: { search?: string }
  ): Promise<PrintCardStaff[]> {
    assertOrgAccess(user, organizationId);

    const [hrRows, iamRows, timetableRows] = await Promise.all([
      upstreamClients.listStaffFromHr(organizationId, opts),
      upstreamClients.listStaffFromIam(organizationId, opts),
      upstreamClients.listStaffFromTimetable(organizationId, opts),
    ]);
    return mergeRegisteredStaffForCards(hrRows, iamRows, timetableRows, opts?.search);
  },

  async sessionSummary(user: JwtPayload) {
    const platformScope = hasPlatformPrintScope(user);
    return {
      userId: user.sub,
      email: user.email,
      organizationId: user.organizationId,
      roles: user.roles,
      isSuperAdmin: isSuperAdmin(user),
      isPrintCardOperator: isPrintCardOperator(user),
      canSelectSchools: platformScope,
      module: 'print-card',
    };
  },
};
