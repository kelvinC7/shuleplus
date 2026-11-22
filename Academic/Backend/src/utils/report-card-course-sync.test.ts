import assert from 'node:assert/strict';
import {
  findTimetableClassRow,
  reconcileReportCardCourses,
} from './report-card-course-sync';

function testClassSelectionPrefersExactClassId() {
  const rows = [
    { classId: 'other', className: 'Grade 4 A', courses: [{ subjectName: 'Old course' }] },
    { classId: 'selected', className: 'Grade 4 B', courses: [{ subjectName: 'Math' }] },
  ];

  assert.equal(
    findTimetableClassRow(rows, { id: 'selected', name: 'Grade 4', stream: 'B' })?.classId,
    'selected'
  );
}

function testCourseReconciliationAddsAndRemovesCourses() {
  const retained = { subject: 'Mathematics', score: 82 };
  const subjects = new Map([
    ['math', retained],
    ['old', { subject: 'Old course', score: 60 }],
  ]);
  const courses = [
    { subjectName: 'Mathematics', courseCode: 'MATH' },
    { subjectName: 'Science', courseCode: 'SCI' },
  ];

  reconcileReportCardCourses(subjects, courses, (course) => ({
    subject: course.subjectName,
    score: 0,
  }));

  assert.equal(subjects.get('math'), retained);
  assert.equal(subjects.has('old'), false);
  assert.equal(subjects.get('tt:SCI')?.subject, 'Science');
}

function testEmptyConfiguredCourseListClearsStaleSubjects() {
  const subjects = new Map([['old', { subject: 'Old course', score: 60 }]]);

  reconcileReportCardCourses(subjects, [], () => {
    throw new Error('No course should be created');
  });

  assert.equal(subjects.size, 0);
}

testClassSelectionPrefersExactClassId();
testCourseReconciliationAddsAndRemovesCourses();
testEmptyConfiguredCourseListClearsStaleSubjects();
console.log('report-card-course-sync tests passed');
