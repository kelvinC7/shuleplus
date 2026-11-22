/**
 * Pure reporting-stage filters shared by report generation and its tests.
 * Kept free of DB/service dependencies so stage rules can be verified directly.
 */

export type ReportingStage = 'UNASSIGNED' | 'BEGINNING_TERM' | 'MID_TERM' | 'TERM_FINAL';

export type StageFilterMode = { midTermOnly?: boolean; beginningOnly?: boolean };

type StageAssessment = {
  reportingStage?: string | null;
  component?: { name: string; code?: string | null } | null;
  title?: string | null;
};

/** Legacy fallback: unclassified continuous (CAT/quiz/class test) assessments still count as Mid-Term. */
function legacyContinuousFallback(a: StageAssessment, isMidTerm: (name: string, code?: string | null) => boolean): boolean {
  return isMidTerm(a.component?.name || a.title || '', a.component?.code ?? null);
}

/**
 * Filter assessments for a stage report.
 * - beginning: only BEGINNING_TERM
 * - midterm: MID_TERM + unclassified legacy continuous, excluding BEGINNING_TERM/TERM_FINAL
 * - standard (Termly): all assessments (no filtering)
 */
export function filterAssessmentsByReportingStage<T extends StageAssessment>(
  assessments: T[],
  mode: StageFilterMode,
  isMidTerm: (name: string, code?: string | null) => boolean
): T[] {
  const beginningOnly = Boolean(mode.beginningOnly);
  const midTermOnly = Boolean(mode.midTermOnly);
  if (beginningOnly) {
    return assessments.filter((a) => String((a as any).reportingStage || '').toUpperCase() === 'BEGINNING_TERM');
  }
  if (midTermOnly) {
    return assessments.filter((a) => {
      const stage = String((a as any).reportingStage || 'UNASSIGNED').toUpperCase();
      if (stage === 'BEGINNING_TERM') return false;
      if (stage === 'MID_TERM') return true;
      if (stage === 'TERM_FINAL') return false;
      return legacyContinuousFallback(a, isMidTerm);
    });
  }
  return assessments;
}
