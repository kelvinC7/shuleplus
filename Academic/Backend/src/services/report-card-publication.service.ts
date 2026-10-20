import { AppError } from '../middleware/error.middleware';
import { gradingEngineService } from './grading-engine.service';
import { resolveAcademicClass, ensureAcademicStudent } from './sm-resolve.service';
import { smListStudents } from '../clients/student-management.client';
import {
  findReportCardPublicationRow,
  listReportCardPublicationRows,
  upsertReportCardPublicationRow,
} from './report-card-publication.store';

export const reportCardPublicationService = {
  async publishOne(
    organizationId: string,
    input: {
      studentId: string;
      classId: string;
      academicYear: string;
      term: string;
      publishedBy?: string | null;
      publishedByName?: string | null;
    }
  ) {
    const term = input.term?.trim();
    if (!term) throw new AppError(400, 'Term is required');
    const cls = await resolveAcademicClass(organizationId, { classId: input.classId });
    if (!cls) throw new AppError(404, 'Class not found');
    const student = await ensureAcademicStudent(organizationId, { studentId: input.studentId });

    await gradingEngineService.getReportCard(
      organizationId,
      student.id,
      cls.id,
      input.academicYear,
      term
    );

    const classLabel = [cls.name, cls.stream].filter(Boolean).join(' ').trim();
    const studentName = [student.firstName, student.lastName].filter(Boolean).join(' ').trim();

    return upsertReportCardPublicationRow({
      organizationId,
      studentId: student.id,
      classId: cls.id,
      className: classLabel || cls.name,
      studentName,
      studentCode: student.studentUid ?? student.studentCode ?? null,
      academicYear: input.academicYear,
      term,
      publishedBy: input.publishedBy ?? null,
      publishedByName: input.publishedByName ?? null,
    });
  },

  async publishClass(
    organizationId: string,
    input: {
      classId: string;
      academicYear: string;
      term: string;
      publishedBy?: string | null;
      publishedByName?: string | null;
    }
  ) {
    const term = input.term?.trim();
    if (!term) throw new AppError(400, 'Term is required');
    const cls = await resolveAcademicClass(organizationId, { classId: input.classId });
    if (!cls) throw new AppError(404, 'Class not found');

    const smStudents = (await smListStudents(organizationId, {
      classId: input.classId,
      academicYear: input.academicYear,
      status: 'ACTIVE',
    }).catch(() => [])) as Array<{ id: string }>;

    let published = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of smStudents) {
      try {
        await this.publishOne(organizationId, {
          studentId: row.id,
          classId: cls.id,
          academicYear: input.academicYear,
          term,
          publishedBy: input.publishedBy,
          publishedByName: input.publishedByName,
        });
        published += 1;
      } catch (e) {
        skipped += 1;
        if (errors.length < 5) {
          errors.push(e instanceof AppError ? e.message : 'Could not publish');
        }
      }
    }

    return { published, skipped, total: smStudents.length, errors };
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
    }
  ) {
    const term = input.term.trim();
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
    });
    if (!published) {
      throw new AppError(404, 'Report card is not published yet for this term.');
    }

    const report = await gradingEngineService.getReportCard(
      organizationId,
      student.id,
      cls.id,
      input.academicYear,
      term
    );
    return { publication: published, report };
  },
};
