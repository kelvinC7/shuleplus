import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { resolveParentContext, resolveActiveStudent } from './parent-context.service';
import { listDisciplineCases, listPermissions } from '../clients/discipline.client';
import type { StudentSelector } from '../utils/student-param';

function toIso(value?: string | Date | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Maps StudentDiscipline permission statuses to the uppercase set used in ParentMIS. */
function normalizePermissionStatus(status?: string | null): string {
  switch ((status ?? '').toUpperCase()) {
    case 'APPROVED':
    case 'OUT':
    case 'COMPLETED':
      return 'APPROVED';
    case 'REJECTED':
      return 'REJECTED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return 'PENDING';
  }
}

export class LifeService {
  async discipline(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const student = await resolveActiveStudent(organizationId, parentId, requestedStudentId).catch(() => null);
    if (!student) {
      return { score: 100, totalPoints: 0, records: [] };
    }

    try {
      const cases = await listDisciplineCases(organizationId, student.shuleCode);
      const records = cases.map((c) => ({
        id: c.id,
        date: new Date(c.incidentDate || c.createdAt || Date.now()).toISOString(),
        type: c.markName || 'Conduct',
        description: c.description || c.incidentNotes || '',
        points: c.appliedPoints ?? 0,
        status: c.status || 'RECORDED',
      }));
      const totalPoints = records.reduce((s, r) => s + r.points, 0);
      const score = Math.max(0, Math.min(100, 100 + totalPoints));
      return { score, totalPoints, records };
    } catch (error) {
      console.warn(`[discipline] module unreachable (${(error as Error).message}); using local records`);
      const records = await prisma.disciplineRecord.findMany({
        where: { studentId: student.id },
        orderBy: { date: 'desc' },
      });
      const totalPoints = records.reduce((s, r) => s + r.points, 0);
      const score = Math.max(0, Math.min(100, 100 - Math.abs(totalPoints)));
      return {
        score,
        totalPoints,
        records: records.map((r) => ({
          id: r.id,
          date: r.date.toISOString(),
          type: r.type,
          description: r.description,
          points: r.points,
          status: r.status,
        })),
      };
    }
  }

  async documents(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const { studentId } = await resolveParentContext(organizationId, parentId, requestedStudentId);
    const docs = await prisma.studentDocument.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
    });
    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      description: d.description,
      url: d.url,
      date: d.date.toISOString(),
    }));
  }

  async events(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    void parentId;
    void requestedStudentId;
    const events = await prisma.schoolEvent.findMany({
      where: { organizationId },
      orderBy: { date: 'asc' },
    });
    return events.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date.toISOString(),
      time: e.time,
      location: e.location,
      description: e.description,
      category: e.category,
    }));
  }

  async health(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const { studentId } = await resolveParentContext(organizationId, parentId, requestedStudentId);
    const records = await prisma.healthRecord.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
    });
    return records.map((r) => ({
      id: r.id,
      date: r.date.toISOString(),
      type: r.type,
      description: r.description,
      treatment: r.treatment,
      status: r.status,
    }));
  }

  async homework(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const { studentId } = await resolveParentContext(organizationId, parentId, requestedStudentId);
    const items = await prisma.homework.findMany({
      where: { studentId },
      orderBy: { dueDate: 'asc' },
    });
    return items.map((h) => ({
      id: h.id,
      subject: h.subject,
      title: h.title,
      description: h.description,
      teacher: h.teacher,
      assignedDate: h.assignedDate.toISOString(),
      dueDate: h.dueDate.toISOString(),
      status: h.status,
    }));
  }

  async leave(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const { studentId } = await resolveParentContext(organizationId, parentId, requestedStudentId);
    const requests = await prisma.leaveRequest.findMany({
      where: { studentId },
      orderBy: { submittedAt: 'desc' },
    });
    return requests.map((r) => ({
      id: r.id,
      date: r.date.toISOString(),
      type: r.type,
      reason: r.reason,
      status: r.status,
      submittedAt: r.submittedAt.toISOString(),
    }));
  }

  /** School-side permission (gate pass) requests for the child, live from StudentDiscipline. */
  async permissions(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const student = await resolveActiveStudent(organizationId, parentId, requestedStudentId).catch(() => null);
    if (!student) return [];

    const rows = await listPermissions(organizationId, student.shuleCode);
    return rows.map((p) => ({
      id: p.id,
      referenceNumber: p.referenceNumber ?? '',
      type: p.permissionType || 'Permission',
      reason: p.reason ?? '',
      destination: p.destination ?? '',
      status: normalizePermissionStatus(p.status),
      departureAt: toIso(p.departureDate),
      departureTime: p.departureTime ?? null,
      expectedReturnAt: toIso(p.expectedReturnDate),
      expectedReturnTime: p.expectedReturnTime ?? null,
      actualDepartureAt: toIso(p.actualDepartureAt),
      actualReturnAt: toIso(p.actualReturnAt),
      isOverdue: Boolean(p.isOverdue),
      isCurrentlyOut: Boolean(p.isCurrentlyOut),
      requestedAt: toIso(p.createdAt),
    }));
  }

  async submitLeave(
    organizationId: string,
    parentId: string,
    input: { date: string; type: string; reason: string },
    requestedStudentId?: StudentSelector
  ) {
    const { studentId } = await resolveParentContext(organizationId, parentId, requestedStudentId);
    const date = new Date(input.date);
    if (Number.isNaN(date.getTime())) throw new AppError(400, 'Invalid date');

    const request = await prisma.leaveRequest.create({
      data: {
        organizationId,
        studentId,
        date,
        type: input.type || 'Permission',
        reason: input.reason,
        status: 'PENDING',
      },
    });
    return {
      id: request.id,
      date: request.date.toISOString(),
      type: request.type,
      reason: request.reason,
      status: request.status,
      submittedAt: request.submittedAt.toISOString(),
    };
  }
}

export const lifeService = new LifeService();
