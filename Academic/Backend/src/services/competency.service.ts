import { AssessmentLevel } from '../generated/prisma';
import { prisma } from '../config/database';

class CompetencyService {
  async createTemplate(organizationId: string, data: {
    name: string;
    academicLevel: string;
    competencies: any;
    description?: string;
  }) {
    return prisma.competencyTemplate.create({
      data: {
        organizationId,
        name: data.name,
        academicLevel: data.academicLevel as AssessmentLevel,
        competencies: data.competencies,
        description: data.description || null,
      },
    });
  }

  async getTemplates(organizationId: string) {
    return prisma.competencyTemplate.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplateById(id: string, organizationId: string) {
    return prisma.competencyTemplate.findFirst({
      where: { id, organizationId },
    });
  }

  async updateTemplate(id: string, organizationId: string, data: {
    name?: string;
    academicLevel?: string;
    competencies?: any;
    description?: string;
  }) {
    return prisma.competencyTemplate.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.academicLevel !== undefined && { academicLevel: data.academicLevel as AssessmentLevel }),
        ...(data.competencies !== undefined && { competencies: data.competencies }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });
  }

  async deleteTemplate(id: string, organizationId: string) {
    const template = await prisma.competencyTemplate.findFirst({
      where: { id, organizationId },
    });
    if (!template) throw new Error('Template not found');
    await prisma.competencyTemplate.delete({ where: { id } });
  }

  async recordStudentCompetency(organizationId: string, data: {
    templateId: string;
    assessmentId?: string;
    studentId: string;
    subjectId?: string;
    competencies: any;
    academicYear: string;
    term: string;
    recordedBy?: string;
  }) {
    const existing = await prisma.studentCompetency.findFirst({
      where: {
        organizationId,
        templateId: data.templateId,
        studentId: data.studentId,
        academicYear: data.academicYear,
        term: data.term,
        subjectId: data.subjectId || null,
      },
    });

    if (existing) {
      return prisma.studentCompetency.update({
        where: { id: existing.id },
        data: {
          competencies: data.competencies,
          assessmentId: data.assessmentId || existing.assessmentId,
          recordedBy: data.recordedBy || existing.recordedBy,
        },
      });
    }

    return prisma.studentCompetency.create({
      data: {
        organizationId,
        templateId: data.templateId,
        assessmentId: data.assessmentId || null,
        studentId: data.studentId,
        subjectId: data.subjectId || null,
        competencies: data.competencies,
        academicYear: data.academicYear,
        term: data.term,
        recordedBy: data.recordedBy || null,
      },
    });
  }

  async getStudentCompetencies(organizationId: string, studentId: string, academicYear?: string, term?: string) {
    const where: any = { organizationId, studentId };
    if (academicYear) where.academicYear = academicYear;
    if (term) where.term = term;

    return prisma.studentCompetency.findMany({
      where,
      include: { template: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClassCompetencies(organizationId: string, templateId: string, academicYear: string, term: string) {
    return prisma.studentCompetency.findMany({
      where: { organizationId, templateId, academicYear, term },
      include: {
        template: true,
        student: { select: { id: true, firstName: true, lastName: true, studentUid: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const competencyService = new CompetencyService();
