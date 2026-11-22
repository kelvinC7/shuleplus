import assert from 'node:assert/strict';
import {
  accumulateAssessmentMark,
  assessmentPercentage,
  buildSubjectScoresFromComponents,
  componentWeightedMax,
  convertedComponentPoints,
  normalizeComponentKey,
  percentageFromTotalMarks,
  poolMarksOnCourseDefault,
  resolveToTemplateComponentName,
  weightedTermAveragePct,
} from './report-card-component-calc';

const TEMPLATE_50_50: { name: string; weightPercentage: number }[] = [
  { name: 'QUIZ', weightPercentage: 50 },
  { name: 'EXAM', weightPercentage: 50 },
];

function runCase1() {
  const components = new Map();
  accumulateAssessmentMark(components, 'QUIZ', 50, 80, 100);
  accumulateAssessmentMark(components, 'EXAM', 50, 70, 100);
  const built = buildSubjectScoresFromComponents(components, 40, TEMPLATE_50_50);
  assert.equal(built.categoryScores.QUIZ.normalizedScore, 40);
  assert.equal(built.categoryScores.EXAM.normalizedScore, 35);
  assert.equal(built.categoryScores.QUIZ.normalizedMax, 50);
  assert.equal(built.studentMarksOnDefault, 30);
  assert.equal(built.totalScore, 30);
  assert.equal(built.percentage, 75);
  assert.equal(built.courseComplete, true);
}

function runCase2() {
  const template = [
    { name: 'QUIZ', weightPercentage: 25 },
    { name: 'TEST', weightPercentage: 25 },
    { name: 'EXAM', weightPercentage: 50 },
  ];
  const components = new Map();
  accumulateAssessmentMark(components, 'QUIZ', 25, 40, 50);
  accumulateAssessmentMark(components, 'TEST', 25, 18, 20);
  accumulateAssessmentMark(components, 'EXAM', 50, 75, 100);
  const built = buildSubjectScoresFromComponents(components, 40, template);
  assert.equal(built.categoryScores.QUIZ.normalizedScore, 20);
  assert.equal(built.categoryScores.TEST.normalizedScore, 22.5);
  assert.equal(built.categoryScores.EXAM.normalizedScore, 37.5);
  assert.equal(built.totalScore, 32);
  assert.equal(built.percentage, 80);
}

function runCase3MultiQuiz() {
  const components = new Map();
  accumulateAssessmentMark(components, 'QUIZ', 50, 20, 25);
  accumulateAssessmentMark(components, 'QUIZ', 50, 45, 50);
  const built = buildSubjectScoresFromComponents(components, 40, TEMPLATE_50_50);
  assert.equal(built.categoryScores.QUIZ.consolidatedOnDefault, 34.67);
  assert.equal(built.categoryScores.QUIZ.percentage, 86.68);
  assert.equal(built.categoryScores.QUIZ.normalizedScore, 43.34);
  assert.equal(built.categoryScores.QUIZ.normalizedMax, 50);
  assert.equal(built.studentMarksOnDefault, 34.67);
  assert.equal(built.courseComplete, false);
  assert.deepEqual(built.missingComponents, ['EXAM']);
}

function runCase4MissingExam() {
  const components = new Map();
  accumulateAssessmentMark(components, 'QUIZ', 50, 80, 100);
  const built = buildSubjectScoresFromComponents(components, 40, TEMPLATE_50_50);
  assert.equal(built.categoryScores.QUIZ.normalizedScore, 40);
  assert.equal(built.categoryScores.QUIZ.normalizedMax, 50);
  assert.equal(built.studentMarksOnDefault, 32);
  assert.equal(built.totalScore, 16);
  assert.equal(built.percentage, 80);
  assert.equal(built.courseComplete, false);
  assert.deepEqual(built.missingComponents, ['EXAM']);
}

function runCase5TemplateNameMatch() {
  const raw = resolveToTemplateComponentName('quiz', TEMPLATE_50_50);
  assert.equal(raw, 'QUIZ');
  const components = new Map();
  accumulateAssessmentMark(components, resolveToTemplateComponentName('Quiz', TEMPLATE_50_50), 50, 40, 40);
  const built = buildSubjectScoresFromComponents(components, 40, TEMPLATE_50_50);
  assert.equal(built.categoryScores.QUIZ.normalizedScore, 50);
  assert.equal(built.categoryScores.QUIZ.normalizedMax, 50);
}

function runCaseEnglish16040() {
  const components = new Map();
  accumulateAssessmentMark(components, 'QUIZ', 50, 80, 100);
  const built = buildSubjectScoresFromComponents(components, 40, TEMPLATE_50_50);
  assert.equal(built.totalScore, 16);
  assert.equal(built.categoryScores.QUIZ.contribution, 16);
  assert.equal(built.categoryScores.QUIZ.normalizedScore, 40);
  assert.equal(built.categoryScores.QUIZ.normalizedMax, 50);
  assert.equal(built.studentMarksOnDefault, 32);
}

