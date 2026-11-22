import { Prisma } from '@prisma/client';
import type { ProvenanceField } from '../templates/reb-primary-cbc';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { allocateStageMinutes, validateStageTimings } from '../utils/timing';
import { retrieveLessonContext } from './retrieval.service';
import { getAiStatusPublic, resolveActiveProvider } from './ai-provider.service';
import {
  buildAssessmentFromObjectives,
  buildInstructionalObjectiveField,
  buildProcedureStages,
  buildReferencesField,
  pf,
} from './lesson-plan-draft.builder';
import { generateFromPythonWorker, usePythonForGeneration } from './local-lesson-generator.service';
import type { RebStageKey } from '../utils/timing';

export interface GenerateLessonPlanInput {
  organizationId: string;
  schoolId?: string;
  schoolName?: string;
  teacherId: string;
  teacherName?: string;
  teacherEmail?: string;
  curriculumLessonId: string;
  durationMinutes: number;
  classSize?: number;
  language?: string;
  lessonDate?: string;
  termLabel?: string;
  academicYear?: string;
  subjectLabel?: string;
  gradeLabel?: string;
  className?: string;
  maleLearners?: number;
  femaleLearners?: number;
  specialEducationalNeeds?: string;
  availableMaterials?: string;
  teacherNotes?: string;
  variant?: 'standard' | 'practical' | 'simplified' | 'inclusive';
}

