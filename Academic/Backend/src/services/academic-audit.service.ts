import { prisma } from '../config/database';

export const academicAuditService = {
  async list(organizationId: string, q: { entityType?: string; entityId?: string; batchId?: string; limit?: number }) {
    try {
      const limit = Math.min(Math.max(Number(q.limit || 100), 1), 500);
      return await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, organization_id as "organizationId", action, entity_type as "entityType", entity_id as "entityId",
                batch_id as "batchId", student_id as "studentId", class_id as "classId", academic_year as "academicYear", term,
                actor_id as "actorId", actor_name as "actorName", actor_roles as "actorRoles", details, created_at as "createdAt"
         FROM academic_audit_logs
         WHERE organization_id = $1
           AND ($2::text IS NULL OR entity_type = $2)
           AND ($3::text IS NULL OR entity_id = $3)
           AND ($4::text IS NULL OR batch_id = $4)
         ORDER BY created_at DESC
         LIMIT $5`,
        organizationId,
        q.entityType || null,
        q.entityId || null,
        q.batchId || null,
        limit
      );
    } catch {
      return [];
    }
  },
  async listOutbox(organizationId: string, limit = 100) {
    try {
      const lim = Math.min(Math.max(Number(limit || 100), 1), 500);
      return await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, organization_id as "organizationId", event_type as "eventType", entity_type as "entityType", entity_id as "entityId",
                batch_id as "batchId", student_id as "studentId", student_code as "studentCode", status, attempts, last_error as "lastError",
                payload, created_at as "createdAt", sent_at as "sentAt"
         FROM academic_notification_outbox
         WHERE organization_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        organizationId,
        lim
      );
    } catch {
      return [];
    }
  },
};
