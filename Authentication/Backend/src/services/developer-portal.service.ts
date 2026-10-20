import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { generateSecret, generateURI, verify } from 'otplib';
import {
  DeveloperAccessType,
  DeveloperApplicationStatus,
  DeveloperEnvironment,
  DeveloperUserStatus,
  Prisma,
} from '../generated/prisma';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { DeveloperJwtPayload } from '../middleware/developer-auth.middleware';
import {
  comparePassword,
  hashPassword,
  hashToken,
  parseUserAgent,
  validatePasswordPolicy,
} from '../utils/security';
import {
  DEVELOPER_MODULE_PERMISSIONS,
  filterModulesByPermissions,
  DEVELOPER_MODULE_REGISTRY,
} from '../config/developer-module-registry';
import { generateModuleOpenApiSpec, generateAggregatedOpenApiSpec } from '../config/developer-openapi';
import { sendDeveloperActivationEmail } from '../utils/email';
import { generateBankOnboardingEmail } from '../config/developer-bank-onboarding-email';
import { developerSandboxService } from './developer-sandbox.service';
import { generatePostmanCollection, generatePostmanEnvironment, postmanSetupInstructions } from '../config/developer-postman';
import {
  resolveDeveloperGatewayBaseUrl,
  resolveModuleGatewayBaseUrl,
  resolvePublicApiBaseUrl,
} from '../config/developer-public-url';
import {
  getDeveloperPortalSettings,
  updateDeveloperPortalSettings,
} from './developer-portal-settings.service';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateClientId(envType: DeveloperEnvironment): string {
  const prefix = envType === DeveloperEnvironment.PRODUCTION ? 'sp_live_' : 'sp_test_';
  return prefix + crypto.randomBytes(12).toString('hex');
}

function generateClientSecret(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function signDeveloperAccessToken(payload: DeveloperJwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'],
  });
}

function signDeveloperRefreshToken(payload: { sub: string; sessionId: string }): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as jwt.SignOptions['expiresIn'],
  });
}

function parseAllowedModules(raw: unknown): Record<string, Record<string, boolean>> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, Record<string, boolean>>;
  }
  return {};
}

function parseAllowedEnvironments(raw: unknown): DeveloperEnvironment[] {
  if (Array.isArray(raw)) {
    return raw.filter((e) => e === 'SANDBOX' || e === 'PRODUCTION') as DeveloperEnvironment[];
  }
  return [DeveloperEnvironment.SANDBOX];
}

function hasPermission(
  allowedModules: Record<string, Record<string, boolean>>,
  permission: string
): boolean {
  for (const mod of Object.values(allowedModules)) {
    if (mod[permission]) return true;
  }
  return false;
}

export class DeveloperPortalService {
  // ─── Super Admin: Partners & Users ─────────────────────────────────────

  async listPartners() {
    return prisma.developerPartner.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { users: true, applications: true } },
        sandboxOrganization: { select: { id: true, name: true, slug: true } },
        productionOrganization: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async createPartner(input: {
    name: string;
    description?: string;
    actorId?: string;
    organizationId?: string;
  }) {
    const slug = slugify(input.name);
    const existing = await prisma.developerPartner.findUnique({ where: { slug } });
    if (existing) throw new AppError(409, 'Partner with this name already exists');

    if (!input.organizationId?.trim()) {
      throw new AppError(
        400,
        'Sandbox school is required. Select a school organization from this server.'
      );
    }

    const partner = await prisma.developerPartner.create({
      data: { name: input.name, slug, description: input.description },
    });

    const sandbox = await developerSandboxService.provisionPartnerSandbox(
      partner.id,
      input.actorId ?? partner.id,
      { organizationId: input.organizationId.trim() }
    );

    return { ...partner, sandboxOrganizationId: sandbox.organization.id, sandbox };
  }

  linkPartnerSandbox(partnerId: string, organizationId: string, actorId: string) {
    return developerSandboxService.linkSandboxToOrganization(partnerId, organizationId, actorId);
  }

  async getBankOnboardingEmail(partnerId: string) {
    const partner = await prisma.developerPartner.findUnique({
      where: { id: partnerId },
      include: { sandboxOrganization: { select: { id: true, name: true } } },
    });
    if (!partner) throw new AppError(404, 'Partner not found');

    const portalUrl = process.env.FRONTEND_URL ?? 'https://shuleplus.rw';
    return generateBankOnboardingEmail({
      partnerName: partner.name,
      sandboxOrganizationId: partner.sandboxOrganization?.id ?? partner.sandboxOrganizationId,
      sandboxOrganizationName: partner.sandboxOrganization?.name,
      portalUrl,
    });
  }

