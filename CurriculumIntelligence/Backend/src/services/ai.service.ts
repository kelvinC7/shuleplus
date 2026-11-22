import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { completeStructuredLessonJson } from './ai-provider.service';
import { assertTeacherAiAllowed } from './ai-policy.service';
import { generateFromPythonWorker, usePythonForRegenerate } from './local-lesson-generator.service';
import { retrieveLessonContext } from './retrieval.service';
import { allocateStageMinutes } from '../utils/timing';
import type { RebStageKey } from '../utils/timing';

export type RegenerateTarget =
  | 'preparation.instructionalObjective'
  | `procedure.${string}`
  | 'assessment.questions'
  | 'homework';

const SYSTEM_PROMPT = `You are an expert Rwanda REB CBC lesson plan writer for Shule+.
Rules:
- Ground every sentence in the Teacher's Guide excerpts and official objectives provided.
- Write concrete, classroom-ready teacher and learner actions (not vague placeholders).
- Match the stage purpose (introduction = activate prior knowledge; discovery = guided exploration; presentation = share group work; exploitation = practice; summary = recap; assessment = check learning).
- Use professional English suitable for Rwandan primary teachers.
- Return valid JSON only. No markdown fences.
- Required keys for procedure stages: teacherActivities, learnerActivities, genericCompetences, crossCuttingIssues (each a string).
- For preparation.instructionalObjective return: { "instructionalObjective": "..." } starting with "By the end of the lesson, learners should be able to..."
- Never invent page numbers or pupil book titles not present in excerpts.`;

function fieldText(field: unknown): string {
  if (!field || typeof field !== 'object') return '';
  const v = (field as { value?: unknown }).value;
  if (Array.isArray(v)) return v.map(String).join('\n');
  return String(v ?? '');
}

