import assert from 'node:assert/strict';
import { filterAssessmentsByReportingStage } from './report-stage-filter';
import {
  accumulateAssessmentMark,
  buildSubjectScoresFromComponents,
  componentWeightedMax,
  convertedComponentPoints,
} from './report-card-component-calc';
import { overallPercentageFromSubjects } from './report-card-overall-percentage';

/** Mimic the existing continuous-assessment name heuristic. */
const isMidTermName = (name: string) =>
  /\b(cat|cats|quiz|quizz|quizzes|test|class work|classwork|exercise|assignment|homework|cw|formative|continuous|project)\b/i.test(
    name
  ) && !/\b(final|exam|examination|eot|end of term|end-of-term)\b/i.test(name);

type A = {
  title: string;
  reportingStage: string;
  component: { name: string; code: string } | null;
};

const ASSESSMENTS: A[] = [
  { title: 'Beginning Test', reportingStage: 'BEGINNING_TERM', component: { name: 'BEGIN', code: 'BOT' } },
  { title: 'CAT 1', reportingStage: 'BEGINNING_TERM', component: { name: 'CAT', code: 'CAT' } },
  { title: 'Mid-Term Test', reportingStage: 'MID_TERM', component: { name: 'MID', code: 'MID' } },
  { title: 'CAT 2', reportingStage: 'MID_TERM', component: { name: 'CAT', code: 'CAT' } },
  { title: 'End-of-Term Exam', reportingStage: 'TERM_FINAL', component: { name: 'EXAM', code: 'EXAM' } },
  { title: 'Legacy quiz', reportingStage: 'UNASSIGNED', component: { name: 'QUIZ', code: 'QUIZ' } },
];

function runStageFilterTests() {
  const beginning = filterAssessmentsByReportingStage(ASSESSMENTS, { beginningOnly: true }, isMidTermName);
  assert.deepEqual(
    beginning.map((a) => a.title).sort(),
    ['Beginning Test', 'CAT 1'],
    'Beginning report includes only BEGINNING_TERM marks'
  );

  const mid = filterAssessmentsByReportingStage(ASSESSMENTS, { midTermOnly: true }, isMidTermName);
  assert.deepEqual(
    mid.map((a) => a.title).sort(),
    ['CAT 2', 'Legacy quiz', 'Mid-Term Test'],
    'Mid-Term excludes beginning and final marks, keeps unclassified legacy continuous'
  );

  const termly = filterAssessmentsByReportingStage(ASSESSMENTS, {}, isMidTermName);
  assert.equal(termly.length, ASSESSMENTS.length, 'Termly includes all stage assessments');

  const stageCounts = new Map<string, number>();
  for (const a of termly) stageCounts.set(a.reportingStage, (stageCounts.get(a.reportingStage) ?? 0) + 1);
  assert.equal(stageCounts.get('BEGINNING_TERM'), 2);
  assert.equal(stageCounts.get('MID_TERM'), 2);
  assert.equal(stageCounts.get('TERM_FINAL'), 1);
  assert.equal(stageCounts.get('UNASSIGNED'), 1);
}

/**
 * Termly combining check: each component is normalized to a percentage of its own max,
 * then weighted by the template cap (course default x weight). Marks with different maxima
 * are never added raw.
 */
function runTermlyCombinationTest() {
  const courseDefault = 100;
  const components = [
    { name: 'BEGIN', weightPercentage: 20, maxMark: 20 },
    { name: 'MID', weightPercentage: 30, maxMark: 30 },
    { name: 'CAT', weightPercentage: 20, maxMark: 20 },
    { name: 'EXAM', weightPercentage: 30, maxMark: 50 },
  ];

  const acc = new Map<string, any>();
  // Beginning: 18/20 = 90% of a 20-weight cap -> 18 points
  accumulateAssessmentMark(acc, 'BEGIN', 20, 18, 20, 'Beginning Test');
  // Mid-Term: 25/30 = 83.33% of a 30-weight cap -> 25 points
  accumulateAssessmentMark(acc, 'MID', 30, 25, 30, 'Mid-Term Test');
  // Two CATs on different scales, pooled raw: (8+9)/(10+10) = 85% of 20 -> 17 points (not an average of conversions)
  accumulateAssessmentMark(acc, 'CAT', 20, 8, 10, 'CAT 1');
  accumulateAssessmentMark(acc, 'CAT', 20, 9, 10, 'CAT 2');
  // Exam: 40/50 = 80% of 30-weight cap -> 24 points
  accumulateAssessmentMark(acc, 'EXAM', 30, 40, 50, 'End-of-Term Exam');

  const built = buildSubjectScoresFromComponents(acc, courseDefault, components);

  // 18 + 25 + 17 + 24 = 84 on /100
  assert.equal(Math.round(built.percentage * 100) / 100, 84, 'weighted components combine to 84%');
  assert.equal(Math.round(built.totalScore * 100) / 100, 84, 'total score uses weighted caps, not raw marks');

  // CAT pooled across different maxima: 17/20, not an average of 8/10 and 9/10 conversions.
  assert.equal(Math.round(built.categoryScores.CAT.normalizedScore * 100) / 100, 17);
  assert.equal(built.categoryScores.CAT.normalizedMax, 20);

  // Component caps must follow the template weights.
  assert.equal(componentWeightedMax(courseDefault, 20), 20);
  assert.equal(convertedComponentPoints(80, componentWeightedMax(courseDefault, 30)), 24);
}

function runStageOverallPercentageTest() {
  const subjects = [
    { studentMarksOnDefault: 20, totalScore: 20, totalMax: 20, marksEntered: true },
    { studentMarksOnDefault: 0, totalScore: 0, totalMax: 80, marksEntered: false },
  ];

  assert.equal(
    overallPercentageFromSubjects(subjects, true, true),
    20,
    'stage percentage includes the maximum of an assessed subject with no mark'
  );
  assert.equal(
    overallPercentageFromSubjects(subjects, true),
    100,
    'standard percentage keeps its existing entered-subject behavior'
  );
}

runStageFilterTests();
runTermlyCombinationTest();
runStageOverallPercentageTest();
console.log('report-stage-filter tests passed');