function splitMaterialLines(text: string): string[] {
  return text
    .split(/[;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

function buildCurriculumIntelligenceFromContext(
  lesson: Awaited<ReturnType<typeof loadPublishedLessonContext>>['lesson'],
  retrieved: Awaited<ReturnType<typeof retrieveLessonContext>> | null
) {
  const structured = retrieved?.structured;
  const objectiveStatements = lesson.objectives.map((o) => o.statement);
  const materialsListFromExtract = [
    ...(structured?.materials ?? []),
    ...(structured?.tools ?? []),
    ...(Array.isArray(lesson.materials) ? (lesson.materials as string[]) : []),
  ].filter(Boolean);
  const uniqueMaterials = [...new Set(materialsListFromExtract.map((m) => String(m).trim()).filter(Boolean))];
  return {
    tools: structured?.tools ?? [],
    requirements: structured?.requirements ?? [],
    materials: uniqueMaterials,
    pupilActivities: structured?.pupilActivities ?? [],
    pupilExercises: structured?.pupilExercises ?? [],
    intelligenceNotes: structured?.intelligenceNotes ?? [],
    keyUnitCompetence: lesson.unit.keyCompetence ?? '',
    officialObjectives: objectiveStatements,
    hasPupilsBook: Boolean(retrieved?.companionBookId),
  };
}

function enrichPlanContentRecord(
  planContent: Record<string, unknown>,
  intelligence: ReturnType<typeof buildCurriculumIntelligenceFromContext>,
  intelligenceSummary?: string
) {
  if (!planContent.curriculumIntelligence) {
    planContent.curriculumIntelligence = intelligence;
  }
  const meta = (planContent.meta ?? {}) as Record<string, unknown>;
  if (intelligenceSummary && !meta.intelligenceSummary) {
    meta.intelligenceSummary = intelligenceSummary;
  }
  if (intelligence.hasPupilsBook && meta.hasPupilsBook == null) {
    meta.hasPupilsBook = true;
  }
  planContent.meta = meta;
  const prep = (planContent.preparation ?? {}) as Record<string, unknown>;
  const list = prep.learningMaterialsList as { value?: unknown } | undefined;
  if (!list?.value && intelligence.materials.length) {
    prep.learningMaterialsList = {
      value: intelligence.materials,
      provenance: 'source',
    };
  }
  planContent.preparation = prep;
  return planContent;
}

function qualityFlagsFromPlan(plan: Record<string, unknown>): string[] {
  const flags: string[] = [];
  const general = plan.general as Record<string, ProvenanceField>;
  if (general?.schoolName?.provenance === 'missing') flags.push('missing_school_name');
  if (general?.teacherName?.provenance === 'missing') flags.push('missing_teacher_name');
  if (general?.lessonNumber?.provenance === 'missing') flags.push('unverified_lesson_number');
  if (general?.keyUnitCompetence?.note) flags.push('verify_key_unit_competence_wording');
  const timing = plan.timingValidation as { ok?: boolean };
  if (timing && !timing.ok) flags.push('timing_mismatch');
  return flags;
}

export async function loadPublishedLessonContext(lessonId: string) {
  const lesson = await prisma.curriculumLesson.findUnique({
    where: { id: lessonId },
    include: {
      objectives: { orderBy: { sortOrder: 'asc' } },
      references: true,
      unit: {
        include: {
          book: true,
        },
      },
    },
  });

  if (!lesson) throw new AppError(404, 'Curriculum lesson not found');
  const book = lesson.unit.book;
  if (book.processingStatus !== 'PUBLISHED') {
    throw new AppError(403, 'This curriculum lesson is not published yet.');
  }

  return { lesson, book };
}

export async function generateLessonPlanDraft(input: GenerateLessonPlanInput) {
  const { lesson, book } = await loadPublishedLessonContext(input.curriculumLessonId);
  const retrieved = await retrieveLessonContext(lesson.id).catch(() => null);
  const hasCorpus = Boolean(retrieved?.corpus?.trim());
  const stageMinutes = allocateStageMinutes(input.durationMinutes);

  const objectives = lesson.objectives.map((o) =>
    pf(o.statement, o.isOfficial ? 'source' : 'ai_suggestion', undefined, o.sourcePages as number[])
  );

  const materialsFromSource = Array.isArray(lesson.materials) ? (lesson.materials as string[]) : [];
  const materialsList =
    input.availableMaterials?.trim() ||
    materialsFromSource.join(', ') ||
    'Exercise books, pencils, and materials listed in the Teacher\'s Guide for this lesson.';

  const unitTitle = pf(
    lesson.unit.title,
    'source',
    undefined,
    lesson.unit.sourcePageStart ? [lesson.unit.sourcePageStart] : undefined
  );

  const keyUnitCompetence = pf(
    lesson.unit.keyCompetence ?? '',
    lesson.unit.keyCompetence ? 'source' : 'missing',
    lesson.unit.keyCompetence ? undefined : 'Add key unit competence from the Teacher’s Guide if required by your school.'
  );

  const referencesField = buildReferencesField(lesson, book);
  const objectiveStatements = lesson.objectives.map((o) => o.statement);
  const corpus = retrieved?.corpus ?? '';

  let instructionalObjective;
  let stages;
  let assessmentBlock;
  let homeworkItems: string[];
  let learningMaterialsText = materialsList;
  let generationEngine = 'reb-template-v1';
  let intelligenceSummary = '';

  if (usePythonForGeneration()) {
    const py = await generateFromPythonWorker({
      lesson: { title: lesson.title, lessonNumber: lesson.lessonNumber, materials: lesson.materials },
      structured: retrieved?.structured as Record<string, unknown> | undefined,
      companionBookId: retrieved?.companionBookId,
      book: { title: book.title, subject: book.subject, grade: book.grade },
      unit: { unitNumber: lesson.unit.unitNumber, title: lesson.unit.title },
      objectives: objectiveStatements,
      corpus,
      durationMinutes: input.durationMinutes,
      stageMinutes,
      materialsHint: materialsList,
    });
    generationEngine = py.engine;
    intelligenceSummary =
      py.intelligenceSummary?.trim() ||
      (py.meta?.hasPupilsBook
        ? 'Lesson plan aligned with Teacher\'s Guide + Pupil\'s Book.'
        : 'Built from Teacher\'s Guide curriculum extraction.');
    const fromGuide = hasCorpus ? ('source' as const) : ('ai_suggestion' as const);
    instructionalObjective = pf(
      py.instructionalObjective,
      lesson.objectives.length ? 'source' : fromGuide
    );
    learningMaterialsText = py.learningMaterials || materialsList;
    stages = py.stages.map((s) => ({
      key: s.key,
      title: s.title,
      minutes: s.minutes,
      teacherActivities: pf(s.teacherActivities, fromGuide, undefined, lesson.sourcePages as number[]),
      learnerActivities: pf(s.learnerActivities, fromGuide),
      genericCompetences: pf(s.genericCompetences, 'ai_suggestion'),
      crossCuttingIssues: pf(s.crossCuttingIssues || '', s.crossCuttingIssues ? 'ai_suggestion' : 'missing'),
    }));
    assessmentBlock = {
      questions: pf(py.assessmentQuestions, lesson.objectives.length ? 'source' : 'ai_suggestion'),
      expectedAnswers: pf(
        py.assessmentQuestions.map(() => 'Use Teacher\'s Guide marking guidance.'),
        'ai_suggestion'
      ),
      markingGuide: pf('Mark according to REB criteria for each question.', 'ai_suggestion'),
    };
    homeworkItems = py.homework;
  } else {
    instructionalObjective = retrieved
      ? await buildInstructionalObjectiveField(lesson, retrieved, {
          organizationId: input.organizationId,
          teacherId: input.teacherId,
        })
      : await buildInstructionalObjectiveField(
          lesson,
          {
            lesson,
            book,
            unit: lesson.unit,
            objectives: objectiveStatements,
            sourceChunks: [],
            corpus: '',
            structured: {
              tools: [],
              requirements: [],
              materials: [],
              teacherActivities: [],
              learnerActivities: [],
              pupilActivities: [],
              pupilExercises: [],
              intelligenceNotes: [],
            },
            companionBookId: null,
          },
          { organizationId: input.organizationId, teacherId: input.teacherId }
        );
    stages = buildProcedureStages(lesson, book, stageMinutes, hasCorpus);
    assessmentBlock = buildAssessmentFromObjectives(lesson.objectives);
    homeworkItems = [
      `Review today's lesson on "${lesson.title}" using the Teacher's Guide practice tasks.`,
      'Complete any unfinished exercises from the lesson activity.',
      'Prepare one question to ask at the start of the next lesson.',
    ];
  }

  const schoolName = (input.schoolName ?? '').trim();
  const teacherName = (input.teacherName ?? '').trim();

  const timingValidation = validateStageTimings(
    stages.map((s) => ({ key: s.key, minutes: s.minutes })),
    input.durationMinutes
  );

  const structured = retrieved?.structured;
  const materialsListFromExtract = [
    ...(structured?.materials ?? []),
    ...(structured?.tools ?? []),
    ...(Array.isArray(lesson.materials) ? (lesson.materials as string[]) : []),
  ].filter(Boolean);
  const uniqueMaterials = [...new Set(materialsListFromExtract.map((m) => m.trim()).filter(Boolean))];

  const curriculumIntelligence = {
    tools: structured?.tools ?? [],
    requirements: structured?.requirements ?? [],
    materials: uniqueMaterials,
    pupilActivities: structured?.pupilActivities ?? [],
    pupilExercises: structured?.pupilExercises ?? [],
    intelligenceNotes: structured?.intelligenceNotes ?? [],
    keyUnitCompetence: lesson.unit.keyCompetence ?? '',
    officialObjectives: objectiveStatements,
    hasPupilsBook: Boolean(retrieved?.companionBookId),
  };

  const planContent = {
    templateSlug: 'reb-primary-cbc',
    meta: {
      bookId: book.id,
      bookTitle: book.title,
      curriculumVersion: book.version,
      generatedAt: new Date().toISOString(),
      variant: input.variant ?? 'standard',
      generationEngine,
      intelligenceSummary: intelligenceSummary || undefined,
      hasPupilsBook: Boolean(retrieved?.companionBookId),
      sourceReferences: lesson.references.map((r) => ({
        label: r.label,
        pageStart: r.pageStart,
        pageEnd: r.pageEnd,
      })),
    },
    general: {
      schoolName: pf(schoolName, schoolName ? 'teacher' : 'missing', schoolName ? undefined : 'School name not found — enter manually.'),
      teacherName: pf(teacherName, teacherName ? 'teacher' : 'missing', teacherName ? undefined : 'Teacher name not found — enter manually.'),
      termLabel: pf(input.termLabel ?? '', input.termLabel ? 'teacher' : 'missing'),
      academicYear: pf(input.academicYear ?? '', input.academicYear ? 'teacher' : 'missing'),
      lessonDate: pf(input.lessonDate ?? '', input.lessonDate ? 'teacher' : 'missing'),
      subject: pf(input.subjectLabel ?? book.subject, 'source'),
      grade: pf(input.gradeLabel ?? input.className ?? book.grade, 'teacher'),
      className: pf(input.className ?? '', input.className ? 'teacher' : 'missing'),
      maleLearners: pf(input.maleLearners ?? 0, input.maleLearners != null ? 'teacher' : 'missing'),
      femaleLearners: pf(input.femaleLearners ?? 0, input.femaleLearners != null ? 'teacher' : 'missing'),
      unitNumber: pf(lesson.unit.unitNumber, 'source'),
      lessonNumber: pf(lesson.lessonNumber ?? '', lesson.lessonNumber ? 'source' : 'missing'),
      durationMinutes: pf(input.durationMinutes, 'teacher'),
      classSize: pf(input.classSize ?? 0, input.classSize ? 'teacher' : 'missing'),
      language: pf(input.language ?? 'English', 'teacher'),
      specialEducationalNeeds: pf(
        input.specialEducationalNeeds ?? '',
        input.specialEducationalNeeds ? 'teacher' : 'missing'
      ),
    },
    preparation: {
      unitTitle,
      keyUnitCompetence,
      lessonTitle: pf(lesson.title, 'source'),
      instructionalObjective,
      location: pf('Inside the classroom', 'ai_suggestion'),
      learningMaterials: pf(
        learningMaterialsText,
        materialsFromSource.length || hasCorpus ? 'source' : 'ai_suggestion'
      ),
      learningMaterialsList: pf(uniqueMaterials.length ? uniqueMaterials : splitMaterialLines(learningMaterialsText), 'source'),
      references: referencesField,
    },
    curriculumIntelligence,
    learningObjectives: objectives,
    procedure: { stages },
    assessment: assessmentBlock,
    homework: pf(homeworkItems, hasCorpus ? 'source' : 'ai_suggestion'),
    reflection: pf(
      {
        prompts: [
          'Did learners meet the instructional objective?',
          'How many answered assessment tasks correctly?',
          'Which misconception appeared most often?',
          'Did materials support participation at this class size?',
          'What should be revised next lesson?',
        ],
        teacherNotes: '',
      },
      'ai_suggestion'
    ),
    teacherNotes: input.teacherNotes ? pf(input.teacherNotes, 'teacher') : undefined,
    timingValidation,
  };

  const flags = qualityFlagsFromPlan(planContent);

  const saved = await prisma.generatedLessonPlan.create({
    data: {
      organizationId: input.organizationId,
      schoolId: input.schoolId,
      teacherId: input.teacherId,
      teacherName: input.teacherName,
      teacherEmail: input.teacherEmail,
      curriculumLessonId: lesson.id,
      curriculumVersion: book.version,
      durationMinutes: input.durationMinutes,
      classSize: input.classSize,
      language: input.language ?? 'English',
      lessonDate: input.lessonDate ? new Date(input.lessonDate) : null,
      termLabel: input.termLabel,
      academicYear: input.academicYear,
      subjectLabel: input.subjectLabel ?? book.subject,
      gradeLabel: input.gradeLabel ?? book.grade,
      className: input.className,
      maleLearners: input.maleLearners,
      femaleLearners: input.femaleLearners,
      planContent: planContent as unknown as Prisma.InputJsonValue,
      qualityFlags: flags,
      status: 'DRAFT',
      currentRevision: 1,
      revisions: {
        create: {
          revision: 1,
          planContent: planContent as unknown as Prisma.InputJsonValue,
          changeNote: 'Initial generation',
          createdBy: input.teacherId,
        },
      },
    },
  });

  const aiStatus = getAiStatusPublic();
  if (instructionalObjective.provenance === 'ai_suggestion') {
    await prisma.aIProcessingLog.create({
      data: {
        lessonPlanId: saved.id,
        bookId: book.id,
        operation: 'lesson_plan_ai_objective',
        provider: aiStatus.configured ? aiStatus.provider : 'unknown',
        model: aiStatus.configured ? String(aiStatus.model) : null,
        metadata: { source: 'generate' },
      },
    });
  }

  await prisma.aIProcessingLog.create({
    data: {
      lessonPlanId: saved.id,
      bookId: book.id,
      operation: 'lesson_plan_generate',
      provider: aiStatus.configured ? aiStatus.provider : 'rule_based',
      model: aiStatus.configured ? String(aiStatus.model) : generationEngine,
      metadata: {
        variant: input.variant ?? 'standard',
        qualityFlags: flags,
        aiMode: resolveActiveProvider() ?? 'none',
        extractedCorpusChars: retrieved?.corpus?.length ?? 0,
      },
    },
  });

  return { plan: saved, planContent, qualityFlags: flags };
}

export async function updateLessonPlanContent(input: {
  planId: string;
  organizationId: string;
  teacherId: string;
  planContent: Record<string, unknown>;
  changeNote?: string;
}) {
  const existing = await prisma.generatedLessonPlan.findFirst({
    where: {
      id: input.planId,
      organizationId: input.organizationId,
      teacherId: input.teacherId,
    },
  });
  if (!existing) throw new AppError(404, 'Lesson plan not found');

  const procedure = input.planContent.procedure as { stages?: Array<{ key: string; minutes: number }> };
  const stages = procedure?.stages ?? [];
  const timingValidation = validateStageTimings(stages, existing.durationMinutes);
  const merged = { ...input.planContent, timingValidation };
  const flags = qualityFlagsFromPlan(merged);
  const nextRevision = existing.currentRevision + 1;

  const updated = await prisma.generatedLessonPlan.update({
    where: { id: existing.id },
    data: {
      planContent: merged as unknown as Prisma.InputJsonValue,
      qualityFlags: flags,
      currentRevision: nextRevision,
      revisions: {
        create: {
          revision: nextRevision,
          planContent: merged as unknown as Prisma.InputJsonValue,
          changeNote: input.changeNote ?? 'Teacher edit',
          createdBy: input.teacherId,
        },
      },
    },
  });

  return updated;
}

function planListWhere(organizationId: string, teacherId: string, filters?: Record<string, string | undefined>) {
  const where: Prisma.GeneratedLessonPlanWhereInput = {
    organizationId,
    teacherId,
    deletedAt: null,
  };
  if (filters?.status) where.status = filters.status as Prisma.EnumLessonPlanStatusFilter['equals'];
  if (filters?.subject) where.subjectLabel = { contains: filters.subject, mode: 'insensitive' };
  if (filters?.className) where.className = { contains: filters.className, mode: 'insensitive' };
  if (filters?.term) where.termLabel = filters.term;
  if (filters?.academicYear) where.academicYear = filters.academicYear;
  if (filters?.unit) {
    where.lesson = { unit: { title: { contains: filters.unit, mode: 'insensitive' } } };
  }
  if (filters?.search) {
    where.OR = [
      { subjectLabel: { contains: filters.search, mode: 'insensitive' } },
      { className: { contains: filters.search, mode: 'insensitive' } },
      { lesson: { title: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }
  return where;
}

export async function listTeacherLessonPlans(organizationId: string, teacherId: string) {
  return prisma.generatedLessonPlan.findMany({
    where: planListWhere(organizationId, teacherId),
    orderBy: { updatedAt: 'desc' },
    include: {
      lesson: {
        select: {
          title: true,
          lessonNumber: true,
          unit: { select: { title: true, unitNumber: true } },
        },
      },
    },
  });
}

export async function listTeacherLessonPlansPaginated(
  organizationId: string,
  teacherId: string,
  options: { page?: number; pageSize?: number; filters?: Record<string, string | undefined> }
) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, options.pageSize ?? 10));
  const where = planListWhere(organizationId, teacherId, options.filters);
  const [items, total, statusGroups] = await Promise.all([
    prisma.generatedLessonPlan.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        lesson: {
          select: {
            title: true,
            lessonNumber: true,
            unit: { select: { title: true, unitNumber: true } },
          },
        },
      },
    }),
    prisma.generatedLessonPlan.count({ where }),
    prisma.generatedLessonPlan.groupBy({
      by: ['status'],
      where: { organizationId, teacherId, deletedAt: null },
      _count: true,
    }),
  ]);
  const summary = {
    total,
    draft: statusGroups.find((g) => g.status === 'DRAFT')?._count ?? 0,
    submitted: statusGroups.find((g) => g.status === 'SUBMITTED')?._count ?? 0,
    approved: statusGroups.find((g) => g.status === 'APPROVED')?._count ?? 0,
    taught: await prisma.generatedLessonPlan.count({
      where: { organizationId, teacherId, deletedAt: null, taughtAt: { not: null } },
    }),
  };
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), summary };
}

