import { normalizeReportKind, type ReportKind } from '../utils/report-kind';
import { randomUUID } from 'crypto';
import { AppError } from '../middleware/error.middleware';
import { gradingEngineService } from './grading-engine.service';
import { resolveAcademicClass, ensureAcademicStudent } from './sm-resolve.service';
import { smListStudents } from '../clients/student-management.client';
import {
  findReportCardPublicationRow,
  listReportCardPublicationRows,
  upsertReportCardPublicationRow,
  type PublicationAccessPolicyValue,
} from './report-card-publication.store';
import { prisma } from '../config/database';
import { lookupReportCardAccess } from '../clients/school-fees.client';
import { env } from '../config/env';
import { parentMisAcademicClient } from '../clients/parent-mis.client';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function publicationStudentCode(student: {
  studentUid: string;
  studentCode?: string | null;
}) {
  const code = student.studentCode?.trim();
  if (code) return code;
  const uid = student.studentUid?.trim();
  if (uid && !UUID_RE.test(uid)) return uid;
  return uid ?? null;
}

function normalizeAccessPolicy(v?: string | null): PublicationAccessPolicyValue {
  return String(v || '').toUpperCase() === 'ALL_PARENTS' ? 'ALL_PARENTS' : 'PAID_ONLY';
}

async function writeAudit(organizationId: string, input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  batchId?: string | null;
  studentId?: string | null;
  classId?: string | null;
  academicYear?: string | null;
  term?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorRoles?: string[] | null;
  details?: any;
  afterState?: any;
  beforeState?: any;
}) {
  try {
    await prisma.$executeRaw`
      INSERT INTO academic_audit_logs (
        id, organization_id, action, entity_type, entity_id, batch_id, student_id, class_id,
        academic_year, term, actor_id, actor_name, actor_roles, before_state, after_state, details, created_at
      ) VALUES (
        ${randomUUID()}, ${organizationId}, ${input.action}, ${input.entityType}, ${input.entityId ?? null}, ${input.batchId ?? null},
        ${input.studentId ?? null}, ${input.classId ?? null}, ${input.academicYear ?? null}, ${input.term ?? null},
        ${input.actorId ?? null}, ${input.actorName ?? null}, ${input.actorRoles?.length ? input.actorRoles.join(',') : null},
        ${input.beforeState ? JSON.stringify(input.beforeState) : null}::jsonb,
        ${input.afterState ? JSON.stringify(input.afterState) : null}::jsonb,
        ${input.details ? JSON.stringify(input.details) : null}::jsonb,
        NOW()
      )
    `;
  } catch {
    // best-effort
  }
}

async function enqueueNotificationHook(organizationId: string, input: {
  eventType: string;
  entityType?: string;
  entityId?: string | null;
  batchId?: string | null;
  studentId?: string | null;
  studentCode?: string | null;
  classId?: string | null;
  academicYear?: string | null;
  term?: string | null;
  accessPolicy?: PublicationAccessPolicyValue | null;
  payload?: any;
}) {
  try {
    await prisma.$executeRaw`
      INSERT INTO academic_notification_outbox (
        id, organization_id, event_type, entity_type, entity_id, batch_id, student_id, student_code,
        class_id, academic_year, term, access_policy, target_module, status, attempts, payload, created_at, updated_at
      ) VALUES (
        ${randomUUID()}, ${organizationId}, ${input.eventType}, ${input.entityType ?? null}, ${input.entityId ?? null},
        ${input.batchId ?? null}, ${input.studentId ?? null}, ${input.studentCode ?? null}, ${input.classId ?? null},
        ${input.academicYear ?? null}, ${input.term ?? null},
        ${input.accessPolicy ? `${input.accessPolicy}` : null}::"PublicationAccessPolicy",
        'parentmis', 'PENDING', 0, ${input.payload ? JSON.stringify(input.payload) : null}::jsonb, NOW(), NOW()
      )
    `;
  } catch {
    // best-effort
  }
}

