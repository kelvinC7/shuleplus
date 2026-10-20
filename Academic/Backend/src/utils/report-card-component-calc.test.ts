import assert from 'node:assert/strict';
import {
  accumulateAssessmentMark,
  assessmentPercentage,
  buildSubjectScoresFromComponents,
  componentWeightedMax,
  convertedComponentPoints,
  normalizeComponentKey,
  resolveToTemplateComponentName,
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
  assert.equal(built.categoryScores.QUIZ.normalizedScore, 16);
  assert.equal(built.categoryScores.EXAM.normalizedScore, 14);
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
  assert.equal(built.categoryScores.QUIZ.normalizedScore, 8);
  assert.equal(built.categoryScores.TEST.normalizedScore, 9);
  assert.equal(built.categoryScores.EXAM.normalizedScore, 15);
  assert.equal(built.totalScore, 32);
  assert.equal(built.percentage, 80);
}

function runCase3MultiQuiz() {
  const components = new Map();
  accumulateAssessmentMark(components, 'QUIZ', 50, 20, 25);
  accumulateAssessmentMark(components, 'QUIZ', 50, 45, 50);
  const built = buildSubjectScoresFromComponents(components, 40, TEMPLATE_50_50);
  const avg = (80 + 90) / 2;
  assert.equal(built.categoryScores.QUIZ.percentage, avg);
  assert.equal(built.categoryScores.QUIZ.normalizedScore, 17);
  assert.equal(built.courseComplete, false);
  assert.deepEqual(built.missingComponents, ['EXAM']);
}

function runCase4MissingExam() {
  const components = new Map();
  accumulateAssessmentMark(components, 'QUIZ', 50, 80, 100);
  const built = buildSubjectScoresFromComponents(components, 40, TEMPLATE_50_50);
  assert.equal(built.categoryScores.QUIZ.normalizedScore, 16);
  assert.equal(built.totalScore, 16);
  assert.equal(built.percentage, 40);
  assert.equal(built.courseComplete, false);
  assert.deepEqual(built.missingComponents, ['EXAM']);
}

function runCase5TemplateNameMatch() {
  const raw = resolveToTemplateComponentName('quiz', TEMPLATE_50_50);
  assert.equal(raw, 'QUIZ');
  const components = new Map();
  accumulateAssessmentMark(components, resolveToTemplateComponentName('Quiz', TEMPLATE_50_50), 50, 40, 40);
  const built = buildSubjectScoresFromComponents(components, 40, TEMPLATE_50_50);
  assert.equal(built.categoryScores.QUIZ.normalizedScore, 20);
}

function runCase6Formulas() {
  assert.equal(assessmentPercentage(80, 100), 80);
  assert.equal(componentWeightedMax(40, 50), 20);
  assert.equal(convertedComponentPoints(80, 20), 16);
  assert.equal(normalizeComponentKey('  EXAM  '), 'exam');
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
  console.log('report-card-component-calc: all tests passed');
}

main();
