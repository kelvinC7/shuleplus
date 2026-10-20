import { notificationClient } from '../clients/notification.client';
import { fetchSmParents } from '../clients/student-management.client';
import type { PermissionRequest } from '@prisma/client';

function formatTime12h(time: string) {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h)) return time;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${ampm}`;
}

export async function notifyOverdueStudent(
  organizationId: string,
  permission: PermissionRequest,
  overdueMinutes: number
) {
  if (!notificationClient.isEnabled()) return;

  const studentName = permission.studentName;
  const expected = formatTime12h(permission.expectedReturnTime);
  const ref = permission.referenceNumber;

  const parents = await fetchSmParents(organizationId, permission.studentId).catch(() => []);
  for (const parent of parents) {
    if (parent.phone) {
      void notificationClient.sendSms({
        to: parent.phone,
        body:
          `Dear ${parent.fullName}, your child ${studentName} was expected to return to school at ${expected} ` +
          `but has not yet checked in (${overdueMinutes} min overdue). Ref: ${ref}.`,
        metadata: { type: 'gate_overdue', permissionId: permission.id, studentId: permission.studentId },
      });
    }
    if (parent.email) {
      void notificationClient.sendEmail({
        to: parent.email,
        subject: `Overdue return — ${studentName}`,
        text:
          `Dear ${parent.fullName},\n\nYour child ${studentName} was expected to return to school at ${expected} ` +
          `but has not yet checked in (${overdueMinutes} minutes overdue).\n\nPermission: ${ref}\n\nShulePlus Gate Management`,
        metadata: { type: 'gate_overdue', permissionId: permission.id },
      });
    }
  }

  void notificationClient.sendInApp({
    userId: organizationId,
    title: 'Student overdue at gate',
    body: `${studentName} has exceeded the approved return time by ${overdueMinutes} minutes.`,
    metadata: { type: 'gate_overdue_admin', permissionId: permission.id, studentId: permission.studentId },
  });
}

export async function notifyGateOfficerOverdue(
  officerUserId: string | undefined,
  studentName: string,
  overdueMinutes: number
) {
  if (!notificationClient.isEnabled() || !officerUserId) return;
  void notificationClient.sendInApp({
    userId: officerUserId,
    title: 'Overdue student',
    body: `${studentName} is ${overdueMinutes} minutes overdue.`,
    metadata: { type: 'gate_overdue_officer' },
  });
}
