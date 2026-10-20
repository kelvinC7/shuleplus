import { Prisma, ChatMemberKind } from '../generated/prisma';
import { prisma } from '../config/database';
import { iamClient } from './iam-client.service';
import { hrClient } from './hr-client.service';
import { studentMgmtClient } from './student-mgmt-client.service';
import { timetableClient } from './timetable-client.service';
import type { JwtPayload } from '../middleware/auth.middleware';

const PARENT_ROLE_SLUGS = new Set(['parent', 'guardian', 'parent/guardian']);

/** Derive the chat directory kind from IAM role slugs. */
export function kindForRoles(roles: string[] | undefined | null): ChatMemberKind {
  return roles?.some((r) => PARENT_ROLE_SLUGS.has(r.toLowerCase())) ? 'PARENT' : 'STAFF';
}

export class MemberService {
  /** Pull the full org directory from IAM and upsert into chat_members. */
  async syncOrganization(organizationId: string): Promise<{ synced: boolean; count: number }> {
    let total = 0;

    // 1. Sync IAM users (login accounts)
    try {
      const users = await iamClient.listOrgUsers(organizationId);
      for (const u of users) {
        const kind = kindForRoles(u.roles);
        const data: Prisma.ChatMemberUncheckedCreateInput = {
          organizationId,
          userId: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          avatarUrl: u.avatarUrl,
          department: u.department,
          position: u.position,
          kind,
          roleSlugs: (u.roles ?? []) as Prisma.InputJsonValue,
          hasAccount: true,
        };
        await prisma.chatMember.upsert({
          where: { organizationId_userId: { organizationId, userId: u.id } },
          update: {
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            avatarUrl: u.avatarUrl,
            department: u.department,
            position: u.position,
            kind,
            roleSlugs: (u.roles ?? []) as Prisma.InputJsonValue,
            hasAccount: true,
          },
          create: data,
        });
        total++;
      }
    } catch {
      // IAM sync is best-effort
    }

    // 2. Sync HR employees (teachers & staff)
    try {
      const hrStaff = await hrClient.listStaff(organizationId);
      for (const emp of hrStaff) {
        const nameParts = (emp.fullName ?? '').trim().split(/\s+/);
        const firstName = nameParts[0] || emp.fullName || 'Staff';
        const lastName = nameParts.slice(1).join(' ') || 'Member';
        const userId = emp.id;
        const data: Prisma.ChatMemberUncheckedCreateInput = {
          organizationId,
          userId,
          email: emp.email ?? '',
          firstName,
          lastName,
          avatarUrl: emp.photoUrl,
          position: emp.position,
          kind: 'STAFF',
          source: 'hr',
          roleSlugs: ['staff', 'hr-employee'] as Prisma.InputJsonValue,
        };
        await prisma.chatMember.upsert({
          where: { organizationId_userId: { organizationId, userId } },
          update: {
            firstName,
            lastName,
            avatarUrl: emp.photoUrl,
            position: emp.position,
            source: 'hr',
          },
          create: data,
        });
        total++;
      }
    } catch {
      // HR sync is best-effort
    }

    // 3. Sync StudentManagement parents
    try {
      const parents = await studentMgmtClient.listParents(organizationId);
      for (const p of parents) {
        const userId = p.id;
        const studentNames = p.students?.map((s) => s.studentName).filter(Boolean).join(', ');
        const data: Prisma.ChatMemberUncheckedCreateInput = {
          organizationId,
          userId,
          email: p.email ?? '',
          firstName: p.firstName,
          lastName: p.lastName,
          phone: p.phone,
          kind: 'PARENT',
          source: 'student-management',
          department: studentNames || undefined,
          roleSlugs: ['parent'] as Prisma.InputJsonValue,
        };
        await prisma.chatMember.upsert({
          where: { organizationId_userId: { organizationId, userId } },
          update: {
            firstName: p.firstName,
            lastName: p.lastName,
            phone: p.phone,
            source: 'student-management',
            department: studentNames || undefined,
          },
          create: data,
        });
        total++;
      }
    } catch {
      // StudentManagement sync is best-effort
    }

    // 4. Sync Timetable teachers
    try {
      const teachers = await timetableClient.listTeachers(organizationId);
      for (const t of teachers) {
        const nameParts = (t.teacherName ?? '').trim().split(/\s+/);
        const firstName = nameParts[0] || t.teacherName || 'Teacher';
        const lastName = nameParts.slice(1).join(' ') || 'Member';
        const userId = t.teacherUserId || t.id;
        const data: Prisma.ChatMemberUncheckedCreateInput = {
          organizationId,
          userId,
          email: t.loginEmail ?? '',
          firstName,
          lastName,
          phone: t.loginPhone,
          position: 'Teacher',
          kind: 'STAFF',
          source: 'timetable',
          hasAccount: t.portalEnabled && !!t.account,
          roleSlugs: ['staff', 'teacher'] as Prisma.InputJsonValue,
        };
        await prisma.chatMember.upsert({
          where: { organizationId_userId: { organizationId, userId } },
          update: {
            firstName,
            lastName,
            phone: t.loginPhone,
            position: 'Teacher',
            source: 'timetable',
            hasAccount: t.portalEnabled && !!t.account,
          },
          create: data,
        });
        total++;
      }
    } catch {
      // Timetable sync is best-effort
    }

    await this.syncAutoMemberships(organizationId);
    return { synced: true, count: total };
  }

