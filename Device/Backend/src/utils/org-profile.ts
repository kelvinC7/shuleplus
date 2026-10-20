import { prisma } from '../config/database';
import { fetchTenantProfile } from '../clients/student-management.client';
import { getDistrictCode, parseSchoolCodeNumeric } from './device-code';

export type OrgProfile = {
  district: string | null;
  districtCode: string;
  schoolCode: string;
  schoolCodeNumeric: string;
};

export async function resolveOrgProfile(organizationId: string): Promise<OrgProfile> {
  const sm = await fetchTenantProfile(organizationId);
  const local = await prisma.tenant.findFirst({ where: { organizationId } });

  const district = sm?.district ?? local?.district ?? null;
  const schoolCode =
    sm?.schoolCode ?? local?.organizationCode ?? sm?.organizationCode ?? local?.organizationCode ?? '001';

  const districtCode = getDistrictCode(district);
  const schoolCodeNumeric = parseSchoolCodeNumeric(schoolCode);

  return { district, districtCode, schoolCode, schoolCodeNumeric };
}
