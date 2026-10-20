import { AppError } from '../middleware/error.middleware';
import {
  checkTeacherIdentifier,
  getTeacherAccount,
  provisionTeacherAccount,
  resetTeacherAccountPassword,
  setTeacherAccountStatus,
} from '../clients/iam.client';
import { listHrStaffForOrg } from '../clients/hr.client';
import { teacherProfileService } from './teacher-profile.service';

export type TeacherLoginMethod = 'email' | 'phone' | 'both';

export class TeacherAccountService {
  async checkIdentifier(
    organizationId: string,
    input: { email?: string; phone?: string; excludeUserId?: string },
  ) {
    const result = await checkTeacherIdentifier(organizationId, input);
    return result ?? { available: true };
  }

  async getStatus(organizationId: string, teacherUserId: string) {
    if (!teacherUserId || teacherUserId.startsWith('teacher-')) return null;
    return getTeacherAccount(organizationId, teacherUserId);
  }

  async saveAccount(
    organizationId: string,
    actorId: string,
    profile: {
      teacherUserId: string;
      teacherName: string;
      portalEnabled?: boolean;
      loginMethod?: TeacherLoginMethod;
      loginEmail?: string | null;
      loginPhone?: string | null;
    },
    account: {
      password?: string;
      requirePasswordChange?: boolean;
      sendCredentialsEmail?: boolean;
    },
  ) {
    const portalEnabled = profile.portalEnabled ?? false;
    const loginMethod = profile.loginMethod ?? 'email';

    if (!portalEnabled) {
      return { teacherUserId: profile.teacherUserId };
    }

    const existingUserId =
      profile.teacherUserId && !profile.teacherUserId.startsWith('teacher-')
        ? profile.teacherUserId
        : undefined;

    const provisioned = await provisionTeacherAccount(organizationId, {
      actorId,
      teacherName: profile.teacherName,
      loginMethod,
      email: profile.loginEmail ?? undefined,
      phone: profile.loginPhone ?? undefined,
      password: account.password,
      portalEnabled: true,
      existingUserId,
      requirePasswordChange: account.requirePasswordChange ?? true,
      sendCredentialsEmail: account.sendCredentialsEmail ?? true,
    });

    if (!provisioned?.userId) {
      throw new AppError(502, 'Could not provision teacher portal account');
    }

    return {
      teacherUserId: provisioned.userId,
      employeeId: provisioned.employeeId ?? null,
      provisioned,
    };
  }

  async resetPassword(
    organizationId: string,
    actorId: string,
    teacherUserId: string,
    options?: { password?: string; sendEmail?: boolean },
  ) {
    const trimmed = options?.password?.trim();
    if (trimmed && trimmed.length < 8) {
      throw new AppError(400, 'Password must be at least 8 characters');
    }
    const result = await resetTeacherAccountPassword(organizationId, teacherUserId, {
      actorId,
      password: trimmed || undefined,
      sendEmail: options?.sendEmail,
    });
    if (!result) throw new AppError(502, 'Password reset failed');
    return result;
  }

  async disableAccount(organizationId: string, actorId: string, teacherUserId: string) {
    const result = await setTeacherAccountStatus(organizationId, teacherUserId, {
      actorId,
      status: 'SUSPENDED',
    });
    if (!result) throw new AppError(502, 'Could not disable account');
    return result;
  }

  async enableAccount(organizationId: string, actorId: string, teacherUserId: string) {
    const result = await setTeacherAccountStatus(organizationId, teacherUserId, {
      actorId,
      status: 'ACTIVE',
    });
    if (!result) throw new AppError(502, 'Could not enable account');
    return result;
  }

  async enrichProfiles(organizationId: string, profiles: Awaited<ReturnType<typeof teacherProfileService.list>>) {
    const hrStaff = await listHrStaffForOrg(organizationId);
    const rfidByEmail = new Map<string, string>();
    const rfidByName = new Map<string, string>();
    for (const staff of hrStaff) {
      if (!staff.rfidUid) continue;
      if (staff.email) rfidByEmail.set(staff.email.trim().toLowerCase(), staff.rfidUid);
      rfidByName.set(staff.fullName.trim().toLowerCase(), staff.rfidUid);
    }

    return Promise.all(
      profiles.map(async (p) => {
        const row = p as typeof p & {
          portalEnabled?: boolean;
          loginMethod?: string;
          loginEmail?: string | null;
          loginPhone?: string | null;
          rfidUid?: string | null;
        };
        let account = null;
        if (row.portalEnabled && row.teacherUserId && !row.teacherUserId.startsWith('teacher-')) {
          account = await this.getStatus(organizationId, row.teacherUserId);
        }

        let rfidUid = row.rfidUid ?? null;
        if (!rfidUid) {
          const email = (row.loginEmail ?? account?.email ?? '').trim().toLowerCase();
          if (email && rfidByEmail.has(email)) {
            rfidUid = rfidByEmail.get(email) ?? null;
          } else {
            const nameKey = row.teacherName.trim().toLowerCase();
            rfidUid = rfidByName.get(nameKey) ?? null;
          }
        }

        return {
          ...row,
          rfidUid,
          portalEnabled: row.portalEnabled ?? false,
          loginMethod: (row.loginMethod ?? 'email') as TeacherLoginMethod,
          loginEmail: row.loginEmail ?? null,
          loginPhone: row.loginPhone ?? null,
          account: account
            ? {
                userId: account.userId,
                email: account.email,
                phone: account.phone,
                status: account.status,
                lastLoginAt: account.lastLoginAt,
                portalEnabled: row.portalEnabled ?? false,
                loginMethod: (row.loginMethod ?? 'email') as TeacherLoginMethod,
              }
            : null,
        };
      }),
    );
  }
}

export const teacherAccountService = new TeacherAccountService();
