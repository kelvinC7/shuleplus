import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { resolveActiveStudent, tryResolveActiveStudent } from './parent-context.service';
import { getParentTransportPortal } from '../clients/transport.client';
import { parseStudentSelector, type StudentSelector } from '../utils/student-param';

export class ParentTransportService {
  async portal(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const student = await tryResolveActiveStudent(organizationId, parentId, requestedStudentId);
    if (!student) {
      throw new AppError(
        403,
        'No linked learner for transport. Link a child or refresh after the school adds you on the trip manifest.'
      );
    }
    const transportOrgId = student.organizationId || organizationId;
    const remote = await getParentTransportPortal(transportOrgId, student.shuleCode);

    let changeRequests: Awaited<ReturnType<typeof prisma.transportChangeRequest.findMany>> = [];
    try {
      changeRequests = await prisma.transportChangeRequest.findMany({
        where: { organizationId, studentId: student.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    } catch (err) {
      console.warn('[transport] changeRequests query failed:', (err as Error).message);
    }

    let transportNotifications = 0;
    try {
      transportNotifications = await prisma.notification.count({
        where: {
          parentId,
          isRead: false,
          sourceModule: 'transport',
        },
      });
    } catch (err) {
      console.warn('[transport] notification count failed:', (err as Error).message);
    }

    return {
      student: {
        id: student.id,
        shuleCode: student.shuleCode,
        fullName: `${student.firstName} ${student.lastName}`.trim(),
        className: student.className,
      },
      portal: remote
        ? remote
        : {
            enrolled: false as const,
            studentCode: student.shuleCode,
            linkStatus: 'unreachable' as const,
          },
      changeRequests,
      unreadTransportNotifications: transportNotifications,
    };
  }

  async listChangeRequests(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const student = await resolveActiveStudent(organizationId, parentId, requestedStudentId);
    return prisma.transportChangeRequest.findMany({
      where: { organizationId, studentId: student.id, parentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitChangeRequest(
    organizationId: string,
    parentId: string,
    requestedStudentId: StudentSelector | undefined,
    body: {
      requestType: string;
      reason: string;
      effectiveFrom?: string;
      effectiveTo?: string;
    }
  ) {
    const student = await resolveActiveStudent(organizationId, parentId, requestedStudentId);
    if (!body.requestType?.trim() || !body.reason?.trim()) {
      throw new AppError(400, 'Request type and reason are required');
    }
    return prisma.transportChangeRequest.create({
      data: {
        organizationId,
        parentId,
        studentId: student.id,
        requestType: body.requestType.trim(),
        reason: body.reason.trim(),
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : null,
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
      },
    });
  }

  async listTransportNotifications(
    organizationId: string,
    parentId: string,
    requestedStudentId?: StudentSelector,
    scopeAll = false
  ) {
    const studentFilter = parseStudentSelector(requestedStudentId);
    const singleChild = !scopeAll && (studentFilter.id || studentFilter.code);

    if (singleChild) {
      const student = await resolveActiveStudent(organizationId, parentId, requestedStudentId);
      const items = await prisma.notification.findMany({
        where: { organizationId, parentId, studentId: student.id, sourceModule: 'transport' },
        orderBy: { createdAt: 'desc' },
        take: 80,
      });
      const name = `${student.firstName} ${student.lastName}`.trim();
      return items.map((n) => ({ ...n, studentName: name }));
    }

    const links = await prisma.parentStudentLink.findMany({
      where: { parentId },
      include: { student: true },
    });
    const nameById = new Map(
      links.map((l) => [l.studentId, `${l.student.firstName} ${l.student.lastName}`.trim()])
    );
    const studentIds = links.map((l) => l.studentId);

    const items = await prisma.notification.findMany({
      where: {
        parentId,
        sourceModule: 'transport',
        ...(studentIds.length ? { studentId: { in: studentIds } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return items.map((n) => ({
      ...n,
      studentName: nameById.get(n.studentId) ?? null,
    }));
  }

  async markAllTransportNotificationsRead(parentId: string) {
    const result = await prisma.notification.updateMany({
      where: { parentId, sourceModule: 'transport', isRead: false },
      data: { isRead: true },
    });
    return { updated: result.count };
  }

  async submitIssueReport(
    organizationId: string,
    parentId: string,
    requestedStudentId: StudentSelector | undefined,
    body: { issueType: string; details: string }
  ) {
    const student = await resolveActiveStudent(organizationId, parentId, requestedStudentId);
    if (!body.issueType?.trim() || !body.details?.trim()) {
      throw new AppError(400, 'Issue type and details are required');
    }
    return prisma.transportIssueReport.create({
      data: {
        organizationId,
        parentId,
        studentId: student.id,
        issueType: body.issueType.trim(),
        details: body.details.trim(),
      },
    });
  }

  async listIssueReports(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const student = await resolveActiveStudent(organizationId, parentId, requestedStudentId);
    return prisma.transportIssueReport.findMany({
      where: { organizationId, parentId, studentId: student.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** School transport office (service auth from Smart Transport). */
  async listOrgChangeRequests(organizationId: string, status?: string) {
    return prisma.transportChangeRequest.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' } : {}),
      },
      include: {
        student: { select: { firstName: true, lastName: true, shuleCode: true, className: true } },
        parent: { select: { firstName: true, lastName: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async respondChangeRequest(
    organizationId: string,
    id: string,
    body: { status: 'APPROVED' | 'REJECTED'; schoolResponse?: string }
  ) {
    const row = await prisma.transportChangeRequest.findFirst({ where: { id, organizationId } });
    if (!row) throw new AppError(404, 'Request not found');
    return prisma.transportChangeRequest.update({
      where: { id },
      data: {
        status: body.status,
        schoolResponse: body.schoolResponse?.trim() || null,
      },
    });
  }

  async listOrgIssueReports(organizationId: string, status?: string) {
    return prisma.transportIssueReport.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED' } : {}),
      },
      include: {
        student: { select: { firstName: true, lastName: true, shuleCode: true, className: true } },
        parent: { select: { firstName: true, lastName: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateIssueReport(
    organizationId: string,
    id: string,
    body: { status?: string; schoolNote?: string }
  ) {
    const row = await prisma.transportIssueReport.findFirst({ where: { id, organizationId } });
    if (!row) throw new AppError(404, 'Report not found');
    return prisma.transportIssueReport.update({
      where: { id },
      data: {
        status: body.status ? (body.status as 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED') : undefined,
        schoolNote: body.schoolNote !== undefined ? body.schoolNote : undefined,
      },
    });
  }
}

export const parentTransportService = new ParentTransportService();
