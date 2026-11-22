import { randomUUID } from 'crypto';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'RETURNED' | 'APPROVED' | 'PUBLISHED';

const transitions: Record<string, string[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'RETURNED', 'APPROVED'],
  UNDER_REVIEW: ['APPROVED', 'RETURNED'],
  RETURNED: ['SUBMITTED', 'DRAFT'],
  APPROVED: ['PUBLISHED', 'RETURNED'],
  PUBLISHED: [],
};

async function logEvent(input: {
  organizationId: string;
  submissionId: string;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorRoles?: string[] | null;
  comment?: string | null;
  metadata?: any;
}) {
  await prisma.$executeRaw`
    INSERT INTO marks_submission_events (
      id, organization_id, submission_id, event_type, from_status, to_status,
      actor_id, actor_name, actor_roles, comment, metadata, created_at
    ) VALUES (
      ${randomUUID()}, ${input.organizationId}, ${input.submissionId}, ${input.eventType},
      ${input.fromStatus ?? null}, ${input.toStatus ?? null}, ${input.actorId ?? null}, ${input.actorName ?? null},
      ${input.actorRoles?.length ? input.actorRoles.join(',') : null}, ${input.comment ?? null},
      ${input.metadata ? JSON.stringify(input.metadata) : null}::jsonb, NOW()
    )
  `;
}

