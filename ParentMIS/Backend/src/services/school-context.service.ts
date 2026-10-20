import { fetchOrganizationAcademicSettings, resolveSchoolAcademicPeriod } from './iam-api';

export const schoolContextService = {
  getAcademicSettings: fetchOrganizationAcademicSettings,
  resolvePeriod: resolveSchoolAcademicPeriod,
};