export async function duplicateLessonPlan(planId: string, organizationId: string, teacherId: string) {
  const source = await getTeacherLessonPlan(planId, organizationId, teacherId);
  const copy = await prisma.generatedLessonPlan.create({
    data: {
      organizationId: source.organizationId,
      schoolId: source.schoolId,
      teacherId: source.teacherId,
      teacherName: source.teacherName,
      teacherEmail: source.teacherEmail,
      curriculumLessonId: source.curriculumLessonId,
      curriculumVersion: source.curriculumVersion,
      templateSlug: source.templateSlug,
      lessonDate: source.lessonDate,
      termLabel: source.termLabel,
      academicYear: source.academicYear,
      subjectLabel: source.subjectLabel,
      gradeLabel: source.gradeLabel,
      className: source.className,
      durationMinutes: source.durationMinutes,
      classSize: source.classSize,
      maleLearners: source.maleLearners,
      femaleLearners: source.femaleLearners,
      language: source.language,
      planContent: source.planContent as Prisma.InputJsonValue,
      qualityFlags: source.qualityFlags as Prisma.InputJsonValue,
      status: 'DRAFT',
      currentRevision: 1,
      revisions: {
        create: {
          revision: 1,
          planContent: source.planContent as Prisma.InputJsonValue,
          changeNote: 'Duplicated from prior plan',
          createdBy: teacherId,
        },
      },
    },
  });
  return copy;
}

