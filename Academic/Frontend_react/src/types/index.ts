export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  sessionId: string;
  roles: string[];
  modules: string[];
  position?: string | null;
}

export interface DashboardSummary {
  organizationId: string;
  organizationName: string;
  studentCount: number;
  classCount: number;
  activeEnrollments: number;
  status: string;
  logoUrl?: string | null;
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

export interface ApiAssessmentComponent {
  id: string;
  templateId: string;
  name: string;
  code: string;
  description: string | null;
  maxMark: number | null;
  weightPercentage: number | null;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAssessmentTemplate {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  academicLevel: string;
  academicYear: string;
  term: string;
  calculationMethod: string;
  defaultCourseMarks?: number | null;
  applicableClasses: string[] | null;
  version: number;
  status: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  components: ApiAssessmentComponent[];
  assignments?: ApiTemplateAssignment[];
}

export interface ApiTemplateAssignment {
  id: string;
  organizationId: string;
  templateId: string;
  classId: string;
  academicYear: string;
  term: string;
  status: string;
  assignedBy: string | null;
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
  template?: ApiAssessmentTemplate;
  class?: ApiClass;
}

export interface ApiComponentMark {
  id: string;
  organizationId: string;
  assignmentId: string;
  componentId: string;
  studentId: string;
  subjectId: string;
  score: number;
  maxMark: number | null;
  remarks: string | null;
  enteredBy: string | null;
  enteredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiStudentResult {
  id: string;
  organizationId: string;
  assignmentId: string;
  studentId: string;
  classId: string;
  subjectId: string;
  academicYear: string;
  term: string;
  componentScores: Record<string, number>;
  totalScore: number;
  averageScore: number | null;
  percentage: number | null;
  grade: string | null;
  rank: number | null;
  classSize: number | null;
  remarks: string | null;
  status: string;
  calculatedAt: string;
  createdAt: string;
  updatedAt: string;
  student?: { id: string; firstName: string; lastName: string; studentUid: string };
  subject?: ApiSubject;
  assignment?: ApiTemplateAssignment;
  class?: ApiClass;
}

export interface ApiGradingScale {
  id: string;
  organizationId: string;
  name: string;
  academicLevel: string;
  minPercentage: number;
  maxPercentage: number;
  grade: string;
  description: string | null;
  remarks: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportCardData {
  student: { id: string; firstName: string; lastName: string; studentUid: string; gender: string | null; dateOfBirth: string | null } | null;
  class: { id: string; name: string; stream: string | null } | null;
  academicYear: string;
  term: string | null;
  subjects: Array<{
    subject: string;
    subjectId: string;
    scores: Record<string, number>;
    totalScore: number;
    percentage: number;
    grade: string | null;
    rank: number | null;
    classSize: number | null;
  }>;
  totalPercentage: number;
  averagePercentage: number;
}

export interface GrowthData {
  termAverages: Array<{ period: string; averagePercentage: number; subjectCount: number }>;
  subjectGrowth: Record<string, Array<{ period: string; percentage: number }>>;
}

export interface ApiAssessment {
  id: string;
  organizationId: string;
  templateId: string | null;
  componentId: string | null;
  subjectId: string;
  classId: string;
  title: string;
  assessmentCode?: string | null;
  description: string | null;
  academicYear: string;
  term: string;
  assessmentDate: string | null;
  maxMark: number;
  duration: string | null;
  status: string;
  createdBy: string | null;
  createdByName?: string | null;
  marksScoredCount?: number;
  publishedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  subject?: ApiSubject;
  class?: ApiClass;
  template?: ApiAssessmentTemplate;
  component?: ApiAssessmentComponent;
  marks?: ApiAssessmentMark[];
  evidences?: ApiAssessmentEvidence[];
  _count?: { marks: number; corrections: number };
}

export interface ApiAssessmentMark {
  id: string;
  organizationId: string;
  assessmentId: string;
  studentId: string;
  score: number | null;
  maxMark: number | null;
  markStatus: string;
  remarks: string | null;
  competencies: any;
  enteredBy: string | null;
  enteredAt: string | null;
  lastModifiedBy: string | null;
  lastModifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  student?: { id: string; firstName: string; lastName: string; studentUid: string };
}

export interface ApiAssessmentEvidence {
  id: string;
  organizationId: string;
  assessmentId: string;
  studentId: string | null;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  description: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

export interface ApiMarkCorrectionRequest {
  id: string;
  organizationId: string;
  assessmentId: string;
  studentId: string;
  currentScore: number;
  requestedScore: number;
  reason: string;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  assessment?: ApiAssessment;
}

export interface AssessmentStatistics {
  assessment: ApiAssessment;
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

export interface ReportCardSchoolInfo {
  name: string;
  logoUrl?: string | null;
  stampUrl?: string | null;
  signatureUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  motto?: string | null;
  organizationCode?: string | null;
}

export interface ReportCardDataV2 {
  school?: ReportCardSchoolInfo;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    studentUid: string;
    gender: string | null;
    dateOfBirth: string | null;
    photoUrl?: string | null;
    parentGuardian?: string | null;
    parentPhone?: string | null;
    admissionNumber?: string | null;
    residence?: string | null;
  } | null;
  class: { id: string; name: string; stream: string | null } | null;
  academicYear: string;
  term: string | null;
  reportView?: 'single' | 'combined';
  combinedTerms?: string[];
  termComponentOrders?: Array<{ term: string; components: string[] }>;
  componentOrder?: string[];
  assessmentTemplate?: {
    id: string;
    name: string;
    defaultCourseMarks: number;
    components: Array<{ name: string; weightPercentage: number; code?: string }>;
  } | null;
  subjects: Array<{
    subject: string;
    subjectId: string;
    categoryScores: Record<
      string,
      {
        percentage: number;
        weight: number;
        contribution: number;
        marksDisplay?: string;
        rawMarksDisplay?: string;
        normalizedScore?: number;
        normalizedMax?: number;
        score?: number;
        maxMark?: number;
      }
    >;
    totalScore: number;
    totalMax?: number;
    defaultCourseMarks?: number;
    percentage: number;
    grade: string | null;
    gradeDescription: string | null;
    rank: number | null;
    classSize: number | null;
    marksEntered?: boolean;
    courseComplete?: boolean;
    missingComponents?: string[];
    isCore?: boolean;
    termResults?: Array<{
      term: string;
      categoryScores: Record<
        string,
        {
          percentage: number;
          weight: number;
          contribution: number;
          marksDisplay?: string;
          rawMarksDisplay?: string;
          normalizedMax?: number;
        }
      >;
      totalScore: number;
      totalMax?: number;
      percentage: number;
      grade: string | null;
      rank: number | null;
      classSize: number | null;
      marksEntered?: boolean;
      componentOrder: string[];
    }>;
  }>;
  overallScore: number;
  overallGrade: string | null;
  overallGradeDescription: string | null;
  position: number;
  classSize: number;
  growth: {
    termAverages: Array<{ period: string; averagePercentage: number; subjectCount: number }>;
    subjectGrowth: Record<string, Array<{ period: string; percentage: number }>>;
    overallGrowth: number;
    trend: string;
  };
  summary?: {
    totalMarks: number;
    totalMax: number;
    coursesPassed: number;
    coursesTotal: number;
    termChange: number | null;
    previousTermAverage: number | null;
    currentTermAverage: number;
    trend: string;
  };
  strongCourses?: Array<{ subject: string; percentage: number; grade: string | null }>;
  improvementCourses?: Array<{ subject: string; percentage: number; grade: string | null }>;
  insights?: {
    highest: { subject: string; percentage: number } | null;
    lowest: { subject: string; percentage: number } | null;
  } | null;
  gradingLegend?: Array<{ grade: string; minPercentage: number; maxPercentage: number; description: string | null }>;
  attendance?: { available: boolean; message?: string; rate?: number; present?: number; days?: number };
  discipline?: { record: string; comment: string | null; incidents: number; message?: string };
  comments?: { classTeacher: string; headTeacher: string };
  meta?: { reportNumber: string; generatedAt: string; verifyUrl: string | null };
  settings?: { reportCard?: { classTeacherCommentHint?: string | null; enableClassTeacherComments?: boolean; enableHeadTeacherComments?: boolean } };
}

export interface TeacherDashboard {
  total: number;
  completed: number;
  pending: number;
  completionRate: number;
  assessments: ApiAssessment[];
}

export interface AcademicDashboard {
  totalStudents: number;
  totalClasses?: number;
  totalSubjects?: number;
  totalAssessments: number;
  marksCompleted: number;
  resultsPublished: number;
  schoolAverage: number;
  passRate: number;
  levelPerformance: Array<{ classId: string; className?: string; _avg: { percentage: number | null } }>;
  overallAverage?: number;
  completionRate?: number;
  gradeDistribution?: Array<{ grade: string; minPercentage: number; maxPercentage: number; count: number; percentage: number }>;
  subjectAverages?: Array<{ subjectId: string; subjectName: string; averagePercentage: number; averageGrade: string | null; passRate: number; studentCount: number; trend: string }>;
}

export interface CompetencyTemplate {
  id: string;
  name: string;
  academicLevel: string;
  competencies: any;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentCompetency {
  id: string;
  templateId: string;
  assessmentId: string | null;
  studentId: string;
  subjectId: string | null;
  competencies: any;
  academicYear: string;
  term: string;
  recordedBy: string | null;
  createdAt: string;
  updatedAt: string;
  template?: CompetencyTemplate;
}