  /** Minimal row from JWT so a user can be reached even if the IAM sync is down. */
  async ensureSelf(user: JwtPayload, organizationId: string): Promise<void> {
    await prisma.chatMember.upsert({
      where: { organizationId_userId: { organizationId, userId: user.sub } },
      update: { email: user.email, kind: kindForRoles(user.roles), hasAccount: true },
      create: {
        organizationId,
        userId: user.sub,
        email: user.email,
        firstName: user.email.split('@')[0] ?? 'Staff',
        lastName: 'Member',
        kind: kindForRoles(user.roles),
        roleSlugs: (user.roles ?? []) as Prisma.InputJsonValue,
        hasAccount: true,
      },
    });
  }

  /** ANNOUNCEMENT conversations include every org member; DEPARTMENT ones include matching departments. */
  async syncAutoMemberships(organizationId: string): Promise<void> {
    const conversations = await prisma.conversation.findMany({
      where: { organizationId, type: { in: ['ANNOUNCEMENT', 'DEPARTMENT'] } },
      select: { id: true, type: true, department: true, createdById: true },
    });

    const now = new Date();
    for (const conv of conversations) {
      const members = await prisma.chatMember.findMany({
        where: {
          organizationId,
          kind: 'STAFF',
          ...(conv.type === 'DEPARTMENT' ? { department: conv.department ?? '' } : {}),
        },
        select: { userId: true },
      });
      const userIds = new Set(members.map((m) => m.userId));
      userIds.add(conv.createdById);

      for (const userId of userIds) {
        await prisma.conversationMember.upsert({
          where: { conversationId_userId: { conversationId: conv.id, userId } },
          update: {},
          create: {
            conversationId: conv.id,
            organizationId,
            userId,
            role: userId === conv.createdById ? 'ADMIN' : 'MEMBER',
            lastReadAt: now,
          },
        });
      }
    }
  }

  async list(organizationId: string, search?: string, kind?: ChatMemberKind) {
    const where: Prisma.ChatMemberWhereInput = { organizationId };
    if (kind) where.kind = kind;
    const q = search?.trim();
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { department: { contains: q, mode: 'insensitive' } },
      ];
    }
    return prisma.chatMember.findMany({
      where,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 500,
    });
  }

  listStaff(organizationId: string, search?: string) {
    return this.list(organizationId, search, 'STAFF');
  }

  listParents(organizationId: string, search?: string) {
    return this.list(organizationId, search, 'PARENT');
  }

  async listDepartments(organizationId: string): Promise<string[]> {
    const rows = await prisma.chatMember.findMany({
      where: { organizationId, department: { not: null } },
      select: { department: true },
      distinct: ['department'],
      orderBy: { department: 'asc' },
    });
    return rows.map((r) => r.department as string).filter(Boolean);
  }
}

export const memberService = new MemberService();
