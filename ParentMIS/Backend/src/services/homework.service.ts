import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { resolveParentContext, resolveActiveStudent } from './parent-context.service';
import type { StudentSelector } from '../utils/student-param';

export type HomeworkIngestPayload = {
  organizationId: string;
  assignment: {
    id: string;
    title: string;
    description?: string | null;
    subject?: string;
    className?: string;
    teacher?: string;
    homeworkType?: string;
    assignedDate?: string;
    dueDate?: string;
    maxScore?: number | null;
    estimatedMinutes?: number | null;
    questions?: unknown[];
    attachment?: { fileUrl?: string; fileName?: string } | null;
    resourceUrl?: string | null;
    submissionMode?: string | null;
  };
  students: Array<{ shuleCode?: string; smStudentId?: string; name?: string }>;
};

function normalizeStatus(raw?: string | null): string {
  const v = String(raw || 'PENDING').toUpperCase();
  if (['SUBMITTED', 'IN_PROGRESS', 'REVIEWED', 'COMPLETED'].includes(v)) return v;
  return 'PENDING';
}

function mapHomeworkRow(h: {
  id: string;
  subject: string;
  title: string;
  description: string | null;
  teacher: string | null;
  assignedDate: Date;
  dueDate: Date;
  status: string;
  homeworkType: string;
  className: string | null;
  maxScore: number | null;
  estimatedMinutes: number | null;
  questionCount: number | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  resourceUrl: string | null;
  submissionMode: string | null;
  score: number | null;
  feedback: string | null;
  submittedAt: Date | null;
  assignmentId: string | null;
}) {
  return {
    id: h.id,
    assignmentId: h.assignmentId,
    subject: h.subject,
    title: h.title,
    description: h.description,
    teacher: h.teacher,
    assignedDate: h.assignedDate.toISOString(),
    dueDate: h.dueDate.toISOString(),
    status: h.status,
    homeworkType: h.homeworkType,
    className: h.className,
    maxScore: h.maxScore,
    estimatedMinutes: h.estimatedMinutes,
    questionCount: h.questionCount,
    attachmentUrl: h.attachmentUrl,
    attachmentName: h.attachmentName,
    resourceUrl: h.resourceUrl,
    submissionMode: h.submissionMode,
    score: h.score,
    feedback: h.feedback,
    submittedAt: h.submittedAt?.toISOString() ?? null,
  };
}

export class HomeworkService {
  async list(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const { studentId } = await resolveParentContext(organizationId, parentId, requestedStudentId);
    const items = await prisma.homework.findMany({
      where: { studentId },
      orderBy: { dueDate: 'asc' },
    });
    return items.map(mapHomeworkRow);
  }

  async stats(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const items = await this.list(organizationId, parentId, requestedStudentId);
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    let pending = 0;
    let dueToday = 0;
    let completed = 0;

    for (const h of items) {
      const st = normalizeStatus(h.status);
      if (st === 'PENDING' || st === 'IN_PROGRESS') pending += 1;
      if (st === 'SUBMITTED' || st === 'REVIEWED' || st === 'COMPLETED') completed += 1;
      const due = new Date(h.dueDate);
      if ((st === 'PENDING' || st === 'IN_PROGRESS') && due >= todayStart && due <= todayEnd) {
        dueToday += 1;
      }
    }

    return { pending, dueToday, completed, total: items.length };
  }

  async getOne(organizationId: string, parentId: string, homeworkId: string, requestedStudentId?: StudentSelector) {
    const { studentId } = await resolveParentContext(organizationId, parentId, requestedStudentId);
    const row = await prisma.homework.findFirst({
      where: { id: homeworkId, studentId, organizationId },
    });
    if (!row) throw new AppError(404, 'Homework not found');
    return {
      ...mapHomeworkRow(row),
      questions: row.questionsJson ?? [],
      answers: row.answersJson ?? null,
    };
  }

  async saveDraft(
    organizationId: string,
    parentId: string,
    homeworkId: string,
    answers: unknown,
    requestedStudentId?: StudentSelector
  ) {
    const { studentId } = await resolveParentContext(organizationId, parentId, requestedStudentId);
    const row = await prisma.homework.findFirst({
      where: { id: homeworkId, studentId, organizationId },
    });
    if (!row) throw new AppError(404, 'Homework not found');
    const updated = await prisma.homework.update({
      where: { id: row.id },
      data: {
        answersJson: answers as object,
        status: 'IN_PROGRESS',
      },
    });
    return mapHomeworkRow(updated);
  }

  async submit(
    organizationId: string,
    parentId: string,
    homeworkId: string,
    input: { answers?: unknown; fileUrl?: string; fileName?: string },
    requestedStudentId?: StudentSelector
  ) {
    const { studentId } = await resolveParentContext(organizationId, parentId, requestedStudentId);
    const row = await prisma.homework.findFirst({
      where: { id: homeworkId, studentId, organizationId },
    });
    if (!row) throw new AppError(404, 'Homework not found');

    const answers =
      input.answers ??
      (input.fileUrl
        ? { fileUrl: input.fileUrl, fileName: input.fileName || 'submission' }
        : row.answersJson);

    const updated = await prisma.homework.update({
      where: { id: row.id },
      data: {
        answersJson: answers as object,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
    return mapHomeworkRow(updated);
  }

  async ingest(payload: HomeworkIngestPayload) {
    const { organizationId, assignment, students } = payload;
    if (!organizationId || !assignment?.id) {
      throw new AppError(400, 'organizationId and assignment.id required');
    }

    const assignedDate = assignment.assignedDate ? new Date(assignment.assignedDate) : new Date();
    const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : new Date(Date.now() + 7 * 86400000);
    const questions = Array.isArray(assignment.questions) ? assignment.questions : [];
    let synced = 0;

    for (const st of students || []) {
      const shuleCode = String(st.shuleCode || '').trim();
      if (!shuleCode) continue;

      const student = await prisma.student.findFirst({
        where: { organizationId, shuleCode },
      });
      if (!student) continue;

      const existing = await prisma.homework.findFirst({
        where: {
          organizationId,
          studentId: student.id,
          assignmentId: assignment.id,
        },
      });

      const data = {
        organizationId,
        studentId: student.id,
        subject: assignment.subject || 'General',
        title: assignment.title,
        description: assignment.description || null,
        teacher: assignment.teacher || null,
        assignedDate,
        dueDate,
        status: 'PENDING',
        assignmentId: assignment.id,
        homeworkType: assignment.homeworkType || 'QUIZ',
        className: assignment.className || null,
        maxScore: assignment.maxScore ?? null,
        estimatedMinutes: assignment.estimatedMinutes ?? null,
        questionCount: questions.length || null,
        questionsJson: questions.length ? (questions as object) : undefined,
        attachmentUrl: assignment.attachment?.fileUrl || null,
        attachmentName: assignment.attachment?.fileName || null,
        resourceUrl: assignment.resourceUrl || null,
        submissionMode: assignment.submissionMode || 'SYSTEM',
      };

      if (existing) {
        await prisma.homework.update({ where: { id: existing.id }, data });
      } else {
        await prisma.homework.create({ data });
      }
      synced += 1;
    }

    return { synced, total: (students || []).length };
  }
}

export const homeworkService = new HomeworkService();
