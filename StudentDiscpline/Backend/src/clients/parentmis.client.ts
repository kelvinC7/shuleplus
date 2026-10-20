import { env } from '../config/env';

export interface DisciplineEventInput {
  organizationId: string;
  studentCode: string;
  studentName?: string;
  eventType?: string;
  points?: number;
  description?: string;
}

/**
 * Fire-and-forget push of a discipline event to the ParentMIS module so that
 * linked parents receive an in-app notification in real time. Failures are
 * logged and never break the discipline module's own request flow.
 */
export async function notifyParentMis(event: DisciplineEventInput): Promise<void> {
  try {
    const response = await fetch(env.PARENTMIS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.PARENTMIS_SERVICE_KEY,
      },
      body: JSON.stringify({
        organizationId: event.organizationId,
        studentCode: event.studentCode,
        studentName: event.studentName,
        eventType: event.eventType ?? 'RECORD',
        points: event.points ?? 0,
        description: event.description,
        date: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.warn(
        `[StudentDiscipline] ParentMIS webhook returned ${response.status}: ${await response.text()}`
      );
    }
  } catch (error) {
    console.warn('[StudentDiscipline] Failed to notify ParentMIS:', error);
  }
}