  async listDevelopers(search?: string) {
    const users = await prisma.developerUser.findMany({
      where: search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: { partner: true, mfaSecret: { select: { isVerified: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      accessType: u.accessType,
      status: u.status,
      partner: u.partner,
      mfaEnabled: u.mfaEnabled && Boolean(u.mfaSecret?.isVerified),
      lastLoginAt: u.lastLoginAt,
      lastLoginIp: u.lastLoginIp,
      allowedModules: u.allowedModules,
      allowedEnvironments: u.allowedEnvironments,
      createdAt: u.createdAt,
    }));
  }

  async getDeveloperById(id: string) {
    const user = await prisma.developerUser.findUnique({
      where: { id },
      include: {
        partner: true,
        mfaSecret: { select: { isVerified: true } },
        sessions: { where: { isActive: true }, orderBy: { lastActivity: 'desc' }, take: 10 },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!user) throw new AppError(404, 'Developer not found');

    const applications = await prisma.developerApplication.findMany({
      where: { partnerId: user.partnerId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...user,
      mfaEnabled: user.mfaEnabled && Boolean(user.mfaSecret?.isVerified),
      applications,
    };
  }

  async createDeveloperAccess(input: {
    partnerId: string;
    firstName: string;
    lastName: string;
    email: string;
    accessType: DeveloperAccessType;
    allowedModules: Record<string, Record<string, boolean>>;
    allowedEnvironments: DeveloperEnvironment[];
    ipRestrictions?: string[];
    createdByUserId?: string;
  }) {
    const partner = await prisma.developerPartner.findUnique({ where: { id: input.partnerId } });
    if (!partner) throw new AppError(404, 'Partner organization not found');

    if (!partner.sandboxOrganizationId) {
      throw new AppError(
        400,
        'This partner has no sandbox school linked. Create the partner with a school from the dropdown, or use Link school on the partner card.'
      );
    }

    const existing = await prisma.developerUser.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) throw new AppError(409, 'A developer with this email already exists');

    const user = await prisma.developerUser.create({
      data: {
        partnerId: input.partnerId,
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        accessType: input.accessType,
        allowedModules: input.allowedModules,
        allowedEnvironments: input.allowedEnvironments,
        ipRestrictions: input.ipRestrictions ?? undefined,
        createdByUserId: input.createdByUserId,
        status: DeveloperUserStatus.PENDING_ACTIVATION,
      },
      include: { partner: true },
    });

    const rawToken = crypto.randomUUID();
    await prisma.developerActivationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    });

    await this.logAudit({
      userId: user.id,
      partnerId: user.partnerId,
      action: 'DEVELOPER_ACCESS_CREATED',
      resource: 'developer_user',
      resourceId: user.id,
      metadata: { email: user.email, accessType: user.accessType },
    });

    const activationUrl = `${env.FRONTEND_URL ?? 'http://localhost:3000'}/developers/activate?token=${rawToken}`;

    const emailDelivery = await sendDeveloperActivationEmail({
      to: user.email,
      name: user.firstName,
      partnerName: (user as typeof user & { partner: { name: string } }).partner.name,
      activationUrl,
      accessType: user.accessType,
    });

    return {
      user,
      activationUrl,
      activationToken: rawToken,
      emailSent: emailDelivery.delivered,
      emailDelivery,
    };
  }

  async resendDeveloperActivationEmail(developerId: string) {
    const user = await prisma.developerUser.findUnique({
      where: { id: developerId },
      include: { partner: true },
    });
    if (!user) throw new AppError(404, 'Developer not found');
    if (user.status !== DeveloperUserStatus.PENDING_ACTIVATION) {
      throw new AppError(400, 'This developer account is already activated');
    }

    await prisma.developerActivationToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const rawToken = crypto.randomUUID();
    await prisma.developerActivationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    });

    await this.logAudit({
      userId: user.id,
      partnerId: user.partnerId,
      action: 'DEVELOPER_ACTIVATION_EMAIL_RESENT',
      resource: 'developer_user',
      resourceId: user.id,
      metadata: { email: user.email },
    });

    const activationUrl = `${env.FRONTEND_URL ?? 'http://localhost:3000'}/developers/activate?token=${rawToken}`;

    const emailDelivery = await sendDeveloperActivationEmail({
      to: user.email,
      name: user.firstName,
      partnerName: (user as typeof user & { partner: { name: string } }).partner.name,
      activationUrl,
      accessType: user.accessType,
    });

    return {
      email: user.email,
      activationUrl,
      activationToken: rawToken,
      emailSent: emailDelivery.delivered,
      emailDelivery,
    };
  }

  async suspendDeveloper(id: string) {
    const user = await prisma.developerUser.update({
      where: { id },
      data: { status: DeveloperUserStatus.SUSPENDED },
    });
    await prisma.developerSession.updateMany({ where: { userId: id }, data: { isActive: false } });
    return user;
  }

  async activateDeveloper(id: string) {
    return prisma.developerUser.update({
      where: { id },
      data: { status: DeveloperUserStatus.ACTIVE },
    });
  }

  async deleteDeveloper(id: string, actorId?: string) {
    const user = await prisma.developerUser.findUnique({
      where: { id },
      include: { partner: true },
    });
    if (!user) throw new AppError(404, 'Developer not found');

    await prisma.developerSession.updateMany({
      where: { userId: id },
      data: { isActive: false },
    });
    await prisma.developerMfaSession.deleteMany({ where: { userId: id } });
    await prisma.developerUser.delete({ where: { id } });

    await this.logAudit({
      partnerId: user.partnerId,
      action: 'DEVELOPER_DELETED',
      resource: 'developer_user',
      resourceId: id,
      metadata: { email: user.email, partnerName: (user as typeof user & { partner: { name: string } }).partner.name, deletedBy: actorId },
    });

    return { success: true, email: user.email };
  }

  async updateDeveloperAccess(
    id: string,
    input: {
      accessType?: DeveloperAccessType;
      allowedModules?: Record<string, Record<string, boolean>>;
      allowedEnvironments?: DeveloperEnvironment[];
      ipRestrictions?: string[] | null;
      actorId?: string;
    }
  ) {
    const existing = await prisma.developerUser.findUnique({
      where: { id },
      include: { partner: true },
    });
    if (!existing) throw new AppError(404, 'Developer not found');

    const allowedModules = input.allowedModules ?? parseAllowedModules(existing.allowedModules);
    const allowedEnvironments =
      input.allowedEnvironments ?? parseAllowedEnvironments(existing.allowedEnvironments);

    if (allowedEnvironments.length === 0) {
      throw new AppError(400, 'Select at least one environment (Sandbox or Production)');
    }

    const user = await prisma.developerUser.update({
      where: { id },
      data: {
        ...(input.accessType ? { accessType: input.accessType } : {}),
        allowedModules,
        allowedEnvironments,
        ...(input.ipRestrictions !== undefined
          ? {
              ipRestrictions:
                input.ipRestrictions === null ? Prisma.JsonNull : input.ipRestrictions,
            }
          : {}),
      },
      include: { partner: true },
    });

    await this.syncPartnerApplicationScopes(user.partnerId);

    await this.logAudit({
      userId: user.id,
      partnerId: user.partnerId,
      action: 'DEVELOPER_ACCESS_UPDATED',
      resource: 'developer_user',
      resourceId: user.id,
      metadata: {
        accessType: user.accessType,
        allowedEnvironments,
        moduleCount: Object.keys(allowedModules).length,
        updatedBy: input.actorId,
      },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      accessType: user.accessType,
      status: user.status,
      partner: (user as typeof user & { partner: { id: string; name: string } }).partner,
      allowedModules: parseAllowedModules(user.allowedModules),
      allowedEnvironments: parseAllowedEnvironments(user.allowedEnvironments),
    };
  }

  private async syncPartnerApplicationScopes(partnerId: string) {
    const users = await prisma.developerUser.findMany({
      where: {
        partnerId,
        status: { in: [DeveloperUserStatus.ACTIVE, DeveloperUserStatus.PENDING_ACTIVATION] },
      },
    });

    const scopes = new Set<string>();
    for (const user of users) {
      const mods = parseAllowedModules(user.allowedModules);
      for (const perms of Object.values(mods)) {
        for (const [key, enabled] of Object.entries(perms)) {
          if (enabled) scopes.add(key);
        }
      }
    }

    await prisma.developerApplication.updateMany({
      where: { partnerId },
      data: { scopes: [...scopes] },
    });
  }

  // ─── Activation ──────────────────────────────────────────────────────────

  async validateActivationToken(rawToken: string) {
    const token = await prisma.developerActivationToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: { include: { partner: true } } },
    });
    if (!token || token.usedAt || token.expiresAt < new Date()) {
      throw new AppError(400, 'Invalid or expired activation link');
    }
    return {
      email: token.user.email,
      firstName: token.user.firstName,
      partnerName: (token.user as typeof token.user & { partner: { name: string } }).partner.name,
    };
  }

  async activateAccount(rawToken: string, password: string) {
    const policyError = validatePasswordPolicy(password);
    if (policyError) throw new AppError(400, policyError);

    const token = await prisma.developerActivationToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: true },
    });
    if (!token || token.usedAt || token.expiresAt < new Date()) {
      throw new AppError(400, 'Invalid or expired activation link');
    }

    const passwordHash = await hashPassword(password);
    const recoveryCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
    const recoveryCodesHash = recoveryCodes.map((c) => hashToken(c));

    await prisma.$transaction([
      prisma.developerUser.update({
        where: { id: token.userId },
        data: {
          passwordHash,
          status: DeveloperUserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
          activatedAt: new Date(),
          recoveryCodesHash,
        },
      }),
      prisma.developerActivationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { recoveryCodes };
  }

  // ─── Auth ────────────────────────────────────────────────────────────────

  async login(input: {
    email: string;
    password: string;
    rememberMe?: boolean;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const user = await prisma.developerUser.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { mfaSecret: true, partner: true },
    });

    if (!user || !user.passwordHash) {
      throw new AppError(401, 'Invalid email or password');
    }

    if (user.status === DeveloperUserStatus.SUSPENDED) {
      throw new AppError(403, 'Your developer account has been suspended');
    }

    if (user.status === DeveloperUserStatus.PENDING_ACTIVATION) {
      throw new AppError(403, 'Please activate your account using the email link');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(423, 'Account temporarily locked. Try again later.');
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      const failed = user.failedLoginCount + 1;
      await prisma.developerUser.update({
        where: { id: user.id },
        data: {
          failedLoginCount: failed,
          lockedUntil: failed >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null,
        },
      });
      throw new AppError(401, 'Invalid email or password');
    }

    await prisma.developerUser.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    const mfaSessionToken = crypto.randomUUID();
    await prisma.developerMfaSession.create({
      data: {
        token: mfaSessionToken,
        userId: user.id,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        rememberMe: input.rememberMe ?? false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    if (user.mfaEnabled && user.mfaSecret?.isVerified) {
      return {
        requiresMfa: true,
        mfaSessionToken,
        methods: ['authenticator'],
        authenticatorEnabled: true,
        user: { firstName: user.firstName, email: user.email },
      };
    }

    return {
      requiresMfa: true,
      mfaSessionToken,
      methods: user.mfaSecret?.isVerified ? ['authenticator'] : ['setup_required'],
      authenticatorEnabled: Boolean(user.mfaSecret?.isVerified),
      setupRequired: !user.mfaSecret?.isVerified,
      user: { firstName: user.firstName, email: user.email },
    };
  }

  async completeMfaLogin(mfaSessionToken: string, code: string, ipAddress?: string, userAgent?: string) {
    const session = await prisma.developerMfaSession.findUnique({ where: { token: mfaSessionToken } });
    if (!session || session.expiresAt < new Date()) {
      throw new AppError(401, 'MFA session expired. Please login again.');
    }

    const user = await prisma.developerUser.findUnique({
      where: { id: session.userId },
      include: { mfaSecret: true, partner: true },
    });
    if (!user) throw new AppError(401, 'User not found');

    if (user.mfaSecret?.isVerified) {
      const valid = await verify({ secret: user.mfaSecret.secret, token: code });
      if (!valid) {
        const recoveryValid = await this.verifyRecoveryCode(user.id, code);
        if (!recoveryValid) throw new AppError(401, 'Invalid verification code');
      }
    }

    await prisma.developerMfaSession.delete({ where: { id: session.id } });

    return this.createDeveloperSession(user, {
      ipAddress: ipAddress ?? session.ipAddress ?? undefined,
      userAgent: userAgent ?? session.userAgent ?? undefined,
      rememberMe: session.rememberMe,
      isTrusted: session.rememberMe,
    });
  }

  private async verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
    const user = await prisma.developerUser.findUnique({ where: { id: userId } });
    if (!user?.recoveryCodesHash) return false;
    const hashes = user.recoveryCodesHash as string[];
    const codeHash = hashToken(code.replace(/\s/g, '').toUpperCase());
    const idx = hashes.indexOf(codeHash);
    if (idx === -1) return false;
    const updated = [...hashes];
    updated.splice(idx, 1);
    await prisma.developerUser.update({
      where: { id: userId },
      data: { recoveryCodesHash: updated },
    });
    return true;
  }

  private async createDeveloperSession(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      accessType: DeveloperAccessType;
      partnerId: string;
      allowedModules: unknown;
      allowedEnvironments: unknown;
      mfaEnabled: boolean;
      partner: { id: string; name: string; slug: string };
    },
    opts: { ipAddress?: string; userAgent?: string; rememberMe?: boolean; isTrusted?: boolean }
  ) {
    const { browser, os, deviceName } = parseUserAgent(opts.userAgent);
    const sessionExpiry = opts.rememberMe
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const session = await prisma.developerSession.create({
      data: {
        userId: user.id,
        deviceName,
        browser,
        os,
        ipAddress: opts.ipAddress,
        userAgent: opts.userAgent,
        isTrusted: opts.isTrusted ?? false,
        expiresAt: sessionExpiry,
      },
    });

    const jwtPayload: DeveloperJwtPayload = {
      sub: user.id,
      email: user.email,
      partnerId: user.partnerId,
      sessionId: session.id,
      accessType: user.accessType,
      portal: 'developer',
    };

    const accessToken = signDeveloperAccessToken(jwtPayload);
    const rawRefresh = crypto.randomUUID();
    await prisma.developerRefreshToken.create({
      data: {
        userId: user.id,
        sessionId: session.id,
        tokenHash: hashToken(rawRefresh),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.developerUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: opts.ipAddress },
    });

    await this.logAudit({
      userId: user.id,
      partnerId: user.partnerId,
      action: 'DEVELOPER_LOGIN',
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accessType: user.accessType,
        mfaEnabled: user.mfaEnabled,
        allowedModules: parseAllowedModules(user.allowedModules),
        allowedEnvironments: parseAllowedEnvironments(user.allowedEnvironments),
        partner: user.partner,
      },
    };
  }

  async setupMfa(userId: string) {
    const secret = generateSecret();
    const user = await prisma.developerUser.findUniqueOrThrow({ where: { id: userId } });
    await prisma.developerMfaSecret.upsert({
      where: { userId },
      create: { userId, secret, isVerified: false },
      update: { secret, isVerified: false },
    });
    const uri = generateURI({ issuer: 'ShulePlus Developer Portal', label: user.email, secret });
    return { secret, uri };
  }

  async verifyMfaSetup(userId: string, code: string) {
    const mfa = await prisma.developerMfaSecret.findUnique({ where: { userId } });
    if (!mfa) throw new AppError(400, 'MFA not initialized');
    const valid = await verify({ secret: mfa.secret, token: code });
    if (!valid) throw new AppError(401, 'Invalid verification code');
    await prisma.$transaction([
      prisma.developerMfaSecret.update({ where: { userId }, data: { isVerified: true } }),
      prisma.developerUser.update({ where: { id: userId }, data: { mfaEnabled: true } }),
    ]);
    return { success: true };
  }

  async refreshToken(rawRefresh: string) {
    const tokenHash = hashToken(rawRefresh);
    const stored = await prisma.developerRefreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { partner: true } } },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError(401, 'Invalid refresh token');
    }

    const jwtPayload: DeveloperJwtPayload = {
      sub: stored.user.id,
      email: stored.user.email,
      partnerId: stored.user.partnerId,
      sessionId: stored.sessionId,
      accessType: stored.user.accessType,
      portal: 'developer',
    };

    return { accessToken: signDeveloperAccessToken(jwtPayload) };
  }

  async getMe(userId: string) {
    const user = await prisma.developerUser.findUniqueOrThrow({
      where: { id: userId },
      include: { partner: true, mfaSecret: { select: { isVerified: true } } },
    });
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      accessType: user.accessType,
      status: user.status,
      mfaEnabled: user.mfaEnabled && Boolean(user.mfaSecret?.isVerified),
      allowedModules: parseAllowedModules(user.allowedModules),
      allowedEnvironments: parseAllowedEnvironments(user.allowedEnvironments),
      partner: user.partner,
      lastLoginAt: user.lastLoginAt,
    };
  }

  // ─── Dashboard & Analytics ───────────────────────────────────────────────

  async getDashboardStats(partnerId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayLogs, successLogs, failedLogs, applications] = await Promise.all([
      prisma.developerApiLog.count({ where: { partnerId, createdAt: { gte: today } } }),
      prisma.developerApiLog.count({
        where: { partnerId, createdAt: { gte: today }, statusCode: { gte: 200, lt: 400 } },
      }),
      prisma.developerApiLog.count({
        where: { partnerId, createdAt: { gte: today }, statusCode: { gte: 400 } },
      }),
      prisma.developerApplication.count({ where: { partnerId, status: DeveloperApplicationStatus.ACTIVE } }),
    ]);

    const lastActivity = await prisma.developerApiLog.findFirst({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
    });

    const dailyLimit = 100000;
    const usedToday = todayLogs;

    return {
      requestsToday: todayLogs,
      successfulRequests: successLogs,
      failedRequests: failedLogs,
      successRate: todayLogs > 0 ? ((successLogs / todayLogs) * 100).toFixed(2) : '100.00',
      activeApplications: applications,
      quotaUsed: usedToday,
      quotaLimit: dailyLimit,
      quotaPercent: Math.round((usedToday / dailyLimit) * 100),
      lastActivityAt: lastActivity?.createdAt ?? null,
    };
  }

  async getApiHealthChart(partnerId: string, days = 7) {
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const logs = await prisma.developerApiLog.findMany({
      where: { partnerId, createdAt: { gte: start } },
      select: { createdAt: true, statusCode: true, responseTime: true },
    });

    const buckets: Record<string, { requests: number; success: number; errors: number; totalMs: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      buckets[d.toISOString().slice(0, 10)] = { requests: 0, success: 0, errors: 0, totalMs: 0 };
    }

    for (const log of logs) {
      const key = log.createdAt.toISOString().slice(0, 10);
      if (!buckets[key]) continue;
      buckets[key].requests++;
      buckets[key].totalMs += log.responseTime;
      if (log.statusCode >= 200 && log.statusCode < 400) buckets[key].success++;
      else buckets[key].errors++;
    }

    return Object.entries(buckets).map(([date, v]) => ({
      date,
      requests: v.requests,
      successRate: v.requests > 0 ? ((v.success / v.requests) * 100).toFixed(1) : '100',
      avgResponseMs: v.requests > 0 ? Math.round(v.totalMs / v.requests) : 0,
    }));
  }

  async getEndpointStats(partnerId: string, days = 7) {
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const logs = await prisma.developerApiLog.findMany({
      where: { partnerId, createdAt: { gte: start } },
      select: { method: true, endpoint: true, statusCode: true },
    });

    const buckets = new Map<string, { requests: number; success: number }>();
    for (const log of logs) {
      const key = `${log.method} ${log.endpoint}`;
      const current = buckets.get(key) ?? { requests: 0, success: 0 };
      current.requests++;
      if (log.statusCode >= 200 && log.statusCode < 400) current.success++;
      buckets.set(key, current);
    }

    return Array.from(buckets.entries())
      .map(([path, stats]) => ({
        path,
        requests: stats.requests,
        successRate: stats.requests > 0 ? ((stats.success / stats.requests) * 100).toFixed(1) : '100.0',
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 25);
  }

  async listDeveloperNotifications(partnerId: string) {
    const [auditLogs, partner, pendingProduction] = await Promise.all([
      prisma.developerAuditLog.findMany({
        where: { partnerId },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      prisma.developerPartner.findUnique({ where: { id: partnerId } }),
      prisma.developerProductionAccessRequest.findFirst({
        where: { partnerId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const actionMeta: Record<string, { type: 'success' | 'warning' | 'info'; title: string }> = {
      DEVELOPER_ACCESS_CREATED: { type: 'success', title: 'Developer access created' },
      DEVELOPER_ACTIVATION_EMAIL_RESENT: { type: 'info', title: 'Activation email resent' },
      APPLICATION_CREATED: { type: 'success', title: 'Application created' },
      APPLICATION_SECRET_ROTATED: { type: 'warning', title: 'Application secret rotated' },
      PRODUCTION_ACCESS_REQUESTED: { type: 'info', title: 'Production access requested' },
      PRODUCTION_ACCESS_APPROVED: { type: 'success', title: 'Production access approved' },
      PRODUCTION_ACCESS_REJECTED: { type: 'warning', title: 'Production access rejected' },
    };

    const items = auditLogs.map((log) => {
      const meta = actionMeta[log.action] ?? { type: 'info' as const, title: log.action.replace(/_/g, ' ') };
      const body =
        log.metadata && typeof log.metadata === 'object' && log.metadata !== null
          ? Object.entries(log.metadata as Record<string, unknown>)
              .slice(0, 3)
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join(' · ')
          : log.resource ?? 'Account activity';
      return {
        id: log.id,
        type: meta.type,
        title: meta.title,
        body: body || 'Account activity recorded',
        createdAt: log.createdAt,
      };
    });

    if (partner?.productionAccessStatus === 'APPROVED') {
      items.unshift({
        id: `prod-approved-${partner.id}`,
        type: 'success',
        title: 'Production environment available',
        body: 'Your partner organization can create production API applications.',
        createdAt: partner.updatedAt,
      });
    }

    if (pendingProduction) {
      items.unshift({
        id: pendingProduction.id,
        type: 'info',
        title: 'Production access under review',
        body: pendingProduction.businessJustification ?? 'Your production access request is pending Super Admin review.',
        createdAt: pendingProduction.createdAt,
      });
    }

    return items.slice(0, 30);
  }

  // ─── Applications & Credentials ──────────────────────────────────────────

  async listApplications(partnerId: string) {
    return prisma.developerApplication.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createApplication(input: {
    partnerId: string;
    name: string;
    description?: string;
    environment: DeveloperEnvironment;
    scopes: string[];
    createdByUserId?: string;
  }) {
    const partner = await prisma.developerPartner.findUniqueOrThrow({
      where: { id: input.partnerId },
    });

    const organizationId = developerSandboxService.resolveOrganizationId(partner, input.environment);

    const secret = generateClientSecret();
    const clientId = generateClientId(input.environment);

    const app = await prisma.developerApplication.create({
      data: {
        partnerId: input.partnerId,
        organizationId,
        name: input.name,
        description: input.description,
        environment: input.environment,
        clientId,
        clientSecretHash: hashToken(secret),
        clientSecretPrefix: secret.slice(0, 8) + '••••••••',
        scopes: input.scopes,
        createdByUserId: input.createdByUserId,
      },
    });

    await this.logAudit({
      partnerId: input.partnerId,
      action: 'APPLICATION_CREATED',
      resource: 'developer_application',
      resourceId: app.id,
      metadata: { name: app.name, environment: app.environment },
    });

    return { ...app, clientSecret: secret };
  }

  async rotateApplicationSecret(applicationId: string, partnerId: string) {
    const app = await prisma.developerApplication.findFirst({
      where: { id: applicationId, partnerId },
    });
    if (!app) throw new AppError(404, 'Application not found');

    const secret = generateClientSecret();
    const updated = await prisma.developerApplication.update({
      where: { id: applicationId },
      data: {
        clientSecretHash: hashToken(secret),
        clientSecretPrefix: secret.slice(0, 8) + '••••••••',
      },
    });

    return { ...updated, clientSecret: secret };
  }

  // ─── API Docs ────────────────────────────────────────────────────────────

  getApiCatalog(userId: string) {
    return prisma.developerUser.findUniqueOrThrow({ where: { id: userId } }).then((user) => {
      const allowed = parseAllowedModules(user.allowedModules);
      const apiBaseUrl = resolvePublicApiBaseUrl();
      const gatewayBaseUrl = resolveDeveloperGatewayBaseUrl();
      const modules = filterModulesByPermissions(allowed).map((mod) => ({
        slug: mod.slug,
        catalogKey: mod.catalogKey,
        name: mod.name,
        description: mod.description,
        baseUrl: resolveModuleGatewayBaseUrl(mod.slug),
        openapiPath: `${apiBaseUrl}/developers/docs/openapi/${mod.slug}.json`,
        endpoints: mod.routes.map((r) => ({
          id: r.id,
          method: r.method,
          path: r.upstreamPath,
          summary: r.summary,
          description: r.description,
          permission: r.permission,
          authMode: r.authMode,
          queryParams: r.queryParams,
          requestBody: r.requestBody,
          responseExample: r.responseExample,
          tags: r.tags,
        })),
      }));
      return {
        apiBaseUrl,
        gatewayBaseUrl,
        modules,
        permissionMatrix: DEVELOPER_MODULE_PERMISSIONS,
      };
    });
  }

  getModulePermissionsConfig() {
    return DEVELOPER_MODULE_PERMISSIONS;
  }

  getPortalSettings() {
    return getDeveloperPortalSettings();
  }

  updatePortalSettings(input: { publicApiUrl: string | null; updatedById: string }) {
    return updateDeveloperPortalSettings(input);
  }

  getOpenApiSpec(moduleSlug?: string) {
    const gatewayBaseUrl = resolveDeveloperGatewayBaseUrl();
    if (moduleSlug) {
      const mod = DEVELOPER_MODULE_REGISTRY.find((m) => m.slug === moduleSlug);
      if (!mod) throw new AppError(404, 'Module not found');
      return generateModuleOpenApiSpec(mod, resolveModuleGatewayBaseUrl(mod.slug));
    }
    return generateAggregatedOpenApiSpec(gatewayBaseUrl);
  }

  getFullCatalog() {
    return DEVELOPER_MODULE_REGISTRY;
  }

  // ─── API Logs ────────────────────────────────────────────────────────────

  async listApiLogs(partnerId: string, filters?: { applicationId?: string; status?: number; limit?: number }) {
    return prisma.developerApiLog.findMany({
      where: {
        partnerId,
        applicationId: filters?.applicationId,
        statusCode: filters?.status,
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 50,
      include: { application: { select: { name: true } } },
    });
  }

  // ─── Webhooks ────────────────────────────────────────────────────────────

  async listWebhooks(partnerId: string) {
    return prisma.developerWebhook.findMany({
      where: { application: { partnerId } },
      include: { application: { select: { name: true, environment: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWebhook(input: {
    applicationId: string;
    partnerId: string;
    name: string;
    url: string;
    events: string[];
  }) {
    const app = await prisma.developerApplication.findFirst({
      where: { id: input.applicationId, partnerId: input.partnerId },
    });
    if (!app) throw new AppError(404, 'Application not found');

    const secret = crypto.randomBytes(24).toString('hex');
    return prisma.developerWebhook.create({
      data: {
        applicationId: input.applicationId,
        name: input.name,
        url: input.url,
        secretHash: hashToken(secret),
        events: input.events,
      },
    });
  }

  // ─── Security ────────────────────────────────────────────────────────────

  async getSecurityOverview(userId: string) {
    const user = await prisma.developerUser.findUniqueOrThrow({
      where: { id: userId },
      include: { mfaSecret: true, sessions: { where: { isActive: true } } },
    });

    const score =
      (user.emailVerifiedAt ? 20 : 0) +
      (user.mfaEnabled && user.mfaSecret?.isVerified ? 30 : 0) +
      (user.recoveryCodesHash ? 20 : 0) +
      20 +
      (user.passwordHash ? 10 : 0);

    return {
      score: Math.min(score, 100),
      checks: {
        mfaEnabled: user.mfaEnabled && Boolean(user.mfaSecret?.isVerified),
        emailVerified: Boolean(user.emailVerifiedAt),
        strongPassword: Boolean(user.passwordHash),
        recoveryCodes: Boolean(user.recoveryCodesHash),
        noSuspiciousSessions: true,
        ipRestrictionConfigured: Boolean(user.ipRestrictions),
      },
      activeSessions: user.sessions.length,
    };
  }

  async listSessions(userId: string) {
    return prisma.developerSession.findMany({
      where: { userId, isActive: true },
      orderBy: { lastActivity: 'desc' },
    });
  }

  async revokeOtherSessions(userId: string, currentSessionId: string) {
    await prisma.developerSession.updateMany({
      where: { userId, id: { not: currentSessionId }, isActive: true },
      data: { isActive: false },
    });
    return { success: true };
  }

  // ─── OAuth Token (client credentials) ────────────────────────────────────

  async issueOAuthToken(clientId: string, clientSecret: string) {
    const app = await prisma.developerApplication.findUnique({ where: { clientId } });
    if (!app || app.status !== DeveloperApplicationStatus.ACTIVE) {
      throw new AppError(401, 'Invalid client credentials');
    }
    if (app.clientSecretHash !== hashToken(clientSecret)) {
      throw new AppError(401, 'Invalid client credentials');
    }

    await prisma.developerApplication.update({
      where: { id: app.id },
      data: { lastUsedAt: new Date() },
    });

    const scopes = (app.scopes as string[]) ?? [];
    const accessToken = jwt.sign(
      {
        sub: app.id,
        partnerId: app.partnerId,
        scopes,
        environment: app.environment,
        type: 'api_client',
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    return {
      access_token: accessToken,
      expires_in: 900,
      token_type: 'Bearer',
      scope: scopes.join(' '),
    };
  }

  // ─── Sandbox & Postman ───────────────────────────────────────────────────

  getSandbox(partnerId: string, userId: string) {
    return developerSandboxService.getSandboxOverview(partnerId, userId);
  }

  requestProductionAccess(input: {
    partnerId: string;
    userId: string;
    requestedModules: string[];
    businessJustification?: string;
  }) {
    return developerSandboxService.requestProductionAccess(input);
  }

  listProductionAccessRequests(status?: string) {
    return developerSandboxService.listProductionRequests(
      status as import('../generated/prisma').DeveloperProductionAccessStatus | undefined
    );
  }

  approveProductionAccess(requestId: string, actorId: string, notes?: string) {
    return developerSandboxService.approveProductionAccess(requestId, actorId, notes);
  }

  rejectProductionAccess(requestId: string, actorId: string, notes?: string) {
    return developerSandboxService.rejectProductionAccess(requestId, actorId, notes);
  }

  async getPostmanExport(userId: string) {
    const user = await prisma.developerUser.findUniqueOrThrow({
      where: { id: userId },
      include: { partner: true },
    });

    let partner = user.partner;
    await developerSandboxService.ensureSandboxReadyForExport(partner.id);
    partner = await prisma.developerPartner.findUniqueOrThrow({ where: { id: partner.id } });
    const sandboxOrgId = partner.sandboxOrganizationId;
    if (!sandboxOrgId) {
      throw new AppError(
        400,
        'No sandbox school linked for this partner. Link a school before exporting Postman.'
      );
    }

    const allowed = parseAllowedModules(user.allowedModules);
    const scopes: string[] = [];
    for (const perms of Object.values(allowed)) {
      for (const [key, enabled] of Object.entries(perms)) {
        if (enabled) scopes.push(key);
      }
    }

    let sandboxApp = await prisma.developerApplication.findFirst({
      where: {
        partnerId: user.partnerId,
        environment: DeveloperEnvironment.SANDBOX,
        status: DeveloperApplicationStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });

    let clientSecret: string | undefined;
    let appAutoCreated = false;

    if (!sandboxApp) {
      const created = await this.createApplication({
        partnerId: user.partnerId,
        name: 'Postman Sandbox App',
        description: 'Auto-created for Postman API testing',
        environment: DeveloperEnvironment.SANDBOX,
        scopes,
        createdByUserId: userId,
      });
      sandboxApp = created;
      clientSecret = created.clientSecret;
      appAutoCreated = true;
    } else {
      const rotated = await this.rotateApplicationSecret(sandboxApp.id, user.partnerId);
      sandboxApp = rotated;
      clientSecret = rotated.clientSecret;
    }

    const sandboxBaseUrl = resolvePublicApiBaseUrl();

    const modules = filterModulesByPermissions(allowed);

    return {
      collection: generatePostmanCollection({
        allowedModules: allowed,
        partnerName: partner.name,
        organizationId: sandboxOrgId,
        clientId: sandboxApp?.clientId,
        clientSecret,
        sandboxBaseUrl,
      }),
      environment: generatePostmanEnvironment({
        partnerName: partner.name,
        organizationId: sandboxOrgId,
        clientId: sandboxApp?.clientId,
        clientSecret,
        sandboxBaseUrl,
      }),
      setup: {
        clientId: sandboxApp?.clientId,
        clientSecret,
        organizationId: sandboxOrgId,
        sandboxBaseUrl,
        modulesCount: modules.length,
        appAutoCreated,
        instructions: postmanSetupInstructions({
          clientId: sandboxApp?.clientId,
          clientSecret,
          organizationId: sandboxOrgId,
          sandboxBaseUrl,
          modulesCount: modules.length,
          appAutoCreated,
        }),
      },
    };
  }

  private async logAudit(input: {
    userId?: string;
    partnerId?: string;
    action: string;
    resource?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await prisma.developerAuditLog.create({
      data: input as Prisma.DeveloperAuditLogCreateInput,
    });
  }
}

export const developerPortalService = new DeveloperPortalService();
