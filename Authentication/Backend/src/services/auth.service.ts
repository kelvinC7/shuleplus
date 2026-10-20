import { AuditAction, UserStatus } from '../generated/prisma';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { getRedis } from '../config/redis';
import { expandModuleSlugsForJwt } from '../config/local-module-urls';
import { ROLES, PLATFORM_ORG_SLUG, resolveDashboardRoute } from '../constants/roles';
import { mfaService } from './mfa.service';
import { moduleManagementService } from './module-management.service';
import { platformUsersService } from './platform-users.service';
import { checkGateOfficer } from '../clients/discipline.client';
import { AppError } from '../middleware/error.middleware';
import { JwtPayload } from '../middleware/auth.middleware';
import {
  comparePassword,
  hashPassword,
  hashToken,
  parseUserAgent,
  signAccessToken,
  signRefreshToken,
  validatePasswordPolicy,
} from '../utils/security';
import { sendPasswordResetEmail, sendPasswordResetOtpEmail } from '../utils/email';
import { resolveLoginIdentifier } from '../utils/login-identifier';

interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

const PASSWORD_RESET_TTL_SECONDS = 60 * 60; // 1 hour
const PASSWORD_RESET_OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const memoryResetByToken = new Map<string, { userId: string; email: string; expiresAt: number }>();
const memoryResetByUser = new Map<string, string>();
const memoryResetOtpByEmail = new Map<
  string,
  { userId: string; email: string; codeHash: string; expiresAt: number }
>();

type ResetPayload = { userId: string; email: string };

async function storePasswordResetToken(userId: string, email: string, rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const payload: ResetPayload = { userId, email };
  const redis = getRedis();

  if (redis) {
    try {
      const prevHash = await redis.get(`auth:password-reset-user:${userId}`);
      if (prevHash) await redis.del(`auth:password-reset:${prevHash}`);
      await redis.setex(
        `auth:password-reset:${tokenHash}`,
        PASSWORD_RESET_TTL_SECONDS,
        JSON.stringify(payload)
      );
      await redis.setex(
        `auth:password-reset-user:${userId}`,
        PASSWORD_RESET_TTL_SECONDS,
        tokenHash
      );
      return;
    } catch {
      /* fall through to memory */
    }
  }

  const prev = memoryResetByUser.get(userId);
  if (prev) memoryResetByToken.delete(prev);
  memoryResetByToken.set(tokenHash, {
    ...payload,
    expiresAt: Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000,
  });
  memoryResetByUser.set(userId, tokenHash);
}

async function consumePasswordResetToken(rawToken: string): Promise<ResetPayload | null> {
  const tokenHash = hashToken(rawToken);
  const redis = getRedis();

  if (redis) {
    try {
      const raw = await redis.get(`auth:password-reset:${tokenHash}`);
      if (raw) {
        const payload = JSON.parse(raw) as ResetPayload;
        await redis.del(`auth:password-reset:${tokenHash}`);
        await redis.del(`auth:password-reset-user:${payload.userId}`);
        return payload;
      }
    } catch {
      /* fall through to memory */
    }
  }

  const stored = memoryResetByToken.get(tokenHash);
  if (!stored) return null;
  memoryResetByToken.delete(tokenHash);
  memoryResetByUser.delete(stored.userId);
  if (stored.expiresAt < Date.now()) return null;
  return { userId: stored.userId, email: stored.email };
}

