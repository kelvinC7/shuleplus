/**
 * StudentManagement-owned API catalog for developer documentation.
 * Single source of truth — OpenAPI, docs UI, and Postman derive from this.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface DeveloperEndpointDef {
  id: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  permission: string;
  authMode: 'oauth' | 'public';
  tags?: string[];
  pathParams?: { name: string; type: string; required: boolean; description: string }[];
  queryParams?: { name: string; type: string; required: boolean; description: string }[];
  requestBody?: Record<string, unknown>;
  responseExample?: Record<string, unknown>;
  statusCodes?: { code: number; description: string }[];
}

export interface DeveloperApiGroup {
  id: string;
  label: string;
  description?: string;
  endpoints: DeveloperEndpointDef[];
}

const DEFAULT_STATUS = [
  { code: 200, description: 'OK' },
  { code: 400, description: 'Bad Request' },
  { code: 401, description: 'Unauthorized' },
  { code: 403, description: 'Forbidden' },
  { code: 404, description: 'Not Found' },
  { code: 429, description: 'Too Many Requests' },
  { code: 500, description: 'Internal Server Error' },
];

export const SM_API_VERSION = 'v1';
export const SM_API_BASE_PATH = `/api/${SM_API_VERSION}`;

export const SM_DEVELOPER_PERMISSIONS = {
  label: 'Student Management',
  moduleKey: 'student',
  permissions: [
    { key: 'student.read', label: 'Read Students' },
    { key: 'student.write', label: 'Create / Update Students' },
    { key: 'student.delete', label: 'Delete Students' },
    { key: 'student.search', label: 'Search / Lookup Students' },
    { key: 'student.import', label: 'Import Students' },
    { key: 'parent.read', label: 'Read Parents' },
    { key: 'parent.write', label: 'Create / Update Parents' },
    { key: 'parent.delete', label: 'Delete Parents' },
    { key: 'class.read', label: 'Read Classes' },
    { key: 'class.write', label: 'Create / Update Classes' },
    { key: 'class.delete', label: 'Delete Classes' },
    { key: 'enrollment.read', label: 'Read Enrollments' },
    { key: 'enrollment.write', label: 'Enroll / Promote Students' },
    { key: 'academic_year.read', label: 'Read Academic Years' },
    { key: 'exam.read', label: 'Read Examinations' },
    { key: 'exam.write', label: 'Create / Update Examinations' },
    { key: 'exam.delete', label: 'Delete Examinations' },
    { key: 'grade.read', label: 'Read Grades' },
    { key: 'grade.write', label: 'Create / Update Grades' },
    { key: 'grade.delete', label: 'Delete Grades' },
    { key: 'subject.read', label: 'Read Subjects' },
    { key: 'subject.write', label: 'Create / Update Subjects' },
    { key: 'subject.delete', label: 'Delete Subjects' },
    { key: 'mark.read', label: 'Read Marks' },
    { key: 'mark.write', label: 'Write Marks' },
    { key: 'mark.delete', label: 'Delete Marks' },
    { key: 'combination.read', label: 'Read Combinations' },
    { key: 'settings.read', label: 'Read Settings' },
    { key: 'settings.write', label: 'Update Settings' },
    { key: 'student.upload', label: 'Upload Student Photos' },
  ],
} as const;

export const SM_DEVELOPER_API_GROUPS: DeveloperApiGroup[] = [
  {
    id: 'overview',
    label: 'Getting Started',
    description: 'Authentication, environments, and quick start',
    endpoints: [],
  },
  {
    id: 'students',
    label: 'Students',
    endpoints: [
      {
        id: 'students-list',
        method: 'GET',
        path: '/students',
        summary: 'List Students',
        description: 'Paginated list of students in the organization tenant.',
        permission: 'student.read',
        authMode: 'oauth',
        queryParams: [
          { name: 'page', type: 'integer', required: false, description: 'Page number (default 1)' },
          { name: 'limit', type: 'integer', required: false, description: 'Page size (default 20)' },
          { name: 'search', type: 'string', required: false, description: 'Search by name or code' },
        ],
        responseExample: {
          success: true,
          data: [{ id: 'stu_01J', studentCode: 'STU-2026-000145', fullName: 'Jean Sandbox', status: 'ACTIVE' }],
          meta: { requestId: 'req_01J', page: 1, total: 1 },
        },
        statusCodes: DEFAULT_STATUS,
      },
      {
        id: 'students-get',
        method: 'GET',
        path: '/students/{studentId}',
        summary: 'Get Student',
        description: 'Retrieve a single student by ID.',
        permission: 'student.read',
        authMode: 'oauth',
        pathParams: [{ name: 'studentId', type: 'string', required: true, description: 'Student UUID' }],
        responseExample: {
          success: true,
          data: {
            id: 'stu_01J',
            studentCode: 'STU-2026-000145',
            fullName: 'John Doe',
            gender: 'MALE',
            dateOfBirth: '2015-03-12',
            status: 'ACTIVE',
            class: { id: 'class_001', name: 'P5 A' },
          },
          meta: { requestId: 'req_01J' },
        },
        statusCodes: DEFAULT_STATUS,
      },
      {
        id: 'students-create',
        method: 'POST',
        path: '/students',
        summary: 'Create Student',
        description: 'Register a new student in the organization.',
        permission: 'student.write',
        authMode: 'oauth',
        requestBody: { firstName: 'John', lastName: 'Doe', gender: 'MALE', classId: 'class_001' },
        statusCodes: DEFAULT_STATUS,
      },
      {
        id: 'students-update',
        method: 'PUT',
        path: '/students/{studentId}',
        summary: 'Update Student',
        description: 'Full update of student record.',
        permission: 'student.write',
        authMode: 'oauth',
        pathParams: [{ name: 'studentId', type: 'string', required: true, description: 'Student UUID' }],
        statusCodes: DEFAULT_STATUS,
      },
      {
        id: 'students-delete',
        method: 'DELETE',
        path: '/students/{studentId}',
        summary: 'Delete Student',
        description: 'Remove a student record (soft delete where applicable).',
        permission: 'student.delete',
        authMode: 'oauth',
        pathParams: [{ name: 'studentId', type: 'string', required: true, description: 'Student UUID' }],
        statusCodes: DEFAULT_STATUS,
      },
      {
        id: 'students-lookup-public',
        method: 'GET',
        path: '/public/students/lookup',
        summary: 'Lookup Student (Public)',
        description: 'Public lookup by student code — used by payment portals and partner integrations.',
        permission: 'student.search',
        authMode: 'public',
        queryParams: [{ name: 'code', type: 'string', required: true, description: 'Student or Shule code' }],
        statusCodes: DEFAULT_STATUS,
      },
    ],
  },
  {
    id: 'parents',
    label: 'Parents',
    endpoints: [
      {
        id: 'parents-list',
        method: 'GET',
        path: '/parents',
        summary: 'List Parents',
        description: 'List parents/guardians linked to students.',
        permission: 'parent.read',
        authMode: 'oauth',
        statusCodes: DEFAULT_STATUS,
      },
      {
        id: 'parents-search',
        method: 'GET',
        path: '/parents/search',
        summary: 'Search Parents',
        description: 'Search parents by phone, name, or national ID.',
        permission: 'parent.read',
        authMode: 'oauth',
        queryParams: [{ name: 'q', type: 'string', required: true, description: 'Search query' }],
        statusCodes: DEFAULT_STATUS,
      },
      {
        id: 'parents-get',
        method: 'GET',
        path: '/parents/{parentId}',
        summary: 'Get Parent',
        description: 'Retrieve parent profile and linked students.',
        permission: 'parent.read',
        authMode: 'oauth',
        pathParams: [{ name: 'parentId', type: 'string', required: true, description: 'Parent UUID' }],
        statusCodes: DEFAULT_STATUS,
      },
      {
        id: 'parents-create',
        method: 'POST',
        path: '/parents',
        summary: 'Create Parent',
        description: 'Create a parent/guardian record.',
        permission: 'parent.write',
        authMode: 'oauth',
        statusCodes: DEFAULT_STATUS,
      },
      {
        id: 'parents-update',
        method: 'PUT',
        path: '/parents/{parentId}',
        summary: 'Update Parent',
        description: 'Update parent contact and profile details.',
        permission: 'parent.write',
        authMode: 'oauth',
        pathParams: [{ name: 'parentId', type: 'string', required: true, description: 'Parent UUID' }],
        statusCodes: DEFAULT_STATUS,
      },
    ],
  },
  {
    id: 'classes',
    label: 'Classes',
    endpoints: [
      {
        id: 'classes-list',
        method: 'GET',
        path: '/classes',
        summary: 'List Classes',
        description: 'All classes for the current academic context.',
        permission: 'class.read',
        authMode: 'oauth',
        statusCodes: DEFAULT_STATUS,
      },
      {
        id: 'classes-get',
        method: 'GET',
        path: '/classes/{classId}',
        summary: 'Get Class',
        description: 'Class details including head teacher.',
        permission: 'class.read',
        authMode: 'oauth',
        pathParams: [{ name: 'classId', type: 'string', required: true, description: 'Class UUID' }],
        statusCodes: DEFAULT_STATUS,
      },
      {
        id: 'classes-create',
        method: 'POST',
        path: '/classes',
        summary: 'Create Class',
        description: 'Create a new class/grade section.',
        permission: 'class.write',
        authMode: 'oauth',
        statusCodes: DEFAULT_STATUS,
      },
      {
        id: 'classes-head-teacher',
        method: 'PATCH',
        path: '/classes/{classId}/head-teacher',
        summary: 'Assign Head Teacher',
        description: 'Assign or change the head teacher for a class.',
        permission: 'class.write',
        authMode: 'oauth',
        pathParams: [{ name: 'classId', type: 'string', required: true, description: 'Class UUID' }],
        requestBody: { teacherId: 'usr_001' },
        statusCodes: DEFAULT_STATUS,
      },
    ],
  },
  {
    id: 'academic-years',
    label: 'Academic Years',
    endpoints: [
      {
        id: 'academic-years-list',
        method: 'GET',
        path: '/exams/academic-years',
        summary: 'List Academic Years',
        description: 'Academic years configured for the organization.',
        permission: 'academic_year.read',
        authMode: 'oauth',
        statusCodes: DEFAULT_STATUS,
      },
    ],
  },
  {
    id: 'enrollment',
    label: 'Enrollment',
    endpoints: [
      {
        id: 'enrollment-list',
        method: 'GET',
        path: '/enrollments',
        summary: 'List Enrollments',
        description: 'Current and historical student enrollments.',
        permission: 'enrollment.read',
        authMode: 'oauth',
        statusCodes: DEFAULT_STATUS,
      },
      {
        id: 'enrollment-enroll',
        method: 'POST',
        path: '/enrollments/enroll',
        summary: 'Enroll Student',
        description: 'Enroll a student into a class for an academic year.',
        permission: 'enrollment.write',
        authMode: 'oauth',
        requestBody: { studentId: 'stu_01J', classId: 'class_001', academicYearId: 'ay_2026' },
        statusCodes: DEFAULT_STATUS,
      },
      {
        id: 'enrollment-promote',
        method: 'POST',
        path: '/enrollments/promote',
        summary: 'Promote Students',
        description: 'Bulk promotion to the next class/academic year.',
        permission: 'enrollment.write',
        authMode: 'oauth',
        statusCodes: DEFAULT_STATUS,
      },
    ],
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    description: 'Event notifications (configure in Developer Portal)',
    endpoints: [
      {
        id: 'webhook-student-created',
        method: 'POST',
        path: '/webhooks/student.created',
        summary: 'student.created',
        description: 'Fired when a new student is registered.',
        permission: 'student.read',
        authMode: 'oauth',
        statusCodes: DEFAULT_STATUS,
      },
      {
        id: 'webhook-student-enrolled',
        method: 'POST',
        path: '/webhooks/student.enrolled',
        summary: 'student.enrolled',
        description: 'Fired when a student is enrolled in a class.',
        permission: 'enrollment.read',
        authMode: 'oauth',
        statusCodes: DEFAULT_STATUS,
      },
    ],
  },
];

export function filterCatalogByPermissions(
  allowedModules: Record<string, Record<string, boolean>>
): DeveloperApiGroup[] {
  const granted = new Set<string>();
  const studentPerms = allowedModules.student ?? allowedModules['student-management'] ?? {};
  for (const [perm, enabled] of Object.entries(studentPerms)) {
    if (enabled) granted.add(perm);
  }

  return SM_DEVELOPER_API_GROUPS.map((group) => ({
    ...group,
    endpoints: group.endpoints.filter((ep) => granted.has(ep.permission)),
  })).filter((g) => g.id === 'overview' || g.endpoints.length > 0);
}

export function hasStudentManagementAccess(
  allowedModules: Record<string, Record<string, boolean>>
): boolean {
  const studentPerms = allowedModules.student ?? allowedModules['student-management'] ?? {};
  return Object.values(studentPerms).some(Boolean);
}
