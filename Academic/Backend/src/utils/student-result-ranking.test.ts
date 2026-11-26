import assert from 'node:assert/strict';
import { rankStudentResults } from './student-result-ranking';

const twoStudents = rankStudentResults([
  { studentId: 'sixty', percentage: 60 },
  { studentId: 'fiftyNine', percentage: 59 },
]);

assert.equal(twoStudents.positions.get('sixty'), 1);
assert.equal(twoStudents.positions.get('fiftyNine'), 2);

const ranking = rankStudentResults([
  { studentId: 'higher', percentage: 60 },
  { studentId: 'lower', percentage: 59 },
  { studentId: 'tied', percentage: 60 },
]);

assert.equal(ranking.positions.get('higher'), 1);
assert.equal(ranking.positions.get('tied'), 1);
assert.equal(ranking.positions.get('lower'), 3);
assert.equal(ranking.classSize, 3);

const averageRanking = rankStudentResults([
  { studentId: 'student-a', percentage: 80 },
  { studentId: 'student-a', percentage: 40 },
  { studentId: 'student-b', percentage: 59 },
  { studentId: 'student-b', percentage: 59 },
]);

assert.equal(averageRanking.positions.get('student-a'), 1);
assert.equal(averageRanking.positions.get('student-b'), 2);