export async function regenerateLessonPlanSection(input: {
  lessonPlanId: string;
  organizationId: string;
  teacherId: string;
  target: RegenerateTarget;
  durationMinutes: number;
  variant?: string;
}) {
  const plan = await prisma.generatedLessonPlan.findFirst({
    where: {
      id: input.lessonPlanId,
      organizationId: input.organizationId,
      teacherId: input.teacherId,
    },
  });
  if (!plan?.curriculumLessonId) throw new AppError(404, 'Lesson plan not found');

  const ctx = await retrieveLessonContext(plan.curriculumLessonId);

  if (usePythonForRegenerate()) {
    const stageMinutes = allocateStageMinutes(input.durationMinutes);
    const stageKey = input.target.startsWith('procedure.')
      ? (input.target.replace('procedure.', '') as RebStageKey)
      : undefined;
    const py = await generateFromPythonWorker({
      lesson: { title: ctx.lesson.title, lessonNumber: ctx.lesson.lessonNumber, materials: ctx.lesson.materials },
      book: { title: ctx.book.title, subject: ctx.book.subject, grade: ctx.book.grade },
      unit: { unitNumber: ctx.unit.unitNumber, title: ctx.unit.title },
      objectives: ctx.objectives,
      corpus: ctx.corpus,
      structured: ctx.structured as Record<string, unknown>,
      companionBookId: ctx.companionBookId,
      durationMinutes: input.durationMinutes,
      stageMinutes,
      regenerateStage: stageKey,
    });
    const fromGuide = ctx.corpus.trim() ? ('source' as const) : ('ai_suggestion' as const);
    const patchProvenance = (value: string) => ({
      value,
      provenance: fromGuide,
      sourcePages: ctx.sourceChunks.map((c) => c.pageNumber),
    });
    const updated = { ...(plan.planContent as Record<string, unknown>) };
    if (input.target === 'preparation.instructionalObjective') {
      const prep = updated.preparation as Record<string, unknown>;
      prep.instructionalObjective = patchProvenance(py.instructionalObjective);
      updated.preparation = prep;
    } else if (input.target.startsWith('procedure.') && stageKey) {
      const stage = py.stages.find((s) => s.key === stageKey);
      if (!stage) throw new AppError(502, 'Local engine could not improve this section');
      const procedure = updated.procedure as { stages?: Array<Record<string, unknown>> };
      const stages = procedure?.stages ?? [];
      const idx = stages.findIndex((s) => s.key === stageKey);
      if (idx < 0) throw new AppError(400, 'Unknown procedure stage');
      stages[idx] = {
        ...stages[idx],
        teacherActivities: patchProvenance(stage.teacherActivities),
        learnerActivities: patchProvenance(stage.learnerActivities),
        genericCompetences: patchProvenance(stage.genericCompetences),
        crossCuttingIssues: patchProvenance(stage.crossCuttingIssues || ''),
      };
      updated.procedure = { stages };
    } else {
      throw new AppError(400, 'Local engine supports instructional objective and procedure stages only');
    }
    await prisma.aIProcessingLog.create({
      data: {
        lessonPlanId: plan.id,
        bookId: ctx.book.id,
        operation: 'section_regenerate',
        provider: 'local_python',
        model: py.engine,
        metadata: { target: input.target, corpusChars: ctx.corpus.length },
      },
    });
    return updated;
  }

  await assertTeacherAiAllowed({
    organizationId: input.organizationId,
    teacherId: input.teacherId,
    operation: 'regenerate',
  });
  const planContent = plan.planContent as Record<string, unknown>;
  const corpus = ctx.corpus.slice(0, 8000);

  let stageContext = '';
  if (input.target.startsWith('procedure.')) {
    const stageKey = input.target.replace('procedure.', '');
    const procedure = planContent.procedure as { stages?: Array<Record<string, unknown>> };
    const stage = procedure?.stages?.find((s) => s.key === stageKey);
    if (stage) {
      stageContext = `
Stage: ${stage.title} (${stage.minutes} minutes of ${input.durationMinutes} total)
Current teacher activities (improve, do not copy blindly if weak):
${fieldText(stage.teacherActivities)}
Current learner activities:
${fieldText(stage.learnerActivities)}`;
    }
  } else if (input.target === 'preparation.instructionalObjective') {
    const prep = planContent.preparation as Record<string, unknown>;
    stageContext = `Current instructional objective:\n${fieldText(prep.instructionalObjective)}`;
  }

  const user = `Target: ${input.target}
Subject: ${ctx.book.subject}
Grade: ${ctx.book.grade}
Lesson: ${ctx.lesson.title}
Unit ${ctx.unit.unitNumber}: ${ctx.unit.title}
Total lesson duration: ${input.durationMinutes} minutes
Variant: ${input.variant ?? 'standard'}
Class context: ${plan.className ?? ''} · ${plan.subjectLabel ?? ctx.book.subject}

Official learning objectives:
${ctx.objectives.map((o) => `- ${o}`).join('\n') || '(none stored — infer carefully from excerpts)'}

${stageContext}

Teacher's Guide excerpts (primary source):
${corpus || '(No extracted page text — publish curriculum with PDF page text first.)'}

Improve this section with specific activities, questions, and materials referenced in the excerpts.`;

  const completion = await completeStructuredLessonJson(SYSTEM_PROMPT, user, { audience: 'teacher' });
  const ai = completion.data;

  const patchProvenance = (value: string) => ({
    value,
    provenance: ctx.corpus ? ('ai_suggestion' as const) : ('missing' as const),
    sourcePages: ctx.sourceChunks.map((c) => c.pageNumber),
  });

  const updated = { ...planContent };

  if (input.target.startsWith('procedure.')) {
    const stageKey = input.target.replace('procedure.', '');
    const procedure = updated.procedure as { stages?: Array<Record<string, unknown>> };
    const stages = procedure?.stages ?? [];
    const idx = stages.findIndex((s) => s.key === stageKey);
    if (idx < 0) throw new AppError(400, 'Unknown procedure stage');
    stages[idx] = {
      ...stages[idx],
      teacherActivities: patchProvenance(String(ai.teacherActivities ?? '').trim()),
      learnerActivities: patchProvenance(String(ai.learnerActivities ?? '').trim()),
      genericCompetences: patchProvenance(String(ai.genericCompetences ?? '').trim()),
      crossCuttingIssues: patchProvenance(String(ai.crossCuttingIssues ?? '').trim()),
    };
    updated.procedure = { stages };
  } else if (input.target === 'preparation.instructionalObjective') {
    const prep = updated.preparation as Record<string, unknown>;
    const text = String(ai.instructionalObjective ?? ai.teacherActivities ?? '').trim();
    if (!text) throw new AppError(502, 'AI returned an empty instructional objective — try again.');
    prep.instructionalObjective = patchProvenance(text);
    updated.preparation = prep;
  } else if (input.target === 'assessment.questions') {
    const assessment = updated.assessment as Record<string, unknown>;
    const qList = Array.isArray(ai.questions) ? ai.questions.map(String) : [String(ai.teacherActivities ?? '')];
    assessment.questions = { ...patchProvenance(qList.join('\n')), value: qList };
    updated.assessment = assessment;
  } else if (input.target === 'homework') {
    const hList = Array.isArray(ai.questions) ? ai.questions.map(String) : [String(ai.learnerActivities ?? '')];
    updated.homework = { ...patchProvenance(hList.join('\n')), value: hList };
  }

  await prisma.aIProcessingLog.create({
    data: {
      lessonPlanId: plan.id,
      bookId: ctx.book.id,
      operation: 'section_regenerate',
      provider: completion.provider,
      model: completion.model,
      metadata: {
        target: input.target,
        sourcePages: ctx.sourceChunks.map((c) => c.pageNumber),
        corpusChars: ctx.corpus.length,
      },
    },
  });

  return updated;
}
