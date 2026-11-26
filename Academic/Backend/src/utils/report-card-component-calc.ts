/**
 * Report card component → course DEFAULT conversion.
 * Raw marks come from assessments; DEFAULT + template weights define the course scale.
 */

export type TemplateComponentRef = {
  name: string;
  weightPercentage: number;
  /** When set (>0), report column shows marks out of this cap (e.g. Quiz /50). */
  maxMark?: number;
};

export type ComponentAssessmentEntry = {
  title: string;
  score: number;
  maxMark: number;
};

export type ComponentAccumulator = {
  name: string;
  weight: number;
  pctSum: number;
  pctCount: number;
  entries: ComponentAssessmentEntry[];
  /** Last assessment raw pair when count=1; not used for % (entries average is authoritative). */
  lastScore?: number;
  lastMaxMark?: number;
};

export type AssessmentBreakdownRow = {
  title: string;
  score: number;
  maxMark: number;
  convertedOnDefault: number;
};

export type BuiltCategoryScore = {
  percentage: number;
  weight: number;
  contribution: number;
  normalizedScore: number;
  normalizedMax: number;
  /** True when at least one PRESENT mark exists (including score 0); false = missing component. */
  marksRecorded: boolean;
  /** Teacher marks pooled on course DEFAULT: Σscore/Σmax × DEFAULT (e.g. 35 on /40). */
  consolidatedOnDefault?: number;
  assessmentBreakdown?: AssessmentBreakdownRow[];
  marksDisplay: string;
  rawMarksDisplay: string;
  score?: number;
  maxMark?: number;
};

export type BuiltSubjectScores = {
  categoryScores: Record<string, BuiltCategoryScore>;
  /** Weighted sum of component contributions on DEFAULT (course result when complete). */
  totalScore: number;
  totalMax: number;
  percentage: number;
  defaultCourseMarks: number;
  /** All teacher marks pooled: (Σscore/Σmax)×DEFAULT — shown as “Student marks”. */
  studentMarksOnDefault: number;
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
  if (weightedMax <= 0 || !Number.isFinite(avgPct) || avgPct < 0) return 0;
  return (avgPct / 100) * weightedMax;
}

/** Term / class average: Σ(subject % × course DEFAULT) / Σ(course DEFAULT) for subjects with marks. */
export function weightedTermAveragePct(
  subjects: Array<{ percentage: number; totalMax: number; marksEntered?: boolean; hasComponentMarks?: boolean }>
): number {
  const marked = subjects.filter((s) => s.marksEntered ?? s.hasComponentMarks);
  if (!marked.length) return 0;
  const num = marked.reduce((sum, s) => sum + s.percentage * s.totalMax, 0);
  const den = marked.reduce((sum, s) => sum + s.totalMax, 0);
  return den > 0 ? Math.round((num / den) * 100) / 100 : 0;
}

/** Overall percentage from earned marks divided by the corresponding total possible marks. */
export function percentageFromTotalMarks(
  subjects: Array<{ totalScore: number; totalMax: number; marksEntered?: boolean; hasComponentMarks?: boolean }>,
  includeUnmarkedSubjects = false
): number {
  const includedSubjects = includeUnmarkedSubjects
    ? subjects
    : subjects.filter((s) => s.marksEntered ?? s.hasComponentMarks);
  const totalScore = includedSubjects.reduce((sum, s) => sum + s.totalScore, 0);
  const totalMax = includedSubjects.reduce((sum, s) => sum + s.totalMax, 0);
  return totalMax > 0 ? Math.round((totalScore / totalMax) * 10000) / 100 : 0;
}

export function scoreConvertedToDefault(score: number, maxMark: number, courseDefault: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(maxMark) || maxMark <= 0) return 0;
  return (score / maxMark) * courseDefault;
}

/**
 * Multiple teacher marks (e.g. Quiz1 45/50 + Quiz2 60/70) → sum raw, then scale to course DEFAULT.
 * (105/120) × 40 = 35 on /40 — not an average of per-quiz conversions.
 */
export function poolMarksOnCourseDefault(
  entries: ComponentAssessmentEntry[],
  courseDefault: number
): { totalScore: number; totalMax: number; percentage: number; rawMarksDisplay: string } {
  const d = Math.max(1, Number(courseDefault));
  if (!entries.length) {
    return { totalScore: 0, totalMax: d, percentage: 0, rawMarksDisplay: '' };
  }
  const sumScore = entries.reduce((s, e) => s + e.score, 0);
  const sumMax = entries.reduce((s, e) => s + e.maxMark, 0);
  const totalScore = sumMax > 0 ? round2((sumScore / sumMax) * d) : 0;
  const percentage = round2((totalScore / d) * 100);
  const rawMarksDisplay =
    entries.length > 1
      ? `${fmtMark(sumScore)}/${fmtMark(sumMax)} → ${fmtMark(totalScore)}/${d}`
      : `${fmtMark(entries[0]!.score)}/${fmtMark(entries[0]!.maxMark)} → ${fmtMark(totalScore)}/${d}`;
  return { totalScore, totalMax: d, percentage, rawMarksDisplay };
}

function consolidatedFromEntries(entries: ComponentAssessmentEntry[], courseDefault: number): number {
  if (!entries.length) return 0;
  const sumScore = entries.reduce((s, e) => s + e.score, 0);
  const sumMax = entries.reduce((s, e) => s + e.maxMark, 0);
  if (sumMax <= 0) return 0;
  return round2((sumScore / sumMax) * courseDefault);
}

