import type { CurriculumLesson, LearningObjective, CurriculumBook, CurriculumUnit } from '@prisma/client';
import type { ProvenanceField } from '../templates/reb-primary-cbc';
import { completeStructuredLessonJson, resolveActiveProvider } from './ai-provider.service';
import { assertTeacherAiAllowed } from './ai-policy.service';
import type { retrieveLessonContext } from './retrieval.service';

type LessonWithUnit = CurriculumLesson & {
  objectives: LearningObjective[];
  unit: CurriculumUnit & { book: CurriculumBook };
};

export function pf<T>(
  value: T,
  provenance: ProvenanceField['provenance'],
  note?: string,
  sourcePages?: number[]
): ProvenanceField<T> {
  return note ? { value, provenance, note, sourcePages } : { value, provenance, sourcePages };
}

export async function buildInstructionalObjectiveField(
  lesson: LessonWithUnit,
  ctx: Awaited<ReturnType<typeof retrieveLessonContext>>,
  actor?: { organizationId: string; teacherId: string }
): Promise<ProvenanceField<string>> {
  const official = lesson.objectives.filter((o) => o.isOfficial);
  const list = official.length ? official : lesson.objectives;
  const pages = list.flatMap((o) => (o.sourcePages as number[]) ?? []);

  let fallback = '';
  if (list.length) {
    const parts = list.map((o) => o.statement.trim().replace(/\.$/, ''));
    fallback = `By the end of the lesson, learners should be able to: ${parts.join('; ')}.`;
  } else {
    fallback = `By the end of the lesson, learners should achieve the learning outcomes for "${lesson.title}" as outlined in ${ctx.book.title}, Unit ${lesson.unit.unitNumber}.`;
  }

  const provider = resolveActiveProvider();
  if (provider && ctx.corpus.trim() && actor) {
    try {
      await assertTeacherAiAllowed({ ...actor, operation: 'generate' });
      const system = `You write one clear Rwanda REB CBC instructional objective for a primary lesson plan.
Use ONLY the official objectives and Teacher's Guide excerpts provided.
Return valid JSON: { "instructionalObjective": "one paragraph starting with By the end of the lesson..." }`;
      const user = `Subject: ${ctx.book.subject}
Grade: ${ctx.book.grade}
Unit ${lesson.unit.unitNumber}: ${lesson.unit.title}
Lesson: ${lesson.title}

Official learning objectives:
${list.map((o) => `- ${o.statement}`).join('\n') || '(none stored — infer carefully from excerpts)'}

Teacher's Guide excerpts:
${ctx.corpus.slice(0, 9000)}`;

      const completion = await completeStructuredLessonJson(system, user, { audience: 'teacher' });
      const aiText = String(completion.data.instructionalObjective ?? '').trim();
      if (aiText.length > 30) {
        return pf(aiText, 'ai_suggestion', undefined, pages.length ? pages : ctx.sourceChunks.map((c) => c.pageNumber));
      }
    } catch {
      /* quota, disabled, or provider error — curriculum fallback */
    }
  }

  return pf(fallback, list.length ? 'source' : 'ai_suggestion', undefined, pages.length ? pages : undefined);
}

