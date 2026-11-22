import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { TripPortalAccountKind, SchoolRegistrationStatus } from '../generated/prisma';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { hashPassword, verifyPassword } from '../utils/password';
import { tenantService } from './tenant.service';
import { sendSchoolRegistrationConfirmationEmail } from './registration-email.service';
import { verifyIamShuleTripOfficialLogin } from '../clients/iam.client';

function signToken(payload: {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
  authSource?: 'shule_trip_portal';
  name?: string;
  district?: string;
  tripRoleSlug?: string;
  canFinalApprove?: boolean;
}) {
  const { authSource, ...rest } = payload;
  return jwt.sign(
    {
      ...rest,
      ...(authSource ? { authSource } : {}),
      ...(payload.canFinalApprove ? { canFinalApprove: true } : {}),
      sessionId: randomUUID(),
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '12h' }
  );
}

export async function ensurePortalSeedUsers() {
  const defaults: Array<{
    kind: TripPortalAccountKind;
    username: string;
    email: string;
    password: string;
    roles: string[];
    displayName: string;
    district?: string;
    tripRoleSlug?: string;
  }> = [
    {
      kind: TripPortalAccountKind.SUPER_ADMIN,
      username: 'superadmin',
      email: 'superadmin@shuletrip.local',
      password: process.env.SHULETRIP_SUPERADMIN_PASSWORD ?? 'SuperAdmin@2026',
      roles: ['super_admin'],
      displayName: 'ShuleTrip Super Admin',
    },
    {
      kind: TripPortalAccountKind.GOVERNMENT,
      username: 'gov.reviewer',
      email: 'gov.reviewer@shuletrip.local',
      password: process.env.SHULETRIP_GOV_PASSWORD ?? 'GovReview@2026',
      roles: ['district_education_officer'],
      displayName: 'District Education Officer',
      district: 'Gasabo',
      tripRoleSlug: 'district_education_officer',
    },
  ];

  for (const d of defaults) {
    const existing = await prisma.tripPortalUser.findUnique({ where: { username: d.username } });
    if (existing) continue;
    await prisma.tripPortalUser.create({
      data: {
        kind: d.kind,
        username: d.username,
        email: d.email,
        passwordHash: hashPassword(d.password),
        roles: d.roles,
        modules: ['shule-trip'],
        displayName: d.displayName,
        district: d.district,
        organizationId: d.kind === TripPortalAccountKind.SUPER_ADMIN ? 'platform' : 'government',
        organizationName: d.kind === TripPortalAccountKind.SUPER_ADMIN ? 'ShuleTrip Platform' : 'Government',
      },
    });
  }
}

type RegistrationPayload = {
  step1?: { email?: string };
};

async function findSchoolRegistrationForLogin(identifier: string) {
  const loginId = identifier.trim().toLowerCase();
  if (!loginId) return null;

  const byAccount = await prisma.schoolRegistration.findFirst({
    where: {
      OR: [
        { username: { equals: loginId, mode: 'insensitive' } },
        { accountEmail: { equals: loginId, mode: 'insensitive' } },
      ],
    },
  });
  if (byAccount) return byAccount;

  const recent = await prisma.schoolRegistration.findMany({
    orderBy: { submittedAt: 'desc' },
    take: 300,
  });
  return (
    recent.find((row) => {
      const schoolEmail = (row.payload as RegistrationPayload)?.step1?.email?.trim().toLowerCase();
      return schoolEmail === loginId;
    }) ?? null
  );
}