/**
 * Report column cap (e.g. QUIZ total out of 50): template component maxMark when set,
 * otherwise assessment template weight % as marks (50% → out of 50), matching /assessment-templates UI.
 */
export function resolveComponentDisplayMax(
  _courseDefault: number,
  weightPct: number,
  templateMaxMark?: number
): number {
  const cap = Number(templateMaxMark);
  if (Number.isFinite(cap) && cap > 0) return cap;
  const w = Number(weightPct);
  if (Number.isFinite(w) && w > 0) return w;
  return componentWeightedMax(_courseDefault, weightPct);
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
  let enteredNormalizedMax = 0;
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
    const weightedMax = componentWeightedMax(courseDefault, weight);
    const templateComp = templateComponents.find((c) => c.name === compName);
    const displayMax = resolveComponentDisplayMax(
      courseDefault,
      weight,
      templateComp?.maxMark
    );
    const comp =
      components.get(normalizeComponentKey(compName)) ??
      components.get(compName) ??
      [...components.values()].find((c) => normalizeComponentKey(c.name) === normalizeComponentKey(compName));

    let avgPct = comp && comp.pctCount > 0 ? comp.pctSum / comp.pctCount : 0;
    let consolidatedOnDefault = 0;
    let assessmentBreakdown: AssessmentBreakdownRow[] | undefined;

    if (comp && comp.entries.length > 0) {
      assessmentBreakdown = comp.entries.map((e) => ({
        title: e.title,
        score: e.score,
        maxMark: e.maxMark,
        convertedOnDefault: round2(scoreConvertedToDefault(e.score, e.maxMark, courseDefault)),
      }));
      consolidatedOnDefault = consolidatedFromEntries(comp.entries, courseDefault);
      avgPct = courseDefault > 0 ? (consolidatedOnDefault / courseDefault) * 100 : 0;
    } else if (comp && comp.pctCount > 0) {
      consolidatedOnDefault = (avgPct / 100) * courseDefault;
    }

    const contribution = convertedComponentPoints(avgPct, weightedMax);
    const marksRecorded = Boolean(comp && comp.pctCount > 0);
    /** Component column: performance on template component cap (e.g. 50% → out of 50). */
    const componentMarksScore =
      marksRecorded && weightedMax > 0
        ? round2((contribution / weightedMax) * displayMax)
        : marksRecorded
          ? round2((avgPct / 100) * displayMax)
          : 0;

    if (requiredNames.includes(compName) && (!comp || comp.pctCount === 0)) {
      missingComponents.push(compName);
    }

    if (comp && comp.pctCount > 0) {
      hasComponentMarks = true;
      recordedWeightSum += weight;
      normalizedTotal += contribution;
      enteredNormalizedMax += weightedMax;

      const pctRounded = round1(avgPct);
      let rawMarksDisplay: string;
      if (comp.entries.length > 1) {
        const sumScore = comp.entries.reduce((s, e) => s + e.score, 0);
        const sumMax = comp.entries.reduce((s, e) => s + e.maxMark, 0);
        rawMarksDisplay = `${fmtMark(sumScore)}/${fmtMark(sumMax)} → ${fmtMark(consolidatedOnDefault)}/${courseDefault}`;
      } else if (comp.entries.length === 1) {
        const e = comp.entries[0]!;
        rawMarksDisplay = `${fmtMark(e.score)}/${fmtMark(e.maxMark)} → ${fmtMark(consolidatedOnDefault)}/${courseDefault}`;
      } else if (comp.lastScore != null && comp.lastMaxMark != null) {
        rawMarksDisplay = `${fmtMark(comp.lastScore)}/${fmtMark(comp.lastMaxMark)} → ${fmtMark(consolidatedOnDefault)}/${courseDefault}`;
      } else {
        rawMarksDisplay = `${pctRounded}%`;
      }

      categoryScores[compName] = {
        percentage: round2(avgPct),
        weight: round2(weight),
        contribution: round2(contribution),
        normalizedScore: componentMarksScore,
        normalizedMax: round1(displayMax),
        marksRecorded: true,
        consolidatedOnDefault: round2(consolidatedOnDefault),
        assessmentBreakdown,
        marksDisplay: `${fmtMark(componentMarksScore)}`,
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
    courseDefault > 0 && hasComponentMarks
      ? courseComplete
        ? (normalizedTotal / courseDefault) * 100
        : enteredNormalizedMax > 0
          ? (normalizedTotal / enteredNormalizedMax) * 100
          : 0
      : 0;

  const allEntries = [...components.values()].flatMap((c) => c.entries ?? []);
  const studentMarksOnDefault =
    allEntries.length > 0
      ? poolMarksOnCourseDefault(allEntries, courseDefault).totalScore
      : 0;

  return {
    categoryScores,
    totalScore: round2(normalizedTotal),
    totalMax: courseDefault,
    percentage: round2(subjectPct),
    defaultCourseMarks: courseDefault,
    studentMarksOnDefault: round2(studentMarksOnDefault),
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
  maxMark: number,
  assessmentTitle?: string
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
      entries: [],
    };
    components.set(key, comp);
  }
  if (!comp.entries) comp.entries = [];
  comp.entries.push({
    title: assessmentTitle?.trim() || `${componentDisplayName} ${comp.entries.length + 1}`,
    score,
    maxMark,
  });
  comp.pctSum += pct;
  comp.pctCount += 1;
  comp.lastScore = score;
  comp.lastMaxMark = maxMark;
  if (weightFromAssessment > 0) comp.weight = weightFromAssessment;
}