async function notifyParentMisPublish(organizationId: string, payload: any) {
  const base = ((env as any).PARENTMIS_API_URL || (env as any).PARENT_MIS_API_URL || '').replace(/\/$/, '');
  if (!base) return;
  try {
    await fetch(`${base}/webhooks/academic-publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': (env as any).SERVICE_API_KEY || (env as any).PARENT_MIS_SERVICE_API_KEY || '',
        'x-source-service': 'academic',
      },
      body: JSON.stringify({ organizationId, ...payload }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // non-blocking
  }
}

export const reportCardPublicationService = {
  async publishOne(
    organizationId: string,
    input: {
      studentId: string;
      classId: string;
      academicYear: string;
      term: string;
      reportKind?: ReportKind;
      publishedBy?: string | null;
      publishedByName?: string | null;
      accessPolicy?: PublicationAccessPolicyValue | string;
      batchId?: string | null;
      notifyInApp?: boolean;
      notifyPush?: boolean;
      includeReportLink?: boolean;
      notifyParents?: boolean;
      actorRoles?: string[];
    }
  ) {
    const term = input.term?.trim();
    if (!term) throw new AppError(400, 'Term is required');
    const reportKind = normalizeReportKind(input.reportKind);
    const accessPolicy = normalizeAccessPolicy(input.accessPolicy);
    const cls = await resolveAcademicClass(organizationId, { classId: input.classId });
    if (!cls) throw new AppError(404, 'Class not found');
    const student = await ensureAcademicStudent(organizationId, { studentId: input.studentId });

    await gradingEngineService.getReportCard(
      organizationId,
      student.id,
      cls.id,
      input.academicYear,
      term,
      undefined,
      reportKind
    );

    const classLabel = [cls.name, cls.stream].filter(Boolean).join(' ').trim();
    const studentName = [student.firstName, student.lastName].filter(Boolean).join(' ').trim();
    const studentCode = publicationStudentCode(student);
    const notifyParents = input.notifyParents ?? accessPolicy === 'ALL_PARENTS';

    const publication = await upsertReportCardPublicationRow({
      organizationId,
      studentId: student.id,
      classId: cls.id,
      className: classLabel || cls.name,
      studentName,
      studentCode,
      academicYear: input.academicYear,
      term,
      reportKind,
      publishedBy: input.publishedBy ?? null,
      publishedByName: input.publishedByName ?? null,
      accessPolicy,
      batchId: input.batchId ?? null,
      status: 'PUBLISHED',
    });

    const payload = {
      eventType: 'REPORT_CARD_PUBLISHED',
      studentId: student.id,
      studentCode,
      studentName,
      classId: cls.id,
      className: classLabel || cls.name,
      academicYear: input.academicYear,
      term,
      reportKind,
      accessPolicy,
      publicationId: publication.id,
      batchId: input.batchId ?? publication.batchId ?? null,
      notifyInApp: input.notifyInApp !== false,
      notifyPush: input.notifyPush !== false,
      includeReportLink: input.includeReportLink !== false,
      notifyParents,
      publishedAt: publication.publishedAt,
    };

    await writeAudit(organizationId, {
      action: 'REPORT_CARD_PUBLISHED',
      entityType: 'report_card_publication',
      entityId: publication.id,
      batchId: input.batchId ?? publication.batchId ?? null,
      studentId: student.id,
      classId: cls.id,
      academicYear: input.academicYear,
      term,
      actorId: input.publishedBy ?? null,
      actorName: input.publishedByName ?? null,
      actorRoles: input.actorRoles ?? null,
      afterState: { publication, accessPolicy, notifyParents },
      details: payload,
    });

    if (notifyParents) {
      await enqueueNotificationHook(organizationId, {
        eventType: 'REPORT_CARD_PUBLISHED',
        entityType: 'report_card_publication',
        entityId: publication.id,
        batchId: input.batchId ?? publication.batchId ?? null,
        studentId: student.id,
        studentCode,
        classId: cls.id,
        academicYear: input.academicYear,
        term,
        accessPolicy,
        payload,
      });

      await notifyParentMisPublish(organizationId, payload);

      try {
        if (parentMisAcademicClient.isEnabled()) {
          await parentMisAcademicClient.notifyAcademicEvent({
            organizationId,
            studentId: student.id,
            studentCode: student.studentUid ?? student.studentCode ?? student.id,
            studentName,
            title: `Marks published: ${term} ${input.academicYear}`,
            body: `${studentName}'s ${term} ${input.academicYear} report/marks are now published${classLabel ? ` for ${classLabel}` : ''}.`,
            eventType: 'REPORT_CARD_PUBLISHED',
            priority: 'IMPORTANT',
            link: '/academics?tab=reports',
            metadata: {
              module: 'academic',
              action: 'report_card_published',
              classId: cls.id,
              className: classLabel || cls.name,
              academicYear: input.academicYear,
              term,
              reportKind,
              accessPolicy,
            },
          });
        }
      } catch (err) {
        console.warn('[Academic] Failed to notify parent for published report card:', err);
      }
    }

    return publication;
  },

  async publishClass(
    organizationId: string,
    input: {
      classId: string;
      academicYear: string;
      term: string;
      reportKind?: ReportKind;
      /** Publish only these students (legacy subset). Ignored when selectedStudentIds is provided. */
      studentIds?: string[];
      /** Students who should receive marks now (ALL_PARENTS + notify). When provided, all class students are published: selected granted, others PAID_ONLY. */
      selectedStudentIds?: string[];
      accessPolicy?: PublicationAccessPolicyValue | string;
      publicationType?: string;
      notifyInApp?: boolean;
      notifyPush?: boolean;
      includeReportLink?: boolean;
      publishedBy?: string | null;
      publishedByName?: string | null;
      actorRoles?: string[];
    }
  ) {
    const term = input.term?.trim();
    if (!term) throw new AppError(400, 'Term is required');
    const cls = await resolveAcademicClass(organizationId, { classId: input.classId });
    if (!cls) throw new AppError(404, 'Class not found');
    const reportKind = normalizeReportKind(input.reportKind);
    const defaultAccessPolicy = normalizeAccessPolicy(input.accessPolicy);
    const splitMode = Array.isArray(input.selectedStudentIds);

    const smStudents = (await smListStudents(organizationId, {
      classId: input.classId,
      academicYear: input.academicYear,
      status: 'ACTIVE',
    }).catch(() => [])) as Array<{ id: string; studentCode?: string; firstName?: string; lastName?: string; fullName?: string }>;

    const selectedSet = splitMode ? new Set(input.selectedStudentIds || []) : null;
    const requested = !splitMode && input.studentIds?.length ? new Set(input.studentIds) : null;
    const targets = splitMode
      ? smStudents
      : requested
        ? smStudents.filter((s) => requested.has(s.id))
        : smStudents;

    const batchId = randomUUID();
    const classLabel = [cls.name, cls.stream].filter(Boolean).join(' ').trim();
    const batchAccessPolicy: PublicationAccessPolicyValue = splitMode ? 'PAID_ONLY' : defaultAccessPolicy;
    try {
      await prisma.$executeRaw`
        INSERT INTO report_publication_batches (
          id, organization_id, academic_year, term, report_kind, publication_type, class_id, class_name,
          access_policy, status, notify_in_app, notify_push, include_report_link, selected_count,
          published_count, skipped_count, published_at, published_by, published_by_name, created_at, updated_at
        ) VALUES (
          ${batchId}, ${organizationId}, ${input.academicYear}, ${term}, ${reportKind}, ${input.publicationType ?? null},
          ${cls.id}, ${classLabel || cls.name}, ${batchAccessPolicy}::"PublicationAccessPolicy", 'DRAFT',
          ${input.notifyInApp !== false}, ${input.notifyPush !== false}, ${input.includeReportLink !== false},
          ${targets.length}, 0, 0, NOW(), ${input.publishedBy ?? null}, ${input.publishedByName ?? null}, NOW(), NOW()
        )
      `;
    } catch {
      // continue without batch table in partially migrated env
    }

    let published = 0;
    let skipped = 0;
    let granted = 0;
    let payToView = 0;
    const errors: string[] = [];

    for (const row of targets) {
      try {
        const isGranted = splitMode ? selectedSet!.has(row.id) : defaultAccessPolicy === 'ALL_PARENTS';
        const studentAccessPolicy: PublicationAccessPolicyValue = splitMode
          ? (isGranted ? 'ALL_PARENTS' : 'PAID_ONLY')
          : defaultAccessPolicy;
        const pub = await this.publishOne(organizationId, {
          studentId: row.id,
          classId: cls.id,
          academicYear: input.academicYear,
          term,
          reportKind,
          accessPolicy: studentAccessPolicy,
          batchId,
          notifyInApp: input.notifyInApp,
          notifyPush: input.notifyPush,
          includeReportLink: input.includeReportLink,
          notifyParents: isGranted,
          publishedBy: input.publishedBy,
          publishedByName: input.publishedByName,
          actorRoles: input.actorRoles,
        });
        published += 1;
        if (isGranted) granted += 1; else payToView += 1;
        try {
          await prisma.$executeRaw`
            INSERT INTO report_publication_recipients (
              id, organization_id, batch_id, publication_id, student_id, student_code, student_name,
              class_id, class_name, academic_year, term, report_kind, access_policy, status, published_at, created_at, updated_at
            ) VALUES (
              ${randomUUID()}, ${organizationId}, ${batchId}, ${pub.id}, ${pub.studentId}, ${pub.studentCode},
              ${pub.studentName}, ${pub.classId}, ${pub.className}, ${pub.academicYear}, ${pub.term}, ${pub.reportKind},
              ${studentAccessPolicy}::"PublicationAccessPolicy", 'PUBLISHED', ${pub.publishedAt}, NOW(), NOW()
            )
            ON CONFLICT (organization_id, batch_id, student_id, report_kind)
            DO UPDATE SET publication_id = EXCLUDED.publication_id, status = 'PUBLISHED', published_at = EXCLUDED.published_at,
              access_policy = EXCLUDED.access_policy, updated_at = NOW()
          `;
        } catch {
          // best-effort
        }
      } catch (e) {
        skipped += 1;
        if (errors.length < 10) errors.push(e instanceof AppError ? e.message : 'Could not publish');
      }
    }

    try {
      await prisma.$executeRaw`
        UPDATE report_publication_batches
        SET status = ${published > 0 && skipped === 0 ? 'PUBLISHED' : published > 0 ? 'PARTIALLY_PUBLISHED' : 'DRAFT'}::"PublicationBatchStatus",
            published_count = ${published}, skipped_count = ${skipped}, updated_at = NOW()
        WHERE id = ${batchId}
      `;
    } catch {
      // best-effort
    }

    await writeAudit(organizationId, {
      action: 'REPORT_PUBLICATION_BATCH',
      entityType: 'report_publication_batch',
      entityId: batchId,
      batchId,
      classId: cls.id,
      academicYear: input.academicYear,
      term,
      actorId: input.publishedBy ?? null,
      actorName: input.publishedByName ?? null,
      actorRoles: input.actorRoles ?? null,
      details: { published, skipped, total: targets.length, granted, payToView, accessPolicy: batchAccessPolicy, splitMode, reportKind },
    });

    return { batchId, published, skipped, total: targets.length, granted, payToView, errors, accessPolicy: batchAccessPolicy, reportKind };
  },

  async list(
    organizationId: string,
    filters: {
      academicYear?: string;
      term?: string;
      classId?: string;
      className?: string;
      search?: string;
    }
  ) {
    return listReportCardPublicationRows(organizationId, filters);
  },

  async listBatches(
    organizationId: string,
    filters: { academicYear?: string; term?: string; classId?: string }
  ) {
    try {
      const rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, organization_id as "organizationId", academic_year as "academicYear", term,
               report_kind as "reportKind", publication_type as "publicationType", class_id as "classId",
               class_name as "className", access_policy as "accessPolicy", status,
               notify_in_app as "notifyInApp", notify_push as "notifyPush", include_report_link as "includeReportLink",
               selected_count as "selectedCount", published_count as "publishedCount", skipped_count as "skippedCount",
               published_at as "publishedAt", published_by as "publishedBy", published_by_name as "publishedByName",
               created_at as "createdAt"
        FROM report_publication_batches
        WHERE organization_id = $1
          AND ($2::text IS NULL OR academic_year = $2)
          AND ($3::text IS NULL OR term = $3)
          AND ($4::text IS NULL OR class_id = $4)
        ORDER BY published_at DESC, created_at DESC
        LIMIT 200
      `, organizationId, filters.academicYear?.trim() || null, filters.term?.trim() || null, filters.classId?.trim() || null);
      return rows;
    } catch {
      return [];
    }
  },

  async isPublished(
    organizationId: string,
    studentId: string,
    classId: string,
    academicYear: string,
    term: string
  ) {
    const cls = await resolveAcademicClass(organizationId, { classId });
    const student = await ensureAcademicStudent(organizationId, { studentId });
    const row = await findReportCardPublicationRow({
      organizationId,
      studentId: student.id,
      classId: cls?.id ?? classId,
      academicYear,
      term,
    });
    return Boolean(row);
  },

  async getPublishedReportForParent(
    organizationId: string,
    input: {
      studentId?: string;
      studentCode?: string;
      classId?: string;
      academicYear: string;
      term: string;
      reportKind?: ReportKind;
      enforceFeesPolicy?: boolean;
    }
  ) {
    const term = input.term.trim();
    const reportKind = normalizeReportKind(input.reportKind);
    let student = null;
    if (input.studentId) {
      student = await ensureAcademicStudent(organizationId, { studentId: input.studentId });
    } else if (input.studentCode) {
      student = await ensureAcademicStudent(organizationId, {
        studentId: input.studentCode,
        studentCode: input.studentCode,
      });
    }
    if (!student) throw new AppError(400, 'Student is required');

    const cls = input.classId
      ? await resolveAcademicClass(organizationId, { classId: input.classId })
      : null;
    if (!cls) throw new AppError(400, 'Class is required');

    const published = await findReportCardPublicationRow({
      organizationId,
      studentId: student.id,
      classId: cls.id,
      academicYear: input.academicYear,
      term,
      reportKind,
    });
    if (!published) {
      throw new AppError(404, 'Report card is not published yet for this term.');
    }

    if (input.enforceFeesPolicy !== false && published.accessPolicy === 'PAID_ONLY') {
      const access = await lookupReportCardAccess({
        organizationId,
        academicYear: input.academicYear,
        term,
        studentId: student.id,
        studentCode: publicationStudentCode(student) || input.studentCode || undefined,
        className: [cls.name, cls.stream].filter(Boolean).join(' ').trim() || cls.name,
      });
      if (!access.published) {
        // If Fees cannot see publication but Academic has it, still enforce denial for paid-only when unknown? treat as not allowed
        throw new AppError(access.allowed ? 404 : 403, access.message || 'Report card access is not available.');
      }
      if (!access.allowed) {
        throw new AppError(403, access.message || 'Please clear required school fees to view this report card.');
      }
    }

    const report = await gradingEngineService.getReportCard(
      organizationId,
      student.id,
      cls.id,
      input.academicYear,
      term,
      undefined,
      reportKind
    );
    return { publication: published, report };
  },
};