function hashPasswordResetOtp(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

function generatePasswordResetOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function passwordResetOtpRedisKey(email: string): string {
  return `auth:password-reset-otp:${email.toLowerCase().trim()}`;
}

async function storePasswordResetOtp(userId: string, email: string, code: string) {
  const normalized = email.toLowerCase().trim();
  const codeHash = hashPasswordResetOtp(code);
  const payload = { userId, email: normalized, codeHash };
  const redis = getRedis();

  if (redis) {
    try {
      await redis.setex(
        passwordResetOtpRedisKey(normalized),
        PASSWORD_RESET_OTP_TTL_SECONDS,
        JSON.stringify(payload)
      );
      return;
    } catch {
      /* fall through to memory */
    }
  }

  memoryResetOtpByEmail.set(normalized, {
    ...payload,
    expiresAt: Date.now() + PASSWORD_RESET_OTP_TTL_SECONDS * 1000,
  });
}

async function consumePasswordResetOtp(
  email: string,
  code: string
): Promise<ResetPayload | null> {
  const normalized = email.toLowerCase().trim();
  const codeHash = hashPasswordResetOtp(code);
  const redis = getRedis();

  if (redis) {
    try {
      const raw = await redis.get(passwordResetOtpRedisKey(normalized));
      if (raw) {
        const stored = JSON.parse(raw) as { userId: string; email: string; codeHash: string };
        if (stored.codeHash !== codeHash) return null;
        await redis.del(passwordResetOtpRedisKey(normalized));
        return { userId: stored.userId, email: stored.email };
      }
    } catch {
      /* fall through to memory */
    }
  }

  const stored = memoryResetOtpByEmail.get(normalized);
  if (!stored || stored.expiresAt < Date.now()) {
    memoryResetOtpByEmail.delete(normalized);
    return null;
  }
  if (stored.codeHash !== codeHash) return null;
  memoryResetOtpByEmail.delete(normalized);
  return { userId: stored.userId, email: stored.email };
}

export class AuthService {
  async login(input: LoginInput) {
    const { identifier, phone } = resolveLoginIdentifier(input.email);

    const user = await prisma.user.findFirst({
      where: phone
        ? { OR: [{ email: identifier.toLowerCase() }, { phone }] }
        : { email: identifier.toLowerCase() },
      include: {
        organization: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        mfaSecret: true,
      },
    });

    if (!user) {
      await this.logAudit(null, null, AuditAction.LOGIN_FAILED, {
        email: input.email,
        reason: 'user_not_found',
      });
      throw new AppError(401, 'Invalid email or password');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(423, 'Account temporarily locked. Try again later.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(403, 'Account has been suspended');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new AppError(403, 'Account is inactive');
    }

    const roles = user.userRoles.map((ur) => ur.role.slug);
    const isRootAdmin = roles.includes(ROLES.ROOT_ADMIN);
    const isSuperAdmin = roles.includes(ROLES.SUPER_ADMIN);
    const isPlatformAdmin = isRootAdmin || isSuperAdmin;

    const platformSettings = await prisma.platformSettings.findUnique({
      where: { id: 'platform' },
    });

    if (platformSettings?.loginsDisabled && !isPlatformAdmin) {
      throw new AppError(503, 'Logins are temporarily disabled');
    }

    if (platformSettings?.maintenanceMode && !isPlatformAdmin) {
      throw new AppError(503, 'System is under maintenance');
    }

    if (user.organization.status !== 'ACTIVE' && user.organization.slug !== PLATFORM_ORG_SLUG) {
      throw new AppError(403, 'Organization is not active');
    }

    const passwordValid = await comparePassword(input.password, user.passwordHash);

    if (!passwordValid) {
      const failedCount = user.failedLoginCount + 1;
      const updates: { failedLoginCount: number; lockedUntil?: Date } = {
        failedLoginCount: failedCount,
      };

      if (failedCount >= env.MAX_LOGIN_ATTEMPTS) {
        updates.lockedUntil = new Date(
          Date.now() + env.LOCKOUT_DURATION_MINUTES * 60 * 1000
        );
      }

      await prisma.user.update({ where: { id: user.id }, data: updates });
      await this.logAudit(user.organizationId, user.id, AuditAction.LOGIN_FAILED, {
        failedCount,
      });
      throw new AppError(401, 'Invalid email or password');
    }

    if (user.mfaEnabled && user.mfaSecret?.isVerified) {
      const mfaSessionToken = await mfaService.createMfaSession({
        userId: user.id,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        rememberMe: input.rememberMe,
      });
      const otpResult = await mfaService.sendEmailOtp(user.id, user.email);
      return {
        requiresMfa: true,
        mfaSessionToken,
        userId: user.id,
        methods: ['email_otp', 'authenticator'],
        authenticatorEnabled: true,
        otpDelivery: {
          email: otpResult.emailSent,
          sms: otpResult.smsSent,
          phoneMasked: otpResult.phoneMasked,
        },
        deliveryMessage: otpResult.message,
        devOtpHint: otpResult.devMode ? otpResult.message : undefined,
      };
    }

    if (isPlatformAdmin) {
      return this.beginEmailOtpLoginChallenge(user, input);
    }

    const isSchoolRepresentative = roles.includes(ROLES.SCHOOL_REPRESENTATIVE);
    if (isSchoolRepresentative) {
      const repProfile = await prisma.schoolRepresentativeProfile.findUnique({
        where: { userId: user.id },
        select: { enforceMfa: true },
      });
      if (repProfile?.enforceMfa) {
        return this.beginEmailOtpLoginChallenge(user, input);
      }
    }

    const isChiefAccountant = roles.includes(ROLES.CHIEF_ACCOUNTANT);
    if (isChiefAccountant) {
      const chiefProfile = await prisma.chiefAccountantProfile.findUnique({
        where: { userId: user.id },
        select: { enforceMfa: true },
      });
      if (chiefProfile?.enforceMfa) {
        return this.beginEmailOtpLoginChallenge(user, input);
      }
    }

    const isSeiOfficer = roles.includes(ROLES.SECTOR_EDUCATION_INSPECTOR);
    if (isSeiOfficer) {
      const seiProfile = await prisma.seiOfficerProfile.findUnique({
        where: { userId: user.id },
        select: { enforceMfa: true },
      });
      if (seiProfile?.enforceMfa !== false) {
        return this.beginEmailOtpLoginChallenge(user, input);
      }
    }

    const isDeoOfficer = roles.includes(ROLES.DISTRICT_EDUCATION_OFFICER);
    if (isDeoOfficer) {
      const deoProfile = await prisma.deoOfficerProfile.findUnique({
        where: { userId: user.id },
        select: { enforceMfa: true },
      });
      if (deoProfile?.enforceMfa !== false) {
        return this.beginEmailOtpLoginChallenge(user, input);
      }
    }

    return this.createSessionAndTokens(user, input);
  }

  async getUserById(userId: string) {
    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
    });
  }

  async findUserByOrgEmail(organizationId: string, email: string) {
    return prisma.user.findFirst({
      where: {
        organizationId,
        email: { equals: email.trim(), mode: 'insensitive' },
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        employeeId: true,
      },
    });
  }

  async completeLoginAfterMfa(
    userId: string,
    input: { ipAddress?: string; userAgent?: string; rememberMe?: boolean }
  ) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        organization: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
        mfaSecret: true,
      },
    });

    return this.createSessionAndTokens(
      {
        ...user,
        mustChangePassword: user.mustChangePassword,
        mfaEnabled: user.mfaEnabled,
      },
      input
    );
  }

  /** Email (and optional authenticator) OTP step — used for platform admins and reps with enforceMfa. */
  private async beginEmailOtpLoginChallenge(
    user: {
      id: string;
      email: string;
      mfaSecret?: { isVerified: boolean } | null;
    },
    input: Pick<LoginInput, 'ipAddress' | 'userAgent' | 'rememberMe'>
  ) {
    const mfaSessionToken = await mfaService.createMfaSession({
      userId: user.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      rememberMe: input.rememberMe,
    });
    const otpResult = await mfaService.sendEmailOtp(user.id, user.email);
    const authenticatorReady = Boolean(user.mfaSecret?.isVerified);
    return {
      requiresMfa: true,
      mfaSessionToken,
      userId: user.id,
      methods: authenticatorReady ? ['email_otp', 'authenticator'] : ['email_otp'],
      authenticatorEnabled: authenticatorReady,
      otpDelivery: {
        email: otpResult.emailSent,
        sms: otpResult.smsSent,
        phoneMasked: otpResult.phoneMasked,
      },
      deliveryMessage: otpResult.message,
      devOtpHint: otpResult.devMode ? otpResult.message : undefined,
    };
  }

  private async createSessionAndTokens(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      status: string;
      department: string | null;
      organizationId: string;
      mustChangePassword: boolean;
      mfaEnabled: boolean;
      avatarUrl?: string | null;
      position?: string | null;
      organization: {
        id: string;
        name: string;
        slug: string;
        type: string;
        modules: unknown;
      };
      userRoles: Array<{
        role: {
          slug: string;
          rolePermissions: Array<{ permission: { name: string } }>;
        };
      }>;
    },
    input: Pick<LoginInput, 'ipAddress' | 'userAgent' | 'rememberMe'>
  ) {
    const device = parseUserAgent(input.userAgent);
    const sessionExpiry = new Date(
      Date.now() + env.SESSION_INACTIVITY_MINUTES * 60 * 1000
    );

    const roles = user.userRoles.map((ur) => ur.role.slug);

    const modules = await this.resolveModulesForJwt(user.id, user.organizationId, roles);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        deviceName: device.deviceName,
        browser: device.browser,
        os: device.os,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        expiresAt: sessionExpiry,
      },
    });

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      sessionId: session.id,
      roles,
      modules,
      position: user.position ?? null,
    };

    const accessToken = signAccessToken(jwtPayload);
    const refreshToken = signRefreshToken({
      sub: user.id,
      sessionId: session.id,
    });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        sessionId: session.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    await this.logAudit(user.organizationId, user.id, AuditAction.LOGIN, {
      sessionId: session.id,
      device: device.deviceName,
    });

    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.name)
        )
      ),
    ];

    const licensedModules = modules.length
      ? roles.includes(ROLES.MODULE_OPERATOR)
        ? await platformUsersService.getUserAssignedCatalogModules(user.id, user.organizationId)
        : await moduleManagementService.getOrganizationLicensedModules(user.organizationId)
      : [];

    const assignedLicensed = licensedModules.filter((m) => modules.includes(m.slug));
    const isInvigilator = /^invigilator$/i.test((user.position ?? '').trim());
    const academicLaunch = licensedModules.find((m) => m.slug === 'academic' || m.slug === 'academic-1');
    let defaultLaunch: {
      slug: string;
      name: string;
      frontendUrl: string | null;
      entryPath?: string;
    } | null =
      !roles.includes(ROLES.ROOT_ADMIN) &&
      !roles.includes(ROLES.SUPER_ADMIN) &&
      !roles.includes(ROLES.ORGANIZATION_ADMIN) &&
      assignedLicensed.length === 1 &&
      Boolean(assignedLicensed[0].frontendUrl)
        ? {
            slug: assignedLicensed[0].slug,
            name: assignedLicensed[0].name,
            frontendUrl: assignedLicensed[0].frontendUrl,
          }
        : null;

    if (
      isInvigilator &&
      academicLaunch?.frontendUrl &&
      !roles.includes(ROLES.ROOT_ADMIN) &&
      !roles.includes(ROLES.SUPER_ADMIN) &&
      !roles.includes(ROLES.ORGANIZATION_ADMIN)
    ) {
      defaultLaunch = {
        slug: academicLaunch.slug,
        name: 'Invigilator desk',
        frontendUrl: academicLaunch.frontendUrl,
        entryPath: '/exams/invigilator-desk',
      };
    }

    let gateOfficerLaunch: {
      slug: string;
      name: string;
      frontendUrl: string;
      entryPath: string;
    } | null = null;

    if (
      !roles.includes(ROLES.ROOT_ADMIN) &&
      !roles.includes(ROLES.SUPER_ADMIN) &&
      !roles.includes(ROLES.ORGANIZATION_ADMIN) &&
      modules.includes('student-discipline')
    ) {
      const gateCheck = await checkGateOfficer(user.organizationId, user.email, user.id);
      if (gateCheck?.isGateOfficer) {
        const disciplineMod =
          assignedLicensed.find((m) => m.slug === 'student-discipline') ??
          licensedModules.find((m) => m.slug === 'student-discipline');
        if (disciplineMod?.frontendUrl) {
          gateOfficerLaunch = {
            slug: disciplineMod.slug,
            name: disciplineMod.name,
            frontendUrl: disciplineMod.frontendUrl,
            entryPath: gateCheck.entryPath ?? '/gate',
          };
        }
      }
    }

    return {
      requiresMfa: false,
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl ?? null,
        status: user.status,
        department: user.department,
        position: user.position ?? null,
        mustChangePassword: user.mustChangePassword,
        mfaRequired:
          (roles.includes(ROLES.ROOT_ADMIN) || roles.includes(ROLES.SUPER_ADMIN)) &&
          !user.mfaEnabled,
        dashboardRoute: resolveDashboardRoute(roles),
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
          type: user.organization.type,
          modules: licensedModules.length ? licensedModules.map((m) => m.slug) : user.organization.modules,
        },
        roles,
        permissions,
        modules,
        defaultLaunch,
        gateOfficerLaunch,
      },
    };
  }

  async getMyModules(userId: string, organizationId: string, roles: string[]) {
    await prisma.user.findFirstOrThrow({
      where: { id: userId, organizationId },
    });

    if (roles.includes(ROLES.MODULE_OPERATOR)) {
      return platformUsersService.getUserAssignedCatalogModules(userId, organizationId);
    }

    const all = await moduleManagementService.getOrganizationLicensedModules(organizationId);
    if (roles.includes(ROLES.ORGANIZATION_ADMIN)) {
      return all;
    }
    const slugs = await this.resolveModulesForJwt(userId, organizationId, roles);
    return all.filter((m) => slugs.includes(m.slug));
  }

  private async resolveModulesForJwt(
    userId: string,
    organizationId: string,
    roles: string[]
  ): Promise<string[]> {
    if (roles.includes(ROLES.ROOT_ADMIN) || roles.includes(ROLES.SUPER_ADMIN)) {
      return [];
    }

    let slugs: string[] = [];

    if (roles.includes(ROLES.MODULE_OPERATOR)) {
      const assigned = await prisma.userModule.findMany({
        where: { userId, organizationId },
        include: { module: { select: { slug: true, isEnabled: true } } },
      });
      slugs = assigned.filter((a) => a.module.isEnabled).map((a) => a.module.slug);
    } else {
      const orgModules = await moduleManagementService.getOrganizationModuleSlugs(organizationId);

      if (roles.includes(ROLES.ORGANIZATION_ADMIN)) {
        slugs = orgModules;
      } else {
        const assigned = await prisma.userModule.findMany({
          where: { userId, organizationId },
          include: { module: { select: { slug: true } } },
        });

        const assignedSlugs = assigned.map((a) => a.module.slug);
        slugs = assignedSlugs.filter((slug) => orgModules.includes(slug));
      }
    }

    // Circulars ↔ Babyeyi are one product — JWT must include both when either is licensed
    return expandModuleSlugsForJwt(slugs);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const policyError = validatePasswordPolicy(newPassword);
    if (policyError) throw new AppError(400, policyError);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) throw new AppError(401, 'Current password is incorrect');

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
      },
    });

    await this.logAudit(user.organizationId, userId, AuditAction.PASSWORD_CHANGED, {});
    return { message: 'Password updated successfully' };
  }

  async updateAvatar(userId: string, avatarUrl: string | null) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: avatarUrl?.trim() || null },
      select: { id: true, avatarUrl: true },
    });
    return user;
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
      },
    });
    if (!user) throw new AppError(404, 'User not found');
    return user;
  }

  async logout(userId: string, sessionId: string) {
    await prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { isActive: false },
    });

    await prisma.refreshToken.updateMany({
      where: { sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    await this.logAudit(user?.organizationId ?? null, userId, AuditAction.LOGOUT, {
      sessionId,
    });
  }

  async refresh(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            organization: true,
            userRoles: { include: { role: true } },
          },
        },
        session: true,
      },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    if (!stored.session.isActive) {
      throw new AppError(401, 'Session has been revoked');
    }

    const roles = stored.user.userRoles.map((ur) => ur.role.slug);
    const modules = await this.resolveModulesForJwt(
      stored.userId,
      stored.user.organizationId,
      roles
    );

    const jwtPayload: JwtPayload = {
      sub: stored.userId,
      email: stored.user.email,
      organizationId: stored.user.organizationId,
      sessionId: stored.sessionId,
      roles,
      modules,
      position: stored.user.position ?? null,
    };

    const accessToken = signAccessToken(jwtPayload);

    await prisma.session.update({
      where: { id: stored.sessionId },
      data: { lastActivity: new Date() },
    });

    return { accessToken, expiresIn: 15 * 60 };
  }

  async forgotPassword(email: string) {
    const generic = { message: 'If an account exists for that email, a reset link has been sent.' };
    const normalized = email.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: { email: normalized },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });

    if (!user || user.status === UserStatus.SUSPENDED || user.status === UserStatus.INACTIVE) {
      return generic;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    await storePasswordResetToken(user.id, user.email, rawToken);

    const baseUrl = env.FRONTEND_URL.replace(/\/$/, '');
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
    const name = `${user.firstName} ${user.lastName}`.trim() || 'there';

    const sent = await sendPasswordResetEmail({
      to: user.email,
      name,
      resetUrl,
    });

    await this.logAudit(null, user.id, AuditAction.PASSWORD_RESET, {
      stage: 'requested',
      emailSent: sent,
    });

    return generic;
  }

  async resetPassword(token: string, password: string) {
    const policyError = validatePasswordPolicy(password);
    if (policyError) throw new AppError(400, policyError);

    const payload = await consumePasswordResetToken(token);
    if (!payload) {
      throw new AppError(400, 'This reset link is invalid or has expired. Please request a new one.');
    }

    return this.completePasswordReset(payload.userId, password, 'token');
  }

  async forgotPasswordOtp(email: string) {
    const generic = {
      message: 'If an account exists for that email, a verification code has been sent.',
    };
    const normalized = email.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: { email: normalized },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });

    if (!user || user.status === UserStatus.SUSPENDED || user.status === UserStatus.INACTIVE) {
      return generic;
    }

    const otp = generatePasswordResetOtp();
    await storePasswordResetOtp(user.id, user.email, otp);

    const name = `${user.firstName} ${user.lastName}`.trim() || 'there';
    const sent = await sendPasswordResetOtpEmail(user.email, otp, name);

    await this.logAudit(null, user.id, AuditAction.PASSWORD_RESET, {
      stage: 'otp_requested',
      emailSent: sent,
    });

    return generic;
  }

  async resetPasswordOtp(email: string, code: string, password: string) {
    const policyError = validatePasswordPolicy(password);
    if (policyError) throw new AppError(400, policyError);

    const payload = await consumePasswordResetOtp(email, code);
    if (!payload) {
      throw new AppError(
        400,
        'That code is invalid or has expired. Request a new code and try again.'
      );
    }

    return this.completePasswordReset(payload.userId, password, 'otp');
  }

  private async completePasswordReset(
    userId: string,
    password: string,
    via: 'token' | 'otp'
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(400, 'This reset is invalid or has expired. Please request a new one.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
        status: user.status === UserStatus.LOCKED ? UserStatus.ACTIVE : user.status,
      },
    });

    await prisma.session.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false },
    });
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.logAudit(user.organizationId, user.id, AuditAction.PASSWORD_RESET, {
      stage: 'completed',
      via,
    });

    return { message: 'Password reset successfully. You can now sign in with your new password.' };
  }

  async verifyEmail(token: string) {
    // TODO: Validate verification token from Redis
    throw new AppError(501, 'Email verification not yet implemented');
  }

  private async logAudit(
    organizationId: string | null,
    userId: string | null,
    action: AuditAction,
    metadata?: Record<string, unknown>
  ) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        metadata: (metadata ?? undefined) as import('../generated/prisma').Prisma.InputJsonValue | undefined,
      },
    });
  }
}

export const authService = new AuthService();
