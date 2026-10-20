export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  sessionId: string;
  roles: string[];
  modules: string[];
}

export interface DashboardSummary {
  organizationId: string;
  organizationName: string;
  studentCount: number;
  classCount: number;
  activeEnrollments: number;
  newStudentsMonth?: number;
  enrollmentRate?: number;
  status: string;
  genderDistribution?: { MALE: number; FEMALE: number; OTHER: number };
  studentsByCategory?: { label: string; value: number }[];
  studentsByClass?: { label: string; value: number; male: number; female: number }[];
  enrollmentTrend?: { label: string; value: number }[];
  academicYear?: string | null;
}

export interface AcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

export interface ApiCombination {
  id: string;
  organizationId: string;
  name: string;
  displayName: string | null;
  subjects: string[] | null;
  combinationSubjects?: ApiCombinationSubject[];
}

export interface ApiSubject {
  id: string;
  organizationId: string;
  name: string;
  code: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { combinationSubjects: number };
}

export interface ApiSubjectDetail extends ApiSubject {
  combinationSubjects: ApiCombinationSubject[];
}

export interface ApiCombinationSubject {
  id: string;
  combinationId: string;
  subjectId: string;
  combination?: ApiCombination;
  subject?: ApiSubject;
}

export interface ApiExam {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  academicYear: string;
  term: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  description: string | null;
  totalMarks: number | null;
  passingMarks: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiMarkEntry {
  id: string;
  organizationId: string;
  examId: string;
  studentId: string;
  subjectId: string;
  classId: string;
  score: number;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  student?: { id: string; firstName: string; lastName: string; studentUid: string };
  subject?: { id: string; name: string; code: string | null };
  exam?: ApiExam;
}

export interface MarkEntryInput {
  studentId: string;
  score: number;
  remarks?: string;
}

export interface ApiGrade {
  id: string;
  organizationId: string;
  name: string;
  category: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { classes: number };
}

export interface ApiClass {
  id: string;
  organizationId: string;
  name: string;
  stream: string | null;
  category: string | null;
  gradeId: string | null;
  grade: ApiGrade | null;
  combinationId: string | null;
  combination: ApiCombination | null;
  sortOrder: number;
  headTeacherUserId?: string | null;
  headTeacherRefId?: string | null;
  headTeacherName?: string | null;
  headTeacherEmail?: string | null;
  headTeacherSource?: 'TIMETABLE' | 'HR' | 'MANUAL' | null;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  organizationId: string;
  studentId: string;
  classId: string;
  academicYear: string;
  status: string;
  isCurrent: boolean;
  promotedToClassId: string | null;
  promotedToYear: string | null;
  term: string | null;
  joiningDate: string | null;
  recordedBy: string | null;
  createdAt: string;
  updatedAt: string;
  class: ApiClass;
}

export interface ApiParent {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  occupation: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiStudentParent {
  id: string;
  organizationId: string;
  studentId: string;
  parentId: string;
  role: 'FATHER' | 'MOTHER' | 'GUARDIAN';
  createdAt: string;
  parent: ApiParent;
}

export interface Student {
  id: string;
  organizationId: string;
  studentUid: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  cell: string | null;
  village: string | null;
  studentCode: string | null;
  sdmCode: string | null;
  studentPhoto: string | null;
  rfidUid: string | null;
  fingerprintId: string | null;
  bloodGroup: string | null;
  allergies: string | null;
  formerSchool: string | null;
  leavingReason: string | null;
  identityRemarks: string | null;
  isBoarding?: boolean;
  disciplineMarks: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  enrollments: Enrollment[];
  studentParents: ApiStudentParent[];
}

export interface ClassTreeNode {
  name: string;
  count: number;
  classId?: string;
  children?: ClassTreeNode[];
}