function runCase6Formulas() {
  assert.equal(assessmentPercentage(80, 100), 80);
  assert.equal(componentWeightedMax(40, 50), 20);
  assert.equal(convertedComponentPoints(80, 20), 16);
  assert.equal(normalizeComponentKey('  EXAM  '), 'exam');
}

/** User scenario: multiple quizzes on different scales → avg on DEFAULT 40 → display on Quiz /50. */
function runCaseZeroRecordedVsMissing() {
  const components = new Map();
  accumulateAssessmentMark(components, 'QUIZ', 50, 0, 100);
  const built = buildSubjectScoresFromComponents(components, 40, TEMPLATE_50_50);
  assert.equal(built.categoryScores.QUIZ.marksRecorded, true);
  assert.equal(built.categoryScores.QUIZ.contribution, 0);
  assert.equal(built.categoryScores.QUIZ.normalizedScore, 0);
  assert.equal(built.percentage, 0);
  assert.equal(built.categoryScores.EXAM, undefined);
  assert.deepEqual(built.missingComponents, ['EXAM']);
  assert.equal(convertedComponentPoints(0, 20), 0);
}

function runCaseWeightedTermAverage() {
  const avg = weightedTermAveragePct([
    { percentage: 80, totalMax: 40, marksEntered: true },
    { percentage: 60, totalMax: 50, marksEntered: true },
  ]);
  assert.equal(avg, 68.89);
  assert.equal(
    percentageFromTotalMarks([
      { totalScore: 80.125, totalMax: 100, marksEntered: true },
      { totalScore: 72.5, totalMax: 100, marksEntered: true },
    ]),
    76.31
  );
}

function runCase7MultiQuizDifferentMax() {
  const template = [
    { name: 'QUIZ', weightPercentage: 50, maxMark: 50 },
    { name: 'EXAM', weightPercentage: 50, maxMark: 50 },
  ];
  const components = new Map();
  accumulateAssessmentMark(components, 'QUIZ', 50, 30, 50, 'Quiz 1');
  accumulateAssessmentMark(components, 'QUIZ', 50, 70, 100, 'Quiz 2');
  accumulateAssessmentMark(components, 'QUIZ', 50, 60, 80, 'Quiz 3');
  const built = buildSubjectScoresFromComponents(components, 40, template);
  assert.equal(built.categoryScores.QUIZ.consolidatedOnDefault, 27.83);
  assert.equal(built.categoryScores.QUIZ.normalizedScore, 34.79);
  assert.equal(built.categoryScores.QUIZ.normalizedMax, 50);
  assert.equal(built.studentMarksOnDefault, 27.83);
  assert.equal(built.categoryScores.QUIZ.contribution, 13.92);
  assert.equal(built.categoryScores.QUIZ.assessmentBreakdown?.length, 3);
}

/** Exam 89/100 → (89/100)×DEFAULT 40 = 35.6 on report column (same scale as DEFAULT). */
function runCaseExam89On100() {
  const components = new Map();
  accumulateAssessmentMark(components, 'EXAM', 50, 89, 100);
  const built = buildSubjectScoresFromComponents(components, 40, TEMPLATE_50_50);
  assert.equal(built.categoryScores.EXAM.normalizedScore, 44.5);
  assert.equal(built.categoryScores.EXAM.normalizedMax, 50);
  assert.equal(built.categoryScores.EXAM.contribution, 17.8);
  assert.equal(built.studentMarksOnDefault, 35.6);
}

/** TichaPortal: Quiz1 45/50 + Quiz2 60/70 → (105/120)×DEFAULT 40 = 35. */
function runCase8UserTwoQuizzes() {
  const pooled = poolMarksOnCourseDefault(
    [
      { title: 'Quiz 1', score: 45, maxMark: 50 },
      { title: 'Quiz 2', score: 60, maxMark: 70 },
    ],
    40
  );
  assert.equal(pooled.totalScore, 35);
  assert.equal(pooled.percentage, 87.5);

  const components = new Map();
  accumulateAssessmentMark(components, 'QUIZ', 50, 45, 50, 'Quiz 1');
  accumulateAssessmentMark(components, 'QUIZ', 50, 60, 70, 'Quiz 2');
  const built = buildSubjectScoresFromComponents(components, 40, TEMPLATE_50_50);
  assert.equal(built.categoryScores.QUIZ.consolidatedOnDefault, 35);
  assert.equal(built.categoryScores.QUIZ.normalizedScore, 43.75);
  assert.equal(built.categoryScores.QUIZ.normalizedMax, 50);
  assert.equal(built.studentMarksOnDefault, 35);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function main() {
  runCase6Formulas();
  runCase1();
  runCase2();
  runCase3MultiQuiz();
  runCase4MissingExam();
  runCase5TemplateNameMatch();
  runCaseEnglish16040();
  runCaseZeroRecordedVsMissing();
  runCaseWeightedTermAverage();
  runCase7MultiQuizDifferentMax();
  runCaseExam89On100();
  runCase8UserTwoQuizzes();
  console.log('report-card-component-calc: all tests passed');
}

main();