export function buildProcedureStages(
  lesson: LessonWithUnit,
  book: CurriculumBook,
  stageMinutes: Record<string, number>,
  hasCorpus: boolean
) {
  const topic = lesson.title;
  const unitNo = lesson.unit.unitNumber;

  const teacher = (stage: string, detail: string) =>
    pf(
      detail,
      hasCorpus ? 'ai_suggestion' : 'ai_suggestion'
    );

  return [
    {
      key: 'introduction',
      title: 'Introduction',
      minutes: stageMinutes.introduction,
      teacherActivities: teacher(
        'introduction',
        `Recap relevant prior learning for Unit ${unitNo}. State today's focus: "${topic}". Share success criteria aligned with the Teacher's Guide.`
      ),
      learnerActivities: pf('Recall prior ideas, listen to the lesson focus, and agree on what success looks like.', 'ai_suggestion'),
      genericCompetences: pf('Critical thinking and communication.', 'ai_suggestion'),
      crossCuttingIssues: pf('Gender education — balanced participation.', 'ai_suggestion'),
    },
    {
      key: 'discovery',
      title: 'Lesson Development — Discovery Activity',
      minutes: stageMinutes.discovery,
      teacherActivities: teacher(
        'discovery',
        `Facilitate a guided discovery task on "${topic}" using Teacher's Guide activities, questions, and examples. Circulate and prompt reasoning.`
      ),
      learnerActivities: pf('Explore the task in pairs or groups, discuss findings, and prepare to share.', 'ai_suggestion'),
      genericCompetences: pf('Critical thinking and problem-solving.', 'ai_suggestion'),
      crossCuttingIssues: pf('Inclusive education through mixed-ability grouping.', 'ai_suggestion'),
    },
    {
      key: 'presentation',
      title: 'Presentation of Learners’ Productions',
      minutes: stageMinutes.presentation,
      teacherActivities: teacher(
        'presentation',
        'Invite groups to present work. Facilitate comparison of strategies and respectful peer feedback.'
      ),
      learnerActivities: pf('Present group outcomes, listen to others, and refine understanding in notebooks.', 'ai_suggestion'),
      genericCompetences: pf('Communication and collaboration.', 'ai_suggestion'),
      crossCuttingIssues: pf('Peace and values education through respectful dialogue.', 'ai_suggestion'),
    },
    {
      key: 'exploitation',
      title: 'Exploitation of Learners’ Productions',
      minutes: stageMinutes.exploitation,
      teacherActivities: teacher(
        'exploitation',
        `Guide practice on "${topic}" using differentiated tasks from the Teacher's Guide. Support struggling learners; extend confident learners.`
      ),
      learnerActivities: pf('Complete practice in exercise books, compare with partners, and explain reasoning.', 'ai_suggestion'),
      genericCompetences: pf('Problem-solving and learning to learn.', 'ai_suggestion'),
      crossCuttingIssues: pf('Inclusive education through scaffolding and extension.', 'ai_suggestion'),
    },
    {
      key: 'summary',
      title: 'Summary / Conclusion',
      minutes: stageMinutes.summary,
      teacherActivities: teacher(
        'summary',
        'Lead a short recap of key ideas from the lesson. Ask learners to state one thing they learned and one question still open.'
      ),
      learnerActivities: pf('Summarise learning, answer exit prompts, and update notes.', 'ai_suggestion'),
      genericCompetences: pf('Critical thinking and communication.', 'ai_suggestion'),
      crossCuttingIssues: pf('', 'missing'),
    },
    {
      key: 'assessment',
      title: 'Assessment',
      minutes: stageMinutes.assessment,
      teacherActivities: teacher(
        'assessment',
        `Check understanding of "${topic}" with short oral or written questions aligned to the lesson objectives and Teacher's Guide indicators.`
      ),
      learnerActivities: pf('Answer assessment questions individually or in pairs as directed.', 'ai_suggestion'),
      genericCompetences: pf('Critical thinking.', 'ai_suggestion'),
      crossCuttingIssues: pf('', 'missing'),
    },
  ];
}

export function buildAssessmentFromObjectives(objectives: LearningObjective[]) {
  const questions =
    objectives.length > 0
      ? objectives.slice(0, 5).map((o, i) => `(${i + 1}) Demonstrate: ${o.statement.replace(/\.$/, '')}`)
      : [
          'Explain the main idea of the lesson in your own words.',
          'Complete one practice task from the lesson activity.',
          'Answer a short oral check from the teacher.',
        ];

  return {
    questions: pf(questions, objectives.length ? 'source' : 'ai_suggestion'),
    expectedAnswers: pf(
      objectives.length ? objectives.map(() => 'Refer to Teacher\'s Guide marking guidance.') : ['Varies — use rubric'],
      'ai_suggestion'
    ),
    markingGuide: pf('Award marks according to REB criteria for each question.', 'ai_suggestion'),
  };
}

export function buildReferencesField(lesson: LessonWithUnit, book: CurriculumBook) {
  const pages = (lesson.sourcePages as number[]) ?? [];
  const pagePart = pages.length ? ` (pp. ${pages.join(', ')})` : '';
  return pf(`REB, ${book.title}, Unit ${lesson.unit.unitNumber}, ${lesson.title}${pagePart}.`, 'source');
}
