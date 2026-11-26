export type ReportAnalysisKind = 'beginning' | 'midterm' | 'standard';
export type ReportAnalysisStatus = 'all' | 'in_progress' | 'submitted' | 'approved';

export type ReportAnalysisBand = { label: string; min: number; color: string };

export type ReportAnalysisSettings = {
  bands: ReportAnalysisBand[];
  atRiskBelow: number;
  trendDelta: number;
};

export type ReportAnalysisSubjectCell = {
  subjectId: string;
  subject: string;
  percentage: number | null;
  status: 'entered' | 'absent' | 'missing';
};

export type ReportAnalysisStudent = {
  studentId: string;
  name: string;
  admissionNo: string | null;
  classLabel: string;
  average: number | null;
  position: number | null;
  classSize: number;
  band: { label: string; color: string; min: number } | null;
  coursesAssessed: number;
  coursesBelow: number;
  missingCourses: number;
  weakCourses: string[];
  bestCourse: { subject: string; percentage: number } | null;
  previousAverage: number | null;
  delta: number | null;
  subjects: ReportAnalysisSubjectCell[];
};

export type ReportAnalysisCourse = {
  subjectId: string;
  subject: string;
  teacherId: string | null;
  teacherName: string | null;
  average: number | null;
  band: ReportAnalysisBand | null;
  highest: number | null;
  lowest: number | null;
  assessed: number;
  above: number;
  below: number;
  missing: number;
  absent: number;
  distribution: Array<{ label: string; color: string; count: number }>;
  needsImprovement: Array<{ studentId: string; name: string; percentage: number }>;
  previousAverage: number | null;
  delta: number | null;
};

export type ReportAnalysisClassRow = {
  classId: string;
  classLabel: string;
  average: number | null;
  band: ReportAnalysisBand | null;
  assessed: number;
  students: number;
  good: number;
  below: number;
};

export type ReportAnalysisClassComparison = {
  settings: ReportAnalysisSettings;
  classes: ReportAnalysisClassRow[];
  generatedAt: string;
};

export type ReportAnalysisData = {
  period: {
    academicYear: string;
    term: string | null;
    reportKind: ReportAnalysisKind;
    status: ReportAnalysisStatus;
    classId: string;
    classLabel: string;
    assessmentCount: number;
  };
  settings: ReportAnalysisSettings;
  summary: {
    totalStudents: number;
    assessedStudents: number;
    classAverage: number | null;
    goodPerformers: number;
    goodPercent: number;
    needsImprovement: number;
    needsImprovementPercent: number;
    missingMarksStudents: number;
    courseCount: number;
  };
  distribution: Array<ReportAnalysisBand & { count: number; percent: number }>;
  comparison: {
    previousReportKind: ReportAnalysisKind;
    previousClassAverage: number | null;
    classAverageDelta: number | null;
    improvedStudents: number;
    declinedStudents: number;
  } | null;
  courses: ReportAnalysisCourse[];
  students: ReportAnalysisStudent[];
  lists: {
    topPerformers: ReportAnalysisStudent[];
    consistentPerformers: ReportAnalysisStudent[];
    bestImprovement: ReportAnalysisStudent[];
    declining: ReportAnalysisStudent[];
    needsImprovement: ReportAnalysisStudent[];
    weakestCourses: ReportAnalysisCourse[];
    missingAssessments: ReportAnalysisStudent[];
  };
  generatedAt: string;
};
