/**
 * Report card component → course DEFAULT conversion.
 * Raw marks come from assessments; DEFAULT + template weights define the course scale.
 */

export type TemplateComponentRef = { name: string; weightPercentage: number };

export type ComponentAccumulator = {
  name: string;
  weight: number;
  pctSum: number;
  pctCount: number;
  /** Last assessment raw pair when count=1; not used for % (pctSum/pctCount is authoritative). */
  lastScore?: number;
  lastMaxMark?: number;
};

export type BuiltCategoryScore = {
  percentage: number;
  weight: number;
  contribution: number;
  normalizedScore: number;
  normalizedMax: number;
  marksDisplay: string;
  rawMarksDisplay: string;
  score?: number;
  maxMark?: number;
};

export type BuiltSubjectScores = {
  categoryScores: Record<string, BuiltCategoryScore>;
  totalScore: number;
  totalMax: number;
  percentage: number;
  defaultCourseMarks: number;
  hasComponentMarks: boolean;
  /** All template components (weight > 0) have at least one assessment mark. */
  courseComplete: boolean;
  recordedWeightSum: number;
  missingComponents: string[];
};

export function normalizeComponentKey(name: string): string {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function resolveToTemplateComponentName(
  rawName: string,
  templateComponents: TemplateComponentRef[]
): string {
  const trimmed = String(rawName ?? '').trim() || 'Assessment';
  if (!templateComponents.length) return trimmed;
  const key = normalizeComponentKey(trimmed);
  const match = templateComponents.find((c) => normalizeComponentKey(c.name) === key);
  return match?.name ?? trimmed;
}

export function assessmentPercentage(score: number, maxMark: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(maxMark) || maxMark <= 0) return 0;
  return (score / maxMark) * 100;
}

export function componentWeightedMax(courseDefault: number, weightPct: number): number {
  const d = Math.max(1, Number(courseDefault));
  const w = Math.max(0, Number(weightPct));
  return (d * w) / 100;
}

export function convertedComponentPoints(avgPct: number, weightedMax: number): number {
  if (weightedMax <= 0 || avgPct <= 0) return 0;
  return (avgPct / 100) * weightedMax;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function fmtMark(n: number) {
  return round1(n);
}

function resolveWeight(
  compName: string,
  comp: ComponentAccumulator | undefined,
  templateComponents: TemplateComponentRef[],
  compNames: string[]
): number {
  const templateComp = templateComponents.find((c) => c.name === compName);
  if (templateComp && Number(templateComp.weightPercentage) > 0) {
    return Number(templateComp.weightPercentage);
  }
  if (comp && comp.weight > 0) return comp.weight;
  if (compNames.length) return 100 / compNames.length;
  return 0;
}

/**
 * Build subject row from aggregated component accumulators (assessment-derived percentages).
 */
export function buildSubjectScoresFromComponents(
  components: Map<string, ComponentAccumulator>,
  defaultCourseMarks: number,
  templateComponents: TemplateComponentRef[]
): BuiltSubjectScores {
  const courseDefault = Math.max(1, Number(defaultCourseMarks));
  const compNames =
    templateComponents.length > 0
      ? templateComponents.map((c) => c.name)
      : [...components.values()].map((c) => c.name);

  const requiredNames = templateComponents
    .filter((c) => Number(c.weightPercentage) > 0)
    .map((c) => c.name);

  const categoryScores: Record<string, BuiltCategoryScore> = {};
  let normalizedTotal = 0;
  let hasComponentMarks = false;
  let recordedWeightSum = 0;
  const missingComponents: string[] = [];

  for (const compName of compNames) {
    const weight = resolveWeight(
      compName,
      components.get(normalizeComponentKey(compName)) ?? components.get(compName),
      templateComponents,
      compNames
    );
    const normalizedMax = componentWeightedMax(courseDefault, weight);
    const comp =
      components.get(normalizeComponentKey(compName)) ??
      components.get(compName) ??
      [...components.values()].find((c) => normalizeComponentKey(c.name) === normalizeComponentKey(compName));

    const avgPct = comp && comp.pctCount > 0 ? comp.pctSum / comp.pctCount : 0;
    const normalizedScore = convertedComponentPoints(avgPct, normalizedMax);

    if (requiredNames.includes(compName) && (!comp || comp.pctCount === 0)) {
      missingComponents.push(compName);
    }

    if (comp && comp.pctCount > 0) {
      hasComponentMarks = true;
      recordedWeightSum += weight;
      normalizedTotal += normalizedScore;

      const pctRounded = round1(avgPct);
      let rawMarksDisplay: string;
      if (comp.pctCount > 1) {
        rawMarksDisplay = `${pctRounded}% average (${comp.pctCount} assessments)`;
      } else if (comp.lastScore != null && comp.lastMaxMark != null) {
        rawMarksDisplay = `${fmtMark(comp.lastScore)}/${fmtMark(comp.lastMaxMark)}`;
      } else {
        rawMarksDisplay = `${pctRounded}%`;
      }

      categoryScores[compName] = {
        percentage: round2(avgPct),
        weight: round2(weight),
        contribution: round2(normalizedScore),
        normalizedScore: round2(normalizedScore),
        normalizedMax: round1(normalizedMax),
        marksDisplay: `${fmtMark(normalizedScore)}/${fmtMark(normalizedMax)}`,
        rawMarksDisplay,
        score: comp.lastScore,
        maxMark: comp.lastMaxMark,
      };
    }
  }

  const courseComplete =
    requiredNames.length === 0
      ? hasComponentMarks
      : requiredNames.every((n) => {
          const c =
            components.get(normalizeComponentKey(n)) ??
            components.get(n) ??
            [...components.values()].find((x) => normalizeComponentKey(x.name) === normalizeComponentKey(n));
          return Boolean(c && c.pctCount > 0);
        });

  const subjectPct =
    courseDefault > 0 && hasComponentMarks ? (normalizedTotal / courseDefault) * 100 : 0;

  return {
    categoryScores,
    totalScore: round2(normalizedTotal),
    totalMax: courseDefault,
    percentage: round2(subjectPct),
    defaultCourseMarks: courseDefault,
    hasComponentMarks,
    courseComplete,
    recordedWeightSum: round2(recordedWeightSum),
    missingComponents,
  };
}

/** Register one assessment mark into the component map (keyed by normalized component name). */
export function accumulateAssessmentMark(
  components: Map<string, ComponentAccumulator>,
  componentDisplayName: string,
  weightFromAssessment: number,
  score: number,
  maxMark: number
): void {
  const key = normalizeComponentKey(componentDisplayName);
  const pct = assessmentPercentage(score, maxMark);
  let comp = components.get(key);
  if (!comp) {
    comp = {
      name: componentDisplayName,
      weight: weightFromAssessment > 0 ? weightFromAssessment : 0,
      pctSum: 0,
      pctCount: 0,
    };
    components.set(key, comp);
  }
  comp.pctSum += pct;
  comp.pctCount += 1;
  comp.lastScore = score;
  comp.lastMaxMark = maxMark;
  if (weightFromAssessment > 0) comp.weight = weightFromAssessment;
}
