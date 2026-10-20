export type AssessmentStatus = 'DRAFT' | 'OPEN' | 'MARK_ENTRY' | 'SUBMITTED' | 'REVIEWED' | 'APPROVED' | 'LOCKED';

export interface AssessmentSubject {
  id: string;
  name: string;
  code?: string | null;
}

export interface AssessmentClass {
  id: string;
  name: string;
  stream?: string | null;
}

export interface AssessmentMark {
  id: string;
  assessmentId: string;
  studentId: string;
  score: number | null;
  maxMark: number | null;
  markStatus: string;
  remarks?: string | null;
  enteredBy?: string | null;
  enteredAt?: string | null;
  student?: { id: string; firstName: string; lastName: string; studentUid: string };
}

export interface Assessment {
  id: string;
  organizationId: string;
  title: string;
  description?: string | null;
  subjectId: string;
  classId: string;
  assessmentDate?: string | null;
  maxMark: number;
  duration?: string | null;
  status: AssessmentStatus;
  academicYear: string;
  term: string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  subject?: AssessmentSubject;
  class?: AssessmentClass;
  marks?: AssessmentMark[];
  _count?: { marks: number; corrections: number };
}

export interface AssessmentStatistics {
  assessment: Assessment;
  totalStudents: number;
  completedCount: number;
  missingCount: number;
  absentCount: number;
  excusedCount: number;
  average: number;
  highest: number;
  lowest: number;
  passRate: number;
  distribution: Array<{ label: string; min: number; max: number; count: number }>;
}

export interface TeacherDashboardData {
  total: number;
  completed: number;
  pending: number;
  completionRate: number;
  assessments: Assessment[];
}

export interface AssessmentTemplate {
  id: string;
  name: string;
  description?: string | null;
  academicLevel: string;
  academicYear: string;
  term: string;
  calculationMethod: string;
  status: string;
  components: Array<{
    id: string;
    name: string;
    code: string;
    description?: string | null;
    weightPercentage?: number | null;
    isRequired: boolean;
    sortOrder: number;
    isActive: boolean;
  }>;
}

export interface GradingScale {
  id: string;
  name: string;
  academicLevel: string;
  minPercentage: number;
  maxPercentage: number;
  grade: string;
  description?: string | null;
  sortOrder: number;
}

export interface GradingDashboard {
  totalStudents: number;
  totalAssessments: number;
  marksCompleted: number;
  resultsPublished: number;
  schoolAverage: number;
  passRate: number;
}

export type MarkEntryStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'EXEMPT' | 'MISSING' | 'NOT_APPLICABLE';

export interface MarkEntry {
  studentId: string;
  score: string;
  markStatus: MarkEntryStatus;
  remarks: string;
}

export interface StudentListItem {
  id: string;
  studentCode: string;
  fullName: string;
  gender?: string | null;
  photoUrl?: string | null;
  rollNumber?: string | null;
}

export type { MarkEntryStatus as AssessmentMarkStatus };
