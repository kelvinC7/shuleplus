import { UserStatus } from '../generated/prisma';
import { prisma } from '../config/database';

const TEACHING_POSITION = /teacher|instructor|lecturer|head\s*of/i;
const TEACHING_DEPARTMENT = /teach|academic|education/i;

export type TeachingStaffRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  employeeId: string | null;
  source: 'iam';
};

function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

function isTeachingUser(input: {
  position: string | null;
  department: string | null;
  moduleSlugs: string[];
}) {
  if (input.moduleSlugs.includes('teacher-portal')) return true;
  if (input.position && TEACHING_POSITION.test(input.position)) return true;
  if (input.department && TEACHING_DEPARTMENT.test(input.department)) return true;
  return false;
}

export const teachingStaffService = {
  async listForOrganization(organizationId: string, search?: string): Promise<TeachingStaffRow[]> {
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        department: true,
        position: true,
        employeeId: true,
        userModules: {
          include: { module: { select: { slug: true } } },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const q = search?.trim().toLowerCase() ?? '';
    let rows = users
      .map((u) => ({
        user: u,
        moduleSlugs: u.userModules.map((m) => m.module.slug),
      }))
      .filter(({ user, moduleSlugs }) =>
        isTeachingUser({
          position: user.position,
          department: user.department,
          moduleSlugs,
        })
      )
      .map(({ user }) => ({
        id: user.id,
        name: fullName(user.firstName, user.lastName),
        email: user.email,
        phone: user.phone,
        department: user.department,
        position: user.position,
        employeeId: user.employeeId,
        source: 'iam' as const,
      }));

    if (q) {
      rows = rows.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.email?.toLowerCase().includes(q) ||
          t.employeeId?.toLowerCase().includes(q) ||
          t.department?.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q)
      );
    }

    return rows.slice(0, 50);
  },
};
