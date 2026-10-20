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
}
