import { SchoolRegistrationStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { fetchIamOrganizationProfile, verifyOrganizationAdminEmail } from '../clients/iam.client';
import { fetchClassesList, isStudentManagementConfigured } from '../clients/student-management.client';
import { AppError } from '../middleware/error.middleware';

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

/** Treat 04001 and 4001 as equivalent when both are numeric org codes. */
function schoolCodesMatch(input: string, candidate: string) {
  const a = normalizeCode(input);
  const b = normalizeCode(candidate);
  if (a === b) return true;
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
    return BigInt(a) === BigInt(b);
  }
  return false;
}

function codeInSet(input: string, codes: string[]) {
  return codes.some((c) => schoolCodesMatch(input, c));
}

async function resolveAllowedSchoolCodes(
  organizationId: string,
  tenant: { organizationCode: string | null; schoolCode: string | null }
) {
  const codes = new Set<string>();
  for (const c of [tenant.organizationCode, tenant.schoolCode]) {
    if (c?.trim()) codes.add(normalizeCode(c));
  }

  const reg = await prisma.schoolRegistration.findFirst({
    where: { organizationId, status: SchoolRegistrationStatus.APPROVED },
    select: { schoolCode: true },
  });
  if (reg?.schoolCode?.trim()) codes.add(normalizeCode(reg.schoolCode));

  const iam = await fetchIamOrganizationProfile(organizationId);
  if (iam?.organizationCode?.trim()) codes.add(normalizeCode(iam.organizationCode));

  return { codes: [...codes], iamOrganizationCode: iam?.organizationCode?.trim() ?? null };
}

export async function connectStudentManagement(
  organizationId: string,
  input: { schoolCode: string; adminEmail: string }
) {
  const schoolCode = normalizeCode(input.schoolCode);
  const adminEmail = input.adminEmail.trim().toLowerCase();
  if (!schoolCode || schoolCode.length < 2) {
    throw new AppError(400, 'Enter your registered school code.');
  }
  if (!adminEmail || !adminEmail.includes('@')) {
    throw new AppError(400, 'Enter a valid organization admin email.');
  }

  const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
  if (!tenant) {
    throw new AppError(403, 'School tenant is not provisioned.');
  }

  const { codes, iamOrganizationCode } = await resolveAllowedSchoolCodes(organizationId, tenant);
  if (!codes.length || !codeInSet(schoolCode, codes)) {
    const hint = iamOrganizationCode
      ? ` For this school in Authentication, use org code ${iamOrganizationCode}.`
      : '';
    throw new AppError(
      400,
      `School code does not match this organization. Use the org code shown in Authentication (Super Admin → Organizations).${hint}`
    );
  }

  let adminVerified = await verifyOrganizationAdminEmail(organizationId, adminEmail);
  if (!adminVerified) {
    const reg = await prisma.schoolRegistration.findFirst({
      where: { organizationId, status: SchoolRegistrationStatus.APPROVED },
      select: { accountEmail: true },
    });
    if (reg?.accountEmail?.trim().toLowerCase() === adminEmail) {
      adminVerified = true;
    }
    const iam = await fetchIamOrganizationProfile(organizationId);
    if (iam?.email?.trim().toLowerCase() === adminEmail) {
      adminVerified = true;
    }
  }
  if (!adminVerified) {
    throw new AppError(
      403,
      'Organization admin email does not match an active organization admin in Authentication for this school.'
    );
  }

  if (iamOrganizationCode && !tenant.organizationCode) {
    await prisma.tenant.update({
      where: { organizationId },
      data: { organizationCode: iamOrganizationCode },
    });
  } else if (
    iamOrganizationCode &&
    tenant.organizationCode &&
    schoolCodesMatch(iamOrganizationCode, schoolCode) &&
    !schoolCodesMatch(tenant.organizationCode, iamOrganizationCode)
  ) {
    await prisma.tenant.update({
      where: { organizationId },
      data: { organizationCode: iamOrganizationCode },
    });
  }

  const smReady = isStudentManagementConfigured();
  let classCount = 0;
  if (smReady) {
    const classes = await fetchClassesList(organizationId);
    classCount = classes.length;
  }

  return {
    connected: true,
    organizationName: tenant.organizationName,
    schoolCode,
    studentManagementConfigured: smReady,
    classCount,
    message: smReady
      ? 'Connected. You can load students and classes from Student Management.'
      : 'Credentials verified. Configure STUDENT_MANAGEMENT_API_URL on ShuleTrip to sync learners.',
  };
}