export async function loginPortal(input: {
  portal: 'school' | 'government' | 'superadmin';
  username: string;
  password: string;
}) {
  const username = input.username.trim().toLowerCase();

  if (input.portal === 'school') {
    const reg = await findSchoolRegistrationForLogin(input.username);
    if (!reg) {
      throw new AppError(
        401,
        'No ShuleTrip school account matches this username or email. Use your registration username, account email, or the School tab (not Government).'
      );
    }
    if (!verifyPassword(input.password, reg.passwordHash)) {
      throw new AppError(401, 'Incorrect password for this school account.');
    }
    if (reg.status !== SchoolRegistrationStatus.APPROVED) {
      const pendingMessage: Partial<Record<SchoolRegistrationStatus, string>> = {
        [SchoolRegistrationStatus.SUBMITTED]:
          'Your registration was received and is waiting for review. You can sign in after your school is approved.',
        [SchoolRegistrationStatus.UNDER_REVIEW]:
          'Your registration is being reviewed. Sign in will work once your school is approved.',
        [SchoolRegistrationStatus.ADDITIONAL_INFO_REQUIRED]:
          'We need more information about your registration. Check your email or contact support, then try again after approval.',
        [SchoolRegistrationStatus.REJECTED]:
          'This school registration was not approved. Contact support if you believe this is a mistake.',
        [SchoolRegistrationStatus.SUSPENDED]:
          'This school account is suspended. Contact support for help.',
        [SchoolRegistrationStatus.DRAFT]:
          'Complete and submit your school registration before signing in.',
      };
      const message =
        pendingMessage[reg.status] ??
        `Your school account is not active yet (${reg.status.replace(/_/g, ' ').toLowerCase()}). Contact support.`;
      const awaitingApproval =
        reg.status === SchoolRegistrationStatus.SUBMITTED ||
        reg.status === SchoolRegistrationStatus.UNDER_REVIEW ||
        reg.status === SchoolRegistrationStatus.ADDITIONAL_INFO_REQUIRED;
      throw new AppError(403, message, awaitingApproval ? 'REGISTRATION_PENDING' : 'REGISTRATION_INACTIVE');
    }
    if (!reg.organizationId) {
      throw new AppError(403, 'School organization is not provisioned yet.');
    }

    const token = signToken({
      sub: reg.id,
      email: reg.accountEmail,
      organizationId: reg.organizationId,
      roles: ['organization_admin'],
      modules: ['shule-trip'],
      authSource: 'shule_trip_portal',
      name: reg.officialName,
      district: (reg.payload as { step2?: { districtName?: string } })?.step2?.districtName,
    });

    return { accessToken: token, portal: 'school' as const };
  }

  const kind =
    input.portal === 'superadmin' ? TripPortalAccountKind.SUPER_ADMIN : TripPortalAccountKind.GOVERNMENT;

  const user = await prisma.tripPortalUser.findFirst({
    where: {
      kind,
      OR: [{ username: { equals: username, mode: 'insensitive' } }, { email: { equals: username, mode: 'insensitive' } }],
    },
  });

  if (user && verifyPassword(input.password, user.passwordHash)) {
    const roles = Array.isArray(user.roles) ? (user.roles as string[]) : [];
    const modules = Array.isArray(user.modules) ? (user.modules as string[]) : ['shule-trip'];
    const tripRoleSlug = roles.find((r) => env.GOVERNMENT_ROLES.includes(r));

    const token = signToken({
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId ?? 'platform',
      roles,
      modules,
      authSource: 'shule_trip_portal',
      name: user.displayName ?? user.username,
      district: user.district ?? undefined,
      tripRoleSlug,
    });

    return { accessToken: token, portal: input.portal };
  }

  if (input.portal === 'government') {
    const official = await verifyIamShuleTripOfficialLogin(input.username, input.password);
    if (official) {
      const token = signToken({
        sub: official.id,
        email: official.email,
        organizationId: official.organizationId,
        roles: official.roles,
        modules: official.modules,
        authSource: 'shule_trip_portal',
        name: official.name,
        district: official.district,
        tripRoleSlug: official.tripRoleSlug,
        canFinalApprove: official.canFinalApprove,
      });
      return { accessToken: token, portal: 'government' as const };
    }
  }

  throw new AppError(401, 'Invalid credentials');
}

export async function submitSchoolRegistration(input: {
  reference: string;
  schoolCode: string;
  officialName: string;
  accountEmail: string;
  username: string;
  password: string;
  payload: unknown;
}) {
  const schoolCode = input.schoolCode.trim().toUpperCase();
  const username = input.username.trim().toLowerCase();

  const dup = await prisma.schoolRegistration.findFirst({
    where: {
      OR: [{ schoolCode }, { username }, { reference: input.reference }],
    },
  });
  if (dup) {
    throw new AppError(409, 'School code or username already registered');
  }

  const row = await prisma.schoolRegistration.create({
    data: {
      reference: input.reference,
      schoolCode,
      officialName: input.officialName.trim(),
      accountEmail: input.accountEmail.trim().toLowerCase(),
      username,
      passwordHash: hashPassword(input.password),
      payload: input.payload as object,
      status: SchoolRegistrationStatus.SUBMITTED,
    },
  });

  const confirmationEmailSent = await sendSchoolRegistrationConfirmationEmail({
    to: row.accountEmail,
    schoolName: row.officialName,
    reference: row.reference,
    username: row.username,
    password: input.password,
    loginUrl: env.SHULETRIP_PUBLIC_LOGIN_URL,
  });

  return { row, confirmationEmailSent };
}

export async function listSchoolRegistrations() {
  return prisma.schoolRegistration.findMany({
    orderBy: { submittedAt: 'desc' },
    select: {
      id: true,
      reference: true,
      status: true,
      schoolCode: true,
      officialName: true,
      accountEmail: true,
      username: true,
      submittedAt: true,
      reviewedAt: true,
      reviewNote: true,
      organizationId: true,
      payload: true,
    },
  });
}

export async function reviewSchoolRegistration(
  id: string,
  decision: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW' | 'ADDITIONAL_INFO_REQUIRED',
  reviewNote: string | undefined,
  reviewer: string
) {
  const reg = await prisma.schoolRegistration.findUnique({ where: { id } });
  if (!reg) throw new AppError(404, 'Registration not found');

  let organizationId = reg.organizationId;
  if (decision === 'APPROVED' && !organizationId) {
    organizationId = randomUUID();
    const payload = reg.payload as { step2?: { districtName?: string; sectorName?: string } };
    await tenantService.createTenant({
      organizationId,
      organizationName: reg.officialName,
      organizationCode: reg.schoolCode,
      schoolProfile: {
        schoolCode: reg.schoolCode,
        district: payload?.step2?.districtName ?? null,
        sector: payload?.step2?.sectorName ?? null,
      },
    });
  }

  return prisma.schoolRegistration.update({
    where: { id },
    data: {
      status: decision as SchoolRegistrationStatus,
      reviewNote: reviewNote ?? null,
      reviewedAt: new Date(),
      reviewedBy: reviewer,
      organizationId: organizationId ?? undefined,
    },
  });
}
