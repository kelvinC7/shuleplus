/**
 * StudentManagement API scopes — mirrors StudentManagement/Backend routes.
 */

export interface DeveloperScopeEndpoint {
  method: string;
  path: string;
  summary: string;
}

export interface DeveloperScopeDef {
  key: string;
  label: string;
  endpoints: DeveloperScopeEndpoint[];
}

export const STUDENT_MANAGEMENT_SCOPES: DeveloperScopeDef[] = [
  {
    key: 'student.read',
    label: 'Read Students',
    endpoints: [
      { method: 'GET', path: '/students', summary: 'List students' },
      { method: 'GET', path: '/students/{id}', summary: 'Get student' },
      { method: 'GET', path: '/students/next-code', summary: 'Next student code' },
      { method: 'GET', path: '/dashboard', summary: 'Dashboard summary' },
    ],
  },
  {
    key: 'student.write',
    label: 'Create / Update Students',
    endpoints: [
      { method: 'POST', path: '/students', summary: 'Create student' },
      { method: 'PUT', path: '/students/{id}', summary: 'Update student' },
    ],
  },
  {
    key: 'student.delete',
    label: 'Delete Students',
    endpoints: [{ method: 'DELETE', path: '/students/{id}', summary: 'Delete student' }],
  },
  {
    key: 'student.search',
    label: 'Search / Lookup Students',
    endpoints: [{ method: 'GET', path: '/public/students/lookup', summary: 'Public lookup by code' }],
  },
  {
    key: 'student.import',
    label: 'Import Students',
    endpoints: [
      { method: 'POST', path: '/students/import/preview', summary: 'Preview import' },
      { method: 'POST', path: '/students/import', summary: 'Import Excel' },
    ],
  },
  {
    key: 'parent.read',
    label: 'Read Parents',
    endpoints: [
      { method: 'GET', path: '/parents', summary: 'List parents' },
      { method: 'GET', path: '/parents/{id}', summary: 'Get parent' },
    ],
  },
  {
    key: 'parent.write',
    label: 'Create / Update Parents',
    endpoints: [
      { method: 'POST', path: '/parents', summary: 'Create parent' },
      { method: 'PUT', path: '/parents/{id}', summary: 'Update parent' },
      { method: 'POST', path: '/public/parents/claim', summary: 'Claim parent link' },
    ],
  },
  {
    key: 'parent.delete',
    label: 'Delete Parents',
    endpoints: [{ method: 'DELETE', path: '/parents/{id}', summary: 'Delete parent' }],
  },
  {
    key: 'class.read',
    label: 'Read Classes',
    endpoints: [
      { method: 'GET', path: '/classes', summary: 'List classes' },
      { method: 'GET', path: '/classes/{id}', summary: 'Get class' },
      { method: 'GET', path: '/classes/teacher-candidates', summary: 'Teacher candidates' },
    ],
  },
  {
    key: 'class.write',
    label: 'Create / Update Classes',
    endpoints: [
      { method: 'POST', path: '/classes', summary: 'Create class' },
      { method: 'PUT', path: '/classes/{id}', summary: 'Update class' },
      { method: 'PATCH', path: '/classes/{id}/head-teacher', summary: 'Assign head teacher' },
    ],
  },
  {
    key: 'class.delete',
    label: 'Delete Classes',
    endpoints: [{ method: 'DELETE', path: '/classes/{id}', summary: 'Delete class' }],
  },
  {
    key: 'enrollment.read',
    label: 'Read Enrollments',
    endpoints: [
      { method: 'GET', path: '/enrollments', summary: 'List enrollments' },
      { method: 'GET', path: '/enrollments/promotions', summary: 'List promotions' },
      { method: 'GET', path: '/enrollments/promotions/{id}', summary: 'Get promotion' },
    ],
  },
  {
    key: 'enrollment.write',
    label: 'Enroll / Promote Students',
    endpoints: [
      { method: 'POST', path: '/enrollments/enroll', summary: 'Enroll student' },
      { method: 'POST', path: '/enrollments/promote', summary: 'Promote students' },
      { method: 'PUT', path: '/enrollments/promotions/{id}', summary: 'Update promotion' },
    ],
  },
  {
    key: 'academic_year.read',
    label: 'Read Academic Years',
    endpoints: [{ method: 'GET', path: '/exams/academic-years', summary: 'List academic years' }],
  },
  {
    key: 'exam.read',
    label: 'Read Examinations',
    endpoints: [
      { method: 'GET', path: '/exams', summary: 'List exams' },
      { method: 'GET', path: '/exams/{id}', summary: 'Get exam' },
    ],
  },
  {
    key: 'exam.write',
    label: 'Create / Update Examinations',
    endpoints: [
      { method: 'POST', path: '/exams', summary: 'Create exam' },
      { method: 'PUT', path: '/exams/{id}', summary: 'Update exam' },
    ],
  },
  {
    key: 'exam.delete',
    label: 'Delete Examinations',
    endpoints: [{ method: 'DELETE', path: '/exams/{id}', summary: 'Delete exam' }],
  },
  {
    key: 'grade.read',
    label: 'Read Grades',
    endpoints: [
      { method: 'GET', path: '/grades', summary: 'List grades' },
      { method: 'GET', path: '/grades/{id}', summary: 'Get grade' },
    ],
  },
  {
    key: 'grade.write',
    label: 'Create / Update Grades',
    endpoints: [
      { method: 'POST', path: '/grades', summary: 'Create grade' },
      { method: 'PUT', path: '/grades/{id}', summary: 'Update grade' },
    ],
  },
  {
    key: 'grade.delete',
    label: 'Delete Grades',
    endpoints: [{ method: 'DELETE', path: '/grades/{id}', summary: 'Delete grade' }],
  },
  {
    key: 'subject.read',
    label: 'Read Subjects',
    endpoints: [
      { method: 'GET', path: '/subjects', summary: 'List subjects' },
      { method: 'GET', path: '/subjects/categories', summary: 'Subject categories' },
      { method: 'GET', path: '/subjects/{id}', summary: 'Get subject' },
    ],
  },
  {
    key: 'subject.write',
    label: 'Create / Update Subjects',
    endpoints: [
      { method: 'POST', path: '/subjects', summary: 'Create subject' },
      { method: 'PUT', path: '/subjects/{id}', summary: 'Update subject' },
    ],
  },
  {
    key: 'subject.delete',
    label: 'Delete Subjects',
    endpoints: [{ method: 'DELETE', path: '/subjects/{id}', summary: 'Delete subject' }],
  },
  {
    key: 'mark.read',
    label: 'Read Marks',
    endpoints: [
      { method: 'GET', path: '/marks/students', summary: 'Students for mark entry' },
      { method: 'GET', path: '/marks/entry', summary: 'Marks for entry' },
      { method: 'GET', path: '/marks/by-exam-class', summary: 'Marks by exam & class' },
    ],
  },
  {
    key: 'mark.write',
    label: 'Write Marks',
    endpoints: [{ method: 'POST', path: '/marks/bulk', summary: 'Bulk save marks' }],
  },
  {
    key: 'mark.delete',
    label: 'Delete Marks',
    endpoints: [
      { method: 'DELETE', path: '/marks/{id}', summary: 'Delete mark' },
      { method: 'DELETE', path: '/marks/entry', summary: 'Delete by entry' },
    ],
  },
  {
    key: 'combination.read',
    label: 'Read Combinations',
    endpoints: [
      { method: 'GET', path: '/combinations', summary: 'List combinations' },
      { method: 'GET', path: '/combinations/{id}', summary: 'Get combination' },
    ],
  },
  {
    key: 'settings.read',
    label: 'Read Settings',
    endpoints: [{ method: 'GET', path: '/settings/academic', summary: 'Academic settings' }],
  },
  {
    key: 'settings.write',
    label: 'Update Settings',
    endpoints: [{ method: 'PUT', path: '/settings/academic', summary: 'Update academic settings' }],
  },
  {
    key: 'student.upload',
    label: 'Upload Student Photos',
    endpoints: [{ method: 'POST', path: '/upload/photo', summary: 'Upload photo' }],
  },
];

export function studentManagementPermissionConfig() {
  return {
    label: 'Student Management',
    permissions: STUDENT_MANAGEMENT_SCOPES.map(({ key, label, endpoints }) => ({
      key,
      label,
      endpoints,
    })),
  };
}
