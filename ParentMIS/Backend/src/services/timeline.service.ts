import { prisma } from '../config/database';
import { resolveParentContext } from './parent-context.service';
import { attendanceService } from './attendance.service';
import type { StudentSelector } from '../utils/student-param';

export class TimelineService {
  async list(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const { studentId } = await resolveParentContext(organizationId, parentId, requestedStudentId);

    const [logs, liveAttendance, feePayments, exams, leaveRequests] = await Promise.all([
      prisma.activityLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      attendanceService.getSummary(organizationId, parentId, requestedStudentId).catch(() => null),
      prisma.feePayment.findMany({
        where: { studentId },
        orderBy: { date: 'desc' },
        take: 30,
      }),
      prisma.exam.findMany({
        where: { studentId },
        orderBy: { date: 'desc' },
        take: 20,
      }),
      prisma.leaveRequest.findMany({
        where: { studentId },
        orderBy: { submittedAt: 'desc' },
        take: 20,
      }),
    ]);

    const attendance = liveAttendance?.records?.slice(0, 30) ?? [];

    type Item = {
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: string;
    };

    const items: Item[] = [
      ...logs.map((l) => ({
        id: l.id,
        type: 'PLATFORM',
        title: l.action.replace(/_/g, ' '),
        description: l.description ?? '',
        timestamp: l.createdAt.toISOString(),
      })),
      ...attendance.map((a) => {
        const source = a.source === 'RFID' ? 'RFID tap' : 'Attendance';
        const times = [a.checkInTime && `in ${a.checkInTime}`, a.checkOutTime && `out ${a.checkOutTime}`]
          .filter(Boolean)
          .join(', ');
        const gate = a.gateName ? ` at ${a.gateName}` : '';
        return {
          id: a.id,
          type: 'ATTENDANCE',
          title: `${source}: ${a.status}`,
          description:
            a.notes ??
            `${a.status}${times ? ` · ${times}` : ''}${gate}`.trim(),
          timestamp: a.date,
        };
      }),
      ...feePayments.map((p) => ({
        id: p.id,
        type: 'FEE',
        title: 'Fee payment received',
        description: `${p.description} — ${p.amount.toLocaleString()} RWF via ${p.method}`,
        timestamp: p.date.toISOString(),
      })),
      ...exams.map((e) => ({
        id: e.id,
        type: 'EXAM',
        title: `${e.subject} ${e.type}`,
        description: `${e.type} for ${e.subject} scheduled on ${e.date.toDateString()}`,
        timestamp: e.date.toISOString(),
      })),
      ...leaveRequests.map((l) => ({
        id: l.id,
        type: 'LEAVE',
        title: `Leave request ${l.status.toLowerCase()}`,
        description: l.reason ?? `${l.type} requested for ${l.date.toDateString()}`,
        timestamp: l.submittedAt.toISOString(),
      })),
    ];

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return items;
  }
}

export const timelineService = new TimelineService();