export const marksSubmissionService = {
  async list(organizationId: string, q: { academicYear?: string; term?: string; classId?: string; status?: string; assessmentId?: string }) {
    try {
      return await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, organization_id as "organizationId", assessment_id as "assessmentId", class_id as "classId", class_name as "className",
               subject_id as "subjectId", subject_name as "subjectName", academic_year as "academicYear", term, status,
               submitted_by as "submittedBy", submitted_by_name as "submittedByName", submitted_at as "submittedAt",
               reviewed_by as "reviewedBy", reviewed_by_name as "reviewedByName", reviewed_at as "reviewedAt", review_notes as "reviewNotes",
               approved_by as "approvedBy", approved_by_name as "approvedByName", approved_at as "approvedAt", returned_reason as "returnedReason",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM marks_submissions
        WHERE organization_id = $1
          AND ($2::text IS NULL OR academic_year = $2)
          AND ($3::text IS NULL OR term = $3)
          AND ($4::text IS NULL OR class_id = $4)
          AND ($5::text IS NULL OR status::text = $5)
          AND ($6::text IS NULL OR assessment_id = $6)
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 300
      `, organizationId, q.academicYear?.trim() || null, q.term?.trim() || null, q.classId?.trim() || null, q.status?.trim() || null, q.assessmentId?.trim() || null);
    } catch {
      return [];
    }
  },

  async createOrUpdate(organizationId: string, actor: { id?: string; name?: string; roles?: string[] }, input: any) {
    const id = input.id || randomUUID();
    const academicYear = String(input.academicYear || '').trim();
    const term = String(input.term || '').trim();
    if (!academicYear || !term) throw new AppError(400, 'academicYear and term are required');
    const status = (String(input.status || 'DRAFT').toUpperCase() as SubmissionStatus);
    const now = new Date();
    try {
      await prisma.$executeRaw`
        INSERT INTO marks_submissions (
          id, organization_id, assessment_id, class_id, class_name, subject_id, subject_name, academic_year, term,
          submitted_by, submitted_by_name, submitted_at, status, review_notes, created_at, updated_at
        ) VALUES (
          ${id}, ${organizationId}, ${input.assessmentId ?? null}, ${input.classId ?? null}, ${input.className ?? null},
          ${input.subjectId ?? null}, ${input.subjectName ?? null}, ${academicYear}, ${term},
          ${status === 'SUBMITTED' ? actor.id ?? null : null}, ${status === 'SUBMITTED' ? actor.name ?? null : null},
          ${status === 'SUBMITTED' ? now : null}, ${status}::"MarksSubmissionStatus", ${input.reviewNotes ?? null}, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          assessment_id = COALESCE(EXCLUDED.assessment_id, marks_submissions.assessment_id),
          class_id = COALESCE(EXCLUDED.class_id, marks_submissions.class_id),
          class_name = COALESCE(EXCLUDED.class_name, marks_submissions.class_name),
          subject_id = COALESCE(EXCLUDED.subject_id, marks_submissions.subject_id),
          subject_name = COALESCE(EXCLUDED.subject_name, marks_submissions.subject_name),
          academic_year = EXCLUDED.academic_year,
          term = EXCLUDED.term,
          status = EXCLUDED.status,
          review_notes = COALESCE(EXCLUDED.review_notes, marks_submissions.review_notes),
          submitted_by = CASE WHEN EXCLUDED.status = 'SUBMITTED'::"MarksSubmissionStatus" THEN COALESCE(EXCLUDED.submitted_by, marks_submissions.submitted_by) ELSE marks_submissions.submitted_by END,
          submitted_by_name = CASE WHEN EXCLUDED.status = 'SUBMITTED'::"MarksSubmissionStatus" THEN COALESCE(EXCLUDED.submitted_by_name, marks_submissions.submitted_by_name) ELSE marks_submissions.submitted_by_name END,
          submitted_at = CASE WHEN EXCLUDED.status = 'SUBMITTED'::"MarksSubmissionStatus" THEN COALESCE(EXCLUDED.submitted_at, marks_submissions.submitted_at, NOW()) ELSE marks_submissions.submitted_at END,
          updated_at = NOW()
      `;
      await logEvent({
        organizationId,
        submissionId: id,
        eventType: 'UPSERT',
        toStatus: status,
        actorId: actor.id,
        actorName: actor.name,
        actorRoles: actor.roles,
        metadata: { assessmentId: input.assessmentId ?? null, classId: input.classId ?? null },
      });
      return { id, status };
    } catch (e: any) {
      throw new AppError(400, e?.message || 'Unable to save marks submission');
    }
  },

  async transition(organizationId: string, id: string, actor: { id?: string; name?: string; roles?: string[] }, body: { status: SubmissionStatus; comment?: string }) {
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT id, status::text as status FROM marks_submissions WHERE id = $1 AND organization_id = $2 LIMIT 1`, id, organizationId);
    const row = rows[0];
    if (!row) throw new AppError(404, 'Marks submission not found');
    const from = String(row.status || 'DRAFT');
    const to = String(body.status || '').toUpperCase();
    if (!transitions[from]?.includes(to) && from !== to) {
      throw new AppError(400, `Cannot transition submission from ${from} to ${to}`);
    }
    const now = new Date();
    await prisma.$executeRawUnsafe(`
      UPDATE marks_submissions SET
        status = $3::"MarksSubmissionStatus",
        review_notes = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE review_notes END,
        returned_reason = CASE WHEN $3::text = 'RETURNED' THEN COALESCE($4::text, returned_reason) ELSE returned_reason END,
        reviewed_by = CASE WHEN $3::text IN ('UNDER_REVIEW','RETURNED','APPROVED') THEN $5 ELSE reviewed_by END,
        reviewed_by_name = CASE WHEN $3::text IN ('UNDER_REVIEW','RETURNED','APPROVED') THEN $6 ELSE reviewed_by_name END,
        reviewed_at = CASE WHEN $3::text IN ('UNDER_REVIEW','RETURNED','APPROVED') THEN $7 ELSE reviewed_at END,
        approved_by = CASE WHEN $3::text = 'APPROVED' THEN $5 ELSE approved_by END,
        approved_by_name = CASE WHEN $3::text = 'APPROVED' THEN $6 ELSE approved_by_name END,
        approved_at = CASE WHEN $3::text = 'APPROVED' THEN $7 ELSE approved_at END,
        submitted_by = CASE WHEN $3::text = 'SUBMITTED' THEN COALESCE(submitted_by, $5) ELSE submitted_by END,
        submitted_by_name = CASE WHEN $3::text = 'SUBMITTED' THEN COALESCE(submitted_by_name, $6) ELSE submitted_by_name END,
        submitted_at = CASE WHEN $3::text = 'SUBMITTED' THEN COALESCE(submitted_at, $7) ELSE submitted_at END,
        updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
    `, id, organizationId, to, body.comment ?? null, actor.id ?? null, actor.name ?? null, now);
    await logEvent({
      organizationId,
      submissionId: id,
      eventType: 'TRANSITION',
      fromStatus: from,
      toStatus: to,
      actorId: actor.id,
      actorName: actor.name,
      actorRoles: actor.roles,
      comment: body.comment ?? null,
    });
    return { id, from, to };
  },
};
