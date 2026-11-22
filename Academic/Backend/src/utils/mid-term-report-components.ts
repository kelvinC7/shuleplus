/** Classify template/assessment components for mid-term (continuous) vs final exam reports. */

export type ComponentMidTermRole = 'continuous' | 'exam' | 'unknown';

const EXAM_RE =
  /\b(final|examination|exam|eot|end of term|end-of-term|national|mock|mid[- ]?term exam|midterm exam)\b/i;

const CONTINUOUS_RE =
  /\b(cat|cats|quiz|quizz|quizzes|test|class work|classwork|exercise|assignment|homework|cw|formative|continuous|project|practical work)\b/i;

export function componentMidTermRole(name: string, code?: string | null): ComponentMidTermRole {
  const blob = `${name ?? ''} ${code ?? ''}`.trim();
  if (!blob) return 'unknown';
  if (EXAM_RE.test(blob)) return 'exam';
  if (CONTINUOUS_RE.test(blob)) return 'continuous';
  return 'unknown';
}

/** Mid-term reports include continuous assessments only (never final exams). */
export function includeInMidTermReport(name: string, code?: string | null): boolean {
  const role = componentMidTermRole(name, code);
  if (role === 'exam') return false;
  if (role === 'continuous') return true;
  return !/\bexam\b/i.test(`${name ?? ''} ${code ?? ''}`);
}

export function filterAssessmentsForMidTerm<
  T extends { component: { name: string; code?: string | null } | null; title?: string | null }
>(assessments: T[]): T[] {
  return assessments.filter((a) => {
    const name = a.component?.name || a.title || '';
    const code = a.component?.code ?? null;
    return includeInMidTermReport(name, code);
  });
}

/**
 * Template-driven stage filter. Components with an admin-configured reportingStage are included only
 * for that stage; unconfigured components fall back to the name heuristic (mid-term) or all (beginning).
 */
export function filterTemplateComponentsForStage<
  T extends { name: string; code?: string | null; reportingStage?: string | null }
>(components: T[], stage: 'MID_TERM' | 'BEGINNING_TERM'): T[] {
  const configured = components.filter((c) => c.reportingStage && c.reportingStage !== 'UNASSIGNED');
  if (configured.length) return configured.filter((c) => c.reportingStage === stage);
  return stage === 'MID_TERM' ? filterTemplateComponentsForMidTerm(components) : components;
}

export function filterTemplateComponentsForMidTerm<
  T extends { name: string; code?: string | null; weightPercentage?: number }
>(components: T[]): T[] {
  return components.filter((c) => includeInMidTermReport(c.name, c.code));
}
