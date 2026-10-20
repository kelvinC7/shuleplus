import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import type { StudentSelector } from '../utils/student-param';

export interface ParentContext {
  parentId: string;
  /** Prefer the child's school when the parent is linked across orgs. */
  organizationId: string;
  studentId: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseStudentSelector(requested?: StudentSelector): { id?: string; code?: string } {
  if (!requested) return {};
  if (typeof requested === 'string') {
    const value = requested.trim();
    return value ? { id: value } : {};
  }
  const id = requested.studentId?.trim();
  const code = requested.studentCode?.trim();
  return { id: id || undefined, code: code || undefined };
}

function matchesRequested(
  student: { id: string; shuleCode: string },
  wantedId?: string,
  wantedCode?: string
) {
  if (wantedId && (student.id === wantedId || student.shuleCode === wantedId)) return true;
  if (wantedCode && (student.shuleCode === wantedCode || student.id === wantedCode)) return true;
  return false;
}

async function ensureLink(parentId: string, studentId: string) {
  const existing = await prisma.parentStudentLink.findFirst({ where: { parentId, studentId } });
  if (existing) return;
  await prisma.parentStudentLink.create({
    data: { parentId, studentId, relationship: 'GUARDIAN', isPrimary: false },
  });
}

type LinkWithStudent = {
  studentId: string;
  student: {
    id: string;
    shuleCode: string;
    organizationId: string;
    firstName: string;
    lastName: string;
    className: string;
    stream: string | null;
    avatarUrl: string | null;
  };
};

async function linksForParent(parentId: string, organizationId?: string) {
  if (organizationId) {
    const scoped = await prisma.parentStudentLink.findMany({
      where: { parentId, student: { organizationId } },
      include: { student: true },
      orderBy: { isPrimary: 'desc' },
    });
    if (scoped.length) return scoped;
  }
  return prisma.parentStudentLink.findMany({
    where: { parentId },
    include: { student: true },
    orderBy: { isPrimary: 'desc' },
  });
}

function ctxFromLink(parentId: string, jwtOrgId: string, link: LinkWithStudent): ParentContext {
  return {
    parentId,
    organizationId: link.student.organizationId || jwtOrgId,
    studentId: link.studentId,
  };
}

/**
 * Resolve the active student for a parent.
 * Matches by Parent MIS id, Student Management id, or ShuleCode.
 * Falls back across schools when the JWT org has no local links yet
 * (common for multi-school phone logins).
 */
export async function resolveParentContext(
  organizationId: string,
  parentId: string,
  requested?: StudentSelector
): Promise<ParentContext> {
  let links = await linksForParent(parentId, organizationId);
  const { id: wantedId, code: wantedCode } = parseStudentSelector(requested);

  if (links.length === 0 && (wantedId || wantedCode)) {
    const extra = await prisma.student.findFirst({
      where: {
        OR: [
          ...(wantedId ? [{ id: wantedId }, { shuleCode: wantedId }] : []),
          ...(wantedCode ? [{ shuleCode: wantedCode }, { id: wantedCode }] : []),
        ],
      },
    });
    if (extra) {
      if (extra.organizationId !== organizationId) {
        await prisma.student
          .update({
            where: { id: extra.id },
            data: { organizationId: extra.organizationId },
          })
          .catch(() => null);
      }
      await ensureLink(parentId, extra.id);
      links = await linksForParent(parentId, organizationId);
      if (!links.length) {
        return {
          parentId,
          organizationId: extra.organizationId || organizationId,
          studentId: extra.id,
        };
      }
    }
  }

  if (links.length === 0) {
    // Last resort: any parent account sharing this phone that already has links
    const self = await prisma.parentAccount.findUnique({ where: { id: parentId } });
    if (self?.phone) {
      const siblings = await prisma.parentAccount.findMany({
        where: { phone: self.phone },
        select: { id: true },
      });
      for (const sibling of siblings) {
        if (sibling.id === parentId) continue;
        const siblingLinks = await linksForParent(sibling.id, organizationId);
        if (siblingLinks.length) {
          // Re-home links under the JWT local parent so future requests succeed
          for (const link of siblingLinks) {
            await ensureLink(parentId, link.studentId);
          }
          links = await linksForParent(parentId, organizationId);
          break;
        }
      }
    }
  }

  if (links.length === 0) {
    throw new AppError(
      403,
      'No students linked to this parent account. Sign in again from Parent Login.'
    );
  }

  if (!wantedId && !wantedCode) {
    return ctxFromLink(parentId, organizationId, links[0]!);
  }

  const match = links.find((l) => matchesRequested(l.student, wantedId, wantedCode));
  if (match) {
    return ctxFromLink(parentId, organizationId, match);
  }

  const extra = await prisma.student.findFirst({
    where: {
      OR: [
        ...(wantedId ? [{ id: wantedId }, { shuleCode: wantedId }] : []),
        ...(wantedCode ? [{ shuleCode: wantedCode }, { id: wantedCode }] : []),
      ],
    },
  });
  if (extra) {
    await ensureLink(parentId, extra.id);
    return {
      parentId,
      organizationId: extra.organizationId || organizationId,
      studentId: extra.id,
    };
  }

  const stubCode = wantedCode || (wantedId && !UUID_RE.test(wantedId) ? wantedId : undefined);
  if (stubCode) {
    const created = await prisma.student
      .create({
        data: {
          ...(wantedId && UUID_RE.test(wantedId) ? { id: wantedId } : {}),
          organizationId,
          firstName: 'Student',
          lastName: '',
          shuleCode: stubCode,
          className: '—',
        },
      })
      .catch(async () =>
        prisma.student.findFirst({
          where: {
            OR: [{ shuleCode: stubCode }, ...(wantedId ? [{ id: wantedId }] : [])],
          },
        })
      );
    if (created) {
      await ensureLink(parentId, created.id);
      return {
        parentId,
        organizationId: created.organizationId || organizationId,
        studentId: created.id,
      };
    }
  }

  return ctxFromLink(parentId, organizationId, links[0]!);
}

export async function resolveActiveStudent(
  organizationId: string,
  parentId: string,
  requested?: StudentSelector
) {
  const ctx = await resolveParentContext(organizationId, parentId, requested);
  const student = await prisma.student.findUnique({ where: { id: ctx.studentId } });
  if (!student) throw new AppError(404, 'Student profile not found');
  return student;
}

export async function tryResolveActiveStudent(
  organizationId: string,
  parentId: string,
  requested?: StudentSelector
) {
  try {
    return await resolveActiveStudent(organizationId, parentId, requested);
  } catch (error) {
    if (error instanceof AppError && (error.statusCode === 403 || error.statusCode === 404)) {
      return null;
    }
    throw error;
  }
}

export async function listLinkedStudents(parentId: string, organizationId: string) {
  let links = await prisma.parentStudentLink.findMany({
    where: { parentId, student: { organizationId } },
    include: { student: true },
    orderBy: { isPrimary: 'desc' },
  });
  if (!links.length) {
    links = await prisma.parentStudentLink.findMany({
      where: { parentId },
      include: { student: true },
      orderBy: { isPrimary: 'desc' },
    });
  }
  return links.map(({ student, relationship, isPrimary }) => ({
    id: student.id,
    fullName: `${student.firstName} ${student.lastName}`,
    firstName: student.firstName,
    lastName: student.lastName,
    shuleCode: student.shuleCode,
    className: student.className,
    stream: student.stream,
    avatarUrl: student.avatarUrl,
    organizationId: student.organizationId,
    relationship,
    isPrimary,
  }));
}

export function serializeError(error: unknown): { message: string } {
  if (error instanceof AppError) return { message: error.message };
  return { message: 'An unexpected error occurred' };
}