export async function archiveLessonPlan(planId: string, organizationId: string, teacherId: string) {
  return prisma.generatedLessonPlan.updateMany({
    where: { id: planId, organizationId, teacherId, deletedAt: null },
    data: { archivedAt: new Date(), status: 'ARCHIVED' },
  });
}

export async function softDeleteLessonPlan(planId: string, organizationId: string, teacherId: string) {
  return prisma.generatedLessonPlan.updateMany({
    where: { id: planId, organizationId, teacherId },
    data: { deletedAt: new Date() },
  });
}

export async function markLessonPlanTaught(
  planId: string,
  organizationId: string,
  teacherId: string,
  taughtAt?: string
) {
  const when = taughtAt ? new Date(taughtAt) : new Date();
  const updated = await prisma.generatedLessonPlan.updateMany({
    where: { id: planId, organizationId, teacherId, deletedAt: null },
    data: { taughtAt: when },
  });
  if (!updated.count) throw new AppError(404, 'Lesson plan not found');
  return prisma.generatedLessonPlan.findFirst({ where: { id: planId } });
}

export async function getTeacherCoursePerformance(
  organizationId: string,
  teacherId: string,
  filters: { academicYear?: string; term?: string; subject?: string; className?: string }
) {
  const planWhere: Prisma.GeneratedLessonPlanWhereInput = {
    organizationId,
    teacherId,
    deletedAt: null,
  };
  if (filters.academicYear) planWhere.academicYear = filters.academicYear;
  if (filters.term) planWhere.termLabel = filters.term;
  if (filters.subject) planWhere.subjectLabel = filters.subject;
  if (filters.className) planWhere.className = filters.className;

  const plans = await prisma.generatedLessonPlan.findMany({
    where: planWhere,
    include: {
      lesson: { select: { id: true, unit: { select: { unitNumber: true, title: true, bookId: true } } } },
    },
  });

  const bookFilter: Prisma.CurriculumBookWhereInput = { processingStatus: 'PUBLISHED' };
  if (filters.subject) bookFilter.subject = filters.subject;
  if (filters.className) bookFilter.grade = filters.className;

  const books = await prisma.curriculumBook.findMany({
    where: bookFilter,
    select: { id: true, subject: true, grade: true, title: true },
  });
  const bookIds = books.map((b) => b.id);
  const totalCurriculumLessons = bookIds.length
    ? await prisma.curriculumLesson.count({ where: { unit: { bookId: { in: bookIds } } } })
    : 0;

  const plannedLessonIds = new Set(
    plans.map((p) => p.curriculumLessonId).filter(Boolean) as string[]
  );
  const taughtCount = plans.filter((p) => p.taughtAt).length;
  const totalPlans = plans.length;

  const byCourse = new Map<string, { subject: string; className: string; plans: typeof plans }>();
  for (const p of plans) {
    const key = `${p.subjectLabel ?? '—'}|${p.className ?? '—'}`;
    const row = byCourse.get(key) ?? {
      subject: p.subjectLabel ?? '—',
      className: p.className ?? '—',
      plans: [],
    };
    row.plans.push(p);
    byCourse.set(key, row);
  }

  const courses = [...byCourse.values()].map((row) => {
    const plannedLessons = new Set(row.plans.map((p) => p.curriculumLessonId).filter(Boolean)).size;
    const taught = row.plans.filter((p) => p.taughtAt).length;
    const planningCoverage =
      totalCurriculumLessons > 0 ? Math.round((plannedLessons / totalCurriculumLessons) * 100) : 0;
    const teachingCoverage =
      totalCurriculumLessons > 0 ? Math.round((taught / totalCurriculumLessons) * 100) : 0;
    return {
      subject: row.subject,
      className: row.className,
      totalCurriculumLessons,
      plannedLessons,
      taughtLessons: taught,
      savedPlans: row.plans.length,
      planningCoveragePercent: planningCoverage,
      teachingCoveragePercent: teachingCoverage,
      remainingLessons: Math.max(0, totalCurriculumLessons - plannedLessons),
      lastActivity: row.plans[0]?.updatedAt ?? null,
    };
  });

  return {
    summary: {
      assignedCourses: courses.length,
      totalCurriculumLessons,
      savedPlans: totalPlans,
      uniquePlannedLessons: plannedLessonIds.size,
      taughtLessons: taughtCount,
      remainingUnplanned: Math.max(0, totalCurriculumLessons - plannedLessonIds.size),
      planningCoveragePercent:
        totalCurriculumLessons > 0
          ? Math.round((plannedLessonIds.size / totalCurriculumLessons) * 100)
          : 0,
      teachingCoveragePercent:
        totalCurriculumLessons > 0 ? Math.round((taughtCount / totalCurriculumLessons) * 100) : 0,
    },
    courses,
    books,
  };
}

export async function getTeacherLessonPlan(planId: string, organizationId: string, teacherId: string) {
  const plan = await prisma.generatedLessonPlan.findFirst({
    where: { id: planId, organizationId, teacherId, deletedAt: null },
    include: {
      lesson: {
        include: {
          unit: { include: { book: true } },
          objectives: true,
          references: true,
        },
      },
      revisions: { orderBy: { revision: 'desc' }, take: 10 },
      approvals: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!plan) throw new AppError(404, 'Lesson plan not found');

  if (plan.curriculumLessonId) {
    try {
      const retrieved = await retrieveLessonContext(plan.curriculumLessonId);
      const intelligence = buildCurriculumIntelligenceFromContext(retrieved.lesson, retrieved);
      const content = enrichPlanContentRecord(
        { ...(plan.planContent as Record<string, unknown>) },
        intelligence
      );
      return { ...plan, planContent: content as typeof plan.planContent };
    } catch {
      /* curriculum lesson missing — return stored plan */
    }
  }

  return plan;
}
